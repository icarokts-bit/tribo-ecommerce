import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { db } from '../../firebase';

const IMAGEM_PADRAO_BANNER_SECUNDARIO = "https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=600&q=80";

const ETAPAS_PEDIDO = [
    { id: 'novo', label: 'Recebido', icone: '✓' },
    { id: 'producao', label: 'Em Produção', icone: '⚙️' },
    { id: 'embalagem', label: 'Embalagem', icone: '📦' },
    { id: 'enviado', label: 'Enviado', icone: '🚚' },
    { id: 'concluido', label: 'Entregue', icone: '🎉' }
];

export default function TemplateVibrante({ loja, produtos, categorias, donoUid }) {
    const uidLoja = donoUid || loja?.donoUid || loja?.uid;

    // Estados de Modais e Menus
    const [authModal, setAuthModal] = useState({ open: false, mode: 'login' });
    const [clientAreaModal, setClientAreaModal] = useState({ open: false, tab: 'pedidos' });
    const [showCartModal, setShowCartModal] = useState(false);
    const [deptOpen, setDeptOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Estado do Cliente Logado + Pedidos Sincronizados com Firebase
    const [clienteLogado, setClienteLogado] = useState(null);
    const [mensagemTopo, setMensagemTopo] = useState('');
    const [meusPedidos, setMeusPedidos] = useState([]);
    const [carregandoPedidos, setCarregandoPedidos] = useState(false);

    // Estados de Busca e Filtro
    const [busca, setBusca] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

    // Estados de Interação e Checkout do Carrinho
    const [favoritos, setFavoritos] = useState([]);
    const [carrinho, setCarrinho] = useState([]);
    const [copiadoId, setCopiadoId] = useState(null);
    const [enviandoPedido, setEnviandoPedido] = useState(false);
    const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
    const [buscandoCep, setBuscandoCep] = useState(false);

    // Campos de Endereço Completo + Frete no Checkout
    const [checkoutNome, setCheckoutNome] = useState('');
    const [checkoutTelefone, setCheckoutTelefone] = useState('');
    const [checkoutEmail, setCheckoutEmail] = useState('');
    const [checkoutCep, setCheckoutCep] = useState('');
    const [checkoutRua, setCheckoutRua] = useState('');
    const [checkoutNumero, setCheckoutNumero] = useState('');
    const [checkoutComplemento, setCheckoutComplemento] = useState('');
    const [checkoutBairro, setCheckoutBairro] = useState('');
    const [checkoutCidade, setCheckoutCidade] = useState('');
    const [checkoutUf, setCheckoutUf] = useState('');
    const [checkoutModalidadeFrete, setCheckoutModalidadeFrete] = useState('PAC');
    const [checkoutValorFrete, setCheckoutValorFrete] = useState(0);
    const [opcoesFreteCalculadas, setOpcoesFreteCalculadas] = useState([]);
    const [checkoutPagamento, setCheckoutPagamento] = useState('PIX');
    const [checkoutObs, setCheckoutObs] = useState('');

    // Estados dos Carrosséis
    const [catSlidePage, setCatSlidePage] = useState(0);
    const [slideDestaque, setSlideDestaque] = useState(0);
    const [slidePromo, setSlidePromo] = useState(0);

    // Campos de Cadastro / Login / Edição de Perfil
    const [regNome, setRegNome] = useState('');
    const [regWhatsapp, setRegWhatsapp] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regCep, setRegCep] = useState('');
    const [regRua, setRegRua] = useState('');
    const [regNumero, setRegNumero] = useState('');
    const [regComplemento, setRegComplemento] = useState('');
    const [regBairro, setRegBairro] = useState('');
    const [regCidade, setRegCidade] = useState('');
    const [regUf, setRegUf] = useState('');
    const [regSenha, setRegSenha] = useState('');
    const [loginAcesso, setLoginAcesso] = useState('');
    const [loginSenha, setLoginSenha] = useState('');
    const [processandoAuth, setProcessandoAuth] = useState(false);

    // =====================================================
    // PREPARAÇÃO DO CARROSSEL MOSAICO DE CATEGORIAS (SEM DUPLICAR)
    // =====================================================
    const ITEMS_POR_PAGINA_MOSAICO = 8;
    const totalPaginasMosaico = Math.max(1, Math.ceil(categorias.length / ITEMS_POR_PAGINA_MOSAICO));

    useEffect(() => {
        if (catSlidePage >= totalPaginasMosaico) {
            setCatSlidePage(0);
        }
    }, [categorias.length, totalPaginasMosaico, catSlidePage]);

    const inicioSlice = catSlidePage * ITEMS_POR_PAGINA_MOSAICO;
    const categoriasMosaicoAtual = categorias.slice(inicioSlice, inicioSlice + ITEMS_POR_PAGINA_MOSAICO);

    const proximoSlideCategorias = () => {
        if (totalPaginasMosaico <= 1) return;
        setCatSlidePage(prev => (prev + 1) % totalPaginasMosaico);
    };

    const anteriorSlideCategorias = () => {
        if (totalPaginasMosaico <= 1) return;
        setCatSlidePage(prev => (prev - 1 + totalPaginasMosaico) % totalPaginasMosaico);
    };

    const contarProdutosCategoria = (nomeCat) => {
        if (!nomeCat) return 0;
        return produtos.filter(p => (p.category || '').toLowerCase() === nomeCat.toLowerCase()).length;
    };

    // =====================================================
    // FILTROS DOS CARROSSÉIS DE DESTAQUES E PROMOÇÕES
    // =====================================================
    const produtosDestaque = produtos.filter(p => p.destaque === true);
    const listaCarrosselDestaque = produtosDestaque.length > 0 ? produtosDestaque : produtos.slice(0, 5);
    const listaCarrosselPromo = produtos.filter(p => p.isPromo === true);

    const fotoBannerSecundario = loja?.bannerSecundarioUrl || loja?.totemUrl || IMAGEM_PADRAO_BANNER_SECUNDARIO;
    const tagBannerSecundario = loja?.bannerSecundarioTag || 'PROJETOS ESPECIAIS';
    const tituloBannerSecundario = loja?.bannerSecundarioTitulo || 'Personalize com a sua Marca';
    const textoBannerSecundario = loja?.bannerSecundarioTexto || 'Displays NFC, chaveiros corporativos e peças exclusivas.';
    const botaoBannerSecundario = loja?.bannerSecundarioBotao || 'Solicitar Cotação';

    const preencherEstadosComCliente = (cli) => {
        if (!cli) return;
        setRegNome(cli.nome || cli.name || '');
        setRegWhatsapp(cli.telefone || cli.phone || '');
        setRegEmail(cli.email || '');
        setRegCep(cli.cep || '');
        setRegRua(cli.rua || cli.endereco || '');
        setRegNumero(cli.numero || '');
        setRegComplemento(cli.complemento || '');
        setRegBairro(cli.bairro || '');
        setRegCidade(cli.cidade || '');
        setRegUf(cli.uf || '');

        setCheckoutNome(cli.nome || cli.name || '');
        setCheckoutTelefone(cli.telefone || cli.phone || '');
        setCheckoutEmail(cli.email || '');
        if (cli.cep) setCheckoutCep(cli.cep);
        if (cli.rua) setCheckoutRua(cli.rua);
        if (cli.numero) setCheckoutNumero(cli.numero);
        if (cli.complemento) setCheckoutComplemento(cli.complemento);
        if (cli.bairro) setCheckoutBairro(cli.bairro);
        if (cli.cidade) setCheckoutCidade(cli.cidade);
        if (cli.uf) setCheckoutUf(cli.uf);
    };

    useEffect(() => {
        const salvo = localStorage.getItem(`cliente_${uidLoja}`);
        if (salvo) {
            try {
                const parsed = JSON.parse(salvo);
                setClienteLogado(parsed);
                preencherEstadosComCliente(parsed);
            } catch (e) {}
        }
    }, [uidLoja]);

    // Escuta em tempo real dos pedidos do cliente no Firebase
    useEffect(() => {
        if (!uidLoja || !clienteLogado) {
            setMeusPedidos([]);
            return;
        }

        setCarregandoPedidos(true);
        const emailCli = String(clienteLogado.email || '').toLowerCase().trim();
        const foneCli = String(clienteLogado.telefone || clienteLogado.phone || clienteLogado.whatsapp || '').replace(/\D/g, '');
        const idCli = clienteLogado.id;

        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${uidLoja}/orders`)
            .onSnapshot(snap => {
                const todos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const doCliente = todos.filter(ped => {
                    const pedClientId = ped.clientId || '';
                    const pedEmail = String(ped.customerEmail || ped.email || '').toLowerCase().trim();
                    const pedFone = String(ped.customerPhone || ped.telefone || ped.phone || '').replace(/\D/g, '');

                    if (idCli && pedClientId === idCli) return true;
                    if (emailCli && pedEmail && pedEmail === emailCli) return true;
                    if (foneCli && foneCli.length >= 8 && pedFone && pedFone.includes(foneCli.slice(-8))) return true;
                    return false;
                }).sort((a, b) => {
                    const tA = a.timestamp || new Date(a.createdAt || a.dataPedido || 0).getTime();
                    const tB = b.timestamp || new Date(b.createdAt || b.dataPedido || 0).getTime();
                    return tB - tA;
                });

                setMeusPedidos(doCliente);
                setCarregandoPedidos(false);
            }, () => {
                setCarregandoPedidos(false);
            });

        return () => unsub();
    }, [uidLoja, clienteLogado]);

    // Busca automática de CEP (ViaCEP) + cálculo de frete
    const consultarCepViaCep = async (cepValor, destino = 'checkout') => {
        const cepLimpo = String(cepValor).replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        setBuscandoCep(true);
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await resp.json();
            if (!data.erro) {
                if (destino === 'checkout') {
                    setCheckoutRua(data.logradouro || '');
                    setCheckoutBairro(data.bairro || '');
                    setCheckoutCidade(data.localidade || '');
                    setCheckoutUf(data.uf || '');
                    calcularOpcoesDeFrete(cepLimpo, data.uf);
                } else {
                    setRegRua(data.logradouro || '');
                    setRegBairro(data.bairro || '');
                    setRegCidade(data.localidade || '');
                    setRegUf(data.uf || '');
                }
            }
        } catch (err) {
            console.error("Erro ao buscar CEP:", err);
        }
        setBuscandoCep(false);
    };

    const calcularOpcoesDeFrete = (cepLimpo, ufDestino = 'SP') => {
        const pesoTotal = carrinho.reduce((acc, item) => acc + (Number(item.weight || 0.2) * item.qtd), 0);
        const mesmoEstado = ufDestino.toUpperCase() === 'SP';

        const basePac = mesmoEstado ? 16.90 : 26.90;
        const baseSedex = mesmoEstado ? 24.90 : 42.90;
        const baseTransp = mesmoEstado ? 21.50 : 34.90;
        const adicionalPeso = Math.max(0, Math.ceil(pesoTotal - 1)) * 4.50;

        const opcoes = [
            { id: 'PAC', nome: 'Correios PAC', prazo: mesmoEstado ? '4 a 6 dias úteis' : '7 a 12 dias úteis', valor: Number((basePac + adicionalPeso).toFixed(2)) },
            { id: 'SEDEX', nome: 'Correios SEDEX', prazo: mesmoEstado ? '1 a 3 dias úteis' : '3 a 5 dias úteis', valor: Number((baseSedex + adicionalPeso).toFixed(2)) },
            { id: 'Jadlog', nome: 'Transportadora Jadlog (.Package)', prazo: mesmoEstado ? '2 a 4 dias úteis' : '5 a 8 dias úteis', valor: Number((baseTransp + adicionalPeso).toFixed(2)) },
            { id: 'Retirada', nome: 'Retirar na Loja / Combinar', prazo: '1 a 2 dias úteis', valor: 0 }
        ];

        setOpcoesFreteCalculadas(opcoes);
        const selecionada = opcoes.find(o => o.id === checkoutModalidadeFrete) || opcoes[0];
        setCheckoutModalidadeFrete(selecionada.id);
        setCheckoutValorFrete(selecionada.valor);
    };

    useEffect(() => {
        const cepLimpo = String(checkoutCep).replace(/\D/g, '');
        if (cepLimpo.length === 8 && carrinho.length > 0) {
            calcularOpcoesDeFrete(cepLimpo, checkoutUf || 'SP');
        } else if (carrinho.length === 0) {
            setOpcoesFreteCalculadas([]);
            setCheckoutValorFrete(0);
        }
    }, [carrinho]);

    useEffect(() => {
        if (listaCarrosselDestaque.length <= 1) return;
        const timer = setInterval(() => {
            setSlideDestaque(prev => (prev + 1) % listaCarrosselDestaque.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [listaCarrosselDestaque.length]);

    useEffect(() => {
        if (listaCarrosselPromo.length <= 1) return;
        const timer = setInterval(() => {
            setSlidePromo(prev => (prev + 1) % listaCarrosselPromo.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [listaCarrosselPromo.length]);

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
        setTimeout(() => setMensagemTopo(''), 5000);
    };

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const montarEnderecoFormatado = (rua, numero, compl, bairro, cidade, uf, cep) => {
        const partes = [
            rua ? `${rua}${numero ? `, ${numero}` : ''}` : '',
            compl ? `(${compl})` : '',
            bairro || '',
            cidade ? `${cidade}${uf ? ` - ${uf}` : ''}` : '',
            cep ? `CEP: ${cep}` : ''
        ].filter(Boolean);
        return partes.join(' • ');
    };

    // Cadastro e Login de Clientes
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
            const endCompleto = montarEnderecoFormatado(regRua, regNumero, regComplemento, regBairro, regCidade, regUf, regCep);

            const novoCliente = {
                id: clientId,
                nome: regNome.trim(),
                name: regNome.trim(),
                telefone: regWhatsapp.trim(),
                phone: regWhatsapp.trim(),
                whatsapp: regWhatsapp.trim(),
                contato: regWhatsapp.trim(),
                email: regEmail.trim().toLowerCase(),
                cep: regCep.trim(),
                rua: regRua.trim(),
                numero: regNumero.trim(),
                complemento: regComplemento.trim(),
                bairro: regBairro.trim(),
                cidade: regCidade.trim(),
                uf: regUf.trim(),
                endereco: endCompleto,
                address: endCompleto,
                enderecoPrincipal: endCompleto,
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
            preencherEstadosComCliente(novoCliente);
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
                preencherEstadosComCliente(encontrado);
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
            const endCompleto = montarEnderecoFormatado(regRua, regNumero, regComplemento, regBairro, regCidade, regUf, regCep);
            const atualizado = {
                ...clienteLogado,
                nome: regNome.trim(),
                name: regNome.trim(),
                telefone: regWhatsapp.trim(),
                phone: regWhatsapp.trim(),
                whatsapp: regWhatsapp.trim(),
                email: regEmail.trim().toLowerCase(),
                cep: regCep.trim(),
                rua: regRua.trim(),
                numero: regNumero.trim(),
                complemento: regComplemento.trim(),
                bairro: regBairro.trim(),
                cidade: regCidade.trim(),
                uf: regUf.trim(),
                endereco: endCompleto,
                address: endCompleto,
                enderecoPrincipal: endCompleto,
                updatedAt: new Date().toISOString()
            };

            await salvarClienteNasColecoes(clienteLogado.id, atualizado);
            setClienteLogado(atualizado);
            preencherEstadosComCliente(atualizado);
            localStorage.setItem(`cliente_${uidLoja}`, JSON.stringify(atualizado));
            exibirNotificacao("Seus dados e endereço foram atualizados com sucesso!");
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

    // Carrinho e envio com sequência (0001, 0002...)
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

    const adicionarAoCarrinho = (produto, abrirModalCarrinho = false) => {
        setPedidoConfirmado(null);
        setCarrinho(prev => {
            const existe = prev.find(item => item.id === produto.id);
            if (existe) return prev.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item);
            return [...prev, { ...produto, qtd: 1 }];
        });
        if (abrirModalCarrinho) {
            setShowCartModal(true);
        } else {
            exibirNotificacao(`"${produto.name}" foi adicionado ao seu carrinho!`);
        }
    };

    const alterarQtdCarrinho = (id, delta) => {
        setCarrinho(prev =>
            prev
                .map(item => item.id === id ? { ...item, qtd: item.qtd + delta } : item)
                .filter(item => item.qtd > 0)
        );
    };

    const handleComprarDireto = (produto) => {
        adicionarAoCarrinho(produto, true);
    };

    const subtotalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.sellingPrice || 0) * item.qtd), 0);
    const totalComFrete = subtotalCarrinho + Number(checkoutValorFrete || 0);
    const qtdTotalCarrinho = carrinho.reduce((acc, item) => acc + item.qtd, 0);

    const handleFinalizarPedidoNoSistema = async (e) => {
        e.preventDefault();
        if (carrinho.length === 0) return;
        if (!uidLoja) return alert("Erro: Loja não identificada.");

        const nomeFinal = (checkoutNome || clienteLogado?.nome || clienteLogado?.name || '').trim();
        const foneFinal = (checkoutTelefone || clienteLogado?.telefone || clienteLogado?.phone || '').trim();
        const emailFinal = (checkoutEmail || clienteLogado?.email || '').trim().toLowerCase();
        const cepFinal = checkoutCep.trim();
        const enderecoFormatado = montarEnderecoFormatado(
            checkoutRua, checkoutNumero, checkoutComplemento, checkoutBairro, checkoutCidade, checkoutUf, cepFinal
        );

        if (!nomeFinal || !foneFinal || !cepFinal || !checkoutRua || !checkoutNumero) {
            return alert("Por favor, preencha Nome, WhatsApp, CEP, Rua e Número para o envio do produto.");
        }

        setEnviandoPedido(true);
        try {
            const orderId = crypto.randomUUID();
            const agora = new Date().toISOString();
            const idCli = clienteLogado?.id || foneFinal.replace(/\D/g, '') || crypto.randomUUID();

            const counterRef = db.doc(`artifacts/tribo-burger-financeiro/users/${uidLoja}/settings/order_counter`);
            let codigoCurto = '0001';
            try {
                const proximoNumero = await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(counterRef);
                    const atual = doc.exists ? Number(doc.data().lastOrderNumber || 0) : 0;
                    const novo = atual + 1;
                    transaction.set(counterRef, { lastOrderNumber: novo, updatedAt: agora }, { merge: true });
                    return novo;
                });
                codigoCurto = String(proximoNumero).padStart(4, '0');
            } catch (errCounter) {
                const snapCounter = await counterRef.get();
                const prox = (snapCounter.exists ? Number(snapCounter.data().lastOrderNumber || 0) : 0) + 1;
                await counterRef.set({ lastOrderNumber: prox, updatedAt: agora }, { merge: true });
                codigoCurto = String(prox).padStart(4, '0');
            }

            const itensFormatados = carrinho.map(item => ({
                id: item.id,
                productId: item.id,
                name: item.name,
                nome: item.name,
                sku: item.sku || '',
                price: Number(item.sellingPrice || item.price || 0),
                preco: Number(item.sellingPrice || item.price || 0),
                unitPrice: Number(item.sellingPrice || item.price || 0),
                quantity: Number(item.qtd),
                quantidade: Number(item.qtd),
                qtd: Number(item.qtd),
                total: Number(item.sellingPrice || 0) * Number(item.qtd),
                imageUrl: item.imageUrl || ''
            }));

            const resumoTexto = carrinho.map(i => `${i.qtd}x ${i.name}`).join(', ');

            const payloadPedido = {
                id: orderId,
                tipoRegistro: 'pedido',
                isQuote: false,
                orderNumber: codigoCurto,
                numeroPedido: codigoCurto,
                codigo: codigoCurto,
                clientId: idCli,
                customerName: nomeFinal,
                clienteNome: nomeFinal,
                nomeCliente: nomeFinal,
                nome: nomeFinal,
                customerPhone: foneFinal,
                clienteTelefone: foneFinal,
                telefone: foneFinal,
                phone: foneFinal,
                whatsapp: foneFinal,
                customerEmail: emailFinal,
                email: emailFinal,
                cep: cepFinal,
                rua: checkoutRua.trim(),
                numero: checkoutNumero.trim(),
                complemento: checkoutComplemento.trim(),
                bairro: checkoutBairro.trim(),
                cidade: checkoutCidade.trim(),
                uf: checkoutUf.trim(),
                address: enderecoFormatado,
                endereco: enderecoFormatado,
                deliveryAddress: enderecoFormatado,
                shippingMethod: checkoutModalidadeFrete,
                modalidadeFrete: checkoutModalidadeFrete,
                deliveryFee: Number(checkoutValorFrete || 0),
                taxaEntrega: Number(checkoutValorFrete || 0),
                valorFrete: Number(checkoutValorFrete || 0),
                trackingCode: '',
                codigoRastreio: '',
                items: itensFormatados,
                itens: itensFormatados,
                products: itensFormatados,
                resumoItens: resumoTexto,
                subtotal: subtotalCarrinho,
                total: totalComFrete,
                valorTotal: totalComFrete,
                totalAmount: totalComFrete,
                paymentMethod: checkoutPagamento,
                formaPagamento: checkoutPagamento,
                pagamento: checkoutPagamento,
                notes: checkoutObs.trim(),
                observacao: checkoutObs.trim(),
                status: 'novo',
                orderStatus: 'pending',
                etapa: 'novo',
                origem: 'E-commerce',
                source: 'ecommerce',
                createdAt: agora,
                updatedAt: agora,
                dataPedido: agora,
                timestamp: Date.now()
            };

            const colecoesPedidos = ['orders', 'pedidos', 'delivery_orders', 'ecommerce_orders'];
            await Promise.all(
                colecoesPedidos.map(col =>
                    db.collection(`artifacts/tribo-burger-financeiro/users/${uidLoja}/${col}`).doc(orderId).set(payloadPedido, { merge: true })
                )
            );

            const novoTotalGasto = Number(clienteLogado?.totalGasto || clienteLogado?.totalSpent || 0) + Number(totalComFrete);
            const novaQtdPedidos = Number(clienteLogado?.pedidos || clienteLogado?.orderCount || 0) + 1;

            const clienteAtualizado = {
                ...(clienteLogado || {}),
                id: idCli,
                nome: nomeFinal,
                name: nomeFinal,
                telefone: foneFinal,
                phone: foneFinal,
                whatsapp: foneFinal,
                email: emailFinal,
                cep: cepFinal,
                rua: checkoutRua.trim(),
                numero: checkoutNumero.trim(),
                complemento: checkoutComplemento.trim(),
                bairro: checkoutBairro.trim(),
                cidade: checkoutCidade.trim(),
                uf: checkoutUf.trim(),
                endereco: enderecoFormatado,
                address: enderecoFormatado,
                enderecoPrincipal: enderecoFormatado,
                totalGasto: novoTotalGasto,
                totalSpent: novoTotalGasto,
                receitaGerada: novoTotalGasto,
                pedidos: novaQtdPedidos,
                orderCount: novaQtdPedidos,
                fidelidade: novaQtdPedidos,
                pontos: novaQtdPedidos,
                ultimoPedido: agora,
                updatedAt: agora,
                createdAt: clienteLogado?.createdAt || agora
            };

            await salvarClienteNasColecoes(idCli, clienteAtualizado);
            setClienteLogado(clienteAtualizado);
            localStorage.setItem(`cliente_${uidLoja}`, JSON.stringify(clienteAtualizado));

            setCarrinho([]);
            setCheckoutObs('');
            setPedidoConfirmado(payloadPedido);
            exibirNotificacao(`Pedido #${codigoCurto} realizado com sucesso!`);
        } catch (error) {
            console.error("Erro ao finalizar pedido:", error);
            alert("Ocorreu um erro ao enviar seu pedido. Tente novamente.");
        }
        setEnviandoPedido(false);
    };

    const obterIndiceEtapa = (ped) => {
        const st = String(ped.status || ped.etapa || ped.orderStatus || 'novo').toLowerCase().trim();
        if (['concluido', 'finalizado', 'entregue', 'delivered'].includes(st)) return 4;
        if (['enviado', 'retirada', 'shipped'].includes(st)) return 3;
        if (['embalagem', 'separacao', 'pronto', 'packing'].includes(st)) return 2;
        if (['producao', 'impressora', 'fabrico', 'printing'].includes(st)) return 1;
        return 0;
    };

    const produtosFiltrados = produtos.filter(p => {
        const matchNome = p.name?.toLowerCase().includes(busca.toLowerCase());
        const matchCat = categoriaFiltro === 'todas' || (categoriaFiltro === 'favoritos' ? favoritos.includes(p.id) : p.category?.toLowerCase() === categoriaFiltro.toLowerCase());
        return matchNome && matchCat;
    });

    const selecionarCategoriaMosaico = (nomeCat) => {
        setCategoriaFiltro(prev => prev.toLowerCase() === nomeCat.toLowerCase() ? 'todas' : nomeCat);
        const el = document.getElementById('vitrine');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    // Renderizador Reutilizável de Card do Mosaico com Efeitos Visuais Profissionais
    const renderCardMosaico = (cat, classesTamanho, tagPadrao = '', tamanhoTitulo = 'text-xl') => {
        if (!cat) return null;
        const ativo = categoriaFiltro.toLowerCase() === cat.name.toLowerCase();
        const tagExibida = cat.tag !== undefined ? cat.tag : tagPadrao;
        const qtdItens = contarProdutosCategoria(cat.name);

        return (
            <div
                key={cat.id}
                onClick={() => selecionarCategoriaMosaico(cat.name)}
                className={`${classesTamanho} group relative rounded-3xl overflow-hidden cursor-pointer select-none bg-slate-900 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_22px_45px_-12px_rgba(15,23,42,0.38)] border-2 ${
                    ativo ? 'border-orange-500 ring-4 ring-orange-500/25' : 'border-white shadow-md'
                }`}
            >
                {/* Imagem com Zoom Suave + Leve Rotação Cinematográfica no Hover */}
                {cat.imageUrl ? (
                    <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-slate-600">
                        <Icon name="box" size={56} />
                    </div>
                )}

                {/* Vinheta Escura Gradual + Iluminação no Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/25 to-black/10 group-hover:from-slate-950/80 transition-all duration-500" />

                {/* Feixe de Brilho Diagonal (Shine Effect) que atravessa o card no Hover */}
                <div className="absolute -inset-full top-0 block w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white/25 opacity-0 group-hover:opacity-100 group-hover:translate-x-[360%] transition-all duration-1000 ease-out pointer-events-none" />

                {/* Contador flutuante em Vidro Fosco ( canto superior direito ) */}
                <div className="absolute top-3.5 right-3.5 z-10 bg-black/40 backdrop-blur-md border border-white/20 text-white/90 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                    {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}
                </div>

                {/* Conteúdo Inferior com Animação de Subida */}
                <div className="absolute inset-x-0 bottom-0 p-5 z-10 flex items-end justify-between gap-3">
                    <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                        {tagExibida && (
                            <span className="inline-block bg-orange-500/95 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md mb-1.5 shadow-sm">
                                {tagExibida}
                            </span>
                        )}
                        <h3 className={`${tamanhoTitulo} font-black text-white tracking-tight leading-tight drop-shadow-md`}>
                            {cat.name}
                        </h3>
                    </div>

                    {/* Botão "Explorar ->" que desliza no hover */}
                    <div className="w-9 h-9 rounded-full bg-white/20 group-hover:bg-orange-500 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 shadow-lg">
                        <span className="text-sm font-black transform transition-transform group-hover:translate-x-0.5">→</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white min-h-screen w-full font-sans text-slate-800 flex flex-col">
            
            {/* NOTIFICAÇÃO FLUTUANTE */}
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
                    <span className="flex items-center gap-1.5">✓ Envio rápido com Rastreio (Correios PAC, SEDEX e Transportadora)</span>
                    <span className="hidden md:inline">✓ Peças personalizadas com acabamento premium direto da fábrica</span>
                    <span className="flex items-center gap-1.5">✓ Acompanhe seu pedido em tempo real pelo site</span>
                </div>
            </div>

            {/* 2. SUB-TOPBAR UTILITÁRIA */}
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
                            <button onClick={() => setClientAreaModal({ open: true, tab: 'pedidos' })} className="text-emerald-600 hover:underline flex items-center gap-1.5">
                                ● {clienteLogado.nome || clienteLogado.name} ({meusPedidos.length} pedido{meusPedidos.length === 1 ? '' : 's'})
                            </button>
                        ) : (
                            <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className="text-orange-600 hover:underline">
                                Criar Conta Grátis
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. HEADER PRINCIPAL */}
            <header className="w-full bg-white py-5 px-4 md:px-10 xl:px-16 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6">
                    
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

                    {/* BUSCA */}
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

                    {/* MENU CLIENTE + CARRINHO */}
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
                                        <span className="block text-[10px] font-black uppercase text-emerald-700">Olá, {(clienteLogado.nome || clienteLogado.name).split(' ')[0]}</span>
                                        <span className="font-black text-xs text-slate-800 flex items-center gap-1">
                                            Meus Pedidos ({meusPedidos.length}) <span>▼</span>
                                        </span>
                                    </div>
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50">
                                        <div className="px-4 py-2.5 border-b border-slate-100">
                                            <p className="font-black text-xs text-slate-800 truncate">{clienteLogado.nome || clienteLogado.name}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{clienteLogado.email || clienteLogado.telefone}</p>
                                        </div>
                                        <button 
                                            onClick={() => { setClientAreaModal({ open: true, tab: 'pedidos' }); setUserMenuOpen(false); }}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                        >
                                            <span className="flex items-center gap-2.5"><Icon name="package" size={16} className="text-orange-500" /> Meus Pedidos</span>
                                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px]">{meusPedidos.length}</span>
                                        </button>
                                        <button 
                                            onClick={() => { setClientAreaModal({ open: true, tab: 'cadastro' }); setUserMenuOpen(false); }}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 border-t border-slate-50"
                                        >
                                            <Icon name="user" size={16} className="text-[var(--cor-primaria)]" /> Meu Endereço e Cadastro
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

                        <button onClick={() => { setPedidoConfirmado(null); setShowCartModal(true); }} className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-colors">
                            <div className="relative">
                                <Icon name="shopping-cart" size={24} className="text-slate-800" />
                                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">{qtdTotalCarrinho}</span>
                            </div>
                            <div className="text-left leading-tight hidden sm:block">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Carrinho</span>
                                <span className="font-black text-sm text-slate-900">{formatMoney(subtotalCarrinho)}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* 4. BARRA DE NAVEGAÇÃO HORIZONTAL */}
            <nav className="w-full bg-white border-b border-slate-200 px-4 md:px-10 xl:px-16 shadow-xs">
                <div className="w-full flex items-center justify-between py-4 gap-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-7 text-sm md:text-base font-extrabold text-slate-700 whitespace-nowrap">
                        <button 
                            onClick={() => { setCategoriaFiltro('todas'); setBusca(''); }} 
                            className={`flex items-center gap-2 pr-6 border-r border-slate-200 transition-colors ${categoriaFiltro === 'todas' ? 'text-orange-600 font-black' : 'text-slate-700 hover:text-[var(--cor-primaria)]'}`}
                        >
                            <Icon name="grid" size={18} /> Todos os Departamentos ({produtos.length})
                        </button>
                        {categorias.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setCategoriaFiltro(c.name)} 
                                className={`transition-colors pb-1 border-b-2 ${categoriaFiltro.toLowerCase() === c.name.toLowerCase() ? 'border-orange-500 text-orange-600 font-black' : 'border-transparent hover:text-[var(--cor-primaria)]'}`}
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
                                    <Icon name="user" size={18} /> Meu Endereço
                                </button>
                                <span className="text-slate-300">|</span>
                            </>
                        )}
                        <button 
                            onClick={() => clienteLogado ? setClientAreaModal({ open: true, tab: 'pedidos' }) : setAuthModal({ open: true, mode: 'login' })} 
                            className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                        >
                            <Icon name="package" size={18} className="text-orange-500" /> 
                            {clienteLogado ? `Meus Pedidos (${meusPedidos.length})` : 'Rastrear / Meus Pedidos'}
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

            {/* CONTEÚDO PRINCIPAL */}
            <main className="w-full px-4 md:px-10 xl:px-16 py-8 space-y-12 flex-1">
                
                {/* ========================================================================= */}
                {/* 5. MOSAICO ASSIMÉTRICO DINÂMICO (BENTO GRID) COM EFEITOS DE HOVER         */}
                {/* ========================================================================= */}
                {categorias.length > 0 && (
                    <section className="relative py-2">
                        {totalPaginasMosaico > 1 && (
                            <>
                                <button 
                                    type="button"
                                    onClick={anteriorSlideCategorias}
                                    className="flex absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-16 items-center justify-center text-slate-600 hover:text-slate-950 bg-white/95 hover:bg-white rounded-2xl shadow-xl border border-slate-200 transition-all cursor-pointer hover:scale-105"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                <button 
                                    type="button"
                                    onClick={proximoSlideCategorias}
                                    className="flex absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-16 items-center justify-center text-slate-600 hover:text-slate-950 bg-white/95 hover:bg-white rounded-2xl shadow-xl border border-slate-200 transition-all cursor-pointer hover:scale-105"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        <div className="space-y-5">
                            {/* BLOCO SUPERIOR ASSIMÉTRICO: 3 Colunas (Vertical) + 3 Colunas (2 Empilhados) + 6 Colunas (Panorâmico) */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                                
                                {/* Slot 0: Vertical Alto */}
                                {categoriasMosaicoAtual[0] && renderCardMosaico(
                                    categoriasMosaicoAtual[0],
                                    'md:col-span-3 min-h-[340px] md:min-h-[370px]',
                                    'DEPARTAMENTO',
                                    'text-xl md:text-2xl'
                                )}

                                {/* Slots 1 e 2: Dupla Empilhada Assimétrica */}
                                {(categoriasMosaicoAtual[1] || categoriasMosaicoAtual[2]) && (
                                    <div className="md:col-span-3 flex flex-col gap-5 justify-between">
                                        {categoriasMosaicoAtual[1] && renderCardMosaico(
                                            categoriasMosaicoAtual[1],
                                            'flex-1 min-h-[172px]',
                                            '',
                                            'text-lg md:text-xl'
                                        )}
                                        {categoriasMosaicoAtual[2] && renderCardMosaico(
                                            categoriasMosaicoAtual[2],
                                            'flex-1 min-h-[172px]',
                                            '',
                                            'text-lg md:text-xl'
                                        )}
                                    </div>
                                )}

                                {/* Slot 3: vitrine Panorâmica Principal */}
                                {categoriasMosaicoAtual[3] && renderCardMosaico(
                                    categoriasMosaicoAtual[3],
                                    'md:col-span-6 min-h-[340px] md:min-h-[370px]',
                                    'DESTAQUE',
                                    'text-2xl md:text-3xl'
                                )}
                            </div>

                            {/* BLOCO INFERIOR DINÂMICO: Larguras Assimétricas (4 cols + 3 cols + 3 cols + 2 cols) */}
                            {categoriasMosaicoAtual.length > 4 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
                                    {categoriasMosaicoAtual.slice(4, 8).map((cat, index) => {
                                        const spans = ['lg:col-span-4', 'lg:col-span-3', 'lg:col-span-3', 'lg:col-span-2'];
                                        return renderCardMosaico(
                                            cat,
                                            `${spans[index] || 'lg:col-span-3'} h-48`,
                                            '',
                                            'text-lg md:text-xl'
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3 mt-6">
                            {totalPaginasMosaico > 1 && (
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPaginasMosaico }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCatSlidePage(i)}
                                            className={`h-2 rounded-full transition-all cursor-pointer ${
                                                catSlidePage === i ? 'w-8 bg-orange-500' : 'w-4 bg-slate-200 hover:bg-slate-400'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                            {categoriaFiltro !== 'todas' && (
                                <button onClick={() => setCategoriaFiltro('todas')} className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-black uppercase hover:bg-orange-200 transition-colors">
                                    ✕ Limpar Filtro de Categoria ({categoriaFiltro})
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* 6. HERO BANNER PRINCIPAL + BANNER PROMOCIONAL LATERAL */}
                {categoriaFiltro === 'todas' && !busca && (
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        <div className="lg:col-span-8 rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-[var(--cor-primaria)] text-white relative min-h-[380px] md:min-h-[440px] flex items-center shadow-md">
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

                        <div className="lg:col-span-4 rounded-2xl overflow-hidden bg-[#eaeff6] border border-slate-200 p-6 flex flex-col gap-3 relative min-h-[380px] md:min-h-[440px] shadow-sm">
                            <div className="space-y-1 z-10 shrink-0">
                                <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded inline-block">{tagBannerSecundario}</span>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight pt-0.5">{tituloBannerSecundario}</h3>
                            </div>
                            <div className="flex-1 w-full min-h-[210px] md:min-h-[250px] rounded-xl overflow-hidden relative shadow-sm bg-slate-200">
                                <img src={fotoBannerSecundario} alt={tituloBannerSecundario} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="space-y-2.5 z-10 shrink-0 pt-1">
                                <p className="text-xs md:text-sm text-slate-700 font-bold leading-snug">{textoBannerSecundario}</p>
                                <a href={getWppLink(`Olá! Quero saber mais sobre: ${tituloBannerSecundario} (${loja.nomeLoja}).`)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase px-5 py-3 rounded-xl transition-colors w-full sm:w-auto shadow-sm">
                                    {botaoBannerSecundario} <span>→</span>
                                </a>
                            </div>
                        </div>
                    </section>
                )}

                {/* 7. CARROSSÉIS: DESTAQUES + PROMOÇÕES */}
                {(listaCarrosselDestaque.length > 0 || listaCarrosselPromo.length > 0) && categoriaFiltro === 'todas' && !busca && (
                    <section className={`grid grid-cols-1 ${listaCarrosselDestaque.length > 0 && listaCarrosselPromo.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
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
                                        <div className="sm:col-span-5 flex items-center justify-center bg-white rounded-2xl p-3 border border-slate-200/80 h-52 shadow-inner relative overflow-hidden">
                                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                                <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">TOP</span>
                                                {prodSlide.novidade && <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">NOVO</span>}
                                                {prodSlide.maisVendido && <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">MAIS VENDIDO</span>}
                                            </div>
                                            {prodSlide.imageUrl ? <img src={prodSlide.imageUrl} alt={prodSlide.name} className="w-full h-full object-contain hover:scale-105 transition-transform" /> : <Icon name="image" size={48} className="text-slate-200" />}
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
                                                <button onClick={() => handleComprarDireto(prodSlide)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer">Comprar Agora</button>
                                                <button onClick={() => adicionarAoCarrinho(prodSlide, false)} className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"><Icon name="shopping-cart" size={14} /> + Carrinho</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {listaCarrosselPromo.length > 0 && (() => {
                            const promoSlide = listaCarrosselPromo[slidePromo] || listaCarrosselPromo[0];
                            const descPerc = promoSlide.price > 0 && promoSlide.promoPrice > 0
                                ? Math.max(1, Math.round(((promoSlide.price - promoSlide.promoPrice) / promoSlide.price) * 100))
                                : 10;
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
                                        <div className="sm:col-span-5 flex items-center justify-center bg-white rounded-2xl p-3 border border-rose-100 h-52 shadow-inner relative overflow-hidden">
                                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                                <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">-{descPerc}% OFF</span>
                                                {promoSlide.novidade && <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">NOVO</span>}
                                                {promoSlide.maisVendido && <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">MAIS VENDIDO</span>}
                                            </div>
                                            {promoSlide.imageUrl ? <img src={promoSlide.imageUrl} alt={promoSlide.name} className="w-full h-full object-contain hover:scale-105 transition-transform" /> : <Icon name="image" size={48} className="text-slate-200" />}
                                        </div>
                                        <div className="sm:col-span-7 space-y-3">
                                            <span className="text-xs font-black uppercase text-rose-600 block">Em Promoção</span>
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight line-clamp-2">{promoSlide.name}</h3>
                                            <p className="text-xs text-slate-600 font-medium line-clamp-2">{promoSlide.description || 'Aproveite o preço promocional por tempo limitado.'}</p>
                                            <div className="flex items-baseline gap-2.5 pt-1">
                                                <span className="text-2xl font-black text-rose-600">{formatMoney(promoSlide.promoPrice || promoSlide.sellingPrice)}</span>
                                                <span className="text-xs text-slate-400 line-through font-bold">{formatMoney(promoSlide.price)}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                                <button onClick={() => handleComprarDireto(promoSlide)} className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer">Aproveitar Oferta</button>
                                                <button onClick={() => adicionarAoCarrinho(promoSlide, false)} className="bg-slate-900 hover:bg-black text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"><Icon name="shopping-cart" size={14} /> + Carrinho</button>
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
                            <h4 className="font-black text-xs uppercase text-slate-800">Envio por Correios e Transportadora</h4>
                            <p className="text-xs text-slate-500">PAC, SEDEX e Jadlog com Rastreio</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" /></svg>
                        </div>
                        <div>
                            <h4 className="font-black text-xs uppercase text-slate-800">Status em Tempo Real</h4>
                            <p className="text-xs text-slate-500">Acompanhe cada etapa em Meus Pedidos</p>
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

                {/* 9. GRADE DE PRODUTOS COM FOTOS QUADRADAS PADRONIZADAS (1:1) */}
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
                                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                                            {descontoPerc > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">-{descontoPerc}%</span>}
                                            {p.destaque && <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase">Top</span>}
                                            {p.novidade && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase">Novidade</span>}
                                            {p.maisVendido && <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase">Mais Vendido</span>}
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
                                        
                                        {/* Caixa Quadrada Padrão 1:1 para todas as fotos de produtos */}
                                        <div className="w-full aspect-square flex items-center justify-center mb-3 bg-slate-50 rounded-xl overflow-hidden relative">
                                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <Icon name="image" size={44} className="text-slate-300" />}
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
                                            <button onClick={() => adicionarAoCarrinho(p, false)} className="py-2.5 px-2 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border border-orange-200 font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer">
                                                <Icon name="shopping-cart" size={13} /> + Carrinho
                                            </button>
                                            <button onClick={() => handleComprarDireto(p)} className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer">
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

            {/* 11. RODAPÉ COMPLETO */}
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
                        <p className="text-xs text-slate-500">Acompanhe seus pedidos em tempo real, código de rastreio e endereço de entrega.</p>
                        <div className="flex flex-col gap-2 pt-1">
                            {clienteLogado ? (
                                <>
                                    <button onClick={() => setClientAreaModal({ open: true, tab: 'pedidos' })} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase transition-colors">Meus Pedidos ({meusPedidos.length})</button>
                                    <button onClick={() => setClientAreaModal({ open: true, tab: 'cadastro' })} className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase transition-colors">Meu Cadastro e CEP</button>
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

            {/* 12. BOTÃO FLUTUANTE WHATSAPP */}
            <a 
                href={getWppLink(`Olá! Estou no site da ${loja.nomeLoja} e gostaria de atendimento.`)} 
                target="_blank" 
                rel="noreferrer" 
                className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe57] text-white px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 transition-all border-2 border-white" 
            >
                <svg className="w-7 h-7 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.126.556 4.124 1.535 5.862l-1.535 5.638 5.792-1.518c1.693.904 3.621 1.418 5.672 1.418 6.627 0 12-5.373 12-12s-5.373-12-12-12z"/>
                </svg>
                <div className="leading-tight hidden sm:block">
                    <span className="block text-[10px] font-bold uppercase opacity-90">Falar no WhatsApp</span>
                    <span className="font-black text-xs">{telefoneAjustes || 'Atendimento Online'}</span>
                </div>
            </a>

            {/* 13. MODAL DE LOGIN E CADASTRO */}
            {authModal.open && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto">
                        <div className="bg-[var(--cor-primaria)] p-6 text-center text-white relative">
                            <button onClick={() => setAuthModal({ ...authModal, open: false })} className="absolute top-4 right-4 text-white/70 hover:text-white">✕</button>
                            <h3 className="font-black text-lg uppercase tracking-wider">{authModal.mode === 'login' ? 'Entrar na Minha Conta' : 'Criar Conta de Cliente'}</h3>
                            <p className="text-xs opacity-80 mt-1">{authModal.mode === 'login' ? 'Acesse seu histórico de pedidos e código de rastreio' : 'Cadastre seu endereço com CEP para envio rápido'}</p>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-black uppercase">
                            <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className={`py-3.5 ${authModal.mode === 'login' ? 'bg-white text-[var(--cor-primaria)] border-b-2 border-[var(--cor-primaria)]' : 'text-slate-400'}`}>Já sou Cliente</button>
                            <button onClick={() => setAuthModal({ open: true, mode: 'register' })} className={`py-3.5 ${authModal.mode === 'register' ? 'bg-white text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'}`}>Quero me Cadastrar</button>
                        </div>

                        {authModal.mode === 'register' ? (
                            <form onSubmit={handleRegistrarCliente} className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome Completo *</label>
                                        <input type="text" required value={regNome} onChange={e => setRegNome(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="Seu nome completo" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">WhatsApp / Telefone *</label>
                                        <input type="text" required value={regWhatsapp} onChange={e => setRegWhatsapp(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="(11) 99999-9999" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-orange-600 block mb-1">CEP *</label>
                                        <input
                                            type="text"
                                            required
                                            value={regCep}
                                            onChange={e => { setRegCep(e.target.value); consultarCepViaCep(e.target.value, 'cadastro'); }}
                                            placeholder="00000-000"
                                            className="w-full p-2.5 bg-orange-50/40 border border-orange-300 rounded-xl text-xs font-black"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Rua / Logradouro *</label>
                                        <input type="text" required value={regRua} onChange={e => setRegRua(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="Nome da rua" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Número *</label>
                                        <input type="text" required value={regNumero} onChange={e => setRegNumero(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="123" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Complemento</label>
                                        <input type="text" value={regComplemento} onChange={e => setRegComplemento(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="Apto, Bloco, Casa..." />
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Bairro *</label>
                                        <input type="text" required value={regBairro} onChange={e => setRegBairro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Cidade *</label>
                                        <input type="text" required value={regCidade} onChange={e => setRegCidade(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">UF *</label>
                                        <input type="text" required maxLength={2} value={regUf} onChange={e => setRegUf(e.target.value.toUpperCase())} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">E-mail *</label>
                                        <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="seu@email.com" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Crie uma Senha *</label>
                                        <input type="password" required value={regSenha} onChange={e => setRegSenha(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" placeholder="••••••••" />
                                    </div>
                                </div>

                                <button type="submit" disabled={processandoAuth} className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase text-xs shadow-md transition-colors mt-2">
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

            {/* 14. MODAL DO CLIENTE: HISTÓRICO PERMANENTE + BARRA DE PROGRESSO */}
            {clientAreaModal.open && clienteLogado && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg">
                                    {(clienteLogado.nome || clienteLogado.name || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-base uppercase">{clienteLogado.nome || clienteLogado.name}</h3>
                                    <span className="text-xs text-emerald-400 font-bold">Acompanhamento de Pedidos em Tempo Real</span>
                                </div>
                            </div>
                            <button onClick={() => setClientAreaModal({ ...clientAreaModal, open: false })} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-black uppercase shrink-0">
                            <button onClick={() => setClientAreaModal({ open: true, tab: 'pedidos' })} className={`py-3.5 ${clientAreaModal.tab === 'pedidos' ? 'bg-white text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'}`}>
                                Meus Pedidos ({meusPedidos.length})
                            </button>
                            <button onClick={() => setClientAreaModal({ open: true, tab: 'cadastro' })} className={`py-3.5 ${clientAreaModal.tab === 'cadastro' ? 'bg-white text-[var(--cor-primaria)] border-b-2 border-[var(--cor-primaria)]' : 'text-slate-400'}`}>
                                Meu Cadastro e CEP
                            </button>
                        </div>

                        {clientAreaModal.tab === 'cadastro' ? (
                            <form onSubmit={handleAtualizarMeuCadastro} className="p-6 space-y-3 overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome Completo</label>
                                        <input type="text" required value={regNome} onChange={e => setRegNome(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">WhatsApp / Telefone</label>
                                        <input type="text" required value={regWhatsapp} onChange={e => setRegWhatsapp(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-orange-600 block mb-1">CEP</label>
                                        <input type="text" value={regCep} onChange={e => { setRegCep(e.target.value); consultarCepViaCep(e.target.value, 'cadastro'); }} className="w-full p-2.5 bg-orange-50/40 border border-orange-300 rounded-xl text-xs font-black" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Rua / Logradouro</label>
                                        <input type="text" value={regRua} onChange={e => setRegRua(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Número</label>
                                        <input type="text" value={regNumero} onChange={e => setRegNumero(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Complemento</label>
                                        <input type="text" value={regComplemento} onChange={e => setRegComplemento(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Bairro</label>
                                        <input type="text" value={regBairro} onChange={e => setRegBairro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Cidade</label>
                                        <input type="text" value={regCidade} onChange={e => setRegCidade(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">UF</label>
                                        <input type="text" maxLength={2} value={regUf} onChange={e => setRegUf(e.target.value.toUpperCase())} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">E-mail</label>
                                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                </div>

                                <div className="flex justify-between items-center pt-3 gap-3">
                                    <button type="button" onClick={handleLogout} className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase hover:bg-red-100">
                                        Sair da Conta
                                    </button>
                                    <button type="submit" disabled={processandoAuth} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md">
                                        {processandoAuth ? 'Salvando...' : 'Salvar Meu Endereço'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                {carregandoPedidos ? (
                                    <div className="text-center py-12 text-xs font-bold text-slate-400">Buscando seus pedidos...</div>
                                ) : meusPedidos.length === 0 ? (
                                    <div className="text-center py-10 space-y-2">
                                        <Icon name="package" size={44} className="mx-auto text-slate-300" />
                                        <p className="font-black text-slate-600 text-sm uppercase">Nenhum pedido encontrado para esta conta</p>
                                        <p className="text-xs text-slate-400">Assim que você finalizar uma compra no carrinho, poderá acompanhar cada etapa da produção e entrega aqui.</p>
                                    </div>
                                ) : (
                                    meusPedidos.map(ped => {
                                        const codigo = ped.orderNumber || ped.codigo || '0001';
                                        const indiceEtapa = obterIndiceEtapa(ped);
                                        const dataPed = ped.createdAt ? new Date(ped.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                        const rastreio = ped.trackingCode || ped.codigoRastreio || '';

                                        return (
                                            <div key={ped.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-4 shadow-xs">
                                                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
                                                    <div>
                                                        <span className="text-xs font-black uppercase bg-slate-900 text-white px-2.5 py-1 rounded">
                                                            Pedido #{codigo}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-slate-400 ml-2">{dataPed}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-black text-base text-emerald-600">{formatMoney(ped.total || ped.valorTotal)}</span>
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                                            {ped.modalidadeFrete || 'Envio Padrão'} • {ped.formaPagamento || 'PIX'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-5 gap-1 pt-1">
                                                    {ETAPAS_PEDIDO.map((etapa, idx) => {
                                                        const concluida = idx <= indiceEtapa;
                                                        const atual = idx === indiceEtapa;
                                                        return (
                                                            <div key={etapa.id} className="flex flex-col items-center text-center">
                                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mb-1 transition-all ${
                                                                    concluida ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                                                                } ${atual ? 'ring-4 ring-emerald-200 scale-110' : ''}`}>
                                                                    {etapa.icone}
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase leading-tight ${concluida ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                                    {etapa.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                                                    <p className="font-black text-slate-800">{ped.resumoItens || (ped.items || []).map(i => `${i.qtd}x ${i.name}`).join(', ')}</p>
                                                    {(ped.endereco || ped.address) && (
                                                        <p className="text-[11px] text-slate-500"><strong>Entrega:</strong> {ped.endereco || ped.address}</p>
                                                    )}
                                                    {rastreio && (
                                                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                                                            <span className="text-[11px] font-black text-blue-700 uppercase">
                                                                🚚 Código de Rastreio: <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{rastreio}</span>
                                                            </span>
                                                            <a
                                                                href={`https://rastreamento.correios.com.br/app/index.php`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[11px] font-black text-orange-600 hover:underline"
                                                            >
                                                                Rastrear Objeto →
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 15. MODAL DO CARRINHO COM CEP AUTOMÁTICO, FRETE E ENVIO P/ O SISTEMA */}
            {showCartModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end">
                    <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4 shrink-0">
                            <div>
                                <h3 className="font-black text-lg uppercase text-slate-800">Carrinho & Checkout ({qtdTotalCarrinho})</h3>
                                <span className="text-xs font-bold text-slate-400">Preencha o CEP para calcular o envio</span>
                            </div>
                            <button onClick={() => setShowCartModal(false)} className="text-slate-400 hover:text-black text-xl">✕</button>
                        </div>

                        {pedidoConfirmado ? (
                            <div className="my-auto text-center space-y-4 py-8">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-black">
                                    ✓
                                </div>
                                <h4 className="font-black text-xl uppercase text-slate-800">Pedido #{pedidoConfirmado.orderNumber} Recebido!</h4>
                                <p className="text-xs font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
                                    Seu pedido já está na fila de produção da {loja.nomeLoja}. Você pode acompanhar cada etapa em <strong>Meus Pedidos</strong>.
                                </p>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
                                    <p><strong>Itens:</strong> {pedidoConfirmado.resumoItens}</p>
                                    <p><strong>Entrega ({pedidoConfirmado.modalidadeFrete}):</strong> {pedidoConfirmado.endereco}</p>
                                    <p><strong>Total com Frete:</strong> <span className="text-emerald-600 font-black">{formatMoney(pedidoConfirmado.total)}</span></p>
                                </div>
                                <div className="pt-3 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPedidoConfirmado(null);
                                            setShowCartModal(false);
                                            setClientAreaModal({ open: true, tab: 'pedidos' });
                                        }}
                                        className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black uppercase text-xs shadow-md"
                                    >
                                        Acompanhar em Meus Pedidos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setPedidoConfirmado(null); setShowCartModal(false); }}
                                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs"
                                    >
                                        Continuar na Loja
                                    </button>
                                </div>
                            </div>
                        ) : carrinho.length === 0 ? (
                            <div className="my-auto text-center py-12 space-y-3">
                                <Icon name="shopping-cart" size={44} className="mx-auto text-slate-300" />
                                <p className="text-slate-400 font-bold text-sm">Seu carrinho está vazio.</p>
                                <button onClick={() => setShowCartModal(false)} className="text-xs font-black uppercase text-orange-500 hover:underline">
                                    Continuar Comprando
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleFinalizarPedidoNoSistema} className="flex-1 flex flex-col justify-between space-y-4 pt-4 overflow-y-auto">
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {carrinho.map(item => (
                                        <div key={item.id} className="flex items-center justify-between border border-slate-200 p-2.5 rounded-xl bg-slate-50/50">
                                            <div className="flex items-center gap-3">
                                                {item.imageUrl && <img src={item.imageUrl} className="w-11 h-11 object-contain rounded border bg-white p-0.5" alt={item.name} />}
                                                <div>
                                                    <p className="font-bold text-xs text-slate-800 line-clamp-1">{item.name}</p>
                                                    <p className="text-xs font-black text-rose-600">{formatMoney(item.sellingPrice)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => alterarQtdCarrinho(item.id, -1)} className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-black text-xs">-</button>
                                                <span className="font-black text-xs w-5 text-center">{item.qtd}</span>
                                                <button type="button" onClick={() => alterarQtdCarrinho(item.id, 1)} className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-black text-xs">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2.5 border-t border-slate-200 pt-3">
                                    <h4 className="font-black text-xs uppercase text-slate-700 tracking-wider">1. Dados do Cliente</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Seu Nome *</label>
                                            <input type="text" required value={checkoutNome} onChange={e => setCheckoutNome(e.target.value)} placeholder="Nome completo" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">WhatsApp *</label>
                                            <input type="text" required value={checkoutTelefone} onChange={e => setCheckoutTelefone(e.target.value)} placeholder="(11) 99999-9999" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                    </div>

                                    <h4 className="font-black text-xs uppercase text-slate-700 tracking-wider pt-2">2. CEP e Endereço de Envio</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-orange-600 block mb-0.5">
                                                CEP * {buscandoCep && '...'}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={checkoutCep}
                                                onChange={e => { setCheckoutCep(e.target.value); consultarCepViaCep(e.target.value, 'checkout'); }}
                                                placeholder="00000-000"
                                                className="w-full p-2 bg-orange-50/50 border border-orange-300 rounded-lg text-xs font-black outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Rua / Avenida *</label>
                                            <input type="text" required value={checkoutRua} onChange={e => setCheckoutRua(e.target.value)} placeholder="Rua..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Número *</label>
                                            <input type="text" required value={checkoutNumero} onChange={e => setCheckoutNumero(e.target.value)} placeholder="Nº" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Complemento</label>
                                            <input type="text" value={checkoutComplemento} onChange={e => setCheckoutComplemento(e.target.value)} placeholder="Apto, Bloco, Ponto de ref." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-2">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Bairro *</label>
                                            <input type="text" required value={checkoutBairro} onChange={e => setCheckoutBairro(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Cidade *</label>
                                            <input type="text" required value={checkoutCidade} onChange={e => setCheckoutCidade(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">UF *</label>
                                            <input type="text" required maxLength={2} value={checkoutUf} onChange={e => setCheckoutUf(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center" />
                                        </div>
                                    </div>

                                    {opcoesFreteCalculadas.length > 0 && (
                                        <div className="pt-1 space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-emerald-700 block">Escolha a Modalidade de Entrega:</label>
                                            {opcoesFreteCalculadas.map(op => (
                                                <label key={op.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${checkoutModalidadeFrete === op.id ? 'border-emerald-500 bg-emerald-50/50 font-black' : 'border-slate-200 bg-white'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="frete"
                                                            checked={checkoutModalidadeFrete === op.id}
                                                            onChange={() => {
                                                                setCheckoutModalidadeFrete(op.id);
                                                                setCheckoutValorFrete(op.valor);
                                                            }}
                                                            className="accent-emerald-600"
                                                        />
                                                        <span>{op.nome} <span className="text-[10px] text-slate-400">({op.prazo})</span></span>
                                                    </div>
                                                    <span className="font-black text-emerald-700">{op.valor === 0 ? 'Grátis' : formatMoney(op.valor)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Pagamento</label>
                                            <select value={checkoutPagamento} onChange={e => setCheckoutPagamento(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold">
                                                <option value="PIX">PIX</option>
                                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                                <option value="Cartão de Débito">Cartão de Débito</option>
                                                <option value="Boleto">Boleto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">Observações da Peça</label>
                                            <input type="text" value={checkoutObs} onChange={e => setCheckoutObs(e.target.value)} placeholder="Cor, nome p/ gravar..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-3 space-y-2 shrink-0">
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Subtotal dos Produtos:</span>
                                        <span>{formatMoney(subtotalCarrinho)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Frete ({checkoutModalidadeFrete}):</span>
                                        <span>{checkoutValorFrete === 0 ? 'A combinar / Grátis' : formatMoney(checkoutValorFrete)}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-black text-base pt-1 border-t border-slate-100">
                                        <span>Total do Pedido:</span>
                                        <span className="text-emerald-600 text-xl">{formatMoney(totalComFrete)}</span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={enviandoPedido}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-colors cursor-pointer"
                                    >
                                        {enviandoPedido ? 'Registrando Pedido...' : 'Confirmar e Finalizar Pedido'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}