import React from 'react';
import { p, formatMoney } from '../../utils/finance';

function Analise({ fixedCosts, recipes, complements, combos, cmvSettings, stats, calcItemCost, calcComboCost }) {
    const totalFixedCosts = fixedCosts.reduce((s,c)=>s+p(c.value),0);
    const cmvGeral = (() => { let sumCmv = 0, count = 0; [...recipes, ...complements, ...combos].forEach(item => { if (!item.ignoreCMV) { const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items); const sp = p(item.sellingPrice); if(sp>0){ sumCmv += (cost/sp)*100; count++; } } }); return count>0 ? (sumCmv/count).toFixed(1) : 0; })();
    const margemContribuicao = 1 - (p(cmvGeral)/100) - ((p(cmvSettings.tax) + p(cmvSettings.apps) + p(cmvSettings.taxaCredito))/100);
    const pontoEquilibrio = margemContribuicao > 0 ? totalFixedCosts / margemContribuicao : 0;

    return (
        <div className="space-y-4 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-xl border-l-4 border-blue-500 text-center"><span className="text-slate-400 block font-black text-[8px]">Faturamento Comercial Real</span><h3 className="text-xl font-black text-slate-800 mt-1">{formatMoney(stats.rb)}</h3></div>
                <div className="glass-card p-4 rounded-xl border-l-4 border-red-500 text-center"><span className="text-slate-400 block font-black text-[8px]">Custos Fixos Totais Cadastrados</span><h3 className="text-xl font-black text-red-500 mt-1">{formatMoney(totalFixedCosts)}</h3></div>
                <div className="glass-card p-4 rounded-xl border-l-4 border-emerald-500 text-center"><span className="text-slate-400 block font-black text-[8px]">Ponto de Equilíbrio Operacional</span><h3 className="text-xl font-black text-emerald-600 mt-1">{formatMoney(pontoEquilibrio)}</h3></div>
            </div>
            <div className="glass-card rounded-xl overflow-hidden border shadow-sm">
                <table className="w-full text-left text-[11px] font-bold">
                    <thead className="bg-[#1A202C] text-white uppercase tracking-widest"><tr><th className="p-3">Produto</th><th className="p-3 text-right">Custo Insumo</th><th className="p-3 text-right">Preço Venda Cantinho</th><th className="p-3 text-right">Sugestão de Alvo</th><th className="p-3 text-center">CMV (%)</th><th className="p-3 text-center">Margem %</th></tr></thead>
                    <tbody className="divide-y text-slate-700">
                        {[...recipes.map(r=>({...r, _t:'Ficha'})), ...complements.map(c=>({...c, _t:'Extra'})), ...combos.map(c=>({...c, _t:'Combo'}))].sort((a,b)=>a.name.localeCompare(b.name)).map(item => {
                            const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items); const sp = p(item.sellingPrice); const cmv = sp > 0 ? (cost/sp)*100 : 0;
                            const suggested = cmvSettings.targetCMV > 0 ? cost / (cmvSettings.targetCMV/100) : 0;
                            return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-3">{item.name}</td><td className="p-3 text-right text-slate-500">{formatMoney(cost)}</td><td className="p-3 text-right text-slate-900">{formatMoney(sp)}</td><td className="p-3 text-right text-emerald-600">{formatMoney(suggested)}</td><td className={"p-3 text-center " + (cmv > cmvSettings.targetCMV ? "text-red-500" : "text-green-600")}>{cmv.toFixed(1)}%</td><td className="p-3 text-center">{(100 - cmv).toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Analise;