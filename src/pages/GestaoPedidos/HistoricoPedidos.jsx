import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function HistoricoPedidos({ user, permissoes, donoUid: propDonoUid }) {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
    const [pedidoDetalhes, setPedidoDetalhes] = useState(null);

    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;

    useEffect(() => {
        if (!donoUid) return;

        // Escuta em tempo real a coleção 'orders' e unifica com 'pedidos' e 'ecommerce_orders'
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
                console.error("Erro ao carregar histórico:", error);
                setLoading(false);
            });

        return () => unsub();
    }, [donoUid]);

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const normalizarStatus = (ped) => {
        const st = String(ped.status || ped.etapa || ped.orderStatus || 'novo').toLowerCase().trim();
        if (['concluido', 'finalizado', 'entregue', 'delivered', 'completed'].includes(st)) return 'concluido';
        if (['enviado', 'retirada', 'shipped'].includes(st)) return 'enviado';
        if (['embalagem', 'separacao', 'pronto', 'packing'].includes(st)) return 'embalagem';
        if (['producao', 'impressora', 'fabrico', 'printing'].includes(st)) return 'producao';
        if (['cancelado', 'cancelled', 'canceled'].includes(st)) return 'cancelado';
        return 'novo';
    };

    const getBadgeStatus = (statusNorm) => {
        switch (statusNorm) {
            case 'concluido':
                return { label: 'Finalizado / Entregue', classe: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
            case 'enviado':
                return { label: 'Enviado / Aguard. Retirada', classe: 'bg-teal-100 text-teal-800 border-teal-200' };
            case 'embalagem':
                return { label: 'Embalagem / Separação', classe: 'bg-purple-100 text-purple-800 border-purple-200' };
            case 'producao':
                return { label: 'Na Impressora / Fabrico', classe: 'bg-amber-100 text-amber-800 border-amber-200' };
            case 'cancelado':
                return { label: 'Cancelado', classe: 'bg-red-100 text-red-700 border-red-200' };
            default:
                return { label: 'Novo Pedido', classe: 'bg-blue-100 text-blue-800 border-blue-200' };
        }
    };

    const alterarStatusPedido = async (pedido, novoStatus) => {
        if (!donoUid) return;
        const atualizado = {
            ...pedido,
            status: novoStatus,
            etapa: novoStatus,
            orderStatus: novoStatus,
            updatedAt: new Date().toISOString()
        };

        setPedidos(prev => prev.map(p => p.id === pedido.id ? atualizado : p));
        if (pedidoDetalhes?.id === pedido.id) setPedidoDetalhes(atualizado);

        const colecoes = ['orders', 'pedidos', 'delivery_orders', 'ecommerce_orders'];
        try {
            await Promise.all(
                colecoes.map(col =>
                    db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/${col}`).doc(pedido.id).set(atualizado, { merge: true })
                )
            );
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };

    const excluirPedido = async (pedidoId) => {
        if (!window.confirm("Tem certeza que deseja excluir permanentemente este pedido do histórico?")) return;
        const colecoes = ['orders', 'pedidos', 'delivery_orders', 'ecommerce_orders'];
        try {
            await Promise.all(
                colecoes.map(col =>
                    db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/${col}`).doc(pedidoId).delete()
                )
            );
            setPedidos(prev => prev.filter(p => p.id !== pedidoId));
            setPedidoDetalhes(null);
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    };

    // Filtragem por busca, status e período
    const pedidosFiltrados = useMemo(() => {
        const termo = busca.toLowerCase().trim();
        const agora = new Date();

        return pedidos.filter(p => {
            const codigo = String(p.orderNumber || p.numeroPedido || p.codigo || p.id || '').toLowerCase();
            const nome = String(p.customerName || p.clienteNome || p.nomeCliente || p.nome || '').toLowerCase();
            const fone = String(p.customerPhone || p.clienteTelefone || p.telefone || p.whatsapp || '').toLowerCase();
            const itensTxt = String(p.resumoItens || '').toLowerCase();

            const bateBusca = !termo || codigo.includes(termo) || nome.includes(termo) || fone.includes(termo) || itensTxt.includes(termo);

            const stNorm = normalizarStatus(p);
            const bateStatus =
                filtroStatus === 'todos' ||
                (filtroStatus === 'finalizados' && (stNorm === 'concluido' || stNorm === 'enviado')) ||
                filtroStatus === stNorm;

            let batePeriodo = true;
            if (filtroPeriodo !== 'todos') {
                const dataPed = new Date(p.createdAt || p.dataPedido || p.timestamp || 0);
                const diffDias = (agora - dataPed) / (1000 * 60 * 60 * 24);
                if (filtroPeriodo === 'hoje') {
                    batePeriodo = dataPed.toDateString() === agora.toDateString();
                } else if (filtroPeriodo === '7dias') {
                    batePeriodo = diffDias <= 7;
                } else if (filtroPeriodo === '30dias') {
                    batePeriodo = diffDias <= 30;
                }
            }

            return bateBusca && bateStatus && batePeriodo;
        });
    }, [pedidos, busca, filtroStatus, filtroPeriodo]);

    // Métricas Resumo do Histórico
    const metricas = useMemo(() => {
        const validos = pedidosFiltrados.filter(p => normalizarStatus(p) !== 'cancelado');
        const totalPedidos = pedidosFiltrados.length;
        const faturamentoTotal = validos.reduce((acc, p) => acc + Number(p.total || p.valorTotal || p.totalAmount || 0), 0);
        const concluidos = pedidosFiltrados.filter(p => ['concluido', 'enviado'].includes(normalizarStatus(p))).length;
        const ticketMedio = validos.length > 0 ? faturamentoTotal / validos.length : 0;

        return { totalPedidos, faturamentoTotal, concluidos, ticketMedio };
    }, [pedidosFiltrados]);

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100 text-slate-800">
            
            {/* CABEÇALHO E MÉTRICAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total no Histórico</span>
                        <span className="text-2xl font-black text-slate-800 mt-1 block">{metricas.totalPedidos} pedido(s)</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <Icon name="archive" size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">Faturamento do Período</span>
                        <span className="text-2xl font-black text-emerald-600 mt-1 block">{formatMoney(metricas.faturamentoTotal)}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg">
                        R$
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">Enviados / Finalizados</span>
                        <span className="text-2xl font-black text-blue-600 mt-1 block">{metricas.concluidos}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon name="check-circle" size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider block">Ticket Médio</span>
                        <span className="text-2xl font-black text-purple-600 mt-1 block">{formatMoney(metricas.ticketMedio)}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Icon name="trending-up" size={20} />
                    </div>
                </div>
            </div>

            {/* BARRA DE FILTROS E TABELA DE HISTÓRICO */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                    
                    {/* Busca */}
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar por código (#A4302A), cliente, telefone ou produto..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-800"
                        />
                        <Icon name="search" size={15} className="absolute left-3 top-3 text-slate-400" />
                    </div>

                    {/* Seletores de Status e Período */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filtroStatus}
                            onChange={e => setFiltroStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="todos">Todos os Status</option>
                            <option value="finalizados">✓ Apenas Finalizados / Enviados</option>
                            <option value="novo">Novos Pedidos</option>
                            <option value="producao">Na Impressora / Fabrico</option>
                            <option value="embalagem">Embalagem / Separação</option>
                            <option value="enviado">Enviado / Aguard. Retirada</option>
                            <option value="concluido">Finalizado / Entregue</option>
                            <option value="cancelado">Cancelados</option>
                        </select>

                        <select
                            value={filtroPeriodo}
                            onChange={e => setFiltroPeriodo(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="todos">Todo o Período</option>
                            <option value="hoje">Hoje</option>
                            <option value="7dias">Últimos 7 dias</option>
                            <option value="30dias">Últimos 30 dias</option>
                        </select>
                    </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="p-4">Pedido / Data</th>
                                <th className="p-4">Cliente / Contato</th>
                                <th className="p-4">Itens do Pedido</th>
                                <th className="p-4">Pagamento</th>
                                <th className="p-4 text-center">Status Atual</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-400 font-bold text-xs">
                                        Carregando histórico de pedidos...
                                    </td>
                                </tr>
                            ) : pedidosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-14 text-center">
                                        <Icon name="inbox" size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs font-black uppercase text-slate-400">Nenhum pedido encontrado neste filtro.</p>
                                    </td>
                                </tr>
                            ) : (
                                pedidosFiltrados.map(ped => {
                                    const codigo = ped.orderNumber || ped.numeroPedido || ped.codigo || ped.id?.slice(0, 6).toUpperCase();
                                    const nomeCli = ped.customerName || ped.clienteNome || ped.nomeCliente || ped.nome || 'Cliente';
                                    const foneCli = ped.customerPhone || ped.clienteTelefone || ped.telefone || ped.whatsapp || '';
                                    const total = ped.total || ped.valorTotal || ped.totalAmount || 0;
                                    const listaItens = Array.isArray(ped.items) ? ped.items : Array.isArray(ped.itens) ? ped.itens : [];
                                    const resumo = listaItens.length > 0
                                        ? listaItens.map(i => `${i.qtd || i.quantity || 1}x ${i.name || i.nome}`).join(', ')
                                        : (ped.resumoItens || '1x Produto');
                                    const dataFormatada = ped.createdAt
                                        ? new Date(ped.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : '-';

                                    const stNorm = normalizarStatus(ped);
                                    const badge = getBadgeStatus(stNorm);

                                    return (
                                        <tr key={ped.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4">
                                                <span className="font-black text-xs bg-slate-900 text-white px-2.5 py-1 rounded">
                                                    #{codigo}
                                                </span>
                                                <span className="block text-[11px] font-bold text-slate-400 mt-1">{dataFormatada}</span>
                                            </td>

                                            <td className="p-4">
                                                <p className="font-black text-sm text-slate-800">{nomeCli}</p>
                                                {foneCli && (
                                                    <a
                                                        href={`https://wa.me/55${String(foneCli).replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <Icon name="phone" size={12} /> {foneCli}
                                                    </a>
                                                )}
                                            </td>

                                            <td className="p-4 max-w-xs">
                                                <p className="text-xs font-bold text-slate-700 line-clamp-2">{resumo}</p>
                                                {(ped.address || ped.endereco) && (
                                                    <span className="text-[10px] font-semibold text-slate-400 block truncate mt-0.5">
                                                        📍 {ped.address || ped.endereco}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                                                    {ped.formaPagamento || ped.paymentMethod || 'PIX'}
                                                </span>
                                            </td>

                                            <td className="p-4 text-center">
                                                <select
                                                    value={stNorm}
                                                    onChange={e => alterarStatusPedido(ped, e.target.value)}
                                                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border outline-none cursor-pointer ${badge.classe}`}
                                                >
                                                    <option value="novo">Novo Pedido</option>
                                                    <option value="producao">Na Impressora / Fabrico</option>
                                                    <option value="embalagem">Embalagem / Separação</option>
                                                    <option value="enviado">Enviado / Aguard. Retirada</option>
                                                    <option value="concluido">✓ Finalizado / Entregue</option>
                                                    <option value="cancelado">✕ Cancelado</option>
                                                </select>
                                            </td>

                                            <td className="p-4 text-right font-black text-sm text-emerald-600">
                                                {formatMoney(total)}
                                            </td>

                                            <td className="p-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setPedidoDetalhes(ped)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"
                                                    title="Ver Detalhes"
                                                >
                                                    <Icon name="eye" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => excluirPedido(ped.id)}
                                                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                                                    title="Excluir"
                                                >
                                                    <Icon name="trash-2" size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE VISUALIZAÇÃO COMPLETA DO PEDIDO */}
            {pedidoDetalhes && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-base uppercase">
                                    Pedido #{pedidoDetalhes.orderNumber || pedidoDetalhes.codigo || pedidoDetalhes.id?.slice(0, 6).toUpperCase()}
                                </h3>
                                <span className="text-xs text-slate-400">Ficha completa do histórico</span>
                            </div>
                            <button onClick={() => setPedidoDetalhes(null)} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Cliente</span>
                                    <p className="font-black text-sm text-slate-800">{pedidoDetalhes.customerName || pedidoDetalhes.nome}</p>
                                    <p className="font-bold text-emerald-600">{pedidoDetalhes.customerPhone || pedidoDetalhes.telefone}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Pagamento</span>
                                    <p className="font-black text-sm text-slate-800">{pedidoDetalhes.formaPagamento || pedidoDetalhes.paymentMethod || 'PIX'}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block">Endereço de Entrega</span>
                                <p className="font-bold text-slate-700">{pedidoDetalhes.address || pedidoDetalhes.endereco || 'Não informado'}</p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Itens Comprados</span>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                                    {(pedidoDetalhes.items || pedidoDetalhes.itens || []).map((it, i) => (
                                        <div key={i} className="flex justify-between font-bold">
                                            <span>{it.qtd || it.quantity || 1}x {it.name || it.nome}</span>
                                            <span>{formatMoney((it.price || it.preco || 0) * (it.qtd || it.quantity || 1))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="font-black uppercase text-slate-500">Valor Total:</span>
                                <span className="font-black text-xl text-emerald-600">{formatMoney(pedidoDetalhes.total || pedidoDetalhes.valorTotal)}</span>
                            </div>

                            <div className="pt-2 flex gap-2">
                                {normalizarStatus(pedidoDetalhes) !== 'concluido' && (
                                    <button
                                        onClick={() => alterarStatusPedido(pedidoDetalhes, 'concluido')}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-center"
                                    >
                                        ✓ Marcar como Entregue
                                    </button>
                                )}
                                <button
                                    onClick={() => setPedidoDetalhes(null)}
                                    className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black uppercase"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}