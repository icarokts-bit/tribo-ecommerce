import React, { useState } from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney } from '../../utils/finance';

function Complementos({ complements, compCats, setCompCats, setCompForm, setIsCompModalOpen, delActionCMV, calcItemCost, cmvSettings, toggleCMVStatus }) {
    const [compCollapsed, setCompCollapsed] = useState({});
    const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    const [localCats, setLocalCats] = useState([]);
    const allCats = Array.from(new Set([...(compCats || []), ...localCats]));

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        const formatted = newCatName.trim().toUpperCase();
        if (allCats.includes(formatted)) {
            alert('Esta categoria já existe!');
            return;
        }
        setLocalCats(prev => [...prev, formatted]);
        if (typeof setCompCats === 'function') setCompCats(prev => [...prev, formatted]);
        setNewCatName('');
        setIsNewCatModalOpen(false);
    };

    return (
        <div className="space-y-4 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border shadow-sm gap-3">
                <div>
                    <h2 className="font-black text-slate-800 text-sm uppercase">Complementos e Adicionais de Lanche</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{complements.length} adicionais ativos</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsNewCatModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1 transition-colors border border-slate-200">
                        <Icon name="plus" size={12}/> Nova Categoria
                    </button>
                    <button type="button" onClick={() => {setCompForm({ id: '', name: '', category: allCats[0] || 'Geral', sellingPrice: '', ingredients: [], ignoreCMV: false }); setIsCompModalOpen(true);}} className="bg-black text-[#F8CC82] px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1">
                        <Icon name="plus" size={12}/> Criar Adicional
                    </button>
                </div>
            </div>

            {isNewCatModalOpen && (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl shadow-sm flex flex-col gap-2 max-w-md">
                    <h3 className="font-black text-amber-900 uppercase text-[10px] flex items-center gap-1">
                        <Icon name="layers" size={12}/> Adicionar Nova Categoria de Adicionais
                    </h3>
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input type="text" className="flex-1 p-2 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-amber-500" placeholder="Nome da Categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                        <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg font-black text-[9px] uppercase transition-colors">Salvar</button>
                        <button type="button" onClick={() => setIsNewCatModalOpen(false)} className="bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-black text-[9px] uppercase">Cancelar</button>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {allCats.map(cat => {
                    const catComps = complements.filter(c => (c.category || 'Outros') === cat); 
                    const isCollapsed = compCollapsed[cat];
                    
                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex justify-between items-center border-b pb-1 cursor-pointer select-none" onClick={() => setCompCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}>
                                <div className="flex items-center gap-2 font-black text-slate-700 text-[11px]"><Icon name="layers" size={14} className="text-indigo-600"/><span>{cat}</span><span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[8px] font-black">{catComps.length}</span></div>
                                {isCollapsed ? <Icon name="chevron-down" size={14} className="text-slate-400"/> : <Icon name="chevron-up" size={14} className="text-slate-400"/>}
                            </div>
                            
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {catComps.length > 0 ? (
                                        catComps.sort((a,b)=>a.name.localeCompare(b.name)).map(comp => {
                                            const cost = calcItemCost(comp.ingredients);
                                            const sp = p(comp.sellingPrice);
                                            const cmv = sp > 0 ? (cost/sp)*100 : 0;
                                            const target = cmvSettings?.targetCMV || 35;
                                            const suggestedPrice = target > 0 ? cost / (target / 100) : 0;
                                            const ifoodPrice = comp.ifoodPrice ? p(comp.ifoodPrice) : sp * 1.25;

                                            return (
                                                <div key={comp.id} className={`glass-card rounded-xl p-4 shadow-sm border flex flex-col justify-between transition-all ${comp.ignoreCMV ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-black uppercase text-slate-900 text-xs leading-tight pr-1">{comp.name}</h4>
                                                            <button type="button" onClick={() => { if (toggleCMVStatus) toggleCMVStatus(comp.id, !comp.ignoreCMV, 'complements'); else { setCompForm({...comp, ignoreCMV: !comp.ignoreCMV}); setIsCompModalOpen(true); } }} className={`px-2 py-0.5 rounded text-[8px] uppercase font-black transition-colors border flex-shrink-0 ${comp.ignoreCMV ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                                {comp.ignoreCMV ? 'Desativado' : 'Ativo'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="my-2 pt-2 border-t text-[9px] font-bold space-y-1">
                                                        <div className="flex justify-between"><span>Custo:</span><span className="text-red-500 font-black">{formatMoney(cost)}</span></div>
                                                        <div className="flex justify-between"><span>Venda:</span><span className="text-slate-900 font-black">{formatMoney(sp)}</span></div>
                                                        <div className="flex justify-between text-[8px] text-slate-400"><span>Sugerido:</span><span className="text-emerald-600 font-bold">{formatMoney(suggestedPrice)}</span></div>
                                                        <div className="flex justify-between text-[8px] text-slate-400"><span>iFood:</span><span className="text-red-400 font-bold">{formatMoney(ifoodPrice)}</span></div>
                                                    </div>
                                                    <div className="flex gap-1.5 mt-2 pt-2 border-t">
                                                        <button type="button" onClick={()=>{setCompForm({...comp}); setIsCompModalOpen(true);}} className="flex-1 bg-slate-100 py-1 rounded font-black text-blue-600 text-[8px] uppercase">Editar</button>
                                                        <button type="button" onClick={()=>delActionCMV('complements', complements, comp.id)} className="flex-1 bg-red-50 py-1 rounded font-black text-red-500 text-[8px] uppercase">Excluir</button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Categoria Vazia</p>
                                            <button type="button" onClick={() => { setCompForm({ id: '', name: '', category: cat, sellingPrice: '', ingredients: [], ignoreCMV: false }); setIsCompModalOpen(true); }} className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase hover:bg-slate-100 transition-colors">
                                                + Adicionar Primeiro Adicional
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
export default Complementos;