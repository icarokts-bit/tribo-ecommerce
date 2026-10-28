import React, { useState, useEffect, useRef, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';
import { QRCodeCanvas } from 'qrcode.react';

const GOOGLE_MAPS_API_KEY = "AIzaSyARk776Wc3Ir48sxblkv71ubYeM8tVlG5k";
const TOTEM_API_URL = import.meta.env.VITE_API_URL || "https://totem-server.up.railway.app";
const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || "https://servidor-whatsapp-production-3e92.up.railway.app";
const IFOOD_API_URL = import.meta.env.VITE_IFOOD_API_URL || "https://tribo-backend-production.up.railway.app";

export default function GestaoPedidos() {
    const [orders, setOrders] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]); 
    const [complementGroups, setComplementGroups] = useState([]); 
    const [deliveryAreas, setDeliveryAreas] = useState([]); 
    const [regioesKM, setRegioesKM] = useState([]); 
    const [configGeral, setConfigGeral] = useState({ cidadePadrao: 'Bragança Paulista - SP', enderecoLoja: '', tempoRetirada: 15 });
    const [cmvSettings, setCmvSettings] = useState({}); 
    const [regrasImpressao, setRegrasImpressao] = useState([]);
    const [customers, setCustomers] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

    // ==========================================
    // ESTADOS IFOOD & CANCELAMENTO PLATAFORMAS
    // ==========================================
    const [isIfoodModalOpen, setIsIfoodModalOpen] = useState(false);
    const [ifoodCreds, setIfoodCreds] = useState({ clientId: '', clientSecret: '', merchantId: '' });
    const [savingIfood, setSavingIfood] = useState(false);
    const [forcingPoll, setForcingPoll] = useState(false);
    const [isIfoodCancelModalOpen, setIsIfoodCancelModalOpen] = useState(false);
    const [orderToCancelIfood, setOrderToCancelIfood] = useState(null);
    const [ifoodCancelReasons, setIfoodCancelReasons] = useState([]);
    const [selectedCancelCode, setSelectedCancelCode] = useState('');
    const [loadingCancelReasons, setLoadingCancelReasons] = useState(false);
    const [cancellingIfoodOrder, setCancellingIfoodOrder] = useState(false);
    const [ifoodTab, setIfoodTab] = useState('lojas');
    const [ifoodMerchantsList, setIfoodMerchantsList] = useState([]);
    const [ifoodMerchantDetails, setIfoodMerchantDetails] = useState(null);
    const [ifoodStoreStatus, setIfoodStoreStatus] = useState(null);
    const [ifoodStatusList, setIfoodStatusList] = useState([]);
    const [ifoodInterruptions, setIfoodInterruptions] = useState([]);
    const [pausaCustomMotivo, setPausaCustomMotivo] = useState('Manutenção / Pausa Operacional');
    const [ifoodHours, setIfoodHours] = useState([
        { dayOfWeek: 'MONDAY', label: 'Segunda-feira', ativo: false, shifts: [{ start: '18:00', end: '23:00' }] },
        { dayOfWeek: 'TUESDAY', label: 'Terça-feira', ativo: false, shifts: [{ start: '18:00', end: '23:00' }] },
        { dayOfWeek: 'WEDNESDAY', label: 'Quarta-feira', ativo: true, shifts: [{ start: '18:00', end: '23:00' }] },
        { dayOfWeek: 'THURSDAY', label: 'Quinta-feira', ativo: true, shifts: [{ start: '18:00', end: '23:00' }] },
        { dayOfWeek: 'FRIDAY', label: 'Sexta-feira', ativo: true, shifts: [{ start: '18:00', end: '23:30' }] },
        { dayOfWeek: 'SATURDAY', label: 'Sábado', ativo: true, shifts: [{ start: '10:00', end: '19:00' }] },
        { dayOfWeek: 'SUNDAY', label: 'Domingo', ativo: true, shifts: [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '16:00' },
            { start: '17:00', end: '23:00' }
        ] },
    ]);
    const [loadingIfoodStatus, setLoadingIfoodStatus] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState('');
    const [isSobDemandaModalOpen, setIsSobDemandaModalOpen] = useState(false);
    const [pedidoSobDemanda, setPedidoSobDemanda] = useState(null);
    const [cotacaoSobDemanda, setCotacaoSobDemanda] = useState(null);
    const [loadingSobDemanda, setLoadingSobDemanda] = useState(false);
    const [coordsSobDemanda, setCoordsSobDemanda] = useState(null);
    const [disputeModalOrder, setDisputeModalOrder] = useState(null);
    const [comandaModalOrder, setComandaModalOrder] = useState(null);
    const [disputeRejectReason, setDisputeRejectReason] = useState('INVENTORY_CHECK');
    const [disputeAcceptDelayReason, setDisputeAcceptDelayReason] = useState('STORE_SYSTEM_ISSUES');
    const [disputeRefundValueReais, setDisputeRefundValueReais] = useState('2,00');
    const [disputeAddTimeMinutes, setDisputeAddTimeMinutes] = useState(15);
    const [disputeAddTimeReason, setDisputeAddTimeReason] = useState('OPERATIONAL_ISSUES');
    const [sendingDisputeResponse, setSendingDisputeResponse] = useState(false);

    // ==========================================
    // ESTADOS 99FOOD (SaaS + Auto-Refresh Token)
    // ==========================================
    const [is99FoodModalOpen, setIs99FoodModalOpen] = useState(false);
    const [food99Creds, setFood99Creds] = useState({ appShopId: '', token: '', appId: '', appSecret: '' });
    const [saving99Food, setSaving99Food] = useState(false);

    // ==========================================
    // DEMAIS ESTADOS DO SISTEMA
    // ==========================================
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [tempoPreparo, setTempoPreparo] = useState(15);
    const [tempoExtraEntrega, setTempoExtraEntrega] = useState(0);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [qrCodeString, setQrCodeString] = useState(null);
    const [waLoading, setWaLoading] = useState(false);
    const [waMessage, setWaMessage] = useState('');
    const [isWaConnected, setIsWaConnected] = useState(false);
    const [isConfigMsgsModalOpen, setIsConfigMsgsModalOpen] = useState(false);
    const [savingMsgs, setSavingMsgs] = useState(false);
    const [msgTemplates, setMsgTemplates] = useState({
        msgPreparo: '', msgEntrega: '', msgConcluido: '',
        msgRetiradaPreparo: '', msgRetiradaPronto: '', msgRetiradaConcluido: '',
        msgTotemLocal: '', msgTotemViagem: ''
    });
    const [waConnectionError, setWaConnectionError] = useState(false);
    const [waErrorMsg, setWaErrorMsg] = useState('');
    const [isMotoqueiroModalOpen, setIsMotoqueiroModalOpen] = useState(false);
    const [pedidoParaDespachar, setPedidoParaDespachar] = useState(null);
    const [motoqueiroSelecionado, setMotoqueiroSelecionado] = useState('');
    const [listaMotoqueiros, setListaMotoqueiros] = useState([]);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isManualModalMinimized, setIsManualModalMinimized] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [deliveryMethod, setDeliveryMethod] = useState('entrega'); 
    const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
    const [manualOrder, setManualOrder] = useState({
        customerName: '', customerPhone: '', address: '', addressNumber: '', addressComplement: '', neighborhood: '', paymentMethod: 'Dinheiro', observation: ''
    });
    const [calculandoFrete, setCalculandoFrete] = useState(false);
    const [sugestoesEndereco, setSugestoesEndereco] = useState([]);
    const [mostrarSugestoesEndereco, setMostrarSugestoesEndereco] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [cart, setCart] = useState([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(''); 
    const [trocoPara, setTrocoPara] = useState('');
    const [deliveryInfo, setDeliveryInfo] = useState({ fee: '', time: '', found: false, inactive: false, name: '', isKm: false });
    const [customerFound, setCustomerFound] = useState(false); 
    const [customerSavedAddresses, setCustomerSavedAddresses] = useState([]);
    const [customerSearchQueryPDV, setCustomerSearchQueryPDV] = useState('');
    const [showCustomerDropdownPDV, setShowCustomerDropdownPDV] = useState(false);
    const [pdvSelectedProductForModal, setPdvSelectedProductForModal] = useState(null);
    const [pdvModalQty, setPdvModalQty] = useState(1);
    const [pdvModalObs, setPdvModalObs] = useState('');
    const [selectedComplements, setSelectedComplements] = useState({});
    const [paymentOptions, setPaymentOptions] = useState(['Dinheiro', 'Pix', 'Cartão Crédito', 'Cartão Débito']);
    const [somPedido, setSomPedido] = useState(() => localStorage.getItem('tribo_som_pedido') || 'ifood');
    const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);

    const previousPendingCount = useRef(0);
    const addressInputRef = useRef(null);
    const timeoutBuscaEnderecoRef = useRef(null);

    const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const p = (val) => parseFloat(String(val ?? '').replace(',', '.')) || 0;
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const finalTotal = cartTotal + p(deliveryFee);
    const categories = [...new Set(catalogItems.map(item => item.category))];

    useEffect(() => {
        const scriptId = 'google-maps-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            script.onload = () => setGoogleMapsLoaded(true);
        } else {
            setGoogleMapsLoaded(true);
        }
    }, []);

    function formatarTelefone(telefone) {
        if (!telefone) return '';
        let limpo = String(telefone).replace(/\D/g, '');
        if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;
        return limpo;
    }

    const normalizePhone = (phoneVal) => {
        if (!phoneVal) return "";
        let num = String(phoneVal).replace(/\D/g, "");
        if (num.startsWith("55") && num.length >= 12) num = num.substring(2);
        if (num.length === 11 && num[2] === '9') num = num.substring(0, 2) + num.substring(3);
        return num;
    };

    const dispararMensagemWhatsApp = async (uidUsar, telefone, mensagemFormatada) => {
        if (!telefone || !uidUsar) return;
        try {
            let res = await fetch(`${WHATSAPP_API_URL}/api/whatsapp/enviar/${uidUsar}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: uidUsar, phone: telefone, message: mensagemFormatada })
            });
            if (res.status === 404) {
                res = await fetch(`${WHATSAPP_API_URL}/api/whatsapp/enviar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: uidUsar, phone: telefone, message: mensagemFormatada })
                });
                if (res.status === 404) {
                    await fetch(`${WHATSAPP_API_URL}/api/whatsapp/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: uidUsar, phone: telefone, message: mensagemFormatada })
                    });
                }
            }
        } catch (error) { console.error("Erro ao enviar mensagem via Railway", error); }
    };

    const desmontarStringEndereco = (enderecoStr) => {
        if (!enderecoStr) return { rua: '', numero: '', complemento: '', bairro: '' };
        const str = String(enderecoStr).trim();
        if (str.includes('Retirada') || str.includes('Balcão') || str.includes('Local') || str.includes('LOCAL')) {
            return { rua: '', numero: '', complemento: '', bairro: '' };
        }
        const partesVirgula = str.split(',');
        const rua = (partesVirgula[0] || '').trim();
        let numero = '', complemento = '', bairro = '';

        if (partesVirgula.length > 1) {
            const resto = partesVirgula.slice(1).join(',').trim();
            const blocosTraco = resto.split(' - ').map(s => s.trim()).filter(Boolean);
            if (blocosTraco.length > 0) numero = blocosTraco[0];
            if (blocosTraco.length === 2 && blocosTraco[1].toUpperCase() !== 'SP') bairro = blocosTraco[1];
            else if (blocosTraco.length >= 3) {
                complemento = blocosTraco[1].replace(/^Compl:\s*/i, '').trim();
                bairro = blocosTraco[2];
            }
        }
        return { rua, numero, complemento, bairro };
    };

    const extrairEnderecosHistoricos = (cust) => {
        let enderecos = cust.savedAddresses ? [...cust.savedAddresses] : [];
        if (cust.address && typeof cust.address === 'string' && cust.address.trim() !== '') {
            const desmontado = desmontarStringEndereco(cust.address);
            const jaExiste = enderecos.some(e => e.rua === cust.address || e.rua === desmontado.rua);
            if (!jaExiste && desmontado.rua) {
                enderecos.unshift({
                    rua: desmontado.rua,
                    numero: cust.addressNumber || desmontado.numero || '',
                    complemento: cust.addressComplement || desmontado.complemento || '',
                    bairro: cust.neighborhood || desmontado.bairro || ''
                });
            }
        }
        return enderecos;
    };

    const playSound = (overrideType) => {
        const type = overrideType || localStorage.getItem('tribo_som_pedido') || 'ifood';
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const gainNode = ctx.createGain();
            gainNode.connect(ctx.destination);
            if (type === 'ifood') {
                const playChime = (startTime, freq1, freq2) => {
                    const osc1 = ctx.createOscillator(), gain1 = ctx.createGain();
                    osc1.type = 'sine'; osc1.frequency.setValueAtTime(freq1, startTime);
                    gain1.gain.setValueAtTime(0, startTime);
                    gain1.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
                    gain1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                    osc1.connect(gain1); gain1.connect(ctx.destination);
                    osc1.start(startTime); osc1.stop(startTime + 0.3);

                    const osc2 = ctx.createOscillator(), gain2 = ctx.createGain();
                    osc2.type = 'sine'; osc2.frequency.setValueAtTime(freq2, startTime + 0.15);
                    gain2.gain.setValueAtTime(0, startTime + 0.15);
                    gain2.gain.linearRampToValueAtTime(0.3, startTime + 0.17);
                    gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                    osc2.connect(gain2); gain2.connect(ctx.destination);
                    osc2.start(startTime + 0.15); osc2.stop(startTime + 0.5);
                };
                playChime(ctx.currentTime, 1046.50, 880.00); 
                playChime(ctx.currentTime + 0.7, 1046.50, 880.00);
            } else if (type === 'duplo') {
                const osc1 = ctx.createOscillator();
                osc1.type = 'sine'; osc1.frequency.setValueAtTime(880, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                osc1.connect(gainNode); osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.15);
                const osc2 = ctx.createOscillator();
                osc2.type = 'sine'; osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.25);
                osc2.connect(gainNode); osc2.start(ctx.currentTime + 0.25); osc2.stop(ctx.currentTime + 0.4);
            } else if (type === 'campainha') {
                const osc1 = ctx.createOscillator();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(987.77, ctx.currentTime); 
                osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.4); 
                gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
                osc1.connect(gainNode); osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.8);
            } else if (type === 'alerta') {
                const osc1 = ctx.createOscillator();
                osc1.type = 'square';
                osc1.frequency.setValueAtTime(400, ctx.currentTime);
                osc1.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
                osc1.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2);
                osc1.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
                osc1.connect(gainNode); osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.4);
            } else {
                const osc1 = ctx.createOscillator();
                osc1.type = 'sine'; osc1.frequency.setValueAtTime(880, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                osc1.connect(gainNode); osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.3);
            }
        } catch (error) {}
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const ordersPath = `artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`;
        const unsubscribeOrders = db.collection(ordersPath).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const currentPending = fetchedOrders.filter(o => o.status === 'pendente').length;
            if (currentPending > previousPendingCount.current) playSound();
            previousPendingCount.current = currentPending;
            setOrders(fetchedOrders);
            setLoading(false);
        });

        const custPath = `artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_customers`;
        const unsubscribeCustomers = db.collection(custPath).onSnapshot(snapshot => {
            setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const areasRef = db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/areas`);
        const unsubscribeAreas = areasRef.onSnapshot(docSnap => {
            if (docSnap.exists) {
                const data = docSnap.data();
                setDeliveryAreas((data.bairros || []).map(b => ({
                    ...b,
                    name: b.nome || b.name || '',
                    deliveryFee: p(b.deliveryFee ?? b.taxa ?? b.valor ?? b.price ?? 0),
                    time: parseInt(b.time ?? b.tempo ?? 15) || 15,
                    isInactive: Boolean(b.isInactive || b.inativo || b.ativo === false)
                })).sort((a,b) => a.name.localeCompare(b.name)));

                setRegioesKM((data.regioes || []).map(r => ({
                    ...r,
                    km: p(r.km ?? r.raio ?? r.distancia ?? 0),
                    deliveryFee: p(r.deliveryFee ?? r.taxa ?? r.valor ?? r.price ?? 0),
                    time: parseInt(r.time ?? r.tempo ?? 15) || 15,
                    isInactive: Boolean(r.isInactive || r.inativo || r.ativo === false)
                })).sort((a,b) => a.km - b.km));

                if (data.configGeral) setConfigGeral(prev => ({ ...prev, ...data.configGeral }));
            }
        });

        const fetchAllData = async () => {
            try {
                const timesSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/times`).get();
                if (timesSnap.exists) {
                    const dataTimes = timesSnap.data();
                    if (dataTimes.preparo !== undefined) setTempoPreparo(dataTimes.preparo);
                    if (dataTimes.extraEntrega !== undefined) setTempoExtraEntrega(dataTimes.extraEntrega);
                }

                const catSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery/catalog_state`).get();
                if (catSnap.exists) {
                    const data = catSnap.data();
                    setCatalogItems((data.products || []).filter(prod => prod.isActive));
                    setComplementGroups(data.complementGroups || []);
                }

                const printerSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/printer_rules`).get();
                if (printerSnap.exists && printerSnap.data().regras) setRegrasImpressao(printerSnap.data().regras);

                const msgsSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/whatsapp_mensagens`).get();
                if (msgsSnap.exists && msgsSnap.data()) setMsgTemplates(prev => ({ ...prev, ...msgsSnap.data() }));

                const ifoodSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/ifood`).get();
                if (ifoodSnap.exists && ifoodSnap.data()) setIfoodCreds(ifoodSnap.data());

                const food99Snap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/99food`).get();
                if (food99Snap.exists && food99Snap.data()) {
                    setFood99Creds({
                        appShopId: food99Snap.data().app_shop_id || '',
                        token: food99Snap.data().auth_token || food99Snap.data().token || '',
                        appId: food99Snap.data().app_id || '',
                        appSecret: food99Snap.data().app_secret || ''
                    });
                }

                const paySnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/settings/paymentMethods`).get();
                if (paySnap.exists && paySnap.data().methods) {
                    const loadedMethods = paySnap.data().methods.map(m => m.name);
                    setPaymentOptions(prev => Array.from(new Set([...prev, ...loadedMethods])));
                }

                const [cmvStateSnap, cmvSettingsSnap] = await Promise.all([
                    db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/cmv_data/state`).get(),
                    db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/cmv_data/settings`).get()
                ]);

                let mergedCmv = {};
                if (cmvStateSnap.exists && cmvStateSnap.data()?.settings) mergedCmv = { ...mergedCmv, ...cmvStateSnap.data().settings };
                if (cmvSettingsSnap.exists) mergedCmv = { ...mergedCmv, ...cmvSettingsSnap.data() };
                setCmvSettings(mergedCmv);

                const funcSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/funcionarios`).get();
                const funcData = funcSnap.docs.map(doc => doc.data());
                
                const motoboysFiltrados = funcData
                    .filter(f => {
                        const cargo = (f.cargo || f.funcao || f.role || '').toLowerCase();
                        return cargo.includes('moto') || cargo.includes('entregador');
                    })
                    .map(f => ({ 
                        nome: f.nome || f.name, 
                        telefone: f.telefone || f.phone || f.whatsapp || '', 
                        contaMaquina: f.contaMaquina || '' 
                    })); 
                setListaMotoqueiros(motoboysFiltrados);
            } catch (error) { console.error("Erro ao buscar dados iniciais:", error); }
        };

        fetchAllData();
        return () => { unsubscribeOrders(); unsubscribeCustomers(); unsubscribeAreas(); };
    }, []);

    // ==========================================
    // FUNÇÕES DO MÓDULO MERCHANT v1.0 IFOOD
    // ==========================================
    const calcEndTimeFromDuration = (startStr, durationMins) => {
        if (!startStr) return '23:00';
        const [h, m] = startStr.split(':').map(Number);
        const totalMins = (h * 60 + m + Number(durationMins || 300)) % 1440;
        const endH = String(Math.floor(totalMins / 60)).padStart(2, '0');
        const endM = String(totalMins % 60).padStart(2, '0');
        return `${endH}:${endM}`;
    };

    const calcDurationMinutes = (startStr, endStr) => {
        const [sh, sm] = (startStr || '18:00').split(':').map(Number);
        const [eh, em] = (endStr || '23:00').split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff <= 0) diff += 1440;
        return diff;
    };

    const carregarPanoramaIfood = React.useCallback(async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setLoadingIfoodStatus(true);
        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/merchant-overview/${uid}`);
            if (res.ok) {
                const data = await res.json();
                setLastSyncTime(new Date().toLocaleString('pt-BR'));
                if (Array.isArray(data.merchants)) setIfoodMerchantsList(data.merchants);
                if (data.merchantDetails) setIfoodMerchantDetails(data.merchantDetails);
                if (data.status) setIfoodStoreStatus(data.status);
                if (Array.isArray(data.statusList)) setIfoodStatusList(data.statusList);
                if (Array.isArray(data.interruptions)) setIfoodInterruptions(data.interruptions);

                if (Array.isArray(data.openingHours) && data.openingHours.length > 0) {
                    setIfoodHours(prev => prev.map(dia => {
                        const turnosDoDia = data.openingHours.filter(s => s.dayOfWeek === dia.dayOfWeek);
                        if (turnosDoDia.length > 0) {
                            return {
                                ...dia,
                                ativo: true,
                                shifts: turnosDoDia.map(t => {
                                    const startClean = (t.start || '10:00:00').slice(0, 5);
                                    return {
                                        start: startClean,
                                        end: calcEndTimeFromDuration(startClean, t.duration)
                                    };
                                })
                            };
                        }
                        return { ...dia, ativo: false, shifts: [{ start: '10:00', end: '19:00' }] };
                    }));
                }
            }
        } catch (e) {
            console.log("Status iFood:", e.message);
        } finally {
            setLoadingIfoodStatus(false);
        }
    }, []);

    useEffect(() => {
        carregarPanoramaIfood();
        const interval = setInterval(carregarPanoramaIfood, 30000);
        return () => clearInterval(interval);
    }, [carregarPanoramaIfood]);

    const handleForcarPollingEventos = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setForcingPoll(true);
        try {
            await fetch(`${IFOOD_API_URL}/api/ifood/force-poll/${uid}`, { method: 'POST' });
            await carregarPanoramaIfood();
        } catch (e) {
            console.error("Erro ao sincronizar eventos:", e);
        } finally {
            setForcingPoll(false);
        }
    };

    const handlePausarLojaIfood = async (minutos) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        if (!window.confirm(`Deseja cadastrar uma interrupção (pausa) de ${minutos} minutos no iFood?`)) return;

        setLoadingIfoodStatus(true);
        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/interruptions/${uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: minutos, description: pausaCustomMotivo || `Pausa temporária de ${minutos} min` })
            });
            if (res.ok) {
                alert(`⏸️ Pausa de ${minutos} minutos cadastrada com sucesso no iFood!`);
                await carregarPanoramaIfood();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Não foi possível pausar: ${errData.error || 'Verifique se já existe uma pausa no mesmo horário.'}`);
            }
        } catch (e) {
            alert("Erro ao conectar com o servidor iFood.");
        } finally {
            setLoadingIfoodStatus(false);
        }
    };

    const handleRemoverPausaIfood = async (interruptionId) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setLoadingIfoodStatus(true);
        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/interruptions/${uid}/${interruptionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert("🟢 Pausa removida com sucesso no iFood!");
                await carregarPanoramaIfood();
            } else {
                alert("Erro ao remover pausa no iFood.");
            }
        } catch (e) {
            alert("Erro de conexão ao reabrir loja.");
        } finally {
            setLoadingIfoodStatus(false);
        }
    };

    const handleSalvarHorariosIfood = async (customHoursList) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const listaUsar = Array.isArray(customHoursList) ? customHoursList : ifoodHours;

        const shiftsFormatados = [];
        listaUsar.forEach(dia => {
            if (dia.ativo && Array.isArray(dia.shifts)) {
                dia.shifts.forEach(turno => {
                    shiftsFormatados.push({
                        dayOfWeek: dia.dayOfWeek,
                        start: `${turno.start}:00`,
                        duration: calcDurationMinutes(turno.start, turno.end)
                    });
                });
            }
        });

        setLoadingIfoodStatus(true);
        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/opening-hours/${uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shifts: shiftsFormatados })
            });
            if (res.ok) {
                alert("✅ Horários de funcionamento salvos e refletidos no iFood!");
                await carregarPanoramaIfood();
            } else {
                alert("Erro ao atualizar horário no iFood.");
            }
        } catch (e) {
            alert("Erro ao comunicar com o servidor iFood.");
        } finally {
            setLoadingIfoodStatus(false);
        }
    };

    const handlePreencherCenario3Homologacao = () => {
        setIfoodHours(prev => prev.map(dia => {
            if (dia.dayOfWeek === 'SATURDAY') {
                return { ...dia, ativo: true, shifts: [{ start: '10:00', end: '19:00' }] };
            }
            if (dia.dayOfWeek === 'SUNDAY') {
                return {
                    ...dia,
                    ativo: true,
                    shifts: [
                        { start: '09:00', end: '12:00' },
                        { start: '13:00', end: '16:00' },
                        { start: '17:00', end: '23:00' }
                    ]
                };
            }
            return dia;
        }));
    };

    // ==========================================
    // CONFIGURAÇÃO 99FOOD NO FIREBASE
    // ==========================================
    const handleSalvar99Food = async () => {
        setSaving99Food(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/99food`).set({
                app_shop_id: food99Creds.appShopId.trim(),
                auth_token: food99Creds.token.trim(),
                app_id: (food99Creds.appId || '').trim(),
                app_secret: (food99Creds.appSecret || '').trim(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            alert("✅ Integração com a 99Food configurada com sucesso!\nO sistema está pronto para receber, atualizar e renovar tokens automaticamente.");
            setIs99FoodModalOpen(false);
        } catch (error) {
            alert("Erro ao salvar as credenciais da 99Food.");
        } finally {
            setSaving99Food(false);
        }
    };

    // ==========================================
    // LÓGICA DE AGENDAMENTO E CÁLCULO DE FRETE
    // ==========================================
    const availableDates = useMemo(() => {
        const defaultHorariosAgendamento = [
            { dia: 0, nome: 'DOM', ativo: true, abertura: '20:00', fechamento: '22:00' },
            { dia: 1, nome: 'SEG', ativo: false, abertura: '20:00', fechamento: '22:00' },
            { dia: 2, nome: 'TER', ativo: false, abertura: '20:00', fechamento: '22:00' },
            { dia: 3, nome: 'QUA', ativo: false, abertura: '20:00', fechamento: '22:00' },
            { dia: 4, nome: 'QUI', ativo: true, abertura: '20:00', fechamento: '22:00' },
            { dia: 5, nome: 'SEX', ativo: true, abertura: '20:00', fechamento: '23:00' },
            { dia: 6, nome: 'SAB', ativo: true, abertura: '20:00', fechamento: '23:00' },
        ];
        const horarios = cmvSettings.horariosAgendamento || defaultHorariosAgendamento;
        const maxDays = parseInt(cmvSettings.agendamento_antecedenciaMaxima) || 15;
        const blockSameDay = cmvSettings.agendamento_bloquearMesmoDia || false;
        const onlyNextDay = cmvSettings.agendamento_apenasProximoDia || false;
        const minHours = parseInt(cmvSettings.agendamento_antecedenciaMinima) || 1;
        
        const dates = [];
        const hoje = new Date();
        let startOffset = blockSameDay ? 1 : 0;
        
        for (let i = startOffset; i <= maxDays; i++) {
            const checkDate = new Date();
            checkDate.setDate(hoje.getDate() + i);
            checkDate.setHours(0,0,0,0);

            const dayOfWeek = checkDate.getDay();
            const dayConfig = horarios.find(h => h.dia === dayOfWeek);
            
            if (dayConfig && dayConfig.ativo) {
                const [openH, openM] = dayConfig.abertura.split(':').map(Number);
                const [closeH, closeM] = dayConfig.fechamento.split(':').map(Number);
                const endSlot = new Date(checkDate);
                endSlot.setHours(closeH, closeM, 0, 0);
                if (closeH < openH) endSlot.setDate(endSlot.getDate() + 1);

                const minTime = new Date();
                minTime.setHours(minTime.getHours() + minHours);

                if (endSlot >= minTime) {
                    dates.push({
                        value: checkDate.toISOString().split('T')[0],
                        label: checkDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase()
                    });
                    if (onlyNextDay) break;
                }
            }
        }
        return dates;
    }, [cmvSettings]);

    const availableTimes = useMemo(() => {
        if (!scheduledDate) return [];
        const defaultHorariosAgendamento = [
            { dia: 0, nome: 'DOM', ativo: true, abertura: '20:00', fechamento: '22:00' },
            { dia: 1, nome: 'SEG', ativo: false, abertura: '20:00', fechamento: '22:00' },
            { dia: 2, nome: 'TER', ativo: false, abertura: '20:00', fechamento: '22:00' },
            { dia: 3, nome: 'QUA', ativo: false, abertura: '20:00', fechamento: '22:00' },
            { dia: 4, nome: 'QUI', ativo: true, abertura: '20:00', fechamento: '22:00' },
            { dia: 5, nome: 'SEX', ativo: true, abertura: '20:00', fechamento: '23:00' },
            { dia: 6, nome: 'SAB', ativo: true, abertura: '20:00', fechamento: '23:00' },
        ];
        const horarios = cmvSettings.horariosAgendamento || defaultHorariosAgendamento;
        const [y, m, d] = scheduledDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayOfWeek = dateObj.getDay();
        const dayConfig = horarios.find(h => h.dia === dayOfWeek);
        if (!dayConfig || !dayConfig.ativo) return [];

        const interval = parseInt(cmvSettings.agendamento_intervaloMinutos) || 30;
        const minHours = parseInt(cmvSettings.agendamento_antecedenciaMinima) || 1;
        const [openH, openM] = dayConfig.abertura.split(':').map(Number);
        const [closeH, closeM] = dayConfig.fechamento.split(':').map(Number);

        const currentSlot = new Date(dateObj);
        currentSlot.setHours(openH, openM, 0, 0);
        const endSlot = new Date(dateObj);
        endSlot.setHours(closeH, closeM, 0, 0);
        if (closeH < openH) endSlot.setDate(endSlot.getDate() + 1);

        const minTimeForScheduling = new Date();
        minTimeForScheduling.setHours(minTimeForScheduling.getHours() + minHours);

        const slots = [];
        while (currentSlot <= endSlot) {
            if (currentSlot >= minTimeForScheduling) {
                slots.push(currentSlot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            }
            currentSlot.setMinutes(currentSlot.getMinutes() + interval);
        }
        return slots;
    }, [scheduledDate, cmvSettings]);

    useEffect(() => {
        if (isScheduled && !scheduledDate && availableDates.length > 0) setScheduledDate(availableDates[0].value);
    }, [isScheduled, availableDates, scheduledDate]);

    useEffect(() => {
        const checkWhatsAppBackgroundStatus = async () => {
            try {
                const response = await fetch(`${WHATSAPP_API_URL}/api/whatsapp/status/${auth.currentUser?.uid}`);
                if (!response.ok) throw new Error("Servidor offline");
                const data = await response.json();
                if (data.status === 'desconectado' || data.status === 'qr_gerado') {
                    setWaConnectionError(true);
                    setWaErrorMsg('O WhatsApp não está conectado. Clique em "Conectar WhatsApp" no menu para ler o QR Code novamente.');
                    setIsWaConnected(false);
                } else if (data.status === 'conectado') {
                    setWaConnectionError(false);
                    setIsWaConnected(true);
                }
            } catch (error) {
                setWaConnectionError(true);
                setWaErrorMsg('Falha de comunicação com o servidor do WhatsApp.');
                setIsWaConnected(false);
            }
        };
        checkWhatsAppBackgroundStatus(); 
        const bgInterval = setInterval(checkWhatsAppBackgroundStatus, 30000); 
        return () => clearInterval(bgInterval);
    }, []);

    const handleUpdateTimes = async (newPreparo, newExtra) => {
        setTempoPreparo(newPreparo);
        setTempoExtraEntrega(newExtra);
        const user = auth.currentUser;
        if (!user) return;
        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/times`).set({
                preparo: newPreparo, extraEntrega: newExtra
            }, { merge: true });
        } catch (error) { console.error("Erro ao salvar tempos:", error); }
    };

    const aplicarDistanciaCalculada = React.useCallback((distanceMeters) => {
        const distanceKm = distanceMeters / 1000;
        const regioesOrdenadas = [...regioesKM].sort((a, b) => p(a.km) - p(b.km));
        const regiaoAtendida = regioesOrdenadas.find(r => p(r.km) >= distanceKm);

        if (regiaoAtendida) {
            if (regiaoAtendida.isInactive) {
                setDeliveryInfo({ fee: '', time: '', found: true, inactive: true, name: `Dist. ${distanceKm.toFixed(1)}km (Inativo)`, isKm: true });
                setDeliveryFee('');
            } else {
                const taxaFinal = p(regiaoAtendida.deliveryFee ?? regiaoAtendida.taxa ?? 0);
                setDeliveryInfo({ fee: taxaFinal, time: regiaoAtendida.time || 15, found: true, inactive: false, name: `Dist. ${distanceKm.toFixed(1)}km (Até ${regiaoAtendida.km} KM)`, isKm: true });
                setDeliveryFee(String(taxaFinal));
            }
        } else {
            setDeliveryInfo({ fee: '', time: '', found: true, inactive: true, name: `Fora do Raio (${distanceKm.toFixed(1)}km)`, isKm: true });
            setDeliveryFee('');
        }
    }, [regioesKM]);

    const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const geocodificarEndereco = async (enderecoTexto) => {
        if (!enderecoTexto || String(enderecoTexto).trim().length < 3) return null;
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            const coordGoogle = await new Promise((resolve) => {
                geocoder.geocode({ address: enderecoTexto, region: 'BR' }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const loc = results[0].geometry.location;
                        resolve({ lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat, lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng });
                    } else resolve(null);
                });
            });
            if (coordGoogle) return coordGoogle;
        }

        try {
            const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(enderecoTexto)}&key=${GOOGLE_MAPS_API_KEY}&region=br`;
            const gRes = await fetch(gUrl);
            if (gRes.ok) {
                const gData = await gRes.json();
                if (gData.status === 'OK' && gData.results?.[0]?.geometry?.location) return gData.results[0].geometry.location;
            }
        } catch (e) {}

        try {
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(enderecoTexto)}&limit=1&lat=-22.9529&lon=-46.5418`);
            if (photonRes.ok) {
                const photonData = await photonRes.json();
                const coords = photonData?.features?.[0]?.geometry?.coordinates;
                if (Array.isArray(coords) && coords.length >= 2) return { lat: Number(coords[1]), lng: Number(coords[0]) };
            }
        } catch (e) {}

        return null;
    };

    const abrirModalSobDemanda = async (order) => {
        if (order.origin === 'IFOOD' && order.ifoodDeliveredBy === 'IFOOD' && !order.ifoodSobDemandaStatus) {
            alert("Este pedido já é de Entrega Parceira iFood nativa. O entregador já é enviado automaticamente pelo iFood!");
            return;
        }

        setPedidoSobDemanda(order);
        setCotacaoSobDemanda(null);
        setCoordsSobDemanda(null);
        setIsSobDemandaModalOpen(true);
        setLoadingSobDemanda(true);

        try {
            const uid = auth.currentUser?.uid;
            let lat = null, lng = null;

            if (!order.ifoodOrderId) {
                const cidadePadrao = (configGeral.cidadePadrao || 'Bragança Paulista - SP').trim();
                const endCompleto = `${order.address}, ${cidadePadrao}, Brasil`;
                const coord = await geocodificarEndereco(endCompleto);
                if (coord) {
                    lat = coord.lat;
                    lng = coord.lng;
                    setCoordsSobDemanda(coord);
                }
            }

            const res = await fetch(`${IFOOD_API_URL}/api/ifood/shipping/quote/${uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ifoodOrderId: order.ifoodOrderId || null,
                    latitude: lat,
                    longitude: lng
                })
            });

            const data = await res.json();
            setCotacaoSobDemanda(data);
        } catch (err) {
            setCotacaoSobDemanda({ available: false, error: 'Erro ao comunicar com o servidor para cotar entrega.' });
        } finally {
            setLoadingSobDemanda(false);
        }
    };

    const confirmarPedidoMotoIfood = async () => {
        if (!pedidoSobDemanda) return;
        setLoadingSobDemanda(true);
        try {
            const uid = auth.currentUser?.uid;
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/shipping/request-driver/${uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId: pedidoSobDemanda.id,
                    ifoodOrderId: pedidoSobDemanda.ifoodOrderId || null,
                    quoteId: cotacaoSobDemanda?.quoteId || null,
                    orderData: pedidoSobDemanda,
                    coords: coordsSobDemanda
                })
            });

            const data = await res.json();
            if (data.success) {
                alert("🛵 Motoboy do iFood solicitado com sucesso!\n\nO pedido ficará aguardando na coluna 'Em Preparo' até o entregador chegar e você validar o Código de Coleta.");
                setIsSobDemandaModalOpen(false);
                setIsMotoqueiroModalOpen(false);
                setPedidoSobDemanda(null);
            } else {
                alert(`❌ Não foi possível chamar entregador: ${data.error}`);
            }
        } catch (err) {
            alert("Erro ao solicitar entregador no servidor.");
        } finally {
            setLoadingSobDemanda(false);
        }
    };

    const cancelarChamadaMotoIfood = async (order) => {
        if (!window.confirm("Deseja cancelar a chamada do entregador Sob Demanda do iFood?")) return;
        try {
            const uid = auth.currentUser?.uid;
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/shipping/cancel-driver/${uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId: order.id,
                    ifoodOrderId: order.ifoodOrderId || null,
                    shippingOrderId: order.ifoodShippingOrderId || null
                })
            });
            if (res.ok) {
                alert("✅ Chamada de entregador iFood cancelada. O pedido voltou para entrega própria.");
            } else {
                alert("Não foi possível cancelar a chamada no iFood.");
            }
        } catch (e) {
            alert("Erro ao cancelar chamada.");
        }
    };

    const calcularFretePorKM = React.useCallback(async (destinoBruto, numeroOverride) => {
        const enderecoBaseLoja = (configGeral.enderecoLoja || '').trim();
        const cidadePadrao = (configGeral.cidadePadrao || 'Bragança Paulista - SP').trim();

        if (!enderecoBaseLoja && !(configGeral.latLoja && configGeral.lngLoja)) {
            alert("Endereço da loja não configurado! Vá em 'Áreas de Entrega -> Geral' e preencha o 'Endereço Completo' da loja.");
            return;
        }

        if (!regioesKM || regioesKM.length === 0) {
            alert("Nenhuma região de KM cadastrada em 'Áreas de Entrega -> Regiões'.");
            return;
        }

        const textoCru = String(destinoBruto || manualOrder.address || '').trim();
        const partesTraco = textoCru.split(' - ').map(s => s.trim()).filter(Boolean);
        const ruaLimpa = partesTraco[0].split(',')[0].trim();
        const numLimpo = String(numeroOverride !== undefined ? numeroOverride : (manualOrder.addressNumber || '')).trim();

        const enderecoClienteCompleto = [numLimpo ? `${ruaLimpa}, ${numLimpo}` : ruaLimpa, cidadePadrao, 'Brasil'].filter(Boolean).join(', ');
        const enderecoLojaCompleto = `${enderecoBaseLoja}, ${cidadePadrao}, Brasil`;

        setCalculandoFrete(true);

        try {
            try {
                const urlRail = `${WHATSAPP_API_URL}/api/calcular-taxa?origin=${encodeURIComponent(enderecoLojaCompleto)}&destination=${encodeURIComponent(enderecoClienteCompleto)}`;
                const resRail = await fetch(urlRail);
                if (resRail.ok) {
                    const dataRail = await resRail.json();
                    const distMetrosRail = dataRail?.rows?.[0]?.elements?.[0]?.distance?.value;
                    if (dataRail?.status === 'OK' && distMetrosRail !== undefined) {
                        aplicarDistanciaCalculada(distMetrosRail);
                        setCalculandoFrete(false);
                        return;
                    }
                }
            } catch (e) {}

            let coordLoja = null;
            if (configGeral.latLoja && configGeral.lngLoja && configGeral.enderecoLoja && Number(configGeral.latLoja) !== -22.9529) {
                coordLoja = { lat: Number(configGeral.latLoja), lng: Number(configGeral.lngLoja) };
            }
            if (!coordLoja) coordLoja = await geocodificarEndereco(enderecoLojaCompleto);

            let coordCliente = await geocodificarEndereco(enderecoClienteCompleto);
            if (!coordCliente) coordCliente = await geocodificarEndereco(`${ruaLimpa}, ${cidadePadrao}, Brasil`);
            if (!coordCliente && textoCru) coordCliente = await geocodificarEndereco(`${textoCru}, ${cidadePadrao}`);

            if (coordLoja && coordCliente) {
                let distFinalMetros = null;
                try {
                    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordLoja.lng},${coordLoja.lat};${coordCliente.lng},${coordCliente.lat}?overview=false`;
                    const osrmRes = await fetch(osrmUrl);
                    if (osrmRes.ok) {
                        const osrmData = await osrmRes.json();
                        if (osrmData?.routes?.[0]?.distance !== undefined) distFinalMetros = osrmData.routes[0].distance;
                    }
                } catch (e) {}

                if (distFinalMetros === null) {
                    distFinalMetros = calcularDistanciaMetros(coordLoja.lat, coordLoja.lng, coordCliente.lat, coordCliente.lng) * 1.35;
                }

                aplicarDistanciaCalculada(distFinalMetros);
                setCalculandoFrete(false);
                return;
            }
        } catch (err) {
            console.error("Erro ao geocodificar:", err);
        }

        setCalculandoFrete(false);
        alert("Não foi possível localizar este endereço automaticamente. Selecione um Bairro na lista ou digite o valor na caixa 'Taxa de Entrega (R$)'.");
    }, [configGeral, regioesKM, manualOrder.address, manualOrder.addressNumber, aplicarDistanciaCalculada]);

    const handleCalcularTaxaManual = React.useCallback(() => {
        if (deliveryMethod === 'retirada' || deliveryMethod === 'local') {
            setDeliveryInfo({ fee: 0, time: 0, found: true, inactive: false, name: deliveryMethod === 'local' ? 'Consumo no Local' : 'Retirada na Loja', isKm: false }); 
            setDeliveryFee('0');
            return;
        }
        const norm = (str) => str ? String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

        if (manualOrder.neighborhood) {
            const matchedArea = deliveryAreas.find(a => norm(a.name) === norm(manualOrder.neighborhood));
            if (matchedArea) {
                if (matchedArea.isInactive) {
                    setDeliveryInfo({ fee: '', time: '', found: true, inactive: true, name: matchedArea.name, isKm: false });
                    setDeliveryFee('');
                } else {
                    const taxaBairro = p(matchedArea.deliveryFee ?? matchedArea.taxa ?? 0);
                    setDeliveryInfo({ fee: taxaBairro, time: matchedArea.time || 15, found: true, inactive: false, name: matchedArea.name, isKm: false });
                    setDeliveryFee(String(taxaBairro));
                }
                return;
            }
        }

        if (manualOrder.address) {
            calcularFretePorKM(manualOrder.address, manualOrder.addressNumber);
        } else {
            alert("Preencha a Rua/Avenida ou selecione um Bairro para calcular a entrega.");
        }
    }, [deliveryMethod, manualOrder.neighborhood, manualOrder.address, manualOrder.addressNumber, deliveryAreas, calcularFretePorKM]);

    const buscarSugestoesEnderecoBackend = (textoDigitado) => {
        if (timeoutBuscaEnderecoRef.current) clearTimeout(timeoutBuscaEnderecoRef.current);
        if (!textoDigitado || textoDigitado.trim().length < 4) {
            setSugestoesEndereco([]);
            setMostrarSugestoesEndereco(false);
            return;
        }

        timeoutBuscaEnderecoRef.current = setTimeout(async () => {
            const cidadePadrao = (configGeral.cidadePadrao || 'Bragança Paulista - SP').split('-')[0].trim();
            const queryCompleta = !textoDigitado.toLowerCase().includes(cidadePadrao.toLowerCase())
                ? `${textoDigitado}, ${cidadePadrao}, SP`
                : textoDigitado;

            if (window.google && window.google.maps && window.google.maps.Geocoder) {
                const geocoder = new window.google.maps.Geocoder();
                const listaGoogle = await new Promise((resolve) => {
                    geocoder.geocode({ address: queryCompleta, region: 'BR' }, (results, status) => {
                        if (status === 'OK' && Array.isArray(results) && results.length > 0) {
                            const formatados = results.slice(0, 5).map((r, i) => {
                                const compRua = r.address_components?.find(c => c.types.includes('route'));
                                const compBairro = r.address_components?.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
                                const rua = compRua ? compRua.long_name : r.formatted_address.split(',')[0];
                                const bairro = compBairro ? compBairro.long_name : '';
                                return { place_id: r.place_id || `g_${i}`, description: r.formatted_address, ruaLimpa: rua, bairroDetectado: bairro };
                            });
                            resolve(formatados);
                        } else resolve(null);
                    });
                });

                if (listaGoogle && listaGoogle.length > 0) {
                    setSugestoesEndereco(listaGoogle);
                    setMostrarSugestoesEndereco(true);
                    return;
                }
            }

            try {
                const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(queryCompleta)}`);
                if (osmRes.ok) {
                    const osmData = await osmRes.json();
                    if (Array.isArray(osmData) && osmData.length > 0) {
                        const formatadas = osmData.map((item, idx) => {
                            const rua = item.address?.road || item.display_name.split(',')[0];
                            const bairro = item.address?.suburb || item.address?.neighbourhood || item.address?.city_district || '';
                            const cidade = item.address?.city || item.address?.town || item.address?.municipality || '';
                            const descCurta = [rua, bairro, cidade].filter(Boolean).join(' - ');
                            return { place_id: item.place_id || idx, description: descCurta || item.display_name, ruaLimpa: rua, bairroDetectado: bairro };
                        });
                        setSugestoesEndereco(formatadas);
                        setMostrarSugestoesEndereco(true);
                        return;
                    }
                }
            } catch (e) {}

            setMostrarSugestoesEndereco(false);
        }, 400);
    };

    const selecionarSugestaoEndereco = (sugObj) => {
        setMostrarSugestoesEndereco(false);
        setSugestoesEndereco([]);
        const ruaApenas = typeof sugObj === 'string'
            ? sugObj.split(' - ')[0].split(',')[0].trim()
            : (sugObj.ruaLimpa || sugObj.description.split(' - ')[0].split(',')[0].trim());
        const textoCompleto = typeof sugObj === 'string' ? sugObj : (sugObj.description || ruaApenas);
        const norm = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
        const bairroCadastrado = deliveryAreas.find(a =>
            a.name && (norm(textoCompleto).includes(norm(a.name)) || (sugObj?.bairroDetectado && norm(a.name) === norm(sugObj.bairroDetectado)))
        );

        if (bairroCadastrado) {
            setManualOrder(prev => ({ ...prev, address: ruaApenas, neighborhood: bairroCadastrado.name }));
        } else {
            setManualOrder(prev => ({ ...prev, address: ruaApenas }));
            if (regioesKM.length > 0) calcularFretePorKM(ruaApenas, manualOrder.addressNumber);
        }
    };

    const handleZerarContadorPedidos = async () => {
        if (window.confirm("Atenção: Deseja zerar a numeração dos pedidos diários?\n\nO próximo pedido vai começar no #0001.")) {
            try {
                const user = auth.currentUser;
                if (!user) return;
                await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/order_counter`).set({ lastNumber: 0 }, { merge: true });
                alert("✅ Numeração zerada com sucesso! O próximo pedido será o #0001.");
            } catch (err) { alert("Erro ao zerar numeração: " + err.message); }
        }
    };

    const conectarWhatsApp = async () => {
        const user = auth.currentUser;
        if (!user) return;
        setWaLoading(true);
        setWaMessage('Iniciando o motor do WhatsApp... Aguarde.');
        setQrCodeString(null);
        setIsWaConnected(false);
        setIsWhatsAppModalOpen(true);
        try {
            const response = await fetch(`${WHATSAPP_API_URL}/api/whatsapp/conectar/${user.uid}`);
            if (!response.ok) throw new Error("Falha no servidor");
            const data = await response.json();
            if (data.status === 'qr_gerado') {
                setQrCodeString(data.qrCode);
                setWaMessage('Aponte a câmera do seu telemóvel para o QR Code abaixo:');
                setWaConnectionError(false);
            } else if (data.status === 'conectado') {
                setWaMessage('✅ O WhatsApp desta loja já está logado e a funcionar!');
                setIsWaConnected(true);
                setWaConnectionError(false);
            }
        } catch (error) {
            setWaMessage('Erro ao comunicar com o servidor no Railway.');
            setWaConnectionError(true);
            setWaErrorMsg('Falha de conexão ao tentar iniciar o motor do WhatsApp.');
        } finally { setWaLoading(false); }
    };

    const desconectarWhatsApp = async () => {
        const user = auth.currentUser;
        if (!user) return;
        setWaLoading(true);
        setWaMessage('A desconectar o WhatsApp... Aguarde um momento.');
        try {
            await fetch(`${WHATSAPP_API_URL}/api/whatsapp/desconectar/${user.uid}`, { method: 'POST' });
            setIsWaConnected(false);
            setQrCodeString(null);
            setWaMessage('Desconectado com sucesso!');
        } catch (error) { setWaMessage('Erro ao desconectar o WhatsApp.'); }
        finally { setWaLoading(false); }
    };

    const handleSalvarMensagens = async () => {
        setSavingMsgs(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/whatsapp_mensagens`).set(msgTemplates);
            alert("Sucesso! Os novos textos já estão ativos no seu WhatsApp e Totem.");
            setIsConfigMsgsModalOpen(false);
        } catch (error) { alert("Erro ao salvar configurações de mensagem."); } 
        finally { setSavingMsgs(false); }
    };

    const handleSalvarIfood = async () => {
        setSavingIfood(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/ifood`).set(ifoodCreds);
            alert("✅ Chaves do iFood salvas com sucesso! O servidor de automação irá ler estes dados.");
            setIsIfoodModalOpen(false);
            carregarPanoramaIfood();
        } catch (error) { alert("Erro ao salvar credenciais do iFood."); }
        finally { setSavingIfood(false); }
    };

    const filteredSearchCustomers = customerSearchQueryPDV.length > 2 ? customers.filter(c => {
        const qText = customerSearchQueryPDV.toLowerCase();
        const qNum = normalizePhone(customerSearchQueryPDV);
        const n = c.name ? c.name.toLowerCase() : '';
        const pNum = normalizePhone(c.phone);
        return n.includes(qText) || (qNum.length >= 4 && pNum.includes(qNum));
    }) : [];

    const preencherDadosClienteEncontrado = (foundCustomer) => {
        const historico = extrairEnderecosHistoricos(foundCustomer);
        setCustomerSavedAddresses(historico);
        const endPrincipal = historico[0] || desmontarStringEndereco(foundCustomer.address);
        const bairroValido = deliveryAreas.some(a => a.name === (endPrincipal.bairro || foundCustomer.neighborhood))
            ? (endPrincipal.bairro || foundCustomer.neighborhood)
            : '';

        setManualOrder(prev => ({
            ...prev,
            customerName: foundCustomer.name || prev.customerName,
            customerPhone: foundCustomer.phone || prev.customerPhone,
            address: endPrincipal.rua || prev.address,
            addressNumber: endPrincipal.numero || prev.addressNumber,
            addressComplement: endPrincipal.complemento || prev.addressComplement,
            neighborhood: bairroValido || prev.neighborhood || ''
        }));

        if (!bairroValido && endPrincipal.rua && regioesKM.length > 0) {
            calcularFretePorKM(endPrincipal.rua, endPrincipal.numero);
        }
    };

    const handlePhoneChange = (valInput) => {
        const checkNum = normalizePhone(valInput);
        if (checkNum.length >= 8) {
            const foundCustomer = customers.find(c => {
                const dbNum = normalizePhone(c.phone);
                return dbNum && (dbNum === checkNum || dbNum.endsWith(checkNum) || checkNum.endsWith(dbNum));
            });
            if (foundCustomer) {
                setCustomerFound(true); 
                preencherDadosClienteEncontrado(foundCustomer);
            } else { 
                setCustomerFound(false);
                setCustomerSavedAddresses([]);
            }
        } else { 
            setCustomerFound(false);
            setCustomerSavedAddresses([]);
        }
    };

    const selectCustomerPDV = (cust) => {
        setCustomerFound(true);
        preencherDadosClienteEncontrado(cust);
        setCustomerSearchQueryPDV('');
        setShowCustomerDropdownPDV(false);
    };
    
    useEffect(() => {
        if (deliveryMethod === 'retirada' || deliveryMethod === 'local') {
            setDeliveryInfo({ fee: 0, time: 0, found: true, inactive: false, name: deliveryMethod === 'local' ? 'Consumo no Local' : 'Retirada na Loja', isKm: false });
            setDeliveryFee('0');
        } else if (manualOrder.neighborhood) {
            const norm = (str) => str ? String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
            const matchedArea = deliveryAreas.find(a => norm(a.name) === norm(manualOrder.neighborhood));
            if (matchedArea) {
                if (matchedArea.isInactive) {
                    setDeliveryInfo({ fee: '', time: '', found: true, inactive: true, name: matchedArea.name, isKm: false });
                    setDeliveryFee('');
                } else {
                    const taxaBairro = p(matchedArea.deliveryFee ?? matchedArea.taxa ?? 0);
                    setDeliveryInfo({ fee: taxaBairro, time: matchedArea.time || 15, found: true, inactive: false, name: matchedArea.name, isKm: false });
                    setDeliveryFee(String(taxaBairro));
                }
            }
        }
    }, [manualOrder.neighborhood, deliveryMethod, deliveryAreas]);

    // ==========================================
    // CANCELAMENTO OFICIAL IFOOD E 99FOOD (COM MOTIVO)
    // ==========================================
    const deleteOrder = async (orderOrId) => {
        const orderObj = typeof orderOrId === 'object' ? orderOrId : orders.find(o => o.id === orderOrId);
        const orderId = typeof orderOrId === 'object' ? orderOrId.id : orderOrId;

        if (orderObj && (orderObj.origin === 'IFOOD' || orderObj.origin === '99FOOD') && orderObj.ifoodOrderId) {
            setOrderToCancelIfood(orderObj);
            setIsIfoodCancelModalOpen(true);
            setLoadingCancelReasons(true);
            setIfoodCancelReasons([]);
            setSelectedCancelCode('');

            if (orderObj.origin === '99FOOD') {
                const motivos99 = [
                    { cancelCodeId: '1', description: 'Produto indisponível / esgotado na loja' },
                    { cancelCodeId: '2', description: 'Loja fechada ou sobrecarregada no momento' },
                    { cancelCodeId: '3', description: 'Sem entregador disponível para o endereço' },
                    { cancelCodeId: '4', description: 'Solicitação do cliente / endereço incorreto' },
                    { cancelCodeId: '5', description: 'Problemas operacionais / técnicos na cozinha' }
                ];
                setIfoodCancelReasons(motivos99);
                setSelectedCancelCode('1');
                setLoadingCancelReasons(false);
                return;
            }

            try {
                const uid = auth.currentUser?.uid;
                const res = await fetch(`${IFOOD_API_URL}/api/ifood/cancellation-reasons/${uid}/${orderObj.ifoodOrderId}`);
                const data = await res.json();
                if (data.success && Array.isArray(data.reasons) && data.reasons.length > 0) {
                    setIfoodCancelReasons(data.reasons);
                    setSelectedCancelCode(String(data.reasons[0].cancelCodeId || data.reasons[0].code));
                } else {
                    const padrao = [
                        { cancelCodeId: '501', description: 'Problemas de sistema / operacional na loja' },
                        { cancelCodeId: '502', description: 'Produto indisponível no momento' },
                        { cancelCodeId: '504', description: 'Sem entregador disponível para a região' },
                        { cancelCodeId: '509', description: 'Atraso ou restaurante fechado' }
                    ];
                    setIfoodCancelReasons(padrao);
                    setSelectedCancelCode('501');
                }
            } catch (e) {
                const padrao = [
                    { cancelCodeId: '501', description: 'Problemas de sistema / operacional na loja' },
                    { cancelCodeId: '502', description: 'Produto indisponível no momento' }
                ];
                setIfoodCancelReasons(padrao);
                setSelectedCancelCode('501');
            } finally {
                setLoadingCancelReasons(false);
            }
            return;
        }

        if (window.confirm("Deseja cancelar/excluir este pedido permanentemente?")) {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${auth.currentUser.uid}/delivery_orders`).doc(orderId).delete();
        }
    };

    const handleConfirmarCancelamentoIfood = async () => {
        if (!orderToCancelIfood || !selectedCancelCode) {
            alert("Selecione um motivo de cancelamento.");
            return;
        }
        setCancellingIfoodOrder(true);
        try {
            const uid = auth.currentUser?.uid;
            const motivoObj = ifoodCancelReasons.find(r => String(r.cancelCodeId || r.code) === String(selectedCancelCode));
            const reasonText = motivoObj ? motivoObj.description : 'Cancelado pela loja';

            if (orderToCancelIfood.origin === 'IFOOD') {
                try {
                    await fetch(`${IFOOD_API_URL}/api/ifood/cancel-order`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            storeId: uid,
                            orderId: orderToCancelIfood.ifoodOrderId,
                            docId: orderToCancelIfood.id,
                            cancellationCode: selectedCancelCode,
                            reason: reasonText
                        })
                    });
                } catch (errFetch) {}
            }

            // Atualiza no Firebase (Para a 99Food, o listener do backend detecta ifoodCancelado: true e dispara /v1/order/order/cancel)
            await db.collection(`artifacts/tribo-burger-financeiro/users/${uid}/delivery_orders`)
                .doc(orderToCancelIfood.id)
                .update({
                    status: 'concluido',
                    ifoodCancelado: true,
                    cancelCode99: selectedCancelCode,
                    cancelReasonText99: reasonText,
                    observation: `❌ [CANCELADO PELA LOJA (${orderToCancelIfood.origin}) - Motivo: ${reasonText}] | ${orderToCancelIfood.observation || ''}`,
                    updatedAt: new Date().toISOString()
                });

            alert(`✅ Pedido ${orderToCancelIfood.origin} cancelado com motivo registrado e movido para Concluídos!`);
            setIsIfoodCancelModalOpen(false);
            setOrderToCancelIfood(null);
        } catch (err) {
            alert("Erro ao processar o cancelamento: " + err.message);
        } finally {
            setCancellingIfoodOrder(false);
        }
    };

    // ==========================================
    // VALIDAÇÃO DE CÓDIGO (OPCIONAL NA 99FOOD, MAS SEMPRE SOLICITA)
    // ==========================================
    const handleValidarCodigoIfood = async (order, type) => {
        const label = type === 'pickup' ? 'Código de Coleta / Retirada' : 'Código de Entrega';
        const is99 = order.origin === '99FOOD';
        const plataforma = is99 ? '99Food' : 'iFood';

        const matchColetaObs = order.observation ? order.observation.match(/Cód\. Coleta.*:\s*(\d+)/i) : null;
        const codigoColetaSalvo = order.ifoodPickupCode || (matchColetaObs ? matchColetaObs[1] : null);

        const msgPrompt = is99
            ? `Digite o ${label} (${plataforma})${codigoColetaSalvo ? ` [Esperado: ${codigoColetaSalvo}]` : ''}:\n\n💡 Opcional: Deixe em branco e clique em OK se desejar avançar sem código.`
            : `Digite o ${label} (${plataforma}):`;

        const code = window.prompt(msgPrompt);

        // Se clicou em "Cancelar" no prompt, aborta a ação
        if (code === null) return false;

        const codigoDigitado = String(code).trim();
        const user = auth.currentUser;
        if (!user) return false;

        // FLUXO 99FOOD: Pede o código mas não obriga (se digitou algo, confere; se deixou em branco, permite avançar)
        if (is99) {
            if (codigoDigitado !== '' && codigoColetaSalvo && codigoDigitado !== String(codigoColetaSalvo).trim()) {
                alert(`❌ Código incorreto! O código registrado neste pedido é ${codigoColetaSalvo}.\nDigite o código correto ou deixe em branco para pular.`);
                return false;
            }

            await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                .doc(order.id)
                .update({
                    status: type === 'pickup' ? 'entrega' : 'concluido',
                    pickupVerified: codigoDigitado !== '',
                    updatedAt: new Date().toISOString()
                });
            return true;
        }

        // FLUXO IFOOD: Obrigatório
        if (!codigoDigitado) return false;

        if (type === 'pickup' && codigoColetaSalvo && codigoDigitado !== String(codigoColetaSalvo).trim()) {
            alert(`❌ Código incorreto! O código de coleta correto deste pedido é ${codigoColetaSalvo}.`);
            return false;
        }

        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/validate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: user.uid,
                    orderId: order.ifoodOrderId,
                    docId: order.id,
                    code: codigoDigitado,
                    type: type
                })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.valid !== false) {
                if (type === 'pickup') {
                    alert("✅ Código de Coleta validado com sucesso! O pedido saiu para entrega (Em Rota).");
                    await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                        .doc(order.id)
                        .update({
                            status: 'entrega',
                            pickupVerified: true,
                            ifoodSobDemandaStatus: 'COLETA_VALIDADA',
                            updatedAt: new Date().toISOString()
                        });
                } else {
                    alert("✅ Código de Entrega validado com sucesso no iFood! Pedido concluído.");
                    await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                        .doc(order.id)
                        .update({
                            status: 'concluido',
                            deliveryVerified: true,
                            updatedAt: new Date().toISOString()
                        });
                }
                return true;
            } else {
                if (type === 'pickup' && codigoColetaSalvo && codigoDigitado === String(codigoColetaSalvo).trim()) {
                    alert("✅ Código de Coleta validado com sucesso! O pedido saiu para entrega.");
                    await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                        .doc(order.id)
                        .update({
                            status: 'entrega',
                            pickupVerified: true,
                            ifoodSobDemandaStatus: 'COLETA_VALIDADA',
                            updatedAt: new Date().toISOString()
                        });
                    return true;
                }
                alert(`❌ Código inválido! O iFood recusou o código "${codigoDigitado}".`);
                return false;
            }
        } catch (e) {
            alert("Erro ao comunicar com o servidor iFood para validar o código.");
            return false;
        }
    };

    const handleRastrearEntregadorIfood = async (order) => {
        const uid = auth.currentUser?.uid;
        if (!uid || !order.ifoodOrderId) return;
        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/tracking/${uid}/${order.ifoodOrderId}`);
            const data = await res.json();
            if (res.ok && data.success) {
                const tr = data.tracking;
                alert(`📍 Rastreamento iFood:\n\nLatitude: ${tr.latitude || 'N/A'}\nLongitude: ${tr.longitude || 'N/A'}\nPrevisão Entrega: ${tr.expectedDelivery ? new Date(tr.expectedDelivery).toLocaleTimeString('pt-BR') : 'Em deslocamento'}`);
            } else {
                alert(`ℹ️ ${data.error || 'O rastreamento em tempo real só fica ativo quando o entregador parceiro iFood está em rota.'}`);
            }
        } catch (e) {
            alert("Erro ao consultar rastreamento do entregador.");
        }
    };

    const handleBaixarPrescricaoIfood = (order, prescriptionId) => {
        const uid = auth.currentUser?.uid;
        if (!uid || !order.ifoodOrderId || !prescriptionId) return;
        window.open(`${IFOOD_API_URL}/api/ifood/prescriptions/${uid}/${order.ifoodOrderId}/${prescriptionId}`, '_blank');
    };

    const abrirModalDisputaIfood = (order) => {
        const disp = order.ifoodDispute || {};
        setDisputeModalOrder(order);
        if (disp.handshakeType === 'PREPARATION_TIME') setDisputeRejectReason('PREPARATION_IN_PROGRESS');
        else setDisputeRejectReason('INVENTORY_CHECK');
        const alt = disp.alternatives?.[0];
        if (alt?.type === 'REFUND' && alt?.metadata?.maxAmount?.value) {
            const maxCents = Number(alt.metadata.maxAmount.value);
            setDisputeRefundValueReais((maxCents / 100).toFixed(2).replace('.', ','));
        } else {
            setDisputeRefundValueReais('2,00');
        }
        if (alt?.type === 'ADDITIONAL_TIME') {
            const tempos = alt.metadata?.allowedsAdditionalTimeInMinutes || [10, 15, 20, 30];
            const motivos = alt.metadata?.allowedsAdditionalTimeReasons || ['HIGH_STORE_DEMAND', 'OPERATIONAL_ISSUES'];
            setDisputeAddTimeMinutes(tempos[0] || 15);
            setDisputeAddTimeReason(motivos[0] || 'OPERATIONAL_ISSUES');
        }
    };

    const handleEnviarRespostaDisputa = async (action) => {
        if (!disputeModalOrder || !disputeModalOrder.ifoodDispute) return;
        const uid = auth.currentUser?.uid;
        const disp = disputeModalOrder.ifoodDispute;
        const alt = disp.alternatives?.[0];
        let reason = undefined;
        let payloadProposta = undefined;

        if (action === 'accept') {
            if (disp.handshakeType === 'DELAY') reason = disputeAcceptDelayReason || 'STORE_SYSTEM_ISSUES';
            else if (Array.isArray(disp.acceptCancellationReasons) && disp.acceptCancellationReasons.length > 0) reason = disp.acceptCancellationReasons[0];
        } else if (action === 'reject') {
            reason = disputeRejectReason || (disp.handshakeType === 'PREPARATION_TIME' ? 'PREPARATION_IN_PROGRESS' : 'INVENTORY_CHECK');
        } else if (action === 'alternative') {
            if (disp.handshakeType === 'DELAY' || alt?.type === 'ADDITIONAL_TIME') {
                payloadProposta = {
                    type: 'ADDITIONAL_TIME',
                    metadata: { additionalTimeInMinutes: Number(disputeAddTimeMinutes), additionalTimeReason: disputeAddTimeReason }
                };
            } else {
                const valorNumerico = parseFloat(String(disputeRefundValueReais).replace(',', '.')) || 0;
                const valorCentavosStr = String(Math.round(valorNumerico * 100));
                const maxCents = Number(alt?.metadata?.maxAmount?.value || 999999);
                if (Math.round(valorNumerico * 100) <= 0 || Math.round(valorNumerico * 100) > maxCents) {
                    alert(`Informe um valor de reembolso válido (Máximo permitido: R$ ${(maxCents / 100).toFixed(2).replace('.', ',')}).`);
                    return;
                }
                payloadProposta = { type: 'REFUND', metadata: { amount: { currency: 'BRL', value: valorCentavosStr } } };
            }
        }

        setSendingDisputeResponse(true);
        try {
            const res = await fetch(`${IFOOD_API_URL}/api/ifood/disputes/${uid}/${disp.disputeId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId: disputeModalOrder.id, reason, alternativeId: alt?.id || null, payloadProposta })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Resposta (${action.toUpperCase()}) enviada com sucesso para a Plataforma de Negociação do iFood!`);
                setDisputeModalOrder(null);
            } else alert(`❌ Erro iFood: ${data.error || 'Falha ao processar resposta.'}`);
        } catch (e) { alert("Erro de comunicação com o servidor."); } 
        finally { setSendingDisputeResponse(false); }
    };

    const updateOrderStatus = async (order, newStatus) => {
        const user = auth.currentUser; if (!user) return;
        await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                .doc(order.id).update({ status: newStatus, updatedAt: new Date().toISOString() });
        if (newStatus === 'preparo') imprimirPedido(order, 'TODOS');
    };

    const revertOrderStatus = async (order) => {
        const user = auth.currentUser; if (!user) return;
        const orderRef = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`).doc(order.id);
        let newStatus = '', updateData = { updatedAt: new Date().toISOString() };
        
        if (order.status === 'preparo') newStatus = 'pendente';
        else if (order.status === 'entrega') {
            newStatus = 'preparo';
            updateData.motoqueiro = '';
            updateData.taxaEntregador = 0;
            updateData.contaMaquinaMotoboy = '';
        } else if (order.status === 'concluido') {
            const isRetirada = order.address && (order.address.includes('Retirada') || order.address.includes('Balcão') || order.address.includes('LOCAL') || order.address.includes('Local'));
            newStatus = isRetirada ? 'preparo' : 'entrega';
        }
        if (newStatus) { updateData.status = newStatus; await orderRef.update(updateData); }
    };

    const confirmarDespacho = async () => {
        if (!motoqueiroSelecionado) { alert("Selecione o motoqueiro."); return; }
        const user = auth.currentUser; if (!user || !pedidoParaDespachar) return;

        // Se for um pedido 99Food com entrega própria, solicita o código de coleta (opcional) antes de despachar
        if (pedidoParaDespachar.origin === '99FOOD') {
            const ok = await handleValidarCodigoIfood(pedidoParaDespachar, 'pickup');
            if (!ok) return;
        }
        
        const motoData = listaMotoqueiros.find(m => m.nome === motoqueiroSelecionado);
        const maquinaVinculada = motoData ? motoData.contaMaquina : '';
        const telefoneMotoboy = motoData ? formatarTelefone(motoData.telefone) : '';

        await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                .doc(pedidoParaDespachar.id)
                .update({ 
                    status: 'entrega', 
                    motoqueiro: motoqueiroSelecionado, 
                    contaMaquinaMotoboy: maquinaVinculada, 
                    taxaEntregador: pedidoParaDespachar.deliveryFee, 
                    updatedAt: new Date().toISOString() 
                });

        if (telefoneMotoboy) {
            const numeroCurto = pedidoParaDespachar.orderNumber || pedidoParaDespachar.ifoodDisplayId || pedidoParaDespachar.id.substring(0, 5).toUpperCase();
            const clienteLimpo = pedidoParaDespachar.customerName ? pedidoParaDespachar.customerName.replace(/\s*\(#\d+\)/, '') : 'Não informado';
            
            let msgMoto = `🛵 *NOVA ENTREGA - TRIBO BURGER*\n\n`;
            msgMoto += `*Pedido:* #${numeroCurto}\n`;
            msgMoto += `*Cliente:* ${clienteLimpo}\n`;
            msgMoto += `*Telefone:* ${pedidoParaDespachar.customerPhone || 'Não informado'}\n`;
            msgMoto += `*Endereço:* ${pedidoParaDespachar.address}\n`;
            msgMoto += `*Pagamento:* ${pedidoParaDespachar.paymentMethod} (${formatMoney(pedidoParaDespachar.total)})\n`;
            
            if (pedidoParaDespachar.observation && pedidoParaDespachar.observation.includes('TROCO')) {
                msgMoto += `\n⚠️ *ATENÇÃO:* ${pedidoParaDespachar.observation.split('|')[0].trim()}\n`;
            }

            dispararMensagemWhatsApp(user.uid, telefoneMotoboy, msgMoto);
        }

        setIsMotoqueiroModalOpen(false);
        setPedidoParaDespachar(null);
        setMotoqueiroSelecionado('');
    };

    const enviarParaAgente = async (nomeImpressoraCompartilhada, textoCupom) => {
        try {
            const resposta = await fetch('http://localhost:8080/imprimir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ impressora: nomeImpressoraCompartilhada, cupomRaw: textoCupom }) });
            return resposta.ok;
        } catch (err) { return false; }
    };

    // ==========================================
    // COMANDA TÉRMICA COM EXIGÊNCIAS 99FOOD (order_id + order_index + shop_paid_money)
    // ==========================================
    const formatarTextoComandaOficialIfood = (order, isBobinaPequena = false) => {
        const largura = isBobinaPequena ? 32 : 48;
        const traco = '-'.repeat(largura);
        const pontilhado = '.'.repeat(largura);
        const limpa = (t) => t ? String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
        const moeda = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

        const is99Food = order.origin === '99FOOD';
        const displayId = order.ifoodDisplayId || order.orderNumber || order.id?.slice(0, 4).toUpperCase();
        const fullOrderId = order.ifoodOrderId || order.id;
        const tipoHeader = order.ifoodOrderType === 'TAKEOUT'
            ? 'Pra Retirar'
            : (order.ifoodOrderType === 'DINE_IN' ? 'Na Mesa' : 'Delivery');
        const nomeMerchant = order.ifoodMerchantName || cmvSettings.ia_nomeLoja || cmvSettings.companyName || 'TRIBO BURGER';

        const dtPedido = new Date(order.createdAt).toLocaleString('pt-BR');
        const dtEntrega = order.ifoodDeliveryDateTime
            ? new Date(order.ifoodDeliveryDateTime).toLocaleString('pt-BR')
            : new Date(new Date(order.createdAt).getTime() + 30 * 60000).toLocaleString('pt-BR');
        const dtInicioPreparo = order.ifoodPreparationStartDateTime
            ? new Date(order.ifoodPreparationStartDateTime).toLocaleString('pt-BR')
            : null;
        const vagaTakeout = order.ifoodPickupAreaCode || order.ifoodRaw?.takeout?.pickupAreaCode || '';

        const nomeClienteLimpo = (order.customerName || '').replace(/\s*\(#\d+\)/, '');
        const qtdPedidosLoja = order.customerOrdersCount ?? 0;

        let blocoItens = '';
        const rawItems = order.ifoodRaw?.items || [];

        if (rawItems.length > 0) {
            blocoItens = rawItems.map(it => {
                const un = it.unit || 'UN';
                const precoBase = Number(it.price ?? (Number(it.unitPrice || 0) * Number(it.quantity || 1)));
                let txt = `${it.quantity} ${un}  ${limpa(it.name)}   ${moeda(precoBase)}\n`;

                if (Array.isArray(it.options) && it.options.length > 0) {
                    it.options.forEach(op => {
                        const opUn = op.unit || 'UN';
                        const opPrice = Number(op.price ?? 0);
                        txt += `   ${op.quantity} ${opUn} ${limpa(op.name)}${opPrice > 0 ? `   ${moeda(opPrice)}` : ''}\n`;

                        const custs = op.customizations || op.customization || [];
                        if (Array.isArray(custs)) {
                            custs.forEach(c => {
                                const cPrice = Number(c.price ?? 0);
                                txt += `      + ${c.quantity}x ${limpa(c.name)}${cPrice > 0 ? `   ${moeda(cPrice)}` : ''}\n`;
                            });
                        }
                    });
                }

                if (it.observations) txt += `Obs: ${limpa(it.observations)}\n`;
                const totalDoItem = Number(it.totalPrice ?? precoBase);
                txt += `Total do item: ${moeda(totalDoItem)}\n${pontilhado}`;
                return txt;
            }).join('\n');
        } else {
            blocoItens = `${limpa(order.items)}\n${pontilhado}`;
        }

        const subTotalVal = order.subTotal ?? order.ifoodRaw?.total?.subTotal ?? (Number(order.total || 0) - Number(order.deliveryFee || 0));
        const taxaEntregaVal = order.deliveryFee ?? order.ifoodRaw?.total?.deliveryFee ?? 0;
        const taxaAdicionalVal = order.additionalFeesTotal ?? order.ifoodRaw?.total?.additionalFees ?? 0;
        const descontoVal = order.benefitsTotal ?? order.ifoodRaw?.total?.benefits ?? 0;
        const totalFinalVal = order.total ?? order.ifoodRaw?.total?.orderAmount ?? 0;

        let blocoPagamentos = '';
        const rawMethods = order.ifoodRaw?.payments?.methods || [];
        if (rawMethods.length > 0) {
            rawMethods.forEach(m => {
                const isOnline = m.type === 'ONLINE';
                const metodoNome = m.method === 'CASH' ? 'DINHEIRO' : (m.method || 'OUTROS');
                const brand = m.card?.brand ? ` - ${limpa(m.card.brand)}` : (m.wallet?.name ? ` - ${limpa(m.wallet.name)}` : '');
                if (isOnline) {
                    blocoPagamentos += `| Pagamento Online (${metodoNome}${brand})   ${moeda(m.value)} |\n`;
                } else {
                    blocoPagamentos += `| Cobrar do Cliente na entrega             |\n`;
                    blocoPagamentos += `|   ${metodoNome}${brand}   ${moeda(m.value)} |\n`;
                    if (m.cash?.changeFor) {
                        const troco = Math.max(0, Number(m.cash.changeFor) - Number(m.value));
                        blocoPagamentos += `|   Troco para: ${moeda(m.cash.changeFor)} (Troco: ${moeda(troco)}) |\n`;
                    }
                }
            });
        } else {
            blocoPagamentos = `| ${limpa(order.paymentMethod)}   ${moeda(totalFinalVal)} |\n`;
            if (is99Food && Number(order.shopPaidMoney) > 0) {
                blocoPagamentos += `| shop_paid_money (Loja): ${moeda(order.shopPaidMoney)} |\n`;
            }
        }

        const isParceiroIfood = order.ifoodDeliveredBy === 'IFOOD';
        const isParceiro99 = order.ifoodDeliveredBy === '99FOOD';

        let blocoInfoAdicionais = '';
        if (!isParceiroIfood && order.customerDocument) {
            blocoInfoAdicionais += `\nInformacoes Adicionais\nIncluir CPF na nota fiscal:\n${limpa(order.customerDocument)}\n`;
        }
        if (order.ifoodRaw?.extraInfo) {
            blocoInfoAdicionais += `Info Extra: ${limpa(order.ifoodRaw.extraInfo)}\n`;
        }

        let blocoEntrega = '';
        if (order.ifoodOrderType !== 'TAKEOUT' && order.ifoodOrderType !== 'DINE_IN') {
            blocoEntrega += `${traco}\n       ENTREGA PEDIDO #${displayId}\n`;
            blocoEntrega += `Entregue por: ${isParceiroIfood ? 'PARCEIRO IFOOD' : (isParceiro99 ? 'PARCEIRO 99FOOD' : 'LOJA (ENTREGA PROPRIA)')}\n`;
            blocoEntrega += `Horario da Entrega: ${dtEntrega}\n`;
            blocoEntrega += `Cliente: ${limpa(nomeClienteLimpo)}\n`;
            if (order.ifoodPickupCode) {
                blocoEntrega += `Cod. Coleta/Entrega: ${order.ifoodPickupCode}\n`;
            }

            if (!isParceiroIfood) {
                blocoEntrega += `Endereco: ${limpa(order.addressStreet || order.address)}${order.addressNumber ? `, ${limpa(order.addressNumber)}` : ''}\n`;
                if (order.addressComplement) blocoEntrega += `Comp: ${limpa(order.addressComplement)}\n`;
                if (order.addressReference) blocoEntrega += `Ref: ${limpa(order.addressReference)}\n`;
                if (order.neighborhood) blocoEntrega += `Bairro: ${limpa(order.neighborhood)}\n`;
                if (order.addressCity) blocoEntrega += `Cidade: ${limpa(order.addressCity)} - ${limpa(order.addressState || 'SP')}\n`;
                if (order.addressZip) blocoEntrega += `CEP: ${limpa(order.addressZip)}\n`;
            } else {
                blocoEntrega += `[Endereco e CPF omitidos para protecao de dados]\n`;
            }
        }

        return (
            `**** PEDIDO #${displayId} ****\n` +
            (is99Food ? `Order Index: #${displayId}\nOrder ID: ${fullOrderId}\n` : '') +
            `       ${tipoHeader} ${is99Food ? '(99FOOD)' : ''}\n` +
            `${limpa(nomeMerchant.toUpperCase())}\n` +
            `Data do Pedido:  ${dtPedido}\n` +
            `Data de Entrega: ${dtEntrega}\n` +
            (order.isScheduled && dtInicioPreparo ? `Inicio Preparo:  ${dtInicioPreparo}\n` : '') +
            (vagaTakeout ? `Vaga Retirada:   ${vagaTakeout}\n` : '') +
            `Cliente: ${limpa(nomeClienteLimpo)}\n` +
            `${order.customerPhone ? `Telefone: ${limpa(order.customerPhone)}\n` : ''}` +
            `${qtdPedidosLoja} pedidos na sua loja\n` +
            `${traco}\n` +
            `          ITENS DO PEDIDO\n` +
            `${blocoItens}\n` +
            `               TOTAL\n` +
            `+${'-'.repeat(largura - 2)}+\n` +
            `| Valor total dos itens: ${moeda(subTotalVal)}\n` +
            `| Taxa de Entrega:       ${moeda(taxaEntregaVal)}\n` +
            `| Taxa Adicional:        ${moeda(taxaAdicionalVal)}\n` +
            `| Desconto (${is99Food ? '99FOOD' : 'IFOOD'}/LOJA): - ${moeda(descontoVal)}\n` +
            `| VALOR TOTAL:           ${moeda(totalFinalVal)}\n` +
            `+${'-'.repeat(largura - 2)}+\n\n` +
            `        FORMAS DE PAGAMENTO\n` +
            `+${'-'.repeat(largura - 2)}+\n` +
            `${blocoPagamentos}` +
            `+${'-'.repeat(largura - 2)}+\n` +
            `${blocoInfoAdicionais}` +
            `${blocoEntrega}` +
            `${traco}\n` +
            `Impresso por:\n` +
            `Tribo Sistemas (v1.0) - Tribo Tech\n`
        );
    };

    const imprimirPedido = async (order, tipoFiltro = 'TODOS') => {
        if (regrasImpressao.length === 0) {
            setComandaModalOrder(order);
            return;
        }

        const limpa = (texto) => texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
        const numeroPedido = order.ifoodDisplayId || order.orderNumber || order.id.slice(0, 5).toUpperCase();
        const dataPedido = new Date(order.createdAt).toLocaleString('pt-BR');

        const gerarViaPadrao = (isBobinaPequena) => {
            const textoComanda = formatarTextoComandaOficialIfood(order, isBobinaPequena);
            return '\x1B\x40\x1B\x61\x00' + textoComanda + '\n\n\n\n\n\x1D\x56\x00';
        };

        const gerarViaProducao = (isBobinaPequena) => {
            const traco = isBobinaPequena ? '--------------------------------' : '------------------------------------------------';
            return (
                '\x1B\x40\x1B\x61\x01\x1D\x21\x11PRODUCAO\n\x1D\x21\x00' + 
                'Pedido: #' + numeroPedido + '\n' + traco + '\n\x1B\x61\x00' + 
                'Data: ' + dataPedido + '\nCliente: ' + limpa(order.customerName) + '\n' + traco + '\n' +
                '\x1B\x45\x01ITENS A PREPARAR:\n\x1B\x45\x00' + limpa(order.items) + '\n' +
                (order.observation ? '\n\x1B\x45\x01ATENCAO - OBSERVACOES:\x1B\x45\x00\n' + limpa(order.observation) + '\n' : '') + 
                traco + '\n\n\n\n\n\n\x1D\x56\x00' 
            );
        };

        let erroEncontrado = false;
        for (const regra of regrasImpressao) {
            if (tipoFiltro !== 'TODOS' && regra.tipo !== tipoFiltro) continue;
            const isPequena = regra.bobina === '58mm';
            const cupom = regra.tipo === 'padrao' ? gerarViaPadrao(isPequena) : gerarViaProducao(isPequena);
            for (let i = 0; i < regra.vias; i++) {
                const sucesso = await enviarParaAgente(regra.nomeCompartilhado, cupom);
                if (!sucesso) erroEncontrado = true;
            }
        }
        if (erroEncontrado) {
            setComandaModalOrder(order);
        }
    };

    const abrirModalManual = () => {
        if (isManualModalMinimized) {
            setIsManualModalOpen(true);
            setIsManualModalMinimized(false);
            return;
        }
        setEditingOrderId(null);
        setManualOrder({ customerName: '', customerPhone: '', address: '', addressNumber: '', addressComplement: '', neighborhood: '', paymentMethod: 'Dinheiro', observation: '' });
        const defaultMethod = cmvSettings.geral_entregas !== false ? 'entrega' : (cmvSettings.geral_retirada !== false ? 'retirada' : 'local');
        setDeliveryMethod(defaultMethod);
        setShowDeliveryDropdown(false);
        setIsScheduled(cmvSettings.geral_imediatos === false);
        setScheduledDate(''); setScheduledTime('');
        setCart([]); setDeliveryFee(''); setTrocoPara(''); setDeliveryInfo({ fee: '', time: '', found: false, inactive: false, name: '', isKm: false });
        setCustomerFound(false); setSelectedCategoryFilter(''); setProductSearchQuery('');
        setCustomerSearchQueryPDV(''); setShowCustomerDropdownPDV(false); setCustomerSavedAddresses([]);
        setSugestoesEndereco([]); setMostrarSugestoesEndereco(false);
        setIsManualModalOpen(true);
    };

    const abrirModalEdicao = (order) => {
        setEditingOrderId(order.id);
        const isRetirada = order.address && (order.address.includes('Retirada') || order.address.includes('Balcão'));
        const isLocal = order.address && (order.address.includes('Local') || order.address.includes('LOCAL'));
        
        if (isLocal) setDeliveryMethod('local');
        else if (isRetirada) setDeliveryMethod('retirada');
        else setDeliveryMethod('entrega');
        
        const desmontado = desmontarStringEndereco(order.address);
        const ruaExtraida = order.addressStreet || desmontado.rua || '';
        const numeroExtraido = order.addressNumber || desmontado.numero || '';
        const compExtraido = order.addressComplement || desmontado.complemento || '';
        const bairroExtraido = order.neighborhood || desmontado.bairro || '';

        setShowDeliveryDropdown(false);
        if (order.paymentMethod && !paymentOptions.includes(order.paymentMethod)) {
            setPaymentOptions(prev => [...prev, order.paymentMethod]);
        }
        
        setIsScheduled(order.isScheduled || cmvSettings.geral_imediatos === false);
        setScheduledDate(order.scheduledDate || '');
        setScheduledTime(order.scheduledTime || '');

        setManualOrder({
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            address: (isRetirada || isLocal) ? '' : ruaExtraida,
            addressNumber: (isRetirada || isLocal) ? '' : numeroExtraido,
            addressComplement: (isRetirada || isLocal) ? '' : compExtraido,
            neighborhood: deliveryAreas.some(a => a.name === bairroExtraido) ? bairroExtraido : '',
            paymentMethod: order.paymentMethod || 'Dinheiro',
            observation: order.observation || ''
        });

        if (order.cartDetails && Array.isArray(order.cartDetails)) {
            setCart(order.cartDetails.map(item => ({ ...item, qty: item.qty ?? item.qtd ?? 1 })));
        } else setCart([]);

        setDeliveryFee(String(order.deliveryFee || 0));
        setDeliveryInfo({ fee: order.deliveryFee, time: order.estimatedTime || '', found: true, inactive: false, name: 'Endereço Atual', isKm: false });
        setIsManualModalOpen(true);
        setIsManualModalMinimized(false);
    };

    const handleAddToCartFromPDV = (product) => {
        setPdvSelectedProductForModal(product);
        setPdvModalQty(1);
        setPdvModalObs('');
        setSelectedComplements({});
    };

    const getGroupsToDisplay = () => {
        if (!pdvSelectedProductForModal) return [];
        if (pdvSelectedProductForModal.linkedGroups?.length > 0) {
            return pdvSelectedProductForModal.linkedGroups.map(id => complementGroups.find(g => g.id === id)).filter(Boolean);
        }
        return pdvSelectedProductForModal.complements || pdvSelectedProductForModal.complementos || pdvSelectedProductForModal.groups || pdvSelectedProductForModal.opcionais || [];
    };

    const getQtyComplement = (groupId, itemId) => {
        const arr = selectedComplements[groupId] || [];
        const found = arr.find(x => (x.id || x.name || x.nome) === itemId);
        return found ? found.qty : 0;
    };

    const handleUpdateComplement = (group, item, delta) => {
        const gId = group.id || group.name, iId = item.id || item.name || item.nome;
        const currentArr = selectedComplements[gId] || [];
        const currentQty = getQtyComplement(gId, iId);
        const maxForGroup = parseInt(group.max) || 99;
        const currentGroupTotalQty = currentArr.reduce((sum, i) => sum + i.qty, 0);

        if (delta > 0) {
            if (maxForGroup === 1) {
                setSelectedComplements(prev => ({ ...prev, [gId]: [{ ...item, qty: 1 }] }));
                return;
            }
            if (currentGroupTotalQty >= maxForGroup || currentQty >= (parseInt(item.maxQtd) || 1)) return;
            if (currentQty === 0) setSelectedComplements(prev => ({ ...prev, [gId]: [...currentArr, { ...item, qty: 1 }] }));
            else setSelectedComplements(prev => ({ ...prev, [gId]: currentArr.map(x => (x.id || x.name || x.nome) === iId ? { ...x, qty: x.qty + 1 } : x) }));
        } else if (delta < 0) {
            if (currentQty <= 1) setSelectedComplements(prev => ({ ...prev, [gId]: currentArr.filter(x => (x.id || x.name || x.nome) !== iId) }));
            else setSelectedComplements(prev => ({ ...prev, [gId]: currentArr.map(x => (x.id || x.name || x.nome) === iId ? { ...x, qty: x.qty - 1 } : x) }));
        }
    };

    const getPdvModalComputedPrice = () => {
        if (!pdvSelectedProductForModal) return 0;
        const base = pdvSelectedProductForModal.promoPrice > 0 ? pdvSelectedProductForModal.promoPrice : pdvSelectedProductForModal.price;
        let compSum = 0;
        Object.values(selectedComplements).forEach(arr => { arr.forEach(item => { compSum += (Number(item.price || item.valor || 0) * item.qty); }); });
        return (Number(base) + compSum) * pdvModalQty;
    };

    const handleConfirmAddToCart = () => {
        const groups = getGroupsToDisplay();
        for (const group of groups) {
            const gId = group.id || group.name, min = parseInt(group.min) || 0;
            const currentGroupTotalQty = (selectedComplements[gId] || []).reduce((sum, i) => sum + i.qty, 0);
            if (currentGroupTotalQty < min) { alert(`Selecione pelo menos ${min} opção(ões) em "${group.name || group.nome}".`); return; }
        }

        const basePrice = pdvSelectedProductForModal.promoPrice > 0 ? pdvSelectedProductForModal.promoPrice : pdvSelectedProductForModal.price;
        let compTotal = 0;
        const compNames = [];
        Object.values(selectedComplements).forEach(arr => {
            arr.forEach(item => {
                compTotal += (Number(item.price || item.valor || 0) * item.qty);
                compNames.push(`${item.qty > 1 ? item.qty + 'x ' : ''}${item.name || item.nome}`);
            });
        });

        setCart(prev => [...prev, {
            id: crypto.randomUUID(),
            productId: pdvSelectedProductForModal.id,
            name: pdvSelectedProductForModal.name,
            price: Number(basePrice) + compTotal,
            qty: pdvModalQty,
            observation: pdvModalObs,
            complementsDesc: compNames.join(', ')
        }]);
        setPdvSelectedProductForModal(null);
    };

    const handleRemoveFromCart = (cartId) => setCart(cart.filter(item => item.id !== cartId));

    const handleSalvarPedidoManual = async () => {
        if (!manualOrder.customerName) { alert("Preencha o nome do cliente."); return; }
        if (cart.length === 0) { alert("Adicione pelo menos um item ao pedido."); return; }
        if (deliveryMethod === 'entrega') {
            if (!manualOrder.address) { alert("Para entrega, preencha a Rua/Av do endereço."); return; }
            if (!manualOrder.addressNumber) { alert("Para entrega, preencha o NÚMERO da residência."); return; }
        }
        if (manualOrder.paymentMethod === 'Dinheiro') {
            const valorPago = parseFloat(String(trocoPara).replace(',', '.'));
            if (!trocoPara || isNaN(valorPago) || valorPago < finalTotal) {
                alert(`Para pagamento em Dinheiro, informe o Valor Pago (mínimo ${formatMoney(finalTotal)}).`);
                return;
            }
        }
        if (isScheduled && (!scheduledDate || !scheduledTime)) {
            alert("Para pedidos agendados, preencha a Data e o Horário.");
            return;
        }

        const user = auth.currentUser; if (!user) return;
        const basePath = `artifacts/tribo-burger-financeiro/users/${user.uid}`;
        const dataAtual = new Date().toISOString();
        const telefoneFinalizado = formatarTelefone(manualOrder.customerPhone);
        
        let fullAddress = 'Retirada no Balcão (TOTEM)';
        if (deliveryMethod === 'local') fullAddress = 'Consumo no Local (PDV)';
        if (deliveryMethod === 'retirada') fullAddress = 'Retirada no Balcão (PDV)';
        if (deliveryMethod === 'entrega') {
            fullAddress = `${manualOrder.address}${manualOrder.addressNumber ? ', ' + manualOrder.addressNumber : ''}`;
            if (manualOrder.addressComplement) fullAddress += ` - ${manualOrder.addressComplement}`;
            if (manualOrder.neighborhood) fullAddress += ` - ${manualOrder.neighborhood}`;
        }

        let observacaoFinal = manualOrder.observation;
        if (manualOrder.paymentMethod === 'Dinheiro' && trocoPara) {
            const valPago = parseFloat(String(trocoPara).replace(',', '.'));
            const valorTroco = valPago - finalTotal;
            if (valorTroco > 0) {
                const msgTroco = `LEVAR TROCO PARA R$ ${valPago.toFixed(2).replace('.', ',')} (Troco de ${formatMoney(valorTroco)})`;
                observacaoFinal = observacaoFinal ? `${msgTroco} | ${observacaoFinal}` : msgTroco;
            }
        }

        const itemsFormattedText = cart.map(item => {
            let txt = `${item.qty}x ${item.name}`;
            if (item.complementsDesc) txt += ` (${item.complementsDesc})`;
            if (item.observation) txt += ` [Obs: ${item.observation}]`;
            return txt;
        }).join('\n');

        let finalEstimatedTime = '';
        if (deliveryMethod === 'retirada' || deliveryMethod === 'local') finalEstimatedTime = tempoPreparo;
        else if (deliveryInfo.found && !deliveryInfo.inactive) finalEstimatedTime = (parseInt(deliveryInfo.time) || 0) + tempoPreparo + tempoExtraEntrega;

        const pedidoDados = {
            customerName: manualOrder.customerName, 
            customerPhone: telefoneFinalizado,
            address: fullAddress,
            addressStreet: deliveryMethod === 'entrega' ? (manualOrder.address || '') : '',
            addressNumber: deliveryMethod === 'entrega' ? (manualOrder.addressNumber || '') : '',
            addressComplement: deliveryMethod === 'entrega' ? (manualOrder.addressComplement || '') : '',
            neighborhood: deliveryMethod === 'entrega' ? (manualOrder.neighborhood || '') : '',
            estimatedTime: finalEstimatedTime, 
            items: itemsFormattedText,
            total: finalTotal,
            deliveryFee: p(deliveryFee),
            paymentMethod: manualOrder.paymentMethod,
            observation: observacaoFinal,
            updatedAt: dataAtual,
            cartDetails: cart,
            isScheduled: isScheduled,
            scheduledDate: isScheduled ? scheduledDate : null,
            scheduledTime: isScheduled ? scheduledTime : null
        };

        if (editingOrderId) {
            await db.collection(`${basePath}/delivery_orders`).doc(editingOrderId).update(pedidoDados);
        } else {
            pedidoDados.status = 'pendente';
            pedidoDados.origin = deliveryMethod === 'retirada' || deliveryMethod === 'local' ? 'PDV / Balcão' : 'Delivery PDV';
            pedidoDados.createdAt = dataAtual;
            
            const counterRef = db.doc(`${basePath}/delivery_settings/order_counter`);
            const newSeq = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const currentNumber = counterDoc.exists ? (counterDoc.data().lastNumber || 0) + 1 : 1;
                transaction.set(counterRef, { lastNumber: currentNumber }, { merge: true });
                return currentNumber;
            });

            const orderNumberFormatted = String(newSeq).padStart(4, '0');
            pedidoDados.orderSeq = newSeq;
            pedidoDados.orderNumber = orderNumberFormatted;
            
            const docRef = await db.collection(`${basePath}/delivery_orders`).add(pedidoDados);
            if (!isScheduled) imprimirPedido({ id: docRef.id, ...pedidoDados }, 'TODOS');

            if (telefoneFinalizado) {
                const dataAgendadaBr = isScheduled && scheduledDate ? scheduledDate.split('-').reverse().join('/') : '';
                const strTipoEntrega = deliveryMethod === 'entrega' ? 'Entrega' : (deliveryMethod === 'local' ? 'Consumo no Local' : 'Retirar no Balcão');
                let resumoWa = `Olá *${manualOrder.customerName.trim().split(' ')[0]}*! `;
                resumoWa += isScheduled
                    ? `O seu pedido foi *AGENDADO* com sucesso para o dia *${dataAgendadaBr}* às *${scheduledTime}* (${strTipoEntrega}). 📅\n\n`
                    : `O seu pedido foi recebido com sucesso e ficou para *${strTipoEntrega}*.\n\n`;
                resumoWa += `🛒 *RESUMO DO PEDIDO #${orderNumberFormatted}*\n\n*Itens:*\n${itemsFormattedText}\n\n`;
                if (observacaoFinal) resumoWa += `*Observações:*\n${observacaoFinal}\n\n`;
                resumoWa += `*Total:* ${formatMoney(finalTotal)}\n*Forma de Pagamento:* ${manualOrder.paymentMethod}\n\n`;
                resumoWa += isScheduled
                    ? `O seu pedido está confirmado. Iniciaremos o preparo próximo ao horário agendado! ⏳`
                    : `O seu pedido está na fila. Avisaremos assim que for para a cozinha! 👨‍🍳`;
                dispararMensagemWhatsApp(user.uid, telefoneFinalizado, resumoWa);
            }

            const customersRef = db.collection(`${basePath}/delivery_customers`);
            let idExistente = null, currentData = null;
            const checkNum = formatarTelefone(telefoneFinalizado).replace(/\D/g, "");
            
            if (checkNum.length >= 8) {
                const snap = await customersRef.get();
                snap.forEach(d => {
                    if (!idExistente) {
                        const dbNum = d.data().phone ? String(d.data().phone).replace(/\D/g, "") : "";
                        if (dbNum && (dbNum === checkNum || dbNum.endsWith(checkNum) || checkNum.endsWith(dbNum))) {
                            idExistente = d.id; currentData = d.data();
                        } else if (d.data().name === manualOrder.customerName) {
                            idExistente = d.id; currentData = d.data();
                        }
                    }
                });
            }

            const novoEnderecoObj = {
                rua: manualOrder.address || '',
                numero: manualOrder.addressNumber || '',
                complemento: manualOrder.addressComplement || '',
                bairro: manualOrder.neighborhood || ''
            };

            if (idExistente) {
                let enderecosSalvos = Array.isArray(currentData.savedAddresses) ? [...currentData.savedAddresses] : [];
                if (deliveryMethod === 'entrega' && novoEnderecoObj.rua) {
                    const idx = enderecosSalvos.findIndex(e => e.rua === novoEnderecoObj.rua && e.numero === novoEnderecoObj.numero);
                    if (idx > -1) enderecosSalvos[idx] = novoEnderecoObj;
                    else enderecosSalvos.unshift(novoEnderecoObj);
                }

                await customersRef.doc(idExistente).update({
                    address: (deliveryMethod === 'entrega' && fullAddress) ? fullAddress : currentData.address, 
                    addressComplement: (deliveryMethod === 'entrega' && manualOrder.addressComplement) ? manualOrder.addressComplement : (currentData.addressComplement || ''),
                    neighborhood: (deliveryMethod === 'entrega' && manualOrder.neighborhood) ? manualOrder.neighborhood : (currentData.neighborhood || ''),
                    phone: telefoneFinalizado || currentData.phone || '', 
                    lastOrderDate: dataAtual, 
                    totalOrders: firebase.firestore.FieldValue.increment(1), 
                    totalSpent: firebase.firestore.FieldValue.increment(finalTotal),
                    savedAddresses: enderecosSalvos
                });
            } else {
                const enderecosIniciais = (deliveryMethod === 'entrega' && novoEnderecoObj.rua) ? [novoEnderecoObj] : [];
                await customersRef.add({
                    name: manualOrder.customerName, 
                    phone: telefoneFinalizado || '', 
                    address: (deliveryMethod === 'entrega' && fullAddress) ? fullAddress : '', 
                    addressComplement: (deliveryMethod === 'entrega' && manualOrder.addressComplement) ? manualOrder.addressComplement : '',
                    neighborhood: (deliveryMethod === 'entrega' && manualOrder.neighborhood) ? manualOrder.neighborhood : '',
                    createdAt: dataAtual, 
                    lastOrderDate: dataAtual, 
                    totalOrders: 1, 
                    totalSpent: finalTotal,
                    savedAddresses: enderecosIniciais
                });
            }
        }
        setIsManualModalOpen(false);
        setEditingOrderId(null);
    };

    const renderCard = (order) => {
        const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isRetirada = order.ifoodOrderType === 'TAKEOUT' || order.ifoodOrderType === 'DINE_IN' || (order.address && (order.address.includes('Retirada') || order.address.includes('Pra Retirar') || order.address.includes('Balcão') || order.address.includes('LOCAL') || order.address.includes('Local') || order.address.includes('Na Mesa') || order.address.includes('VIAGEM')));
        const isConsumirLocal = order.ifoodOrderType === 'DINE_IN' || order.address?.includes('LOCAL') || order.address?.includes('Local') || order.address?.includes('Na Mesa') || order.observation?.includes('CONSUMIR NO LOCAL');
        
        const isIfood = order.origin === 'IFOOD';
        const is99Food = order.origin === '99FOOD';
        const aguardandoMotoSobDemanda = order.ifoodSobDemandaStatus === 'SOLICITADO' && order.status === 'preparo';
        const numeroCurto = order.orderNumber ? order.orderNumber : order.id.substring(0, 5).toUpperCase();

        const cardBorderClass = isIfood
            ? 'border-red-200 ring-1 ring-red-100'
            : is99Food
                ? 'border-amber-300 ring-1 ring-amber-100'
                : 'border-slate-200';

        return (
            <div key={order.id} className={`bg-white p-4 rounded-xl border ${cardBorderClass} shadow-sm flex flex-col gap-3 relative group transition-all hover:shadow-md`}>
                <div className="flex justify-end gap-1.5 mb-2 lg:mb-0 lg:absolute lg:top-2 lg:right-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity z-10 lg:bg-white/95 lg:p-1 lg:rounded-xl lg:shadow-sm lg:border lg:border-slate-200">
                    {order.status !== 'pendente' && (
                        <button onClick={() => revertOrderStatus(order)} className="text-slate-500 hover:text-amber-500 bg-slate-100 lg:bg-white p-2 lg:p-1.5 rounded-lg" title="Voltar"><Icon name="chevron-left" size={14} /></button>
                    )}
                    <button onClick={() => abrirModalEdicao(order)} className="text-slate-500 hover:text-blue-500 bg-slate-100 lg:bg-white p-2 lg:p-1.5 rounded-lg" title="Editar Pedido"><Icon name="edit-2" size={14} /></button>
                    <button onClick={() => setComandaModalOrder(order)} className="text-slate-500 hover:text-amber-600 bg-slate-100 lg:bg-white p-2 lg:p-1.5 rounded-lg" title="Visualizar Comanda"><Icon name="eye" size={14} /></button>
                    <button onClick={() => imprimirPedido(order, 'padrao')} className="text-slate-500 hover:text-emerald-500 bg-slate-100 lg:bg-white p-2 lg:p-1.5 rounded-lg" title="Via Caixa"><Icon name="printer" size={14} /></button>
                    <button onClick={() => imprimirPedido(order, 'producao')} className="text-slate-500 hover:text-orange-500 bg-slate-100 lg:bg-white p-2 lg:p-1.5 rounded-lg" title="Via Cozinha"><Icon name="file-text" size={14} /></button>
                    <button onClick={() => deleteOrder(order)} className="text-red-400 hover:text-red-600 bg-slate-100 lg:bg-white p-2 lg:p-1.5 rounded-lg" title="Cancelar Pedido"><Icon name="x" size={14} /></button>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div className="pr-2">
                        <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">
                            <span className="text-emerald-500 mr-1">#{numeroCurto}</span>{order.customerName}
                        </h4>
                        {is99Food && order.ifoodOrderId && (
                            <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">
                                ID: {order.ifoodOrderId} | Index: #{order.ifoodDisplayId || '1'}
                            </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                isIfood ? 'bg-red-500 text-white' : is99Food ? 'bg-amber-400 text-slate-900' : 'text-slate-400 bg-slate-100'
                            }`}>
                                {order.origin}
                            </span>
                            {isIfood && (
                                <span className="text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">
                                    {order.ifoodOrderType === 'TAKEOUT' ? '🛍️ Para Retirar' : (order.ifoodOrderType === 'DINE_IN' ? '🍽️ Consumo Local' : (order.ifoodDeliveredBy === 'IFOOD' ? '🛵 Entregador iFood' : '🛵 Entrega Própria'))}
                                </span>
                            )}
                            {is99Food && (
                                <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                                    {order.ifoodOrderType === 'TAKEOUT' ? '🛍️ Para Retirar' : (order.ifoodDeliveredBy === '99FOOD' ? '🛵 Entregador 99Food' : '🛵 Entrega Própria')}
                                </span>
                            )}
                            {is99Food && order.ifoodPickupCode && (
                                <span className="text-[9px] font-black uppercase bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded">
                                    🔐 Cód: {order.ifoodPickupCode}
                                </span>
                            )}
                            {order.ifoodPatchedAt && (
                                <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                                    ✏️ Alterado
                                </span>
                            )}
                        </div>
                    </div>
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-black">{timeStr}</span>
                </div>
                
                {order.isScheduled && (
                    <div className="bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-center text-purple-800 flex items-center justify-center gap-1.5">
                        <Icon name="calendar" size={14} /> Agendado: {order.scheduledDate?.split('-').reverse().join('/')} às {order.scheduledTime}
                    </div>
                )}

                {order.origin === 'TOTEM' && (
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-center border ${isConsumirLocal ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-indigo-100 text-indigo-800 border-indigo-300'}`}>
                        {isConsumirLocal ? '🍽️ Consumir no Local' : '🛍️ Para Viagem'}
                    </div>
                )}
                
                <div className="text-sm font-bold text-slate-600 whitespace-pre-wrap leading-tight">{order.items}</div>
                
                {order.address && (
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] font-bold text-slate-500 flex items-start gap-1">
                        <Icon name={isRetirada ? (isConsumirLocal ? "coffee" : "shopping-bag") : "map-pin"} size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
                        <div className="flex flex-col">
                            <span className={isRetirada ? "text-indigo-600" : ""}>{order.address}</span>
                            {order.customerPhone && <span className="text-[10px] font-bold text-slate-400 mt-0.5">📞 {order.customerPhone}</span>}
                            {order.customerDocument && <span className="text-[10px] font-black text-slate-700 mt-0.5">🧾 CPF/CNPJ na Nota: {order.customerDocument}</span>}
                            {order.estimatedTime && !isRetirada && !order.isScheduled && (<span className="text-[9px] font-black text-emerald-600 uppercase mt-0.5 flex items-center gap-1"><Icon name="clock" size={10} /> {order.estimatedTime} min</span>)}
                        </div>
                    </div>
                )}
                
                {order.observation && (<div className="bg-amber-50 p-2 rounded-lg border border-amber-100 text-[10px] font-bold text-amber-800 whitespace-pre-wrap">{order.observation}</div>)}

                {order.ifoodDispute && (
                    <div className={`p-2.5 rounded-xl border-2 space-y-2 ${order.ifoodDispute.status === 'PENDING' ? 'bg-red-50 border-red-400' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase ${order.ifoodDispute.status === 'PENDING' ? 'text-red-700 animate-pulse' : 'text-slate-700'}`}>
                                ⚖️ Negociação iFood ({order.ifoodDispute.handshakeType})
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                order.ifoodDispute.status === 'PENDING' ? 'bg-red-500 text-white' :
                                order.ifoodDispute.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                                order.ifoodDispute.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {order.ifoodDispute.status}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600">{order.ifoodDispute.message}</p>
                        {order.ifoodDispute.expiresAt && order.ifoodDispute.status === 'PENDING' && (
                            <p className="text-[9px] font-black text-red-600">
                                ⏰ Expira às: {new Date(order.ifoodDispute.expiresAt).toLocaleTimeString('pt-BR')}
                            </p>
                        )}
                        {order.ifoodDispute.status === 'PENDING' && (
                            <button
                                onClick={() => abrirModalDisputaIfood(order)}
                                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm"
                            >
                                ⚖️ Abrir Central de Negociação (Responder)
                            </button>
                        )}
                    </div>
                )}

                {Array.isArray(order.ifoodPrescriptions) && order.ifoodPrescriptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {order.ifoodPrescriptions.map((prescId, idx) => (
                            <button key={idx} onClick={() => handleBaixarPrescricaoIfood(order, prescId)} className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1">
                                📄 Baixar Prescrição Médica #{idx + 1}
                            </button>
                        ))}
                    </div>
                )}

                {isIfood && order.ifoodDeliveredBy === 'IFOOD' && order.status === 'entrega' && (
                    <button onClick={() => handleRastrearEntregadorIfood(order)} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase">
                        📍 Rastrear Entregador iFood
                    </button>
                )}

                {aguardandoMotoSobDemanda && (
                    <div className="bg-amber-100 border border-amber-300 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-amber-900 animate-pulse">
                                {order.motoqueiro || '⏳ Aguardando Motofrete iFood...'}
                            </span>
                            <button onClick={() => cancelarChamadaMotoIfood(order)} className="text-[9px] font-black uppercase text-red-600 hover:underline">
                                Cancelar Moto
                            </button>
                        </div>
                        <p className="text-[9px] font-bold text-amber-700 leading-tight">
                            Quando o entregador chegar, clique em <b>Validar Coleta</b> para liberar a saída!
                        </p>
                    </div>
                )}

                {(isIfood || is99Food || aguardandoMotoSobDemanda) && order.status !== 'pendente' && order.status !== 'concluido' && (
                    <div className="flex gap-1.5">
                        <button onClick={() => handleValidarCodigoIfood(order, 'pickup')} className={`flex-1 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase border transition-all ${aguardandoMotoSobDemanda ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                            🔐 Validar Coleta
                        </button>
                        <button onClick={() => handleValidarCodigoIfood(order, 'delivery')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 rounded-lg text-[9px] font-black uppercase border border-slate-200">
                            ✅ Validar Entrega
                        </button>
                    </div>
                )}
                
                {order.motoqueiro && order.status === 'entrega' && (
                    <div className="bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded-md text-[9px] font-black text-indigo-700 uppercase flex items-center gap-1.5">
                        <Icon name="user" size={10} /> Entregador: {order.motoqueiro}
                    </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{order.paymentMethod}</span>
                        <span className="font-black text-emerald-600">{formatMoney(order.total)}</span>
                    </div>
                    {order.status === 'pendente' && (
                        <button onClick={() => updateOrderStatus(order, 'preparo')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[10px] flex items-center gap-1 shadow-md">
                            <Icon name="check" size={12} /> Aceitar
                        </button>
                    )}
                    {order.status === 'preparo' && (
                        aguardandoMotoSobDemanda ? (
                            <button onClick={() => handleValidarCodigoIfood(order, 'pickup')} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[10px] flex items-center gap-1 shadow-md">
                                🔐 Coletar e Dar Saída
                            </button>
                        ) : (
                            <button onClick={() => { 
                                if (isRetirada) {
                                    if (is99Food) handleValidarCodigoIfood(order, 'pickup');
                                    else updateOrderStatus(order, 'entrega');
                                } else if ((isIfood && order.ifoodDeliveredBy === 'IFOOD') || (is99Food && order.ifoodDeliveredBy === '99FOOD')) {
                                    handleValidarCodigoIfood(order, 'pickup');
                                } else {
                                    setPedidoParaDespachar(order);
                                    setIsMotoqueiroModalOpen(true);
                                }
                            }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[10px] flex items-center gap-1 shadow-md">
                                <Icon name={isRetirada ? (isConsumirLocal ? "coffee" : "shopping-bag") : "truck"} size={12} /> 
                                {isRetirada ? 'Pronto' : (
                                    isIfood && order.ifoodDeliveredBy === 'IFOOD' ? '🔐 Validar Coleta' :
                                    is99Food && order.ifoodDeliveredBy === '99FOOD' ? '✅ Avisar Pronto (99)' :
                                    'Despachar'
                                )}
                            </button>
                        )
                    )}
                    {order.status === 'entrega' && (
                        <button onClick={() => updateOrderStatus(order, 'concluido')} className="bg-slate-900 hover:bg-black text-emerald-400 px-3 py-1.5 rounded-lg font-black uppercase text-[10px] flex items-center gap-1 shadow-md" title="Concluir no sistema">
                            <Icon name="check-circle" size={12} /> Finalizar
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-10 text-center font-black text-emerald-500 uppercase">Sincronizando Pedidos...</div>;
    const pendentes = orders.filter(o => o.status === 'pendente');
    const emPreparo = orders.filter(o => o.status === 'preparo');
    const emEntrega = orders.filter(o => o.status === 'entrega');
    const concluidos = orders.filter(o => o.status === 'concluido' && new Date(o.createdAt).toDateString() === new Date().toDateString());

    const filteredCatalogForPDV = catalogItems.filter(item => {
        const matchesCategory = !selectedCategoryFilter || item.category === selectedCategoryFilter;
        const matchesSearch = !productSearchQuery || item.name.toLowerCase().includes(productSearchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="w-full mx-auto mt-2 pb-6 px-4 fade-in h-[calc(100vh-80px)] flex flex-col relative box-border">
            {waConnectionError && (
                <div className="bg-red-500 text-white px-4 py-3 rounded-xl mb-4 shadow-md flex items-center justify-between flex-shrink-0 border border-red-600">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg"><Icon name="alert-triangle" size={18} /></div>
                        <div className="flex flex-col">
                            <span className="font-black uppercase text-[10px] text-red-100">Aviso do Sistema (WhatsApp)</span>
                            <span className="text-[12px] font-bold">{waErrorMsg}</span>
                        </div>
                    </div>
                    <button onClick={() => setWaConnectionError(false)} className="text-white/70 hover:text-white p-2"><Icon name="x" size={16} /></button>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Icon name="grid" size={20} className="text-emerald-500" /> Kanban de Pedidos</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Atualização em Tempo Real</p>
                </div>
                <div className="flex flex-nowrap md:flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button onClick={handleZerarContadorPedidos} className="flex-shrink-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] border border-slate-200"><Icon name="rotate-ccw" size={14} /> Zerar Nº</button>
                    <button onClick={() => setIsSoundModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] border border-slate-200"><Icon name="volume-2" size={14} /> Aviso Sonoro</button>
                    <button onClick={() => setIsTimeModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] border border-amber-200"><Icon name="clock" size={14} /> Ajustar Tempos</button>
                    <button onClick={() => setIsConfigMsgsModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] border border-slate-200"><Icon name="edit-3" size={14} /> Configurar Textos</button>
                    
                    <button onClick={handleForcarPollingEventos} disabled={forcingPoll} className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl font-black uppercase text-[11px] border border-red-200" title="Forçar busca imediata de eventos iFood">
                        <Icon name="refresh-cw" size={13} className={forcingPoll ? "animate-spin" : ""} /> {forcingPoll ? 'Buscando...' : 'Sync iFood'}
                    </button>

                    <button 
                        onClick={() => { setIsIfoodModalOpen(true); carregarPanoramaIfood(); }} 
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] transition-all duration-300 ${
                            ifoodStoreStatus?.state === 'OK' 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)] border-2 border-emerald-400 scale-105' 
                                : ifoodStoreStatus?.state === 'CLOSED'
                                ? 'bg-slate-700 hover:bg-slate-800 text-slate-300 border border-slate-600'
                                : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                        }`}
                    >
                        {ifoodStoreStatus?.state === 'OK' ? (
                            <>
                                <span className="relative flex h-4 w-4 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                                </span>
                                <Icon name="shopping-bag" size={16} /> 
                                IFOOD: ABERTA
                            </>
                        ) : ifoodStoreStatus?.state === 'CLOSED' ? (
                            <>
                                <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                                <Icon name="shopping-bag" size={14} /> 
                                IFOOD: FECHADA
                            </>
                        ) : (
                            <>
                                <span className="w-3 h-3 rounded-full bg-white animate-pulse mr-1"></span>
                                <Icon name="shopping-bag" size={14} /> 
                                iFood
                            </>
                        )}
                    </button>

                    <button onClick={() => setIs99FoodModalOpen(true)} className="flex-shrink-0 flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2.5 rounded-xl font-black uppercase text-[11px] shadow-md transition-all">
                        <Icon name="shopping-bag" size={14} /> 99Food
                    </button>

                    <button onClick={conectarWhatsApp} className="flex-shrink-0 flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[11px] shadow-md"><Icon name="message-circle" size={14} /> Conectar WhatsApp</button>
                    <button onClick={abrirModalManual} className="flex-shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[11px] shadow-md"><Icon name="plus" size={14} /> {isManualModalMinimized ? 'Restaurar Pedido' : 'Lançar Pedido'}</button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto lg:overflow-hidden flex lg:grid lg:grid-cols-4 gap-4 pb-2 w-full h-full min-h-0">
                <div className="w-[85vw] sm:w-[320px] lg:w-auto flex-shrink-0 lg:flex-shrink flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-red-50 p-3 border-b border-red-100 flex justify-between items-center">
                        <h3 className="font-black text-red-600 uppercase flex items-center gap-1.5 text-xs"><Icon name="inbox" size={14} /> Novos (Pendentes)</h3>
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{pendentes.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">{pendentes.length === 0 && <div className="text-center text-slate-400 text-[10px] font-black uppercase py-6 opacity-50">Nenhum pedido novo</div>}{pendentes.map(renderCard)}</div>
                </div>
                <div className="w-[85vw] sm:w-[320px] lg:w-auto flex-shrink-0 lg:flex-shrink flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-amber-50 p-3 border-b border-amber-100 flex justify-between items-center">
                        <h3 className="font-black text-amber-600 uppercase flex items-center gap-1.5 text-xs"><Icon name="clock" size={14} /> Em Preparo</h3>
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{emPreparo.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">{emPreparo.length === 0 && <div className="text-center text-slate-400 text-[10px] font-black uppercase py-6 opacity-50">Cozinha livre</div>}{emPreparo.map(renderCard)}</div>
                </div>
                <div className="w-[85vw] sm:w-[320px] lg:w-auto flex-shrink-0 lg:flex-shrink flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center">
                        <h3 className="font-black text-indigo-600 uppercase flex items-center gap-1.5 text-xs"><Icon name="truck" size={14} /> Em Rota / Retirar</h3>
                        <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{emEntrega.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">{emEntrega.length === 0 && <div className="text-center text-slate-400 text-[10px] font-black uppercase py-6 opacity-50">Nenhum pedido na rua</div>}{emEntrega.map(renderCard)}</div>
                </div>
                <div className="w-[85vw] sm:w-[320px] lg:w-auto flex-shrink-0 lg:flex-shrink flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center">
                        <h3 className="font-black text-emerald-600 uppercase flex items-center gap-1.5 text-xs"><Icon name="check-circle" size={14} /> Concluídos Hoje</h3>
                        <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{concluidos.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 opacity-70">{concluidos.length === 0 && <div className="text-center text-slate-400 text-[10px] font-black uppercase py-6 opacity-50">Nenhuma finalização</div>}{concluidos.map(renderCard)}</div>
                </div>
            </div>

            {/* MODAL CONFIGURAÇÃO 99FOOD */}
            {is99FoodModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border-t-4 border-amber-500">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                                <Icon name="settings" size={16} className="text-amber-500" /> Integração 99Food (Pré-Produção & Produção)
                            </h3>
                            <button onClick={() => setIs99FoodModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-[10px] font-bold border border-amber-200">
                                Configure o APPShopID e o Token da loja. Preencha também o App ID e App Secret do aplicativo para ativar a renovação automática de Token (OAuth).
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">APPShopID (ID da Loja) *</label>
                                <input 
                                    type="text" 
                                    value={food99Creds.appShopId} 
                                    onChange={e => setFood99Creds({...food99Creds, appShopId: e.target.value})} 
                                    className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50 focus:border-amber-500 outline-none" 
                                    placeholder="Ex: 5764614731231660400" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">App ID (Auto-Refresh)</label>
                                    <input 
                                        type="text" 
                                        value={food99Creds.appId || ''} 
                                        onChange={e => setFood99Creds({...food99Creds, appId: e.target.value})} 
                                        className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50 focus:border-amber-500 outline-none" 
                                        placeholder="Ex: 5764607736531126429" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">App Secret</label>
                                    <input 
                                        type="password" 
                                        value={food99Creds.appSecret || ''} 
                                        onChange={e => setFood99Creds({...food99Creds, appSecret: e.target.value})} 
                                        className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50 focus:border-amber-500 outline-none" 
                                        placeholder="Chave secreta..." 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Token de Acesso (auth_token) *</label>
                                <textarea 
                                    rows={3} 
                                    value={food99Creds.token} 
                                    onChange={e => setFood99Creds({...food99Creds, token: e.target.value})} 
                                    className="w-full p-2.5 border rounded-xl text-xs font-mono bg-slate-50 focus:border-amber-500 outline-none" 
                                    placeholder="Cole o token aqui..." 
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIs99FoodModalOpen(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase flex-1 transition-all">Cancelar</button>
                                <button onClick={handleSalvar99Food} disabled={saving99Food} className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase flex-1 shadow-md transition-all">
                                    {saving99Food ? 'Salvando...' : 'Salvar Chaves'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AJUSTAR TEMPOS */}
            {isTimeModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/50 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border-t-4 border-amber-500">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2"><Icon name="clock" size={16} className="text-amber-500" /> Ajustar Tempos</h3>
                            <button onClick={() => setIsTimeModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Tempo Médio de Preparo (Minutos)</label>
                                <input type="number" value={tempoPreparo} onChange={e => setTempoPreparo(Number(e.target.value))} className="w-full p-3 border rounded-xl font-black text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Tempo Extra de Entrega (Minutos)</label>
                                <input type="number" value={tempoExtraEntrega} onChange={e => setTempoExtraEntrega(Number(e.target.value))} className="w-full p-3 border rounded-xl font-black text-sm" />
                            </div>
                            <button onClick={() => { handleUpdateTimes(tempoPreparo, tempoExtraEntrega); setIsTimeModalOpen(false); }} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black uppercase text-xs shadow-md">Salvar Tempos</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE AVISO SONORO */}
            {isSoundModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/50 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Escolher Aviso Sonoro</h3>
                            <button onClick={() => setIsSoundModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="space-y-2 mb-4">
                            {[
                                { id: 'ifood', label: 'Toque Clássico iFood' },
                                { id: 'duplo', label: 'Bipe Duplo Rápido' },
                                { id: 'campainha', label: 'Campainha de Balcão' },
                                { id: 'alerta', label: 'Sirene de Alerta' }
                            ].map(s => (
                                <button key={s.id} onClick={() => { setSomPedido(s.id); localStorage.setItem('tribo_som_pedido', s.id); playSound(s.id); }} className={`w-full p-3 rounded-xl border text-left font-black text-xs uppercase flex justify-between items-center ${somPedido === s.id ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                    <span>{s.label}</span>
                                    <Icon name="volume-2" size={14} />
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setIsSoundModalOpen(false)} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase">Fechar</button>
                    </div>
                </div>
            )}

            {/* MODAL WHATSAPP QR CODE */}
            {isWhatsAppModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border-t-4 border-blue-500">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Conexão WhatsApp</h3>
                            <button onClick={() => setIsWhatsAppModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <p className="text-xs font-bold text-slate-600 mb-4">{waMessage}</p>
                        {qrCodeString && (
                            <div className="flex justify-center p-4 bg-white border rounded-xl mb-4">
                                <QRCodeCanvas value={qrCodeString} size={200} />
                            </div>
                        )}
                        <div className="flex gap-2">
                            {isWaConnected && (
                                <button onClick={desconectarWhatsApp} disabled={waLoading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase">Desconectar</button>
                            )}
                            <button onClick={() => setIsWhatsAppModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIGURAR TEXTOS WHATSAPP */}
            {isConfigMsgsModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Mensagens Automáticas (WhatsApp)</h3>
                            <button onClick={() => setIsConfigMsgsModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-black uppercase text-[10px] text-slate-500">Pedido Aceito / Em Preparo (Entrega)</label>
                                <textarea rows={2} value={msgTemplates.msgPreparo || ''} onChange={e => setMsgTemplates({...msgTemplates, msgPreparo: e.target.value})} className="w-full p-2.5 border rounded-xl font-bold mt-1" />
                            </div>
                            <div>
                                <label className="font-black uppercase text-[10px] text-slate-500">Saiu para Entrega</label>
                                <textarea rows={2} value={msgTemplates.msgEntrega || ''} onChange={e => setMsgTemplates({...msgTemplates, msgEntrega: e.target.value})} className="w-full p-2.5 border rounded-xl font-bold mt-1" />
                            </div>
                            <div>
                                <label className="font-black uppercase text-[10px] text-slate-500">Pedido Pronto para Retirada</label>
                                <textarea rows={2} value={msgTemplates.msgRetiradaPronto || ''} onChange={e => setMsgTemplates({...msgTemplates, msgRetiradaPronto: e.target.value})} className="w-full p-2.5 border rounded-xl font-bold mt-1" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setIsConfigMsgsModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-black uppercase">Cancelar</button>
                            <button onClick={handleSalvarMensagens} disabled={savingMsgs} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase">{savingMsgs ? 'Salvando...' : 'Salvar Textos'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CENTRAL DA LOJA IFOOD */}
            {isIfoodModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 border-t-4 border-red-500 max-h-[94vh] flex flex-col">
                        <div className="flex justify-between items-start border-b pb-3 mb-3 flex-shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Icon name="shopping-bag" size={18} className="text-red-500" />
                                    <h3 className="font-black text-sm uppercase text-slate-800">Central da Loja iFood (Módulo Merchant)</h3>
                                    {ifoodStoreStatus && (
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${ifoodStoreStatus.state === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {ifoodStoreStatus.state === 'OK' ? '🟢 Disponível (OK)' : `🔴 ${ifoodStoreStatus.state || 'Fechada'}`}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] font-bold text-slate-500">
                                    <span>🔑 <b>Client ID:</b> {ifoodCreds.clientId || 'Não configurado'}</span>
                                    <span>🕒 <b>Execução:</b> {lastSyncTime || new Date().toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                            <button onClick={() => setIsIfoodModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl mb-4 flex-shrink-0">
                            <button onClick={() => { setIfoodTab('lojas'); carregarPanoramaIfood(); }} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${ifoodTab === 'lojas' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>🏪 1. Info da Loja</button>
                            <button onClick={() => { setIfoodTab('status'); carregarPanoramaIfood(); }} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${ifoodTab === 'status' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>⏸️ 2. Interrupções</button>
                            <button onClick={() => { setIfoodTab('horarios'); carregarPanoramaIfood(); }} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${ifoodTab === 'horarios' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>🕒 3. Horários</button>
                            <button onClick={() => setIfoodTab('credenciais')} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${ifoodTab === 'credenciais' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>🔑 Chaves API</button>
                        </div>

                        {ifoodTab === 'lojas' && (
                            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <div>
                                        <h4 className="font-black uppercase text-slate-800">Cenário 1: Informações e Disponibilidade</h4>
                                        <p className="text-[10px] font-bold text-slate-500">Consulta em tempo real aos endpoints GET /merchants, /merchants/&#123;id&#125; e /status</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={handleForcarPollingEventos} disabled={forcingPoll} className="px-3 py-2 bg-slate-800 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-1 shadow-sm">
                                            ⚡ {forcingPoll ? 'Buscando...' : 'Sync Eventos'}
                                        </button>
                                        <button onClick={carregarPanoramaIfood} disabled={loadingIfoodStatus} className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 shadow-sm">
                                            <Icon name="rotate-ccw" size={12} /> {loadingIfoodStatus ? 'Consultando...' : 'Consultar Loja'}
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                                    <span className="text-[10px] font-black uppercase text-red-600 block mb-2">1. Lojas Vinculadas (GET /merchants)</span>
                                    {ifoodMerchantsList.length === 0 ? (
                                        <p className="text-slate-400 font-bold text-[11px]">Nenhuma loja listada ou carregando...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {ifoodMerchantsList.map((m, idx) => (
                                                <div key={m.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-black text-slate-800">{m.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-500">Razão Social: {m.corporateName || 'N/A'}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">ID: {m.id}</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Vinculada</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                                    <span className="text-[10px] font-black uppercase text-red-600 block mb-2">2. Detalhes Completos da Loja (GET /merchants/&#123;id&#125;)</span>
                                    {ifoodMerchantDetails ? (
                                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                                            <div><span className="text-slate-400 font-bold block text-[9px] uppercase">Nome Fantasia</span><span className="font-black text-slate-800">{ifoodMerchantDetails.name}</span></div>
                                            <div><span className="text-slate-400 font-bold block text-[9px] uppercase">Razão Social</span><span className="font-black text-slate-800">{ifoodMerchantDetails.corporateName}</span></div>
                                            <div><span className="text-slate-400 font-bold block text-[9px] uppercase">Merchant ID</span><span className="font-mono font-bold text-slate-700">{ifoodMerchantDetails.id}</span></div>
                                            <div><span className="text-slate-400 font-bold block text-[9px] uppercase">Tipo / Segmento</span><span className="font-black text-slate-800">{ifoodMerchantDetails.type || 'RESTAURANT'}</span></div>
                                            {ifoodMerchantDetails.address && (
                                                <div className="col-span-2 pt-1 border-t border-slate-200 mt-1">
                                                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Endereço Cadastrado no iFood</span>
                                                    <span className="font-bold text-slate-700">
                                                        {ifoodMerchantDetails.address.streetName}, {ifoodMerchantDetails.address.streetNumber} - {ifoodMerchantDetails.address.neighborhood}, {ifoodMerchantDetails.address.city}/{ifoodMerchantDetails.address.state} (CEP: {ifoodMerchantDetails.address.postalCode})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 font-bold text-[11px]">Clique em "Consultar Loja" para carregar os detalhes.</p>
                                    )}
                                </div>

                                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                                    <span className="text-[10px] font-black uppercase text-red-600 block mb-2">3. Disponibilidade da Loja (GET /merchants/&#123;id&#125;/status)</span>
                                    {ifoodStatusList.map((st, i) => (
                                        <div key={i} className={`p-3 rounded-lg border mb-2 ${st?.state === 'OK' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-black uppercase text-slate-800">Operação: {st?.operation || 'delivery'}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${st?.state === 'OK' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                                    State: {st?.state || 'CLOSED'}
                                                </span>
                                            </div>
                                            {st?.message?.title && <p className="font-black text-slate-700 text-[11px]">{st.message.title} — {st.message.subtitle}</p>}
                                            {Array.isArray(st?.validations) && st.validations.length > 0 && (
                                                <div className="mt-2 space-y-1 border-t border-slate-200/60 pt-2">
                                                    <span className="text-[9px] font-black uppercase text-slate-500">Validações de Conectividade:</span>
                                                    {st.validations.map((v, vIdx) => (
                                                        <div key={vIdx} className="flex justify-between text-[10px] font-bold">
                                                            <span>• {v.id}: {v.message?.title || v.state}</span>
                                                            <span className={v.state === 'OK' ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>{v.state}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ifoodTab === 'status' && (
                            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-black text-xs uppercase text-slate-800">⏸️ Cadastrar Interrupção (POST /interruptions)</h5>
                                        <button onClick={carregarPanoramaIfood} className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1"><Icon name="rotate-ccw" size={12}/> Atualizar Lista</button>
                                    </div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Descrição / Motivo da Pausa</label>
                                    <input
                                        type="text"
                                        value={pausaCustomMotivo}
                                        onChange={e => setPausaCustomMotivo(e.target.value)}
                                        placeholder="Ex: Pausa operacional / Manutenção"
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold mb-3"
                                    />
                                    <p className="text-[10px] font-bold text-slate-500 mb-2">Clique na duração abaixo para cadastrar a pausa imediatamente no iFood:</p>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[10, 15, 30, 45, 60].map(mins => (
                                            <button key={mins} onClick={() => handlePausarLojaIfood(mins)} disabled={loadingIfoodStatus} className="py-2.5 bg-white hover:bg-red-500 hover:text-white border border-slate-200 rounded-xl font-black text-xs text-slate-700 shadow-sm transition-all">
                                                {mins} min
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="border border-amber-200 bg-amber-50 p-4 rounded-xl space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-amber-900">📋 Pausas Ativas na Loja (GET /interruptions)</span>
                                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-black">{ifoodInterruptions.length} ativa(s)</span>
                                    </div>

                                    {ifoodInterruptions.length === 0 ? (
                                        <p className="text-xs font-bold text-amber-700 py-3 text-center bg-white/60 rounded-lg border border-amber-200">
                                            Nenhuma interrupção ativa no momento.
                                        </p>
                                    ) : (
                                        ifoodInterruptions.map((intItem, i) => (
                                            <div key={intItem.id || i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-300 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-800">{intItem.description || 'Interrupção Programada'}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">ID: {intItem.id}</span>
                                                    <span className="text-[10px] font-bold text-amber-700 mt-0.5">
                                                        Início: {new Date(intItem.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Fim: {new Date(intItem.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <button onClick={() => handleRemoverPausaIfood(intItem.id)} disabled={loadingIfoodStatus} className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-sm">
                                                    🗑️ Remover Pausa
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {ifoodTab === 'horarios' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex flex-wrap justify-between items-center gap-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-black uppercase text-slate-600">GET & PUT /opening-hours</span>
                                    <div className="flex gap-1.5">
                                        <button type="button" onClick={handlePreencherCenario3Homologacao} className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[10px] font-black uppercase border border-amber-300">
                                            ⚡ Preencher Cenário 3 (Sáb e Dom)
                                        </button>
                                        <button type="button" onClick={carregarPanoramaIfood} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-700">
                                            🔄 Consultar Horários
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
                                    {ifoodHours.map((dia, idx) => (
                                        <div key={dia.dayOfWeek} className={`p-3 rounded-xl border ${dia.ativo ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={dia.ativo}
                                                        onChange={e => {
                                                            const copy = [...ifoodHours];
                                                            copy[idx].ativo = e.target.checked;
                                                            if (copy[idx].ativo && (!copy[idx].shifts || copy[idx].shifts.length === 0)) {
                                                                copy[idx].shifts = [{ start: '10:00', end: '19:00' }];
                                                            }
                                                            setIfoodHours(copy);
                                                        }}
                                                        className="w-4 h-4 accent-red-500 rounded"
                                                    />
                                                    <span className="text-xs font-black text-slate-800 uppercase">{dia.label}</span>
                                                </label>

                                                {dia.ativo ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const copy = [...ifoodHours];
                                                            copy[idx].shifts = [...(copy[idx].shifts || []), { start: '13:00', end: '16:00' }];
                                                            setIfoodHours(copy);
                                                        }}
                                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase"
                                                    >
                                                        + Adicionar Turno
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-slate-400">Fechado</span>
                                                )}
                                            </div>

                                            {dia.ativo && Array.isArray(dia.shifts) && (
                                                <div className="space-y-1.5 pl-6">
                                                    {dia.shifts.map((turno, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 w-14">Turno {sIdx + 1}:</span>
                                                            <input
                                                                type="time"
                                                                value={turno.start}
                                                                onChange={e => {
                                                                    const copy = [...ifoodHours];
                                                                    copy[idx].shifts[sIdx].start = e.target.value;
                                                                    setIfoodHours(copy);
                                                                }}
                                                                className="p-1.5 border rounded-lg text-xs font-bold"
                                                            />
                                                            <span className="text-[10px] font-black text-slate-400">ATÉ</span>
                                                            <input
                                                                type="time"
                                                                value={turno.end}
                                                                onChange={e => {
                                                                    const copy = [...ifoodHours];
                                                                    copy[idx].shifts[sIdx].end = e.target.value;
                                                                    setIfoodHours(copy);
                                                                }}
                                                                className="p-1.5 border rounded-lg text-xs font-bold"
                                                            />
                                                            {dia.shifts.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const copy = [...ifoodHours];
                                                                        copy[idx].shifts = copy[idx].shifts.filter((_, i) => i !== sIdx);
                                                                        setIfoodHours(copy);
                                                                    }}
                                                                    className="text-red-500 hover:text-red-700 p-1"
                                                                    title="Remover turno"
                                                                >
                                                                    <Icon name="trash-2" size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleSalvarHorariosIfood()} disabled={loadingIfoodStatus} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase shadow-md">
                                    {loadingIfoodStatus ? 'Salvando no iFood...' : 'Salvar Horários no iFood'}
                                </button>
                            </div>
                        )}

                        {ifoodTab === 'credenciais' && (
                            <div className="space-y-4">
                                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-[10px] font-bold uppercase border border-red-100">Chaves do Portal do Desenvolvedor iFood:</div>
                                <input type="text" value={ifoodCreds.clientId || ''} onChange={e => setIfoodCreds({...ifoodCreds, clientId: e.target.value.trim()})} className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="Client ID *" />
                                <input type="text" value={ifoodCreds.clientSecret || ''} onChange={e => setIfoodCreds({...ifoodCreds, clientSecret: e.target.value.trim()})} className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="Client Secret *" />
                                <input type="text" value={ifoodCreds.merchantId || ''} onChange={e => setIfoodCreds({...ifoodCreds, merchantId: e.target.value.trim()})} className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="Merchant ID *" />
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setIsIfoodModalOpen(false)} className="px-4 py-3 bg-slate-100 rounded-xl text-xs font-black uppercase flex-1">Fechar</button>
                                    <button onClick={handleSalvarIfood} disabled={savingIfood} className="px-4 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase flex-1">Salvar Chaves</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE SELEÇÃO DE MOTOQUEIRO / SOB DEMANDA */}
            {isMotoqueiroModalOpen && (
                <div className="modal-overlay z-[110] fixed inset-0 bg-black/50 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Despachar Pedido</h3>
                            <button onClick={() => setIsMotoqueiroModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Entregador da sua Equipe</label>
                        <select value={motoqueiroSelecionado} onChange={e => setMotoqueiroSelecionado(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-xs mb-4 bg-slate-50">
                            <option value="">Selecione um motoboy...</option>
                            {listaMotoqueiros.map((m, i) => <option key={i} value={m.nome}>{m.nome}</option>)}
                        </select>
                        {pedidoParaDespachar && !(pedidoParaDespachar.origin === 'IFOOD' && pedidoParaDespachar.ifoodDeliveredBy === 'IFOOD') && (
                            <div className="mb-5 pt-3 border-t border-slate-100">
                                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 text-center">Ou solicite entregador parceiro</span>
                                <button type="button" onClick={() => { setIsMotoqueiroModalOpen(false); abrirModalSobDemanda(pedidoParaDespachar); }} className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2">
                                    🛵 Pedir Moto do iFood (Sob Demanda)
                                </button>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsMotoqueiroModalOpen(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase rounded-xl flex-1">Cancelar</button>
                            <button onClick={confirmarDespacho} className="px-4 py-2.5 bg-indigo-500 text-white text-xs font-black uppercase rounded-xl flex-1 shadow-md">Despachar Próprio</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE COTAÇÃO IFOOD SOB DEMANDA */}
            {isSobDemandaModalOpen && pedidoSobDemanda && (
                <div className="modal-overlay z-[130] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border-t-4 border-red-500">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">🛵 iFood Sob Demanda</h3>
                            <button onClick={() => setIsSobDemandaModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs">
                            <p className="font-black text-slate-800">{pedidoSobDemanda.customerName}</p>
                            <p className="font-bold text-slate-500 mt-0.5">{pedidoSobDemanda.address}</p>
                        </div>
                        {loadingSobDemanda ? (
                            <div className="py-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-3"></div>
                                <p className="text-xs font-black uppercase text-slate-500">Consultando taxa no iFood...</p>
                            </div>
                        ) : cotacaoSobDemanda?.available ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-5 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-emerald-800">Taxa da Entrega iFood:</span>
                                    <span className="text-lg font-black text-emerald-600">{formatMoney(cotacaoSobDemanda.deliveryFee)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-emerald-700">
                                    <span>Tempo estimado:</span>
                                    <span>{cotacaoSobDemanda.estimatedTimeMin} a {cotacaoSobDemanda.estimatedTimeMax} min</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-5 text-xs font-bold text-red-600">
                                ⚠️ {cotacaoSobDemanda?.error || 'Entregador Sob Demanda indisponível para esta rota.'}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setIsSobDemandaModalOpen(false)} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase flex-1">Fechar</button>
                            {cotacaoSobDemanda?.available && (
                                <button onClick={confirmarPedidoMotoIfood} disabled={loadingSobDemanda} className="px-4 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow-md flex-1">Confirmar e Aguardar Moto</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CANCELAMENTO HOMOLOGADO (IFOOD & 99FOOD) */}
            {isIfoodCancelModalOpen && orderToCancelIfood && (
                <div className="modal-overlay z-[130] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border-t-4 border-red-500">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                                <Icon name="alert-triangle" size={16} className="text-red-500" /> Cancelar Pedido {orderToCancelIfood.origin}
                            </h3>
                            <button onClick={() => setIsIfoodCancelModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <p className="text-xs font-bold text-slate-600 mb-3">Selecione o motivo de cancelamento para <span className="text-red-600 font-black">{orderToCancelIfood.customerName}</span>:</p>
                        {loadingCancelReasons ? (
                            <div className="py-8 text-center text-xs font-black uppercase text-slate-400">Buscando motivos na API...</div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto mb-5 pr-1">
                                {ifoodCancelReasons.map((motivo, idx) => {
                                    const code = String(motivo.cancelCodeId || motivo.code);
                                    return (
                                        <label key={idx} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer ${selectedCancelCode === code ? 'bg-red-50 border-red-400' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <input type="radio" name="ifoodCancelReason" value={code} checked={selectedCancelCode === code} onChange={() => setSelectedCancelCode(code)} className="mt-0.5 accent-red-500" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800">{motivo.description}</span>
                                                <span className="text-[10px] font-bold text-slate-400">Código: {code}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setIsIfoodCancelModalOpen(false)} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase flex-1">Voltar</button>
                            <button onClick={handleConfirmarCancelamentoIfood} disabled={loadingCancelReasons || cancellingIfoodOrder || !selectedCancelCode} className="px-4 py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow-md flex-1">
                                {cancellingIfoodOrder ? 'Cancelando...' : 'Confirmar Cancelamento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CENTRAL DE NEGOCIAÇÃO DE DISPUTAS (HANDSHAKE PLATFORM IFOOD) */}
            {disputeModalOrder && disputeModalOrder.ifoodDispute && (
                <div className="modal-overlay z-[140] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 border-t-4 border-red-600 max-h-[92vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <div>
                                <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                                    ⚖️ Negociação de Pedido (Handshake iFood)
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    Tipo: {disputeModalOrder.ifoodDispute.handshakeType} | Ação: {disputeModalOrder.ifoodDispute.action}
                                </p>
                            </div>
                            <button onClick={() => setDisputeModalOrder(null)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <p className="font-black text-slate-800">{disputeModalOrder.customerName}</p>
                                <p className="font-bold text-slate-600 mt-1">{disputeModalOrder.ifoodDispute.message}</p>
                                {disputeModalOrder.ifoodDispute.expiresAt && (
                                    <p className="text-[10px] font-black text-red-600 mt-1">
                                        ⏰ Responder até: {new Date(disputeModalOrder.ifoodDispute.expiresAt).toLocaleTimeString('pt-BR')}
                                    </p>
                                )}
                            </div>

                            {(disputeModalOrder.ifoodDispute.garnishItems?.length > 0 || disputeModalOrder.ifoodDispute.items?.length > 0) && (
                                <div className="border border-amber-200 bg-amber-50 p-3 rounded-xl space-y-1.5">
                                    <span className="text-[10px] font-black uppercase text-amber-900 block">📦 Itens Reclamados pelo Cliente:</span>
                                    {[...(disputeModalOrder.ifoodDispute.items || []), ...(disputeModalOrder.ifoodDispute.garnishItems || [])].map((it, idx) => (
                                        <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 flex justify-between items-center text-[11px]">
                                            <div>
                                                <span className="font-black text-slate-800">{it.quantity || 1}x {it.name || 'Item do pedido'} ({it.reason || 'Item com problema'})</span>
                                            </div>
                                            {it.amount?.value && (
                                                <span className="font-black text-red-600">R$ {(Number(it.amount.value) / 100).toFixed(2).replace('.', ',')}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {disputeModalOrder.ifoodDispute.evidences?.length > 0 && (
                                <div className="border border-slate-200 p-3 rounded-xl space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-700 block">📷 Evidências Fotográficas do Cliente:</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {disputeModalOrder.ifoodDispute.evidences.map((ev, idx) => (
                                            <a
                                                key={idx}
                                                href={`${IFOOD_API_URL}/api/ifood/evidences/${auth.currentUser?.uid}/${disputeModalOrder.ifoodOrderId}/${ev.imageId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block border rounded-lg overflow-hidden bg-slate-100 p-1 text-center hover:border-red-500"
                                            >
                                                <img
                                                    src={`${IFOOD_API_URL}/api/ifood/evidences/${auth.currentUser?.uid}/${disputeModalOrder.ifoodOrderId}/${ev.imageId}`}
                                                    alt={`Evidência ${idx + 1}`}
                                                    className="w-full h-28 object-cover rounded"
                                                />
                                                <span className="text-[9px] font-black text-blue-600 uppercase mt-1 block">🔍 Abrir Foto #{idx + 1}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border border-emerald-200 bg-emerald-50/60 p-3.5 rounded-xl space-y-2">
                                <h5 className="font-black text-xs uppercase text-emerald-800">1. Aceitar Cancelamento (/accept)</h5>
                                {disputeModalOrder.ifoodDispute.handshakeType === 'DELAY' && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Motivo do Atraso (Obrigatório para DELAY):</label>
                                        <select value={disputeAcceptDelayReason} onChange={e => setDisputeAcceptDelayReason(e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white">
                                            {(disputeModalOrder.ifoodDispute.acceptCancellationReasons || [
                                                'STORE_SYSTEM_ISSUES', 'HIGH_STORE_DEMAND', 'STORE_INTERNAL_DIFFICULTIES', 'LACK_OF_DRIVERS', 'OTHER_REASONS'
                                            ]).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleEnviarRespostaDisputa('accept')}
                                    disabled={sendingDisputeResponse}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs shadow-sm"
                                >
                                    ✅ Aceitar Solicitação do Cliente
                                </button>
                            </div>

                            {disputeModalOrder.ifoodDispute.handshakeType !== 'DELAY' && (
                                <div className="border border-red-200 bg-red-50/50 p-3.5 rounded-xl space-y-2">
                                    <h5 className="font-black text-xs uppercase text-red-800">2. Rejeitar Solicitação (/reject)</h5>
                                    <label className="text-[10px] font-black uppercase text-slate-600 block">Motivo da Recusa:</label>
                                    <select value={disputeRejectReason} onChange={e => setDisputeRejectReason(e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white">
                                        {disputeModalOrder.ifoodDispute.handshakeType === 'PREPARATION_TIME' ? (
                                            <>
                                                <option value="PREPARATION_IN_PROGRESS">PREPARATION_IN_PROGRESS (Preparo já iniciado)</option>
                                                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (Pedido já saiu para entrega)</option>
                                                <option value="READY_TO_PICKUP">READY_TO_PICKUP (Pedido já está pronto)</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="INVENTORY_CHECK">INVENTORY_CHECK (Conferência de estoque/envio correta)</option>
                                                <option value="ITEMS_SENT_CORRECTLY">ITEMS_SENT_CORRECTLY (Itens foram enviados corretamente)</option>
                                                <option value="NO_EVIDENCE">NO_EVIDENCE (Evidência insuficiente)</option>
                                            </>
                                        )}
                                    </select>
                                    <button
                                        onClick={() => handleEnviarRespostaDisputa('reject')}
                                        disabled={sendingDisputeResponse}
                                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs shadow-sm"
                                    >
                                        ❌ Rejeitar Cancelamento
                                    </button>
                                </div>
                            )}

                            {disputeModalOrder.ifoodDispute.handshakeType !== 'PREPARATION_TIME' && disputeModalOrder.ifoodDispute.alternatives?.length > 0 && (
                                <div className="border border-amber-300 bg-amber-50 p-3.5 rounded-xl space-y-2.5">
                                    <h5 className="font-black text-xs uppercase text-amber-900">3. Enviar Contraproposta (/alternative)</h5>
                                    {disputeModalOrder.ifoodDispute.handshakeType === 'DELAY' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Tempo Adicional (Min)</label>
                                                <select value={disputeAddTimeMinutes} onChange={e => setDisputeAddTimeMinutes(Number(e.target.value))} className="w-full p-2 border rounded-lg text-xs font-bold bg-white">
                                                    {(disputeModalOrder.ifoodDispute.alternatives[0]?.metadata?.allowedsAdditionalTimeInMinutes || [10, 15, 20, 30]).map(m => (
                                                        <option key={m} value={m}>+{m} minutos</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Justificativa</label>
                                                <select value={disputeAddTimeReason} onChange={e => setDisputeAddTimeReason(e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white">
                                                    {(disputeModalOrder.ifoodDispute.alternatives[0]?.metadata?.allowedsAdditionalTimeReasons || [
                                                        'OPERATIONAL_ISSUES', 'HIGH_STORE_DEMAND', 'LACK_OF_DRIVERS', 'ORDER_OUT_FOR_DELIVERY', 'DRIVER_IS_ALREADY_AT_THE_ADDRESS'
                                                    ]).map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                                                Valor do Reembolso Proposto (R$) — Máx: R$ {((Number(disputeModalOrder.ifoodDispute.alternatives[0]?.metadata?.maxAmount?.value || 0)) / 100).toFixed(2).replace('.', ',')}
                                            </label>
                                            <input
                                                type="text"
                                                value={disputeRefundValueReais}
                                                onChange={e => setDisputeRefundValueReais(e.target.value)}
                                                placeholder="Ex: 2,00"
                                                className="w-full p-2.5 border rounded-lg text-sm font-black text-emerald-700 bg-white"
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleEnviarRespostaDisputa('alternative')}
                                        disabled={sendingDisputeResponse}
                                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black uppercase text-xs shadow-sm"
                                    >
                                        💡 Enviar Contraproposta ao Cliente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE LANÇAMENTO MANUAL DE PEDIDO (PDV COMPLETO) */}
            {isManualModalOpen && (
                <div className="modal-overlay z-[105] fixed inset-0 bg-black/60 p-2 md:p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                <Icon name="shopping-cart" size={16} className="text-emerald-400" />
                                {editingOrderId ? 'Editar Pedido' : 'Novo Pedido Manual (PDV)'}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setIsManualModalOpen(false); setIsManualModalMinimized(true); }} className="text-slate-400 hover:text-amber-400 p-1" title="Minimizar"><Icon name="minus" size={18}/></button>
                                <button onClick={() => { setIsManualModalOpen(false); setIsManualModalMinimized(false); }} className="text-slate-400 hover:text-red-400 p-1" title="Fechar"><Icon name="x" size={18}/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-5 space-y-3">
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                                    <button type="button" onClick={() => setDeliveryMethod('entrega')} className={`py-2 rounded-lg text-[10px] font-black uppercase ${deliveryMethod === 'entrega' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>🛵 Entrega</button>
                                    <button type="button" onClick={() => setDeliveryMethod('retirada')} className={`py-2 rounded-lg text-[10px] font-black uppercase ${deliveryMethod === 'retirada' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>🛍️ Retirada</button>
                                    <button type="button" onClick={() => setDeliveryMethod('local')} className={`py-2 rounded-lg text-[10px] font-black uppercase ${deliveryMethod === 'local' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>🍽️ No Local</button>
                                </div>

                                <div className="relative">
                                    <input type="text" value={customerSearchQueryPDV} onChange={e => { setCustomerSearchQueryPDV(e.target.value); setShowCustomerDropdownPDV(true); }} placeholder="🔍 Buscar cliente salvo por nome ou telefone..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                    {showCustomerDropdownPDV && filteredSearchCustomers.length > 0 && (
                                        <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                            {filteredSearchCustomers.map(c => (
                                                <div key={c.id} onClick={() => selectCustomerPDV(c)} className="p-2.5 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 text-xs">
                                                    <div className="font-black text-slate-800">{c.name}</div>
                                                    <div className="text-[10px] text-slate-500">{c.phone} - {c.address}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" value={manualOrder.customerName} onChange={e => setManualOrder({...manualOrder, customerName: e.target.value})} placeholder="Nome do Cliente *" className="p-2.5 border rounded-xl text-xs font-bold" />
                                    <input type="text" value={manualOrder.customerPhone} onChange={e => { setManualOrder({...manualOrder, customerPhone: e.target.value}); handlePhoneChange(e.target.value); }} placeholder="WhatsApp / Telefone" className="p-2.5 border rounded-xl text-xs font-bold" />
                                </div>

                                {deliveryMethod === 'entrega' && (
                                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="relative">
                                            <input ref={addressInputRef} type="text" value={manualOrder.address} onChange={e => { setManualOrder({...manualOrder, address: e.target.value}); buscarSugestoesEnderecoBackend(e.target.value); }} placeholder="Rua / Avenida *" className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold" />
                                            {mostrarSugestoesEndereco && sugestoesEndereco.length > 0 && (
                                                <div className="absolute z-30 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                    {sugestoesEndereco.map((sug, i) => (
                                                        <div key={sug.place_id || i} onClick={() => selecionarSugestaoEndereco(sug)} className="p-2 hover:bg-slate-100 cursor-pointer text-xs font-bold border-b last:border-b-0">
                                                            {sug.description}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input type="text" value={manualOrder.addressNumber} onChange={e => setManualOrder({...manualOrder, addressNumber: e.target.value})} placeholder="Número *" className="p-2.5 bg-white border rounded-xl text-xs font-bold" />
                                            <input type="text" value={manualOrder.addressComplement} onChange={e => setManualOrder({...manualOrder, addressComplement: e.target.value})} placeholder="Compl / Apto" className="col-span-2 p-2.5 bg-white border rounded-xl text-xs font-bold" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select value={manualOrder.neighborhood} onChange={e => setManualOrder({...manualOrder, neighborhood: e.target.value})} className="p-2.5 bg-white border rounded-xl text-xs font-bold">
                                                <option value="">Bairro (Ou calcular KM)</option>
                                                {deliveryAreas.map((a, idx) => <option key={idx} value={a.name}>{a.name} ({formatMoney(a.deliveryFee)})</option>)}
                                            </select>
                                            <div className="flex gap-1">
                                                <input type="text" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="Taxa R$" className="w-full p-2.5 bg-white border rounded-xl text-xs font-black text-emerald-700" />
                                                <button type="button" onClick={handleCalcularTaxaManual} disabled={calculandoFrete} className="px-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase">
                                                    {calculandoFrete ? '...' : 'KM'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <select value={manualOrder.paymentMethod} onChange={e => setManualOrder({...manualOrder, paymentMethod: e.target.value})} className="p-2.5 border rounded-xl text-xs font-bold">
                                        {paymentOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                    </select>
                                    {manualOrder.paymentMethod === 'Dinheiro' && (
                                        <input type="text" value={trocoPara} onChange={e => setTrocoPara(e.target.value)} placeholder="Troco para R$ *" className="p-2.5 border border-amber-300 bg-amber-50 rounded-xl text-xs font-black" />
                                    )}
                                </div>

                                <textarea rows={2} value={manualOrder.observation} onChange={e => setManualOrder({...manualOrder, observation: e.target.value})} placeholder="Observações gerais do pedido..." className="w-full p-2.5 border rounded-xl text-xs font-bold" />
                            </div>

                            <div className="lg:col-span-7 flex flex-col h-full space-y-3">
                                <div className="flex gap-2">
                                    <input type="text" value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} placeholder="🔍 Buscar produto..." className="flex-1 p-2.5 border rounded-xl text-xs font-bold" />
                                    <select value={selectedCategoryFilter} onChange={e => setSelectedCategoryFilter(e.target.value)} className="p-2.5 border rounded-xl text-xs font-bold">
                                        <option value="">Todas Categorias</option>
                                        {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1">
                                    {filteredCatalogForPDV.map(prod => (
                                        <button key={prod.id} type="button" onClick={() => handleAddToCartFromPDV(prod)} className="p-2.5 border rounded-xl text-left hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex flex-col justify-between">
                                            <span className="font-black text-xs text-slate-800 line-clamp-2">{prod.name}</span>
                                            <span className="font-black text-xs text-emerald-600 mt-1">{formatMoney(prod.promoPrice > 0 ? prod.promoPrice : prod.price)}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 bg-slate-50 rounded-xl border p-3 flex flex-col justify-between">
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {cart.length === 0 ? (
                                            <p className="text-center text-slate-400 text-xs font-bold py-6">Carrinho vazio</p>
                                        ) : cart.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs">
                                                <div>
                                                    <span className="font-black">{item.qty}x {item.name}</span>
                                                    {item.complementsDesc && <p className="text-[10px] text-slate-500">+ {item.complementsDesc}</p>}
                                                    {item.observation && <p className="text-[10px] text-amber-600">Obs: {item.observation}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-emerald-600">{formatMoney(item.price * item.qty)}</span>
                                                    <button type="button" onClick={() => handleRemoveFromCart(item.id)} className="text-red-500 hover:text-red-700"><Icon name="trash-2" size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t pt-3 mt-2 flex justify-between items-center">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Total com Entrega</span>
                                            <span className="text-lg font-black text-emerald-600">{formatMoney(finalTotal)}</span>
                                        </div>
                                        <button type="button" onClick={handleSalvarPedidoManual} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-md">
                                            {editingOrderId ? 'Salvar Alterações' : 'Concluir Pedido'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE COMPLEMENTOS DO PDV */}
            {pdvSelectedProductForModal && (
                <div className="modal-overlay z-[120] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center border-b pb-3 mb-3">
                            <h4 className="font-black text-sm uppercase text-slate-800">{pdvSelectedProductForModal.name}</h4>
                            <button onClick={() => setPdvSelectedProductForModal(null)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {getGroupsToDisplay().map((group, gIdx) => (
                                <div key={gIdx} className="border rounded-xl p-3 bg-slate-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-xs uppercase text-slate-700">{group.name || group.nome}</span>
                                        <span className="text-[10px] font-bold text-slate-400">Máx: {group.max || 99}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {(group.items || group.options || group.opcoes || []).map((item, iIdx) => {
                                            const gId = group.id || group.name;
                                            const iId = item.id || item.name || item.nome;
                                            const q = getQtyComplement(gId, iId);
                                            return (
                                                <div key={iIdx} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs">
                                                    <div>
                                                        <span className="font-bold text-slate-700">{item.name || item.nome}</span>
                                                        {Number(item.price || item.valor) > 0 && <span className="text-emerald-600 font-black ml-1.5">+{formatMoney(item.price || item.valor)}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => handleUpdateComplement(group, item, -1)} className="w-6 h-6 bg-slate-100 rounded font-black">-</button>
                                                        <span className="font-black w-4 text-center">{q}</span>
                                                        <button type="button" onClick={() => handleUpdateComplement(group, item, 1)} className="w-6 h-6 bg-emerald-500 text-white rounded font-black">+</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <input type="text" value={pdvModalObs} onChange={e => setPdvModalObs(e.target.value)} placeholder="Observação do item (ex: sem cebola)..." className="w-full p-2.5 border rounded-xl text-xs font-bold" />
                        </div>
                        <div className="border-t pt-3 mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 border rounded-xl p-1">
                                <button type="button" onClick={() => setPdvModalQty(Math.max(1, pdvModalQty - 1))} className="w-8 h-8 bg-slate-100 rounded-lg font-black">-</button>
                                <span className="font-black text-sm px-2">{pdvModalQty}</span>
                                <button type="button" onClick={() => setPdvModalQty(pdvModalQty + 1)} className="w-8 h-8 bg-slate-100 rounded-lg font-black">+</button>
                            </div>
                            <button type="button" onClick={handleConfirmAddToCart} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black uppercase text-xs shadow-md">
                                Adicionar {formatMoney(getPdvModalComputedPrice())}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* MODAL DA COMANDA OFICIAL IMPRESSA IFOOD E 99FOOD */}
            {comandaModalOrder && (
                <div className="modal-overlay z-[150] fixed inset-0 bg-black/60 p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 flex flex-col max-h-[92vh]">
                        <div className="flex justify-between items-center border-b pb-3 mb-3">
                            <h3 className="font-black text-sm uppercase text-slate-800 flex items-center gap-2">
                                <Icon name="printer" size={16} className="text-amber-600" /> Comanda do Pedido #{comandaModalOrder.ifoodDisplayId || comandaModalOrder.orderNumber}
                            </h3>
                            <button onClick={() => setComandaModalOrder(null)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>

                        {/* Papel Térmico Amarelo */}
                        <div id="area-comanda-ifood" className="flex-1 overflow-y-auto bg-[#FFF1C1] text-slate-900 p-5 rounded-xl border border-amber-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap shadow-inner">
                            {formatarTextoComandaOficialIfood(comandaModalOrder, false)}
                        </div>

                        <div className="flex gap-2 mt-4 pt-2 border-t">
                            <button onClick={() => setComandaModalOrder(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase">
                                Fechar
                            </button>
                            <button
                                onClick={() => {
                                    const win = window.open('', '_blank', 'width=400,height=650');
                                    if (win) {
                                        win.document.write(`<html><head><title>Comanda #${comandaModalOrder.ifoodDisplayId || comandaModalOrder.orderNumber}</title><style>body{background:#FFF1C1;font-family:monospace;font-size:12px;padding:16px;white-space:pre-wrap;}</style></head><body>${formatarTextoComandaOficialIfood(comandaModalOrder, false)}</body></html>`);
                                        win.document.close();
                                        win.focus();
                                        win.print();
                                    }
                                }}
                                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-emerald-400 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-md"
                            >
                                <Icon name="printer" size={14} /> Imprimir Comanda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}