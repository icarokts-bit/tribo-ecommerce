import React from 'react';
import { p, formatMoney } from '../../utils/finance';

function CustosFixos({ fixedCosts, fcCats, fcForm, setFcForm, crudActionCMV, setIsFcModalOpen, delActionCMV }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-in">
            <div className="glass-card p-4 rounded-xl h-fit space-y-3"><h3 className="font-black text-sm uppercase">Cadastrar Nova Despesa Fixa</h3>
                <form onSubmit={(e) => { e.preventDefault(); crudActionCMV('fixedCosts', fixedCosts, fcForm, setIsFcModalOpen); setFcForm({ id: '', description: '', category: fcCats[0], value: '' }); }} className="space-y-3">
                    <input type="text" placeholder="Nome Custo Fixo (Ex: Aluguel)" required className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none" value={fcForm.description} onChange={e=>setFcForm({...fcForm, description: e.target.value})} />
                    <select className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none" value={fcForm.category} onChange={e=>setFcForm({...fcForm, category: e.target.value})}>{fcCats.map(c=><option key={c} value={c}>{c}</option>)}</select>
                    <input type="number" step="0.01" placeholder="Valor Mensal R$" required className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none" value={fcForm.value} onChange={e=>setFcForm({...fcForm, value: e.target.value})} />
                    <button className="w-full bg-black text-[#F8CC82] p-2.5 rounded-lg font-black uppercase text-[10px]">Gravar Custo Fixo</button>
                </form>
            </div>
            <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden border shadow-sm">
                <table className="w-full text-left text-[11px] font-bold text-slate-700">
                    <thead className="bg-slate-100 text-slate-500 uppercase tracking-widest border-b"><tr><th className="p-3">Descrição da Despesa</th><th className="p-3">Categoria Estrutural</th><th className="p-3 text-right">Valor Mensal</th><th className="p-3 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y">
                        {fixedCosts.map(fc => (
                            <tr key={fc.id} className="hover:bg-slate-50">
                                <td className="p-3 uppercase">{fc.description}</td>
                                <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black">{fc.category}</span></td>
                                <td className="p-3 text-right text-red-500">{formatMoney(p(fc.value))}</td>
                                <td className="p-3 text-right"><button type="button" onClick={()=>delActionCMV('fixedCosts', fixedCosts, fc.id)} className="text-red-500 bg-red-50 px-2 py-1 rounded text-[8px] font-black uppercase">Excluir</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CustosFixos;