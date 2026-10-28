import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { formatMoney, p } from '../../utils/finance';

function Resultados({ filterMonth, dailyRecords, stats, transactions }) {
    const topDay = stats?.weekdayAverages && stats.weekdayAverages.length > 0 ? stats.weekdayAverages[0] : null;

    // Estado para a porcentagem da meta
    const [goalPercent, setGoalPercent] = useState(() => {
        const saved = localStorage.getItem(`meta_perc_${filterMonth}`);
        return saved !== null ? Number(saved) : 10; 
    });

    // Toggle para Projetado / Realizado (Visual/Preparado para lógica)
    const [calcMode, setCalcMode] = useState('projetado');

    useEffect(() => {
        localStorage.setItem(`meta_perc_${filterMonth}`, goalPercent);
    }, [goalPercent, filterMonth]);

    // Soma inteligente do Caixa Diário
    const getDailyTotal = (record) => {
        if (!record) return 0;
        const nonPaymentFields = ['qtdPedidos', 'clientesNovos', 'taxaEntrega', 'motoboy', 'isLaunched', 'initialized'];
        let sum = 0;
        Object.keys(record).forEach(key => {
            if (!nonPaymentFields.includes(key)) {
                sum += p(record[key]);
            }
        });
        return sum;
    };

    // Meses
    const mesesNomes = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const yearCurrent = filterMonth ? filterMonth.split('-')[0] : new Date().getFullYear().toString();

    // Faturamento do mês anterior
    let prevMonthRev = 0;
    let prevMonthName = "Mês Anterior";
    if (filterMonth) {
        const [yStr, mStr] = filterMonth.split('-');
        let prevM = parseInt(mStr, 10) - 1;
        let prevY = parseInt(yStr, 10);
        if (prevM === 0) {
            prevM = 12;
            prevY -= 1;
        }
        
        prevMonthName = mesesAbrev[prevM - 1];
        const prevMonthKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
        
        Object.keys(dailyRecords || {}).forEach(d => {
            if (d.startsWith(prevMonthKey)) {
                prevMonthRev += getDailyTotal(dailyRecords[d]);
            }
        });
    }

    // Cálculos Principais (Faturamento, Gastos, Lucro)
    const currentRev = stats?.rb || 0;
    const totalGastos = (stats?.rb || 0) - (stats?.lucro || 0); // Puxa os custos operacionais exatos
    const lucroProjetado = stats?.lucro || 0;
    const margemProjetada = currentRev > 0 ? (lucroProjetado / currentRev) * 100 : 0;

    // Cálculos da Meta
    const targetVal = prevMonthRev + (prevMonthRev * (goalPercent / 100));
    const progress = targetVal > 0 ? Math.min((currentRev / targetVal) * 100, 100) : 0;
    const isGoalReached = currentRev >= targetVal && targetVal > 0;
    const remaining = targetVal - currentRev;

    // Tabela Mensal e Crescimento
    const monthlyTotals = mesesNomes.map((nome, index) => {
        const mStr = String(index + 1).padStart(2, '0');
        const monthKey = `${yearCurrent}-${mStr}`;
        const isCurrentFilterMonth = monthKey === filterMonth;
        
        let totalVal = 0;
        let totalPedidos = 0;

        Object.keys(dailyRecords || {}).forEach(d => {
            if (d.startsWith(monthKey)) {
                const r = dailyRecords[d];
                totalVal += getDailyTotal(r);
                totalPedidos += p(r.qtdPedidos);
            }
        });

        if (isCurrentFilterMonth) {
            totalVal = stats?.rb || totalVal;
            totalPedidos = stats?.totalPedidos || totalPedidos;
        }

        return { nome, key: monthKey, totalVal, totalPedidos };
    });

    const maxVal = Math.max(...monthlyTotals.map(m => m.totalVal), 1);

    return (
        <div className="space-y-4 fade-in">
            
            {/* BARRA SUPERIOR: BASE DE CÁLCULO */}
            <div className="glass-card flex flex-col md:flex-row justify-between items-start md:items-center p-2 px-4 rounded-2xl bg-white border shadow-sm gap-4">
                <span className="font-black text-[11px] uppercase text-slate-500 flex items-center gap-2">
                    <Icon name="activity" size={14} /> Base de Cálculo:
                </span>
                <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-200">
                    <button 
                        onClick={() => setCalcMode('projetado')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${calcMode === 'projetado' ? 'bg-slate-900 text-[#F8CC82] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Projetado (Tudo)
                    </button>
                    <button 
                        onClick={() => setCalcMode('realizado')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${calcMode === 'realizado' ? 'bg-slate-900 text-[#F8CC82] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Realizado (Só Pagas)
                    </button>
                </div>
            </div>

            {/* PRIMEIRA LINHA: FATURAMENTO, GASTOS, LUCRO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* FATURAMENTO TOTAL */}
                <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-center gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Faturamento Total</span>
                    <span className="text-2xl font-black text-slate-800">{formatMoney(currentRev)}</span>
                    <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1 mt-1">
                        <Icon name="dollar-sign" size={12} /> Todas as vendas do mês
                    </span>
                </div>

                {/* TOTAL DE GASTOS */}
                <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-center gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total de Gastos</span>
                    <span className="text-2xl font-black text-red-500">-{formatMoney(totalGastos)}</span>
                    <span className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1 mt-1">
                        <Icon name="activity" size={12} /> Saídas e taxas (Inclui pendentes)
                    </span>
                </div>

                {/* LUCRO PROJETADO */}
                <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-center gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Lucro Projetado</span>
                    <span className={`text-2xl font-black ${lucroProjetado < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {lucroProjetado < 0 ? '-' : ''}{formatMoney(Math.abs(lucroProjetado))}
                    </span>
                    <span className={`text-[10px] font-black uppercase flex items-center gap-1 mt-1 ${lucroProjetado < 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                        <Icon name="clock" size={12} /> Margem: {margemProjetada.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* SEGUNDA LINHA: META, MÉDIA, DIA MAIS VENDE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                
                {/* META DE CRESCIMENTO */}
                <div className="glass-card p-4 rounded-2xl bg-white border shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider mt-1">
                            Meta (Sobre {prevMonthName})
                        </span>
                        <div className="flex items-center gap-1 bg-slate-50 border px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-black text-slate-400 uppercase">+</span>
                            <input
                                type="number"
                                className="w-10 bg-transparent border-none outline-none text-[12px] font-black text-blue-600 text-center p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                style={{ MozAppearance: 'textfield' }}
                                value={goalPercent}
                                onChange={(e) => setGoalPercent(Number(e.target.value))}
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase">%</span>
                        </div>
                    </div>

                    <div className="mb-3">
                        <span className="text-xl font-black text-slate-800">{formatMoney(targetVal)}</span>
                    </div>

                    <div className="mt-auto">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden flex">
                            <div className={`h-full rounded-full transition-all duration-500 ${isGoalReached ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-1 text-blue-500">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> {progress.toFixed(1)}% Alcançado
                            </span>
                            {targetVal > 0 && !isGoalReached && <span className="text-orange-500">Falta {formatMoney(remaining)}</span>}
                            {isGoalReached && <span className="text-emerald-500">Meta Batida! 🚀</span>}
                        </div>
                    </div>
                </div>

                {/* MÉDIA DIÁRIA */}
                <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-center gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Média Diária</span>
                    <span className="text-2xl font-black text-blue-600">{formatMoney(stats?.ticketDiario || 0)}</span>
                    <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1 mt-1">
                        <Icon name="trending-up" size={12} /> Por Dia Ativo
                    </span>
                </div>

                {/* DIA QUE MAIS VENDE */}
                <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-center gap-1 relative overflow-hidden">
                    <Icon name="activity" size={90} className="absolute -right-4 -bottom-4 text-amber-50" />
                    <span className="text-[10px] font-black uppercase text-slate-300 block tracking-wider relative z-10">Dia que Mais Vende</span>
                    <span className="text-2xl font-black uppercase text-amber-500 relative z-10">{topDay ? topDay.name : '---'}</span>
                    <span className="text-[10px] font-bold text-amber-500 mt-1 relative z-10 uppercase tracking-widest flex items-center gap-1">
                        <Icon name="trending-up" size={12} /> Média: {topDay ? formatMoney(topDay.avg) : 'R$ 0,00'} / dia
                    </span>
                </div>
            </div>

            {/* RANKING DOS DIAS DA SEMANA */}
            <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Icon name="activity" size={16} /> Média de Vendas por Dia da Semana
                </h3>
                
                {stats?.weekdayAverages && stats.weekdayAverages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                        {stats.weekdayAverages.map((day, idx) => (
                            <div key={day.name} className={`p-4 rounded-xl border text-center flex flex-col justify-center gap-1 ${idx === 0 ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`block text-[11px] font-black uppercase tracking-wide ${idx === 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                    {idx === 0 ? '👑 ' : ''}{day.name}
                                </span>
                                <span className="block text-sm font-black text-slate-800">
                                    {formatMoney(day.avg)}
                                </span>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {day.count} {day.count === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-xs font-black uppercase text-slate-400 py-4">Sem registros de vendas neste mês</p>
                )}
            </div>

            {/* GRÁFICO DE FATURAMENTO MENSAL */}
            <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 mb-4 border-b pb-2">
                    Faturamento Mensal ({yearCurrent})
                </h3>
                
                <div className="flex items-end justify-between h-48 pt-6 px-2 border-b">
                    {monthlyTotals.map((m) => {
                        const heightPct = maxVal > 0 ? (m.totalVal / maxVal) * 100 : 0;
                        const isSelected = m.key === filterMonth;
                        return (
                            <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg relative flex items-end h-full">
                                    <div 
                                        style={{ height: `${heightPct}%` }} 
                                        className={`w-full rounded-t-lg transition-all duration-700 ${isSelected ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-300 group-hover:bg-slate-400'}`}
                                    />
                                </div>
                                <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {m.nome.substring(0, 3)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HISTÓRICO DETALHADO DA TABELA (COM CRESCIMENTO) */}
            <div className="glass-card p-5 rounded-2xl bg-white border shadow-sm">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Icon name="list" size={16} /> Histórico Detalhado
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-[#1A202C] text-white text-[10px] uppercase font-black tracking-wider">
                                <th className="p-3.5 rounded-l-xl">Mês</th>
                                <th className="p-3.5 text-center">Total de Pedidos</th>
                                <th className="p-3.5 text-right">Faturamento Bruto</th>
                                <th className="p-3.5 text-right rounded-r-xl">Crescimento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[12px] font-bold text-slate-700">
                            {monthlyTotals.map((m, index) => {
                                const isSelected = m.key === filterMonth;
                                const prevVal = index > 0 ? monthlyTotals[index - 1].totalVal : 0;
                                
                                let crescimentoText = '--';
                                let crescimentoColor = 'text-slate-400';

                                if (index > 0) {
                                    if (prevVal > 0) {
                                        const pct = ((m.totalVal - prevVal) / prevVal) * 100;
                                        crescimentoText = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
                                        crescimentoColor = pct > 0 ? 'text-emerald-500' : (pct < 0 ? 'text-red-500' : 'text-slate-400');
                                    } else if (prevVal === 0 && m.totalVal > 0) {
                                        crescimentoText = '+100.0%';
                                        crescimentoColor = 'text-emerald-500';
                                    }
                                }

                                return (
                                    <tr key={m.key} className={isSelected ? 'bg-blue-50/50 font-black' : 'hover:bg-slate-50'}>
                                        <td className="p-3.5 uppercase flex items-center gap-2">
                                            {m.nome}
                                            {isSelected && <span className="bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-sm tracking-widest font-black">SELECIONADO</span>}
                                        </td>
                                        <td className="p-3.5 text-center">{m.totalPedidos}</td>
                                        <td className="p-3.5 text-right">{formatMoney(m.totalVal)}</td>
                                        <td className={`p-3.5 text-right font-black ${crescimentoColor}`}>
                                            {crescimentoText}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Resultados;