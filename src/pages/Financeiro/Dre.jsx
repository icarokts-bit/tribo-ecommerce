import React, { useMemo } from 'react';

function Dre({ transactions = [], selectedMonth, selectedYear, formatMoney }) {
    // 1. Calcula o mês do filtro atual (ex: "10/2026")
    const month = selectedMonth !== undefined ? selectedMonth : new Date().getMonth();
    const year = selectedYear !== undefined ? selectedYear : new Date().getFullYear();
    const filterMonth = `${String(month + 1).padStart(2, '0')}/${year}`;

    // Fallback de segurança caso a função formatMoney não chegue pelas propriedades
    const safeFormatMoney = formatMoney || ((val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

    // 2. Processa as transações do mês para montar a DRE
    const stats = useMemo(() => {
        let rb = 0;
        const catCosts = {};

        (transactions || []).forEach(t => {
            if (!t.date) return;
            
            // Extrai o mês e ano da data da transação (YYYY-MM-DD -> MM/YYYY)
            const [tYear, tMonth] = t.date.split('-');
            const txMonthStr = `${tMonth}/${tYear}`;

            if (txMonthStr === filterMonth) {
                const val = parseFloat(t.amount) || 0;
                
                if (t.type === 'entrada') {
                    rb += val;
                } else if (t.type === 'saida') {
                    const cat = t.category || 'Sem Categoria';
                    if (!catCosts[cat]) catCosts[cat] = 0;
                    catCosts[cat] += val;
                }
            }
        });

        // Calcula o lucro subtraindo todos os custos agrupados da receita bruta
        const totalCustos = Object.values(catCosts).reduce((acc, curr) => acc + curr, 0);
        const lucro = rb - totalCustos;

        return { rb, catCosts, lucro };
    }, [transactions, filterMonth]);

    return (
        <div className="max-w-2xl mx-auto glass-card rounded-xl p-5 shadow-xl border-t-4 border-[#D97757] fade-in mt-4">
            <h2 className="font-black uppercase text-center border-b border-slate-200 pb-3 mb-3 text-base text-slate-800">
                Demonstração do Resultado - {filterMonth}
            </h2>
            <div className="space-y-2.5 text-[10px] font-bold">
                <div className="flex justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg font-black text-emerald-700 shadow-sm">
                    <span>(+) Receita Bruta (Entradas)</span>
                    <span>{safeFormatMoney(stats.rb)}</span>
                </div>
                
                <div className="p-3 border border-slate-200 rounded-lg space-y-2 bg-white shadow-sm">
                    <span className="text-slate-400 block text-[9px] font-black uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">
                        Despesas e Custos por Categoria
                    </span>
                    
                    {Object.keys(stats.catCosts).length === 0 ? (
                        <div className="text-center text-slate-400 font-bold py-2 italic">Nenhuma saída registada neste mês.</div>
                    ) : (
                        Object.entries(stats.catCosts)
                            .sort((a, b) => b[1] - a[1]) // Ordena do maior custo para o menor
                            .map(([c, v]) => (
                                <div key={c} className="flex justify-between text-slate-600 font-medium hover:bg-slate-50 p-1 rounded transition-colors">
                                    <span>(-) {c}</span>
                                    <span className="text-red-500 font-black">{safeFormatMoney(v)}</span>
                                </div>
                            ))
                    )}
                </div>
                
                <div className={`flex justify-between items-center p-4 rounded-lg mt-3 text-sm font-black shadow-md transition-colors ${stats.lucro >= 0 ? "bg-slate-900 text-amber-400" : "bg-red-600 text-white"}`}>
                    <span>(=) Resultado Líquido Operacional</span>
                    <span>{safeFormatMoney(stats.lucro)}</span>
                </div>
            </div>
        </div>
    );
}

export default Dre;