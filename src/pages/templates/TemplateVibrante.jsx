import React, { useState } from 'react';
import Icon from '../../components/Icon';

export default function TemplateVibrante({ loja, produtos, categorias }) {
    const [showLogin, setShowLogin] = useState(false);
    const [busca, setBusca] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

    const wppNumber = loja?.whatsapp ? String(loja.whatsapp).replace(/\D/g, '') : '';
    const wppLink = wppNumber ? `https://wa.me/55${wppNumber}?text=Olá! Vim pelo site da ${loja.nomeLoja} e gostaria de tirar uma dúvida.` : '#';

    const produtosFiltrados = produtos.filter(p => {
        const matchNome = p.name?.toLowerCase().includes(busca.toLowerCase());
        const matchCat = categoriaFiltro === 'todas' || p.category?.toLowerCase() === categoriaFiltro.toLowerCase();
        return matchNome && matchCat;
    });

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="bg-white min-h-screen font-sans text-slate-800 pb-20">
            
            {/* 1. TOPBAR UTILITÁRIA FINA */}
            <div className="border-b border-slate-100 bg-white text-[11px] text-slate-500 py-2 px-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-5 font-medium">
                        <button onClick={() => setShowLogin(true)} className="hover:text-[var(--cor-primaria)] flex items-center gap-1.5 transition-colors">
                            <Icon name="map-pin" size={13} className="text-orange-500" /> Rastrear Pedido
                        </button>
                        {loja.mostrarEndereco && loja.endereco && (
                            <span className="hidden md:inline text-slate-400">| {loja.endereco}</span>
                        )}
                    </div>
                    <div className="hidden sm:block text-slate-500 font-medium">
                        Confira os lançamentos e peças exclusivas. <a href="#vitrine" className="text-blue-600 font-bold hover:underline">Comprar agora</a>
                    </div>
                    <div className="flex items-center gap-4 font-bold text-slate-600">
                        {wppNumber && (
                            <a href={wppLink} target="_blank" rel="noreferrer" className="hover:text-emerald-600 flex items-center gap-1">
                                <Icon name="message-circle" size={13} className="text-emerald-500"/> Suporte WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. HEADER PRINCIPAL (ESTILO MARKETOP) */}
            <header className="bg-[var(--cor-primaria)] text-white py-5 px-4 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    {/* Logo + Nome */}
                    <div onClick={() => setCategoriaFiltro('todas')} className="flex items-center gap-3 cursor-pointer shrink-0">
                        {loja.logoUrl ? (
                            <img src={loja.logoUrl} className="w-11 h-11 rounded-xl object-cover bg-white p-0.5 shadow-sm" alt="Logo" />
                        ) : (
                            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-xl shadow-sm">
                                <Icon name="shopping-cart" size={22} />
                            </div>
                        )}
                        <span className="font-black text-2xl tracking-tight">{loja.nomeLoja}</span>
                    </div>

                    {/* Barra de Busca Integrada com Seletor de Categorias */}
                    <div className="flex-1 max-w-2xl w-full flex bg-white rounded-lg overflow-hidden shadow-inner border border-white/20">
                        <input 
                            type="text" 
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar produtos na loja..." 
                            className="flex-1 px-4 py-2.5 text-sm text-slate-700 font-medium outline-none"
                        />
                        <select 
                            value={categoriaFiltro}
                            onChange={e => setCategoriaFiltro(e.target.value)}
                            className="hidden sm:block bg-slate-50 border-l border-slate-200 px-3 text-xs font-bold text-slate-600 outline-none cursor-pointer"
                        >
                            <option value="todas">Todas as categorias</option>
                            {categorias.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 font-bold text-xs uppercase tracking-wider transition-colors">
                            Buscar
                        </button>
                    </div>

                    {/* Botões de Conta, Favoritos e Carrinho */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button onClick={() => setShowLogin(true)} className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-lg transition-colors text-left">
                            <Icon name="user" size={18} />
                            <div className="leading-none">
                                <span className="block text-[9px] opacity-75">Entrar</span>
                                <span className="font-bold text-xs">Minha Conta</span>
                            </div>
                        </button>

                        <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2.5 rounded-lg transition-colors" title="Meus Pedidos">
                            <Icon name="package" size={18} />
                            <span className="hidden lg:inline font-bold text-xs">Pedidos</span>
                        </button>

                        <button className="relative bg-white/10 hover:bg-white/20 border border-white/15 p-2.5 rounded-lg transition-colors">
                            <Icon name="shopping-cart" size={18} />
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                                0
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 3. SUB-BARRA DE NAVEGAÇÃO POR DEPARTAMENTOS */}
            <nav className="border-b border-slate-200 bg-white px-4">
                <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto no-scrollbar py-3 text-xs font-bold text-slate-600">
                    <button 
                        onClick={() => setCategoriaFiltro('todas')} 
                        className={`flex items-center gap-2 pr-4 border-r border-slate-200 whitespace-nowrap ${categoriaFiltro === 'todas' ? 'text-[var(--cor-primaria)] font-black' : 'hover:text-slate-900'}`}
                    >
                        <Icon name="grid" size={15} /> Todos os Departamentos
                    </button>
                    {categorias.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => setCategoriaFiltro(c.name)}
                            className={`whitespace-nowrap transition-colors ${categoriaFiltro === c.name ? 'text-orange-500 font-black' : 'hover:text-[var(--cor-primaria)]'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                
                {/* 4. MOSAICO DE CATEGORIAS COM FOTOS (ESTILO BENTO MARKETOP) */}
                {categorias.length > 0 && categoriaFiltro === 'todas' && !busca && (
                    <section>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {categorias.slice(0, 7).map((cat, index) => {
                                // Destaca o primeiro e o quarto card como blocos maiores no estilo Bento Grid
                                const isLargeTall = index === 0;
                                const isLargeWide = index === 2;

                                return (
                                    <div 
                                        key={cat.id}
                                        onClick={() => setCategoriaFiltro(cat.name)}
                                        className={`group cursor-pointer rounded-xl p-5 flex transition-all duration-300 hover:shadow-md border border-slate-100 overflow-hidden relative ${
                                            isLargeTall ? 'col-span-2 sm:col-span-1 row-span-2 bg-slate-50 flex-col justify-between items-center text-center min-h-[260px]' :
                                            isLargeWide ? 'col-span-2 bg-slate-50 flex-col justify-between items-center text-center min-h-[260px]' :
                                            'bg-[#eef6ff] hover:bg-[#e2effe] items-center justify-between gap-3 h-32'
                                        }`}
                                    >
                                        <h3 className={`font-bold text-slate-700 group-hover:text-[var(--cor-primaria)] transition-colors z-10 ${isLargeTall || isLargeWide ? 'text-lg mt-1' : 'text-sm order-2 text-right'}`}>
                                            {cat.name}
                                        </h3>
                                        
                                        <div className={`flex items-center justify-center overflow-hidden ${isLargeTall || isLargeWide ? 'w-full h-44 my-auto' : 'w-20 h-20 shrink-0 order-1'}`}>
                                            {cat.imageUrl ? (
                                                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-white/80 flex items-center justify-center text-slate-400 shadow-sm">
                                                    <Icon name="box" size={24} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 5. FAIXA DE BENEFÍCIOS E CONFIANÇA */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-y border-slate-100">
                    <div className="flex items-center gap-3.5">
                        <div className="text-[var(--cor-primaria)] shrink-0"><Icon name="truck" size={28} /></div>
                        <div>
                            <h4 className="font-bold text-xs text-slate-800">Envio Rápido e Seguro</h4>
                            <p className="text-[11px] text-slate-400">Despachamos para todo o Brasil</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                        <div className="text-[var(--cor-primaria)] shrink-0"><Icon name="headphones" size={28} /></div>
                        <div>
                            <h4 className="font-bold text-xs text-slate-800">Suporte Online</h4>
                            <p className="text-[11px] text-slate-400">Atendimento direto via WhatsApp</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                        <div className="text-[var(--cor-primaria)] shrink-0"><Icon name="tag" size={28} /></div>
                        <div>
                            <h4 className="font-bold text-xs text-slate-800">Preços Direto da Fábrica</h4>
                            <p className="text-[11px] text-slate-400">Produção própria em impressão 3D</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5">
                        <div className="text-[var(--cor-primaria)] shrink-0"><Icon name="shield" size={28} /></div>
                        <div>
                            <h4 className="font-bold text-xs text-slate-800">Garantia de Qualidade</h4>
                            <p className="text-[11px] text-slate-400">Acabamento premium revisado</p>
                        </div>
                    </div>
                </section>

                {/* 6. GRADE DE PRODUTOS (ESTILO TRENDING PRODUCTS) */}
                <section id="vitrine" className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            {categoriaFiltro === 'todas' ? 'Produtos em Destaque' : categoriaFiltro}
                        </h2>
                        {categoriaFiltro !== 'todas' && (
                            <button onClick={() => setCategoriaFiltro('todas')} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                Ver Todos <Icon name="arrow-right" size={13} />
                            </button>
                        )}
                    </div>

                    {produtosFiltrados.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 font-bold text-sm">
                            Nenhum produto encontrado nesta categoria.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {produtosFiltrados.map(p => {
                                const descontoPerc = p.isPromo && p.price > 0 
                                    ? Math.round(((p.price - p.promoPrice) / p.price) * 100) 
                                    : 0;

                                return (
                                    <div key={p.id} className="bg-white rounded-xl p-4 border border-transparent hover:border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative">
                                        
                                        {/* Badges Superiores (Desconto / Top) */}
                                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                                            {descontoPerc > 0 && (
                                                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                                                    -{descontoPerc}%
                                                </span>
                                            )}
                                            {p.destaque && (
                                                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                                                    Top
                                                </span>
                                            )}
                                        </div>

                                        {/* Botão Favorito */}
                                        <button className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 flex items-center justify-center shadow-sm transition-colors">
                                            <Icon name="heart" size={14} />
                                        </button>

                                        {/* Imagem Limpa */}
                                        <div className="w-full h-52 flex items-center justify-center p-4 mb-3 bg-white overflow-hidden">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <Icon name="image" size={48} className="text-slate-200" />
                                            )}
                                        </div>

                                        {/* Informações do Produto */}
                                        <div className="space-y-1.5">
                                            <span className="text-[11px] font-semibold text-orange-500 block">
                                                {p.category || 'Geral'}
                                            </span>
                                            <h3 className="font-bold text-sm text-[#1e3a8a] group-hover:text-orange-500 transition-colors line-clamp-2 min-h-[40px]">
                                                {p.name}
                                            </h3>

                                            {/* Estrelas de Avaliação */}
                                            <div className="flex items-center gap-0.5 text-orange-400 text-xs">
                                                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                                            </div>

                                            {/* Preços */}
                                            <div className="pt-1 flex items-baseline gap-2">
                                                <span className="font-bold text-lg text-rose-500">
                                                    {formatMoney(p.sellingPrice)}
                                                </span>
                                                {p.isPromo && (
                                                    <span className="text-xs text-slate-400 line-through">
                                                        {formatMoney(p.price)}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Pronta entrega / Produção rápida
                                            </p>
                                        </div>

                                        {/* Botão Add to Cart que destaca no Hover */}
                                        <button className="mt-4 w-full py-2.5 bg-orange-400 hover:bg-orange-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors">
                                            <Icon name="shopping-cart" size={14} /> Adicionar ao Carrinho
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* 7. BANNER PROMOCIONAL HORIZONTAL INFERIOR */}
                {loja.bannerUrl && (
                    <section className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 grid grid-cols-1 md:grid-cols-2 items-center">
                        <div className="p-8 md:p-12 space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Destaque da Semana</span>
                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{loja.nomeLoja} - Projetos Personalizados</h3>
                            <p className="text-xs text-slate-500 font-medium">Peças exclusivas feitas sob medida para você ou para a sua empresa.</p>
                            <div className="pt-2">
                                <a href={wppLink} target="_blank" rel="noreferrer" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-6 py-3 rounded-lg shadow transition-colors">
                                    Solicitar Orçamento
                                </a>
                            </div>
                        </div>
                        <div className="h-56 md:h-64 w-full overflow-hidden">
                            <img src={loja.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                        </div>
                    </section>
                )}
            </main>

            {/* 8. BOTÃO WHATSAPP FLUTUANTE */}
            {wppNumber && (
                <a href={wppLink} target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 hover:bg-emerald-600 transition-all z-50 border-2 border-white">
                    <Icon name="message-circle" size={28} />
                </a>
            )}

            {/* 9. MODAL DE LOGIN DE CLIENTES */}
            {showLogin && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[var(--cor-primaria)] p-6 text-center text-white relative">
                            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-white/70 hover:text-white"><Icon name="x" size={20}/></button>
                            <Icon name="user" size={40} className="mx-auto mb-2 opacity-90"/>
                            <h3 className="font-black text-lg uppercase tracking-wider">Acesse sua Conta</h3>
                            <p className="text-[11px] opacity-80 mt-0.5">Acompanhe seus pedidos e favoritos</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">E-mail ou WhatsApp</label>
                                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--cor-primaria)]" placeholder="Digite seu acesso..." />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Senha</label>
                                <input type="password" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--cor-primaria)]" placeholder="••••••••" />
                            </div>
                            <button className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase text-xs shadow-md transition-colors">
                                Entrar na Loja
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}