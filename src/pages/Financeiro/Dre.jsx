import React from 'react';
import { formatMoney } from '../../utils/finance';

function Dre({ filterMonth, stats }) {
    return (
        <div className="max-w-2xl mx-auto glass-card rounded-xl p-5 shadow-xl border-t-4 border-[#D97757] fade-in">
            <h2 className="font-black uppercase text-center border-b pb-3 mb-3 text-base">Demonstração do Resultado do Exercício - {filterMonth}</h2>
            <div className="space-y-2.5 text-[10px] font-bold">
                <div className="flex justify-between p-2 bg-green-50 rounded font-black text-green-700"><span>(+) Receita Bruta Faturamento</span><span>{formatMoney(stats.rb)}</span></div>
                <div className="p-2 border rounded space-y-1 bg-slate-50/50">
                    <span className="text-slate-400 block text-[8px] font-black">Despesas e Custos por Categoria</span>
                    {Object.entries(stats.catCosts).map(([c, v]) => (
                        <div key={c} className="flex justify-between text-slate-600 font-medium"><span>(-) {c}</span><span className="text-red-500 font-bold">{formatMoney(v)}</span></div>
                    ))}
                </div>
                <div className={"flex justify-between items-center p-4 rounded-lg mt-3 text-sm font-black " + (stats.lucro >= 0 ? "bg-[#1A202C] text-[#F8CC82]" : "bg-red-600 text-white")}>
                    <span>(=) Resultado Líquido Operacional</span>
                    <span>{formatMoney(stats.lucro)}</span>
                </div>
            </div>
        </div>
    );
}

export default Dre;