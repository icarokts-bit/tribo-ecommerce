import React, { useState } from 'react';
import Icon from '../components/Icon';

function Assinatura({ assinatura, user }) {
    const [abaPlano, setAbaPlano] = useState('completo');

    // Calcula os dias restantes para o vencimento
    const calcularDias = () => {
        if (!assinatura?.vencimento) return 0;
        const hoje = new Date();
        const venc = new Date(assinatura.vencimento);
        return Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
    };

    const diasRestantes = calcularDias();
    const dataFormatada = assinatura?.vencimento ? assinatura.vencimento.split('-').reverse().join('/') : '--/--/----';

    // Configuração Otimizada para Vendas (Com ancoragem de preços "De / Por")
    const planosConfig = {
        completo: [
            { titulo: 'Mensal', preco: '97', sub: '/mês', de: null, desc1: 'Assinatura recorrente.', desc2: 'Cancele quando quiser.', destaque: false, link: 'https://www.asaas.com/c/5fd5an1c0j60qltz' },
            { titulo: 'Trimestral', preco: '267', sub: ' À VISTA', de: 'R$ 291', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 3x de R$ 89,00.', destaque: false, badge: 'Economize 10%', link: 'https://www.asaas.com/c/ai7ja17tlutkk2r7' },
            { titulo: 'Semestral', preco: '487', sub: ' À VISTA', de: 'R$ 582', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 6x de R$ 81,16.', destaque: false, badge: '1 Mês Grátis', link: 'https://www.asaas.com/c/hitxmnywtsrv9vn8' },
            { titulo: 'Anual VIP', preco: '847', sub: ' NO PIX/1x', de: 'R$ 1.164', desc1: 'O MAIOR DESCONTO!', desc2: 'Parcelado: 12x de R$ 80,58 (R$ 967).', destaque: true, badge: '🔥 MELHOR OFERTA (2 Meses Off + Desconto PIX)', 
              linkVista: 'https://www.asaas.com/c/dka2ksd5p6dg8l1h', 
              linkParcelado: 'https://www.asaas.com/c/lkbbl17796xpzay2', 
              btnParcelado: 'Ou Parcelar em 12x (R$ 967)' }
        ],
        cmv: [
            { titulo: 'Mensal', preco: '47', sub: '/mês', de: null, desc1: 'Assinatura recorrente.', desc2: 'Cancele quando quiser.', destaque: false, link: 'https://www.asaas.com/c/uoxc4n7blkp5tcmu' },
            { titulo: 'Trimestral', preco: '127', sub: ' À VISTA', de: 'R$ 141', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 3x de R$ 42,33.', destaque: false, badge: 'Economize 10%', link: 'https://www.asaas.com/c/g50r8zjzc0vizq3d' },
            { titulo: 'Semestral', preco: '237', sub: ' À VISTA', de: 'R$ 282', desc1: 'PIX ou Cartão em 1x.', desc2: 'Ou 6x de R$ 39,50.', destaque: false, badge: '1 Mês Grátis', link: 'https://www.asaas.com/c/4ifdzrj9j02w1l3x' },
            { titulo: 'Anual VIP', preco: '397', sub: ' NO PIX/1x', de: 'R$ 564', desc1: 'O MAIOR DESCONTO!', desc2: 'Parcelado: 12x de R$ 38,91 (R$ 467).', destaque: true, badge: '🔥 MELHOR OFERTA (2 Meses Off + Desconto PIX)', 
              linkVista: 'https://www.asaas.com/c/y7fy4ttmwgerb6pp', 
              linkParcelado: 'https://www.asaas.com/c/esz7mrodp4jx8udd', 
              btnParcelado: 'Ou Parcelar em 12x (R$ 467)' }
        ]
    };

    const planosAtivos = planosConfig[abaPlano];

    return (
        <div className="fade-in space-y-6 max-w-6xl mx-auto pb-10">
            
            {/* CABEÇALHO PROMOCIONAL */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 border-emerald-500">
                <div>
                    <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block shadow-md">
                        Painel de Assinatura
                    </span>
                    <h2 className="text-2xl font-black uppercase tracking-wide">
                        Liberte o Potencial do seu Delivery
                    </h2>
                    <p className="text-sm font-bold text-slate-300 mt-1">
                        Escolha o plano ideal abaixo. Seu acesso é liberado <span className="text-emerald-400 font-black">automaticamente</span> após o pagamento.
                    </p>
                </div>
                
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 w-full md:w-auto text-center shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Atual da Conta</span>
                    <span className={`text-lg font-black uppercase tracking-wide block ${assinatura?.status === 'teste_gratis' ? 'text-[#F27A18]' : (assinatura?.status === 'suspensa' ? 'text-red-500' : 'text-emerald-400')}`}>
                        {assinatura?.status === 'teste_gratis' ? 'TESTE GRÁTIS' : (assinatura?.status === 'suspensa' ? 'BLOQUEADO' : 'ATIVO')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 mt-1 block">
                        {diasRestantes < 0 ? 'Vencido' : `Expira em: ${dataFormatada}`}
                    </span>
                </div>
            </div>

            {/* ÁREA DE UPGRADE */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-200">
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-b border-slate-100 pb-6">
                    <div className="text-center md:text-left">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
                            <Icon name="zap" size={24} className="text-[#F27A18]" />
                            Escolha seu Plano
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Selecione o módulo e garanta descontos exclusivos à vista.
                        </p>
                    </div>

                    {/* ABAS ESTILO TOGGLE PREMIUM */}
                    <div className="flex bg-slate-100 p-1.5 rounded-xl w-full md:w-auto border border-slate-200 shadow-inner">
                        <button 
                            onClick={() => setAbaPlano('completo')}
                            className={`flex-1 md:w-48 py-2.5 rounded-lg text-xs font-black uppercase transition-all duration-300 ${abaPlano === 'completo' ? 'bg-emerald-500 text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Sistema Completo
                        </button>
                        <button 
                            onClick={() => setAbaPlano('cmv')}
                            className={`flex-1 md:w-48 py-2.5 rounded-lg text-xs font-black uppercase transition-all duration-300 ${abaPlano === 'cmv' ? 'bg-emerald-500 text-white shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Módulo CMV
                        </button>
                    </div>
                </div>

                {/* TABELA DE PREÇOS ALTA CONVERSÃO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {planosAtivos.map((plano, idx) => (
                        <div key={idx} className={`relative p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 ${plano.destaque ? 'bg-slate-900 text-white md:-translate-y-4 shadow-2xl shadow-emerald-500/20 border-2 border-emerald-500 z-10' : 'bg-slate-50 border-2 border-slate-100 hover:border-emerald-200 hover:shadow-lg'}`}>
                            
                            {/* BADGE DE DESCONTO */}
                            {plano.badge && (
                                <div className="absolute -top-3.5 left-0 w-full flex justify-center">
                                    <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-md flex items-center gap-1 ${plano.destaque ? 'bg-emerald-500 text-white border border-emerald-400' : 'bg-[#F27A18] text-white'}`}>
                                        {plano.destaque && <Icon name="star" size={12} className="text-yellow-300" />} 
                                        {plano.badge}
                                    </span>
                                </div>
                            )}
                            
                            <div className="mt-3 md:mt-0 text-center">
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-4 ${plano.destaque ? 'text-emerald-400' : 'text-slate-500'}`}>{plano.titulo}</h4>
                                
                                {/* ANCORAGEM DE PREÇO (DE/POR) */}
                                <div className="min-h-[20px] mb-1">
                                    {plano.de && (
                                        <span className={`text-[10px] font-black uppercase line-through ${plano.destaque ? 'text-slate-400' : 'text-slate-400'}`}>
                                            De {plano.de} por:
                                        </span>
                                    )}
                                </div>

                                <div className="mb-4 flex flex-col items-center justify-center">
                                    <span className={`text-3xl font-black tracking-tight ${plano.destaque ? 'text-white' : 'text-slate-900'}`}>
                                        R$ {plano.preco}
                                    </span>
                                    <span className={`text-[10px] font-black mt-1 ${plano.destaque ? 'text-emerald-400' : 'text-slate-500'}`}>{plano.sub}</span>
                                </div>
                                
                                <div className={`w-12 h-1 mx-auto mb-4 rounded-full ${plano.destaque ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>

                                <p className={`text-[11px] font-black uppercase mb-2 ${plano.destaque ? 'text-emerald-300' : 'text-slate-700'}`}>
                                    {plano.desc1}
                                </p>
                                <p className={`text-[10px] font-bold uppercase leading-relaxed ${plano.destaque ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {plano.desc2}
                                </p>
                            </div>

                            {/* BOTÕES DE CHECKOUT */}
                            <div className="mt-6 space-y-3">
                                {plano.linkVista ? (
                                    <>
                                        <a 
                                            href={plano.linkVista} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full flex flex-col items-center justify-center py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 transform hover:-translate-y-1 animate-pulse hover:animate-none"
                                        >
                                            <span className="flex items-center gap-1.5"><Icon name="zap" size={14} className="text-yellow-300" /> Assinar no PIX</span>
                                        </a>
                                        <a 
                                            href={plano.linkParcelado} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full block text-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                                        >
                                            {plano.btnParcelado}
                                        </a>
                                    </>
                                ) : (
                                    <a 
                                        href={plano.link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="w-full block text-center py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors bg-slate-800 text-white hover:bg-black shadow-md hover:shadow-lg"
                                    >
                                        Assinar Plano
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* FOOTER DE GARANTIA E SEGURANÇA */}
                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Icon name="shield" size={32} className="text-emerald-500" />
                        <div>
                            <span className="block text-xs font-black uppercase text-slate-700">Pagamento 100% Seguro</span>
                            <span className="block text-[10px] font-bold uppercase">Transação criptografada pelo Asaas</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                        <Icon name="check-circle" size={32} className="text-emerald-500" />
                        <div>
                            <span className="block text-xs font-black uppercase text-slate-700">Liberação Automática</span>
                            <span className="block text-[10px] font-bold uppercase">Sistema atualizado na hora</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Assinatura;