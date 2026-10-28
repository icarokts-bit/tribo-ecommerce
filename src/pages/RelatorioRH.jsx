import React, { useMemo } from 'react';
import Icon from '../components/Icon';

export default function RelatorioRH({ transactions = [], filterMonth }) {
    
    // Função local para formatar moeda
    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    };

    // Pega o mês da transação (YYYY-MM)
    const getTxMonth = (tx) => {
        if (!tx.clearanceDate && !tx.date) return '';
        const d = tx.clearanceDate || tx.date;
        return d.substring(0, 7);
    };

    // Processamento dos Dados
    const { 
        transacoesRH, 
        totalGeral, 
        totalMotoboy, 
        totalFreela, 
        totalFixo,
        custoPorFuncionario
    } = useMemo(() => {
        let tGeral = 0;
        let tMotoboy = 0;
        let tFreela = 0;
        let tFixo = 0;
        const porFuncionario = {};

        // Filtra apenas despesas do mês selecionado que sejam relacionadas a RH
        const filtradas = transactions.filter(t => {
            if (getTxMonth(t) !== filterMonth) return false;
            if (t.type !== 'saida') return false;
            if (t.status !== 'pago' && t.status !== 'pendente') return false; // Ignora cancelados se houver

            const cat = (t.category || '').toLowerCase();
            
            // PALAVRAS-CHAVE ATUALIZADAS
            const isMotoboy = cat.includes('motoboy') || cat.includes('motoqueiro') || cat.includes('entrega');
            const isFreela = cat.includes('freelancer') || cat.includes('diária') || cat.includes('diaria');
            const isFixo = cat.includes('rh') || cat.includes('folha') || cat.includes('salário') || cat.includes('salario') || cat.includes('pró-labore') || cat.includes('pro-labore') || cat.includes('adiantamento') || cat.includes('encargo') || cat.includes('ajudante');

            return isMotoboy || isFreela || isFixo;
        }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        // Calcula os totais
        filtradas.forEach(t => {
            const valor = parseFloat(t.amount) || 0;
            const cat = (t.category || '').toLowerCase();
            
            // Se não tiver fornecedor, usa a categoria para não ficar "Não Informado" no gráfico
            const nome = t.supplier || (cat.includes('entrega') ? 'Taxas de Entrega' : 'Não Informado');

            tGeral += valor;

            // Agrupa nos cards correspondentes
            if (cat.includes('motoboy') || cat.includes('motoqueiro') || cat.includes('entrega')) {
                tMotoboy += valor;
            } else if (cat.includes('freelancer') || cat.includes('diária') || cat.includes('diaria')) {
                tFreela += valor;
            } else {
                tFixo += valor;
            }

            porFuncionario[nome] = (porFuncionario[nome] || 0) + valor;
        });

        // Transforma o objeto de funcionários em array ordenado
        const arrayFuncionarios = Object.keys(porFuncionario).map(nome => ({
            nome,
            total: porFuncionario[nome]
        })).sort((a, b) => b.total - a.total);

        return {
            transacoesRH: filtradas,
            totalGeral: tGeral,
            totalMotoboy: tMotoboy,
            totalFreela: tFreela,
            totalFixo: tFixo,
            custoPorFuncionario: arrayFuncionarios
        };
    }, [transactions, filterMonth]);

    // Encontra o maior custo para desenhar a barra de progresso proporcional
    const maxCustoFuncionario = custoPorFuncionario.length > 0 ? custoPorFuncionario[0].total : 0;

    return (
        <div className="p-2 md:p-6 text-white min-h-screen bg-slate-950 font-sans space-y-6 fade-in">
            
            <div className="border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3 text-emerald-500">
                    <Icon name="pie-chart" size={28} />
                    Relatório Financeiro de RH
                </h2>
                <p className="text-slate-400 text-sm font-bold uppercase mt-1">Análise de custos com equipe no mês de {filterMonth.split('-').reverse().join('/')}</p>
            </div>

            {/* CARDS DE RESUMO */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5 text-emerald-500"><Icon name="users" size={100} /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Custo Total (Equipe)</p>
                    <h3 className="text-2xl font-black text-white">{formatarMoeda(totalGeral)}</h3>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2"><Icon name="truck" size={12}/> Delivery (Motoboys)</p>
                    <h3 className="text-xl font-black text-slate-200">{formatarMoeda(totalMotoboy)}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{totalGeral > 0 ? ((totalMotoboy / totalGeral) * 100).toFixed(1) : 0}% do total</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2"><Icon name="briefcase" size={12}/> Diárias (Freelas)</p>
                    <h3 className="text-xl font-black text-slate-200">{formatarMoeda(totalFreela)}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{totalGeral > 0 ? ((totalFreela / totalGeral) * 100).toFixed(1) : 0}% do total</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2"><Icon name="dollar-sign" size={12}/> Salários / Fixos</p>
                    <h3 className="text-xl font-black text-slate-200">{formatarMoeda(totalFixo)}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{totalGeral > 0 ? ((totalFixo / totalGeral) * 100).toFixed(1) : 0}% do total</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* RANKING POR FUNCIONÁRIO */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-300 mb-6 border-b border-slate-800 pb-3">
                        <Icon name="bar-chart-2" size={16} className="text-emerald-500"/> Ranking de Custo por Colaborador
                    </h3>

                    {custoPorFuncionario.length === 0 ? (
                        <div className="text-center text-slate-500 font-bold uppercase py-10 text-xs">Nenhum custo registrado neste mês.</div>
                    ) : (
                        <div className="space-y-5">
                            {custoPorFuncionario.map((item, index) => {
                                const percentual = maxCustoFuncionario > 0 ? (item.total / maxCustoFuncionario) * 100 : 0;
                                return (
                                    <div key={index} className="relative">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="font-black text-xs uppercase text-slate-200 truncate pr-4">{item.nome}</span>
                                            <span className="font-black text-sm text-emerald-400">{formatarMoeda(item.total)}</span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                                            <div 
                                                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000" 
                                                style={{ width: `${percentual}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* EXTRATO DETALHADO */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col max-h-[600px]">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-300 mb-4 border-b border-slate-800 pb-3 shrink-0">
                        <Icon name="list" size={16} className="text-indigo-400"/> Extrato Detalhado de RH
                    </h3>

                    <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {transacoesRH.length === 0 ? (
                            <div className="text-center text-slate-500 font-bold uppercase py-10 text-xs">Sem lançamentos no período.</div>
                        ) : (
                            transacoesRH.map(tx => (
                                <div key={tx.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center hover:border-slate-700 transition-colors">
                                    <div className="overflow-hidden pr-3">
                                        <h4 className="font-black text-xs uppercase text-slate-200 truncate">{tx.description}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded truncate max-w-[120px]">
                                                {tx.category}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                <Icon name="calendar" size={8} /> {tx.date.split('-').reverse().join('/')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`block text-sm font-black ${tx.status === 'pendente' ? 'text-amber-500' : 'text-slate-300'}`}>
                                            {formatarMoeda(tx.amount)}
                                        </span>
                                        <span className="text-[8px] font-bold uppercase text-slate-500">
                                            {tx.status === 'pendente' ? 'A Vencer' : 'Pago'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}