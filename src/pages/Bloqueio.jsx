import React, { useState } from 'react';
import Icon from '../components/Icon';
import SupportWidget from '../components/SupportWidget'; // <-- IMPORTAMOS O BOTÃO AQUI

export default function Bloqueio({ assinatura, handleLogout }) {
    const [abaPlano, setAbaPlano] = useState('completo');

    // Configuração oficial de planos idêntica à tela de Assinaturas
    const planosConfig = {
        completo: [
            { titulo: 'Mensal', preco: '97', sub: '/mês', de: null, desc1: 'Assinatura recorrente.', desc2: 'Cancele quando quiser.', destaque: false, link: 'https://www.asaas.com/c/5fd5an1c0j60qltz' },
            { titulo: 'Trimestral', preco: '267', sub: ' À VISTA', de: 'R$ 291', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 3x de R$ 89,00.', destaque: false, badge: 'Economize 10%', link: 'https://www.asaas.com/c/ai7ja17tlutkk2r7' },
            { titulo: 'Semestral', preco: '487', sub: ' À VISTA', de: 'R$ 582', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 6x de R$ 81,16.', destaque: false, badge: '1 Mês Grátis', link: 'https://www.asaas.com/c/hitxmnywtsrv9vn8' },
            { titulo: 'Anual VIP', preco: '847', sub: ' NO PIX/1x', de: 'R$ 1.164', desc1: 'O MAIOR DESCONTO!', desc2: 'Parcelado: 12x de R$ 80,58 (R$ 967).', destaque: true, badge: '🔥 MELHOR OFERTA', 
                linkVista: 'https://www.asaas.com/c/dka2ksd5p6dg8l1h', 
                linkParcelado: 'https://www.asaas.com/c/lkbbl17796xpzay2', 
                btnParcelado: 'Ou Parcelar em 12x (R$ 967)' }
        ],
        cmv: [
            { titulo: 'Mensal', preco: '47', sub: '/mês', de: null, desc1: 'Assinatura recorrente.', desc2: 'Cancele quando quiser.', destaque: false, link: 'https://www.asaas.com/c/uoxc4n7blkp5tcmu' },
            { titulo: 'Trimestral', preco: '127', sub: ' À VISTA', de: 'R$ 141', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 3x de R$ 42,33.', destaque: false, badge: 'Economize 10%', link: 'https://www.asaas.com/c/g50r8zjzc0vizq3d' },
            { titulo: 'Semestral', preco: '237', sub: ' À VISTA', de: 'R$ 282', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 6x de R$ 39,50.', destaque: false, badge: '1 Mês Grátis', link: 'https://www.asaas.com/c/4ifdzrj9j02w1l3x' },
            { titulo: 'Anual VIP', preco: '397', sub: ' NO PIX/1x', de: 'R$ 564', desc1: 'O MAIOR DESCONTO!', desc2: 'Parcelado: 12x de R$ 38,91 (R$ 467).', destaque: true, badge: '🔥 MELHOR OFERTA', 
                linkVista: 'https://www.asaas.com/c/y7fy4ttmwgerb6pp', 
                linkParcelado: 'https://www.asaas.com/c/esz7mrodp4jx8udd', 
                btnParcelado: 'Ou Parcelar em 12x (R$ 467)' }
        ]
    };

    const planosAtivos = planosConfig[abaPlano];
    const dataFormatada = assinatura?.vencimento ? assinatura.vencimento.split('-').reverse().join('/') : '--/--/----';

    return (
        <>
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
                <div className="max-w-6xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative my-8">
                    
                    <div className="absolute top-0 right-0 bg-red-500/10 text-red-400 text-xs font-black uppercase px-4 py-2 rounded-bl-2xl border-l border-b border-red-500/20">
                        Acesso Suspenso / Vencido
                    </div>

                    <div className="text-center max-w-xl mx-auto mb-6">
                        <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-500/20">
                            <Icon name="lock" size={28} />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-wider mb-2">Sua assinatura expirou</h1>
                        <p className="text-slate-400 text-sm">
                            O acesso ao sistema venceu em <strong className="text-white">{dataFormatada}</strong>. Escolha o seu plano abaixo para renovar e liberar automaticamente:
                        </p>
                        
                        {/* AVISO IMPORTANTE SOBRE O E-MAIL */}
                        <div className="mt-5 bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-xl text-[11px] md:text-xs font-black uppercase flex flex-col sm:flex-row items-center justify-center gap-2 shadow-lg shadow-amber-500/5">
                            <Icon name="alert-triangle" size={20} className="shrink-0" />
                            <span>Para liberação imediata, utilize no pagamento o <strong>mesmo e-mail</strong> desta conta!</span>
                        </div>
                    </div>

                    {/* ABAS TOGGLE (Sistema Completo vs Módulo CMV) */}
                    <div className="flex justify-center mb-6">
                        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full max-w-sm shadow-inner">
                            <button 
                                onClick={() => setAbaPlano('completo')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all duration-300 ${abaPlano === 'completo' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                Sistema Completo
                            </button>
                            <button 
                                onClick={() => setAbaPlano('cmv')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all duration-300 ${abaPlano === 'cmv' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                Módulo CMV
                            </button>
                        </div>
                    </div>

                    {/* GRID DOS PLANOS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {planosAtivos.map((plano, idx) => (
                            <div key={idx} className={`relative p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 ${plano.destaque ? 'bg-slate-950 text-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 md:-translate-y-2' : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'}`}>
                                
                                {plano.badge && (
                                    <div className="absolute -top-3.5 left-0 w-full flex justify-center">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest shadow-md flex items-center gap-1 ${plano.destaque ? 'bg-emerald-500 text-white border border-emerald-400' : 'bg-[#F27A18] text-white'}`}>
                                            {plano.destaque && <Icon name="star" size={12} className="text-yellow-300" />} 
                                            {plano.badge}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="mt-3 md:mt-0 text-center">
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-4 ${plano.destaque ? 'text-emerald-400' : 'text-slate-400'}`}>{plano.titulo}</h4>
                                    
                                    <div className="min-h-[20px] mb-1">
                                        {plano.de && (
                                            <span className="text-[10px] font-black uppercase line-through text-slate-500">
                                                De {plano.de} por:
                                            </span>
                                        )}
                                    </div>

                                    <div className="mb-4 flex flex-col items-center justify-center">
                                        <span className={`text-3xl font-black tracking-tight ${plano.destaque ? 'text-white' : 'text-slate-100'}`}>
                                            R$ {plano.preco}
                                        </span>
                                        <span className={`text-[10px] font-black mt-1 ${plano.destaque ? 'text-emerald-400' : 'text-slate-400'}`}>{plano.sub}</span>
                                    </div>
                                    
                                    <div className={`w-12 h-1 mx-auto mb-4 rounded-full ${plano.destaque ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>

                                    <p className={`text-[11px] font-black uppercase mb-2 ${plano.destaque ? 'text-emerald-300' : 'text-slate-300'}`}>
                                        {plano.desc1}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase leading-relaxed text-slate-400">
                                        {plano.desc2}
                                    </p>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {plano.linkVista ? (
                                        <>
                                            <a 
                                                href={plano.linkVista} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="w-full flex flex-col items-center justify-center py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-emerald-500 text-white hover:bg-emerald-400 shadow-md shadow-emerald-500/30"
                                            >
                                                <span className="flex items-center gap-1.5"><Icon name="zap" size={14} className="text-yellow-300" /> Assinar no PIX</span>
                                            </a>
                                            <a 
                                                href={plano.linkParcelado} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="w-full block text-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                                            >
                                                {plano.btnParcelado}
                                            </a>
                                        </>
                                    ) : (
                                        <a 
                                            href={plano.link} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full block text-center py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors bg-slate-800 text-white hover:bg-slate-700 shadow-md"
                                        >
                                            Assinar Plano
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-800 pt-5 text-xs gap-3">
                        <span className="text-slate-500">Dúvidas sobre o pagamento ou planos? Entre em contato com o suporte.</span>
                        <button onClick={handleLogout} className="text-red-400 font-bold hover:underline uppercase">Sair da Conta</button>
                    </div>

                </div>
            </div>

            {/* ADICIONANDO O BOTÃO DE SUPORTE NA TELA DE BLOQUEIO */}
            <SupportWidget />
        </>
    );
}