import React, { useState } from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney } from '../../utils/finance';

function Combos({ combos, comboCats, setComboCats, setComboForm, setIsComboModalOpen, delActionCMV, calcComboCost, cmvSettings, toggleCMVStatus }) {
    const [comboCollapsed, setComboCollapsed] = useState({});
    const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    
    const [localCats, setLocalCats] = useState([]);
    const allCats = Array.from(new Set([...(comboCats || []), ...localCats]));

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        const formatted = newCatName.trim().toUpperCase();
        if (allCats.includes(formatted)) {
            alert('Esta categoria já existe!');
            return;
        }
        setLocalCats(prev => [...prev, formatted]);
        if (typeof setComboCats === 'function') setComboCats(prev => [...prev, formatted]);
        setNewCatName('');
        setIsNewCatModalOpen(false);
    };

    return (
        <div className="space-y-4 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border shadow-sm gap-3">
                <div>
                    <h2 className="font-black text-slate-800 text-sm uppercase">Fichas de Combos Promocionais</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{combos.length} combos ativos</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsNewCatModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1 transition-colors border border-slate-200">
                        <Icon name="plus" size={12}/> Nova Categoria
                    </button>
                    <button type="button" onClick={() => {setComboForm({ id: '', name: '', category: allCats[0] || 'Geral', sellingPrice: '', items: [], ignoreCMV: false }); setIsComboModalOpen(true);}} className="bg-black text-[#F8CC82] px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1">
                        <Icon name="plus" size={12}/> Criar Combo
                    </button>
                </div>
            </div>

            {isNewCatModalOpen && (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl shadow-sm flex flex-col gap-2 max-w-md">
                    <h3 className="font-black text-amber-900 uppercase text-[10px] flex items-center gap-1">
                        <Icon name="layers" size={12}/> Adicionar Nova Categoria de Combos
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
                    const catCombos = combos.filter(c => (c.category || 'Outros') === cat); 
                    const isCollapsed = comboCollapsed[cat];
                    
                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex justify-between items-center border-b pb-1 cursor-pointer select-none" onClick={() => setComboCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}>
                                <div className="flex items-center gap-2 font-black text-slate-700 text-[11px]"><Icon name="layers" size={14} className="text-amber-500"/><span>{cat}</span><span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[8px] font-black">{catCombos.length}</span></div>
                                {isCollapsed ? <Icon name="chevron-down" size={14} className="text-slate-400"/> : <Icon name="chevron-up" size={14} className="text-slate-400"/>}
                            </div>
                            
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {catCombos.length > 0 ? (
                                        catCombos.sort((a,b)=>a.name.localeCompare(b.name)).map(combo => {
                                            const cost = calcComboCost(combo.items); 
                                            const sp = p(combo.sellingPrice); 
                                            const cmv = sp > 0 ? (cost/sp)*100 : 0;
                                            const target = cmvSettings.targetCMV || 35;
                                            const suggestedPrice = target > 0 ? cost / (target / 100) : 0;
                                            const ifoodPrice = combo.ifoodPrice ? p(combo.ifoodPrice) : sp * 1.25;

                                            return (
                                                <div key={combo.id} className={`glass-card rounded-xl p-4 flex flex-col justify-between border-t-4 transition-all ${combo.ignoreCMV ? "border-slate-300 opacity-60 bg-slate-50" : "border-amber-500 bg-white shadow"}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-black text-sm uppercase leading-tight pr-2">{combo.name}</h4>
                                                            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                                                                <button type="button" onClick={() => { if (toggleCMVStatus) toggleCMVStatus(combo.id, !combo.ignoreCMV, 'combos'); else { setComboForm({...combo, ignoreCMV: !combo.ignoreCMV}); setIsComboModalOpen(true); } }} className={`px-2 py-0.5 rounded text-[8px] uppercase font-black transition-colors border ${combo.ignoreCMV ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                                    {combo.ignoreCMV ? 'CMV: Desativado' : 'CMV: Ativo'}
                                                                </button>
                                                                <div className="flex gap-1">
                                                                    <button type="button" onClick={()=>{setComboForm({...combo}); setIsComboModalOpen(true);}} className="text-blue-500 bg-slate-100 px-2 py-1 rounded text-[8px] uppercase font-black">Editar</button>
                                                                    <button type="button" onClick={()=>delActionCMV('combos', combos, combo.id)} className="text-red-500 bg-red-50 px-2 py-1 rounded text-[8px] uppercase font-black">Excluir</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 my-2 text-center text-[10px] font-bold">
                                                            <div className="bg-slate-50 p-1.5 rounded border"><span>Custo Combo</span><span className="block text-slate-800 font-black">{formatMoney(cost)}</span></div>
                                                            <div className={`p-1.5 rounded border ${combo.ignoreCMV ? 'bg-slate-100 text-slate-400' : (cmv > target ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700')}`}><span>CMV Real</span><span className="block font-black">{cmv.toFixed(1)}%</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t space-y-1 mt-2">
                                                        <div className="flex justify-between items-center text-[10px] font-black"><span className="text-slate-500 uppercase">Preço Venda:</span><span className="text-slate-900">{formatMoney(sp)}</span></div>
                                                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase"><span>Sugerido ({target}%):</span><span className="text-emerald-600 font-black">{formatMoney(suggestedPrice)}</span></div>
                                                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase"><span>iFood (+25%):</span><span className="text-red-500 font-black">{formatMoney(ifoodPrice)}</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Categoria Vazia</p>
                                            <button type="button" onClick={() => { setComboForm({ id: '', name: '', category: cat, sellingPrice: '', items: [], ignoreCMV: false }); setIsComboModalOpen(true); }} className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase hover:bg-slate-100 transition-colors">
                                                + Adicionar Primeiro Combo
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
export default Combos;