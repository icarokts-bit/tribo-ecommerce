import React from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney, getTxMonth } from '../../utils/finance';

function AReceber({ transactions, filterMonth, getEffectiveStatus, openLiquidation }) {
    
    // 1. Filtra as transações de ENTRADA que estão PENDENTES no mês filtrado
    const pendingTxs = transactions.filter(t => 
        t.type === 'entrada' && 
        getTxMonth(t) === filterMonth && 
        getEffectiveStatus(t) !== 'pago'
    );

    // 2. Agrupa os lançamentos pela data de recebimento (clearanceDate) e soma os totais do dia
    const grouped = pendingTxs.reduce((acc, t) => {
        const date = t.clearanceDate || t.date;
        if (!acc[date]) acc[date] = { total: 0, items: [] };
        acc[date].items.push(t);
        acc[date].total += p(t.amount);
        return acc;
    }, {});

    // 3. Ordena as datas cronologicamente
    const sortedDates = Object.keys(grouped).sort();

    // 4. Calcula o total geral do mês
    const totalGeral = pendingTxs.reduce((acc, t) => acc + p(t.amount), 0);

    const hojeStr = new Date().toISOString().split('T')[0];

    return (
        <div className="fade-in space-y-4">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                        <Icon name="arrow-down-circle" size={20} className="text-emerald-500" />
                        Contas a Receber
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valores pendentes</p>
                </div>
                <div className="text-right bg-emerald-50 p-2 md:p-3 rounded-xl border border-emerald-100">
                    <span className="block text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total a Receber (Mês)</span>
                    <span className="text-lg md:text-xl font-black text-emerald-600">{formatMoney(totalGeral)}</span>
                </div>
            </div>

            {sortedDates.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center">
                    <Icon name="inbox" size={40} className="text-slate-300 mb-3" />
                    <span className="text-sm font-black text-slate-500 uppercase">Nenhum recebimento.</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Não há entradas pendentes para este mês.</span>
                </div>
            ) : (
                sortedDates.map(date => {
                    const [y, m, d] = date.split('-');
                    const dataFormatada = `${d}/${m}`;
                    const isAtrasado = date < hojeStr;

                    return (
                        <div key={date} className={`bg-white rounded-2xl shadow-sm border overflow-hidden mb-4 ${isAtrasado ? 'border-amber-300 shadow-amber-500/10' : 'border-slate-200'}`}>
                            
                            {/* CABEÇALHO DO DIA + TOTAL DO DIA */}
                            <div className={`p-3 flex justify-between items-center border-b ${isAtrasado ? 'bg-amber-50 border-amber-200' : 'bg-slate-100/50 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded font-black text-xs uppercase ${isAtrasado ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                                        {dataFormatada}
                                    </span>
                                    {isAtrasado && <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse flex items-center gap-1"><Icon name="clock" size={12}/> Em Atraso</span>}
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:inline">Total do Dia:</span>
                                    <span className="font-black text-sm text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{formatMoney(grouped[date].total)}</span>
                                </div>
                            </div>

                            {/* LISTA DE ITENS DO DIA */}
                            <div className="divide-y divide-slate-100">
                                {grouped[date].items.map(t => (
                                    <div key={t.id} className="p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors gap-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 uppercase text-[11px] md:text-xs">{t.description}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{t.category} {t.account ? `• ${t.account}` : ''}</span>
                                        </div>
                                        <div className="flex items-center justify-between w-full md:w-auto gap-4 mt-2 md:mt-0">
                                            <span className="font-black text-emerald-500 text-sm">{formatMoney(p(t.amount))}</span>
                                            <button 
                                                onClick={() => openLiquidation(t)} 
                                                className="bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all shadow-sm flex items-center gap-1.5"
                                            >
                                                <Icon name="check-square" size={14} /> Receber
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default AReceber;