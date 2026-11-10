import React from 'react';
import Icon from '../../components/Icon';

export default function TemplateMinimalista({ loja, produtos, categorias }) {
    return (
        <div className="bg-white min-h-screen font-sans">
            {/* Banner Gigante */}
            <div className="h-80 w-full relative bg-slate-100 flex items-center justify-center overflow-hidden">
                {loja.bannerUrl && <img src={loja.bannerUrl} className="w-full h-full object-cover opacity-80" />}
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="absolute z-10 text-center text-white">
                    {loja.logoUrl && <img src={loja.logoUrl} className="w-24 h-24 mx-auto rounded-full mb-4 shadow-lg" />}
                    <h1 className="text-4xl font-black tracking-widest uppercase">{loja.nomeLoja}</h1>
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-8">
                {categorias.map(cat => {
                    const prods = produtos.filter(p => p.category === cat.id);
                    if (prods.length === 0) return null;
                    return (
                        <section key={cat.id} className="mb-16">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-8 text-center">{cat.name}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {prods.map(p => (
                                    <div key={p.id} className="group cursor-pointer">
                                        <div className="bg-slate-50 aspect-square rounded-2xl mb-4 overflow-hidden">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/> : <Icon name="image" size={48} className="w-full h-full text-slate-200 p-10"/>}
                                        </div>
                                        <h3 className="font-bold text-slate-800">{p.name}</h3>
                                        <p className="text-[var(--cor-primaria)] font-black text-lg">R$ {Number(p.sellingPrice).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </main>
        </div>
    );
}