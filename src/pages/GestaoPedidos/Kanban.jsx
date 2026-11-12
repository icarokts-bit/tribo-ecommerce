import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

const COLUNAS = [
    {
        id: 'novo',
        titulo: 'NOVOS PEDIDOS',
        icone: 'inbox',
        corTopo: 'bg-blue-600',
        statusAceitos: ['novo', 'pending', 'pendente', 'novos', 'aguardando', 'recebido']
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
        statusAceitos: ['enviado', 'retirada', 'entregue', 'shipped', 'delivered', 'concluido']
    }
];

export default function Kanban({ user, permissoes, donoUid: propDonoUid }) {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;

    useEffect(() => {
        if (!donoUid) return;

        // Escuta em tempo real a coleção 'orders' e mescla com 'pedidos' e 'ecommerce_orders'
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
            }, (error) => {
                console.error("Erro ao escutar pedidos:", error);
                setLoading(false);
            });

        return () => unsub();
    }, [donoUid]);

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Descobre em qual coluna o pedido deve entrar
    const obterColunaDoPedido = (pedido) => {
        const st = String(pedido.status || pedido.etapa || pedido.orderStatus || 'novo').toLowerCase().trim();
        for (const col of COLUNAS) {
            if (col.id === st || col.statusAceitos.includes(st)) {
                return col.id;
            }
        }
        return 'novo';
    };

    // Move o pedido de uma coluna para outra no Firebase
    const moverPedido = async (pedido, novoStatus) => {
        if (!donoUid) return;
        const atualizado = {
            ...pedido,
            status: novoStatus,
            etapa: novoStatus,
            orderStatus: novoStatus,
            updatedAt: new Date().toISOString()
        };

        // Atualiza na tela imediatamente
        setPedidos(prev => prev.map(p => p.id === pedido.id ? atualizado : p));
        if (pedidoSelecionado?.id === pedido.id) {
            setPedidoSelecionado(atualizado);
        }

        const colecoes = ['orders', 'pedidos', 'delivery_orders', 'ecommerce_orders'];
        try {
            await Promise.all(
                colecoes.map(col =>
                    db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/${col}`).doc(pedido.id).set(atualizado, { merge: true })
                )
            );
        } catch (error) {
            console.error("Erro ao mover pedido:", error);
        }
    };

    const excluirPedido = async (pedidoId) => {
        if (!window.confirm("Deseja arquivar/remover este pedido do painel?")) return;
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
            console.error("Erro ao excluir pedido:", error);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100">
            
            {/* CABEÇALHO DO PAINEL DE PRODUÇÃO */}
            <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Icon name="box" size={20} />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-800 text-base md:text-lg uppercase tracking-wider leading-none">
                            Painel de Produção
                        </h1>
                        <span className="text-xs font-bold text-slate-400">Gestão de E-commerce 3D</span>
                    </div>
                </div>

                <div className="text-right">
                    <span className="font-black text-xs text-slate-800 block">{user?.displayName || 'Icaro Suzuki'}</span>
                    <span className="text-[11px] font-black text-emerald-500">Online</span>
                </div>
            </header>

            {/* QUADRO KANBAN DE 4 COLUNAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
                {COLUNAS.map((coluna, colIndex) => {
                    const pedidosDaColuna = pedidos.filter(p => obterColunaDoPedido(p) === coluna.id);

                    return (
                        <div key={coluna.id} className="bg-slate-200/70 rounded-2xl overflow-hidden flex flex-col min-h-[650px] border border-slate-200/80">
                            
                            {/* Cabeçalho colorido da Coluna */}
                            <div className={`${coluna.corTopo} text-white px-4 py-3.5 flex items-center justify-between shadow-xs`}>
                                <div className="flex items-center gap-2">
                                    <Icon name={coluna.icone} size={16} />
                                    <h2 className="font-black text-xs uppercase tracking-wider">{coluna.titulo}</h2>
                                </div>
                                <span className="bg-white/25 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
                                    {pedidosDaColuna.length}
                                </span>
                            </div>

                            {/* Lista de Cards de Pedidos */}
                            <div className="p-3 space-y-3 flex-1">
                                {loading ? (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center text-xs font-black uppercase text-slate-400">
                                        Carregando...
                                    </div>
                                ) : pedidosDaColuna.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                        Vazio
                                    </div>
                                ) : (
                                    pedidosDaColuna.map(ped => {
                                        const codigo = ped.orderNumber || ped.numeroPedido || ped.codigo || ped.id?.slice(0, 6).toUpperCase();
                                        const nomeCli = ped.customerName || ped.clienteNome || ped.nomeCliente || ped.nome || 'Cliente';
                                        const foneCli = ped.customerPhone || ped.clienteTelefone || ped.telefone || ped.whatsapp || '';
                                        const total = ped.total || ped.valorTotal || ped.totalAmount || 0;
                                        const listaItens = Array.isArray(ped.items) ? ped.items : Array.isArray(ped.itens) ? ped.itens : [];
                                        const dataHora = ped.createdAt ? new Date(ped.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

                                        const proxColuna = COLUNAS[colIndex + 1];
                                        const antColuna = COLUNAS[colIndex - 1];

                                        return (
                                            <div key={ped.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                    <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                                                        #{codigo}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">{dataHora}</span>
                                                </div>

                                                <div>
                                                    <p className="font-black text-sm text-slate-800 uppercase">{nomeCli}</p>
                                                    {foneCli && (
                                                        <a
                                                            href={`https://wa.me/55${String(foneCli).replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 mt-0.5"
                                                        >
                                                            <Icon name="phone" size={12} /> {foneCli}
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Itens do Pedido */}
                                                <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 border border-slate-100">
                                                    {listaItens.length > 0 ? (
                                                        listaItens.map((it, idx) => (
                                                            <div key={idx} className="flex justify-between text-xs font-bold text-slate-700">
                                                                <span>{it.qtd || it.quantity || 1}x {it.name || it.nome}</span>
                                                                <span className="text-slate-500">{formatMoney((it.price || it.preco || 0) * (it.qtd || it.quantity || 1))}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs font-bold text-slate-700">{ped.resumoItens || '1x Produto'}</p>
                                                    )}
                                                    {(ped.observacao || ped.notes) && (
                                                        <p className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">
                                                            Obs: {ped.observacao || ped.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                        {ped.formaPagamento || ped.paymentMethod || 'PIX'}
                                                    </span>
                                                    <span className="font-black text-base text-emerald-600">
                                                        {formatMoney(total)}
                                                    </span>
                                                </div>

                                                {/* Botões de Ação e Movimentação entre Colunas */}
                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                                    {antColuna ? (
                                                        <button
                                                            onClick={() => moverPedido(ped, antColuna.id)}
                                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-black text-[10px] uppercase"
                                                            title={`Voltar para ${antColuna.titulo}`}
                                                        >
                                                            ←
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => excluirPedido(ped.id)}
                                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg font-black text-[10px]"
                                                            title="Excluir Pedido"
                                                        >
                                                            <Icon name="trash-2" size={13} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => setPedidoSelecionado(ped)}
                                                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-black text-[10px] uppercase"
                                                    >
                                                        Detalhes
                                                    </button>

                                                    {proxColuna && (
                                                        <button
                                                            onClick={() => moverPedido(ped, proxColuna.id)}
                                                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-black text-[10px] uppercase flex items-center gap-1"
                                                            title={`Avançar para ${proxColuna.titulo}`}
                                                        >
                                                            Avançar →
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

            {/* MODAL DE DETALHES DO PEDIDO */}
            {pedidoSelecionado && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-base uppercase">
                                    Pedido #{pedidoSelecionado.orderNumber || pedidoSelecionado.codigo || pedidoSelecionado.id?.slice(0, 6).toUpperCase()}
                                </h3>
                                <span className="text-xs text-slate-400">Detalhes completos para produção e envio</span>
                            </div>
                            <button onClick={() => setPedidoSelecionado(null)} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block">Cliente</span>
                                <p className="font-black text-sm text-slate-800">{pedidoSelecionado.customerName || pedidoSelecionado.nome}</p>
                                <p className="font-bold text-emerald-600">{pedidoSelecionado.customerPhone || pedidoSelecionado.telefone}</p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block">Endereço de Entrega</span>
                                <p className="font-bold text-slate-700">{pedidoSelecionado.address || pedidoSelecionado.endereco || 'Não informado'}</p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Itens do Pedido</span>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                                    {(pedidoSelecionado.items || pedidoSelecionado.itens || []).map((it, i) => (
                                        <div key={i} className="flex justify-between font-bold">
                                            <span>{it.qtd || it.quantity || 1}x {it.name || it.nome}</span>
                                            <span>{formatMoney((it.price || it.preco || 0) * (it.qtd || it.quantity || 1))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="font-black uppercase text-slate-500">Valor Total ({pedidoSelecionado.formaPagamento || 'PIX'}):</span>
                                <span className="font-black text-lg text-emerald-600">{formatMoney(pedidoSelecionado.total || pedidoSelecionado.valorTotal)}</span>
                            </div>

                            <div className="pt-3 flex gap-2">
                                <a
                                    href={`https://wa.me/55${String(pedidoSelecionado.customerPhone || pedidoSelecionado.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${pedidoSelecionado.customerName || ''}! Estamos falando sobre o seu Pedido #${pedidoSelecionado.orderNumber || ''} na loja.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-center"
                                >
                                    Chamar Cliente no WhatsApp
                                </a>
                                <button
                                    onClick={() => excluirPedido(pedidoSelecionado.id)}
                                    className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-black uppercase"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}