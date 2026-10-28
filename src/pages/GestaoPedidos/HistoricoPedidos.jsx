import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';

export default function HistoricoPedidos() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    // Filtros de Data (Padrão: Mês Atual)
    const dataAtual = new Date();
    const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(primeiroDiaMes);
    const [endDate, setEndDate] = useState(ultimoDiaMes);

    const formatMoney = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const formatDateTime = (isoString) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const ordersPath = `artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`;
        
        // Busca todos os pedidos
        const unsubscribe = db.collection(ordersPath)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOrders(fetchedOrders);
                setLoading(false);
            }, error => {
                console.error("Erro ao buscar histórico:", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filtra e ordena os pedidos
    const processedOrders = useMemo(() => {
        let filtered = orders.filter(order => {
            if (!order.createdAt) return false;
            const orderDate = order.createdAt.split('T')[0];
            const isWithinDate = orderDate >= startDate && orderDate <= endDate;
            const isConcluido = order.status === 'concluido'; // Mostra apenas finalizados no histórico
            
            const matchSearch = searchQuery === '' || 
                (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (order.orderNumber && String(order.orderNumber).includes(searchQuery));

            return isWithinDate && isConcluido && matchSearch;
        });

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [orders, startDate, endDate, searchQuery, sortConfig]);

    // Cálculos de Métricas do Período
    const totalFaturado = processedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalTaxasEntrega = processedOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
    const totalPedidos = processedOrders.length;
    const ticketMedio = totalPedidos > 0 ? totalFaturado / totalPedidos : 0;

    if (loading) return <div className="p-10 text-center font-black text-emerald-500 uppercase">Carregando Histórico...</div>;

    const SortIcon = ({ columnKey }) => (
        <span className={`ml-1 inline-block transition-colors cursor-pointer ${sortConfig.key === columnKey ? 'text-emerald-500' : 'text-slate-300'}`}>
            {sortConfig.key === columnKey ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    return (
        // Alterado de max-w-7xl para w-full
        <div className="w-full px-4 lg:px-8 mx-auto mt-2 pb-10 fade-in">
            
            {/* CABEÇALHO E FILTROS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-6 justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-1">
                        <Icon name="clock" size={20} className="text-emerald-500" /> Histórico de Pedidos
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Relatório de Vendas do Delivery
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Pesquisa */}
                    <div className="relative">
                        <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente ou pedido..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-colors bg-slate-50"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                        <Icon name="calendar" size={16} className="text-slate-400 ml-2" />
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer"
                            />
                            <span className="text-slate-300 font-black">até</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* CARDS DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-emerald-500">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total Faturado</span>
                        <span className="text-2xl font-black text-slate-800">{formatMoney(totalFaturado)}</span>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500"><Icon name="dollar-sign" size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-indigo-500">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Pedidos Concluídos</span>
                        <span className="text-2xl font-black text-slate-800">{totalPedidos}</span>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500"><Icon name="shopping-bag" size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-amber-500">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Ticket Médio</span>
                        <span className="text-2xl font-black text-slate-800">{formatMoney(ticketMedio)}</span>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500"><Icon name="pie-chart" size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between border-l-4 border-l-blue-500">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Taxas de Entrega</span>
                        <span className="text-2xl font-black text-slate-800">{formatMoney(totalTaxasEntrega)}</span>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500"><Icon name="truck" size={18} /></div>
                </div>
            </div>

            {/* TABELA DE PEDIDOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 select-none">
                                <th onClick={() => handleSort('createdAt')} className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer hover:bg-slate-100 transition-colors w-32">
                                    Data / Hora <SortIcon columnKey="createdAt" />
                                </th>
                                <th onClick={() => handleSort('customerName')} className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cliente <SortIcon columnKey="customerName" />
                                </th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest min-w-[250px]">
                                    Resumo do Pedido
                                </th>
                                <th onClick={() => handleSort('paymentMethod')} className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors">
                                    Pagamento <SortIcon columnKey="paymentMethod" />
                                </th>
                                <th onClick={() => handleSort('total')} className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                    Valor Total <SortIcon columnKey="total" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center">
                                        <Icon name="inbox" size={48} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-slate-400 font-bold text-sm uppercase">Nenhum pedido encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                processedOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="text-xs font-black text-slate-600">
                                                {formatDateTime(order.createdAt).split(' ')[0]}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {formatDateTime(order.createdAt).split(' ')[1]}
                                                {order.orderNumber && <span className="ml-1 text-slate-300">#{order.orderNumber}</span>}
                                            </div>
                                        </td>
                                        
                                        <td className="p-4">
                                            <div className="font-black text-slate-800 text-sm uppercase">{order.customerName}</div>
                                            <div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate max-w-[200px]" title={order.address}>
                                                {order.address !== 'Retirada no Balcão' ? (
                                                    <span className="flex items-center gap-1"><Icon name="map-pin" size={10}/> {order.address}</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-amber-600"><Icon name="shopping-bag" size={10}/> Retirada</span>
                                                )}
                                            </div>
                                        </td>
                                        
                                        <td className="p-4">
                                            <div className="text-xs font-bold text-slate-600 whitespace-pre-wrap leading-tight">
                                                {order.items}
                                            </div>
                                        </td>
                                        
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                                order.paymentMethod === 'Pix' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                                order.paymentMethod === 'Dinheiro' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                            }`}>
                                                {order.paymentMethod}
                                            </span>
                                        </td>
                                        
                                        <td className="p-4 text-right">
                                            <div className="font-black text-emerald-600 text-base">
                                                {formatMoney(order.total)}
                                            </div>
                                            {order.deliveryFee > 0 && (
                                                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                                                    Inclui {formatMoney(order.deliveryFee)} entrega
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}