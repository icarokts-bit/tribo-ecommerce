import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getLocalDateStr = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getFirstDayOfMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

const ToggleSwitch = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked || false} onChange={onChange} />
        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
    </label>
);

export default function Fidelidade() {
    const [activeTab, setActiveTab] = useState('recompensas'); 
    const [settings, setSettings] = useState({});
    const [catalogItems, setCatalogItems] = useState([]);
    
    const [allOrders, setAllOrders] = useState([]); 
    const [filteredOrders, setFilteredOrders] = useState([]); 
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getLocalDateStr());

    // Modais de Recompensa
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discountForm, setDiscountForm] = useState({ valor: '', pontos: '' });
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedRewardProducts, setSelectedRewardProducts] = useState([]);
    const [rewardMultiplier, setRewardMultiplier] = useState(20);

    // Modais do Pontuador Manual
    const [isPontuadorOpen, setIsPontuadorOpen] = useState(false);
    const [pontuadorTab, setPontuadorTab] = useState('add');
    const [pontuadorClientQuery, setPontuadorClientQuery] = useState('');
    const [pontuadorSelectedClient, setPontuadorSelectedClient] = useState(null);
    const [pontuadorPoints, setPontuadorPoints] = useState('');
    const [pontuadorKeepOpen, setPontuadorKeepOpen] = useState(false);

    const normalizePhone = (p) => {
        if (!p) return "";
        let num = String(p).replace(/\D/g, ""); 
        if (num.startsWith("55") && num.length >= 12) num = num.substring(2);
        if (num.length === 11 && num[2] === '9') num = num.substring(0, 2) + num.substring(3);
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

    // LEITOR INTELIGENTE DE PONTOS USADOS (Resgata de pedidos novos e antigos)
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

        const fetchData = async () => {
            try {
                const stateDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/cmv_data/state`).get();
                if (stateDoc.exists && stateDoc.data().settings) setSettings(stateDoc.data().settings);

                const catDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery/catalog_state`).get();
                if (catDoc.exists && catDoc.data().products) setCatalogItems(catDoc.data().products.filter(p => p.isActive));

                const unsubOrders = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                    .onSnapshot(snapshot => {
                        const fetchedAllOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setAllOrders(fetchedAllOrders);

                        const start = new Date(startDate + 'T00:00:00Z').getTime();
                        const end = new Date(endDate + 'T23:59:59Z').getTime();
                        const filtered = fetchedAllOrders.filter(o => {
                            const oDate = new Date(o.createdAt).getTime();
                            return oDate >= start && oDate <= end;
                        });
                        setFilteredOrders(filtered);
                    });

                const unsubCustomers = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_customers`)
                    .onSnapshot(snapshot => {
                        const rawCustomers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setCustomers(rawCustomers);
                    });

                setLoading(false);

                return () => { unsubOrders(); unsubCustomers(); };
            } catch (error) {
                console.error("Erro ao buscar dados da fidelidade:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]);

    const unifiedCustomersList = useMemo(() => {
        if (!allOrders.length || !customers.length) return [];
        
        const unifiedCustomers = [];
        
        customers.forEach(cust => {
            const normPhone = normalizePhone(cust.phone);
            const normName = cust.name ? cust.name.trim().toLowerCase() : '';
            
            const existing = unifiedCustomers.find(u => {
                const uNormPhone = normalizePhone(u.phone);
                const uNormName = u.name ? u.name.trim().toLowerCase() : '';
                
                const phoneMatch = normPhone && uNormPhone && checkPhoneMatch(cust.phone, u.phone);
                const nameMatch = normName && uNormName && normName === uNormName;
                
                return phoneMatch || nameMatch;
            });
            
            const custPoints = getCustomerPoints(cust);

            if (existing) {
                if (!existing.phone && cust.phone) existing.phone = cust.phone;
                if ((!existing.name || existing.name === 'Cliente') && cust.name && cust.name !== 'Cliente') {
                    existing.name = cust.name;
                }
                existing.manualPoints = (Number(existing.manualPoints) || 0) + custPoints;
            } else {
                unifiedCustomers.push({ 
                    ...cust, 
                    totalSpent: 0,
                    manualPoints: custPoints 
                });
            }
        });

        const finalCustomers = unifiedCustomers.map(cust => {
            const myOrders = allOrders.filter(o => {
                if (o.status === 'cancelado' || o.status === 'recusado') return false;
                if (checkPhoneMatch(cust.phone, o.customerPhone)) return true;
                if (!cust.phone && cust.name && o.customerName && cust.name.trim().toLowerCase() === o.customerName.trim().toLowerCase()) return true;
                return false;
            });

            const realSpent = myOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            const ptsUsados = myOrders.reduce((sum, o) => sum + getPontosUsados(o), 0);

            return {
                ...cust,
                totalSpent: realSpent,
                pontosUsadosReais: ptsUsados
            };
        });

        finalCustomers.sort((a,b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        return finalCustomers;

    }, [allOrders, customers]);


    const saveSettings = async (newSettings) => {
        setSettings(newSettings);
        const user = auth.currentUser;
        if (!user) return;
        await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/cmv_data/state`).set({ settings: newSettings }, { merge: true });
    };

    const updateSetting = (campo, valor) => {
        const newSettings = { ...settings, [campo]: valor };
        saveSettings(newSettings);
    };

    // --- GERENCIAMENTO DE RECOMPENSAS ---
    const recompensasDescontos = settings.fidelidade_descontos || [];
    const recompensasProdutos = settings.fidelidade_produtos || [];
    const pontosPorReal = parseFloat(settings.fidelidade_pontosPorReal) || 1;
    const pontosParaTroca = parseInt(settings.fidelidade_pontosTroca) || 100;

    const handleAddDiscount = () => {
        if (!discountForm.valor || !discountForm.pontos) return;
        const newSettings = {
            ...settings,
            fidelidade_descontos: [
                ...recompensasDescontos,
                { id: crypto.randomUUID(), valor: parseFloat(discountForm.valor), pontos: parseInt(discountForm.pontos) }
            ]
        };
        saveSettings(newSettings);
        setIsDiscountModalOpen(false);
        setDiscountForm({ valor: '', pontos: '' });
    };

    const handleRemoveDiscount = (id) => {
        if (!window.confirm("Remover este desconto?")) return;
        const newSettings = { ...settings, fidelidade_descontos: recompensasDescontos.filter(d => d.id !== id) };
        saveSettings(newSettings);
    };

    const handleAddProduct = () => {
        if (selectedRewardProducts.length === 0 || !rewardMultiplier) return;
        const novosProdutos = selectedRewardProducts.map(pid => {
            const produtoCat = catalogItems.find(p => p.id === pid);
            if (!produtoCat) return null;
            const existing = recompensasProdutos.find(rp => rp.productId === pid);
            if (existing) return null;
            return {
                id: crypto.randomUUID(), 
                productId: produtoCat.id, 
                name: produtoCat.name, 
                price: produtoCat.promoPrice > 0 ? produtoCat.promoPrice : produtoCat.price,
                imageUrl: produtoCat.imageUrl || produtoCat.foto || '',
                pontosPorReal: parseFloat(rewardMultiplier)
            };
        }).filter(Boolean);

        if (novosProdutos.length === 0) { setIsProductModalOpen(false); return; }

        const newSettings = { ...settings, fidelidade_produtos: [...recompensasProdutos, ...novosProdutos] };
        saveSettings(newSettings);
        setIsProductModalOpen(false);
        setSelectedRewardProducts([]);
        setRewardMultiplier(20);
    };

    const handleRemoveProduct = (id) => {
        if (!window.confirm("Remover este produto das recompensas?")) return;
        const newSettings = { ...settings, fidelidade_produtos: recompensasProdutos.filter(p => p.id !== id) };
        saveSettings(newSettings);
    };

    // --- PONTUADOR MANUAL ---
    const handleSavePontuador = async () => {
        if (!pontuadorSelectedClient) { alert("Selecione um cliente."); return; }
        const pts = parseInt(pontuadorPoints);
        if (isNaN(pts) || pts <= 0) { alert("Digite uma quantidade válida de pontos."); return; }

        const user = auth.currentUser;
        if (!user) return;

        const isAdd = pontuadorTab === 'add';
        const finalPoints = isAdd ? pts : -pts;
        const dtIso = new Date().toISOString();

        const manualOrder = {
            origin: 'Manual',
            status: 'concluido',
            createdAt: dtIso,
            customerName: pontuadorSelectedClient.name,
            customerPhone: pontuadorSelectedClient.phone || '',
            clientId: pontuadorSelectedClient.id,
            manualPoints: finalPoints,
            total: 0,
            userName: user.displayName || 'Sistema'
        };

        try {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`).add(manualOrder);
            await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_customers`).doc(pontuadorSelectedClient.id).update({
                manualPoints: firebase.firestore.FieldValue.increment(finalPoints)
            });

            if (!pontuadorKeepOpen) setIsPontuadorOpen(false);
            setPontuadorClientQuery('');
            setPontuadorSelectedClient(null);
            setPontuadorPoints('');
        } catch (error) {
            console.error("Erro ao processar pontos:", error);
            alert("Ocorreu um erro ao salvar os pontos.");
        }
    };

    // --- PROCESSAMENTO DA VISÃO GERAL (DASHBOARD - APENAS PEDIDOS FILTRADOS) ---
    const dashboardData = useMemo(() => {
        let pontosDistribuidos = 0;
        let pontosResgatados = 0;
        let valorDescontosGerados = 0;
        let totalResgates = 0;

        const chartMap = {};
        const clientGains = {};
        const clientRedeems = {};
        const prizeMap = {};

        let currentDate = new Date(startDate + 'T00:00:00');
        const endD = new Date(endDate + 'T00:00:00');
        while (currentDate <= endD) {
            const dateStr = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            chartMap[dateStr] = { date: dateStr, Pontos: 0 };
            currentDate.setDate(currentDate.getDate() + 1);
        }

        filteredOrders.filter(o => o.status === 'concluido').forEach(o => {
            const dtObj = new Date(o.createdAt);
            const dateKey = `${String(dtObj.getDate()).padStart(2, '0')}/${String(dtObj.getMonth() + 1).padStart(2, '0')}`;
            
            const isManual = o.origin === 'Manual';
            let ptsGanhos = isManual ? (o.manualPoints > 0 ? o.manualPoints : 0) : Math.floor((o.total || 0) * pontosPorReal);
            let ptsUsados = isManual ? (o.manualPoints < 0 ? Math.abs(o.manualPoints) : 0) : getPontosUsados(o);

            if (chartMap[dateKey]) {
                chartMap[dateKey].Pontos += (ptsGanhos + ptsUsados);
            }

            const cName = o.customerName || 'Cliente Balcão';

            if (ptsGanhos > 0) {
                pontosDistribuidos += ptsGanhos;
                clientGains[cName] = (clientGains[cName] || 0) + ptsGanhos;
            } 
            
            if (ptsUsados > 0) {
                pontosResgatados += ptsUsados;
                totalResgates++;
                clientRedeems[cName] = (clientRedeems[cName] || 0) + ptsUsados;
                
                let descValor = o.discountAmount || ((ptsUsados / (settings.fidelidade_pontosTroca || 100)) * (settings.fidelidade_valorDesconto || 5));
                let descName = o.prizeName || 'Resgate / Desconto';
                
                valorDescontosGerados += descValor;

                if (!prizeMap[descName]) prizeMap[descName] = { name: descName, qty: 0, pts: 0, val: 0 };
                prizeMap[descName].qty += 1;
                prizeMap[descName].pts += ptsUsados;
                prizeMap[descName].val += descValor;
            }
        });

        const chartData = Object.values(chartMap);
        const topGains = Object.entries(clientGains).map(([name, pts]) => ({ name, pts })).sort((a,b) => b.pts - a.pts).slice(0, 8);
        const topRedeems = Object.entries(clientRedeems).map(([name, pts]) => ({ name, pts })).sort((a,b) => b.pts - a.pts).slice(0, 8);
        const prizes = Object.values(prizeMap).sort((a,b) => b.qty - a.qty);

        return { pontosDistribuidos, pontosResgatados, valorDescontosGerados, totalResgates, chartData, topGains, topRedeems, prizes };
    }, [filteredOrders, startDate, endDate, pontosPorReal, settings]);

    // --- LISTAGENS FILTRADAS ---
    const atividadesFiltradas = useMemo(() => {
        return filteredOrders.filter(o => o.status === 'concluido' && ((o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) || (o.orderNumber && o.orderNumber.includes(searchQuery))));
    }, [filteredOrders, searchQuery]);

    const clientesFiltrados = useMemo(() => {
        return unifiedCustomersList.filter(c => (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || (c.phone && c.phone.includes(searchQuery)));
    }, [unifiedCustomersList, searchQuery]);

    if (loading) return <div className="p-10 text-center font-black text-purple-500 uppercase tracking-widest">Carregando Fidelidade...</div>;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                    <p className="font-bold text-slate-800 text-xs mb-1">{label}</p>
                    <p className="text-[#60A5FA] font-black text-sm">{payload[0].value} Pontos Movimentados</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full mx-auto pb-10 fade-in bg-slate-50 min-h-[calc(100vh-80px)] font-sans relative">
            
            {/* CABEÇALHO DA PÁGINA (NAVEGAÇÃO ENTRE ABAS) */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm flex-wrap gap-4">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Icon name="award" size={20} className="text-purple-600" />
                    Fidelidade - {activeTab.replace('_', ' ')}
                </h2>
                <div className="flex gap-4 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                    <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                        <button 
                            onClick={() => setActiveTab('visao_geral')} 
                            className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all ${activeTab === 'visao_geral' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Visão Geral
                        </button>
                        <button 
                            onClick={() => setActiveTab('recompensas')} 
                            className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all ${activeTab === 'recompensas' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Configurações
                        </button>
                        <button 
                            onClick={() => setActiveTab('atividades')} 
                            className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all ${activeTab === 'atividades' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Atividades
                        </button>
                    </div>
                </div>
            </div>

            {/* AJUSTE PARA 100% DA LARGURA (w-full) em vez de max-w-7xl */}
            <div className="p-4 sm:p-6 w-full">
                
                {/* =========================================================================
                    ABA: VISÃO GERAL (DASHBOARD)
                ========================================================================= */}
                {activeTab === 'visao_geral' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <p className="text-sm font-bold text-slate-500">Selecione um período e veja o desempenho do seu programa de fidelidade</p>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="px-2 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer" />
                                <span className="text-slate-300">~</span>
                                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="px-2 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer" />
                            </div>
                        </div>

                        {/* KPIS */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-0 flex flex-wrap md:flex-nowrap divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            <div className="p-6 flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pontos Distribuídos</p>
                                <p className="text-2xl font-black text-slate-800">{dashboardData.pontosDistribuidos}</p>
                            </div>
                            <div className="p-6 flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pontos Resgatados</p>
                                <p className="text-2xl font-black text-slate-800">{dashboardData.pontosResgatados}</p>
                            </div>
                            <div className="p-6 flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Em Descontos</p>
                                <p className="text-2xl font-black text-emerald-600">{formatMoney(dashboardData.valorDescontosGerados)}</p>
                            </div>
                            <div className="p-6 flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resgates</p>
                                <p className="text-2xl font-black text-slate-800">{dashboardData.totalResgates}</p>
                            </div>
                        </div>

                        {/* GRÁFICO */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dashboardData.chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line type="monotone" dataKey="Pontos" stroke="#60A5FA" strokeWidth={3} dot={{ r: 4, fill: '#60A5FA', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* RANKINGS LADO A LADO */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100">
                                    <h4 className="font-black text-slate-800 text-sm">Top clientes por ganhos no período</h4>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pontos ganhos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dashboardData.topGains.length === 0 ? (
                                            <tr><td colSpan="2" className="p-6 text-center text-xs text-slate-400 font-bold">Sem dados</td></tr>
                                        ) : (
                                            dashboardData.topGains.map((c, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-5 py-3 flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0"><Icon name="user" size={12}/></div>
                                                        <span className="font-bold text-xs text-slate-700">{c.name}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-black text-sm text-emerald-600">{c.pts}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100">
                                    <h4 className="font-black text-slate-800 text-sm">Top clientes por resgates no período</h4>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Pontos resgatados</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dashboardData.topRedeems.length === 0 ? (
                                            <tr><td colSpan="2" className="p-6 text-center text-xs text-slate-400 font-bold">Sem dados</td></tr>
                                        ) : (
                                            dashboardData.topRedeems.map((c, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-5 py-3 flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center flex-shrink-0"><Icon name="user" size={12}/></div>
                                                        <span className="font-bold text-xs text-slate-700">{c.name}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-black text-sm text-red-500">{c.pts}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* LISTA DE PREMIOS RESGATADOS */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                <h4 className="font-black text-slate-800 text-sm">Prêmios resgatados no período</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100/50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Prêmio</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Resgates</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Total de pontos</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Total de desconto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dashboardData.prizes.length === 0 ? (
                                            <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold text-xs uppercase">Nenhum prêmio resgatado.</td></tr>
                                        ) : (
                                            dashboardData.prizes.map((p, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-bold text-xs text-slate-700">{p.name}</td>
                                                    <td className="px-6 py-4 text-center font-black text-sm text-slate-600">{p.qty}</td>
                                                    <td className="px-6 py-4 text-center font-black text-sm text-purple-600">{p.pts}</td>
                                                    <td className="px-6 py-4 text-right font-black text-sm text-emerald-600">{formatMoney(p.val)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                    ABA: RECOMPENSAS / CONFIGURAÇÕES GERAIS E LISTA DE CLIENTES
                ========================================================================= */}
                {activeTab === 'recompensas' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-700">Programa de pontos</h3>
                            <button className="px-4 py-2 border border-purple-200 text-purple-600 bg-purple-50 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-purple-100 transition-colors">
                                Migrar para Cashback
                            </button>
                        </div>

                        {/* BLOCO 1: REGRAS GERAIS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800">Programa de fidelidade</h4>
                                        <p className="text-[10px] text-slate-500 mt-1">Acumula 1 ponto por real gasto.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-purple-600 uppercase">{settings.fidelidade_ativo ? 'Ativado' : 'Desativado'}</span>
                                        <ToggleSwitch checked={settings.fidelidade_ativo} onChange={e => updateSetting('fidelidade_ativo', e.target.checked)} />
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <label className="text-xs font-bold text-slate-600 block mb-1">Quanto tempo os pontos ficam disponíveis?</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={settings.fidelidade_validadeDias ?? 0}
                                            onChange={e => updateSetting('fidelidade_validadeDias', e.target.value)}
                                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-purple-500"
                                        />
                                        <span className="text-xs font-bold text-slate-500">dias</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-2 leading-tight">Use 0 para pontos sem validade. A contagem começa ao realizar uma compra.</p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-sm text-slate-800 mb-1">Benefícios</h4>
                                <p className="text-[10px] text-slate-500 mb-5">Vantagens extras dentro do programa.</p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                                        <input type="checkbox" checked={settings.fidelidade_bonusAtivo} onChange={e => updateSetting('fidelidade_bonusAtivo', e.target.checked)} className="mt-1 accent-purple-500 w-4 h-4 rounded cursor-pointer" />
                                        <div className="flex-1">
                                            <h5 className="font-bold text-xs text-slate-700">Bônus de boas-vindas</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500">Ao cadastrar o cliente ganha</span>
                                                <input type="number" value={settings.fidelidade_bonusPontos ?? 5} onChange={e => updateSetting('fidelidade_bonusPontos', e.target.value)} className="w-16 p-1.5 border border-slate-200 rounded text-xs font-bold text-center outline-none focus:border-purple-500" disabled={!settings.fidelidade_bonusAtivo}/>
                                                <span className="text-[10px] text-slate-500">pontos.</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={settings.fidelidade_entregaGratisAtivo} onChange={e => updateSetting('fidelidade_entregaGratisAtivo', e.target.checked)} className="mt-1 accent-purple-500 w-4 h-4 rounded cursor-pointer" />
                                        <div className="flex-1">
                                            <h5 className="font-bold text-xs text-slate-700">Entrega grátis com pontos</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500">Para cada <strong>R$ 1,00</strong> de entrega</span>
                                                <input type="number" value={settings.fidelidade_entregaGratisPontos ?? 20} onChange={e => updateSetting('fidelidade_entregaGratisPontos', e.target.value)} className="w-16 p-1.5 border border-slate-200 rounded text-xs font-bold text-center outline-none focus:border-purple-500" disabled={!settings.fidelidade_entregaGratisAtivo}/>
                                                <span className="text-[10px] text-slate-500">pontos.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-sm text-slate-800 mb-1">Pedidos que pontuam</h4>
                                <p className="text-[10px] text-slate-500 mb-5">Selecione os canais que acumulam pontos.</p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={settings.fidelidade_canalCatalogo !== false} onChange={e => updateSetting('fidelidade_canalCatalogo', e.target.checked)} className="accent-purple-500 w-4 h-4 rounded" />
                                        <span className="text-xs text-slate-600">Pedidos feitos via <strong>catálogo</strong> (padrão)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={settings.fidelidade_canalExtensao !== false} onChange={e => updateSetting('fidelidade_canalExtensao', e.target.checked)} className="accent-purple-500 w-4 h-4 rounded" />
                                        <span className="text-xs text-slate-600">Pedidos feitos via <strong>extensão / PDV</strong></span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={settings.fidelidade_canalPortal !== false} onChange={e => updateSetting('fidelidade_canalPortal', e.target.checked)} className="accent-purple-500 w-4 h-4 rounded" />
                                        <span className="text-xs text-slate-600">Pedidos feitos via <strong>Totem</strong></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO 2: RECOMPENSA EM DESCONTOS */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                                    <Icon name="chevron-down" size={16} className="text-slate-400" /> Recompensa em descontos
                                </h4>
                                <button onClick={() => setIsDiscountModalOpen(true)} className="bg-[#9333EA] hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    <Icon name="plus" size={14} /> Adicionar Desconto
                                </button>
                            </div>
                            <div className="p-5 flex flex-wrap gap-4">
                                {recompensasDescontos.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-bold p-4 w-full text-center border-2 border-dashed border-slate-200 rounded-xl">Nenhum desconto cadastrado.</p>
                                ) : (
                                    recompensasDescontos.map(desc => (
                                        <div key={desc.id} className="w-[280px] bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4 relative group hover:border-purple-300 transition-colors">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Icon name="dollar-sign" size={20} />
                                            </div>
                                            <div className="flex-1 pr-6">
                                                <h5 className="font-bold text-sm text-slate-800 leading-tight">Desconto de {formatMoney(desc.valor)}</h5>
                                                <span className="text-xs text-slate-500 mt-1 block">{desc.pontos} pontos</span>
                                            </div>
                                            <button onClick={() => handleRemoveDiscount(desc.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Icon name="trash-2" size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* BLOCO 3: RECOMPENSA EM PRODUTOS */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                                    <Icon name="chevron-down" size={16} className="text-slate-400" /> Recompensa em produtos
                                </h4>
                                <button onClick={() => setIsProductModalOpen(true)} className="bg-[#9333EA] hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    <Icon name="plus" size={14} /> Adicionar Produto
                                </button>
                            </div>
                            <div className="p-5">
                                {recompensasProdutos.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-bold p-8 w-full text-center border-2 border-dashed border-slate-200 rounded-xl">Nenhum produto cadastrado como recompensa.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {recompensasProdutos.map(prod => {
                                            const pts = Math.floor(prod.price * (prod.pontosPorReal || 20));
                                            return (
                                            <div key={prod.id} className="bg-white border border-slate-200 rounded-xl p-3 flex gap-4 relative group hover:shadow-md hover:border-purple-300 transition-all">
                                                <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100">
                                                    <img src={prod.imageUrl || 'https://via.placeholder.com/150?text=Produto'} alt={prod.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 pr-6">
                                                    <h5 className="font-bold text-xs text-slate-800 leading-tight mb-1 line-clamp-2">{prod.name}</h5>
                                                    <span className="text-[10px] text-slate-500 font-bold">{formatMoney(prod.price)}</span>
                                                    <span className="text-[11px] font-black text-slate-700 mt-1">A partir de {pts} pontos</span>
                                                </div>
                                                <button onClick={() => handleRemoveProduct(prod.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded">
                                                    <Icon name="trash-2" size={16} />
                                                </button>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4 text-xs text-slate-700 text-center sm:text-left">
                                <span>A cada <b>R$ 1,00</b> dos produtos selecionados, o cliente irá gastar</span>
                                <input type="number" className="w-16 p-2 border border-slate-300 rounded-lg text-center font-black focus:border-purple-500 outline-none" value={rewardMultiplier} onChange={e => setRewardMultiplier(e.target.value)} />
                                <span>pontos.</span>
                            </div>

                            <div className="mt-4 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-600 block mb-1">Por que preciso disso?</span>
                                <p className="text-[10px] text-slate-500 leading-tight font-bold">
                                    O preço dos produtos pode variar devido à adição de complementos, logo não é possível definir uma quantidade fixa de pontos. Exemplo: se 10 pontos = R$ 1,00, um produto de R$ 20 será resgatado por 200 pontos.
                                </p>
                            </div>
                        </div>

                        {/* BLOCO 4: TABELA RESUMO DE CLIENTES (AGORA COM DADOS HISTÓRICOS REAIS E AÇÃO NO BOTÃO) */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8 w-full">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                                    <Icon name="users" size={16} className="text-slate-400" /> Resumo de Clientes e Saldos
                                </h4>
                                <div className="relative">
                                    <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Procurar cliente..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-64 pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[450px] custom-scrollbar w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white shadow-sm">
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Gasto Real (R$)</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-purple-600 tracking-widest text-center">Pontos Totais</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {clientesFiltrados.length === 0 ? (
                                            <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold text-xs uppercase">Nenhum cliente encontrado.</td></tr>
                                        ) : (
                                            clientesFiltrados.map(c => {
                                                const totalGasto = c.totalSpent || 0;
                                                const pontosCompras = Math.floor(totalGasto * pontosPorReal);
                                                
                                                let pontosCalculados = pontosCompras;
                                                if ((c.manualPoints || 0) > 0) {
                                                    pontosCalculados += c.manualPoints;
                                                }
                                                pontosCalculados -= (c.pontosUsadosReais || 0);

                                                const pontosTotais = Math.max(0, pontosCalculados);
                                                const podeResgatar = pontosTotais > 0;

                                                return (
                                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4">
                                                            <p className="font-black text-sm text-slate-800">{c.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">{c.phone || 'Sem telefone'}</p>
                                                        </td>
                                                        <td className="p-4 font-black text-sm text-slate-800 text-center">{formatMoney(totalGasto)}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`inline-block px-3 py-1 rounded-lg font-black text-sm ${podeResgatar ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {pontosTotais} pts
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {/* AQUI ESTÁ A AÇÃO DO BOTÃO: Abre o Pontuador Manual preenchido para remover pontos */}
                                                            <button 
                                                                onClick={() => {
                                                                    setPontuadorSelectedClient(c);
                                                                    setPontuadorClientQuery(c.name);
                                                                    setPontuadorTab('remove');
                                                                    setIsPontuadorOpen(true);
                                                                }}
                                                                disabled={!podeResgatar || !settings.fidelidade_ativo}
                                                                className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${
                                                                    podeResgatar && settings.fidelidade_ativo 
                                                                    ? 'bg-[#9333EA] hover:bg-purple-700 text-white shadow-sm' 
                                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {podeResgatar ? 'Resgatar' : 'Sem Pontos'}
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

                    </div>
                )}

                {/* =========================================================================
                    ABA: ATIVIDADES / HISTÓRICO
                ========================================================================= */}
                {activeTab === 'atividades' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 flex items-center gap-2">
                                    <Icon name="calendar" size={14} className="text-slate-400" />
                                    Últimos Lançamentos
                                </div>
                                <select className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
                                    <option>Ganho, Resgate</option>
                                    <option>Apenas Ganhos</option>
                                    <option>Apenas Resgates</option>
                                </select>
                                <select className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none bg-white">
                                    <option>Pendente, Confirmado...</option>
                                    <option>Confirmado</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Pesquise por cliente ou pedido" 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500"
                                    />
                                </div>
                                <button onClick={() => setIsPontuadorOpen(true)} className="bg-[#A855F7] hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm whitespace-nowrap">
                                    Pontuador
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100/50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Pedido</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Pontos</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Usuário</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {atividadesFiltradas.length === 0 ? (
                                            <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold text-xs uppercase">Nenhuma atividade encontrada.</td></tr>
                                        ) : (
                                            atividadesFiltradas.map(order => {
                                                const dt = new Date(order.createdAt);
                                                const isManual = order.origin === 'Manual';
                                                const numPedido = order.orderNumber || order.id.substring(0, 5).toUpperCase();
                                                const hashLocal = `#${Math.floor(Math.random() * 100000000)}`;
                                                
                                                // LEITURA INTELIGENTE QUE DETECTA OS PONTOS NEGATIVOS NA HISTÓRIA
                                                const ptsGanhos = Math.floor((order.total || 0) * pontosPorReal);
                                                const ptsUsados = getPontosUsados(order);
                                                
                                                let saldoTransacao = isManual ? (order.manualPoints || 0) : (ptsGanhos - ptsUsados);

                                                const isPositive = saldoTransacao > 0;
                                                const isNegative = saldoTransacao < 0;
                                                const ptsDisplay = isPositive ? `+${saldoTransacao}` : `${saldoTransacao}`;
                                                const ptsColor = isPositive ? 'text-emerald-600' : (isNegative ? 'text-red-500' : 'text-slate-400');

                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            {isManual ? (
                                                                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded text-[10px] font-black uppercase">Manual</span>
                                                            ) : (
                                                                <><span className="font-bold text-xs text-slate-700 block">Nº {numPedido}</span><span className="text-[10px] text-slate-400">{hashLocal}</span></>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                            {dt.toLocaleDateString('pt-BR')} {dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-xs text-slate-700">{order.customerName || 'Cliente Balcão'}</td>
                                                        <td className="px-6 py-4 text-center"><span className={`font-black text-sm ${ptsColor}`}>{ptsDisplay}</span></td>
                                                        <td className="px-6 py-4 text-center"><span className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1 rounded text-[10px] font-black uppercase">Confirmado</span></td>
                                                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{order.userName || (auth.currentUser?.displayName || 'Sistema Aut.')}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-end items-center gap-4 bg-slate-50/50 text-xs text-slate-500 font-bold w-full">
                                <span>Registros por página</span>
                                <select className="bg-transparent border border-slate-200 rounded p-1 outline-none"><option>10</option><option>50</option></select>
                                <span>1-{Math.min(atividadesFiltradas.length, 10)} de {atividadesFiltradas.length}</span>
                                <div className="flex gap-2">
                                    <button className="text-slate-400 hover:text-slate-600"><Icon name="chevron-left" size={16}/></button>
                                    <button className="text-slate-400 hover:text-slate-600"><Icon name="chevron-right" size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================================
                MODAIS DO SISTEMA
            ========================================================================= */}
            {isDiscountModalOpen && (
                <div className="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-up overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Novo Desconto</h3>
                            <button onClick={() => setIsDiscountModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500">Valor do Desconto (R$)</label>
                                <input type="number" step="0.01" value={discountForm.valor} onChange={e => setDiscountForm({...discountForm, valor: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-purple-500 outline-none" placeholder="Ex: 20.00"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500">Custo em Pontos</label>
                                <input type="number" value={discountForm.pontos} onChange={e => setDiscountForm({...discountForm, pontos: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-purple-500 outline-none" placeholder="Ex: 500"/>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50">
                            <button onClick={() => setIsDiscountModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase rounded-xl hover:bg-slate-100">Cancelar</button>
                            <button onClick={handleAddDiscount} className="flex-1 py-3 bg-[#9333EA] text-white font-black text-xs uppercase rounded-xl hover:bg-purple-700 shadow-md">Adicionar</button>
                        </div>
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Cadastrar recompensas</h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 font-bold mb-4">O cliente poderá trocar pontos por produtos. Defina abaixo os produtos que poderão ser trocados.</p>
                            
                            <div className="text-center">
                                <span className="text-xs font-black text-slate-700">{selectedRewardProducts.length} produtos selecionados</span>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                                        <input type="checkbox" checked={selectedRewardProducts.length === catalogItems.length && catalogItems.length > 0} 
                                            onChange={e => setSelectedRewardProducts(e.target.checked ? catalogItems.map(i => i.id) : [])} 
                                            className="accent-purple-500 w-4 h-4 rounded cursor-pointer" 
                                        />
                                        Selecionar Todos os Produtos
                                    </label>
                                </div>
                                <div className="max-h-48 overflow-y-auto p-2 bg-white custom-scrollbar">
                                    {catalogItems.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors border-b border-slate-100 last:border-0">
                                            <input type="checkbox" checked={selectedRewardProducts.includes(p.id)} 
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedRewardProducts([...selectedRewardProducts, p.id]);
                                                    else setSelectedRewardProducts(selectedRewardProducts.filter(id => id !== p.id));
                                                }} 
                                                className="accent-purple-500 w-4 h-4 rounded cursor-pointer" 
                                            />
                                            <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4 text-xs text-slate-700 text-center sm:text-left">
                                <span>A cada <b>R$ 1,00</b> dos produtos selecionados, o cliente irá gastar</span>
                                <input type="number" className="w-16 p-2 border border-slate-300 rounded-lg text-center font-black focus:border-purple-500 outline-none" value={rewardMultiplier} onChange={e => setRewardMultiplier(e.target.value)} />
                                <span>pontos.</span>
                            </div>

                            <div className="mt-4 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-600 block mb-1">Por que preciso disso?</span>
                                <p className="text-[10px] text-slate-500 leading-tight font-bold">
                                    O preço dos produtos pode variar devido à adição de complementos, logo não é possível definir uma quantidade fixa de pontos. Exemplo: se 10 pontos = R$ 1,00, um produto de R$ 20 será resgatado por 200 pontos.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-purple-600 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-purple-50 transition-colors">Cancelar</button>
                            <button onClick={handleAddProduct} className="px-6 py-2.5 bg-[#A855F7] text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-purple-600 shadow-md transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isPontuadorOpen && (
                <div className="modal-overlay fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden">
                        <div className="p-4 flex justify-between items-center border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">Cadastrar pontos</h3>
                            <button onClick={() => setIsPontuadorOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={18} /></button>
                        </div>
                        <div className="flex border-b border-slate-100 px-4 pt-2">
                            <button onClick={() => setPontuadorTab('add')} className={`flex-1 pb-3 text-[11px] font-bold uppercase tracking-widest outline-none ${pontuadorTab === 'add' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                Adicionar Pontos
                            </button>
                            <button onClick={() => setPontuadorTab('remove')} className={`flex-1 pb-3 text-[11px] font-bold uppercase tracking-widest outline-none ${pontuadorTab === 'remove' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                Remover Pontos
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <Icon name="user" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Pesquisar cliente..." value={pontuadorClientQuery} onChange={(e) => { setPontuadorClientQuery(e.target.value); setPontuadorSelectedClient(null); }} className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500" />
                                {pontuadorClientQuery && !pontuadorSelectedClient && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {/* A busca no pontuador mostra os clientes UNIFICADOS */}
                                        {customers.filter(c => c.name.toLowerCase().includes(pontuadorClientQuery.toLowerCase()) || (c.phone && c.phone.includes(pontuadorClientQuery))).map(c => (
                                            <div key={c.id} onClick={() => { setPontuadorSelectedClient(c); setPontuadorClientQuery(c.name); }} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs font-bold text-slate-700">
                                                {c.name} - {c.phone}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <input type="number" placeholder="Quantidade de pontos *" value={pontuadorPoints} onChange={e => setPontuadorPoints(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-purple-500" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer mt-2 w-fit">
                                <input type="checkbox" checked={pontuadorKeepOpen} onChange={e => setPontuadorKeepOpen(e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-purple-500 cursor-pointer" />
                                <span className="text-xs text-slate-600">Manter aberto após salvar</span>
                            </label>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsPontuadorOpen(false)} className="px-6 py-2 bg-white border border-purple-200 text-purple-600 font-bold text-[11px] uppercase tracking-widest rounded-lg hover:bg-purple-50 transition-colors">Cancelar</button>
                            <button onClick={handleSavePontuador} className="px-6 py-2 bg-[#A855F7] text-white font-bold text-[11px] uppercase tracking-widest rounded-lg hover:bg-purple-600 transition-colors shadow-sm">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}