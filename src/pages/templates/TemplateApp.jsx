import React from 'react';
import Icon from '../../components/Icon';

export default function TemplateApp({ loja, produtos, categorias }) {
    return (
        <div className="bg-slate-50 min-h-screen pb-24 md:max-w-md md:mx-auto md:border-x md:border-slate-200 md:shadow-2xl">
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
                {loja.logoUrl && <img src={loja.logoUrl} className="w-10 h-10 rounded-full" />}
                <div>
                    <h1 className="font-black text-slate-800">{loja.nomeLoja}</h1>
                    <p className="text-[10px] text-[var(--cor-primaria)] font-bold uppercase">Entrega Rápida</p>
                </div>
            </div>

            {/* Carrossel de Categorias */}
            <div className="flex overflow-x-auto p-4 gap-2 no-scrollbar bg-white border-b border-slate-100">
                {categorias.map(c => (
                    <span key={c.id} className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase px-4 py-2 rounded-full whitespace-nowrap">{c.name}</span>
                ))}
            </div>

            <div className="p-4 space-y-6">
                {categorias.map(cat => {
                    const prods = produtos.filter(p => p.category === cat.id);
                    if (prods.length === 0) return null;
                    return (
                        <div key={cat.id}>
                            <h2 className="font-black text-slate-800 mb-3">{cat.name}</h2>
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                                {prods.map(p => (
                                    <div key={p.id} className="p-4 flex gap-3 hover:bg-slate-50">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm text-slate-800">{p.name}</h3>
                                            <p className="font-black text-[var(--cor-primaria)] mt-1">R$ {Number(p.sellingPrice).toFixed(2)}</p>
                                        </div>
                                        {p.imageUrl && <img src={p.imageUrl} className="w-16 h-16 rounded-xl object-cover" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Navigation Navbar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 py-3 px-6 flex justify-around text-slate-400 md:max-w-md md:left-1/2 md:-translate-x-1/2">
                <div className="flex flex-col items-center text-[var(--cor-primaria)]"><Icon name="home" size={20}/><span className="text-[9px] font-bold mt-1">Início</span></div>
                <div className="flex flex-col items-center"><Icon name="search" size={20}/><span className="text-[9px] font-bold mt-1">Busca</span></div>
                <div className="flex flex-col items-center relative">
                    <div className="absolute -top-2 -right-2 bg-[var(--cor-primaria)] text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">0</div>
                    <Icon name="shopping-bag" size={20}/><span className="text-[9px] font-bold mt-1">Sacola</span>
                </div>
            </div>
        </div>
    );
}