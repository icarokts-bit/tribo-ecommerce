import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function Kanban({ user, permissoes }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const audioRef = useRef(null);
    const previousOrdersCount = useRef(0);

    const donoUid = permissoes?.donoUid || user?.uid;

    // Definição do funil de produção (Colunas do Kanban)
    const columns = [
        { id: 'pendente', title: 'Novos Pedidos', color: 'bg-blue-500', icon: 'inbox' },
        { id: 'producao', title: 'Na Impressora / Fabrico', color: 'bg-amber-500', icon: 'cpu' },
        { id: 'embalagem', title: 'Embalagem / Separação', color: 'bg-purple-500', icon: 'package' },
        { id: 'enviado', title: 'Enviado / Aguard. Retirada', color: 'bg-emerald-500', icon: 'truck' }
    ];

    useEffect(() => {
        if (!donoUid) return;

        // Cria o elemento de áudio para alertas de novos pedidos
        audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

        // Escuta os pedidos em tempo real (excluindo concluídos e cancelados do painel principal para não pesar)
        const unsubscribe = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery_orders`)
            .where('status', 'in', ['pendente', 'producao', 'embalagem', 'enviado'])
            .onSnapshot((snapshot) => {
                const fetchedOrders = [];
                snapshot.forEach(doc => {
                    fetchedOrders.push({ id: doc.id, ...doc.data() });
                });

                // Ordena por data (mais antigos primeiro para prioridade de produção)
                fetchedOrders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return dateA - dateB;
                });

                setOrders(fetchedOrders);
                setLoading(false);

                // Dispara o alerta sonoro se chegar um pedido novo (pendente)
                const currentPending = fetchedOrders.filter(o => o.status === 'pendente').length;
                if (currentPending > previousOrdersCount.current && previousOrdersCount.current !== 0) {
                    audioRef.current?.play().catch(e => console.log('Áudio bloqueado pelo navegador', e));
                }
                previousOrdersCount.current = currentPending;
            }, (error) => {
                console.error("Erro ao buscar pedidos:", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [donoUid]);

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery_orders/${orderId}`).update({
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(null); // Fecha o modal após mover o card
            }
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao mover o pedido. Tente novamente.");
        }
    };

    const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><Icon name="loader" size={40} className="animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            {/* Cabeçalho do Admin */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Icon name="trello" size={20}/></div>
                    <div>
                        <h1 className="font-black text-slate-800 text-lg uppercase tracking-widest leading-none">Painel de Produção</h1>
                        <span className="text-xs font-bold text-slate-500">Gestão de E-commerce 3D</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-slate-800">{user?.displayName || 'Administrador'}</p>
                        <p className="text-xs font-bold text-emerald-600">Online</p>
                    </div>
                </div>
            </header>

            {/* Quadro Kanban */}
            <main className="flex-1 overflow-x-auto p-6">
                <div className="flex gap-6 h-full items-start min-w-max">
                    {columns.map(col => {
                        const colOrders = orders.filter(o => o.status === col.id);
                        return (
                            <div key={col.id} className="w-80 h-full flex flex-col bg-slate-200/50 rounded-2xl border border-slate-200 overflow-hidden shrink-0">
                                <div className={`p-4 ${col.color} text-white flex items-center justify-between shrink-0 shadow-sm`}>
                                    <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                        <Icon name={col.icon} size={16} /> {col.title}
                                    </h2>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-black">{colOrders.length}</span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {colOrders.length === 0 ? (
                                        <div className="h-24 flex items-center justify-center text-slate-400 font-bold text-xs uppercase border-2 border-dashed border-slate-300 rounded-xl">
                                            Vazio
                                        </div>
                                    ) : (
                                        colOrders.map(order => (
                                            <div 
                                                key={order.id} 
                                                onClick={() => setSelectedOrder(order)}
                                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-black hover:shadow-md transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="bg-slate-800 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-widest">
                                                        #{order.orderNumber || order.id.slice(-5)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                
                                                <h3 className="font-black text-slate-800 text-sm mb-1">{order.clienteInfo?.name}</h3>
                                                <p className="text-xs font-bold text-slate-500 mb-3 truncate">
                                                    {order.tipoEntrega === 'delivery' ? order.clienteInfo?.bairro || 'Entrega' : 'Retirada/Local'}
                                                </p>
                                                
                                                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                                        <Icon name="package" size={12} /> {order.items?.length || 0} Itens
                                                    </span>
                                                    <span className="font-black text-emerald-600">{formatMoney(order.totalGeral)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Modal de Detalhes do Pedido */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                    Pedido #{selectedOrder.orderNumber || selectedOrder.id.slice(-5)}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-1">
                                    {new Date(selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate() : selectedOrder.createdAt).toLocaleString('pt-BR')}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-black hover:border-black transition-colors">
                                <Icon name="x" size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            
                            {/* Dados do Cliente e Entrega */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Cliente</h4>
                                    <p className="font-black text-slate-800">{selectedOrder.clienteInfo?.name}</p>
                                    <p className="text-sm font-bold text-slate-600 mt-1"><Icon name="phone" size={12} className="inline mr-1" /> {selectedOrder.clienteInfo?.phone}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                        {selectedOrder.tipoEntrega === 'delivery' ? 'Endereço de Entrega' : 'Retirada na Loja'}
                                    </h4>
                                    <p className="font-black text-slate-800 text-sm">{selectedOrder.clienteInfo?.address}</p>
                                    {selectedOrder.tipoEntrega === 'delivery' && (
                                        <p className="text-xs font-bold text-slate-600 mt-1">
                                            Nº {selectedOrder.clienteInfo?.numero} {selectedOrder.clienteInfo?.complemento && `- ${selectedOrder.clienteInfo?.complemento}`}
                                            <br/>Bairro: {selectedOrder.clienteInfo?.bairro}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Itens do Pedido */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-2">Itens para Produção</h4>
                                <div className="space-y-3">
                                    {(selectedOrder.items || []).map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-start bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                                            <div className="bg-slate-100 text-slate-800 font-black text-sm w-8 h-8 rounded flex items-center justify-center shrink-0">
                                                {item.qty}x
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-black text-slate-800 text-sm">{item.name}</p>
                                                    <span className="font-black text-slate-600">{formatMoney(item.price * item.qty)}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">SKU: {item.sku}</p>
                                                {item.variationsDesc && (
                                                    <p className="text-xs font-bold text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mt-1 border border-indigo-100">
                                                        {item.variationsDesc}
                                                    </p>
                                                )}
                                                {item.observation && (
                                                    <p className="text-xs font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-100">
                                                        Obs: {item.observation}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Observação Geral e Pagamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedOrder.clienteInfo?.observation && (
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl md:col-span-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Observação do Cliente</h4>
                                        <p className="text-sm font-bold text-amber-800">{selectedOrder.clienteInfo?.observation}</p>
                                    </div>
                                )}
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Pagamento</h4>
                                    <p className="font-black text-slate-800 uppercase">{selectedOrder.clienteInfo?.paymentMethod}</p>
                                    {selectedOrder.clienteInfo?.troco > 0 && (
                                        <p className="text-xs font-bold text-emerald-600 mt-1">Troco para {formatMoney(selectedOrder.clienteInfo?.troco)}</p>
                                    )}
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal</span><span>{formatMoney(selectedOrder.subtotal)}</span></div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500"><span>Frete</span><span>{formatMoney(selectedOrder.deliveryFee)}</span></div>
                                    {selectedOrder.discountAmount > 0 && <div className="flex justify-between text-xs font-bold text-blue-500"><span>Desconto</span><span>-{formatMoney(selectedOrder.discountAmount)}</span></div>}
                                    <div className="flex justify-between text-sm font-black text-slate-800 pt-2 border-t border-slate-200 mt-2">
                                        <span>Total</span><span>{formatMoney(selectedOrder.totalGeral)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botões de Ação do Kanban */}
                        <div className="p-5 border-t border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                            {selectedOrder.status === 'pendente' && (
                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'producao')} className="col-span-2 sm:col-span-4 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <Icon name="cpu" size={16}/> Mandar para Impressora
                                </button>
                            )}
                            {selectedOrder.status === 'producao' && (
                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'embalagem')} className="col-span-2 sm:col-span-4 bg-purple-500 hover:bg-purple-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <Icon name="package" size={16}/> Peça Pronta (Mandar p/ Embalagem)
                                </button>
                            )}
                            {selectedOrder.status === 'embalagem' && (
                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'enviado')} className="col-span-2 sm:col-span-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <Icon name="truck" size={16}/> Enviar / Liberar para Retirada
                                </button>
                            )}
                            {selectedOrder.status === 'enviado' && (
                                <button onClick={() => updateOrderStatus(selectedOrder.id, 'concluido')} className="col-span-2 sm:col-span-4 bg-slate-800 hover:bg-black text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <Icon name="check-circle" size={16}/> Marcar como Concluído
                                </button>
                            )}
                            
                            <button onClick={() => updateOrderStatus(selectedOrder.id, 'cancelado')} className="col-span-2 sm:col-span-4 mt-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-colors">
                                Cancelar Pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
            `}</style>
        </div>
    );
}