import React from 'react';
import { p, formatMoney } from '../../utils/finance';

function CmvDashboard({ recipes, complements, combos, cmvSettings, ingredients, calcItemCost, calcComboCost }) {
    const cmvGeral = (() => { 
        let sumCmv = 0, count = 0; 
        [...recipes, ...complements, ...combos].forEach(item => { 
            if (!item.ignoreCMV) { 
                const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items); 
                const sp = p(item.sellingPrice); 
                if(sp>0){ sumCmv += (cost/sp)*100; count++; } 
            } 
        }); 
        return count>0 ? (sumCmv/count).toFixed(1) : 0; 
    })();

    const taxaIfood = p(cmvSettings.ifoodTax) > 0 ? p(cmvSettings.ifoodTax) : 12;

    return (
        <div className="space-y-4 fade-in">
            
            {/* ESTILO EXCLUSIVO PARA FORÇAR A IMPRESSORA A LER TODAS AS PÁGINAS */}
            <style>{`
                @media print {
                    /* Liberta o tamanho e remove barras de rolagem de todo o sistema na hora de imprimir */
                    html, body, #root, main, .overflow-y-auto, .overflow-x-auto, .no-scrollbar, .h-screen { 
                        height: auto !important; 
                        min-height: 100% !important; 
                        overflow: visible !important; 
                        position: static !important; 
                        display: block !important; 
                    }
                    /* Limpa fundos e sombras para poupar tinta */
                    .glass-card { 
                        border: none !important; 
                        box-shadow: none !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        background: transparent !important;
                    }
                    /* Garante que as linhas da tabela não são cortadas ao meio entre duas páginas */
                    table { page-break-after: auto; width: 100%; }
                    tr { page-break-inside: avoid !important; page-break-after: auto; }
                    td { page-break-inside: avoid !important; }
                    /* Repete o cabeçalho em todas as páginas impressas */
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            `}</style>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
                <div className="bg-[#1A202C] text-white p-5 rounded-xl text-center"><span className="text-slate-400 block font-bold text-[8px]">CMV Médio Geral de Engenharia</span><h3 className="text-2xl font-black text-[#F27A18] mt-1">{cmvGeral}%</h3></div>
                <div className="glass-card p-5 rounded-xl text-center"><span className="text-slate-500 block font-bold text-[8px]">Meta de Alvo CMV</span><h3 className="text-2xl font-black text-amber-500 mt-1">{cmvSettings.targetCMV}%</h3></div>
                <div className="glass-card p-5 rounded-xl text-center"><span className="text-slate-500 block font-bold text-[8px]">Insumos Ativos Mapeados</span><h3 className="text-2xl font-black text-slate-800 mt-1">{ingredients.length} Itens</h3></div>
            </div>

            <div className="glass-card p-4 rounded-xl shadow-sm bg-white">
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <h3 className="font-black text-slate-800 uppercase text-sm">Relação Completa de Margens e CMV do Cardápio</h3>
                    
                    <button 
                        onClick={() => window.print()} 
                        className="print:hidden bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase flex items-center gap-1.5 transition-colors border border-slate-200 shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Imprimir Relatório
                    </button>
                </div>
                
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-[11px] font-bold">
                        <thead className="bg-slate-100 text-slate-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-3 rounded-tl-lg">Produto Cardápio</th>
                                <th className="p-3">Custo Insumos</th>
                                <th className="p-3 text-blue-600">Venda Loja</th>
                                <th className="p-3 text-orange-600">Venda iFood (+{taxaIfood}%)</th>
                                <th className="p-3">CMV Real</th>
                                <th className="p-3 text-right rounded-tr-lg">Diagnóstico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                            {[...recipes.map(r=>({...r, _t:'Ficha'})), ...complements.map(c=>({...c, _t:'Extra'})), ...combos.map(c=>({...c, _t:'Combo'}))].sort((a,b)=>a.name.localeCompare(b.name)).map(item => {
                                const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items); 
                                const sp = p(item.sellingPrice); 
                                const cmv = sp > 0 ? (cost/sp)*100 : 0;
                                const ifoodPrice = sp * (1 + (taxaIfood / 100));

                                return (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-3">{item.name} <span className="text-[7px] bg-slate-100 px-1 rounded text-slate-400 print:border print:border-slate-300">{item._t}</span></td>
                                        <td className="p-3 text-slate-500">{formatMoney(cost)}</td>
                                        <td className="p-3 text-blue-700 font-black">{formatMoney(sp)}</td>
                                        <td className="p-3 text-orange-600 font-black">{formatMoney(ifoodPrice)}</td>
                                        <td className="p-3 font-black">{item.ignoreCMV ? '-' : cmv.toFixed(1) + '%'}</td>
                                        <td className="p-3 text-right">{item.ignoreCMV ? <span className="text-slate-400">Ignorado</span> : (cmv <= cmvSettings.targetCMV ? <span className="text-green-600 print:text-green-800">Saudável</span> : <span className="text-red-500 print:text-red-700">CMV Alto</span>)}</td>
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

export default CmvDashboard;