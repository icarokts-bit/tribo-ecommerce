import React, { useState } from 'react';
import Icon from '../../components/Icon';
import { formatMoney } from '../../utils/finance';

function Insumos({ ingredients, ingCats, setIngForm, setIsIngModalOpen, executeDelete, getIngCost }) {
    const [ingCollapsed, setIngCollapsed] = useState({});

    return (
        <div className="space-y-4 fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div><h2 className="font-black text-slate-800 text-sm uppercase">Banco de Insumos e Ingredientes</h2><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{ingredients.length} itens cadastrados no sistema</p></div>
                <button type="button" onClick={() => {setIngForm({ id: '', name: '', category: ingCats[0], cost: '', unit: 'g', qty: '' }); setIsIngModalOpen(true);}} className="bg-black text-[#F8CC82] px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1"><Icon name="plus" size={12}/> Novo Insumo</button>
            </div>
            <div className="space-y-4">
                {ingCats.map(cat => {
                    const catIngs = ingredients.filter(i => (i.category || 'Outros') === cat); 
                    if (catIngs.length === 0) return null;
                    const isCollapsed = ingCollapsed[cat];
                    
                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex justify-between items-center border-b pb-1 cursor-pointer select-none" onClick={() => setIngCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}>
                                <div className="flex items-center gap-2 font-black text-slate-700 text-[11px]"><Icon name="box" size={14} className="text-emerald-600"/><span>{cat}</span><span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[8px] font-black">{catIngs.length}</span></div>
                                {isCollapsed ? <Icon name="chevron-down" size={14} className="text-slate-400"/> : <Icon name="chevron-up" size={14} className="text-slate-400"/>}
                            </div>
                            {!isCollapsed && (
                                <div className="glass-card rounded-xl overflow-hidden border shadow-sm">
                                    <table className="w-full text-left text-[11px]">
                                        <thead className="bg-slate-100 font-black text-slate-500 uppercase tracking-widest border-b"><tr><th className="p-3">Ingrediente</th><th className="p-3">Preço Base Compras</th><th className="p-3">Custo Grama/Unidade</th><th className="p-3 text-right">Ação</th></tr></thead>
                                        <tbody className="divide-y font-bold text-slate-700">
                                            {catIngs.sort((a,b)=>a.name.localeCompare(b.name)).map(ing => (
                                                <tr key={ing.id} className="hover:bg-slate-50">
                                                    <td className="p-3 text-slate-900">{ing.name}</td>
                                                    <td className="p-3">{formatMoney(ing.cost)} <span className="text-slate-400">/ {ing.qty}{ing.unit}</span></td>
                                                    <td className="p-3 text-emerald-600">{formatMoney(getIngCost(ing.id, ing.unit==='kg'||ing.unit==='L'?1000:1))} <span className="text-slate-400">/ {ing.unit==='kg'?'g':ing.unit==='L'?'ml':ing.unit}</span></td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button type="button" onClick={()=>{setIngForm({...ing}); setIsIngModalOpen(true);}} className="text-blue-500 bg-slate-100 px-2 py-1 rounded text-[8px] font-black uppercase">Editar</button>
                                                            <button type="button" onClick={() => executeDelete('cmv_data/state', ing.id)} className="text-red-500 bg-red-50 px-2 py-1 rounded text-[8px] font-black uppercase">Excluir</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Insumos;