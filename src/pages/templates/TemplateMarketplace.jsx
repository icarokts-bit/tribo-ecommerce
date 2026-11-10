import React from 'react';
import Icon from '../../components/Icon';

export default function TemplateMarketplace({ loja, produtos, categorias }) {
    return (
        <div className="bg-slate-50 min-h-screen flex flex-col md:flex-row">
            {/* Sidebar Esquerda */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 md:h-screen md:sticky md:top-0">
                <div className="flex items-center gap-3 mb-8">
                    {loja.logoUrl && <img src={loja.logoUrl} className="w-12 h-12 rounded-lg" />}
                    <h1 className="font-black text-[var(--cor-primaria)] uppercase">{loja.nomeLoja}</h1>
                </div>
                <nav className="space-y-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Departamentos</p>
                    {categorias.map(c => (
                        <a key={c.id} href={`#cat-${c.id}`} className="block text-sm font-bold text-slate-600 hover:text-[var(--cor-primaria)] py-2 border-b border-slate-50">{c.name}</a>
                    ))}
                </nav>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 p-6 md:p-10">
                {loja.bannerUrl && <img src={loja.bannerUrl} className="w-full h-48 object-cover rounded-2xl mb-10 shadow-sm" />}
                
                {categorias.map(cat => {
                    const prods = produtos.filter(p => p.category === cat.id);
                    if (prods.length === 0) return null;
                    return (
                        <div key={cat.id} id={`cat-${cat.id}`} className="mb-12">
                            <h2 className="text-xl font-black text-slate-800 bg-[var(--cor-primaria)] text-white inline-block px-4 py-1 rounded mb-6">{cat.name}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {prods.map(p => (
                                    <div key={p.id} className="bg-white p-4 border border-slate-100 rounded-xl hover:shadow-lg transition-shadow">
                                        <div className="h-32 bg-slate-50 rounded-lg mb-3 flex items-center justify-center">
                                            {p.imageUrl ? <img src={p.imageUrl} className="h-full object-cover"/> : <Icon name="box" className="text-slate-300"/>}
                                        </div>
                                        <h3 className="font-bold text-xs text-slate-700 h-10 overflow-hidden">{p.name}</h3>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="font-black text-[var(--cor-primaria)]">R$ {Number(p.sellingPrice).toFixed(2)}</p>
                                            <button className="bg-[var(--cor-primaria)] text-white p-1.5 rounded"><Icon name="shopping-cart" size={14}/></button>
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