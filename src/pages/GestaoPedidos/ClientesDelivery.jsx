import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';

export default function ClientesDelivery() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent'); 
    const [pontosPorReal, setPontosPorReal] = useState(1); 

    // Estados para Modais de Edição e Exclusão
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatPhoneForWhatsApp = (phone) => {
        if (!phone) return '';
        const justNumbers = String(phone).replace(/\D/g, '');
        if (justNumbers.length === 10 || justNumbers.length === 11) {
            return `55${justNumbers}`;
        }
        return justNumbers;
    };

    const formatarTelefone = (telefone) => {
        if (!telefone) return '';
        let limpo = String(telefone).replace(/\D/g, '');
        if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;
        return limpo;
    };

    // ==========================================
    // NORMALIZADOR PARA CRUZAMENTO DE DADOS 
    // ==========================================
    const normalizePhone = (p) => {
        if (!p) return "";
        let num = String(p).replace(/\D/g, ""); 
        if (num.startsWith("55") && num.length >= 12) {
            num = num.substring(2);
        }
        if (num.length === 11 && num[2] === '9') {
            num = num.substring(0, 2) + num.substring(3);
        }
        return num;
    };

    const checkPhoneMatch = (tel1, tel2) => {
        const n1 = normalizePhone(tel1);
        const n2 = normalizePhone(tel2);
        if (!n1 || !n2 || n1.length < 8 || n2.length < 8) return false;
        return n1 === n2 || n1.endsWith(n2) || n2.endsWith(n1); 
    };

    const getCustomerPoints = (c) => {
        return Number(c.manualPoints !== undefined ? c.manualPoints : (c.points !== undefined ? c.points : (c.pontos || 0)));
    };

    // LEITOR INTELIGENTE DE PONTOS USADOS (Busca do banco de dados e de observações antigas)
    const getPontosUsados = (order) => {
        if (order.pontosUsados) return Number(order.pontosUsados);
        if (order.observation && order.observation.includes('RESGATE DE')) {
            const match = order.observation.match(/RESGATE DE (\d+) PONTOS/);
            if (match) return parseInt(match[1]);
        }
        return 0;
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. Busca primeiro a configuração de pontos por Real
        db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/cmv_data/state`).get().then(doc => {
            if (doc.exists && doc.data().settings && doc.data().settings.fidelidade_pontosPorReal) {
                setPontosPorReal(parseFloat(doc.data().settings.fidelidade_pontosPorReal));
            }
        });

        let currentCustomers = [];
        let currentOrders = [];
        let hasLoadedCustomers = false;
        let hasLoadedOrders = false;

        const processMetrics = () => {
            // 1. UNIFICAÇÃO DE CLIENTES DUPLICADOS
            const unifiedCustomers = [];

            currentCustomers.forEach(cust => {
                const normPhone = normalizePhone(cust.phone);
                const normName = cust.name ? cust.name.trim().toLowerCase() : '';
                
                // Procura se já existe um cliente igual (por telefone ou nome)
                const existing = unifiedCustomers.find(u => {
                    const uNormPhone = normalizePhone(u.phone);
                    const uNormName = u.name ? u.name.trim().toLowerCase() : '';
                    
                    const phoneMatch = normPhone && uNormPhone && checkPhoneMatch(cust.phone, u.phone);
                    const nameMatch = normName && uNormName && normName === uNormName;
                    
                    return phoneMatch || nameMatch;
                });
                
                if (existing) {
                    if (!existing.phone && cust.phone) existing.phone = cust.phone;
                    if ((!existing.name || existing.name === 'Cliente') && cust.name && cust.name !== 'Cliente') {
                        existing.name = cust.name;
                    }
                    existing.manualPoints = (Number(existing.manualPoints) || 0) + getCustomerPoints(cust);
                } else {
                    unifiedCustomers.push({ ...cust, manualPoints: getCustomerPoints(cust) });
                }
            });

            // 2. CONTABILIDADE REAL (CÁLCULO DIRETO DOS PEDIDOS E HISTÓRICO DE RESGATES)
            const processed = unifiedCustomers.map(cust => {
                const myOrders = currentOrders.filter(o => {
                    if (o.status === 'cancelado' || o.status === 'recusado') return false;
                    if (checkPhoneMatch(cust.phone, o.customerPhone)) return true;
                    if (!cust.phone && cust.name && o.customerName && cust.name.trim().toLowerCase() === o.customerName.trim().toLowerCase()) return true;
                    return false;
                });

                const realOrdersCount = myOrders.length;
                const realSpent = myOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                
                // Calcula exatamente quantos pontos o cliente já usou
                const ptsUsados = myOrders.reduce((sum, o) => sum + getPontosUsados(o), 0);
                
                // Filtra apenas os pedidos onde o cliente fez um resgate para criar o histórico
                const resgatesHistory = myOrders.filter(o => getPontosUsados(o) > 0);
                resgatesHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                myOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const realLastDate = myOrders.length > 0 ? myOrders[0].createdAt : cust.lastOrderDate;

                return {
                    ...cust,
                    totalOrders: realOrdersCount > 0 ? realOrdersCount : (Number(cust.totalOrders) || 0),
                    totalSpent: realSpent > 0 ? realSpent : (Number(cust.totalSpent) || 0),
                    pontosUsadosReais: ptsUsados,
                    resgates: resgatesHistory,
                    lastOrderDate: realLastDate || cust.createdAt
                };
            });
            
            setCustomers(processed);
            if (hasLoadedCustomers && hasLoadedOrders) {
                setLoading(false);
            }
        };

        const unsubCustomers = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_customers`)
            .onSnapshot(snap => {
                currentCustomers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                hasLoadedCustomers = true;
                processMetrics();
            }, error => {
                console.error("Erro ao buscar clientes:", error);
                setLoading(false);
            });

        const unsubOrders = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
            .onSnapshot(snap => {
                currentOrders = snap.docs.map(doc => doc.data());
                hasLoadedOrders = true;
                processMetrics();
            }, error => {
                console.error("Erro ao buscar pedidos para cálculo:", error);
            });

        return () => {
            unsubCustomers();
            unsubOrders();
        };
    }, []);

    // ==========================================
    // FUNÇÕES DE CRUD (EDITAR E EXCLUIR)
    // ==========================================
    const openEditModal = (customer) => {
        setEditingCustomer({ ...customer });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingCustomer.name) {
            alert("O nome do cliente é obrigatório.");
            return;
        }

        let telefoneFormatado = '';

        if (editingCustomer.phone) {
            const limpo = String(editingCustomer.phone).replace(/\D/g, '');
            const numeroNacional = limpo.startsWith('55') && limpo.length >= 12 ? limpo.substring(2) : limpo;
            
            if (numeroNacional.length !== 11 || numeroNacional[2] !== '9') {
                alert("Número de telefone inválido!\nCertifique-se de colocar o DDD e o número 9.\nExemplo correto: 11 99999-9999");
                return;
            }
            telefoneFormatado = formatarTelefone(editingCustomer.phone);
        }
        
        try {
            const user = auth.currentUser;
            if (!user) return;
            
            await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_customers/${editingCustomer.id}`).update({
                name: editingCustomer.name,
                phone: telefoneFormatado,
                address: editingCustomer.address || '',
                manualPoints: Number(editingCustomer.manualPoints) || 0
            });
            
            setIsEditModalOpen(false);
            setEditingCustomer(null);
        } catch (error) {
            console.error("Erro ao atualizar cliente:", error);
            alert("Erro ao salvar alterações.");
        }
    };

    const openDeleteModal = (customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            const user = auth.currentUser;
            if (!user || !customerToDelete) return;
            
            await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_customers/${customerToDelete.id}`).delete();
            
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            alert("Erro ao excluir cliente.");
        }
    };

    // Filtro e Ordenação
    const filteredCustomers = customers.filter(c => {
        const matchName = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchPhone = c.phone?.includes(searchQuery);
        return matchName || matchPhone;
    }).sort((a, b) => {
        if (sortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0);
        if (sortBy === 'orders') return (b.totalOrders || 0) - (a.totalOrders || 0);
        return new Date(b.lastOrderDate || 0) - new Date(a.lastOrderDate || 0); 
    });

    // Métricas Globais com Proteção contra NaN
    const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);
    const totalOrdersAll = customers.reduce((sum, c) => sum + (Number(c.totalOrders) || 0), 0);
    const averageTicket = totalOrdersAll > 0 ? totalRevenue / totalOrdersAll : 0;

    if (loading) return <div className="p-10 text-center font-black text-emerald-500 uppercase tracking-widest">Carregando CRM de Clientes...</div>;

    return (
        // AJUSTE DE LARGURA PARA 100% DO ECRÃ (Tiramos o max-w-7xl e passamos para w-full)
        <div className="w-full px-4 lg:px-8 mx-auto mt-2 pb-10 fade-in relative">
            
            {/* CABEÇALHO E MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 md:col-span-1">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-1">
                        <Icon name="users" size={20} className="text-emerald-500" /> Clientes
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Seu banco de dados</p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total Cadastrados</span>
                        <span className="text-2xl font-black text-slate-800">{customers.length}</span>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100"><Icon name="user" size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-emerald-500 mb-1">Receita Gerada</span>
                        <span className="text-2xl font-black text-emerald-600">{formatMoney(totalRevenue)}</span>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100"><Icon name="dollar-sign" size={18} /></div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <span className="block text-[10px] font-black uppercase text-indigo-500 mb-1">Ticket Médio</span>
                        <span className="text-2xl font-black text-indigo-600">{formatMoney(averageTicket)}</span>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 border border-indigo-100"><Icon name="pie-chart" size={18} /></div>
                </div>
            </div>

            {/* CONTROLES (BUSCA E ORDENAÇÃO) */}
            <div className="bg-white p-4 rounded-t-2xl border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center mt-2">
                <div className="relative flex-1 max-w-md">
                    <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou telefone..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Icon name="filter" size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-slate-500 hidden md:block">Ordenar por:</span>
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent font-black text-emerald-600 text-sm outline-none cursor-pointer"
                    >
                        <option value="recent">Mais Recentes</option>
                        <option value="spent">Maior Gasto (Top Clientes)</option>
                        <option value="orders">Mais Pedidos</option>
                    </select>
                </div>
            </div>

            {/* TABELA DE CLIENTES */}
            <div className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-slate-200 overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Contato</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hidden md:table-cell">Endereço Principal</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Histórico</th>
                                <th className="p-4 text-[10px] font-black uppercase text-purple-600 tracking-widest text-center">Fidelidade</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Gasto</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center">
                                        <Icon name="users" size={48} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-slate-400 font-bold text-sm uppercase">Nenhum cliente encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map(customer => {
                                    const totalGasto = customer.totalSpent || 0;
                                    const pontosCompras = Math.floor(totalGasto * pontosPorReal);
                                    
                                    // LÓGICA EXATA
                                    let pontosCalculados = pontosCompras;
                                    if ((customer.manualPoints || 0) > 0) {
                                        pontosCalculados += customer.manualPoints;
                                    }
                                    pontosCalculados -= (customer.pontosUsadosReais || 0);

                                    const pontosTotais = Math.max(0, pontosCalculados);

                                    return (
                                        <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm flex-shrink-0 border border-emerald-200">
                                                        {customer.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-sm flex items-center gap-2 whitespace-nowrap">
                                                            {customer.name}
                                                            {(customer.totalOrders || 0) >= 5 && (
                                                                <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest border border-amber-200" title="Cliente VIP">VIP</span>
                                                            )}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-slate-400">Cliente desde {formatDate(customer.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <td className="p-4">
                                                {customer.phone ? (
                                                    <a 
                                                        href={`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-black transition-colors border border-emerald-100 hover:border-emerald-500 whitespace-nowrap"
                                                    >
                                                        <Icon name="message-circle" size={14} />
                                                        {customer.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 text-xs font-bold italic">Não informado</span>
                                                )}
                                            </td>
                                            
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="text-xs font-bold text-slate-600 max-w-[200px] truncate" title={customer.address}>
                                                    {customer.address || '-'}
                                                </div>
                                            </td>
                                            
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-black mb-1 whitespace-nowrap">
                                                        {customer.totalOrders || 0} {(customer.totalOrders || 0) === 1 ? 'pedido' : 'pedidos'}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                                        Último: {formatDate(customer.lastOrderDate)}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg font-black text-sm border border-purple-100 whitespace-nowrap" title="Pontos Atuais Livres">
                                                        <Icon name="gift" size={12} className="inline mr-1 -mt-0.5" /> 
                                                        {pontosTotais} pts
                                                    </span>
                                                    {customer.pontosUsadosReais > 0 && (
                                                        <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest whitespace-nowrap">
                                                            Usados: {customer.pontosUsadosReais} pts
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            <td className="p-4 text-right">
                                                <div className="font-black text-emerald-600 text-base whitespace-nowrap">
                                                    {formatMoney(totalGasto)}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase whitespace-nowrap">
                                                    TM: {formatMoney(totalGasto / Math.max(customer.totalOrders || 1, 1))}
                                                </div>
                                            </td>

                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => openEditModal(customer)} 
                                                        className="p-2 text-slate-400 hover:text-blue-500 bg-white border border-slate-200 shadow-sm rounded-lg transition-colors" 
                                                        title="Editar Cliente e Ver Resgates"
                                                    >
                                                        <Icon name="edit-2" size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(customer)} 
                                                        className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 shadow-sm rounded-lg transition-colors" 
                                                        title="Excluir Cliente"
                                                    >
                                                        <Icon name="trash-2" size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE EDIÇÃO */}
            {isEditModalOpen && editingCustomer && (
                <div className="modal-overlay z-[100] fixed inset-0 bg-black/50 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-up-center flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                <Icon name="edit-3" size={16} className="text-emerald-400" /> Detalhes do Cliente
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
                        </div>
                        
                        <div className="p-6 space-y-4 bg-slate-50 overflow-y-auto flex-1 custom-scrollbar">
                            
                            {/* BLOCO EXPLICATIVO DE PONTOS */}
                            {(() => {
                                const calcGasto = editingCustomer.totalSpent || 0;
                                const calcCompras = Math.floor(calcGasto * pontosPorReal);
                                const calcResgates = editingCustomer.pontosUsadosReais || 0;
                                const calcManuais = Number(editingCustomer.manualPoints) || 0;
                                const calcTotal = Math.max(0, calcCompras + calcManuais - calcResgates);

                                return (
                                    <div className="bg-purple-100/50 border border-purple-200 p-4 rounded-xl flex flex-col gap-2 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase text-purple-700 flex items-center gap-1"><Icon name="award" size={14}/> Saldo Total Atual</span>
                                            <span className="text-xl font-black text-purple-700">{calcTotal} pts</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-purple-600/70 border-t border-purple-200/50 pt-2">
                                            <span>Compras: +{calcCompras}</span>
                                            <span>Resgates: -{calcResgates}</span>
                                            <span>Manuais: {calcManuais >= 0 ? `+${calcManuais}` : calcManuais}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* HISTÓRICO DE RESGATES DO CLIENTE */}
                            {editingCustomer.resgates && editingCustomer.resgates.length > 0 && (
                                <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-100 p-2.5 border-b border-slate-200">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Histórico de Resgates</span>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar bg-white p-2 space-y-2">
                                        {editingCustomer.resgates.map(resgate => {
                                            const dt = new Date(resgate.createdAt);
                                            const numPedido = resgate.orderNumber || resgate.id.substring(0, 5).toUpperCase();
                                            const pts = getPontosUsados(resgate);
                                            return (
                                                <div key={resgate.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-700">Pedido #{numPedido}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">{dt.toLocaleDateString('pt-BR')} {dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                                    </div>
                                                    <span className="text-[11px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded">
                                                        - {pts} pts
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Nome Completo *</label>
                                <input 
                                    type="text" 
                                    value={editingCustomer.name} 
                                    onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} 
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold mt-1 outline-none focus:border-emerald-500 shadow-inner" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500">Telefone / WhatsApp</label>
                                    <input 
                                        type="text" 
                                        value={editingCustomer.phone} 
                                        onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} 
                                        className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold mt-1 outline-none focus:border-emerald-500 shadow-inner" 
                                        placeholder="Ex: 11 99999-9999"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-1 block leading-tight">Obrigatório colocar DDD e o dígito 9.</span>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase text-purple-600 flex items-center gap-1"><Icon name="edit-2" size={12}/> Alterar Pontos Manuais</label>
                                    <input 
                                        type="number" 
                                        value={editingCustomer.manualPoints || 0} 
                                        onChange={e => setEditingCustomer({...editingCustomer, manualPoints: Number(e.target.value)})} 
                                        className="w-full p-3 border border-purple-200 bg-white rounded-xl text-xs font-black text-purple-700 mt-1 outline-none focus:border-purple-500 shadow-inner" 
                                        placeholder="Ex: 150"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-1 block leading-tight">Apenas para correções ou bónus extra.</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500">Endereço Principal</label>
                                <textarea 
                                    value={editingCustomer.address} 
                                    onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} 
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold mt-1 outline-none focus:border-emerald-500 shadow-inner" 
                                    rows="2"
                                    placeholder="Ex: Rua das Flores, 123 - Bairro Centro"
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-xl transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase rounded-xl shadow-md transition-colors">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {isDeleteModalOpen && customerToDelete && (
                <div className="modal-overlay z-[100] fixed inset-0 bg-black/50 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center scale-up-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100">
                            <Icon name="alert-triangle" size={32} />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 mb-2">Excluir Cliente?</h3>
                        <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                            Tem a certeza que deseja apagar permanentemente o cliente <span className="text-slate-800 font-black">"{customerToDelete.name}"</span>? Esta ação não pode ser revertida e limpará o CRM deste contacto.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-xl transition-colors">Cancelar</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase rounded-xl shadow-md transition-colors">Sim, Excluir</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
            `}</style>
        </div>
    );
}