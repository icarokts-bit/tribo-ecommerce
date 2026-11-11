import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { db } from '../../firebase';

export default function TemplateVibrante({ loja, produtos, categorias, donoUid }) {
    const uidLoja = donoUid || loja?.donoUid || loja?.uid;

    // Estados de Modais e Menus
    const [authModal, setAuthModal] = useState({ open: false, mode: 'login' }); // 'login' | 'register'
    const [clientAreaModal, setClientAreaModal] = useState({ open: false, tab: 'pedidos' }); // 'cadastro' | 'pedidos'
    const [showCartModal, setShowCartModal] = useState(false);
    const [deptOpen, setDeptOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Estado do Cliente Logado + Mensagem de Boas-Vindas
    const [clienteLogado, setClienteLogado] = useState(null);
    const [mensagemTopo, setMensagemTopo] = useState('');
    const [meusPedidos, setMeusPedidos] = useState([]);

    // Estados de Busca e Filtro
    const [busca, setBusca] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

    // Estados de Interação
    const [favoritos, setFavoritos] = useState([]);
    const [carrinho, setCarrinho] = useState([]);
    const [copiadoId, setCopiadoId] = useState(null);

    // Estados dos 2 Carrosséis (Destaques e Promoções)
    const [slideDestaque, setSlideDestaque] = useState(0);
    const [slidePromo, setSlidePromo] = useState(0);

    // Campos de Cadastro / Login / Edição de Perfil
    const [regNome, setRegNome] = useState('');
    const [regWhatsapp, setRegWhatsapp] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regEndereco, setRegEndereco] = useState('');
    const [regSenha, setRegSenha] = useState('');
    const [loginAcesso, setLoginAcesso] = useState('');
    const [loginSenha, setLoginSenha] = useState('');
    const [processandoAuth, setProcessandoAuth] = useState(false);

    // Listas para os Carrosséis Lado a Lado
    const produtosDestaque = produtos.filter(p => p.destaque);
    const listaCarrosselDestaque = produtosDestaque.length > 0 ? produtosDestaque : produtos.slice(0, 5);

    const produtosPromocao = produtos.filter(p => p.isPromo);
    const listaCarrosselPromo = produtosPromocao.length > 0 ? produtosPromocao : produtos.slice(0, 5);

    // Recupera sessão salva do cliente no navegador
    useEffect(() => {
        const salvo = localStorage.getItem(`cliente_${uidLoja}`);
        if (salvo) {
            try {
                const parsed = JSON.parse(salvo);
                setClienteLogado(parsed);
                setRegNome(parsed.nome || parsed.name || '');
                setRegWhatsapp(parsed.telefone || parsed.phone || '');
                setRegEmail(parsed.email || '');
                setRegEndereco(parsed.endereco || parsed.address || '');
            } catch (e) {}
        }
    }, [uidLoja]);

    // Rotação automática do Carrossel de Destaques
    useEffect(() => {
        if (listaCarrosselDestaque.length <= 1) return;
        const timer = setInterval(() => {
            setSlideDestaque(prev => (prev + 1) % listaCarrosselDestaque.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [listaCarrosselDestaque.length]);

    // Rotação automática do Carrossel de Promoções
    useEffect(() => {
        if (listaCarrosselPromo.length <= 1) return;
        const timer = setInterval(() => {
            setSlidePromo(prev => (prev + 1) % listaCarrosselPromo.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [listaCarrosselPromo.length]);

    // Puxa o telefone/WhatsApp configurado na aba Ajustes do Site
    const telefoneAjustes = loja?.whatsapp || loja?.telefone || loja?.phone || loja?.celular || loja?.contato || '';
    const wppLimpo = String(telefoneAjustes).replace(/\D/g, '');

    const getWppLink = (msg) => {
        const texto = encodeURIComponent(msg);
        if (wppLimpo) {
            const numeroComDdi = wppLimpo.startsWith('55') && wppLimpo.length >= 12 ? wppLimpo : `55${wppLimpo}`;
            return `https://wa.me/${numeroComDdi}?text=${texto}`;
        }
        return `https://api.whatsapp.com/send?text=${texto}`;
    };

    const exibirNotificacao = (msg) => {
        setMensagemTopo(msg);
        setTimeout(() => setMensagemTopo(''), 6000);
    };

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // =====================================================
    // CADASTRO E LOGIN DE CLIENTES INTEGRADO COM O SISTEMA
    // =====================================================
    const salvarClienteNasColecoes = async (clientId, payload) => {
        const colecoes = ['clientes', 'clients', 'delivery_clients'];
        await Promise.all(
            colecoes.map(col =>
                db.collection(`artifacts/tribo-burger-financeiro/users/${uidLoja}/${col}`).doc(clientId).set(payload, { merge: true })
            )
        );
    };

    const handleRegistrarCliente = async (e) => {
        e.preventDefault();
        if (!uidLoja) return alert("Erro: ID da loja não localizado.");

        setProcessandoAuth(true);
        try {
            const clientId = crypto.randomUUID();
            const agora = new Date().toISOString();

            // Payload compatível com todos os formatos de colunas da aba Clientes do sistema
            const novoCliente = {
                id: clientId,
                nome: regNome.trim(),
                name: regNome.trim(),
                telefone: regWhatsapp.trim(),
                phone: regWhatsapp.trim(),
                whatsapp: regWhatsapp.trim(),
                contato: regWhatsapp.trim(),
                email: regEmail.trim().toLowerCase(),
                endereco: regEndereco.trim() || 'Cadastrado via Site',
                address: regEndereco.trim() || 'Cadastrado via Site',
                enderecoPrincipal: regEndereco.trim() || 'Cadastrado via Site',
                senha: regSenha,
                password: regSenha,
                totalGasto: 0,
                totalSpent: 0,
                receitaGerada: 0,
                pedidos: 0,
                orderCount: 0,
                totalPedidos: 0,
                fidelidade: 0,
                pontos: 0,
                origem: 'E-commerce',
                createdAt: agora,
                updatedAt: agora,
                dataCadastro: agora
            };

            await salvarClienteNasColecoes(clientId, novoCliente);

            setClienteLogado(novoCliente);
            localStorage.setItem(`cliente_${uidLoja}`, JSON.stringify(novoCliente));
            setAuthModal({ open: false, mode: 'login' });
            exibirNotificacao(`Bem-vindo(a), ${novoCliente.nome}! Seu cadastro foi realizado com sucesso.`);
        } catch (error) {
            console.error("Erro ao cadastrar cliente:", error);
            alert("Erro ao realizar cadastro. Verifique sua conexão.");
        }
        setProcessandoAuth(false);
    };

    const handleLoginCliente = async (e) => {
        e.preventDefault();
        if (!uidLoja) return;
        setProcessandoAuth(true);

        try {
            const termo = loginAcesso.trim().toLowerCase();
            const termoLimpo = loginAcesso.replace(/\D/g, '');

            let encontrado = null;
            const colecoesBusca = ['clientes', 'clients', 'delivery_clients'];

            for (const nomeCol of colecoesBusca) {
                const snap = await db.collection(`artifacts/tribo-burger-financeiro/users/${uidLoja}/${nomeCol}`).get();
                snap.docs.forEach(doc => {
                    const d = doc.data();
                    const emailDoc = (d.email || '').toLowerCase();
                    const foneDoc = String(d.telefone || d.phone || d.whatsapp || '').replace(/\D/g, '');
                    const senhaDoc = d.senha || d.password || '';

                    const bateUsuario = (emailDoc && emailDoc === termo) || (foneDoc && termoLimpo && foneDoc.includes(termoLimpo));
                    const bateSenha = !senhaDoc || senhaDoc === loginSenha;

                    if (bateUsuario && bateSenha && !encontrado) {
                        encontrado = { id: doc.id, ...d };
                    }
                });
                if (encontrado) break;
            }

            if (encontrado) {
                setClienteLogado(encontrado);
                setRegNome(encontrado.nome || encontrado.name || '');
                setRegWhatsapp(encontrado.telefone || encontrado.phone || '');
                setRegEmail(encontrado.email || '');
                setRegEndereco(encontrado.endereco || encontrado.address || '');
                localStorage.setItem(`cliente_${uidLoja}`, JSON.stringify(encontrado));
                setAuthModal({ open: false, mode: 'login' });
                exibirNotificacao(`Olá novamente, ${encontrado.nome || encontrado.name}! Login efetuado com sucesso.`);
            } else {
                alert("Cliente não encontrado ou senha incorreta. Caso não tenha conta, clique na aba 'Quero me Cadastrar'.");
            }
        } catch (error) {
            console.error("Erro no login:", error);
            alert("Erro ao validar acesso.");
        }
        setProcessandoAuth(false);
    };

    const handleAtualizarMeuCadastro = async (e) => {
        e.preventDefault();
        if (!clienteLogado || !uidLoja) return;
        setProcessandoAuth(true);

        try {
            const atualizado = {
                ...clienteLogado,
                nome: regNome.trim(),
                name: regNome.trim(),
                telefone: regWhatsapp.trim(),
                phone: regWhatsapp.trim(),
                whatsapp: regWhatsapp.trim(),
                email: regEmail.trim().toLowerCase(),
                endereco: regEndereco.trim(),
                address: regEndereco.trim(),
                enderecoPrincipal: regEndereco.trim(),
                updatedAt: new Date().toISOString()
            };

            await salvarClienteNasColecoes(clienteLogado.id, atualizado);
            setClienteLogado(atualizado);
            localStorage.setItem(`cliente_${uidLoja}`, JSON.stringify(atualizado));
            exibirNotificacao("Seus dados cadastrais foram atualizados com sucesso!");
            setClientAreaModal({ ...clientAreaModal, open: false });
        } catch (error) {
            alert("Erro ao atualizar dados.");
        }
        setProcessandoAuth(false);
    };

    const handleLogout = () => {
        setClienteLogado(null);
        localStorage.removeItem(`cliente_${uidLoja}`);
        setUserMenuOpen(false);
        exibirNotificacao("Você saiu da sua conta.");
    };

    // =====================================================
    // INTERAÇÕES DE PRODUTO E PEDIDO
    // =====================================================
    const toggleFavorito = (id) => {
        setFavoritos(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleCompartilhar = async (produto) => {
        const urlLoja = window.location.href;
        const shareData = {
            title: `${produto.name} - ${loja.nomeLoja}`,
            text: `Confira ${produto.name} por ${formatMoney(produto.sellingPrice)} na ${loja.nomeLoja}!`,
            url: urlLoja
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) {}
        } else {
            navigator.clipboard.writeText(`${shareData.text} ${urlLoja}`);
            setCopiadoId(produto.id);
            setTimeout(() => setCopiadoId(null), 2000);
        }
    };

    const adicionarAoCarrinho = (produto) => {
        setCarrinho(prev => {
            const existe = prev.find(item => item.id === produto.id);
            if (existe) return prev.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item);
            return [...prev, { ...produto, qtd: 1 }];
        });
        exibirNotificacao(`"${produto.name}" foi adicionado ao seu carrinho!`);
    };

    const registrarPedidoDoCliente = async (itensPedido, valorTotal) => {
        const novoPedido = {
            id: crypto.randomUUID().slice(0, 8).toUpperCase(),
            data: new Date().toLocaleDateString('pt-BR'),
            itens: itensPedido,
            total: valorTotal,
            status: 'Enviado via WhatsApp'
        };
        setMeusPedidos(prev => [novoPedido, ...prev]);

        if (clienteLogado && uidLoja) {
            const novoTotalGasto = Number(clienteLogado.totalGasto || clienteLogado.totalSpent || 0) + Number(valorTotal);
            const novaQtdPedidos = Number(clienteLogado.pedidos || clienteLogado.orderCount || 0) + 1;
            const clienteAtualizado = {
                ...clienteLogado,
                totalGasto: novoTotalGasto,
                totalSpent: novoTotalGasto,
                receitaGerada: novoTotalGasto,
                pedidos: novaQtdPedidos,
                orderCount: novaQtdPedidos,
                ultimoPedido: new Date().toISOString()
            };
            setClienteLogado(clienteAtualizado);
            localStorage.setItem(`cliente_${uidLoja}`, JSON.stringify(clienteAtualizado));
            await salvarClienteNasColecoes(clienteLogado.id, clienteAtualizado);
        }
    };

    const handleComprarDireto = (produto) => {
        registrarPedidoDoCliente(`${produto.name} (1x)`, produto.sellingPrice);
        const identificacao = clienteLogado ? `\nCliente: *${clienteLogado.nome || clienteLogado.name}* (${clienteLogado.telefone || clienteLogado.phone})` : '';
        const msg = `Olá! Quero comprar agora o produto *${produto.name}* (${formatMoney(produto.sellingPrice)}) que vi no site da ${loja.nomeLoja}.${identificacao}`;
        window.open(getWppLink(msg), '_blank');
    };

    const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.sellingPrice || 0) * item.qtd), 0);
    const qtdTotalCarrinho = carrinho.reduce((acc, item) => acc + item.qtd, 0);

    const produtosFiltrados = produtos.filter(p => {
        const matchNome = p.name?.toLowerCase().includes(busca.toLowerCase());
        const matchCat = categoriaFiltro === 'todas' || (categoriaFiltro === 'favoritos' ? favoritos.includes(p.id) : p.category?.toLowerCase() === categoriaFiltro.toLowerCase());
        return matchNome && matchCat;
    });

    return (
        <div className="bg-[#f8fafc] min-h-screen w-full font-sans text-slate-800 flex flex-col">
            
            {/* NOTIFICAÇÃO FLUTUANTE DE LOGIN / AÇÕES */}
            {mensagemTopo && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-3 border-2 border-white animate-bounce">
                    <span>✓</span>
                    <span>{mensagemTopo}</span>
                    <button onClick={() => setMensagemTopo('')} className="ml-2 text-white/80 hover:text-white">✕</button>
                </div>
            )}

            {/* 1. FAIXA PROMOCIONAL LARANJA DE TOPO */}
            <div className="w-full bg-orange-500 text-white text-xs md:text-sm font-bold py-2.5 px-4 md:px-10 xl:px-16">
                <div className="w-full flex flex-wrap justify-between items-center gap-2">
                    <span className="flex items-center gap-1.5">✓ Envio rápido e seguro para todo o Brasil</span>
                    <span className="hidden md:inline">✓ Peças personalizadas com acabamento premium direto da fábrica</span>
                    <span className="flex items-center gap-1.5">✓ Atendimento rápido via WhatsApp</span>
                </div>
            </div>

            {/* 2. SUB-TOPBAR UTILITÁRIA (FONTES AUMENTADAS PARA SOBRE NÓS, CATÁLOGO E CONTATO) */}
            <div className="w-full bg-white border-b border-slate-200 py-3 px-4 md:px-10 xl:px-16">
                <div className="w-full flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-6 text-sm md:text-base font-extrabold text-slate-700">
                        <a href="#rodape" className="hover:text-orange-500 transition-colors">Sobre Nós</a>
                        <span className="text-slate-300">|</span>
                        <a href="#vitrine" className="hover:text-orange-500 transition-colors">Catálogo</a>
                        <span className="text-slate-300">|</span>
                        <a href="#rodape" className="hover:text-orange-500 transition-colors">Contato</a>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-700">
                        <span>Avaliação dos Clientes 5 de 5:</span>
                        <span className="text-orange-400 text-base">★★★★★</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-black">
                        {clienteLogado ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">
                                ● Logado como {clienteLogado.nome || clienteLogado.name}
                            </span>
                        ) : (
                            <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className="text-orange-600 hover:underline">
                                Criar Conta Grátis
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. HEADER PRINCIPAL (LOGO BEM GRANDE + BUSCA + MENU DIFERENCIADO LOGADO) */}
            <header className="w-full bg-white py-5 px-4 md:px-10 xl:px-16 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6">
                    
                    {/* LOGO AUMENTADA (h-24 w-24 md:h-28 md:w-28) */}
                    <div onClick={() => { setCategoriaFiltro('todas'); setBusca(''); }} className="flex items-center gap-5 cursor-pointer shrink-0">
                        {loja.logoUrl ? (
                            <img 
                                src={loja.logoUrl} 
                                className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-contain bg-white border-2 border-slate-200 p-1.5 shadow-md" 
                                alt={loja.nomeLoja} 
                            />
                        ) : (
                            <div className="h-24 w-24 md:h-28 md:w-28 rounded-2xl bg-[var(--cor-primaria)] flex items-center justify-center text-white font-black text-4xl shadow-md">
                                <Icon name="shopping-cart" size={44} />
                            </div>
                        )}
                        <div>
                            <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight leading-none uppercase">
                                {loja.nomeLoja}
                            </h1>
                            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-orange-500 block mt-1.5">
                                Loja Oficial Online
                            </span>
                        </div>
                    </div>

                    {/* BOTÃO DE DEPARTAMENTOS + BARRA DE BUSCA */}
                    <div className="flex-1 w-full max-w-3xl flex flex-col sm:flex-row items-stretch gap-2.5 relative">
                        <div className="relative">
                            <button 
                                type="button" 
                                onClick={() => setDeptOpen(!deptOpen)} 
                                className="h-full w-full sm:w-60 text-white px-5 py-3.5 rounded-xl font-black text-sm uppercase flex items-center justify-between gap-2 shadow-sm transition-opacity hover:opacity-95" 
                                style={{ backgroundColor: 'var(--cor-primaria)' }}
                            >
                                <span className="flex items-center gap-2.5 truncate">
                                    <Icon name="list" size={18} />
                                    {categoriaFiltro === 'todas' ? 'Departamentos' : categoriaFiltro}
                                </span>
                                <span className="text-xs">▼</span>
                            </button>

                            {deptOpen && (
                                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50">
                                    <button 
                                        onClick={() => { setCategoriaFiltro('todas'); setDeptOpen(false); }} 
                                        className={`w-full text-left px-5 py-3 text-sm font-black uppercase hover:bg-slate-50 flex items-center justify-between ${categoriaFiltro === 'todas' ? 'text-orange-500 bg-orange-50/50' : 'text-slate-700'}`}
                                    >
                                        <span>Todos os Produtos</span>
                                        <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded-full">{produtos.length}</span>
                                    </button>
                                    {categorias.map(c => (
                                        <button 
                                            key={c.id} 
                                            onClick={() => { setCategoriaFiltro(c.name); setDeptOpen(false); }} 
                                            className={`w-full text-left px-5 py-3 text-sm font-bold hover:bg-slate-50 flex items-center justify-between border-t border-slate-50 ${categoriaFiltro === c.name ? 'text-orange-500 bg-orange-50/50 font-black' : 'text-slate-600'}`}
                                        >
                                            <span>{c.name}</span><span>›</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex bg-white border-2 border-slate-200 focus-within:border-[var(--cor-primaria)] rounded-xl overflow-hidden">
                            <input 
                                type="text" 
                                value={busca} 
                                onChange={e => setBusca(e.target.value)} 
                                placeholder="Buscar produtos, modelos, chaveiros..." 
                                className="flex-1 px-4 py-3 text-sm md:text-base font-medium text-slate-700 outline-none" 
                            />
                            {busca && <button onClick={() => setBusca('')} className="px-3 text-slate-400 hover:text-slate-600">✕</button>}
                            <button className="px-5 text-slate-500 hover:text-[var(--cor-primaria)]">
                                <Icon name="search" size={20} />
                            </button>
                        </div>
                    </div>

                    {/* CONTATO + MENU DO CLIENTE LOGADO / LOGIN + CARRINHO */}
                    <div className="flex items-center gap-5 shrink-0">
                        {telefoneAjustes && (
                            <a 
                                href={getWppLink(`Olá! Preciso de ajuda na loja ${loja.nomeLoja}.`)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="hidden xl:flex items-center gap-3 border-r border-slate-200 pr-5 hover:opacity-80"
                            >
                                <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Icon name="phone" size={20} />
                                </div>
                                <div className="leading-tight">
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase">WhatsApp Loja</span>
                                    <span className="font-black text-sm text-slate-800">{telefoneAjustes}</span>
                                </div>
                            </a>
                        )}

                        {/* ÁREA DO CLIENTE (MUDA QUANDO ESTÁ LOGADO) */}
                        {clienteLogado ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                                        {(clienteLogado.nome || clienteLogado.name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left leading-tight">
                                        <span className="block text-[10px] font-black uppercase text-emerald-700">Olá, { (clienteLogado.nome || clienteLogado.name).split(' ')[0] }</span>
                                        <span className="font-black text-xs text-slate-800 flex items-center gap-1">
                                            Minha Conta <span>▼</span>
                                        </span>
                                    </div>
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50">
                                        <div className="px-4 py-2.5 border-b border-slate-100">
                                            <p className="font-black text-xs text-slate-800 truncate">{clienteLogado.nome || clienteLogado.name}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{clienteLogado.email}</p>
                                        </div>
                                        <button 
                                            onClick={() => { setClientAreaModal({ open: true, tab: 'cadastro' }); setUserMenuOpen(false); }}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                        >
                                            <Icon name="user" size={16} className="text-[var(--cor-primaria)]" /> Meu Cadastro
                                        </button>
                                        <button 
                                            onClick={() => { setClientAreaModal({ open: true, tab: 'pedidos' }); setUserMenuOpen(false); }}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 border-t border-slate-50"
                                        >
                                            <Icon name="package" size={16} className="text-orange-500" /> Meus Pedidos ({meusPedidos.length})
                                        </button>
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100"
                                        >
                                            <Icon name="log-out" size={16} /> Sair da Conta
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                                    <Icon name="user" size={22} />
                                </div>
                                <div className="leading-tight text-left">
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase">Minha Conta</span>
                                    <div className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                                        <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="hover:text-orange-500">Entrar</button>
                                        <span>/</span>
                                        <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className="text-orange-500 hover:underline">Cadastrar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botão do Carrinho */}
                        <button onClick={() => setShowCartModal(true)} className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-colors">
                            <div className="relative">
                                <Icon name="shopping-cart" size={24} className="text-slate-800" />
                                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">{qtdTotalCarrinho}</span>
                            </div>
                            <div className="text-left leading-tight hidden sm:block">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Carrinho</span>
                                <span className="font-black text-sm text-slate-900">{formatMoney(totalCarrinho)}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* 4. BARRA DE NAVEGAÇÃO HORIZONTAL (FONTES GRANDES PARA INÍCIO/TODOS, CATEGORIAS E STATUS DO PEDIDO) */}
            <nav className="w-full bg-white border-b border-slate-200 px-4 md:px-10 xl:px-16 shadow-xs">
                <div className="w-full flex items-center justify-between py-4 gap-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-8 text-sm md:text-base font-extrabold text-slate-700 whitespace-nowrap">
                        <button 
                            onClick={() => { setCategoriaFiltro('todas'); setBusca(''); }} 
                            className={`transition-colors pb-1.5 border-b-3 ${categoriaFiltro === 'todas' ? 'border-orange-500 text-orange-600 font-black' : 'border-transparent hover:text-[var(--cor-primaria)]'}`}
                        >
                            Início / Todos ({produtos.length})
                        </button>
                        {categorias.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setCategoriaFiltro(c.name)} 
                                className={`transition-colors pb-1.5 border-b-3 ${categoriaFiltro.toLowerCase() === c.name.toLowerCase() ? 'border-orange-500 text-orange-600 font-black' : 'border-transparent hover:text-[var(--cor-primaria)]'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-6 text-sm md:text-base font-extrabold text-slate-700 whitespace-nowrap shrink-0">
                        {clienteLogado && (
                            <>
                                <button 
                                    onClick={() => setClientAreaModal({ open: true, tab: 'cadastro' })} 
                                    className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800"
                                >
                                    <Icon name="user" size={18} /> Meu Cadastro
                                </button>
                                <span className="text-slate-300">|</span>
                            </>
                        )}
                        <button 
                            onClick={() => clienteLogado ? setClientAreaModal({ open: true, tab: 'pedidos' }) : setAuthModal({ open: true, mode: 'login' })} 
                            className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                        >
                            <Icon name="package" size={18} className="text-orange-500" /> 
                            {clienteLogado ? `Meus Pedidos (${meusPedidos.length})` : 'Status do Pedido'}
                        </button>
                        <span className="text-slate-300">|</span>
                        <button 
                            onClick={() => setCategoriaFiltro(categoriaFiltro === 'favoritos' ? 'todas' : 'favoritos')} 
                            className={`flex items-center gap-2 transition-colors ${categoriaFiltro === 'favoritos' ? 'text-rose-600 font-black' : 'hover:text-rose-500'}`}
                        >
                            <span className="text-rose-500 text-lg">♥</span> Itens Salvos ({favoritos.length})
                        </button>
                    </div>
                </div>
            </nav>

            {/* CONTEÚDO PRINCIPAL EM TELA INTEIRA */}
            <main className="w-full px-4 md:px-10 xl:px-16 py-8 space-y-12 flex-1">
                
                {/* 5. HERO BANNER + BANNER LATERAL */}
                {categoriaFiltro === 'todas' && !busca && (
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-[var(--cor-primaria)] text-white relative min-h-[280px] md:min-h-[360px] flex items-center shadow-md">
                            {loja.bannerUrl && <img src={loja.bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-55" />}
                            <div className="relative z-10 p-8 md:p-12 max-w-xl space-y-4">
                                <span className="bg-orange-500 text-white text-xs font-black uppercase px-3.5 py-1 rounded-full tracking-widest inline-block">Destaque Exclusivo</span>
                                <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">{loja.nomeLoja}</h2>
                                <p className="text-sm md:text-base text-slate-100 font-medium">Qualidade profissional, personalização sob medida e envio para todo o país.</p>
                                <div className="pt-2 flex flex-wrap gap-3">
                                    <a href="#vitrine" className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase px-6 py-3.5 rounded-xl shadow-lg transition-colors">Ver Catálogo</a>
                                    <a href={getWppLink(`Olá! Gostaria de fazer um pedido personalizado na ${loja.nomeLoja}.`)} target="_blank" rel="noreferrer" className="bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/30 font-black text-xs uppercase px-6 py-3.5 rounded-xl transition-colors">Falar no WhatsApp</a>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-4 rounded-2xl overflow-hidden bg-[#eaeff6] border border-slate-200 p-8 flex flex-col justify-between relative min-h-[280px] shadow-sm">
                            <div className="space-y-2 z-10">
                                <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded">PROJETOS ESPECIAIS</span>
                                <h3 className="text-2xl font-black text-slate-900 leading-tight pt-1">Personalize com a sua Marca</h3>
                                <p className="text-xs md:text-sm text-slate-600 font-medium">Displays NFC, chaveiros corporativos e peças exclusivas.</p>
                            </div>
                            {loja.totemUrl && <img src={loja.totemUrl} alt="Promo" className="w-36 h-36 object-contain self-end my-2 drop-shadow-md" />}
                            <div className="z-10 pt-4">
                                <a href={getWppLink(`Olá! Quero cotar um projeto personalizado na ${loja.nomeLoja}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase px-5 py-3.5 rounded-xl transition-colors">
                                    Solicitar Cotação <span>→</span>
                                </a>
                            </div>
                        </div>
                    </section>
                )}

                {/* 6. MOSAICO DE FOTOS DAS CATEGORIAS (BENTO GRID MARKETOP RESTAURADO) */}
                {categorias.length > 0 && (
                    <section className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Departamentos & Categorias</h2>
                                <p className="text-xs text-slate-500 font-bold">Clique em uma categoria para filtrar os produtos</p>
                            </div>
                            {categoriaFiltro !== 'todas' && (
                                <button onClick={() => setCategoriaFiltro('todas')} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-orange-200">
                                    ✕ Mostrar Todas ({categoriaFiltro})
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {categorias.map((cat, index) => {
                                const ativo = categoriaFiltro.toLowerCase() === cat.name.toLowerCase();
                                const isLargeTall = index === 0 && categorias.length >= 3;
                                const isLargeWide = index === 2 && categorias.length >= 4;

                                return (
                                    <div 
                                        key={cat.id}
                                        onClick={() => setCategoriaFiltro(ativo ? 'todas' : cat.name)}
                                        className={`group cursor-pointer rounded-2xl p-6 flex transition-all duration-300 hover:shadow-lg border-2 overflow-hidden relative ${
                                            ativo ? 'border-orange-500 bg-orange-50/40' : 'border-slate-200/80 hover:border-[var(--cor-primaria)]'
                                        } ${
                                            isLargeTall ? 'col-span-2 sm:col-span-1 row-span-2 bg-white flex-col justify-between items-center text-center min-h-[270px]' :
                                            isLargeWide ? 'col-span-2 bg-white flex-col justify-between items-center text-center min-h-[270px]' :
                                            'bg-[#eef6ff] hover:bg-[#e2effe] items-center justify-between gap-4 h-36'
                                        }`}
                                    >
                                        <div className="z-10">
                                            <h3 className={`font-black uppercase tracking-wide transition-colors ${ativo ? 'text-orange-600' : 'text-slate-800 group-hover:text-[var(--cor-primaria)]'} ${isLargeTall || isLargeWide ? 'text-lg md:text-xl' : 'text-sm md:text-base'}`}>
                                                {cat.name}
                                            </h3>
                                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-orange-500">Ver itens →</span>
                                        </div>
                                        
                                        <div className={`flex items-center justify-center overflow-hidden ${isLargeTall || isLargeWide ? 'w-full h-44 my-auto' : 'w-24 h-24 shrink-0'}`}>
                                            {cat.imageUrl ? (
                                                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-xs" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-xs">
                                                    <Icon name="box" size={28} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 7. CARROSSEL DUPLO LADO A LADO: DESTAQUES (ESQUERDA) + PROMOÇÕES (DIREITA) */}
                {(listaCarrosselDestaque.length > 0 || listaCarrosselPromo.length > 0) && categoriaFiltro === 'todas' && !busca && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* CARROSSEL 1: PRODUTOS EM DESTAQUE */}
                        {listaCarrosselDestaque.length > 0 && (() => {
                            const prodSlide = listaCarrosselDestaque[slideDestaque] || listaCarrosselDestaque[0];
                            return (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded">★ DESTAQUES</span>
                                            <h2 className="font-black text-xs md:text-sm uppercase tracking-wider">Produtos em Destaque</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setSlideDestaque(prev => (prev - 1 + listaCarrosselDestaque.length) % listaCarrosselDestaque.length)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-xs font-black">❮</button>
                                            <span className="text-xs font-bold">{slideDestaque + 1}/{listaCarrosselDestaque.length}</span>
                                            <button onClick={() => setSlideDestaque(prev => (prev + 1) % listaCarrosselDestaque.length)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-xs font-black">❯</button>
                                        </div>
                                    </div>

                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center flex-1 bg-gradient-to-br from-white via-slate-50 to-amber-50/30">
                                        <div className="sm:col-span-5 flex items-center justify-center bg-white rounded-2xl p-4 border border-slate-200/80 h-52 shadow-inner relative">
                                            <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">TOP</span>
                                            {prodSlide.imageUrl ? (
                                                <img src={prodSlide.imageUrl} alt={prodSlide.name} className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" />
                                            ) : (
                                                <Icon name="image" size={48} className="text-slate-200" />
                                            )}
                                        </div>
                                        <div className="sm:col-span-7 space-y-3">
                                            <span className="text-xs font-black uppercase text-orange-500 block">{prodSlide.category || 'Destaque'}</span>
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight line-clamp-2">{prodSlide.name}</h3>
                                            <p className="text-xs text-slate-600 font-medium line-clamp-2">{prodSlide.description || 'Peça em destaque com acabamento premium.'}</p>
                                            <div className="flex items-baseline gap-2.5 pt-1">
                                                <span className="text-2xl font-black text-slate-900">{formatMoney(prodSlide.sellingPrice)}</span>
                                                {prodSlide.isPromo && <span className="text-xs text-slate-400 line-through font-bold">{formatMoney(prodSlide.price)}</span>}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                                <button onClick={() => handleComprarDireto(prodSlide)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm transition-colors">Comprar</button>
                                                <button onClick={() => adicionarAoCarrinho(prodSlide)} className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">
                                                    <Icon name="shopping-cart" size={14} /> + Carrinho
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* CARROSSEL 2: OFERTAS & PROMOÇÕES */}
                        {listaCarrosselPromo.length > 0 && (() => {
                            const promoSlide = listaCarrosselPromo[slidePromo] || listaCarrosselPromo[0];
                            const descPerc = promoSlide.isPromo && promoSlide.price > 0
                                ? Math.round(((promoSlide.price - promoSlide.promoPrice) / promoSlide.price) * 100)
                                : 15;
                            return (
                                <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="bg-rose-600 text-white px-5 py-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-white text-rose-600 text-[10px] font-black uppercase px-2.5 py-0.5 rounded">🔥 OFERTAS</span>
                                            <h2 className="font-black text-xs md:text-sm uppercase tracking-wider">Carrossel de Promoções</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setSlidePromo(prev => (prev - 1 + listaCarrosselPromo.length) % listaCarrosselPromo.length)} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-xs font-black">❮</button>
                                            <span className="text-xs font-bold">{slidePromo + 1}/{listaCarrosselPromo.length}</span>
                                            <button onClick={() => setSlidePromo(prev => (prev + 1) % listaCarrosselPromo.length)} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-xs font-black">❯</button>
                                        </div>
                                    </div>

                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center flex-1 bg-gradient-to-br from-white via-rose-50/20 to-orange-50/30">
                                        <div className="sm:col-span-5 flex items-center justify-center bg-white rounded-2xl p-4 border border-rose-100 h-52 shadow-inner relative">
                                            <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">-{descPerc}% OFF</span>
                                            {promoSlide.imageUrl ? (
                                                <img src={promoSlide.imageUrl} alt={promoSlide.name} className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" />
                                            ) : (
                                                <Icon name="image" size={48} className="text-slate-200" />
                                            )}
                                        </div>
                                        <div className="sm:col-span-7 space-y-3">
                                            <span className="text-xs font-black uppercase text-rose-600 block">Oferta por Tempo Limitado</span>
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight line-clamp-2">{promoSlide.name}</h3>
                                            <p className="text-xs text-slate-600 font-medium line-clamp-2">{promoSlide.description || 'Aproveite o desconto especial direto da fábrica.'}</p>
                                            <div className="flex items-baseline gap-2.5 pt-1">
                                                <span className="text-2xl font-black text-rose-600">{formatMoney(promoSlide.sellingPrice)}</span>
                                                {promoSlide.price > promoSlide.sellingPrice && (
                                                    <span className="text-xs text-slate-400 line-through font-bold">{formatMoney(promoSlide.price)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                                <button onClick={() => handleComprarDireto(promoSlide)} className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm transition-colors">Aproveitar Oferta</button>
                                                <button onClick={() => adicionarAoCarrinho(promoSlide)} className="bg-slate-900 hover:bg-black text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">
                                                    <Icon name="shopping-cart" size={14} /> + Carrinho
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </section>
                )}

                {/* 8. FAIXA DE BENEFÍCIOS */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shadow-xs">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[var(--cor-primaria)] flex items-center justify-center shrink-0"><Icon name="truck" size={26} /></div>
                        <div>
                            <h4 className="font-black text-xs uppercase text-slate-800">Envio Rápido e Seguro</h4>
                            <p className="text-xs text-slate-500">Despachamos para todo o Brasil</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" /></svg>
                        </div>
                        <div>
                            <h4 className="font-black text-xs uppercase text-slate-800">Suporte Online</h4>
                            <p className="text-xs text-slate-500">Atendimento direto via WhatsApp</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        </div>
                        <div>
                            <h4 className="font-black text-xs uppercase text-slate-800">Preços Direto da Fábrica</h4>
                            <p className="text-xs text-slate-500">Produção própria personalizada</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon name="shield" size={26} /></div>
                        <div>
                            <h4 className="font-black text-xs uppercase text-slate-800">Garantia de Qualidade</h4>
                            <p className="text-xs text-slate-500">Acabamento premium revisado</p>
                        </div>
                    </div>
                </section>

                {/* 9. GRADE DE PRODUTOS */}
                <section id="vitrine" className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-3 gap-2">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                                {categoriaFiltro === 'todas' ? 'Catálogo Completo' : categoriaFiltro === 'favoritos' ? 'Meus Produtos Favoritos' : categoriaFiltro}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Exibindo {produtosFiltrados.length} produto(s) disponível(is)</p>
                        </div>
                        {categoriaFiltro !== 'todas' && (
                            <button onClick={() => setCategoriaFiltro('todas')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase px-4 py-2 rounded-lg transition-colors">Ver Todos os Produtos</button>
                        )}
                    </div>

                    {produtosFiltrados.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                            <Icon name="box" size={48} className="mx-auto text-slate-300" />
                            <p className="font-black text-slate-600 uppercase text-sm">Nenhum produto encontrado</p>
                            <button onClick={() => { setCategoriaFiltro('todas'); setBusca(''); }} className="text-xs font-bold text-orange-500 hover:underline">Mostrar todo o catálogo</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {produtosFiltrados.map(p => {
                                const descontoPerc = p.isPromo && p.price > 0 ? Math.round(((p.price - p.promoPrice) / p.price) * 100) : 0;
                                const isFav = favoritos.includes(p.id);
                                return (
                                    <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-[var(--cor-primaria)] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative">
                                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                                            {descontoPerc > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">-{descontoPerc}%</span>}
                                            {p.destaque && <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">Top</span>}
                                        </div>
                                        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                                            <button onClick={() => toggleFavorito(p.id)} title="Favoritar" className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm transition-all ${isFav ? 'bg-rose-500 border-rose-500 text-white scale-110' : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500'}`}>
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                            </button>
                                            <button onClick={() => handleCompartilhar(p)} title="Compartilhar" className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-[var(--cor-primaria)] flex items-center justify-center shadow-sm transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                            </button>
                                        </div>
                                        {copiadoId === p.id && <span className="absolute top-12 right-12 z-20 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow">Link copiado!</span>}
                                        
                                        <div className="w-full h-48 flex items-center justify-center p-3 mb-3 bg-slate-50/60 rounded-xl overflow-hidden">
                                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" /> : <Icon name="image" size={44} className="text-slate-300" />}
                                        </div>
                                        
                                        <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-orange-500 block">{p.category || 'Geral'}</span>
                                                <h3 className="font-bold text-sm text-slate-800 group-hover:text-[var(--cor-primaria)] transition-colors line-clamp-2 min-h-[40px]">{p.name}</h3>
                                                {p.description && <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{p.description}</p>}
                                            </div>
                                            <div className="pt-2">
                                                <div className="flex items-center gap-0.5 text-orange-400 text-xs"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
                                                <div className="pt-1 flex items-baseline gap-2">
                                                    <span className="font-black text-lg text-rose-600">{formatMoney(p.sellingPrice)}</span>
                                                    {p.isPromo && <span className="text-xs text-slate-400 line-through font-bold">{formatMoney(p.price)}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                                            <button onClick={() => adicionarAoCarrinho(p)} className="py-2.5 px-2 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-200 font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1 transition-colors">
                                                <Icon name="shopping-cart" size={13} /> + Carrinho
                                            </button>
                                            <button onClick={() => handleComprarDireto(p)} className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors">
                                                Comprar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* 10. BANNER PROMOCIONAL INFERIOR */}
                <section className="rounded-2xl overflow-hidden bg-gradient-to-r from-[var(--cor-primaria)] to-slate-900 text-white p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 items-center gap-6 shadow-md">
                    <div className="md:col-span-8 space-y-3">
                        <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">Oferta Especial & Atacado</span>
                        <h3 className="text-2xl md:text-3xl font-black leading-tight">Quer personalizar brindes, chaveiros ou displays NFC para sua empresa?</h3>
                        <p className="text-xs md:text-sm text-slate-200 font-medium max-w-2xl">Produzimos em escala com descontos progressivos. Fale diretamente com nossa equipe pelo WhatsApp.</p>
                    </div>
                    <div className="md:col-span-4 flex md:justify-end">
                        <a href={getWppLink(`Olá! Gostaria de solicitar um orçamento personalizado na ${loja.nomeLoja}.`)} target="_blank" rel="noreferrer" className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase px-8 py-4 rounded-xl shadow-lg transition-transform hover:scale-105 inline-block text-center">
                            Solicitar Orçamento no WhatsApp
                        </a>
                    </div>
                </section>
            </main>

            {/* 11. RODAPÉ COMPLETO COM LOGO GRANDE */}
            <footer id="rodape" className="w-full bg-white border-t border-slate-200 mt-12 text-slate-600">
                <div className="w-full px-4 md:px-10 xl:px-16 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-4">
                            {loja.logoUrl ? (
                                <img src={loja.logoUrl} className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-contain border-2 border-slate-200 p-1.5 bg-white shadow-sm" alt="Logo Rodapé" />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-[var(--cor-primaria)] flex items-center justify-center text-white font-black text-3xl">
                                    {loja.nomeLoja?.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h4 className="font-black text-2xl text-slate-900 uppercase leading-none">{loja.nomeLoja}</h4>
                                <span className="text-sm text-orange-500 font-black block mt-1">Catálogo Oficial & E-commerce</span>
                            </div>
                        </div>

                        {telefoneAjustes && (
                            <div className="flex items-center gap-3 pt-2">
                                <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Icon name="phone" size={22} /></div>
                                <div>
                                    <span className="text-[11px] font-black uppercase text-slate-400 block">Atendimento / WhatsApp:</span>
                                    <a href={getWppLink(`Olá! Vim pelo site da ${loja.nomeLoja}.`)} target="_blank" rel="noreferrer" className="text-xl font-black text-orange-500 hover:underline">{telefoneAjustes}</a>
                                </div>
                            </div>
                        )}
                        {loja.mostrarEndereco && loja.endereco && (
                            <p className="text-sm text-slate-600 leading-relaxed"><strong className="text-slate-800">Endereço:</strong> {loja.endereco}</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Informações</h4>
                        <ul className="space-y-2.5 text-sm font-semibold text-slate-500">
                            <li><a href="#vitrine" className="hover:text-[var(--cor-primaria)]">Sobre a {loja.nomeLoja}</a></li>
                            <li><a href={getWppLink('Olá! Gostaria de tirar uma dúvida.')} target="_blank" rel="noreferrer" className="hover:text-[var(--cor-primaria)]">Fale Conosco</a></li>
                            <li><button onClick={() => clienteLogado ? setClientAreaModal({ open: true, tab: 'pedidos' }) : setAuthModal({ open: true, mode: 'login' })} className="hover:text-[var(--cor-primaria)]">Rastrear Pedido</button></li>
                            <li><a href="#vitrine" className="hover:text-[var(--cor-primaria)]">Política de Privacidade</a></li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Departamentos</h4>
                        <ul className="space-y-2.5 text-sm font-semibold text-slate-500">
                            <li><button onClick={() => setCategoriaFiltro('todas')} className="hover:text-orange-500">Todos os Produtos</button></li>
                            {categorias.slice(0, 6).map(c => <li key={c.id}><button onClick={() => setCategoriaFiltro(c.name)} className="hover:text-orange-500">{c.name}</button></li>)}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Área do Cliente</h4>
                        <p className="text-xs text-slate-500">Acesse seus dados cadastrais, produtos favoritos e histórico de pedidos.</p>
                        <div className="flex flex-col gap-2 pt-1">
                            {clienteLogado ? (
                                <>
                                    <button onClick={() => setClientAreaModal({ open: true, tab: 'cadastro' })} className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase transition-colors">Meu Cadastro</button>
                                    <button onClick={() => setClientAreaModal({ open: true, tab: 'pedidos' })} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase transition-colors">Meus Pedidos</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase transition-colors">Entrar na Minha Conta</button>
                                    <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase transition-colors">Criar Cadastro Rápido</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full bg-slate-50 border-t border-slate-200 px-4 md:px-10 xl:px-16 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold">
                    <p>© {new Date().getFullYear()} {loja.nomeLoja}. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-black text-[10px] text-emerald-700">PIX</span>
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-black text-[10px] text-blue-800">VISA</span>
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-black text-[10px] text-orange-600">MASTERCARD</span>
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded font-black text-[10px] text-slate-700">BOLETO</span>
                    </div>
                </div>
            </footer>

            {/* 12. BOTÃO FLUTUANTE WHATSAPP (PUXANDO TELEFONE DA ABA AJUSTES DO SITE) */}
            <a 
                href={getWppLink(`Olá! Estou no site da ${loja.nomeLoja} e gostaria de atendimento.`)} 
                target="_blank" 
                rel="noreferrer" 
                className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe57] text-white px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 transition-all border-2 border-white" 
                title={telefoneAjustes ? `WhatsApp: ${telefoneAjustes}` : "Conversar no WhatsApp"}
            >
                <svg className="w-7 h-7 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.126.556 4.124 1.535 5.862l-1.535 5.638 5.792-1.518c1.693.904 3.621 1.418 5.672 1.418 6.627 0 12-5.373 12-12s-5.373-12-12-12z"/>
                </svg>
                <div className="leading-tight hidden sm:block">
                    <span className="block text-[10px] font-bold uppercase opacity-90">Falar no WhatsApp</span>
                    <span className="font-black text-xs">{telefoneAjustes || 'Atendimento Online'}</span>
                </div>
            </a>

            {/* 13. MODAL DE LOGIN E CADASTRO INTEGRADO À ABA CLIENTES */}
            {authModal.open && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[var(--cor-primaria)] p-6 text-center text-white relative">
                            <button onClick={() => setAuthModal({ ...authModal, open: false })} className="absolute top-4 right-4 text-white/70 hover:text-white">✕</button>
                            <h3 className="font-black text-lg uppercase tracking-wider">{authModal.mode === 'login' ? 'Entrar na Minha Conta' : 'Criar Conta de Cliente'}</h3>
                            <p className="text-xs opacity-80 mt-1">{authModal.mode === 'login' ? 'Acesse seu cadastro e acompanhe seus pedidos' : 'Seus dados ficam salvos para compras rápidas'}</p>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-black uppercase">
                            <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className={`py-3.5 ${authModal.mode === 'login' ? 'bg-white text-[var(--cor-primaria)] border-b-2 border-[var(--cor-primaria)]' : 'text-slate-400'}`}>Já sou Cliente</button>
                            <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className={`py-3.5 ${authModal.mode === 'register' ? 'bg-white text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'}`}>Quero me Cadastrar</button>
                        </div>

                        {authModal.mode === 'register' ? (
                            <form onSubmit={handleRegistrarCliente} className="p-6 space-y-3.5">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome Completo *</label>
                                    <input type="text" required value={regNome} onChange={e => setRegNome(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500" placeholder="Seu nome completo" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">WhatsApp / Telefone *</label>
                                    <input type="text" required value={regWhatsapp} onChange={e => setRegWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500" placeholder="(11) 99999-9999" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Endereço de Entrega *</label>
                                    <input type="text" required value={regEndereco} onChange={e => setRegEndereco(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500" placeholder="Rua, Número, Bairro, Cidade" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">E-mail *</label>
                                    <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500" placeholder="seu@email.com" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Crie uma Senha *</label>
                                    <input type="password" required value={regSenha} onChange={e => setRegSenha(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500" placeholder="••••••••" />
                                </div>
                                <button type="submit" disabled={processandoAuth} className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase text-xs shadow-md transition-colors">
                                    {processandoAuth ? 'Salvando Cadastro...' : 'Finalizar Cadastro'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleLoginCliente} className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">E-mail ou WhatsApp Cadastrado *</label>
                                    <input type="text" required value={loginAcesso} onChange={e => setLoginAcesso(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--cor-primaria)]" placeholder="Digite seu e-mail ou telefone" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Senha *</label>
                                    <input type="password" required value={loginSenha} onChange={e => setLoginSenha(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--cor-primaria)]" placeholder="••••••••" />
                                </div>
                                <button type="submit" disabled={processandoAuth} className="w-full py-3.5 bg-[var(--cor-primaria)] hover:opacity-95 text-white rounded-xl font-black uppercase text-xs shadow-md transition-opacity">
                                    {processandoAuth ? 'Verificando...' : 'Entrar na Minha Conta'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* 14. MODAL EXCLUSIVO DO CLIENTE LOGADO (MEU CADASTRO E MEUS PEDIDOS) */}
            {clientAreaModal.open && clienteLogado && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg">
                                    {(clienteLogado.nome || clienteLogado.name || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-base uppercase">{clienteLogado.nome || clienteLogado.name}</h3>
                                    <span className="text-xs text-emerald-400 font-bold">Área Exclusiva do Cliente</span>
                                </div>
                            </div>
                            <button onClick={() => setClientAreaModal({ ...clientAreaModal, open: false })} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-black uppercase">
                            <button onClick={() => setClientAreaModal({ open: true, tab: 'cadastro' })} className={`py-3.5 ${clientAreaModal.tab === 'cadastro' ? 'bg-white text-[var(--cor-primaria)] border-b-2 border-[var(--cor-primaria)]' : 'text-slate-400'}`}>
                                Meu Cadastro
                            </button>
                            <button onClick={() => setClientAreaModal({ open: true, tab: 'pedidos' })} className={`py-3.5 ${clientAreaModal.tab === 'pedidos' ? 'bg-white text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'}`}>
                                Meus Pedidos ({meusPedidos.length})
                            </button>
                        </div>

                        {clientAreaModal.tab === 'cadastro' ? (
                            <form onSubmit={handleAtualizarMeuCadastro} className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome Completo</label>
                                    <input type="text" required value={regNome} onChange={e => setRegNome(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">WhatsApp / Telefone</label>
                                    <input type="text" required value={regWhatsapp} onChange={e => setRegWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Endereço Principal de Entrega</label>
                                    <input type="text" required value={regEndereco} onChange={e => setRegEndereco(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">E-mail</label>
                                    <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                                </div>
                                <div className="flex justify-between items-center pt-2 gap-3">
                                    <button type="button" onClick={handleLogout} className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase hover:bg-red-100">
                                        Sair da Conta
                                    </button>
                                    <button type="submit" disabled={processandoAuth} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md">
                                        {processandoAuth ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
                                {meusPedidos.length === 0 ? (
                                    <div className="text-center py-10 space-y-2">
                                        <Icon name="package" size={40} className="mx-auto text-slate-300" />
                                        <p className="font-black text-slate-600 text-sm uppercase">Você ainda não realizou pedidos nesta sessão</p>
                                        <p className="text-xs text-slate-400">Adicione produtos ao carrinho e finalize pelo WhatsApp para acompanhar por aqui.</p>
                                    </div>
                                ) : (
                                    meusPedidos.map(ped => (
                                        <div key={ped.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center bg-slate-50">
                                            <div>
                                                <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Pedido #{ped.id}</span>
                                                <p className="font-bold text-xs text-slate-800 mt-1">{ped.itens}</p>
                                                <span className="text-[11px] text-slate-400">{ped.data} • {ped.status}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-sm text-emerald-600 block">{formatMoney(ped.total)}</span>
                                                <a href={getWppLink(`Olá! Gostaria de saber o status do meu Pedido #${ped.id}.`)} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline">
                                                    Consultar no WhatsApp
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 15. MODAL DO CARRINHO */}
            {showCartModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end">
                    <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                            <h3 className="font-black text-lg uppercase text-slate-800">Meu Carrinho ({qtdTotalCarrinho})</h3>
                            <button onClick={() => setShowCartModal(false)} className="text-slate-400 hover:text-black text-xl">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-4 space-y-3">
                            {carrinho.length === 0 ? (
                                <p className="text-center text-slate-400 font-bold text-sm py-12">Seu carrinho está vazio.</p>
                            ) : (
                                carrinho.map(item => (
                                    <div key={item.id} className="flex items-center justify-between border border-slate-200 p-3 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            {item.imageUrl && <img src={item.imageUrl} className="w-12 h-12 object-contain rounded border" alt={item.name} />}
                                            <div>
                                                <p className="font-bold text-xs text-slate-800">{item.name}</p>
                                                <p className="text-xs font-black text-rose-600">{item.qtd}x {formatMoney(item.sellingPrice)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setCarrinho(prev => prev.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 text-xs font-bold">Remover</button>
                                    </div>
                                ))
                            )}
                        </div>
                        {carrinho.length > 0 && (
                            <div className="border-t border-slate-200 pt-4 space-y-3">
                                <div className="flex justify-between items-center font-black text-base">
                                    <span>Total:</span>
                                    <span className="text-emerald-600">{formatMoney(totalCarrinho)}</span>
                                </div>
                                <button onClick={() => {
                                    const resumo = carrinho.map(i => `${i.qtd}x ${i.name}`).join(', ');
                                    registrarPedidoDoCliente(resumo, totalCarrinho);
                                    const dadosCli = clienteLogado ? `\nCliente: *${clienteLogado.nome || clienteLogado.name}* - Endereço: ${clienteLogado.endereco || clienteLogado.address}` : '';
                                    window.open(getWppLink(`Olá! Quero finalizar meu pedido na ${loja.nomeLoja}: ${resumo}. Total: ${formatMoney(totalCarrinho)}${dadosCli}`), '_blank');
                                    setCarrinho([]);
                                    setShowCartModal(false);
                                }} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs shadow-md">
                                    Finalizar Pedido no WhatsApp
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}