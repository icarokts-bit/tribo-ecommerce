import React from 'react';
import Icon from '../../components/Icon';

export default function TemplateClassico({ loja, produtos, categorias }) {
    return (
        <div className="bg-white min-h-screen">
            {/* Topbar escura */}
            <div className="bg-slate-900 text-slate-400 text-xs py-2 px-8 flex justify-between">
                <span>Bem-vindo à {loja.nomeLoja}</span>
                <span>{loja.whatsapp && `Contato: ${loja.whatsapp}`}</span>
            </div>
            
            {/* Header com Busca */}
            <header className="py-6 px-8 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {loja.logoUrl && <img src={loja.logoUrl} className="h-12" />}
                    <h1 className="text-2xl font-black text-slate-800">{loja.nomeLoja}</h1>
                </div>
                <div className="hidden md:flex bg-slate-100 px-4 py-2 rounded-full w-1/3 border border-slate-200">
                    <input type="text" placeholder="Buscar produto..." className="bg-transparent w-full outline-none text-sm font-bold"/>
                    <Icon name="search" className="text-slate-400"/>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {categorias.map(cat => {
                    const prods = produtos.filter(p => p.category === cat.id);
                    if (prods.length === 0) return null;
                    return (
                        <div key={cat.id} className="mb-12 border border-slate-200 rounded-xl p-6">
                            <h2 className="text-xl font-black text-slate-800 uppercase mb-6 pb-2 border-b-2 border-[var(--cor-primaria)] inline-block">{cat.name}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                {prods.map(p => (
                                    <div key={p.id} className="text-center flex flex-col items-center">
                                        <div className="w-full aspect-square bg-slate-50 mb-3 border border-slate-100 flex items-center justify-center">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover"/> : <Icon name="shopping-bag" className="text-slate-200" size={48}/>}
                                        </div>
                                        <h3 className="font-bold text-sm text-slate-700 mb-2 h-10">{p.name}</h3>
                                        <p className="text-lg font-black text-slate-900 mb-3">R$ {Number(p.sellingPrice).toFixed(2)}</p>
                                        <button className="w-full bg-[var(--cor-primaria)] text-white font-black uppercase text-[10px] py-2.5 rounded hover:opacity-90">Adicionar</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
}