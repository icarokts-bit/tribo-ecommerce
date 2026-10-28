import MarketingMenu from './pages/MarketingMenu';
import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from './firebase';
import Layout from './components/Layout';
import Icon from './components/Icon';
import { p, formatMoney, isInvoicePayment, getTxMonth, safeDateDisplay } from './utils/finance';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import RelatorioUnificado from './pages/RelatorioUnificado';
import ExtratoDetalhado from './pages/ExtratoDetalhado';
import ConsultorIA from './pages/ConsultorIA';
import DashboardFin from './pages/Financeiro/DashboardFin';
import Saldos from './pages/Financeiro/Saldos';
import APagar from './pages/Financeiro/APagar';
import AReceber from './pages/Financeiro/AReceber';
import Vendas from './pages/Financeiro/Vendas';
import Cartoes from './pages/Financeiro/Cartoes';
import Resultados from './pages/Financeiro/Resultados';
import Dre from './pages/Financeiro/Dre';
import Fornecedores from './pages/Financeiro/Fornecedores';
import CmvDashboard from './pages/Cmv/CmvDashboard';
import Insumos from './pages/Cmv/Insumos';
import Fichas from './pages/Cmv/Fichas';
import Complementos from './pages/Cmv/Complementos';
import Combos from './pages/Cmv/Combos';
import Analise from './pages/Cmv/Analise';
import CustosFixos from './pages/Cmv/CustosFixos';
import Ajustes from './pages/Cmv/Ajustes';
import MinhaConta from './pages/MinhaConta';
import Assinatura from './pages/Assinatura';
import Operacional from './pages/Operacional'; 
import Login from './pages/Login';
import Migrador from './pages/Migrador'; 
import PainelMaster from './pages/PainelMaster'; 
import Bloqueio from './pages/Bloqueio';
import SupportWidget from './components/SupportWidget';
import Cardapio from './pages/Cardapio';

import TotemPDV from './pages/GestaoPedidos/TotemPDV';

import GestaoFuncionarios from './pages/GestaoFuncionarios'; 
import GestaoDelivery from './pages/GestaoDelivery'; 
import GestaoFreelancer from './pages/GestaoFreelancer';
import RelatorioRH from './pages/RelatorioRH';

import GestaoPedidos from './pages/GestaoPedidos/GestaoPedidos';
import HistoricoPedidos from './pages/GestaoPedidos/HistoricoPedidos';
import CatalogoDelivery from './pages/GestaoPedidos/CatalogoDelivery';
import ClientesDelivery from './pages/GestaoPedidos/ClientesDelivery';
import AreaEntregaDelivery from './pages/GestaoPedidos/AreaEntregaDelivery';
import Fidelidade from './pages/GestaoPedidos/Fidelidade'; 

const getLocalDateStr = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getLocalMonthStr = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const getNextBusinessDay = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    if (date.getDay() === 6) date.setDate(date.getDate() + 2);
    else if (date.getDay() === 0) date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getNextWeeklyDate = (dateStr, closeDay, payDay) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const currentDay = dateObj.getDay();

    let daysUntilClose = (closeDay - currentDay + 7) % 7;
    let daysFromCloseToPay = (payDay - closeDay + 7) % 7;
    if (daysFromCloseToPay === 0) daysFromCloseToPay = 7;

    dateObj.setDate(dateObj.getDate() + daysUntilClose + daysFromCloseToPay);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatNumberBR = (num) => {
    if (isNaN(num)) return "0,00";
    let [intPart, decPart] = Number(num).toFixed(2).split('.');
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${intPart},${decPart}`;
};

const DEFAULT_PAYMENT_METHODS = [];

// ============================================================================
// COMPONENTE PRINCIPAL DO SISTEMA ERP (RESTRITO COM LOGIN)
// ============================================================================
function ERPApp() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user'); 
    
    const [permissoes, setPermissoes] = useState({ isFuncionario: false, donoUid: null, cargo: 'dono' });
    
    const [planoUsuario, setPlanoUsuario] = useState('completo'); 
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('fin_dashboard');

    const [assinatura, setAssinatura] = useState({ status: 'carregando', vencimento: '2099-12-31' });

    const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
    const [transactions, setTransactions] = useState([]);
    const [dailyRecords, setDailyRecords] = useState({});
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [metaVendas, setMetaVendas] = useState(0);
    const [ingredients, setIngredients] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [complements, setComplements] = useState([]);
    const [combos, setCombos] = useState([]);
    const [fixedCosts, setFixedCosts] = useState([]);
    const [opLogs, setOpLogs] = useState([]);
    
    const [cmvSettings, setCmvSettings] = useState({ 
        targetCMV: 0, tax: 0, apps: 0, taxaDebito: 0, taxaCredito: 0, ifoodTax: 0, ninenineFoodTax: 0, autoFeeVendas: true,
        workingDays: []
    });

    const ingCats = ['Proteínas', 'Pães', 'Queijos', 'Molhos', 'Vegetais/Hortifrúti', 'Embalagens', 'Outros'];
    const recCats = ['Hambúrgueres', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Molhos Caseiros', 'Outros', 'Smash'];
    const compCats = ['Extras', 'Molhos', 'Outros'];
    const comboCats = ['Promocionais', 'Família', 'Outros'];
    const fcCats = ['Operacional', 'Renda/Aluguel', 'Marketing', 'RH/Folha', 'Impostos Fixos', 'Outros'];

    const [filterMonth, setFilterMonth] = useState(getLocalMonthStr());
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [accFilter, setAccFilter] = useState('todas');
    const [catFilter, setCatFilter] = useState([]);
    const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);
    const [visibleTxCount, setVisibleTxCount] = useState(15);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const [txForm, setTxForm] = useState({ id: null, desc: '', val: '', type: 'saida', acc: '', destAcc: '', cat: '', sup: '', status: 'pago', date: getLocalDateStr(), clearance: getLocalDateStr(), inst: 1, feeType: 'none', feePercent: 0 });
    const [newDayDate, setNewDayDate] = useState(getLocalDateStr());
    const [supForm, setSupForm] = useState('');
    const [catForm, setCatForm] = useState('');
    
    const [accForm, setAccForm] = useState({ id: null, isEditing: false, originalName: '', name: '', type: 'corrente', group: 'operacional', limit: '', closing: '', due: '' });
    
    const [ingForm, setIngForm] = useState({ id: '', name: '', category: 'Outros', cost: '', unit: 'g', qty: '' });
    const [recipeForm, setRecipeForm] = useState({ id: '', name: '', category: 'Hambúrgueres', sellingPrice: '', ingredients: [], ignoreCMV: false, yield: 1 });
    const [compForm, setCompForm] = useState({ id: '', name: '', category: 'Extras', sellingPrice: '', ingredients: [], ignoreCMV: false, yield: 1 });
    const [comboForm, setComboForm] = useState({ id: '', name: '', category: 'Promocionais', sellingPrice: '', items: [], ignoreCMV: false });
    const [fcForm, setFcForm] = useState({ id: '', description: '', category: 'Operacional', value: '' });

    const [liqModal, setLiqModal] = useState(null);
    const [invoiceModal, setInvoiceModal] = useState(null);
    const [invoicePayType, setInvoicePayType] = useState('integral'); 
    const [invoicePartialVal, setInvoicePartialVal] = useState('');
    const [invoiceSourceAcc, setInvoiceSourceAcc] = useState('');
    
    const [invoiceMoveToNext, setInvoiceMoveToNext] = useState(true);

    const [isIngModalOpen, setIsIngModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [isCompModalOpen, setIsCompModalOpen] = useState(false);
    const [isComboModalOpen, setIsComboModalOpen] = useState(false);
    const [isFcModalOpen, setIsFcModalOpen] = useState(false);
    const [dailyLaunchModal, setDailyLaunchModal] = useState(null);

    const [showTaxLaunchModal, setShowTaxLaunchModal] = useState(false);
    const [taxLaunchFormData, setTaxLaunchFormData] = useState({ id: null, date: getLocalDateStr(), status: 'pendente', amount: '' });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => { 
            if (u) {
                const isMasterEmail = u.email === 'burger.tribo@gmail.com' || u.email === 'icaro.kts@gmail.com';
                
                if (!u.emailVerified && !isMasterEmail) {
                    auth.signOut();
                    setUser(null);
                    setLoading(false);
                } else {
                    let currentPerms = { isFuncionario: false, donoUid: u.uid, cargo: 'dono' };
                    if (isMasterEmail) {
                        setUserRole('master');
                    }
                    try {
                        const crachaRef = await db.collection('acessos_funcionarios').doc(u.uid).get();
                        if (crachaRef.exists) {
                            const dados = crachaRef.data();
                            if (dados.ativo === false) {
                                auth.signOut();
                                setUser(null);
                                setLoading(false);
                                return;
                            }
                            currentPerms = { isFuncionario: true, donoUid: dados.donoUid, cargo: dados.cargo };
                            setUserRole(dados.cargo);
                        }
                    } catch (e) {
                        console.error("Erro ao verificar acesso:", e);
                    }
                    
                    setPermissoes(currentPerms);
                    setUser(u);
                    setLoading(false); 
                }
            } else {
                setUser(null);
                setPermissoes({ isFuncionario: false, donoUid: null, cargo: 'dono' });
                setUserRole('user'); 
                setActiveTab('fin_dashboard');
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !permissoes.donoUid) return;
        
        const pathFin = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}`;
        
        const unsubAcc = db.collection(pathFin + "/accounts").onSnapshot(s => setAccounts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubCat = db.collection(pathFin + "/categories").onSnapshot(s => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubSup = db.collection(pathFin + "/suppliers").onSnapshot(s => setSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubMeta = db.doc(pathFin + "/settings/config").onSnapshot(s => { if(s.exists) setMetaVendas(s.data().meta || 0); });
        
        const unsubPay = db.collection(pathFin + "/settings").doc("paymentMethods").onSnapshot(s => {
            if(s.exists && Array.isArray(s.data().methods) && s.data().methods.length > 0) {
                setPaymentMethods(s.data().methods);
            } else {
                setPaymentMethods([
                    { id: 'dinheiro', name: 'Dinheiro', settlementType: 'immediate', feeType: 'none', tax: 0, delay: 0 },
                    { id: 'pix', name: 'PIX Físico', settlementType: 'immediate', feeType: 'none', tax: 0, delay: 0 },
                    { id: 'pixOnline', name: 'PIX Online', settlementType: 'immediate', feeType: 'percent', tax: 0, delay: 0 },
                    { id: 'debito', name: 'Débito', settlementType: 'next_business_day', feeType: 'percent', tax: 0, delay: 1 },
                    { id: 'credito', name: 'Crédito', settlementType: 'monthly', payDay: 10, feeType: 'percent', tax: 0, delay: 30 },
                    { id: 'ifood', name: 'iFood', settlementType: 'weekly', closeDay: 0, payDay: 3, feeType: 'percent', tax: 0, delay: 7 }
                ]);
            }
        });
        
        const unsubCmv = db.collection(pathFin + "/cmv_data").doc("state").onSnapshot(s => {
            if(s.exists) {
                const d = s.data();
                setIngredients(d.ingredients || []); setRecipes(d.recipes || []); setComplements(d.complements || []); setCombos(d.combos || []); setFixedCosts(d.fixedCosts || []); 
                setCmvSettings({...cmvSettings, ...(d.settings || {})});
            }
        });

        const unsubAssinatura = db.doc(`usuarios/${permissoes.donoUid}`).onSnapshot(s => {
            const isMasterEmail = user?.email === 'burger.tribo@gmail.com' || user?.email === 'icaro.kts@gmail.com';

            if(s.exists) {
                const dados = s.data();
                if (!permissoes.isFuncionario) {
                    setUserRole(isMasterEmail ? 'master' : (dados.role || 'user')); 
                }
                setPlanoUsuario(dados.plano || 'completo'); 
                
                if (dados.expiraEm) {
                    const dataVencimento = dados.expiraEm.split('T')[0];
                    setAssinatura({ 
                        status: dados.plano === 'trial' ? 'teste_gratis' : (dados.status_assinatura || 'ativa'), 
                        vencimento: dataVencimento 
                    });
                }

                if (isMasterEmail && (dados.role !== 'master' || dados.status_assinatura !== 'ativa')) {
                    db.collection('usuarios').doc(permissoes.donoUid).set({
                        role: 'master',
                        plano: 'completo',
                        status_assinatura: 'ativa',
                        expiraEm: '2099-12-31T23:59:59.000Z'
                    }, { merge: true });
                }
            } else {
                if (!permissoes.isFuncionario) {
                    if (user?.emailVerified || isMasterEmail) {
                        const dataCriacao = new Date(user?.metadata?.creationTime || Date.now());
                        if (!isMasterEmail) {
                            dataCriacao.setDate(dataCriacao.getDate() + 30); 
                        }
                        
                        db.collection('usuarios').doc(permissoes.donoUid).set({
                            email: user?.email || '',
                            nome: user?.displayName || 'Sem Nome',
                            role: isMasterEmail ? 'master' : 'user',
                            plano: isMasterEmail ? 'completo' : 'trial', 
                            status_assinatura: isMasterEmail ? 'ativa' : 'teste_gratis',
                            expiraEm: isMasterEmail ? '2099-12-31T23:59:59.000Z' : dataCriacao.toISOString()
                        });

                        const vencimentoTeste = isMasterEmail ? '2099-12-31' : dataCriacao.toISOString().split('T')[0];
                        setAssinatura({ status: isMasterEmail ? 'ativa' : 'teste_gratis', vencimento: vencimentoTeste });
                        setPlanoUsuario(isMasterEmail ? 'completo' : 'trial');
                        if (isMasterEmail) setUserRole('master');
                    } else {
                        auth.signOut();
                        setUser(null);
                    }
                }
            }
        });

        return () => { unsubAcc(); unsubCat(); unsubSup(); unsubMeta(); unsubPay(); unsubCmv(); unsubAssinatura(); };
    }, [user, permissoes.donoUid]);

    useEffect(() => {
        if (!user || !permissoes.donoUid) return;
        
        const pathFin = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}`;
        
        const currentYear = filterMonth.split('-')[0];
        const startDateAno = `${currentYear}-01-01`;
        const endDateAno = `${currentYear}-12-31`;
        
        const [y, m] = filterMonth.split('-');
        const lastDay = new Date(y, m, 0).getDate();
        const startDateMes = `${filterMonth}-01`;
        const endDateMes = `${filterMonth}-${lastDay}`;
        
        const unsubTx = db.collection(pathFin + "/transactions")
            .where("date", ">=", startDateAno)
            .where("date", "<=", endDateAno)
            .onSnapshot(s => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
            
        const unsubDaily = db.collection(pathFin + "/dailyRecords")
            .where(firebase.firestore.FieldPath.documentId(), ">=", startDateAno)
            .where(firebase.firestore.FieldPath.documentId(), "<=", endDateAno)
            .onSnapshot(s => { const r = {}; s.docs.forEach(d => { if (d.exists) r[d.id] = d.data(); }); setDailyRecords(r); });

        const unsubOp = db.collection(pathFin + "/operational_logs")
            .onSnapshot(s => {
                const logs = s.docs.map(d => ({ id: d.id, ...d.data() }));
                logs.sort((a, b) => new Date(b.date) - new Date(a.date));
                setOpLogs(logs);
            });

        return () => { unsubTx(); unsubDaily(); unsubOp(); };
    }, [user, permissoes.donoUid, filterMonth]); 

    // ============================================================================
    // FILTRO UNIVERSAL DE CONTAS (Remove Duplicados e Aplica Ordem Alfabética)
    // ============================================================================
    const safeAccounts = useMemo(() => {
        const map = new Map();
        (accounts || []).forEach(acc => {
            if (acc.name && !map.has(acc.name.trim().toLowerCase())) {
                map.set(acc.name.trim().toLowerCase(), acc);
            }
        });
        return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [accounts]);
    // ============================================================================

    const getIngCost = (id, q) => { const i = ingredients.find(x => x.id === id); return i ? (i.cost / i.qty) * (p(q) * (i.unit==='kg'||i.unit==='L'?0.001:1)) : 0; };
    const calcItemCost = (ings) => (ings||[]).reduce((t, r) => t + getIngCost(r.ingredientId, r.qty), 0);
    const calcComboCost = (items) => (items||[]).reduce((t, i) => {
        if (i.type === 'recipe') return t + calcItemCost(recipes.find(r=>r.id===i.itemId)?.ingredients) * p(i.qty);
        if (i.type === 'complement') return t + calcItemCost(complements.find(c=>c.id===i.itemId)?.ingredients) * p(i.qty);
        return t + getIngCost(i.itemId, i.qty);
    }, 0);

    const paidInvoicesMap = useMemo(() => {
        const map = {};
        transactions.forEach(t => { if (isInvoicePayment(t) && t.type === 'entrada') { const m = getTxMonth(t); if (!map[m]) map[m] = []; map[m].push(t.account); } });
        return map;
    }, [transactions]);

    const getEffectiveStatus = (t) => {
        if (t.status === 'pago') return 'pago';
        if (safeAccounts.find(a => a.name === t.account)?.type === 'cartao' && paidInvoicesMap[getTxMonth(t)]?.includes(t.account)) return 'pago';
        return t.status;
    };

    const filteredDashboard = useMemo(() => {
        return transactions.filter(t => {
            if (!t) return false;
            return getTxMonth(t) === filterMonth &&
                   (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
                   (typeFilter === 'todos' || t.type === typeFilter) &&
                   (statusFilter === 'todos' || getEffectiveStatus(t) === statusFilter) &&
                   (accFilter === 'todas' || t.account === accFilter) &&
                   (catFilter.length === 0 || catFilter.includes(t.category));
        }).sort((a,b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    }, [transactions, filterMonth, searchQuery, typeFilter, statusFilter, accFilter, catFilter, safeAccounts, paidInvoicesMap]);

    const stats = useMemo(() => {
        let rb = 0; let catCosts = {}; let autoCardFees = 0; let totalPedidos = 0; let diasAtivos = 0;
        let weekdaySums = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0}; 
        let weekdayCounts = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0};

        let totalWorkingDaysInMonth = 0;
        const [yStr, mStr] = filterMonth.split('-');
        const y = parseInt(yStr); const m = parseInt(mStr);
        const daysInMonth = new Date(y, m, 0).getDate();
        const wDays = cmvSettings.workingDays || [0, 1, 2, 3, 4, 5, 6]; 
        
        for(let i = 1; i <= daysInMonth; i++) {
            if (wDays.includes(new Date(y, m - 1, i).getDay())) {
                totalWorkingDaysInMonth++;
            }
        }

        Object.keys(dailyRecords).forEach(d => {
            if (d.startsWith(filterMonth)) {
                const r = dailyRecords[d];
                const totalDia = paymentMethods.reduce((s, f) => s + p(r[f.id]), 0);
                if (totalDia > 0) diasAtivos++; rb += totalDia; totalPedidos += p(r.qtdPedidos);
                
                if (cmvSettings.autoFeeVendas !== false) {
                    paymentMethods.forEach(m => {
                        if (m.feeType === 'percent' && p(m.tax) > 0) {
                            autoCardFees += p(r[m.id]) * (p(m.tax) / 100);
                        }
                    });
                }
                
                const wd = new Date(parseInt(d.split('-')[0]), parseInt(d.split('-')[1])-1, parseInt(d.split('-')[2])).getDay();
                if (totalDia > 0) { weekdaySums[wd] += totalDia; weekdayCounts[wd]++; }
            }
        });
        
        if (autoCardFees > 0) catCosts['Taxas de Cartão (Auto Vendas)'] = autoCardFees;
        transactions.forEach(t => { if (getTxMonth(t) === filterMonth && !isInvoicePayment(t) && t.type === 'saida') { catCosts[t.category] = (catCosts[t.category] || 0) + p(t.amount); } });
        const operCosts = Object.values(catCosts).reduce((a,b)=>a+b, 0);
        const weekdayNames = {0:'Domingo', 1:'Segunda', 2:'Terça', 3:'Quarta', 4:'Quinta', 5:'Sexta', 6:'Sábado'};
        const weekdayAverages = Object.keys(weekdaySums).map(wd => ({ name: weekdayNames[wd], avg: weekdayCounts[wd] > 0 ? weekdaySums[wd] / weekdayCounts[wd] : 0, count: weekdayCounts[wd] })).filter(x => x.avg > 0).sort((a, b) => b.avg - a.avg);

        const projecaoMensal = diasAtivos > 0 ? (rb / diasAtivos) * totalWorkingDaysInMonth : 0;

        return { rb, catCosts, lucro: rb - operCosts, autoCardFees, diasAtivos, totalPedidos, ticketDiario: diasAtivos > 0 ? rb / diasAtivos : 0, ticketPedido: totalPedidos > 0 ? rb / totalPedidos : 0, projecaoMensal, weekdayAverages };
    }, [dailyRecords, transactions, filterMonth, cmvSettings, paymentMethods]);

    const salesDays = useMemo(() => Object.keys(dailyRecords).filter(d=>d.startsWith(filterMonth)).sort((a,b)=>new Date(b)-new Date(a)), [dailyRecords, filterMonth]);
    const columnTotals = useMemo(() => {
        const totals = { totalDia: 0, pedidos: 0, taxaEntrega: 0, motoboy: 0 };
        paymentMethods.forEach(m => totals[m.id] = 0);

        salesDays.forEach(d => {
            const r = dailyRecords[d] || {};
            totals.totalDia += paymentMethods.reduce((acc, f) => acc + p(r[f.id]), 0);
            totals.pedidos += p(r.qtdPedidos);
            paymentMethods.forEach(f => { totals[f.id] += p(r[f.id]); });
            totals.taxaEntrega += p(r.taxaEntrega); totals.motoboy += p(r.motoboy);
        });
        return totals;
    }, [dailyRecords, salesDays, paymentMethods]);

    const cardStats = useMemo(() => safeAccounts.filter(a => a.type === 'cartao').map(card => {
        const txs = transactions.filter(t => t.account === card.name && getTxMonth(t) === filterMonth);
        const totalPurchases = txs.filter(t => !isInvoicePayment(t)).reduce((acc, t) => t.type === 'saida' ? acc + p(t.amount) : acc - p(t.amount), 0);
        const totalPaid = txs.filter(t => isInvoicePayment(t)).reduce((acc, t) => t.type === 'entrada' ? acc + p(t.amount) : acc - p(t.amount), 0);
        return { ...card, currentBalance: totalPurchases - totalPaid };
    }), [transactions, safeAccounts, filterMonth]);

    const uniqueDescriptions = useMemo(() => [...new Set(transactions.map(t => t.description).filter(Boolean))].sort(), [transactions]);

    const saveCMVDoc = async (field, data) => { if (!user || !permissoes.donoUid) return; await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/cmv_data`).doc('state').set({ [field]: data }, { merge: true }); };
    const saveMeta = async (v) => { if (!user || !permissoes.donoUid) return; await db.doc(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/settings/config`).set({ meta: p(v) }, { merge: true }); };

    const addSup = async (e) => { 
        e.preventDefault(); 
        if(supForm && user && permissoes.donoUid) { 
            await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/suppliers`).add({name: supForm}); 
            setSupForm(''); 
        } 
    };

    const addOpLog = async (logData) => {
        if (!user || !permissoes.donoUid) return;
        await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/operational_logs`).add(logData);
    };

    const deleteOpLog = async (id) => {
        if (!user || !permissoes.donoUid) return;
        if (window.confirm("Deseja realmente excluir este registro?")) {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/operational_logs`).doc(id).delete();
        }
    };

    const crudActionCMV = async (collectionStr, stateArr, formObj, setModalOpen) => {
        if (!user) return;
        const list = [...stateArr]; 
        const id = formObj.id || crypto.randomUUID(); 
        const index = list.findIndex(x => x.id === id);
        let record = { ...formObj, id };
        if (record.sellingPrice) record.sellingPrice = p(record.sellingPrice); 
        if (record.cost) record.cost = p(record.cost);
        if (record.qty) record.qty = p(record.qty); 
        if (record.value) record.value = p(record.value);
        if (record.ingredients) record.ingredients = record.ingredients.filter(i => i.ingredientId && p(i.qty) > 0);
        if (record.items) record.items = record.items.filter(i => i.itemId && p(i.qty) > 0);
        if (index > -1) list[index] = record; else list.push(record);
        await saveCMVDoc(collectionStr, list); 
        setModalOpen(false);
    };

    const delActionCMV = async (collectionStr, stateArr, id) => { if(window.confirm("Confirmar exclusão?")) await saveCMVDoc(collectionStr, stateArr.filter(x => x.id !== id)); };

    const executeDelete = async (collectionName, id) => {
        if (!user || !permissoes.donoUid) return;
        if (deleteConfirmId === id) {
            
            if (id) {
                await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/${collectionName}`).doc(id).delete().catch(()=>{});
            }

            if (collectionName === 'accounts' || collectionName === 'categories') {
                const settingKey = collectionName;
                if (cmvSettings[settingKey]) {
                    const currentList = cmvSettings[settingKey].filter(x => x.id !== id && x.name !== id);
                    const newSettings = { ...cmvSettings, [settingKey]: currentList };
                    setCmvSettings(newSettings);
                    saveCMVDoc('settings', newSettings);
                }
            }

            setDeleteConfirmId(null);
        } else { 
            setDeleteConfirmId(id); 
            setTimeout(() => setDeleteConfirmId(null), 3000); 
        }
    };

    const openDailyLaunch = (date, record) => {
        const quantities = {};
        paymentMethods.forEach(m => {
            if (m.feeType === 'fixed' && p(record[m.id]) > 0) {
                quantities[m.id] = '';
            }
        });
        setDailyLaunchModal({ date, record, account: '', quantities });
    };

    const executeDailyLaunch = async () => {
        if (!user || !permissoes.donoUid || !dailyLaunchModal || !dailyLaunchModal.account) return;
        
        const { date, record, account, quantities } = dailyLaunchModal;
        
        for (const m of paymentMethods) {
            const val = p(record[m.id]);
            if (val > 0 && m.feeType === 'fixed' && (quantities[m.id] === '' || quantities[m.id] === undefined)) {
                alert(`Por favor, informe a quantidade de vendas de: ${m.name}`);
                return;
            }
        }

        const path = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/transactions`;
        const batch = db.batch();
        const timestamp = new Date().toISOString();

        const createTx = (desc, amount, taxAmount, taxDesc, targetAccount, options = {}) => {
            if (amount <= 0) return;
            const { category = 'Vendas', status = 'pendente', clearanceDate = date, txSupplier = 'Clientes' } = options;

            const mainRef = db.collection(path).doc();
            batch.set(mainRef, {
                description: `Vendas ${desc} - ${date.split('-').reverse().join('/')}`,
                amount: amount, type: 'entrada', account: targetAccount, destinationAccount: '',
                category: category, supplier: txSupplier, status: status,
                date: date, clearanceDate: clearanceDate, installments: 1,
                feeType: 'none', feePercent: 0, timestamp
            });

            if (taxAmount > 0) {
                const taxRef = db.collection(path).doc();
                const isApp = category.includes('App') || category.includes('iFood') || category.includes('99');
                batch.set(taxRef, {
                    description: taxDesc,
                    amount: taxAmount, type: 'saida', account: targetAccount, destinationAccount: '',
                    category: isApp ? 'Taxas de Aplicativo' : 'Taxas Bancárias', 
                    supplier: isApp ? desc : 'Operadora', status: status,
                    date: date, clearanceDate: clearanceDate, installments: 1,
                    feeType: 'none', feePercent: 0, timestamp
                });
            }
        };

        for (const m of paymentMethods) {
            const amount = p(record[m.id]);
            if (amount <= 0) continue;

            // 👉 TRAVA DE SEGURANÇA: Se o método estiver marcado como "Não Lançar", ignora-o
            if (m.lancaAReceber === false) continue;

            let clearanceDate = date;
            let status = 'pendente'; 

            if (m.settlementType === 'next_business_day') {
                clearanceDate = getNextBusinessDay(date);
            } else if (m.settlementType === 'weekly') {
                clearanceDate = getNextWeeklyDate(date, m.closeDay, m.payDay);
            } else if (m.settlementType === 'monthly') {
                const [y, month, d] = date.split('-').map(Number);
                let nextMonth = month + 1;
                let targetYear = y;
                if (nextMonth > 12) {
                    nextMonth = 1;
                    targetYear++;
                }
                const targetDay = Number(m.payDay) || 10;
                clearanceDate = `${targetYear}-${String(nextMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
            } else if (m.delay > 0) {
                const [y, month, d] = date.split('-').map(Number);
                const cd = new Date(y, month - 1, d);
                cd.setDate(cd.getDate() + Number(m.delay));
                clearanceDate = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`;
            }

            let taxAmount = 0;
            let taxDesc = '';
            if (m.feeType === 'percent') {
                taxAmount = amount * (Number(m.tax) / 100);
                taxDesc = `Taxa ${m.name} (${m.tax}%) - Vendas`;
            } else if (m.feeType === 'fixed') {
                const qty = parseInt(quantities[m.id]) || 0;
                taxAmount = qty * Number(m.tax);
                taxDesc = `Taxa Fixa ${m.name} (${qty}x R$${Number(m.tax).toFixed(2).replace('.', ',')})`;
            }

            let catName = 'Vendas';
            const nameLower = m.name.toLowerCase();
            if (nameLower.includes('ifood') || nameLower.includes('99')) catName = `Vendas ${m.name}`;
            else if (m.id.toLowerCase().includes('pixonline') || nameLower.includes('tuna')) catName = 'Vendas Pix Online';

            createTx(m.name, amount, taxAmount, taxDesc, account, {
                category: catName,
                status: status,
                clearanceDate: clearanceDate,
                txSupplier: m.name
            });
        }

        const drRef = db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/dailyRecords`).doc(date);
        batch.set(drRef, { isLaunched: true }, { merge: true });

        await batch.commit();
        setDailyLaunchModal(null);
    };

    const reopenDailyLaunch = async (date) => {
        if (!user || !permissoes.donoUid) return;
        if (window.confirm("ATENÇÃO: Reabrir o caixa não apaga os lançamentos que já foram gerados. Se for lançar de novo, vá ao Dashboard e exclua os antigos para não duplicar o seu saldo! Deseja reabrir a data?")) {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/dailyRecords`).doc(date).set({ isLaunched: false }, { merge: true });
        }
    };

    const handleAddTransaction = async (txData) => {
        if (!user || !permissoes.donoUid) return;
        const path = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/transactions`;
        const payload = {
            description: txData.description || '',
            amount: p(txData.amount) || 0,
            type: txData.type || 'saida',
            account: txData.account || '',
            destinationAccount: txData.destinationAccount || '',
            category: txData.category || '',
            supplier: txData.supplier || '',
            status: txData.status || 'pendente',
            date: txData.date || getLocalDateStr(),
            clearanceDate: txData.date || getLocalDateStr(),
            installments: 1,
            feeType: 'none',
            feePercent: 0,
            timestamp: new Date().toISOString()
        };
        await db.collection(path).add(payload);
    };

    const handleExecuteTaxLaunch = async () => {
        if (!user || !permissoes.donoUid) return;
        
        let strVal = String(taxLaunchFormData.amount).replace(/[^0-9,-]/g, '');
        strVal = strVal.replace(',', '.');
        
        const impostoSimples = parseFloat(strVal);
        
        if (isNaN(impostoSimples) || impostoSimples <= 0) {
            alert("Valor do imposto inválido.");
            return;
        }

        const path = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/transactions`;
        const payload = {
            description: `Imposto Simples Nacional (${filterMonth})`,
            amount: impostoSimples,
            type: 'saida',
            account: '',
            destinationAccount: '',
            category: 'Impostos', 
            supplier: 'Receita Federal / DAS',
            status: taxLaunchFormData.status,
            date: taxLaunchFormData.date,
            clearanceDate: taxLaunchFormData.date,
            installments: 1,
            feeType: 'none',
            feePercent: 0,
            timestamp: new Date().toISOString()
        };

        if (taxLaunchFormData.id) {
            await db.collection(path).doc(taxLaunchFormData.id).update(payload);
            alert("Imposto atualizado com sucesso!");
        } else {
            await db.collection(path).add(payload);
            alert("Imposto lançado com sucesso no seu Financeiro!");
        }
        
        setShowTaxLaunchModal(false);
    };

    const handleSaveTx = async (e) => {
        e.preventDefault(); 
        if (!user || !permissoes.donoUid || !txForm.val) return;
        const path = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/transactions`;
        const baseAmount = p(txForm.val);
        const timestamp = new Date().toISOString();

        let finalClearance = txForm.clearance;
        let isCard = false;
        const selectedAcc = safeAccounts.find(a => a.name === txForm.acc);
        
        if (selectedAcc && selectedAcc.type === 'cartao' && selectedAcc.closing && selectedAcc.due) {
            isCard = true;
            const [yStr, mStr, dStr] = txForm.date.split('-');
            let year = parseInt(yStr, 10);
            let month = parseInt(mStr, 10);
            let day = parseInt(dStr, 10);

            const closingDay = parseInt(selectedAcc.closing, 10);
            const dueDay = parseInt(selectedAcc.due, 10);

            let targetMonth = month;
            let targetYear = year;

            if (day >= closingDay) targetMonth += 1;
            if (dueDay < closingDay) targetMonth += 1;

            while (targetMonth > 12) {
                targetMonth -= 12;
                targetYear += 1;
            }

            const fm = String(targetMonth).padStart(2, '0');
            const fd = String(dueDay).padStart(2, '0');
            finalClearance = `${targetYear}-${fm}-${fd}`;
        }

        if (txForm.id) {
            const payload = { 
                description: txForm.desc, amount: baseAmount, type: txForm.type, 
                account: txForm.acc, destinationAccount: txForm.destAcc || '', 
                category: txForm.cat, supplier: txForm.sup || '', 
                status: isCard ? 'pendente' : txForm.status,
                date: txForm.date, clearanceDate: finalClearance, installments: txForm.inst || 1, 
                feeType: txForm.feeType || 'none', feePercent: txForm.feePercent || 0, timestamp 
            };
            await db.collection(path).doc(txForm.id).update(payload);
        } else {
            const numInst = parseInt(txForm.inst) || 1;
            const instAmount = numInst > 1 ? baseAmount / numInst : baseAmount; 
            const batch = db.batch();

            const getOffsetDate = (baseDateStr, offsetMonths) => {
                if (!baseDateStr) return '';
                const [y, m, d] = baseDateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1 + offsetMonths, d);
                return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            };

            for (let i = 0; i < numInst; i++) {
                const instDate = getOffsetDate(txForm.date, i);
                const instClearance = getOffsetDate(finalClearance, i);
                const instDesc = numInst > 1 ? `${txForm.desc} (${i + 1}/${numInst})` : txForm.desc;
                
                let instStatus = txForm.status;
                if (isCard) instStatus = 'pendente';
                else if (i > 0) instStatus = 'pendente';

                if (txForm.type === 'entrada' && txForm.feeType !== 'none' && p(txForm.feePercent) > 0) {
                    const feePercent = p(txForm.feePercent);
                    const taxAmount = instAmount * (feePercent / 100);
                    
                    const mainRef = db.collection(path).doc();
                    batch.set(mainRef, { 
                        description: instDesc, amount: instAmount, type: 'entrada', 
                        account: txForm.acc, destinationAccount: '', category: txForm.cat, 
                        supplier: txForm.sup || '', status: instStatus, date: instDate, 
                        clearanceDate: instClearance, installments: numInst, 
                        feeType: txForm.feeType, feePercent: feePercent, timestamp 
                    });

                    const taxRef = db.collection(path).doc();
                    batch.set(taxRef, {
                        description: `Taxa Máquina (${feePercent}%) - ${instDesc}`,
                        amount: taxAmount, type: 'saida', account: txForm.acc,
                        destinationAccount: '', category: 'Taxas Bancárias',
                        supplier: 'Operadora Cartão', status: instStatus, 
                        date: instDate, clearanceDate: instClearance, installments: 1,
                        feeType: 'none', feePercent: 0, timestamp
                    });
                } else {
                    const mainRef = db.collection(path).doc();
                    batch.set(mainRef, { 
                        description: instDesc, amount: instAmount, type: txForm.type, 
                        account: txForm.acc, destinationAccount: txForm.destAcc || '', 
                        category: txForm.cat, supplier: txForm.sup || '', status: instStatus, 
                        date: instDate, clearanceDate: instClearance, installments: numInst, 
                        feeType: txForm.feeType || 'none', feePercent: txForm.feePercent || 0, timestamp 
                    });
                }
            }
            await batch.commit();
        }
        
        setTxForm({ id: null, desc: '', val: '', type: 'saida', acc: '', destAcc: '', cat: '', sup: '', status: 'pago', date: getLocalDateStr(), clearance: getLocalDateStr(), inst: 1, feeType: 'none', feePercent: 0 });
    };

    const addCat = async (e) => { 
        e.preventDefault(); 
        if(catForm && user && permissoes.donoUid) { 
            await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/categories`).add({name: catForm}); 
            
            const currentCats = cmvSettings.categories || [];
            currentCats.push({ id: crypto.randomUUID(), name: catForm });
            const newSettings = { ...cmvSettings, categories: currentCats };
            setCmvSettings(newSettings);
            saveCMVDoc('settings', newSettings);
            
            setCatForm(''); 
        } 
    };

    const handleSaveAcc = async (e) => { 
        e.preventDefault(); 
        if (!accForm.name || !user || !permissoes.donoUid) return; 
        
        const pathAcc = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/accounts`; 
        let finalId = accForm.id;
        
        if (accForm.id && accForm.isEditing) {
            await db.collection(pathAcc).doc(accForm.id).update({
                name: accForm.name, type: accForm.type, closing: accForm.closing || '', due: accForm.due || ''
            });
        } else {
            const res = await db.collection(pathAcc).add({
                name: accForm.name, type: accForm.type, closing: accForm.closing || '', due: accForm.due || '', group: 'operacional'
            });
            finalId = res.id;
        }

        let currentAccs = cmvSettings.accounts || [];
        if (accForm.id && accForm.isEditing) {
            currentAccs = currentAccs.map(a => 
                (a.id === accForm.id || a.name === accForm.originalName) 
                ? { ...a, name: accForm.name, type: accForm.type, closing: accForm.closing, due: accForm.due } 
                : a
            );
        } else {
            currentAccs.push({ id: finalId, name: accForm.name, type: accForm.type, closing: accForm.closing, due: accForm.due });
        }
        
        const newSettings = { ...cmvSettings, accounts: currentAccs };
        setCmvSettings(newSettings);
        saveCMVDoc('settings', newSettings);

        setAccForm({ id: null, isEditing: false, originalName: '', name: '', type: 'corrente', group: 'operacional', limit: '', closing: '', due: '' }); 
    };

    const openLiquidation = (t) => { if (t.isInvoice) { setActiveTab('cartoes'); return; } setLiqModal({ id: t.id, description: t.description || '', amount: String(t.amount || 0).replace('.', ','), date: getLocalDateStr(), account: t.account || '' }); };
    const executeLiquidation = async () => { if (!user || !permissoes.donoUid || !liqModal) return; await db.collection(`artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/transactions`).doc(liqModal.id).update({ status: 'pago', clearanceDate: liqModal.date, amount: p(liqModal.amount), account: liqModal.account }); setLiqModal(null); };
    
    const handleExecuteInvoicePayment = async () => {
        if (!user || !permissoes.donoUid || !invoiceModal || !invoiceSourceAcc) return;
        const path = `artifacts/tribo-burger-financeiro/users/${permissoes.donoUid}/transactions`;
        const paidAmount = invoicePayType === 'integral' ? invoiceModal.total : p(invoicePartialVal);
        
        if (paidAmount <= 0) {
            alert("Por favor, digite um valor válido para o pagamento parcial.");
            return; 
        }

        const todayStr = getLocalDateStr();
        const batch = db.batch();
        
        batch.set(db.collection(path).doc(), { description: `Baixa Fatura ${invoiceModal.cardName}`, amount: paidAmount, type: 'saida', status: 'pago', date: todayStr, clearanceDate: todayStr, billingMonth: filterMonth, account: invoiceSourceAcc, category: 'Baixa Fatura', timestamp: new Date().toISOString() });
        batch.set(db.collection(path).doc(), { description: `Pagamento de Fatura Mês ${filterMonth}`, amount: paidAmount, type: 'entrada', status: 'pago', date: todayStr, clearanceDate: filterMonth + "-28", billingMonth: filterMonth, account: invoiceModal.cardName, category: 'Baixa Fatura', timestamp: new Date().toISOString() });
        
        if (invoicePayType === 'parcial' && invoiceMoveToNext) {
            const restante = invoiceModal.total - paidAmount;
            if (restante > 0) {
                const [yStr, mStr] = filterMonth.split('-');
                let y = parseInt(yStr, 10);
                let m = parseInt(mStr, 10);
                m += 1;
                if (m > 12) { m = 1; y += 1; }
                const proxMes = `${y}-${String(m).padStart(2, '0')}`;
                
                batch.set(db.collection(path).doc(), { 
                    description: `Rolagem para o próximo mês`, 
                    amount: restante, 
                    type: 'entrada', 
                    status: 'pago', 
                    date: todayStr, 
                    clearanceDate: filterMonth + "-28", 
                    billingMonth: filterMonth,
                    account: invoiceModal.cardName, 
                    category: 'Baixa Fatura', 
                    timestamp: new Date().toISOString() 
                });

                batch.set(db.collection(path).doc(), { 
                    description: `Saldo em aberto de ${filterMonth}`, 
                    amount: restante, 
                    type: 'saida', 
                    status: 'pendente', 
                    date: todayStr, 
                    clearanceDate: proxMes + "-01", 
                    billingMonth: proxMes,
                    account: invoiceModal.cardName, 
                    category: 'Fatura Rolada', 
                    timestamp: new Date().toISOString() 
                });
            }
        }
        
        await batch.commit(); 
        
        setInvoiceModal(null); 
        setInvoicePartialVal(''); 
        setInvoiceSourceAcc('');
        setInvoicePayType('integral'); 
        setInvoiceMoveToNext(true);
    };

    const activeRecCats = Array.from(new Set([...recCats, ...recipes.map(r => r.category)])).filter(Boolean).sort();
    const activeCompCats = Array.from(new Set([...compCats, ...complements.map(c => c.category)])).filter(Boolean).sort();
    const activeComboCats = Array.from(new Set([...comboCats, ...combos.map(c => c.category)])).filter(Boolean).sort();

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-emerald-600 font-black uppercase text-[11px]">Carregando o sistema...</div>;

    if (!user) {
        return <Login onLogin={(u, perms) => {
            setUser(u);
            if (perms) {
                setPermissoes(perms);
                if (perms.isFuncionario) setUserRole(perms.cargo);
            }
        }} />;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const estaBloqueado = assinatura.vencimento < hoje && assinatura.status !== 'vitalicio' && userRole !== 'master' && !permissoes.isFuncionario;

    if (estaBloqueado) {
        return <Bloqueio assinatura={assinatura} handleLogout={() => auth.signOut()} />;
    }

    return (
        <>
            <div className="bg-black text-right p-1 print:hidden border-b-2 border-black flex justify-end items-center">
                <span className="text-white text-[10px] uppercase font-bold mr-3 flex gap-2">
                    {user.email} 
                    {permissoes.isFuncionario ? (
                        <span className="text-amber-400 bg-amber-400/10 px-2 rounded">({permissoes.cargo})</span>
                    ) : (
                        userRole === 'master' && <span className="text-indigo-400">(MASTER)</span>
                    )}
                </span>
                <button onClick={() => auth.signOut()} className="text-red-400 text-[10px] uppercase font-bold hover:text-red-300">Sair da Conta</button>
            </div>

            <Layout activeTab={activeTab} setActiveTab={setActiveTab} companyName={cmvSettings?.companyName} logoUrl={cmvSettings?.logoUrl} assinatura={assinatura} userRole={userRole} planoDoUsuario={planoUsuario}>
                
                <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border print:hidden sticky top-0 z-30 mb-4">
                    <h2 className="font-black text-slate-800 uppercase pl-2 hidden md:block text-[11px]">{activeTab.replace('fin_', '').replace('cmv_', '').replace(/_/g, ' ')}</h2>
                    <div className="flex items-center gap-2 ml-auto md:ml-0">

                        {activeTab === 'fin_dashboard' && (
                            <button 
                                onClick={() => {
                                    const [y, m] = filterMonth.split('-');
                                    const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
                                    
                                    const existingTax = transactions.find(t => 
                                        t.category === 'Impostos' && 
                                        t.description.includes(filterMonth)
                                    );

                                    if (existingTax) {
                                        setTaxLaunchFormData({ 
                                            id: existingTax.id, 
                                            date: existingTax.date, 
                                            status: existingTax.status, 
                                            amount: formatNumberBR(existingTax.amount)
                                        });
                                    } else {
                                        const suggestedAmount = stats.rb * (p(cmvSettings.tax) / 100);
                                        setTaxLaunchFormData({ 
                                            id: null, 
                                            date: lastDay, 
                                            status: 'pendente', 
                                            amount: formatNumberBR(suggestedAmount)
                                        });
                                    }
                                    setShowTaxLaunchModal(true);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black uppercase text-[9px] flex items-center gap-1 shadow-sm transition-colors"
                            >
                                <Icon name="file-plus" size={12} /> Lançar Imposto
                            </button>
                        )}

                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-xl border">
                            <span className="font-black uppercase text-slate-400 text-[10px]">Mês:</span>
                            <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="bg-transparent border-0 outline-none font-black text-emerald-600 cursor-pointer text-[10px]" />
                        </div>
                    </div>
                </div>

                {activeTab === 'fornecedores' && <Fornecedores suppliers={suppliers} supForm={supForm} setSupForm={setSupForm} addSup={addSup} executeDelete={executeDelete} deleteConfirmId={deleteConfirmId} />}
                {activeTab === 'funcionarios' && <GestaoFuncionarios />}
                {activeTab === 'delivery' && <GestaoDelivery />}
                {activeTab === 'freelancer' && <GestaoFreelancer />}
                {activeTab === 'relatorio_rh' && <RelatorioRH transactions={transactions} filterMonth={filterMonth} />}
                {activeTab === 'fin_dashboard' && <DashboardFin txForm={txForm} setTxForm={setTxForm} uniqueDescriptions={uniqueDescriptions} accounts={safeAccounts} categories={categories} suppliers={suppliers} filteredDashboard={filteredDashboard} visibleTxCount={visibleTxCount} setVisibleTxCount={setVisibleTxCount} getEffectiveStatus={getEffectiveStatus} safeDateDisplay={safeDateDisplay} formatMoney={formatMoney} searchQuery={searchQuery} setSearchQuery={setSearchQuery} typeFilter={typeFilter} setTypeFilter={setTypeFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} accFilter={accFilter} setAccFilter={setAccFilter} isCatMenuOpen={isCatMenuOpen} setIsCatMenuOpen={setIsCatMenuOpen} catFilter={catFilter} setCatFilter={setCatFilter} handleSaveTx={handleSaveTx} executeDelete={executeDelete} deleteConfirmId={deleteConfirmId} cmvSettings={cmvSettings} />}
                {activeTab === 'saldos' && <Saldos accounts={safeAccounts} transactions={transactions} getEffectiveStatus={getEffectiveStatus} />}
                {activeTab === 'vendas' && <Vendas stats={stats} newDayDate={newDayDate} setNewDayDate={setNewDayDate} user={{uid: permissoes.donoUid}} salesDays={salesDays} dailyRecords={dailyRecords} columnTotals={columnTotals} openDailyLaunch={openDailyLaunch} reopenDailyLaunch={reopenDailyLaunch} cmvSettings={cmvSettings} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} />}
                {activeTab === 'a_pagar' && <APagar transactions={transactions} accounts={safeAccounts} filterMonth={filterMonth} getEffectiveStatus={getEffectiveStatus} openLiquidation={openLiquidation} />}
                {activeTab === 'a_receber' && <AReceber transactions={transactions} accounts={safeAccounts} filterMonth={filterMonth} getEffectiveStatus={getEffectiveStatus} openLiquidation={openLiquidation} />}
                {activeTab === 'cartoes' && <Cartoes cardStats={cardStats} filterMonth={filterMonth} setInvoiceModal={setInvoiceModal} transactions={transactions} />}
                {activeTab === 'resultados' && <Resultados filterMonth={filterMonth} dailyRecords={dailyRecords} stats={stats} transactions={transactions} />}
                {activeTab === 'dre' && <Dre filterMonth={filterMonth} stats={stats} />}
                {activeTab === 'operacional' && <Operacional logs={opLogs} addOpLog={addOpLog} deleteOpLog={deleteOpLog} />}             
                {activeTab === 'cmv_dashboard' && <CmvDashboard recipes={recipes} complements={complements} combos={cmvSettings} ingredients={ingredients} calcItemCost={calcItemCost} calcComboCost={calcComboCost} />}
                {activeTab === 'insumos' && <Insumos ingredients={ingredients} ingCats={ingCats} setIngForm={setIngForm} setIsIngModalOpen={setIsIngModalOpen} executeDelete={executeDelete} getIngCost={getIngCost} />}
                {activeTab === 'fichas' && <Fichas recipes={recipes} recCats={activeRecCats} setRecipeForm={setRecipeForm} setIsRecipeModalOpen={setIsRecipeModalOpen} delActionCMV={delActionCMV} calcItemCost={calcItemCost} cmvSettings={cmvSettings} />}
                {activeTab === 'complementos' && <Complementos complements={complements} compCats={activeCompCats} setCompForm={setCompForm} setIsCompModalOpen={setIsCompModalOpen} delActionCMV={delActionCMV} calcItemCost={calcItemCost} />}
                {activeTab === 'combos' && <Combos combos={combos} comboCats={activeComboCats} setComboForm={setComboForm} setIsComboModalOpen={setIsComboModalOpen} delActionCMV={delActionCMV} calcComboCost={calcComboCost} cmvSettings={cmvSettings} />}
                {activeTab === 'analise' && <Analise fixedCosts={fixedCosts} recipes={recipes} complements={complements} combos={combos} cmvSettings={cmvSettings} stats={stats} calcItemCost={calcItemCost} calcComboCost={calcComboCost} />}
                {activeTab === 'custos_fixos' && <CustosFixos fixedCosts={fixedCosts} fcCats={fcCats} fcForm={fcForm} setFcForm={setFcForm} crudActionCMV={crudActionCMV} setIsFcModalOpen={setIsFcModalOpen} delActionCMV={delActionCMV} />}
                {activeTab === 'ajustes' && <Ajustes cmvSettings={cmvSettings} setCmvSettings={setCmvSettings} metaVendas={metaVendas} setMetaVendas={setMetaVendas} saveCMVDoc={saveCMVDoc} saveMeta={saveMeta} catForm={catForm} setCatForm={setCatForm} addCat={addCat} accForm={accForm} setAccForm={setAccForm} handleSaveAcc={handleSaveAcc} accounts={safeAccounts} categories={categories} executeDelete={executeDelete} user={{uid: permissoes.donoUid}} />}
                {activeTab === 'minha_conta' && <MinhaConta />}
                {activeTab === 'assinatura' && <Assinatura assinatura={assinatura} user={{uid: permissoes.donoUid}} />}
                {activeTab === 'relatorio_unificado' && <RelatorioUnificado metaVendas={metaVendas} fixedCosts={fixedCosts} recipes={recipes} complements={complements} combos={combos} dailyRecords={dailyRecords} salesDays={salesDays} stats={stats} cmvSettings={cmvSettings} formatMoney={formatMoney} p={p} calcItemCost={calcItemCost} calcComboCost={calcComboCost} transactions={transactions} filterMonth={filterMonth} addTransaction={handleAddTransaction} paymentMethods={paymentMethods} />}
                {activeTab === 'extrato_detalhado' && <ExtratoDetalhado transactions={transactions} filterMonth={filterMonth} />}
                {activeTab === 'consultor_ia' && <ConsultorIA stats={stats} faturamentoTotal={stats.rb} filterMonth={filterMonth} user={{uid: permissoes.donoUid}} />}
                {activeTab === 'marketing' && <MarketingMenu filterMonth={filterMonth} transactions={transactions} user={{uid: permissoes.donoUid}} />}
                {activeTab === 'migrador' && <Migrador />}
                {activeTab === 'painel_master' && <PainelMaster usuarioLogado={{...user, role: userRole}} />}

                {activeTab === 'gestao_pedidos' && <GestaoPedidos />}
                {activeTab === 'historico_pedidos' && <HistoricoPedidos />}
                {activeTab === 'catalogo_delivery' && <CatalogoDelivery />}
                {activeTab === 'clientes_delivery' && <ClientesDelivery />}
                {activeTab === 'areas_entrega' && <AreaEntregaDelivery />} 
                {activeTab === 'fidelidade' && <Fidelidade />} 
                
                {showTaxLaunchModal && (
                    <div className="modal-overlay z-[110] p-4">
                        <div className="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl border-t-4 border-emerald-500 flex flex-col gap-4 scale-up-center bg-white">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                    <Icon name="file-text" size={16} className="text-emerald-500"/> 
                                    {taxLaunchFormData.id ? 'Editar Imposto Salvo' : 'Lançar Imposto Simples'}
                                </h3>
                                <button onClick={() => setShowTaxLaunchModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><Icon name="x" size={18}/></button>
                            </div>
                            
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-emerald-600 block mb-2">
                                    {taxLaunchFormData.id ? 'Valor Salvo no Banco de Dados (Rastreado)' : 'Valor Calculado (Editável)'}
                                </span>
                                
                                <div className="flex justify-center items-center gap-1">
                                    <span className="text-2xl font-black text-emerald-900">R$</span>
                                    <input 
                                        type="text" 
                                        value={taxLaunchFormData.amount}
                                        onChange={e => setTaxLaunchFormData({...taxLaunchFormData, amount: e.target.value})}
                                        className="text-2xl font-black text-emerald-900 bg-transparent border-b-2 border-emerald-300 focus:border-emerald-600 outline-none w-32 text-center transition-colors pb-1"
                                    />
                                </div>
                                
                                {!taxLaunchFormData.id && (
                                    <span className="text-[9px] font-bold text-emerald-500 block mt-3">
                                        BASE APURADA: R$ {formatNumberBR(stats.rb)} X {cmvSettings.tax}%
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Data do Vencimento/Pagamento</label>
                                <input type="date" required value={taxLaunchFormData.date} onChange={e => setTaxLaunchFormData({...taxLaunchFormData, date: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500 mt-1" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Status Atual</label>
                                <select value={taxLaunchFormData.status} onChange={e => setTaxLaunchFormData({...taxLaunchFormData, status: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500 mt-1">
                                    <option value="pendente">Pendente (Em Aberto)</option>
                                    <option value="pago">Pago</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button onClick={handleExecuteTaxLaunch} className="w-full p-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wide rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                                    <Icon name="check-circle" size={16} /> Confirmar {taxLaunchFormData.id ? 'Alteração' : 'Lançamento'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {dailyLaunchModal && (
                    <div className="modal-overlay z-[110] p-4">
                        <div className="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl border-t-4 border-emerald-500 flex flex-col gap-4 scale-up-center bg-white">
                            <div className="text-center">
                                <h3 className="font-black uppercase text-slate-800 mb-1 tracking-widest">Lançar Entradas do Dia</h3>
                                <p className="font-black text-sm text-slate-500 uppercase leading-tight">{dailyLaunchModal.date.split('-').reverse().join('/')}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                                {paymentMethods.map(m => {
                                    const val = p(dailyLaunchModal.record[m.id]);
                                    if (val === 0) return null;
                                    return (
                                        <div key={m.id} className="flex justify-between text-[10px] font-black text-slate-600 uppercase">
                                            <span>{m.name}:</span>
                                            <span>{formatMoney(val)}</span>
                                        </div>
                                    );
                                })}
                                
                                <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-[11px] font-black text-slate-800 uppercase">
                                    <span>Total a Lançar:</span>
                                    <span>{formatMoney(paymentMethods.reduce((sum, m) => sum + p(dailyLaunchModal.record[m.id]), 0))}</span>
                                </div>
                            </div>

                            {paymentMethods.filter(m => m.feeType === 'fixed' && p(dailyLaunchModal.record[m.id]) > 0).map(m => (
                                <div key={m.id} className="space-y-1 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                    <label className="font-black uppercase text-slate-700 ml-1 text-[10px]">
                                        Qtd Vendas {m.name} (Taxa R$ {formatMoney(m.tax)}/un)
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="Quantas vendas foram?"
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none text-slate-800 focus:border-emerald-500" 
                                        value={dailyLaunchModal.quantities[m.id] || ''} 
                                        onChange={e => setDailyLaunchModal({
                                            ...dailyLaunchModal, 
                                            quantities: { ...dailyLaunchModal.quantities, [m.id]: e.target.value }
                                        })} 
                                    />
                                </div>
                            ))}

                            <div className="space-y-1">
                                <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Conta Destino</label>
                                <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none text-slate-800 focus:border-emerald-500" value={dailyLaunchModal.account} onChange={e=>setDailyLaunchModal({...dailyLaunchModal, account: e.target.value})}>
                                    <option value="">Selecione a conta...</option>
                                    {safeAccounts.filter(a => a.type === 'corrente').map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2 mt-2">
                                <button type="button" onClick={executeDailyLaunch} className="w-full bg-emerald-500 text-white p-3 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-emerald-600">Confirmar e Lançar</button>
                                <button type="button" onClick={()=>setDailyLaunchModal(null)} className="w-full text-slate-400 p-2 font-black uppercase hover:text-red-500">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}

                {liqModal && (
                    <div className="modal-overlay z-[110]">
                        <div className="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl border-t-4 border-emerald-500 flex flex-col gap-4 scale-up-center bg-white">
                            <div className="text-center">
                                <h3 className="font-black uppercase text-slate-400 mb-1 tracking-widest">Confirmar Liquidação</h3>
                                <p className="font-black text-sm text-slate-800 uppercase leading-tight">{liqModal.description}</p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Data da Liquidação</label><input type="date" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none" value={liqModal.date} onChange={e=>setLiqModal({...liqModal, date: e.target.value})} /></div>
                                <div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Conta / Cartão</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none" value={liqModal.account} onChange={e=>setLiqModal({...liqModal, account: e.target.value})}><option value="">Selecione...</option>{safeAccounts.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                                <div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Valor Final (R$)</label><input type="text" className="w-full p-2.5 bg-white border-2 border-slate-100 rounded-xl font-black text-lg text-center text-emerald-600 outline-none" value={liqModal.amount} onChange={e=>setLiqModal({...liqModal, amount: e.target.value})} /></div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <button type="button" onClick={executeLiquidation} className="w-full bg-slate-900 text-emerald-400 p-3 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">Confirmar e Liquidar</button>
                                <button type="button" onClick={()=>setLiqModal(null)} className="w-full text-slate-400 p-2 font-black uppercase hover:text-red-500">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}

                {invoiceModal && (
                    <div className="modal-overlay z-[110]">
                        <div className="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl border-t-4 border-emerald-500 flex flex-col gap-4 scale-up-center bg-white">
                            <div className="text-center">
                                <h3 className="font-black text-sm text-slate-800 uppercase">Liquidar Fatura - {invoiceModal.cardName}</h3>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border flex justify-between items-center">
                                <span className="font-black text-slate-500">Valor Fechado:</span>
                                <span className="text-base font-black text-slate-900">{formatMoney(invoiceModal.total)}</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-black text-slate-400 text-[10px] uppercase">Tipo de Pagamento</label>
                                <div className="flex gap-2">
                                    <label className={`flex-1 p-2 rounded-xl border text-center font-black cursor-pointer transition-colors text-[10px] uppercase ${invoicePayType === 'integral' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                                        <input type="radio" name="payType" className="hidden" checked={invoicePayType === 'integral'} onChange={() => setInvoicePayType('integral')} />
                                        Integral
                                    </label>
                                    <label className={`flex-1 p-2 rounded-xl border text-center font-black cursor-pointer transition-colors text-[10px] uppercase ${invoicePayType === 'parcial' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                                        <input type="radio" name="payType" className="hidden" checked={invoicePayType === 'parcial'} onChange={() => setInvoicePayType('parcial')} />
                                        Parcial
                                    </label>
                                </div>
                            </div>

                            {invoicePayType === 'parcial' && (
                                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <label className="font-black text-slate-400 text-[10px] uppercase">Valor a Pagar Agora (R$)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            className="w-full p-2.5 bg-white border rounded-xl font-black outline-none text-emerald-600 focus:border-emerald-500" 
                                            value={invoicePartialVal} 
                                            onChange={e => setInvoicePartialVal(e.target.value)} 
                                            placeholder="0,00" 
                                        />
                                    </div>

                                    {p(invoicePartialVal) > 0 && p(invoicePartialVal) < invoiceModal.total && (
                                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                                            <input 
                                                type="checkbox" 
                                                checked={invoiceMoveToNext} 
                                                onChange={e => setInvoiceMoveToNext(e.target.checked)} 
                                                className="w-4 h-4 accent-emerald-500 rounded" 
                                            />
                                            <span className="text-[10px] font-black text-slate-600 uppercase">
                                                Jogar os {formatMoney(invoiceModal.total - p(invoicePartialVal))} restantes para a fatura do mês seguinte
                                            </span>
                                        </label>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="font-black text-slate-400 text-[10px] uppercase">Conta Débito de Origem</label>
                                <select className="w-full p-2.5 bg-white border rounded-xl font-black outline-none focus:border-emerald-500" value={invoiceSourceAcc} onChange={e=>setInvoiceSourceAcc(e.target.value)} required>
                                    <option value="">Selecione...</option>
                                    {safeAccounts.filter(a => a.type === 'corrente').map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                                <button type="button" onClick={handleExecuteInvoicePayment} className="flex-1 bg-slate-900 text-emerald-400 p-3 rounded-xl font-black uppercase text-[10px] hover:bg-black">
                                    {invoicePayType === 'integral' ? 'Dar Baixa Integral' : 'Dar Baixa Parcial'}
                                </button>
                                <button type="button" onClick={() => { setInvoiceModal(null); setInvoicePayType('integral'); setInvoicePartialVal(''); setInvoiceMoveToNext(true); }} className="px-4 bg-slate-200 text-slate-600 font-black rounded-xl uppercase text-[10px] hover:bg-slate-300">
                                    Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isIngModalOpen && <div className="modal-overlay z-[110]"><div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl flex flex-col gap-3 scale-up-center border-t-4 border-emerald-500"><h3 className="font-black uppercase text-slate-800 border-b pb-2 mb-1">{ingForm.id ? 'Editar Insumo' : 'Novo Insumo'}</h3><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Nome</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={ingForm.name} onChange={e=>setIngForm({...ingForm, name: e.target.value})} /></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Categoria</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={ingForm.category} onChange={e=>setIngForm({...ingForm, category: e.target.value})}>{ingCats.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Preço (R$)</label><input type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={ingForm.cost} onChange={e=>setIngForm({...ingForm, cost: e.target.value})} /></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Unidade</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={ingForm.unit} onChange={e=>setIngForm({...ingForm, unit: e.target.value})}><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="un">un</option></select></div></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Qtd Embalagem</label><input type="number" step="0.001" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={ingForm.qty} onChange={e=>setIngForm({...ingForm, qty: e.target.value})} /></div><div className="flex gap-2 mt-2"><button type="button" onClick={()=>crudActionCMV('ingredients', ingredients, ingForm, setIsIngModalOpen)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black p-3 rounded-xl uppercase">Gravar</button><button type="button" onClick={()=>setIsIngModalOpen(false)} className="px-5 bg-slate-200 text-slate-600 font-black uppercase rounded-xl hover:bg-slate-300">Cancelar</button></div></div></div>}
                
                {(isRecipeModalOpen || isCompModalOpen) && (() => {
                    const isRec = isRecipeModalOpen; const formObj = isRec ? recipeForm : compForm; const setFormObj = isRec ? setRecipeForm : setCompForm;
                    const finalCatList = Array.from(new Set([...(isRec ? activeRecCats : activeCompCats), formObj.category])).filter(Boolean).sort();
                    
                    const rendimento = formObj.yield ? Number(formObj.yield) : 1;
                    const costTotal = calcItemCost(formObj.ingredients); 
                    const cost = costTotal / rendimento; 
                    
                    const sp = p(formObj.sellingPrice); const cmv = sp > 0 ? ((cost/sp)*100).toFixed(1) : 0;
                    const precoSugerido = cmvSettings.targetCMV > 0 ? (cost / (p(cmvSettings.targetCMV) / 100)) : 0; const precoIfood = sp * 1.12;
                    return (
                        <div className="modal-overlay z-[110] p-4"><div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 rounded-2xl shadow-2xl flex flex-col gap-4 scale-up-center border-t-4 border-emerald-500"><h3 className="font-black uppercase text-slate-800 border-b pb-2">{formObj.id ? `Editar ${isRec?'Ficha':'Complemento'}` : `Novo ${isRec?'Ficha':'Complemento'}`}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Nome</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={formObj.name} onChange={e=>setFormObj({...formObj, name: e.target.value})} /></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Venda (R$)</label><input type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={formObj.sellingPrice} onChange={e=>setFormObj({...formObj, sellingPrice: e.target.value})} /></div></div><div className="flex justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl"><div className="text-center flex-1 border-r border-slate-200"><span className="block text-[9px] font-black text-slate-500 uppercase">Sugerido ({cmvSettings.targetCMV}%)</span><span className="text-sm font-black text-slate-700">{formatMoney(precoSugerido)}</span></div><div className="text-center flex-1"><span className="block text-[9px] font-black text-emerald-500 uppercase">Venda iFood (+12%)</span><span className="text-sm font-black text-emerald-600">{formatMoney(precoIfood)}</span></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Categoria</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={formObj.category} onChange={e=>setFormObj({...formObj, category: e.target.value})}>{finalCatList.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1 text-emerald-600">Rendimento (Unidades)</label><input type="number" min="1" className="w-full p-2.5 bg-slate-50 border border-emerald-200 rounded-xl font-bold outline-none focus:border-emerald-500" value={formObj.yield || 1} onChange={e=>setFormObj({...formObj, yield: e.target.value})} title="Quantas unidades essa receita rende?" /></div></div><div><label className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl cursor-pointer"><input type="checkbox" className="w-3 h-3 accent-emerald-500" checked={formObj.ignoreCMV} onChange={e=>setFormObj({...formObj, ignoreCMV: e.target.checked})} /><span className="font-black text-slate-500 uppercase tracking-widest">Ignorar no CMV Médio</span></label></div><div className="border-t pt-3"><div className="flex justify-between items-center mb-2"><label className="font-black uppercase text-slate-800">Receituário</label><button type="button" onClick={()=>setFormObj({...formObj, ingredients: [...formObj.ingredients, {ingredientId:'', qty:''}]})} className="bg-slate-900 hover:bg-black text-emerald-400 px-3 py-1.5 rounded-lg font-black uppercase transition-colors">Add Insumo</button></div><div className="space-y-2">{formObj.ingredients.map((ingItem, idx) => (<div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 bg-slate-50 p-2 rounded-lg border items-center"><select className="flex-1 w-full p-2 bg-white border rounded font-bold text-[10px] md:text-sm focus:border-emerald-500 outline-none" value={ingItem.ingredientId} onChange={e=>{const arr=[...formObj.ingredients]; arr[idx].ingredientId=e.target.value; setFormObj({...formObj, ingredients: arr});}}><option value="">Selecione...</option>{ingredients.sort((a,b)=>a.name.localeCompare(b.name)).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><div className="flex w-full md:w-auto gap-2"><input type="number" step="0.001" placeholder="Qtd" className="flex-1 md:w-24 p-2 bg-white border rounded font-bold text-center focus:border-emerald-500 outline-none" value={ingItem.qty} onChange={e=>{const arr=[...formObj.ingredients]; arr[idx].qty=e.target.value; setFormObj({...formObj, ingredients: arr});}} /><button type="button" onClick={()=>{const arr=[...formObj.ingredients]; arr.splice(idx,1); setFormObj({...formObj, ingredients: arr});}} className="bg-red-50 text-red-500 px-4 py-2 rounded text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Excluir</button></div></div>))}</div></div><div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-inner mt-1"><div><span className="font-black uppercase text-slate-400 block mb-0.5">{rendimento > 1 ? `Custo Unitário (de ${rendimento})` : 'Custo Insumos'}</span><span className="text-lg font-black text-emerald-400">{formatMoney(cost)}</span></div><div className="text-right"><span className="font-black uppercase text-slate-400 block mb-0.5">CMV Estimado</span><span className={"text-lg font-black " + (cmv > cmvSettings.targetCMV ? "text-red-400" : "text-emerald-400")}>{cmv}%</span></div></div><div className="flex gap-2 mt-1 pt-3 border-t"><button type="button" onClick={()=>crudActionCMV(isRec?'recipes':'complements', isRec?recipes:complements, formObj, isRec?setIsRecipeModalOpen:setIsCompModalOpen)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black p-3 rounded-xl uppercase transition-colors">Salvar</button><button type="button" onClick={()=>isRec?setIsRecipeModalOpen(false):setIsCompModalOpen(false)} className="px-6 bg-slate-200 text-slate-600 font-black uppercase rounded-xl hover:bg-slate-300 transition-colors">Cancelar</button></div></div></div>
                    );
                })()}

                {isComboModalOpen && (() => {
                    const finalComboCats = Array.from(new Set([...activeComboCats, comboForm.category])).filter(Boolean).sort();
                    const cost = calcComboCost(comboForm.items); const sp = p(comboForm.sellingPrice); const cmv = sp > 0 ? ((cost/sp)*100).toFixed(1) : 0;
                    const precoIfood = sp * 1.12; const precoAvulso = comboForm.items.reduce((total, item) => { let precoItem = 0; if (item.type === 'recipe') { const r = recipes.find(x => x.id === item.itemId); if (r) precoItem = p(r.sellingPrice); } else if (item.type === 'complement') { const c = complements.find(x => x.id === item.itemId); if (c) precoItem = p(c.sellingPrice); } return total + (precoItem * p(item.qty)); }, 0);
                    const valorDesconto = precoAvulso - sp; const percentualDesconto = precoAvulso > 0 ? (valorDesconto / precoAvulso) * 100 : 0;
                    return (
                        <div className="modal-overlay z-[110] p-4"><div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 rounded-2xl shadow-2xl flex flex-col gap-4 scale-up-center border-t-4 border-emerald-500"><h3 className="font-black uppercase text-slate-800 border-b pb-2">{comboForm.id ? 'Editar Combo' : 'Novo Combo'}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Nome Combo</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={comboForm.name} onChange={e=>setComboForm({...comboForm, name: e.target.value})} /></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Preço Venda (R$)</label><input type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={comboForm.sellingPrice} onChange={e=>setComboForm({...comboForm, sellingPrice: e.target.value})} /></div></div><div className="flex justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl"><div className="text-center flex-1 border-r border-slate-200"><span className="block text-[9px] font-black text-slate-500 uppercase">Se vendido Avulso</span><span className="text-sm font-black text-slate-700">{formatMoney(precoAvulso)}</span></div><div className="text-center flex-1 border-r border-slate-200"><span className="block text-[9px] font-black text-emerald-500 uppercase">Vantagem Cliente</span><span className="text-sm font-black text-emerald-600">{percentualDesconto > 0 ? `-${percentualDesconto.toFixed(1)}%` : '0%'}</span></div><div className="text-center flex-1"><span className="block text-[9px] font-black text-emerald-500 uppercase">Venda iFood (+12%)</span><span className="text-sm font-black text-emerald-600">{formatMoney(precoIfood)}</span></div></div><div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1">Categoria</label><select className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" value={comboForm.category} onChange={e=>setComboForm({...comboForm, category: e.target.value})}>{finalComboCats.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="border-t pt-3"><div className="flex justify-between items-center mb-2"><label className="font-black uppercase text-slate-800">Itens do Combo</label><button type="button" onClick={()=>setComboForm({...comboForm, items: [...comboForm.items, {type:'recipe', itemId:'', qty:''}]})} className="bg-slate-900 hover:bg-black text-emerald-400 px-3 py-1.5 rounded-lg font-black uppercase transition-colors">Add Item</button></div><div className="space-y-2">{comboForm.items.map((item, idx) => (<div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 bg-slate-50 p-2 rounded-lg border items-center"><select className="w-full md:w-28 p-2 bg-white border rounded font-bold text-[10px] md:text-sm focus:border-emerald-500 outline-none" value={item.type} onChange={e=>{const arr=[...comboForm.items]; arr[idx].type=e.target.value; arr[idx].itemId=''; setComboForm({...comboForm, items: arr});}}><option value="recipe">Ficha</option><option value="complement">Extra</option><option value="ingredient">Insumo</option></select><select className="flex-1 w-full p-2 bg-white border rounded font-bold text-[10px] md:text-sm focus:border-emerald-500 outline-none" value={item.itemId} onChange={e=>{const arr=[...comboForm.items]; arr[idx].itemId=e.target.value; setComboForm({...comboForm, items: arr});}}><option value="">Selecione...</option>{item.type==='recipe' && recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}{item.type==='complement' && complements.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{item.type==='ingredient' && ingredients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><div className="flex w-full md:w-auto gap-2"><input type="number" step="0.001" placeholder="Qtd" className="flex-1 md:w-20 p-2 bg-white border rounded font-bold text-center focus:border-emerald-500 outline-none" value={item.qty} onChange={e=>{const arr=[...comboForm.items]; arr[idx].qty=e.target.value; setComboForm({...comboForm, items: arr});}} /><button type="button" onClick={()=>{const arr=[...comboForm.items]; arr.splice(idx,1); setComboForm({...comboForm, items: arr});}} className="bg-red-50 text-red-500 px-4 py-2 rounded text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Excluir</button></div></div>))}</div></div><div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-inner mt-1"><div><span className="font-black uppercase text-slate-400 block mb-0.5">Custo Combo</span><span className="text-lg font-black text-emerald-400">{formatMoney(cost)}</span></div><div className="text-right"><span className="font-black uppercase text-slate-400 block mb-0.5">CMV Estimado</span><span className={"text-lg font-black " + (cmv > cmvSettings.targetCMV ? "text-red-400" : "text-emerald-400")}>{cmv}%</span></div></div><div className="flex gap-2 mt-1 pt-3 border-t"><button type="button" onClick={()=>crudActionCMV('combos', combos, comboForm, setIsComboModalOpen)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black p-3 rounded-xl uppercase transition-colors">Salvar</button><button type="button" onClick={()=>setIsComboModalOpen(false)} className="px-6 bg-slate-200 text-slate-600 font-black uppercase rounded-xl hover:bg-slate-300 transition-colors">Cancelar</button></div></div></div>
                    );
                })()}

            </Layout>

            <SupportWidget />
        </>
    );
}

// ============================================================================
// SISTEMA DE ROTAS (ROUTER PRINCIPAL)
// ============================================================================
export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ERPApp />} />
                <Route path="/:slug" element={<Cardapio />} />
                <Route path="/totem/:slug" element={<TotemPDV />} />
            </Routes>
        </BrowserRouter>
    );
}