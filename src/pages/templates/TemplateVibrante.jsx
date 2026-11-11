import React, { useState } from 'react';
import Icon from '../../components/Icon';

export default function TemplateVibrante({ loja, produtos, categorias }) {
    const [showLogin, setShowLogin] = useState(false);

    // Limpa o número de WhatsApp para criar o link direto
    const wppNumber = loja?.whatsapp ? String(loja.whatsapp).replace(/\D/g, '') : '';
    const wppLink = wppNumber ? `https://wa.me/55${wppNumber}?text=Olá! Gostaria de falar sobre os produtos da loja.` : '#';

    return (
        <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-800">
            
            {/* 1. HEADER FIXO (LOGO, PEDIDOS E LOGIN) */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {loja.logoUrl ? (
                        <img src={loja.logoUrl} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" alt="Logo" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--cor-primaria)] flex items-center justify-center text-white font-black text-xl shadow-sm">
                            {loja.nomeLoja?.charAt(0)}
                        </div>
                    )}
                    <div className="leading-tight">
                        <h1 className="font-black text-slate-800 uppercase tracking-tight text-sm">{loja.nomeLoja}</h1>
                        <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1"><Icon name="circle" size={8} className="fill-emerald-500"/> Aberto Agora</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-full text-[10px] font-black uppercase transition-colors">
                        <Icon name="shopping-bag" size={14}/> 
                        <span className="hidden sm:inline">Meus Pedidos</span>
                    </button>
                    <button onClick={() => setShowLogin(true)} className="flex items-center gap-1.5 bg-[var(--cor-primaria)] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-sm hover:scale-105 transition-transform">
                        <Icon name="user" size={14}/> Entrar
                    </button>
                </div>
            </header>

            {/* 2. BANNER PRINCIPAL (HERO) */}
            {loja.bannerUrl ? (
                <div className="w-full h-48 md:h-72 relative bg-slate-900">
                    <img src={loja.bannerUrl} className="w-full h-full object-cover opacity-90" alt="Banner Principal" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                </div>
            ) : (
                <div className="w-full h-32 bg-gradient-to-r from-[var(--cor-primaria)] to-slate-800 flex items-center justify-center">
                    <h2 className="text-white font-black uppercase tracking-widest opacity-50">Bem-vindo(a)</h2>
                </div>
            )}

            {/* 3. BANNERS CARROSSEL (DESTAQUES SECUNDÁRIOS) */}
            <div className="w-full overflow-x-auto custom-scrollbar px-4 py-6 -mt-8 relative z-10">
                <div className="flex gap-4">
                    <div className="min-w-[260px] h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-4 flex flex-col justify-end text-white overflow-hidden relative border border-white/20">
                        <Icon name="star" size={80} className="absolute -right-4 -top-4 opacity-10" />
                        <h3 className="font-black text-sm leading-tight uppercase z-10">Novidades<br/>no Catálogo</h3>
                    </div>
                    <div className="min-w-[260px] h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg p-4 flex flex-col justify-end text-white overflow-hidden relative border border-white/20">
                        <Icon name="tag" size={80} className="absolute -right-4 -top-4 opacity-10" />
                        <h3 className="font-black text-sm leading-tight uppercase z-10">Promoções<br/>Especiais</h3>
                    </div>
                    <div className="min-w-[260px] h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg p-4 flex flex-col justify-end text-white overflow-hidden relative border border-white/20">
                        <Icon name="award" size={80} className="absolute -right-4 -top-4 opacity-10" />
                        <h3 className="font-black text-sm leading-tight uppercase z-10">Mais<br/>Vendidos</h3>
                    </div>
                </div>
            </div>

            {/* 4. MENU DE CATEGORIAS */}
            <div className="sticky top-[64px] z-30 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 py-3 px-4 flex overflow-x-auto gap-2 custom-scrollbar shadow-sm">
                {categorias.map(c => (
                    <a key={c.id} href={`#cat-${c.id}`} className="px-5 py-2 bg-white border border-slate-200 rounded-full text-[11px] font-black uppercase text-slate-600 whitespace-nowrap hover:border-[var(--cor-primaria)] hover:text-[var(--cor-primaria)] transition-colors shadow-sm">
                        {c.name}
                    </a>
                ))}
            </div>

            {/* 5. LISTA DE PRODUTOS PROFISSIONAL */}
            <main className="max-w-5xl mx-auto p-4 space-y-10 mt-4">
                {categorias.map(cat => {
                    const prods = produtos.filter(p => p.category === cat.id);
                    if (prods.length === 0) return null;
                    return (
                        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-3">
                                {cat.name}
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prods.map(p => (
                                    <div key={p.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-4 cursor-pointer hover:border-[var(--cor-primaria)] hover:shadow-md transition-all group">
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-black text-slate-800 text-sm leading-tight group-hover:text-[var(--cor-primaria)] transition-colors">{p.name}</h3>
                                                <p className="text-[10px] text-slate-500 font-bold line-clamp-2 mt-1.5">{p.description || 'Produto incrível com a qualidade da nossa loja.'}</p>
                                            </div>
                                            <div className="mt-3 flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    {p.isPromo && <span className="text-[9px] text-slate-400 line-through font-bold">R$ {Number(p.price || 0).toFixed(2)}</span>}
                                                    <p className="font-black text-lg text-[var(--cor-primaria)] leading-none">R$ {Number(p.sellingPrice || 0).toFixed(2)}</p>
                                                </div>
                                                <button className="w-8 h-8 rounded-full bg-slate-100 text-[var(--cor-primaria)] flex items-center justify-center font-black group-hover:bg-[var(--cor-primaria)] group-hover:text-white transition-colors shadow-sm">
                                                    <Icon name="plus" size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="w-32 h-32 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={p.name}/>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300"><Icon name="image" size={32}/></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </main>

            {/* 6. BOTÃO WHATSAPP FLUTUANTE */}
            {wppNumber && (
                <a href={wppLink} target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 hover:bg-emerald-600 transition-all z-50 animate-bounce-slow border-2 border-white">
                    <Icon name="message-circle" size={28} />
                </a>
            )}

            {/* 7. MODAL DE LOGIN DE CLIENTES */}
            {showLogin && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden scale-up-center">
                        <div className="bg-[var(--cor-primaria)] p-8 text-center text-white relative">
                            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-white/60 hover:text-white bg-black/10 rounded-full p-1 transition-colors"><Icon name="x" size={20}/></button>
                            <Icon name="user" size={48} className="mx-auto mb-3 opacity-90"/>
                            <h3 className="font-black text-xl uppercase tracking-widest">Acesse sua Conta</h3>
                            <p className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-wider">Acompanhe seus pedidos em tempo real</p>
                        </div>
                        <div className="p-6 space-y-4 bg-slate-50">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 block mb-1">E-mail ou Celular</label>
                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--cor-primaria)] shadow-sm" placeholder="Seu acesso..." />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 block mb-1">Senha</label>
                                <input type="password" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--cor-primaria)] shadow-sm" placeholder="••••••••" />
                            </div>
                            <button className="w-full py-3.5 bg-[var(--cor-primaria)] hover:opacity-90 text-white rounded-xl font-black uppercase text-xs shadow-md mt-2 transition-opacity">
                                Entrar na Loja
                            </button>
                            <p className="text-center text-[10px] font-bold text-slate-400 cursor-pointer hover:text-[var(--cor-primaria)] mt-4 transition-colors">
                                Não tem conta? <span className="underline">Cadastre-se grátis</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ESTILOS CSS INJETADOS */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
                
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}