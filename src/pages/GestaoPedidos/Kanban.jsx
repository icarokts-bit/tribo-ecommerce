import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

const COLUNAS = [
    {
        id: 'novo',
        titulo: 'NOVOS PEDIDOS / ORÇAMENTOS',
        icone: 'inbox',
        corTopo: 'bg-blue-600',
        statusAceitos: ['novo', 'orcamento', 'pending', 'pendente', 'novos', 'aguardando', 'recebido']
    },
    {
        id: 'producao',
        titulo: 'NA IMPRESSORA / FABRICO',
        icone: 'cpu',
        corTopo: 'bg-amber-500',
        statusAceitos: ['producao', 'impressora', 'fabrico', 'preparando', 'printing', 'em_producao']
    },
    {
        id: 'embalagem',
        titulo: 'EMBALAGEM / SEPARAÇÃO',
        icone: 'package',
        corTopo: 'bg-purple-600',
        statusAceitos: ['embalagem', 'separacao', 'pronto', 'packing', 'ready']
    },
    {
        id: 'enviado',
        titulo: 'ENVIADO / AGUARD. RETIRADA',
        icone: 'truck',
        corTopo: 'bg-emerald-500',
        statusAceitos: ['enviado', 'retirada', 'shipped']
    }
];

export default function Kanban({ user, permissoes, donoUid: propDonoUid }) {
    const [pedidos, setPedidos] = useState([]);
    const [catalogoProdutos, setCatalogoProdutos] = useState([]);
    const [listaClientes, setListaClientes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estado do Contador Sequencial (0001, 0002...) e Senha Admin
    const [ultimoNumeroSequencial, setUltimoNumeroSequencial] = useState(0);
    const [senhaAdminSalva, setSenhaAdminSalva] = useState('1234');
    const [modalResetOpen, setModalResetOpen] = useState(false);
    const [senhaResetInput, setSenhaResetInput] = useState('');
    const [modoTrocarSenha, setModoTrocarSenha] = useState(false);
    const [novaSenhaAdminInput, setNovaSenhaAdminInput] = useState('');

    // Filtros de visualização no topo ('todos' | 'pedidos' | 'orcamentos')
    const [filtroTipo, setFiltroTipo] = useState('todos');

    // Modal de Detalhes Rápidos e Rastreio
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
    const [rastreioInput, setRastreioInput] = useState('');

    // Modal de Criação / Edição de Pedido ou Orçamento
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [salvandoForm, setSalvandoForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);

    const [formData, setFormData] = useState({
        tipoRegistro: 'pedido',
        orderNumber: '0001',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        cep: '',
        address: '',
        shippingMethod: 'PAC',
        deliveryFee: 0,
        discount: 0,
        paymentMethod: 'PIX',
        notes: '',
        trackingCode: '',
        status: 'novo',
        items: []
    });

    // Campos temporários para adicionar item dentro do modal
    const [produtoSelectId, setProdutoSelectId] = useState('');
    const [itemNomeTemp, setItemNomeTemp] = useState('');
    const [itemQtdTemp, setItemQtdTemp] = useState(1);
    const [itemPrecoTemp, setItemPrecoTemp] = useState('');

    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;

    const formatarNumeroPedido = (num) => String(Math.max(1, Number(num || 1))).padStart(4, '0');

    useEffect(() => {
        if (!donoUid) return;

        const unsubCounter = db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/order_counter`)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    setUltimoNumeroSequencial(Number(data.lastOrderNumber || 0));
                    if (data.resetPassword) setSenhaAdminSalva(String(data.resetPassword));
                } else {
                    setUltimoNumeroSequencial(0);
                }
            });

        const carregarAuxiliares = async () => {
            try {
                const catDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).get();
                if (catDoc.exists) {
                    setCatalogoProdutos(catDoc.data().products || []);
                }
                const cliSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/clientes`).get();
                setListaClientes(cliSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Erro ao carregar catálogo/clientes auxiliares:", e);
            }
        };
        carregarAuxiliares();

        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/orders`)
            .onSnapshot(async (snapOrders) => {
                const listaOrders = snapOrders.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                try {
                    const [snapPedidos, snapEco] = await Promise.all([
                        db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/pedidos`).get(),
                        db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_orders`).get()
                    ]);

                    const listaPedidos = snapPedidos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const listaEco = snapEco.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const mapa = new Map();
                    [...listaEco, ...listaPedidos, ...listaOrders].forEach(p => {
                        const chave = p.id || p.orderNumber || p.codigo;
                        if (chave) mapa.set(chave, p);
                    });

                    const unificados = Array.from(mapa.values()).sort((a, b) => {
                        const tA = a.timestamp || new Date(a.createdAt || a.dataPedido || 0).getTime();
                        const tB = b.timestamp || new Date(b.createdAt || b.dataPedido || 0).getTime();
                        return tB - tA;
                    });

                    setPedidos(unificados);
                } catch (err) {
                    setPedidos(listaOrders);
                }
                setLoading(false);
            }, () => {
                setLoading(false);
            });

        return () => {
            unsubCounter();
            unsub();
        };
    }, [donoUid]);

    const handleConfirmarZerarComSenha = async (e) => {
        e.preventDefault();
        if (!donoUid) return;

        if (senhaResetInput.trim() !== senhaAdminSalva) {
            return alert("Senha incorreta! Digite a senha de administrador correta para zerar o contador.");
        }

        try {
            const payload = {
                lastOrderNumber: 0,
                resetAt: new Date().toISOString()
            };
            if (modoTrocarSenha && novaSenhaAdminInput.trim()) {
                payload.resetPassword = novaSenhaAdminInput.trim();
                setSenhaAdminSalva(novaSenhaAdminInput.trim());
            }

            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/order_counter`).set(payload, { merge: true });
            setUltimoNumeroSequencial(0);
            setSenhaResetInput('');
            setNovaSenhaAdminInput('');
            setModoTrocarSenha(false);
            setModalResetOpen(false);
            alert("Sequência zerada com sucesso! O próximo pedido será o #0001.");
        } catch (error) {
            console.error("Erro ao zerar sequência:", error);
            alert("Erro ao zerar a numeração.");
        }
    };

    const gerarProximoNumeroNoBanco = async () => {
        const counterRef = db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/order_counter`);
        try {
            const proximoNumero = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(counterRef);
                const atual = doc.exists ? Number(doc.data().lastOrderNumber || 0) : 0;
                const novo = atual + 1;
                transaction.set(counterRef, { lastOrderNumber: novo, updatedAt: new Date().toISOString() }, { merge: true });
                return novo;
            });
            return formatarNumeroPedido(proximoNumero);
        } catch (e) {
            const fallback = ultimoNumeroSequencial + 1;
            await counterRef.set({ lastOrderNumber: fallback, updatedAt: new Date().toISOString() }, { merge: true });
            return formatarNumeroPedido(fallback);
        }
    };

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const ehOrcamento = (ped) => {
        return ped.tipoRegistro === 'orcamento' || ped.isQuote === true || String(ped.status || '').toLowerCase() === 'orcamento';
    };

    const obterColunaDoPedido = (pedido) => {
        const st = String(pedido.status || pedido.etapa || pedido.orderStatus || 'novo').toLowerCase().trim();
        if (['concluido', 'finalizado', 'entregue', 'delivered', 'cancelado'].includes(st)) {
            return 'arquivado_historico';
        }
        for (const col of COLUNAS) {
            if (col.id === st || col.statusAceitos.includes(st)) {
                return col.id;
            }
        }
        return 'novo';
    };

    const atualizarPedidoNasColecoes = async (pedidoId, atualizado) => {
        const colecoes = ['orders', 'pedidos', 'delivery_orders', 'ecommerce_orders'];
        await Promise.all(
            colecoes.map(col =>
                db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/${col}`).doc(pedidoId).set(atualizado, { merge: true })
            )
        );
    };

    const moverPedido = async (pedido, novoStatus) => {
        if (!donoUid) return;
        const agora = new Date().toISOString();

        const atualizado = {
            ...pedido,
            tipoRegistro: novoStatus === 'orcamento' ? 'orcamento' : 'pedido',
            isQuote: novoStatus === 'orcamento',
            status: novoStatus,
            etapa: novoStatus,
            orderStatus: novoStatus === 'concluido' ? 'delivered' : novoStatus,
            deliveredAt: novoStatus === 'concluido' ? agora : (pedido.deliveredAt || null),
            updatedAt: agora
        };

        setPedidos(prev => prev.map(p => p.id === pedido.id ? atualizado : p));
        if (pedidoSelecionado?.id === pedido.id) {
            if (novoStatus === 'concluido') {
                setPedidoSelecionado(null);
            } else {
                setPedidoSelecionado(atualizado);
            }
        }

        try {
            await atualizarPedidoNasColecoes(pedido.id, atualizado);
        } catch (error) {
            console.error("Erro ao atualizar status do pedido:", error);
        }
    };

    const excluirPedido = async (pedidoId) => {
        if (!window.confirm("Tem certeza que deseja excluir este registro permanentemente?")) return;
        const colecoes = ['orders', 'pedidos', 'delivery_orders', 'ecommerce_orders'];
        try {
            await Promise.all(
                colecoes.map(col =>
                    db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/${col}`).doc(pedidoId).delete()
                )
            );
            setPedidos(prev => prev.filter(p => p.id !== pedidoId));
            setPedidoSelecionado(null);
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    };

    const salvarCodigoRastreio = async () => {
        if (!pedidoSelecionado || !donoUid) return;
        const atualizado = {
            ...pedidoSelecionado,
            trackingCode: rastreioInput.trim().toUpperCase(),
            codigoRastreio: rastreioInput.trim().toUpperCase(),
            updatedAt: new Date().toISOString()
        };
        setPedidos(prev => prev.map(p => p.id === pedidoSelecionado.id ? atualizado : p));
        setPedidoSelecionado(atualizado);
        await atualizarPedidoNasColecoes(pedidoSelecionado.id, atualizado);
        alert("Código de rastreio salvo! O cliente já pode visualizá-lo em 'Meus Pedidos'.");
    };

    // =========================================================
    // FUNÇÕES DE CRIAÇÃO E EDIÇÃO DE PEDIDOS E ORÇAMENTOS
    // =========================================================
    const abrirModalNovo = (tipo = 'pedido') => {
        const proximoPrevisto = formatarNumeroPedido(ultimoNumeroSequencial + 1);
        setEditandoId(null);
        setFormData({
            tipoRegistro: tipo,
            orderNumber: proximoPrevisto,
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            cep: '',
            address: '',
            shippingMethod: 'PAC',
            deliveryFee: 0,
            discount: 0,
            paymentMethod: 'PIX',
            notes: '',
            trackingCode: '',
            status: tipo === 'orcamento' ? 'orcamento' : 'novo',
            items: []
        });
        setProdutoSelectId('');
        setItemNomeTemp('');
        setItemQtdTemp(1);
        setItemPrecoTemp('');
        setIsFormOpen(true);
    };

    const abrirModalEditar = (ped) => {
        const listaItens = Array.isArray(ped.items) ? ped.items : Array.isArray(ped.itens) ? ped.itens : [];
        const itensNormalizados = listaItens.map((it, idx) => ({
            id: it.id || `item-${idx}`,
            name: it.name || it.nome || 'Produto',
            qtd: Number(it.qtd || it.quantity || it.quantidade || 1),
            price: Number(it.price || it.preco || it.unitPrice || 0)
        }));

        if (itensNormalizados.length === 0 && ped.resumoItens) {
            itensNormalizados.push({
                id: 'item-0',
                name: ped.resumoItens,
                qtd: 1,
                price: Number(ped.subtotal || ped.total || ped.valorTotal || 0)
            });
        }

        setEditandoId(ped.id);
        setFormData({
            tipoRegistro: ehOrcamento(ped) ? 'orcamento' : 'pedido',
            orderNumber: ped.orderNumber || ped.numeroPedido || ped.codigo || '0001',
            customerName: ped.customerName || ped.clienteNome || ped.nomeCliente || ped.nome || '',
            customerPhone: ped.customerPhone || ped.clienteTelefone || ped.telefone || ped.whatsapp || '',
            customerEmail: ped.customerEmail || ped.email || '',
            cep: ped.cep || '',
            address: ped.address || ped.endereco || '',
            shippingMethod: ped.shippingMethod || ped.modalidadeFrete || 'PAC',
            deliveryFee: Number(ped.deliveryFee || ped.valorFrete || ped.taxaEntrega || 0),
            discount: Number(ped.discount || ped.desconto || 0),
            paymentMethod: ped.paymentMethod || ped.formaPagamento || 'PIX',
            notes: ped.notes || ped.observacao || ped.observacoes || '',
            trackingCode: ped.trackingCode || ped.codigoRastreio || '',
            status: ped.status || ped.etapa || 'novo',
            items: itensNormalizados
        });
        setProdutoSelectId('');
        setItemNomeTemp('');
        setItemQtdTemp(1);
        setItemPrecoTemp('');
        setPedidoSelecionado(null);
        setIsFormOpen(true);
    };

    const handleSelecionarClienteExistente = (e) => {
        const cliId = e.target.value;
        if (!cliId) return;
        const cli = listaClientes.find(c => c.id === cliId);
        if (cli) {
            setFormData(prev => ({
                ...prev,
                customerName: cli.nome || cli.name || '',
                customerPhone: cli.telefone || cli.phone || cli.whatsapp || '',
                customerEmail: cli.email || '',
                cep: cli.cep || '',
                address: cli.endereco || cli.address || cli.enderecoPrincipal || ''
            }));
        }
    };

    const handleSelecionarProdutoCatalogo = (e) => {
        const prodId = e.target.value;
        setProdutoSelectId(prodId);
        if (!prodId) return;
        const prod = catalogoProdutos.find(p => p.id === prodId);
        if (prod) {
            setItemNomeTemp(prod.name);
            setItemPrecoTemp(prod.isPromo ? prod.promoPrice : prod.price);
        }
    };

    const adicionarItemAoFormulario = () => {
        if (!itemNomeTemp.trim()) return alert("Informe o nome do produto ou serviço.");
        const novoItem = {
            id: crypto.randomUUID(),
            name: itemNomeTemp.trim(),
            nome: itemNomeTemp.trim(),
            qtd: Math.max(1, Number(itemQtdTemp || 1)),
            quantity: Math.max(1, Number(itemQtdTemp || 1)),
            price: Number(itemPrecoTemp || 0),
            preco: Number(itemPrecoTemp || 0)
        };
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, novoItem]
        }));
        setProdutoSelectId('');
        setItemNomeTemp('');
        setItemQtdTemp(1);
        setItemPrecoTemp('');
    };

    const atualizarItemDoFormulario = (idItem, campo, valor) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(it =>
                it.id === idItem
                    ? { ...it, [campo]: campo === 'name' ? valor : Number(valor), ...(campo === 'name' ? { nome: valor } : campo === 'qtd' ? { quantity: Number(valor) } : { preco: Number(valor) }) }
                    : it
            )
        }));
    };

    const removerItemDoFormulario = (idItem) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(it => it.id !== idItem)
        }));
    };

    const consultarCepNoFormulario = async (cepValor) => {
        const cepLimpo = String(cepValor).replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await resp.json();
            if (!data.erro) {
                const endSugerido = `${data.logradouro || ''}, Nº , ${data.bairro || ''} - ${data.localidade || ''}/${data.uf || ''} (CEP: ${cepValor})`;
                setFormData(prev => ({ ...prev, address: prev.address || endSugerido }));
            }
        } catch (err) {}
    };

    const subtotalForm = useMemo(() => {
        return formData.items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qtd || 1)), 0);
    }, [formData.items]);

    const totalFinalForm = useMemo(() => {
        return Math.max(0, subtotalForm + Number(formData.deliveryFee || 0) - Number(formData.discount || 0));
    }, [subtotalForm, formData.deliveryFee, formData.discount]);

    const handleSalvarPedidoOuOrcamento = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        if (!formData.customerName.trim()) return alert("Informe o nome do cliente.");
        if (formData.items.length === 0) return alert("Adicione pelo menos 1 item ao pedido/orçamento.");

        setSalvandoForm(true);
        try {
            const idRegistro = editandoId || crypto.randomUUID();
            const agora = new Date().toISOString();

            let codigoSequencial = formData.orderNumber;
            if (!editandoId) {
                codigoSequencial = await gerarProximoNumeroNoBanco();
            }

            const resumoTexto = formData.items.map(i => `${i.qtd}x ${i.name}`).join(', ');

            const statusCalculado = formData.tipoRegistro === 'orcamento' && formData.status === 'novo'
                ? 'orcamento'
                : (formData.tipoRegistro === 'pedido' && formData.status === 'orcamento' ? 'novo' : formData.status);

            const pedidoExistente = pedidos.find(p => p.id === editandoId) || {};

            const payload = {
                ...pedidoExistente,
                id: idRegistro,
                tipoRegistro: formData.tipoRegistro,
                isQuote: formData.tipoRegistro === 'orcamento',
                orderNumber: codigoSequencial,
                numeroPedido: codigoSequencial,
                codigo: codigoSequencial,
                customerName: formData.customerName.trim(),
                clienteNome: formData.customerName.trim(),
                nomeCliente: formData.customerName.trim(),
                nome: formData.customerName.trim(),
                customerPhone: formData.customerPhone.trim(),
                clienteTelefone: formData.customerPhone.trim(),
                telefone: formData.customerPhone.trim(),
                phone: formData.customerPhone.trim(),
                whatsapp: formData.customerPhone.trim(),
                customerEmail: formData.customerEmail.trim().toLowerCase(),
                email: formData.customerEmail.trim().toLowerCase(),
                cep: formData.cep.trim(),
                address: formData.address.trim(),
                endereco: formData.address.trim(),
                deliveryAddress: formData.address.trim(),
                shippingMethod: formData.shippingMethod,
                modalidadeFrete: formData.shippingMethod,
                deliveryFee: Number(formData.deliveryFee || 0),
                valorFrete: Number(formData.deliveryFee || 0),
                taxaEntrega: Number(formData.deliveryFee || 0),
                discount: Number(formData.discount || 0),
                desconto: Number(formData.discount || 0),
                paymentMethod: formData.paymentMethod,
                formaPagamento: formData.paymentMethod,
                pagamento: formData.paymentMethod,
                notes: formData.notes.trim(),
                observacao: formData.notes.trim(),
                observacoes: formData.notes.trim(),
                trackingCode: formData.trackingCode.trim().toUpperCase(),
                codigoRastreio: formData.trackingCode.trim().toUpperCase(),
                items: formData.items,
                itens: formData.items,
                products: formData.items,
                resumoItens: resumoTexto,
                subtotal: subtotalForm,
                total: totalFinalForm,
                valorTotal: totalFinalForm,
                totalAmount: totalFinalForm,
                status: statusCalculado,
                etapa: statusCalculado,
                orderStatus: statusCalculado === 'concluido' ? 'delivered' : statusCalculado,
                updatedAt: agora,
                createdAt: pedidoExistente.createdAt || agora,
                timestamp: pedidoExistente.timestamp || Date.now()
            };

            await atualizarPedidoNasColecoes(idRegistro, payload);

            setIsFormOpen(false);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar registro.");
        }
        setSalvandoForm(false);
    };

    const enviarOrcamentoWhatsApp = (ped) => {
        const fone = String(ped.customerPhone || ped.telefone || '').replace(/\D/g, '');
        const codigo = ped.orderNumber || ped.codigo || '0001';
        const itensTxt = (ped.items || ped.itens || []).map(i => `• ${i.qtd || 1}x ${i.name || i.nome}: ${formatMoney((i.price || 0) * (i.qtd || 1))}`).join('\n');
        const freteTxt = Number(ped.deliveryFee || ped.valorFrete || 0) > 0 ? `\nFrete (${ped.modalidadeFrete || 'Envio'}): ${formatMoney(ped.deliveryFee || ped.valorFrete)}` : '';
        const descTxt = Number(ped.discount || ped.desconto || 0) > 0 ? `\nDesconto: -${formatMoney(ped.discount || ped.desconto)}` : '';

        const msg = `Olá *${ped.customerName || ped.nome}*!\nSegue o seu *${ehOrcamento(ped) ? 'Orçamento' : 'Pedido'} #${codigo}*:\n\n${itensTxt}${freteTxt}${descTxt}\n\n*Total: ${formatMoney(ped.total || ped.valorTotal)}*\nForma de Pagamento: ${ped.formaPagamento || ped.paymentMethod || 'PIX'}${ped.notes ? `\nObs: ${ped.notes}` : ''}`;
        const url = fone ? `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const pedidosVisiveisNoQuadro = useMemo(() => {
        return pedidos.filter(p => {
            if (filtroTipo === 'orcamentos') return ehOrcamento(p);
            if (filtroTipo === 'pedidos') return !ehOrcamento(p);
            return true;
        });
    }, [pedidos, filtroTipo]);

    const totalOrcamentosAtivos = useMemo(() => {
        return pedidos.filter(p => ehOrcamento(p) && obterColunaDoPedido(p) !== 'arquivado_historico').length;
    }, [pedidos]);

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100">
            
            {/* CABEÇALHO DO PAINEL DE PRODUÇÃO COM LETRAS MAIORES E BEM LEGÍVEIS */}
            <header className="bg-white rounded-2xl border border-slate-200 px-6 py-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                        <Icon name="box" size={24} />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-wider leading-tight">
                            Painel de Produção & Orçamentos
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                            <span className="text-sm font-bold text-slate-500">
                                Próximo Nº da Sequência: <strong className="text-slate-900 font-black">#{formatarNumeroPedido(ultimoNumeroSequencial + 1)}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSenhaResetInput('');
                                    setModoTrocarSenha(false);
                                    setModalResetOpen(true);
                                }}
                                className="text-xs font-black uppercase bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                title="Reiniciar contagem de pedidos para 0001 (Requer Senha)"
                            >
                                🔒 Zerar Nº (0001)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filtros Rápidos + Botões de Ação com Fontes Maiores */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs md:text-sm font-black uppercase">
                        <button
                            onClick={() => setFiltroTipo('todos')}
                            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${filtroTipo === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFiltroTipo('pedidos')}
                            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${filtroTipo === 'pedidos' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Pedidos
                        </button>
                        <button
                            onClick={() => setFiltroTipo('orcamentos')}
                            className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${filtroTipo === 'orcamentos' ? 'bg-orange-500 text-white shadow-xs' : 'text-orange-600 hover:bg-orange-50'}`}
                        >
                            Orçamentos ({totalOrcamentosAtivos})
                        </button>
                    </div>

                    <button
                        onClick={() => abrirModalNovo('orcamento')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-black uppercase text-xs md:text-sm tracking-wider flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                        <Icon name="file-text" size={18} /> + Novo Orçamento
                    </button>

                    <button
                        onClick={() => abrirModalNovo('pedido')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-black uppercase text-xs md:text-sm tracking-wider flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                        <Icon name="plus" size={18} /> + Novo Pedido
                    </button>
                </div>
            </header>

            {/* QUADRO KANBAN DE 4 COLUNAS COM FONTES AMPLIADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
                {COLUNAS.map((coluna, colIndex) => {
                    const pedidosDaColuna = pedidosVisiveisNoQuadro.filter(p => obterColunaDoPedido(p) === coluna.id);

                    return (
                        <div key={coluna.id} className="bg-slate-200/75 rounded-2xl overflow-hidden flex flex-col min-h-[680px] border border-slate-300/80">
                            <div className={`${coluna.corTopo} text-white px-4 py-4 flex items-center justify-between shadow-xs`}>
                                <div className="flex items-center gap-2.5">
                                    <Icon name={coluna.icone} size={18} />
                                    <h2 className="font-black text-xs md:text-sm uppercase tracking-wider">{coluna.titulo}</h2>
                                </div>
                                <span className="bg-white/25 text-white text-xs md:text-sm font-black px-2.5 py-0.5 rounded-lg">
                                    {pedidosDaColuna.length}
                                </span>
                            </div>

                            <div className="p-3.5 space-y-3.5 flex-1">
                                {loading ? (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-sm font-black uppercase text-slate-500">
                                        Carregando...
                                    </div>
                                ) : pedidosDaColuna.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-sm font-black uppercase text-slate-400 tracking-wider">
                                        Vazio
                                    </div>
                                ) : (
                                    pedidosDaColuna.map(ped => {
                                        const codigo = ped.orderNumber || ped.numeroPedido || ped.codigo || '0001';
                                        const nomeCli = ped.customerName || ped.clienteNome || ped.nomeCliente || ped.nome || 'Cliente';
                                        const foneCli = ped.customerPhone || ped.clienteTelefone || ped.telefone || ped.whatsapp || '';
                                        const total = ped.total || ped.valorTotal || ped.totalAmount || 0;
                                        const listaItens = Array.isArray(ped.items) ? ped.items : Array.isArray(ped.itens) ? ped.itens : [];
                                        const dataHora = ped.createdAt ? new Date(ped.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                                        const isOrc = ehOrcamento(ped);

                                        const proxColuna = COLUNAS[colIndex + 1];
                                        const antColuna = COLUNAS[colIndex - 1];

                                        return (
                                            <div key={ped.id} className={`bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-md transition-all space-y-3.5 ${isOrc ? 'border-orange-300 bg-orange-50/10' : 'border-slate-200'}`}>
                                                
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-900 text-white text-xs font-black uppercase px-3 py-1 rounded-lg">
                                                            #{codigo}
                                                        </span>
                                                        {isOrc && (
                                                            <span className="bg-orange-500 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-lg">
                                                                ORÇAMENTO
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-400 mr-1">{dataHora}</span>
                                                        <button
                                                            onClick={() => abrirModalEditar(ped)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Editar Pedido / Orçamento"
                                                        >
                                                            <Icon name="edit" size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => excluirPedido(ped.id)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Excluir"
                                                        >
                                                            <Icon name="trash-2" size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="font-black text-base text-slate-900 uppercase leading-snug">{nomeCli}</p>
                                                    {foneCli && (
                                                        <a
                                                            href={`https://wa.me/55${String(foneCli).replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs md:text-sm font-bold text-emerald-600 hover:underline inline-flex items-center gap-1.5 mt-1"
                                                        >
                                                            <Icon name="phone" size={14} /> {foneCli}
                                                        </a>
                                                    )}
                                                    {(ped.endereco || ped.address) && (
                                                        <p className="text-xs text-slate-500 font-semibold line-clamp-2 mt-1">
                                                            📍 {ped.endereco || ped.address}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-200/70">
                                                    {listaItens.length > 0 ? (
                                                        listaItens.map((it, idx) => (
                                                            <div key={idx} className="flex justify-between text-xs md:text-sm font-bold text-slate-800">
                                                                <span>{it.qtd || it.quantity || 1}x {it.name || it.nome}</span>
                                                                <span className="text-slate-600 font-black">{formatMoney((it.price || it.preco || 0) * (it.qtd || it.quantity || 1))}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs md:text-sm font-bold text-slate-800">{ped.resumoItens || '1x Produto'}</p>
                                                    )}
                                                    {(ped.observacao || ped.notes) && (
                                                        <p className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg mt-1.5 border border-amber-200">
                                                            Obs: {ped.observacao || ped.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-xs font-black uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                                                        {ped.modalidadeFrete || 'Envio'} • {ped.formaPagamento || ped.paymentMethod || 'PIX'}
                                                    </span>
                                                    <span className="font-black text-lg text-emerald-600">
                                                        {formatMoney(total)}
                                                    </span>
                                                </div>

                                                {isOrc && (
                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <button
                                                            onClick={() => enviarOrcamentoWhatsApp(ped)}
                                                            className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"
                                                        >
                                                            WhatsApp
                                                        </button>
                                                        <button
                                                            onClick={() => moverPedido(ped, 'producao')}
                                                            className="py-2 px-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase cursor-pointer"
                                                        >
                                                            ✓ Aprovar
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                                    {antColuna && (
                                                        <button
                                                            onClick={() => moverPedido(ped, antColuna.id)}
                                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase cursor-pointer"
                                                            title={`Voltar para ${antColuna.titulo}`}
                                                        >
                                                            ←
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            setPedidoSelecionado(ped);
                                                            setRastreioInput(ped.trackingCode || ped.codigoRastreio || '');
                                                        }}
                                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs uppercase cursor-pointer"
                                                    >
                                                        Detalhes
                                                    </button>

                                                    {proxColuna ? (
                                                        <button
                                                            onClick={() => moverPedido(ped, proxColuna.id)}
                                                            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase flex items-center gap-1 cursor-pointer"
                                                            title={`Avançar para ${proxColuna.titulo}`}
                                                        >
                                                            Avançar →
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => moverPedido(ped, 'concluido')}
                                                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-1 shadow-xs cursor-pointer"
                                                            title="Finalizar pedido como Entregue e enviar para o Histórico"
                                                        >
                                                            ✓ Entregue
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL DE SEGURANÇA COM SENHA PARA ZERAR O CONTADOR DE PEDIDOS (0001) */}
            {modalResetOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-red-600 text-white p-6 text-center relative">
                            <button onClick={() => setModalResetOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white text-xl">✕</button>
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 text-2xl">
                                🔒
                            </div>
                            <h3 className="font-black text-lg uppercase tracking-wider">Zerar Sequência para #0001</h3>
                            <p className="text-xs opacity-90 mt-1">
                                Contador atual: #{formatarNumeroPedido(ultimoNumeroSequencial + 1)}
                            </p>
                        </div>

                        <form onSubmit={handleConfirmarZerarComSenha} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">
                                    Digite a Senha de Administrador *
                                </label>
                                <input
                                    type="password"
                                    required
                                    autoFocus
                                    value={senhaResetInput}
                                    onChange={e => setSenhaResetInput(e.target.value)}
                                    placeholder="Senha (padrão: 1234)"
                                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-center tracking-widest outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => setModoTrocarSenha(!modoTrocarSenha)}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    {modoTrocarSenha ? '✕ Cancelar troca de senha' : '⚙️ Alterar senha padrão ao salvar'}
                                </button>

                                {modoTrocarSenha && (
                                    <div className="mt-2.5">
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1">
                                            Nova Senha de Segurança
                                        </label>
                                        <input
                                            type="password"
                                            value={novaSenhaAdminInput}
                                            onChange={e => setNovaSenhaAdminInput(e.target.value)}
                                            placeholder="Digite a nova senha..."
                                            className="w-full p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-black text-center"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalResetOpen(false)}
                                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase shadow-md cursor-pointer"
                                >
                                    Confirmar e Zerar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL DE CRIAÇÃO E EDIÇÃO CORRIGIDO (SEM CORTES E TOTALMENTE ALINHADO)     */}
            {/* ========================================================================= */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        {/* TOPO FIXO DO MODAL */}
                        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-lg md:text-xl uppercase tracking-wider">
                                    {editandoId ? `Editar ${formData.tipoRegistro === 'orcamento' ? 'Orçamento' : 'Pedido'} #${formData.orderNumber}` : `Novo ${formData.tipoRegistro === 'orcamento' ? 'Orçamento' : 'Pedido'} #${formData.orderNumber}`}
                                </h3>
                                <span className="text-xs md:text-sm text-slate-300 font-medium">Numeração sequencial automática</span>
                            </div>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="text-white/70 hover:text-white text-2xl leading-none px-2 cursor-pointer">✕</button>
                        </div>

                        {/* FORMULÁRIO COM MIOLO ROLÁVEL E RODAPÉ FIXO */}
                        <form onSubmit={handleSalvarPedidoOuOrcamento} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            
                            {/* ÁREA CENTRAL DE ROLAGEM COM ESPAÇAMENTO SEGURO */}
                            <div className="p-6 md:p-7 overflow-y-auto space-y-6 flex-1">
                                
                                {/* BLOCO SUPERIOR: TIPO, ETAPA E NÚMERO */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">Tipo de Registro</label>
                                        <select
                                            value={formData.tipoRegistro}
                                            onChange={e => setFormData({ ...formData, tipoRegistro: e.target.value })}
                                            className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-black text-sm uppercase outline-none focus:border-slate-900"
                                        >
                                            <option value="pedido">📦 Pedido de Venda</option>
                                            <option value="orcamento">📄 Orçamento / Cotação</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">Etapa / Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-black text-sm uppercase outline-none focus:border-slate-900"
                                        >
                                            <option value="orcamento">Orçamento em Aberto</option>
                                            <option value="novo">Novos Pedidos</option>
                                            <option value="producao">Na Impressora / Fabrico</option>
                                            <option value="embalagem">Embalagem / Separação</option>
                                            <option value="enviado">Enviado / Aguard. Retirada</option>
                                            <option value="concluido">✓ Finalizado / Entregue</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">Nº do Pedido (Sequencial)</label>
                                        <input
                                            type="text"
                                            value={formData.orderNumber}
                                            onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
                                            className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-black text-sm uppercase outline-none focus:border-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* 1. DADOS DO CLIENTE E ENTREGA (ALINHADOS PELA BASE) */}
                                <div className="space-y-4">
                                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2">
                                        <h4 className="font-black text-sm uppercase text-slate-900 tracking-wider">1. Dados do Cliente e Entrega</h4>
                                        {listaClientes.length > 0 && (
                                            <select
                                                onChange={handleSelecionarClienteExistente}
                                                defaultValue=""
                                                className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs md:text-sm font-bold text-indigo-700 outline-none cursor-pointer"
                                            >
                                                <option value="">Puxar cliente já cadastrado...</option>
                                                {listaClientes.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nome || c.name} ({c.telefone || c.phone || ''})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Nome do Cliente *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.customerName}
                                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                                placeholder="Nome completo"
                                                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">WhatsApp / Telefone *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.customerPhone}
                                                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                                placeholder="(11) 99999-9999"
                                                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-slate-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">E-mail do Cliente</label>
                                            <input
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                                                placeholder="cliente@email.com"
                                                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-slate-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                                        <div>
                                            <label className="text-xs font-black uppercase text-orange-600 block mb-1.5">CEP</label>
                                            <input
                                                type="text"
                                                value={formData.cep}
                                                onChange={e => {
                                                    setFormData({ ...formData, cep: e.target.value });
                                                    consultarCepNoFormulario(e.target.value);
                                                }}
                                                placeholder="00000-000"
                                                className="w-full h-11 px-3.5 bg-orange-50/40 border border-orange-300 rounded-xl text-sm font-black outline-none focus:border-orange-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="text-xs font-black uppercase text-slate-600 block mb-1.5">Endereço Completo de Entrega</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Rua, Número, Bairro, Cidade - UF"
                                                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. ITENS DO PEDIDO / ORÇAMENTO (ALINHADOS PELA BASE) */}
                                <div className="space-y-4 pt-2 border-t border-slate-200">
                                    <h4 className="font-black text-sm uppercase text-slate-900 tracking-wider">2. Itens do Pedido / Orçamento</h4>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                        {catalogoProdutos.length > 0 && (
                                            <div>
                                                <label className="text-xs font-black uppercase text-emerald-700 block mb-1.5">Escolher Produto do Catálogo (Opcional)</label>
                                                <select
                                                    value={produtoSelectId}
                                                    onChange={handleSelecionarProdutoCatalogo}
                                                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="">-- Ou digite um item personalizado abaixo --</option>
                                                    {catalogoProdutos.map(prod => (
                                                        <option key={prod.id} value={prod.id}>
                                                            {prod.name} ({formatMoney(prod.isPromo ? prod.promoPrice : prod.price)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                            <div className="sm:col-span-6">
                                                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Descrição do Item / Peça 3D</label>
                                                <input
                                                    type="text"
                                                    value={itemNomeTemp}
                                                    onChange={e => setItemNomeTemp(e.target.value)}
                                                    placeholder="Ex: 50x Chaveiros Personalizados NFC"
                                                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-slate-900"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Qtd</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={itemQtdTemp}
                                                    onChange={e => setItemQtdTemp(e.target.value)}
                                                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-center outline-none focus:border-slate-900"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Preço Unit. (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={itemPrecoTemp}
                                                    onChange={e => setItemPrecoTemp(e.target.value)}
                                                    placeholder="0,00"
                                                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-slate-900"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <button
                                                    type="button"
                                                    onClick={adicionarItemAoFormulario}
                                                    className="w-full h-11 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs md:text-sm uppercase cursor-pointer transition-colors"
                                                >
                                                    + Incluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {formData.items.length === 0 ? (
                                        <p className="text-center py-5 text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                            Nenhum item incluído ainda.
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {formData.items.map(it => (
                                                <div key={it.id} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                                                    <div className="col-span-6">
                                                        <input
                                                            type="text"
                                                            value={it.name}
                                                            onChange={e => atualizarItemDoFormulario(it.id, 'name', e.target.value)}
                                                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={it.qtd}
                                                            onChange={e => atualizarItemDoFormulario(it.id, 'qtd', e.target.value)}
                                                            className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={it.price}
                                                            onChange={e => atualizarItemDoFormulario(it.id, 'price', e.target.value)}
                                                            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                                                        />
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removerItemDoFormulario(it.id)}
                                                            className="text-red-500 hover:text-red-700 p-1.5 font-black text-base cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 3. FRETE, DESCONTO, PAGAMENTO E OBSERVAÇÕES (ALINHADOS PELA BASE) */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-200 items-end">
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Modalidade de Envio</label>
                                        <select
                                            value={formData.shippingMethod}
                                            onChange={e => setFormData({ ...formData, shippingMethod: e.target.value })}
                                            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none"
                                        >
                                            <option value="Retirada">Retirada na Loja</option>
                                            <option value="PAC">Correios PAC</option>
                                            <option value="SEDEX">Correios SEDEX</option>
                                            <option value="Jadlog">Transportadora Jadlog</option>
                                            <option value="Motoboy">Entrega Local / Motoboy</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Valor do Frete (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.deliveryFee}
                                            onChange={e => setFormData({ ...formData, deliveryFee: e.target.value })}
                                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Desconto (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.discount}
                                            onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Forma de Pagamento</label>
                                        <select
                                            value={formData.paymentMethod}
                                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none"
                                        >
                                            <option value="PIX">PIX</option>
                                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                                            <option value="Cartão de Débito">Cartão de Débito</option>
                                            <option value="Boleto">Boleto</option>
                                            <option value="Dinheiro">Dinheiro</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                    <div>
                                        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 truncate">Observações Internas / Personalização</label>
                                        <input
                                            type="text"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Cor do filamento, link da logo, prazo combinado..."
                                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase text-blue-700 block mb-1.5 truncate">Código de Rastreio (Opcional)</label>
                                        <input
                                            type="text"
                                            value={formData.trackingCode}
                                            onChange={e => setFormData({ ...formData, trackingCode: e.target.value })}
                                            placeholder="Ex: AA123456789BR"
                                            className="w-full h-11 px-3.5 bg-blue-50/40 border border-blue-300 rounded-xl text-sm font-black uppercase outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RODAPÉ FIXO DO MODAL */}
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
                                <div>
                                    <span className="text-xs font-black uppercase text-slate-400 block">Valor Total Calculado</span>
                                    <span className="text-2xl md:text-3xl font-black text-emerald-600">{formatMoney(totalFinalForm)}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-xs md:text-sm uppercase cursor-pointer transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={salvandoForm}
                                        className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs md:text-sm uppercase shadow-md cursor-pointer transition-colors"
                                    >
                                        {salvandoForm ? 'Salvando...' : editandoId ? 'Salvar Alterações' : `Criar ${formData.tipoRegistro === 'orcamento' ? 'Orçamento' : 'Pedido'}`}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES RÁPIDOS + RASTREIO + MARCAR COMO ENTREGUE */}
            {pedidoSelecionado && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg uppercase">
                                    {ehOrcamento(pedidoSelecionado) ? 'Orçamento' : 'Pedido'} #{pedidoSelecionado.orderNumber || pedidoSelecionado.codigo}
                                </h3>
                                <span className="text-xs text-slate-300">Gerenciar entrega, edição e rastreio</span>
                            </div>
                            <button onClick={() => setPedidoSelecionado(null)} className="text-white/70 hover:text-white text-2xl">✕</button>
                        </div>

                        <div className="p-6 space-y-4 text-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-black uppercase text-slate-400 block">Cliente / Contato</span>
                                    <p className="font-black text-base text-slate-900">{pedidoSelecionado.customerName || pedidoSelecionado.nome}</p>
                                    <p className="font-bold text-emerald-600">{pedidoSelecionado.customerPhone || pedidoSelecionado.telefone}</p>
                                </div>
                                <button
                                    onClick={() => abrirModalEditar(pedidoSelecionado)}
                                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Icon name="edit" size={16} /> Editar Tudo
                                </button>
                            </div>

                            <div>
                                <span className="text-xs font-black uppercase text-slate-400 block">Endereço Completo e CEP</span>
                                <p className="font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">
                                    {pedidoSelecionado.address || pedidoSelecionado.endereco || 'Não informado'}
                                </p>
                            </div>

                            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-2">
                                <label className="text-xs font-black uppercase text-blue-800 block">
                                    Código de Rastreio (Correios / Transportadora)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={rastreioInput}
                                        onChange={e => setRastreioInput(e.target.value)}
                                        placeholder="Ex: AA123456789BR"
                                        className="flex-1 p-2.5 bg-white border border-blue-200 rounded-lg font-black text-sm uppercase outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={salvarCodigoRastreio}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-xs uppercase cursor-pointer"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="font-black uppercase text-slate-500">
                                    Total ({pedidoSelecionado.modalidadeFrete || 'Frete'} • {pedidoSelecionado.formaPagamento || 'PIX'}):
                                </span>
                                <span className="font-black text-xl text-emerald-600">{formatMoney(pedidoSelecionado.total || pedidoSelecionado.valorTotal)}</span>
                            </div>

                            <div className="pt-2 flex flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => moverPedido(pedidoSelecionado, 'concluido')}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs md:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    ✓ Finalizar Pedido (Marcar como Entregue)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => enviarOrcamentoWhatsApp(pedidoSelecionado)}
                                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs md:text-sm cursor-pointer"
                                >
                                    Enviar Resumo no WhatsApp do Cliente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}