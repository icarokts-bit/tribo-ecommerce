import React from 'react';
import Icon from '../../components/Icon';

export default function Fornecedores({ suppliers, supForm, setSupForm, addSup, executeDelete, deleteConfirmId }) {
    return (
        <div className="space-y-4 fade-in">
            <div className="bg-[#1A202C] text-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-black uppercase tracking-wider text-[#F8CC82]">Gestão de Fornecedores</h2>
                <p className="text-[8px] text-slate-400 mt-1 uppercase">Registe os fornecedores para usar no Dashboard Financeiro</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* FORMULÁRIO DE NOVO FORNECEDOR */}
                <form onSubmit={addSup} className="glass-card p-4 rounded-xl h-fit border-t-4 border-[#F27A18]">
                    <h3 className="font-black text-slate-800 border-b pb-2 mb-3">Novo Fornecedor</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-slate-400 block font-black text-[10px] uppercase mb-1 ml-1">Nome do Fornecedor</label>
                            <input type="text" required 
                                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-[#F27A18]" 
                                value={supForm} onChange={e=>setSupForm(e.target.value)} placeholder="Ex: Spani, Swift, Embalagens..." />
                        </div>
                        <button type="submit" className="w-full bg-[#F27A18] text-black p-3 rounded-xl font-black uppercase hover:bg-[#d96a12] transition-colors">Adicionar</button>
                    </div>
                </form>

                {/* LISTA DE FORNECEDORES */}
                <div className="md:col-span-2 glass-card p-4 rounded-xl">
                    <h3 className="font-black text-slate-800 border-b pb-2 mb-3">Fornecedores Registados ({suppliers?.length || 0})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suppliers?.sort((a,b)=>a.name.localeCompare(b.name)).map(s => (
                            <div key={s.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                                <span className="font-black text-slate-700 text-[11px] uppercase">{s.name}</span>
                                <button type="button" onClick={() => executeDelete('suppliers', s.id)} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase transition-all ${deleteConfirmId === s.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                                    {deleteConfirmId === s.id ? 'SIM' : 'EXCLUIR'}
                                </button>
                            </div>
                        ))}
                        {suppliers?.length === 0 && <div className="col-span-2 p-4 text-center text-slate-400 font-bold text-[10px] uppercase">Nenhum fornecedor cadastrado.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}