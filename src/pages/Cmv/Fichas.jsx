import React, { useState } from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney } from '../../utils/finance';

function Fichas({ recipes, recCats, setRecCats, setRecipeForm, setIsRecipeModalOpen, delActionCMV, calcItemCost, cmvSettings, toggleCMVStatus }) {
    const [recipeCollapsed, setRecipeCollapsed] = useState({});
    const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    
    // MEMÓRIA LOCAL: Garante que a categoria recém-criada aparece na tela imediatamente
    const [localCats, setLocalCats] = useState([]);
    const allCats = Array.from(new Set([...(recCats || []), ...localCats]));

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        const formatted = newCatName.trim().toUpperCase();
        
        if (allCats.includes(formatted)) {
            alert('Esta categoria já existe!');
            return;
        }

        setLocalCats(prev => [...prev, formatted]); // Mostra na tela na hora
        if (typeof setRecCats === 'function') setRecCats(prev => [...prev, formatted]);
        
        setNewCatName('');
        setIsNewCatModalOpen(false);
    };

    return (
        <div className="space-y-4 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border shadow-sm gap-3">
                <div>
                    <h2 className="font-black text-slate-800 text-sm uppercase">Fichas Técnicas Operacionais</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{recipes.length} produtos mapeados com custos precisos</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsNewCatModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1 transition-colors border border-slate-200">
                        <Icon name="plus" size={12}/> Nova Categoria
                    </button>
                    <button type="button" onClick={() => {setRecipeForm({ id: '', name: '', category: allCats[0] || 'Geral', sellingPrice: '', ingredients: [], ignoreCMV: false, yield: 1 }); setIsRecipeModalOpen(true);}} className="bg-black text-[#F8CC82] px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1">
                        <Icon name="plus" size={12}/> Criar Ficha
                    </button>
                </div>
            </div>

            {isNewCatModalOpen && (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl shadow-sm flex flex-col gap-2 max-w-md">
                    <h3 className="font-black text-amber-900 uppercase text-[10px] flex items-center gap-1">
                        <Icon name="utensils" size={12}/> Adicionar Nova Categoria
                    </h3>
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input type="text" className="flex-1 p-2 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-amber-500" placeholder="Ex: Bebidas..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                        <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg font-black text-[9px] uppercase transition-colors">Salvar</button>
                        <button type="button" onClick={() => setIsNewCatModalOpen(false)} className="bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-black text-[9px] uppercase">Cancelar</button>
                    </form>
                </div>
            )}

            <div className="space-y-6">
                {allCats.map(cat => {
                    const catRecs = recipes.filter(r => (r.category || 'Outros') === cat); 
                    const isCollapsed = recipeCollapsed[cat];

                    return (
                        <div key={cat} className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-1 cursor-pointer select-none" onClick={() => setRecipeCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}>
                                <div className="flex items-center gap-2 font-black text-slate-700 text-[11px]">
                                    <Icon name="utensils" size={14} className="text-[#F27A18]"/>
                                    <span>{cat}</span>
                                    <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[8px] font-black">{catRecs.length}</span>
                                </div>
                                {isCollapsed ? <Icon name="chevron-down" size={14} className="text-slate-400"/> : <Icon name="chevron-up" size={14} className="text-slate-400"/>}
                            </div>
                            
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {catRecs.length > 0 ? (
                                        catRecs.sort((a,b)=>a.name.localeCompare(b.name)).map(rec => {
                                            // NOVA LÓGICA: Calcula o custo total e divide pelo rendimento (padrão 1 se não existir)
                                            const rendimento = rec.yield ? Number(rec.yield) : 1;
                                            const cost = calcItemCost(rec.ingredients) / rendimento; 
                                            
                                            const sp = p(rec.sellingPrice); 
                                            const cmv = sp > 0 ? (cost/sp)*100 : 0;
                                            const target = cmvSettings.targetCMV || 35;
                                            const suggestedPrice = target > 0 ? cost / (target / 100) : 0;
                                            const ifoodPrice = rec.ifoodPrice ? p(rec.ifoodPrice) : sp * 1.25; 
                                            
                                            return (
                                                <div key={rec.id} className={`glass-card rounded-xl p-4 shadow-sm flex flex-col justify-between border-t-4 transition-all ${rec.ignoreCMV ? "border-slate-300 opacity-60 bg-slate-50" : "border-[#1A202C] bg-white"}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-black text-sm text-slate-900 leading-tight pr-2">
                                                                {rec.name}
                                                                {rendimento > 1 && <span className="block text-[9px] text-slate-400 uppercase mt-0.5">Rende {rendimento} un.</span>}
                                                            </h4>
                                                            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                                                                <button type="button" onClick={() => { if (toggleCMVStatus) toggleCMVStatus(rec.id, !rec.ignoreCMV); else { setRecipeForm({...rec, ignoreCMV: !rec.ignoreCMV}); setIsRecipeModalOpen(true); } }} className={`px-2 py-0.5 rounded text-[8px] uppercase font-black transition-colors border ${rec.ignoreCMV ? 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`} title="Alternar status CMV">
                                                                    {rec.ignoreCMV ? 'CMV: Desativado' : 'CMV: Ativo'}
                                                                </button>
                                                                <div className="flex gap-1">
                                                                    <button type="button" onClick={()=>{setRecipeForm({...rec}); setIsRecipeModalOpen(true);}} className="text-blue-500 bg-blue-50 px-2 py-1 rounded text-[8px] uppercase font-black hover:bg-blue-100 transition-colors">Editar</button>
                                                                    <button type="button" onClick={()=>delActionCMV('recipes', recipes, rec.id)} className="text-red-500 bg-red-50 px-2 py-1 rounded text-[8px] uppercase font-black hover:bg-red-100 transition-colors">Excluir</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 my-3 text-center text-[10px] font-bold">
                                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200"><span className="uppercase text-slate-500">Custo Un.</span><span className="block text-slate-800 font-black text-sm mt-0.5">{formatMoney(cost)}</span></div>
                                                            <div className={`p-2 rounded-lg border ${rec.ignoreCMV ? "bg-slate-100 text-slate-400 border-slate-200" : (cmv > target ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}`}><span className="uppercase">CMV Real</span><span className="block font-black text-sm mt-0.5">{cmv.toFixed(1)}%</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-3 border-t border-slate-200 space-y-1.5 mt-2">
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Preço Venda:</span><span className={`text-sm font-black ${rec.ignoreCMV ? 'text-slate-500' : 'text-slate-900'}`}>{formatMoney(sp)}</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço Sugerido <span className="text-[8px] font-normal">({target}%)</span>:</span><span className={`text-xs font-black ${rec.ignoreCMV ? 'text-slate-400' : 'text-emerald-600'}`}>{formatMoney(suggestedPrice)}</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço iFood <span className="text-[8px] font-normal">(+25%)</span>:</span><span className={`text-xs font-black ${rec.ignoreCMV ? 'text-slate-400' : 'text-red-500'}`}>{formatMoney(ifoodPrice)}</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Categoria Vazia</p>
                                            <button type="button" onClick={() => { setRecipeForm({ id: '', name: '', category: cat, sellingPrice: '', ingredients: [], ignoreCMV: false, yield: 1 }); setIsRecipeModalOpen(true); }} className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase hover:bg-slate-100 transition-colors">
                                                + Adicionar Primeiro Produto
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
export default Fichas;