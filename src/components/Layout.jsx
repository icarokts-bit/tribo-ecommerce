import React, { useState } from 'react';
import Icon from './Icon';
import { modulosSaaS } from '../menuConfig'; 

function Layout({ children, activeTab, setActiveTab, companyName, logoUrl, assinatura, userRole, planoDoUsuario }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const modulosPermitidos = modulosSaaS.filter(item => 
        (item.planos && item.planos.includes(planoDoUsuario)) || userRole === 'master'
    );

    const gruposDeMenu = modulosPermitidos.reduce((acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
    }, {});

    const handleTabClick = (id) => {
        setActiveTab(id);
        setIsMobileMenuOpen(false); 
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans relative">
            
            {/* OVERLAY ESCURO PARA CELULAR */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* MENU LATERAL (TEMA DARK) */}
            <aside className={`fixed md:relative top-0 left-0 h-full w-72 bg-black border-r border-slate-800 flex flex-col print:hidden shadow-2xl md:shadow-lg z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                
                <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="md:hidden absolute top-4 right-4 bg-white/10 p-2 rounded-full text-slate-300 hover:text-red-400 hover:bg-red-500/20 transition-colors z-50 backdrop-blur-sm"
                >
                    <Icon name="x" size={16} />
                </button>

                <div className="border-b border-slate-800 w-full bg-black relative">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-auto block object-cover" />
                    ) : (
                        <img src="/logo.png" alt="Logo" className="w-full h-auto block object-cover" />
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin pb-20">
                    {Object.keys(gruposDeMenu).map(groupName => (
                        <div key={groupName}>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-2 whitespace-nowrap">
                                {groupName}
                            </h3>
                            <div className="space-y-1">
                                {gruposDeMenu[groupName].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleTabClick(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[11px] transition-all whitespace-nowrap
                                            ${activeTab === item.id 
                                                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border-l-4 border-l-emerald-500' 
                                                : 'text-slate-400 hover:bg-white/5 hover:text-emerald-400 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <Icon name={item.icon} size={16} className={activeTab === item.id ? 'text-emerald-400 min-w-[16px]' : 'text-slate-400 min-w-[16px] transition-colors'} />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="pt-4 border-t border-slate-800 space-y-1">
                        <button
                            onClick={() => handleTabClick('assinatura')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[11px] transition-all whitespace-nowrap 
                                ${activeTab === 'assinatura' 
                                    ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-l-indigo-500' 
                                    : 'text-slate-400 hover:bg-white/5 hover:text-indigo-400 border-l-4 border-transparent'
                                }`}
                        >
                            <Icon name="star" size={16} className={activeTab === 'assinatura' ? 'text-indigo-400 min-w-[16px]' : 'text-slate-400 min-w-[16px] transition-colors'} /> 
                            <span>Minha Assinatura</span>
                        </button>
                        
                        {userRole === 'master' && (
                            <button
                                onClick={() => handleTabClick('painel_master')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black uppercase text-[11px] transition-all whitespace-nowrap 
                                    ${activeTab === 'painel_master' 
                                        ? 'bg-red-500/10 text-red-400 border-l-4 border-l-red-500' 
                                        : 'text-slate-400 hover:bg-white/5 hover:text-red-400 border-l-4 border-transparent'
                                    }`}
                            >
                                <Icon name="shield" size={16} className={activeTab === 'painel_master' ? 'text-red-400 min-w-[16px]' : 'text-slate-400 min-w-[16px] transition-colors'} /> 
                                <span>Painel Master</span>
                            </button>
                        )}
                    </div>
                </nav>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50 relative w-full">
                
                {/* === BOTÃO FLUTUANTE DE MINHA CONTA (VERSÃO PC) === */}
                <button
                    onClick={() => setActiveTab('minha_conta')}
                    className="hidden md:flex fixed bottom-[96px] right-6 z-40 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:text-emerald-600 hover:border-emerald-200 transition-all items-center gap-2 group"
                >
                    <Icon name="user" size={18} className="group-hover:scale-110 transition-transform duration-300" />
                    <span className="font-black text-[11px] uppercase tracking-wider">Minha Conta</span>
                </button>

                {/* CABEÇALHO MOBILE */}
                <div className="md:hidden bg-white border-b border-slate-200 p-3 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)} 
                            className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                            <Icon name="menu" size={20} />
                        </button>
                        <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider">
                            {activeTab.replace('fin_', '').replace('cmv_', '').replace(/_/g, ' ')}
                        </span>
                    </div>
                    
                    {/* === BOTÃO DE MINHA CONTA (VERSÃO CELULAR) === */}
                    <button
                        onClick={() => setActiveTab('minha_conta')}
                        className={`p-2 rounded-lg transition-colors ${activeTab === 'minha_conta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    >
                        <Icon name="user" size={20} />
                    </button>
                </div>
                
                {/* ÁREA DE SCROLL DO CONTEÚDO */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;