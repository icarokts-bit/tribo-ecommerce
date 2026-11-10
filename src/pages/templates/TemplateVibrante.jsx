import React from 'react';
import Icon from '../../components/Icon';

export default function TemplateVibrante({ loja, produtos, categorias }) {
    return (
        <div className="bg-slate-100 min-h-screen pb-20">
            <header className="bg-[var(--cor-primaria)] p-6 shadow-md text-white text-center rounded-b-3xl">
                {loja.logoUrl && <img src={loja.logoUrl} className="w-20 h-20 mx-auto rounded-xl border-4 border-white/20 mb-3 shadow-lg" />}
                <h1 className="text-3xl font-black uppercase tracking-tight">{loja.nomeLoja}</h1>
                <p className="text-sm font-bold opacity-80 mt-1"><Icon name="clock" size={12} className="inline"/> Aberto Agora</p>
            </header>

            <main className="max-w-2xl mx-auto p-4 -mt-6">
                {categorias.map(cat => {
                    const prods = produtos.filter(p => p.category === cat.id);
                    if (prods.length === 0) return null;
                    return (
                        <div key={cat.id} className="mb-8">
                            <h2 className="text-lg font-black text-slate-800 uppercase pl-2 mb-3">{cat.name}</h2>
                            <div className="space-y-3">
                                {prods.map(p => (
                                    <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm flex gap-3 cursor-pointer border-2 border-transparent hover:border-[var(--cor-primaria)]">
                                        <div className="flex-1">
                                            <h3 className="font-black text-slate-800">{p.name}</h3>
                                            <p className="text-xs text-slate-500 font-bold line-clamp-2 my-1">{p.description}</p>
                                            <p className="font-black text-[var(--cor-primaria)]">R$ {Number(p.sellingPrice).toFixed(2)}</p>
                                        </div>
                                        <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden">
                                            {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover"/>}
                                        </div>
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