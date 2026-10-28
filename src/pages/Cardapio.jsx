import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { auth, db } from '../firebase';
import Icon from '../components/Icon';

const GOOGLE_MAPS_API_KEY = "AIzaSyARk776Wc3Ir48sxblkv71ubYeM8tVlG5k";
const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || "https://servidor-whatsapp-production-3e92.up.railway.app";
const CLOUD_FUNCTIONS_URL = "https://us-central1-tribo-sistemas-saas.cloudfunctions.net";

export default function Cardapio() {
    const { slug } = useParams();
    const [storeUid, setStoreUid] = useState(null); 
    
    const [catalogItems, setCatalogItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [lojaInfo, setLojaInfo] = useState({ 
        companyName: 'Sua Loja', logoUrl: '', bannerUrl: '', horarios: [],
        storePhone: '', storeAddress: '', showAddress: false
    });
    const [cmvSettings, setCmvSettings] = useState({});
    const [isStoreOpen, setIsStoreOpen] = useState(true);
    
    const [cart, setCart] = useState([]);
    
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [qty, setQty] = useState(1);
    const [observation, setObservation] = useState('');
    
    // Novo estado genérico para variações (ex: Cor, Tamanho, Material)
    const [selectedVariations, setSelectedVariations] = useState({});

    const [deliveryAreas, setDeliveryAreas] = useState([]); 
    const [regioesKM, setRegioesKM] = useState([]); 
    const [configGeral, setConfigGeral] = useState({});
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [deliveryInfo, setDeliveryInfo] = useState({ fee: '', time: '', found: false, inactive: false, name: '', isKm: false });

    const [availablePaymentMethods, setAvailablePaymentMethods] = useState([
        { id: 'default_pix', name: 'Pix' }, 
        { id: 'default_card', name: 'Cartão (Na Entrega)' }, 
        { id: 'default_money', name: 'Dinheiro' }
    ]);

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isSearchingName, setIsSearchingName] = useState(false);
    const [customerFound, setCustomerFound] = useState(false); 
    
    const [orderType, setOrderType] = useState('entrega');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    const [checkoutData, setCheckoutData] = useState({
        name: '', phone: '', address: '', number: '', complement: '', neighborhood: '', 
        paymentMethod: 'Pix', troco: '', observation: ''
    });

    const [isFidelidadeModalOpen, setIsFidelidadeModalOpen] = useState(false);
    const [authStep, setAuthStep] = useState('phone'); 
    const [checkoutAuthStep, setCheckoutAuthStep] = useState('check'); 
    const [fidelidadePhone, setFidelidadePhone] = useState('');
    const [fidelidadePassword, setFidelidadePassword] = useState(''); 
    const [fidelidadeName, setFidelidadeName] = useState('');
    const [fidelidadeError, setFidelidadeError] = useState('');
    const [fidelidadeCustomer, setFidelidadeCustomer] = useState(null);
    const [fidelidadeLoading, setFidelidadeLoading] = useState(false);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyPhone, setHistoryPhone] = useState('');
    const [historyPassword, setHistoryPassword] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [historyOrders, setHistoryOrders] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyStep, setHistoryStep] = useState('auth'); 

    const addressInputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const carouselRef = useRef(null);

    const scrollCarousel = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = 320; 
            carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const p = (val) => parseFloat(String(val).replace(',', '.')) || 0;

    const normalizePhone = (phone) => {
        if (!phone) return "";
        let num = String(phone).replace(/\D/g, "");
        if (num.startsWith("55") && num.length >= 12) num = num.substring(2);
        if (num.length === 11 && num[2] === '9') num = num.substring(0, 2) + num.substring(3);
        return num;
    };

    const fetchOrderHistory = async (phoneToSearch) => {
        setHistoryStep('list');
        setHistoryLoading(true);
        try {
            const limpo = normalizePhone(phoneToSearch);
            const rawSearchDigits = limpo.replace(/\D/g, '');
            const searchSuffix = rawSearchDigits.length > 8 ? rawSearchDigits.slice(-8) : rawSearchDigits;

            const snap = await db.collection(`artifacts/tribo-burger-financeiro/users/${storeUid}/delivery_orders`)
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get();
                
            const myOrders = [];
            snap.forEach(doc => {
                const data = doc.data();
                const dbPhone = String(data.customerPhone || data.telefone || data.phone || (data.clienteInfo && data.clienteInfo.phone) || '').replace(/\D/g, '');
                if (searchSuffix.length >= 8 && dbPhone.includes(searchSuffix)) {
                    myOrders.push({ id: doc.id, ...data });
                }
            });
            
            myOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setHistoryOrders(myOrders);
        } catch (error) {
            console.error("Erro ao buscar histórico fallback:", error);
        }
        setHistoryLoading(false);
    };

    const refreshHistory = async () => {
        const phoneToSearch = fidelidadeCustomer?.phone || historyPhone;
        if (!phoneToSearch) return;
        
        setHistoryLoading(true);
        try {
            const limpo = normalizePhone(phoneToSearch);
            const result = await callFidelidadeApi({ acao: 'consultar', donoUid: storeUid, phone: limpo });
            
            if (result && result.success && result.found) {
                processCustomerLoyalty(result.customer);
                setHistoryOrders(result.customer.recentOrders || []);
            } else {
                await fetchOrderHistory(limpo);
            }
        } catch(e) {
            await fetchOrderHistory(phoneToSearch);
        }
        setHistoryLoading(false);
    };

    const openHistoryModal = () => {
        setHistoryError('');
        setHistoryPassword('');
        setIsHistoryModalOpen(true);
        
        if (authStep === 'logged_in' && fidelidadeCustomer?.phone) {
            setHistoryPhone(fidelidadeCustomer.phone);
            setHistoryOrders(fidelidadeCustomer.recentOrders || []);
            setHistoryStep('list');
            if (!fidelidadeCustomer.recentOrders || fidelidadeCustomer.recentOrders.length === 0) {
                fetchOrderHistory(fidelidadeCustomer.phone);
            }
        } else {
            setHistoryStep('auth');
            if (checkoutData.phone) setHistoryPhone(checkoutData.phone);
        }
    };

    const handleHistoryAuth = async () => {
        const limpo = normalizePhone(historyPhone);
        if (limpo.length < 8) {
            setHistoryError("Digite um número de WhatsApp válido.");
            return;
        }
        if (!historyPassword) {
            setHistoryError("Digite sua senha de segurança.");
            return;
        }

        setHistoryLoading(true);
        setHistoryError('');
        
        try {
            const result = await callFidelidadeApi({ acao: 'consultar', donoUid: storeUid, phone: limpo });
            
            if (result && result.success && result.found) {
                const cust = result.customer;
                
                if (!cust.password) {
                    setHistoryError("Você ainda não tem uma senha. Vá em 'Minha Conta' para criar uma.");
                } else if (cust.password !== historyPassword) {
                    setHistoryError("Senha incorreta.");
                } else {
                    processCustomerLoyalty(cust);
                    setAuthStep('logged_in');
                    setCheckoutAuthStep('logged_in');
                    
                    if (cust.recentOrders && cust.recentOrders.length > 0) {
                        setHistoryOrders(cust.recentOrders);
                    } else {
                        await fetchOrderHistory(limpo);
                    }
                    setHistoryStep('list');
                }
            } else if (result && !result.success) {
                setHistoryError(result.error || "Erro de servidor ao buscar cliente.");
            } else {
                setHistoryError("Cadastro não encontrado.");
            }
        } catch (err) {
            setHistoryError(err.message || "Erro de rede ao consultar dados de segurança.");
        }
        setHistoryLoading(false);
    };

    const handleRepeatOrder = (order) => {
        if (!order.cartDetails || order.cartDetails.length === 0) {
            alert("Este pedido não possui detalhes suficientes para ser repetido.");
            return;
        }

        const newCartItems = order.cartDetails.map(item => {
            let currentPrice = item.price;
            if (item.isReward || currentPrice === 0) {
                const catalogMatch = catalogItems.find(c => c.id === item.productId);
                currentPrice = catalogMatch ? (catalogMatch.promoPrice > 0 ? catalogMatch.promoPrice : catalogMatch.price) : (item.originalPrice || item.preco || item.valor || 0);
            }
            
            return {
                ...item,
                id: crypto.randomUUID(), 
                isReward: false,
                price: Number(currentPrice),
                pointsCost: 0
            };
        });

        setCart(prev => [...prev, ...newCartItems]);
        setIsHistoryModalOpen(false);
        alert("Itens do pedido anterior adicionados à sua sacola!");
        
        if (window.innerWidth < 1024) {
             setIsCheckoutModalOpen(true);
        }
    };

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setQty(1);
        setObservation('');
        setSelectedVariations({}); // Reseta variações ao abrir
    };

    const handleVariationChange = (variationName, value) => {
        setSelectedVariations(prev => ({ ...prev, [variationName]: value }));
    };

    const rewardInfoModal = selectedProduct ? (cmvSettings.fidelidade_produtos || []).find(rp => rp.productId === selectedProduct.id) : null;
    const ptsNecessarios = (rewardInfoModal && selectedProduct) ? Math.floor(p(selectedProduct.promoPrice > 0 ? selectedProduct.promoPrice : selectedProduct.price) * (rewardInfoModal.pontosPorReal || 20)) : 0;

    const checkStoreStatus = (horarios) => {
        if (!horarios || horarios.length === 0) return true;
        const now = new Date();
        const day = now.getDay();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const configHoje = horarios.find(h => h.dia === day);
        if (!configHoje || !configHoje.ativo) return false;

        const parseTime = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };
        const openMin = parseTime(configHoje.abertura);
        const closeMin = parseTime(configHoje.fechamento);

        if (closeMin > openMin) return currentMin >= openMin && currentMin <= closeMin;
        else return currentMin >= openMin || currentMin <= closeMin;
    };

    const callFidelidadeApi = async (payload) => {
        try {
            const response = await fetch(`${CLOUD_FUNCTIONS_URL}/apiFidelidade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload })
            });
            if (!response.ok) throw new Error("Erro de rede: " + response.statusText);
            const json = await response.json();
            if (json.data && json.data.error) throw new Error(json.data.error);
            return json.data;
        } catch (err) {
            console.error("Falha na API Fidelidade:", err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (lojaInfo.horarios.length > 0) setIsStoreOpen(checkStoreStatus(lojaInfo.horarios));
        }, 60000);
        return () => clearInterval(interval);
    }, [lojaInfo.horarios]);

    useEffect(() => {
        const fetchPublicStore = async () => {
            try {
                let currentStoreId = null;
                let currentSettings = null;
                const searchSlug = slug ? slug.trim().toLowerCase() : '';

                if (searchSlug) {
                    try {
                        const response = await fetch(`${WHATSAPP_API_URL}/api/totem/init/${searchSlug}`);
                        if (response.ok) {
                            const data = await response.json();
                            currentStoreId = data.shopUid;
                            currentSettings = data.shopConfig;
                            
                            setCatalogItems(data.activeProducts || []);
                            setCategories(['Todos', ...new Set((data.activeProducts || []).map(i => i.category))]);
                        }
                    } catch (apiError) {
                        console.error("API do Railway falhou, tentando Firebase nativo...", apiError);
                    }

                    if (!currentStoreId) {
                        const usuariosSnap = await db.collection('usuarios').get();
                        for (const userDoc of usuariosSnap.docs) {
                            const uid = userDoc.id;
                            const stateDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${uid}/cmv_data/state`).get();
                            if (stateDoc.exists) {
                                const data = stateDoc.data();
                                if ((data.settings && data.settings.menuLink === searchSlug) || data.menuLink === searchSlug) {
                                    currentStoreId = uid;
                                    currentSettings = data.settings || data;
                                    break;
                                }
                            }
                        }
                    }
                } 
                else if (auth.currentUser) {
                    currentStoreId = auth.currentUser.uid;
                    const stateDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${currentStoreId}/cmv_data/state`).get();
                    if (stateDoc.exists) {
                        const data = stateDoc.data();
                        currentSettings = data.settings || data;
                    }
                }

                if (!currentStoreId) {
                    alert("Cardápio não encontrado. Verifique o link e tente novamente.");
                    setLoading(false);
                    return;
                }

                setStoreUid(currentStoreId);

                if (currentSettings) {
                    setCmvSettings(currentSettings);
                    setLojaInfo({
                        companyName: currentSettings.companyName || 'Sua Loja',
                        logoUrl: currentSettings.logoUrl || '',
                        bannerUrl: currentSettings.bannerUrl || '',
                        horarios: currentSettings.horarios || [],
                        storePhone: currentSettings.storePhone || '',
                        storeAddress: currentSettings.storeAddress || '',
                        showAddress: currentSettings.showAddress || false
                    });
                    setIsStoreOpen(checkStoreStatus(currentSettings.horarios));

                    const isDeliveryEnabled = currentSettings.geral_entregas !== false;
                    const isRetiradaEnabled = currentSettings.geral_retirada !== false;
                    
                    if (isDeliveryEnabled) setOrderType('entrega');
                    else if (isRetiradaEnabled) setOrderType('retirada');
                    else setOrderType('local');

                    if (currentSettings.geral_imediatos === false) setIsScheduled(true);
                }

                if (catalogItems.length === 0) {
                    const catSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${currentStoreId}/delivery/catalog_state`).get();
                    if (catSnap.exists && catSnap.data().products) {
                        const activeItems = catSnap.data().products.filter(p => p.isActive);
                        setCatalogItems(activeItems);
                        setCategories(['Todos', ...new Set(activeItems.map(i => i.category))]);
                    }
                }

                const areasSnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${currentStoreId}/delivery_settings/areas`).get();
                if (areasSnap.exists) {
                    const data = areasSnap.data();
                    setDeliveryAreas((data.bairros || []).map(b => ({ ...b, name: b.nome })).sort((a,b) => a.name.localeCompare(b.name)));
                    setRegioesKM((data.regioes || []).sort((a,b) => a.km - b.km));
                    setConfigGeral(data.configGeral || {});
                }

                const paySnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${currentStoreId}/settings/paymentMethods`).get();
                if (paySnap.exists && paySnap.data().methods) {
                    const publicMethods = paySnap.data().methods.filter(m => m.showOnMenu !== false);
                    if (publicMethods.length > 0) {
                        setAvailablePaymentMethods(publicMethods);
                        setCheckoutData(prev => ({ ...prev, paymentMethod: publicMethods[0].name }));
                    }
                }

            } catch (error) { 
                console.error("Erro ao carregar loja:", error); 
            }
            setLoading(false);
        };

        fetchPublicStore();
    }, [slug]);

    useEffect(() => {
        if (isCheckoutModalOpen) {
            setCheckoutStep(1);
            setFidelidadeError('');
        }
    }, [isCheckoutModalOpen]);

    useEffect(() => {
        const fetchCustomerByPhone = async () => {
            if (!storeUid || !checkoutData.phone) {
                setCustomerFound(false);
                return;
            }
            
            const numParaBusca = normalizePhone(checkoutData.phone);
            
            if (numParaBusca.length >= 8) {
                setIsSearchingName(true);
                try {
                    const result = await callFidelidadeApi({ acao: 'consultar', donoUid: storeUid, phone: numParaBusca });
                    
                    if (result && result.success && result.found) {
                        const custData = result.customer;
                        setCustomerFound(true);
                        setCheckoutData(prev => ({
                            ...prev,
                            name: custData.name || prev.name,
                            address: custData.address || prev.address,
                            neighborhood: custData.neighborhood || prev.neighborhood,
                            number: custData.numero || prev.number,
                            complement: custData.complemento || prev.complement
                        }));
                    } else {
                        setCustomerFound(false);
                    }
                } catch (error) {
                    setCustomerFound(false);
                } finally {
                    setIsSearchingName(false);
                }
            } else {
                setCustomerFound(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCustomerByPhone();
        }, 800); 

        return () => clearTimeout(timeoutId);
    }, [checkoutData.phone, storeUid]);

    const pontosUsadosNosProdutos = cart.filter(i => i.isReward).reduce((acc, i) => acc + (i.pointsCost * i.qty), 0);
    const pontosUsadosNoDesconto = appliedDiscount ? appliedDiscount.pontos : 0;
    const pontosUsadosNoCarrinho = pontosUsadosNosProdutos + pontosUsadosNoDesconto;
    const pontosRestantes = Math.max(0, fidelidadeCustomer ? ((fidelidadeCustomer.pontosAtuais || 0) - pontosUsadosNoCarrinho) : 0);
    
    const processCustomerLoyalty = (cust) => {
        if (!cust) return;
        
        const saldoExato = cust.saldoExato !== undefined ? Number(cust.saldoExato) : 0;

        const updatedCust = { 
            ...cust, 
            pontosAtuais: saldoExato 
        };
        
        setFidelidadeCustomer(updatedCust);
        setCheckoutData(prev => ({...prev, phone: updatedCust.phone, name: updatedCust.name || prev.name}));
    };

    const handleCheckPhone = async () => {
        if (!fidelidadePhone) { setFidelidadeError("Digite o número do seu WhatsApp."); return; }
        let limpo = normalizePhone(fidelidadePhone);
        if (limpo.length < 8) { setFidelidadeError("Número de telefone inválido."); return; }

        setFidelidadeError('');
        setFidelidadeLoading(true);
        try {
            const result = await callFidelidadeApi({ acao: 'consultar', donoUid: storeUid, phone: limpo });
            if (result && result.success) {
                if (result.found) {
                    const cust = result.customer;
                    processCustomerLoyalty(cust); 
                    if (cust.password) setAuthStep('login');
                    else setAuthStep('set_password'); 
                } else {
                    setAuthStep('register'); 
                }
            } else {
                setFidelidadeError("Erro de conexão com o sistema.");
            }
        } catch (error) { setFidelidadeError("Erro de conexão. Tente novamente."); }
        setFidelidadeLoading(false);
    };

    const handleLogin = () => {
        if (!fidelidadePassword) { setFidelidadeError("Digite sua senha."); return; }
        if (fidelidadeCustomer.password === fidelidadePassword) {
            setFidelidadeError('');
            processCustomerLoyalty(fidelidadeCustomer);
            setAuthStep('logged_in');
            setCheckoutAuthStep('logged_in');
        } else {
            setFidelidadeError("Senha incorreta.");
        }
    };

    const handleRegister = async () => {
        if (!fidelidadeName || !fidelidadePassword) { setFidelidadeError("Preencha seu nome e crie uma senha."); return; }
        setFidelidadeError('');
        setFidelidadeLoading(true);
        let limpo = normalizePhone(fidelidadePhone);

        try {
            const result = await callFidelidadeApi({
                acao: 'registrar', donoUid: storeUid, phone: limpo, name: fidelidadeName,
                password: fidelidadePassword, bonusAtivo: cmvSettings.fidelidade_bonusAtivo, bonusPontos: cmvSettings.fidelidade_bonusPontos
            });

            if (result && result.success) {
                processCustomerLoyalty(result.customer);
                setAuthStep('logged_in');
                setCheckoutAuthStep('logged_in');
            } else {
                setFidelidadeError(result.error || "Falha ao criar conta.");
            }
        } catch (error) { setFidelidadeError("Falha ao criar conta."); }
        setFidelidadeLoading(false);
    };

    const handleSetPassword = async () => {
        if (!fidelidadePassword) { setFidelidadeError("Crie uma senha de segurança."); return; }
        setFidelidadeError('');
        setFidelidadeLoading(true);
        try {
            const result = await callFidelidadeApi({
                acao: 'atualizar_senha', donoUid: storeUid, customerId: fidelidadeCustomer.id, password: fidelidadePassword
            });

            if (result && result.success) {
                const updatedCust = { ...fidelidadeCustomer, password: fidelidadePassword };
                processCustomerLoyalty(updatedCust);
                setAuthStep('logged_in');
                setCheckoutAuthStep('logged_in');
            } else {
                setFidelidadeError(result.error || "Erro ao salvar a senha.");
            }
        } catch (error) { setFidelidadeError("Erro ao salvar a senha."); }
        setFidelidadeLoading(false);
    };

    const handleLogoutFidelidade = () => {
        setFidelidadeCustomer(null); setFidelidadePhone(''); setFidelidadePassword(''); setFidelidadeName(''); setFidelidadeError(''); setAuthStep('phone'); setCheckoutAuthStep('check');
        setAppliedDiscount(null);
        setCart(cart.filter(i => !i.isReward)); 
    };

    const handleNextToLoyalty = async () => {
        if (!checkoutData.name || !checkoutData.phone) { alert("Preencha Nome e WhatsApp"); return; }
        if (orderType === 'entrega') {
            if (!checkoutData.address || !checkoutData.number) { alert("Preencha o endereço completo (Rua e Número)."); return; }
            if (deliveryInfo.inactive) { alert("Não entregamos nessa região. Verifique o endereço."); return; }
            if (!deliveryInfo.found && !checkoutData.neighborhood) {
                alert("Por favor, aguarde o cálculo da taxa de entrega ou clique em 'Calcular Frete'.");
                return;
            }
        }

        let limpo = normalizePhone(checkoutData.phone);
        if (cmvSettings.fidelidade_ativo) {
            setFidelidadeLoading(true);
            try {
                const result = await callFidelidadeApi({ acao: 'consultar', donoUid: storeUid, phone: limpo });
                if (result && result.success && result.found) {
                    const cust = result.customer;
                    processCustomerLoyalty(cust); 
                    if (cust.password) setCheckoutAuthStep('login');
                    else setCheckoutAuthStep('set_password');
                } else {
                    setCheckoutAuthStep('register');
                }
                setFidelidadePhone(checkoutData.phone);
                setCheckoutStep(2);
            } catch(e) { setCheckoutStep(2); }
            setFidelidadeLoading(false);
        } else {
            setCheckoutStep(3); 
        }
    };

    const handleCheckoutLogin = () => {
        if (!fidelidadePassword) { setFidelidadeError("Digite sua senha."); return; }
        if (fidelidadeCustomer.password === fidelidadePassword) {
            setFidelidadeError('');
            processCustomerLoyalty(fidelidadeCustomer);
            setCheckoutAuthStep('logged_in');
            setAuthStep('logged_in');
        } else {
            setFidelidadeError("Senha incorreta.");
        }
    };

    const handleCheckoutRegister = async () => {
        if (!fidelidadePassword) { setFidelidadeError("Crie uma senha de segurança."); return; }
        setFidelidadeError('');
        setFidelidadeLoading(true);
        let limpo = normalizePhone(checkoutData.phone);

        try {
            const result = await callFidelidadeApi({
                acao: 'registrar', donoUid: storeUid, phone: limpo, name: checkoutData.name, password: fidelidadePassword,
                bonusAtivo: cmvSettings.fidelidade_bonusAtivo, bonusPontos: cmvSettings.fidelidade_bonusPontos
            });

            if (result && result.success) {
                processCustomerLoyalty(result.customer);
                setCheckoutAuthStep('logged_in');
                setAuthStep('logged_in');
            } else {
                setFidelidadeError(result.error || "Falha ao criar conta.");
            }
        } catch (error) { setFidelidadeError("Falha ao criar conta."); }
        setFidelidadeLoading(false);
    };

    const handleCheckoutSetPassword = async () => {
        if (!fidelidadePassword) { setFidelidadeError("Crie uma senha."); return; }
        setFidelidadeError('');
        setFidelidadeLoading(true);
        try {
            const result = await callFidelidadeApi({
                acao: 'atualizar_senha', donoUid: storeUid, customerId: fidelidadeCustomer.id, password: fidelidadePassword
            });

            if (result && result.success) {
                const updatedCust = { ...fidelidadeCustomer, password: fidelidadePassword };
                processCustomerLoyalty(updatedCust);
                setCheckoutAuthStep('logged_in');
                setAuthStep('logged_in');
            } else {
                setFidelidadeError(result.error || "Erro ao salvar a senha.");
            }
        } catch (error) { setFidelidadeError("Erro ao salvar a senha."); }
        setFidelidadeLoading(false);
    };

    const addRewardToCart = (prod) => {
        if (cart.some(i => i.isReward) || appliedDiscount) {
            alert("Atenção: Só é permitido resgatar 1 prémio ou desconto por pedido.");
            return;
        }

        const ptsCalculados = Math.floor(prod.price * (prod.pontosPorReal || 20));
        const realProductId = prod.productId || prod.id;
        const existingItemIndex = cart.findIndex(item => item.productId === realProductId && !item.isReward);
        
        if (existingItemIndex >= 0) {
            const newCart = [...cart];
            const existingItem = newCart[existingItemIndex];
            
            if (existingItem.qty > 1) {
                existingItem.qty -= 1;
                newCart.push({ ...existingItem, id: crypto.randomUUID(), qty: 1, originalPrice: existingItem.price, price: 0, name: `🎁 [RESGATE] ${existingItem.name}`, isReward: true, pointsCost: ptsCalculados });
            } else {
                existingItem.originalPrice = existingItem.price;
                existingItem.price = 0;
                existingItem.name = `🎁 [RESGATE] ${existingItem.name}`;
                existingItem.isReward = true;
                existingItem.pointsCost = ptsCalculados;
            }
            setCart(newCart);
            if (!isCheckoutModalOpen) { setIsFidelidadeModalOpen(false); setIsCheckoutModalOpen(true); }
        } else {
            alert(`Para resgatar "${prod.name}", você precisa primeiro adicioná-lo à sua sacola.`);
        }
    };

    const removeRewardFromCart = (productId) => {
        const rewardItemIndex = cart.findIndex(i => i.isReward && i.productId === productId);
        if (rewardItemIndex >= 0) {
            const newCart = [...cart];
            const rewardItem = newCart[rewardItemIndex];
            newCart.splice(rewardItemIndex, 1);
            
            if (rewardItem.originalPrice !== undefined) {
                const cleanName = rewardItem.name.replace('🎁 [RESGATE] ', '');
                const samePaid = newCart.find(i => i.productId === productId && !i.isReward && i.variationsDesc === rewardItem.variationsDesc && i.observation === rewardItem.observation);
                if (samePaid) { samePaid.qty += 1; } 
                else { newCart.push({ ...rewardItem, id: crypto.randomUUID(), price: rewardItem.originalPrice, name: cleanName, isReward: false, pointsCost: 0, originalPrice: undefined }); }
            }
            setCart(newCart);
        }
    };

    const handleRemoveCartItem = (cItem) => {
        if (cItem.isReward && cItem.originalPrice !== undefined) removeRewardFromCart(cItem.productId);
        else setCart(cart.filter(i => i.id !== cItem.id));
    };

    const applyDiscountReward = (desc) => {
        if (cart.some(i => i.isReward)) {
            alert("Atenção: Já existe um produto resgatado na sacola. Só é permitido 1 resgate por pedido.");
            return;
        }
        setAppliedDiscount({ id: desc.id, valor: desc.valor, pontos: desc.pontos, nome: `Desconto de ${formatMoney(desc.valor)}` });
    };

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
        const minHours = parseInt(cmvSettings.agendamento_antecedenciaMinima) || 1;
        const dates = [];
        const hoje = new Date();
        for (let i = 0; i <= maxDays; i++) {
            const checkDate = new Date();
            checkDate.setDate(hoje.getDate() + i);
            checkDate.setHours(0,0,0,0);
            const dayConfig = horarios.find(h => h.dia === checkDate.getDay());
            if (dayConfig && dayConfig.ativo) {
                const [closeH, closeM] = dayConfig.fechamento.split(':').map(Number);
                const endSlot = new Date(checkDate);
                endSlot.setHours(closeH, closeM, 0, 0);
                const minTime = new Date();
                minTime.setHours(minTime.getHours() + minHours);
                if (endSlot >= minTime) {
                    dates.push({ value: checkDate.toISOString().split('T')[0], label: checkDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase() });
                }
            }
        }
        return dates;
    }, [cmvSettings]);

    const availableTimes = useMemo(() => {
        if (!scheduledDate) return [];
        const horarios = cmvSettings.horariosAgendamento || [];
        const [y, m, d] = scheduledDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        
        const dayConfig = horarios.find(h => h.dia === dateObj.getDay());
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
            if (currentSlot >= minTimeForScheduling) slots.push(currentSlot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            currentSlot.setMinutes(currentSlot.getMinutes() + interval);
        }
        return slots;
    }, [scheduledDate, cmvSettings]);

    useEffect(() => {
        if (isScheduled && !scheduledDate && availableDates.length > 0) setScheduledDate(availableDates[0].value);
    }, [isScheduled, availableDates, scheduledDate]);

    useEffect(() => {
        const scriptId = 'google-maps-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
            script.async = true; script.defer = true;
            document.head.appendChild(script);
            script.onload = () => { window.googleMapsLoaded = true; setGoogleMapsLoaded(true); };
        } else if (window.google) {
            window.googleMapsLoaded = true;
            setGoogleMapsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (orderType === 'retirada' || orderType === 'local') {
            setDeliveryInfo({ fee: 0, time: 0, found: true, inactive: false, name: 'Retirada na Loja', isKm: false });
            setDeliveryFee(0);
        } else {
            if (checkoutData.address && !checkoutData.neighborhood) {
                calcularFretePorKM(checkoutData.address);
            } else {
                setDeliveryInfo({ fee: '', time: '', found: false, inactive: false, name: '', isKm: false });
                setDeliveryFee(0);
            }
        }
    }, [orderType]);

    useEffect(() => {
        if (isCheckoutModalOpen && checkoutStep === 1 && orderType === 'entrega') {
            const checkMap = setInterval(() => {
                if (window.google && addressInputRef.current && !autocompleteRef.current) {
                    autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, { componentRestrictions: { country: "br" } });
                    
                    if (configGeral.cidadePadrao) {
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ address: configGeral.cidadePadrao }, (results, status) => { if (status === "OK" && results[0].geometry) { autocompleteRef.current.setBounds(results[0].geometry.viewport); } });
                    }
                    
                    autocompleteRef.current.addListener("place_changed", () => {
                        const place = autocompleteRef.current.getPlace();
                        if (!place || !place.formatted_address) return;
                        
                        const addressSelected = place.formatted_address;
                        let bairroGoogle = '';
                        if (place.address_components) {
                            const comp = place.address_components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'));
                            if (comp) bairroGoogle = comp.long_name;
                        }
                        
                        const norm = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
                        let bairroCadastrado = deliveryAreas.find(a => norm(a.name) === norm(bairroGoogle)) || deliveryAreas.find(a => norm(addressSelected).includes(norm(a.name)));
                        
                        setCheckoutData(prev => ({ ...prev, address: addressSelected, neighborhood: bairroCadastrado ? bairroCadastrado.name : '' }));
                        
                        if (bairroCadastrado) { 
                            setDeliveryInfo({ fee: bairroCadastrado.deliveryFee, time: bairroCadastrado.time, found: true, inactive: bairroCadastrado.isInactive, name: bairroCadastrado.name, isKm: false });
                            setDeliveryFee(Number(bairroCadastrado.deliveryFee || 0));
                        } else { 
                            calcularFretePorKM(addressSelected); 
                        }
                    });
                    clearInterval(checkMap);
                }
            }, 500);
            return () => clearInterval(checkMap);
        } else {
            if (autocompleteRef.current && window.google) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
                autocompleteRef.current = null;
            }
        }
    }, [isCheckoutModalOpen, checkoutStep, orderType, deliveryAreas, configGeral.cidadePadrao]);

    const calcularFretePorKM = (destino) => {
        if (!configGeral.enderecoLoja || !window.google) return;
        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix({ origins: [configGeral.enderecoLoja], destinations: [destino], travelMode: 'DRIVING' }, (response, status) => {
            if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                const distanceKm = response.rows[0].elements[0].distance.value / 1000;
                const regiaoAtendida = regioesKM.find(r => r.km >= distanceKm);
                if (regiaoAtendida) {
                    if (regiaoAtendida.isInactive) { setDeliveryInfo({ fee: 0, time: '', found: true, inactive: true, name: `Dist. ${distanceKm.toFixed(1)}km`, isKm: true }); setDeliveryFee(0); } 
                    else { setDeliveryInfo({ fee: regiaoAtendida.deliveryFee, time: regiaoAtendida.time, found: true, inactive: false, name: `Dist. ${distanceKm.toFixed(1)}km`, isKm: true }); setDeliveryFee(Number(regiaoAtendida.deliveryFee)); }
                } else { setDeliveryInfo({ fee: 0, time: '', found: true, inactive: true, name: `Fora de Área (${distanceKm.toFixed(1)}km)`, isKm: true }); setDeliveryFee(0); }
            }
        });
    };

    const handleCalcularTaxaManual = () => {
        if (checkoutData.neighborhood) {
            const matchedArea = deliveryAreas.find(a => a.name === checkoutData.neighborhood);
            if (matchedArea) {
                if (matchedArea.isInactive) { setDeliveryInfo({ fee: 0, time: '', found: true, inactive: true, name: matchedArea.name, isKm: false }); setDeliveryFee(0); } 
                else { setDeliveryInfo({ fee: matchedArea.deliveryFee, time: matchedArea.time, found: true, inactive: false, name: matchedArea.name, isKm: false }); setDeliveryFee(Number(matchedArea.deliveryFee)); }
            }
        } else if (checkoutData.address) {
            calcularFretePorKM(checkoutData.address);
        } else {
            alert("Preencha o endereço ou selecione um bairro para calcular a taxa de entrega.");
        }
    };

    const getComputedPrice = () => {
        if (!selectedProduct) return 0;
        const base = selectedProduct.promoPrice > 0 ? selectedProduct.promoPrice : selectedProduct.price;
        return Number(base) * qty;
    };

    const addToCart = () => {
        if (!selectedProduct) return;

        if (selectedProduct.variations && selectedProduct.variations.length > 0) {
            for (const v of selectedProduct.variations) {
                if (!selectedVariations[v.name]) {
                    alert(`Por favor, selecione uma opção para: ${v.name}`);
                    return;
                }
            }
        }

        const basePrice = selectedProduct.promoPrice > 0 ? selectedProduct.promoPrice : selectedProduct.price;
        const variationsText = Object.entries(selectedVariations)
            .map(([chave, valor]) => `${chave}: ${valor}`)
            .join(', ');

        setCart([...cart, { 
            id: crypto.randomUUID(), 
            productId: selectedProduct.id, 
            sku: selectedProduct.sku || 'SEM-SKU',
            name: selectedProduct.name, 
            price: Number(basePrice), 
            qty: qty, 
            observation: observation,
            variationsDesc: variationsText, 
            weight: selectedProduct.weight || 0, 
            dimensions: selectedProduct.dimensions || { length: 0, width: 0, height: 0 },
            isReward: false 
        }]);
        
        setSelectedProduct(null);
        setSelectedVariations({});
        setObservation('');
        setQty(1);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
    const subtotalBruto = cartTotal + (Number(deliveryFee) || 0);
    const totalDescontoParaBackend = appliedDiscount ? Number(appliedDiscount.valor) : 0;
    const finalTotal = Math.max(0, subtotalBruto - totalDescontoParaBackend);

    const handleFinalizarPedido = async () => {
        if (checkoutData.paymentMethod.toLowerCase().includes('dinheiro')) {
            const valorPago = parseFloat(String(checkoutData.troco).replace(',', '.'));
            if (!checkoutData.troco || isNaN(valorPago) || valorPago < finalTotal) {
                alert(`Para pagamento em Dinheiro, informe o Valor Pago (mínimo ${formatMoney(finalTotal)}). Se não houver troco, preencha com o valor exato.`);
                return;
            }
        }

        if (!storeUid) { alert("Erro fatal: Identificador da loja não encontrado. Tente atualizar a página."); return; }

        setIsSubmitting(true);
        let fullAddress = orderType === 'local' ? 'Consumo no Local' : 'Retirada no Balcão';
        if (orderType === 'entrega') {
            fullAddress = `${checkoutData.address}, ${checkoutData.number}`;
            if (checkoutData.complement) fullAddress += ` - ${checkoutData.complement}`;
            if (checkoutData.neighborhood) fullAddress += ` - Bairro: ${checkoutData.neighborhood}`;
        }
        
        let observacaoFinal = checkoutData.observation || '';
        if (pontosUsadosNoCarrinho > 0) {
            observacaoFinal = `[RESGATE DE ${pontosUsadosNoCarrinho} PONTOS] ` + observacaoFinal;
        }

        if (checkoutData.paymentMethod.toLowerCase().includes('dinheiro') && checkoutData.troco) {
            const valPago = parseFloat(String(checkoutData.troco).replace(',', '.'));
            const valorTroco = valPago - finalTotal;
            if (valorTroco > 0) {
                const msgTroco = `LEVAR TROCO PARA R$ ${valPago.toFixed(2).replace('.', ',')} (Troco de ${formatMoney(valorTroco)})`;
                observacaoFinal = observacaoFinal ? `${msgTroco} | ${observacaoFinal}` : msgTroco;
            }
        }

        const itemsFormattedText = cart.map(item => {
            let txt = `${item.qty}x ${item.name}`;
            if (item.variationsDesc) txt += ` (${item.variationsDesc})`;
            if (item.observation) txt += ` [Obs: ${item.observation}]`;
            return txt;
        }).join('\n');

        const arrayItensBase = cart.map(i => ({
            id: String(i.productId || i.id || 'sem-id'),
            itemId: String(i.productId || i.id || 'sem-id'),
            cartItemId: String(i.id), 
            sku: String(i.sku || 'SEM-SKU'),
            name: String(i.name),
            nome: String(i.name),
            price: Number(i.isReward ? (i.originalPrice || 0) : i.price) || 0,
            preco: Number(i.isReward ? (i.originalPrice || 0) : i.price) || 0,
            valor: Number(i.isReward ? (i.originalPrice || 0) : i.price) || 0,
            qty: Number(i.qty) || 1,
            quantidade: Number(i.qty) || 1,
            type: 'product',
            observation: String(i.observation || ''),
            observacao: String(i.observation || ''),
            variationsDesc: String(i.variationsDesc || ''),
            weight: Number(i.weight || 0),
            dimensions: i.dimensions || { length: 0, width: 0, height: 0 },
            isReward: Boolean(i.isReward || false),
            pointsCost: Number(i.pointsCost) || 0
        }));

        const payloadSeguro = {
            donoUid: storeUid,
            lojaId: storeUid,
            origem: "Cardápio Online / E-commerce",
            origin: "Cardápio Online / E-commerce",
            tipoEntrega: orderType === 'retirada' ? 'retirada' : (orderType === 'local' ? 'local' : 'delivery'),
            deliveryType: orderType === 'retirada' ? 'retirada' : (orderType === 'local' ? 'local' : 'delivery'),
            total: Number(finalTotal) || 0,
            totalGeral: Number(finalTotal) || 0,
            subtotal: Number(cartTotal) || 0,
            deliveryFee: orderType === 'entrega' ? (Number(deliveryFee) || 0) : 0,
            taxaEntrega: orderType === 'entrega' ? (Number(deliveryFee) || 0) : 0,
            
            discountAmount: Number(totalDescontoParaBackend) || 0,
            desconto: Number(totalDescontoParaBackend) || 0,
            
            items: arrayItensBase,
            itens: arrayItensBase,
            cartDetails: arrayItensBase,
            cart: arrayItensBase,
            itens_texto: itemsFormattedText,
            
            pontosUsados: pontosUsadosNoCarrinho,
            customerId: fidelidadeCustomer ? fidelidadeCustomer.id : null,

            clienteInfo: {
                name: checkoutData.name || 'Cliente Sem Nome',
                nome: checkoutData.name || 'Cliente Sem Nome',
                phone: checkoutData.phone || '00000000000',
                telefone: checkoutData.phone || '00000000000',
                address: fullAddress || 'Retirada no Balcão',
                endereco: fullAddress || 'Retirada no Balcão',
                numero: checkoutData.number || 'S/N',
                bairro: checkoutData.neighborhood || 'Raio de Entrega / Mapeado', 
                complemento: checkoutData.complement || '',
                paymentMethod: checkoutData.paymentMethod || 'Dinheiro',
                formaPagamento: checkoutData.paymentMethod || 'Dinheiro',
                troco: checkoutData.troco ? parseFloat(String(checkoutData.troco).replace(',','.')) : 0,
                trocoPara: checkoutData.troco ? parseFloat(String(checkoutData.troco).replace(',','.')) : 0,
                observation: observacaoFinal || '',
                observacao: observacaoFinal || '',
                deliveryFee: orderType === 'entrega' ? (Number(deliveryFee) || 0) : 0,
                taxaEntrega: orderType === 'entrega' ? (Number(deliveryFee) || 0) : 0,
                discountAmount: Number(totalDescontoParaBackend) || 0,
                desconto: Number(totalDescontoParaBackend) || 0,
                total: Number(finalTotal) || 0,
                totalGeral: Number(finalTotal) || 0,
                isScheduled: isScheduled, 
                scheduledDate: isScheduled ? scheduledDate : null, 
                scheduledTime: isScheduled ? scheduledTime : null
            }
        };

        try {
            const response = await fetch(`${CLOUD_FUNCTIONS_URL}/apiCriarPedido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payloadSeguro })
            });
            
            if (!response.ok) {
                throw new Error("Erro de rede: " + response.statusText);
            }
            
            const resultJson = await response.json();
            
            if (resultJson.data && resultJson.data.error) {
                throw new Error(resultJson.data.error || 'Erro interno no servidor.');
            }
            
            const totalValidado = resultJson.data ? resultJson.data.totalGeral : resultJson.totalGeral;
            
            alert(`Pedido enviado com sucesso! Total: ${formatMoney(totalValidado)}`);
            setCart([]); 
            setCheckoutData({ name: '', phone: '', address: '', number: '', complement: '', neighborhood: '', paymentMethod: availablePaymentMethods.length > 0 ? availablePaymentMethods[0].name : 'Pix', troco: '', observation: '' });
            setDeliveryFee(0); setDeliveryInfo({ fee: '', time: '', found: false, inactive: false, name: '', isKm: false }); 
            setAppliedDiscount(null);
            setIsCheckoutModalOpen(false);
            
        } catch (error) { 
            console.error("Erro ao validar/enviar pedido:", error);
            alert("Ocorreu um erro ao enviar o pedido: " + (error.message || 'Verifique sua conexão.')); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const filteredItems = catalogItems.filter(item => {
        const matchCat = activeCategory === 'Todos' || item.category === activeCategory;
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchCat && matchSearch;
    });

    const itemsByCategory = categories.filter(c => c !== 'Todos').reduce((acc, cat) => {
        const items = filteredItems.filter(i => i.category === cat);
        if (items.length > 0) acc[cat] = items; return acc;
    }, {});

    const featuredItems = catalogItems.filter(item => item.destaque);
    const showFeatured = featuredItems.length > 0 && activeCategory === 'Todos' && searchQuery === '';

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]"><span className="font-black text-slate-800 uppercase">Carregando Loja...</span></div>;

    const temRecompensaNoCarrinho = cart.some(i => i.isReward) || appliedDiscount;
    const pontosPedidoAtual = Math.floor(finalTotal * (parseFloat(cmvSettings.fidelidade_pontosPorReal) || 1));

    return (
        <div className="min-h-screen bg-[#F7F7F7] font-sans pb-24 lg:pb-0 relative">
            
            {/* TOPO DE NAVEGAÇÃO PREMIUM BRANCO */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4 shrink-0">
                    {lojaInfo.logoUrl ? (
                        <img src={lojaInfo.logoUrl} alt="Logo" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                    ) : (
                        <div className="w-10 h-10 bg-black text-[#F8CC82] rounded-md flex items-center justify-center font-black text-xs">
                            {lojaInfo.companyName.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    
                    <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                        <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="bg-transparent font-bold text-sm text-slate-700 outline-none cursor-pointer w-32 truncate">
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 max-w-2xl relative">
                    <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Busque por um produto" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-colors" 
                    />
                </div>

                <div className="hidden lg:flex items-center gap-6 shrink-0">
                    <button className="flex flex-col items-center gap-1 text-black font-black text-[10px] uppercase">
                        <Icon name="home" size={20}/> Início
                    </button>
                    <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-black font-bold text-[10px] uppercase transition-colors">
                        <Icon name="percent" size={20}/> Ofertas
                    </button>
                    <button onClick={openHistoryModal} className="flex flex-col items-center gap-1 text-slate-500 hover:text-black font-bold text-[10px] uppercase transition-colors">
                        <Icon name="clock" size={20}/> Meus Pedidos
                    </button>
                    <button onClick={() => setIsFidelidadeModalOpen(true)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg font-bold text-xs text-slate-700 transition-colors">
                        <Icon name="user" size={16}/> Minha conta <Icon name="chevron-down" size={14} className="text-slate-400"/>
                    </button>
                </div>
            </div>

            {/* SELETOR MOBILE DE CATEGORIA E BOTÕES */}
            <div className="md:hidden bg-white p-3 border-b border-slate-200 sticky top-[62px] z-30 shadow-sm flex items-center gap-2">
                <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none cursor-pointer">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={openHistoryModal} className="bg-slate-900 text-amber-400 p-2.5 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    <Icon name="clock" size={20} />
                </button>
                <button onClick={() => setIsFidelidadeModalOpen(true)} className="bg-slate-100 text-slate-700 p-2.5 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                    <Icon name="user" size={20} />
                </button>
            </div>

            {!isStoreOpen && (
                <div className="bg-red-500 text-white p-2 text-center text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-md relative z-20">
                    <Icon name="lock" size={14} className="inline-block mr-2 -mt-0.5" />
                    ESTAMOS FECHADOS NO MOMENTO. {cmvSettings.geral_agendamento !== false ? 'CONFIRA NOSSOS HORÁRIOS OU FAÇA UM AGENDAMENTO.' : 'CONFIRA NOSSO HORÁRIO DE ATENDIMENTO.'}
                </div>
            )}

            {/* BANNER GIGANTE FULL-WIDTH */}
            <div className="w-full bg-black">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6 pb-20">
                    <div className="w-full h-56 md:h-[350px] rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl">
                         <img src={lojaInfo.bannerUrl || "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1600&q=80"} alt="Banner" className={`w-full h-full object-cover transition-opacity ${isStoreOpen ? 'opacity-90' : 'opacity-40 grayscale'}`}/>
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 md:px-8 relative z-10 flex flex-col md:flex-row gap-6 -mt-16 md:-mt-24 mb-8">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-black rounded-2xl border-[5px] border-white shadow-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {lojaInfo.logoUrl ? (
                        <img src={lojaInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-[#F8CC82] font-black text-xl tracking-widest text-center px-2">{lojaInfo.companyName}</span>
                    )}
                </div>
                <div className="flex-1 pt-2 md:pt-24 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{lojaInfo.companyName}</h1>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-2">
                             {isStoreOpen ? <span className="text-amber-500">Aberto Agora</span> : <span className="text-red-500">Fechado</span>}
                             {lojaInfo.showAddress && lojaInfo.storeAddress && <span>• {lojaInfo.storeAddress}</span>}
                        </div>
                    </div>
                    
                    {/* CAIXA DE FIDELIDADE */}
                    {cmvSettings.fidelidade_ativo && (
                        <div onClick={() => setIsFidelidadeModalOpen(true)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full md:max-w-xs flex-shrink-0 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-2 text-slate-700 font-black text-sm mb-2">
                                <Icon name="gift" size={16} className="text-purple-500 group-hover:scale-110 transition-transform"/> Troque pontos por recompensas
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                A cada <strong>R$ 1,00</strong> em compras você ganha <strong>{cmvSettings.fidelidade_pontosPorReal || 1} ponto{cmvSettings.fidelidade_pontosPorReal > 1 ? 's' : ''}</strong> que pode ser trocado por recompensas.
                            </p>
                            <p className="text-[10px] text-purple-600 font-black mt-2 uppercase tracking-widest group-hover:underline">
                                Para participar clique aqui
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* CATÁLOGO DE PRODUTOS E SACOLA LATERAL */}
            <div className={`w-full max-w-[1600px] mx-auto px-4 md:px-8 pb-10 ${!isStoreOpen && cmvSettings.geral_agendamento === false && 'opacity-80'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* COLUNA ESQUERDA: PRODUTOS */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-10">
                        
                        {/* DESTAQUES */}
                        {showFeatured && (
                            <div className="mb-6 relative group">
                                <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    Destaques <Icon name="star" size={24} className="text-amber-500 fill-amber-500" />
                                </h2>
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => scrollCarousel('left')}
                                        className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white hover:bg-slate-100 text-slate-800 rounded-full items-center justify-center shadow-md border border-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Icon name="chevron-left" size={20} />
                                    </button>

                                    <div 
                                        ref={carouselRef}
                                        className="flex overflow-x-auto gap-4 pb-4 snap-x custom-scrollbar scroll-smooth"
                                    >
                                        {featuredItems.map(item => {
                                            const precoAtual = item.isPromo && item.promoPrice > 0 ? item.promoPrice : item.price;
                                            const precoOriginal = item.isPromo && item.promoPrice > 0 ? item.price : null;
                                            const rewardInfo = (cmvSettings.fidelidade_produtos || []).find(rp => rp.productId === item.id);

                                            return (
                                                <div 
                                                    key={`destaque-${item.id}`} 
                                                    onClick={() => (isStoreOpen || cmvSettings.geral_agendamento !== false) ? openProductModal(item) : alert("Nossa loja está fechada no momento.")}
                                                    className={`snap-start shrink-0 w-[280px] bg-white rounded-2xl border shadow-sm flex flex-col h-full overflow-hidden group transition-all ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'border-amber-200 hover:border-black hover:shadow-lg cursor-pointer' : 'border-slate-100 opacity-70 cursor-not-allowed'}`}
                                                >
                                                    <div className="w-full h-48 sm:h-52 bg-slate-100 relative overflow-hidden shrink-0">
                                                        <img src={item.imageUrl || 'https://via.placeholder.com/600?text=Sem+Foto'} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'group-hover:scale-105' : 'grayscale'}`}/>
                                                        
                                                        <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-sm">
                                                            Destaque
                                                        </div>

                                                        {rewardInfo && cmvSettings.fidelidade_ativo && (
                                                            <div className="absolute top-3 right-3 w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg z-10" title="Disponível para Resgate com Pontos">
                                                                <Icon name="gift" size={16} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-4 flex flex-col flex-1">
                                                        <div className="min-h-[28px] mb-1.5 flex items-start">
                                                            {item.isPromo && <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded inline-flex uppercase tracking-widest border border-purple-100">Oferta Especial</span>}
                                                        </div>
                                                        <h3 className={`font-bold text-base leading-tight ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'text-slate-800 group-hover:text-black' : 'text-slate-500'}`}>{item.name}</h3>
                                                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-snug flex-1">{item.description}</p>
                                                        
                                                        <div className="mt-auto pt-4 flex items-center gap-2">
                                                            <span className={`font-black text-lg ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'text-slate-800' : 'text-slate-400'}`}>{formatMoney(precoAtual)}</span>
                                                            {precoOriginal && <span className="text-xs font-bold text-slate-400 line-through">{formatMoney(precoOriginal)}</span>}
                                                            {precoOriginal && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">-{Math.round((1 - precoAtual/precoOriginal)*100)}%</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button 
                                        onClick={() => scrollCarousel('right')}
                                        className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white hover:bg-slate-100 text-slate-800 rounded-full items-center justify-center shadow-md border border-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Icon name="chevron-right" size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {Object.entries(itemsByCategory).map(([categoryName, items]) => (
                            <div key={categoryName} className="scroll-mt-32">
                                <h2 className="text-2xl font-black text-slate-800 mb-6">{categoryName}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {items.map(item => {
                                        const precoAtual = item.isPromo && item.promoPrice > 0 ? item.promoPrice : item.price;
                                        const precoOriginal = item.isPromo && item.promoPrice > 0 ? item.price : null;
                                        const rewardInfo = (cmvSettings.fidelidade_produtos || []).find(rp => rp.productId === item.id);

                                        return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => {
                                                if (isStoreOpen || cmvSettings.geral_agendamento !== false) {
                                                    openProductModal(item);
                                                } else {
                                                    alert("Nossa loja está fechada no momento.");
                                                }
                                            }} 
                                            className={`bg-white rounded-2xl border shadow-sm flex flex-col h-full overflow-hidden group transition-all ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'border-slate-200 hover:border-black hover:shadow-lg cursor-pointer' : 'border-slate-100 opacity-70 cursor-not-allowed'}`}
                                        >
                                            <div className="w-full h-44 sm:h-52 bg-slate-100 relative overflow-hidden shrink-0">
                                                <img src={item.imageUrl || 'https://via.placeholder.com/600?text=Sem+Foto'} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'group-hover:scale-105' : 'grayscale'}`}/>
                                                
                                                {rewardInfo && cmvSettings.fidelidade_ativo && (
                                                    <div className="absolute top-3 right-3 w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg z-10" title="Disponível para Resgate com Pontos">
                                                        <Icon name="gift" size={16} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 flex flex-col flex-1">
                                                <div className="min-h-[28px] mb-1.5 flex items-start">
                                                    {item.isPromo && <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded inline-flex uppercase tracking-widest border border-purple-100">Oferta Especial</span>}
                                                </div>
                                                <h3 className={`font-bold text-base leading-tight ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'text-slate-800 group-hover:text-black' : 'text-slate-500'}`}>{item.name}</h3>
                                                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-snug flex-1">{item.description}</p>
                                                
                                                <div className="mt-auto pt-4 flex items-center gap-2">
                                                    <span className={`font-black text-base ${(isStoreOpen || cmvSettings.geral_agendamento !== false) ? 'text-slate-800' : 'text-slate-400'}`}>{formatMoney(precoAtual)}</span>
                                                    {precoOriginal && <span className="text-xs font-bold text-slate-400 line-through">{formatMoney(precoOriginal)}</span>}
                                                    {precoOriginal && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">-{Math.round((1 - precoAtual/precoOriginal)*100)}%</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* COLUNA DIREITA: CARRINHO STICKY */}
                    <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
                        <div className="sticky top-[88px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-110px)]">
                            
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsCheckoutModalOpen(true)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                        <Icon name={orderType === 'entrega' ? 'truck' : (orderType === 'local' ? 'coffee' : 'shopping-bag')} size={14}/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-800">
                                            {orderType === 'entrega' ? 'Entregar em' : (orderType === 'local' ? 'Consumo no Local' : 'Retirar no local')}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">
                                            {orderType === 'entrega' ? (checkoutData.address || 'Selecione o endereço') : lojaInfo.companyName}
                                        </span>
                                    </div>
                                </div>
                                <Icon name="chevron-right" size={16} className="text-slate-400" />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white space-y-4">
                                <h4 className="font-black text-slate-800 text-sm mb-2">Sua sacola</h4>
                                {cart.length === 0 ? (
                                    <div className="text-center text-slate-400 font-bold flex flex-col items-center justify-center h-32">
                                        <Icon name="shopping-bag" size={32} className="mb-2 opacity-50" /> 
                                        Adicione itens
                                    </div>
                                ) : (
                                    <div className="w-full space-y-4">
                                        {cart.map((cItem) => (
                                            <div key={cItem.id} className={`flex justify-between items-start text-[13px] ${cItem.isReward ? 'bg-purple-50 p-2 rounded-lg border border-purple-100' : ''}`}>
                                                <div className="flex gap-2">
                                                    <span className={`font-black ${cItem.isReward ? 'text-purple-600' : 'text-slate-400'}`}>{cItem.qty}x</span>
                                                    <div>
                                                        <p className={`font-bold ${cItem.isReward ? 'text-purple-800' : 'text-slate-800'}`}>{cItem.name}</p>
                                                        {cItem.variationsDesc && <p className="text-[10px] text-slate-500 font-bold leading-tight mt-1">{cItem.variationsDesc}</p>}
                                                        {cItem.observation && <p className="text-[10px] text-amber-600 font-bold mt-1">Obs: {cItem.observation}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    {cItem.isReward ? (
                                                        <div className="text-right">
                                                            <span className="font-black text-purple-600 block text-[13px]">Grátis</span>
                                                            <span className="font-bold text-slate-400 text-[9px] uppercase">{cItem.pointsCost} pts</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-black text-slate-700">{formatMoney(cItem.price * cItem.qty)}</span>
                                                    )}
                                                    <button onClick={() => handleRemoveCartItem(cItem)} className="text-[10px] uppercase font-black text-red-400 hover:text-red-600 mt-1">Remover</button>
                                                </div>
                                            </div>
                                        ))}
                                        {appliedDiscount && (
                                            <div className="flex justify-between items-start text-[13px] bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                <div className="flex gap-2">
                                                    <span className="font-black text-blue-600">1x</span>
                                                    <div><p className="font-bold text-blue-800">🎁 {appliedDiscount.nome}</p></div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="font-black text-blue-600 text-[13px]">-{formatMoney(appliedDiscount.valor)}</span>
                                                    <button onClick={() => setAppliedDiscount(null)} className="text-[10px] uppercase font-black text-red-400 hover:text-red-600 mt-1">Remover</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white border-t border-slate-100 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal</span><span>{formatMoney(cartTotal)}</span></div>
                                {orderType === 'entrega' && <div className="flex justify-between text-xs font-bold text-slate-500"><span>Entrega</span><span>{formatMoney(deliveryFee)}</span></div>}
                                {appliedDiscount && <div className="flex justify-between text-xs font-bold text-blue-600"><span>Desconto Fidelidade</span><span>-{formatMoney(appliedDiscount.valor)}</span></div>}
                                
                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100">
                                    <span className="font-black text-sm text-slate-800">Total</span>
                                    <span className="font-black text-base text-slate-800">{formatMoney(finalTotal)}</span>
                                </div>

                                {cmvSettings.fidelidade_ativo && (
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 cursor-pointer hover:bg-emerald-50 p-2 rounded-lg transition-colors" onClick={() => setIsFidelidadeModalOpen(true)}>
                                        <span className="font-bold text-[11px] text-emerald-500">Pontuação deste pedido</span>
                                        <span className="font-black text-xs text-emerald-600">{pontosPedidoAtual} pontos</span>
                                    </div>
                                )}

                                <button disabled={cart.length===0 || (!isStoreOpen && cmvSettings.geral_agendamento === false)} onClick={() => setIsCheckoutModalOpen(true)} className="w-full py-4 mt-2 bg-black hover:bg-slate-800 text-white rounded-xl font-black transition-transform active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-sm uppercase tracking-widest">
                                    {!isStoreOpen && cmvSettings.geral_agendamento === false ? 'Loja Fechada' : 'Continuar pedido'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button disabled={cart.length === 0 || (!isStoreOpen && cmvSettings.geral_agendamento === false)} onClick={() => setIsCheckoutModalOpen(true)} className={`w-full py-3.5 rounded-xl font-black flex items-center justify-between px-6 transition-all ${cart.length === 0 || (!isStoreOpen && cmvSettings.geral_agendamento === false) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-black text-white shadow-md'}`}>
                    <span className="flex items-center gap-2"><Icon name="shopping-bag" size={18} /><span className="uppercase tracking-wide text-xs">{!isStoreOpen && cmvSettings.geral_agendamento === false ? 'Loja Fechada' : (cart.length === 0 ? 'Sacola Vazia' : 'Ver Sacola')}</span></span>
                    {cart.length > 0 && <span>{formatMoney(finalTotal)}</span>}
                </button>
            </div>

            {/* MODAL DETALHES DO PRODUTO */}
            {selectedProduct && (isStoreOpen || cmvSettings.geral_agendamento !== false) && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col sm:flex-row overflow-hidden max-h-[90vh] sm:max-h-[85vh] animate-slide-up sm:animate-scale-up relative">
                        <button onClick={() => setSelectedProduct(null)} className="sm:hidden absolute top-4 right-4 bg-white/80 p-2 rounded-full text-slate-800 z-10"><Icon name="x" size={20} /></button>
                        <div className="w-full sm:w-1/2 h-64 sm:h-auto bg-slate-100 relative flex-shrink-0">
                            <img src={selectedProduct.imageUrl || 'https://via.placeholder.com/600?text=Sem+Foto'} alt={selectedProduct.name} className="w-full h-full object-cover"/>
                        </div>
                        <div className="w-full sm:w-1/2 flex flex-col h-[60vh] sm:h-auto overflow-hidden bg-white">
                            <div className="hidden sm:flex justify-between items-center p-5 border-b border-slate-100">
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Detalhes do Produto</h3>
                                <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-black transition-colors"><Icon name="x" size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 leading-tight">{selectedProduct.name}</h2>
                                    <p className="text-[13px] text-slate-500 font-bold mt-2 leading-relaxed">{selectedProduct.description}</p>
                                </div>
                                <div className="text-2xl font-black text-slate-800">
                                    {formatMoney(selectedProduct.isPromo && selectedProduct.promoPrice > 0 ? selectedProduct.promoPrice : selectedProduct.price)}
                                </div>
                                
                                {rewardInfoModal && cmvSettings.fidelidade_ativo && (
                                    <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3 bg-white shadow-sm mt-4">
                                        <div className="bg-slate-500 text-white p-2 rounded-full shrink-0 mt-0.5"><Icon name="gift" size={16}/></div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-[13px]">Resgate por {ptsNecessarios} pontos</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1.5 leading-snug">Se deseja resgatar este produto grátis com seus pontos, adicione-o à sacola e ao fechar o pedido você poderá solicitar o resgate.</p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-5 pt-4">
                                    {selectedProduct.variations && selectedProduct.variations.map((varGroup, idx) => (
                                        <div key={idx} className="border border-slate-200 p-4 rounded-2xl bg-white shadow-sm">
                                            <h4 className="font-black text-[13px] text-slate-800 mb-3">{varGroup.name}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {varGroup.options && varGroup.options.map((opt, oIdx) => (
                                                    <button
                                                        key={oIdx}
                                                        onClick={() => handleVariationChange(varGroup.name, opt)}
                                                        className={`px-4 py-2 rounded-xl font-bold text-xs border transition-colors ${selectedVariations[varGroup.name] === opt ? 'border-black bg-black text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2 pt-2">
                                    <label className="font-black text-slate-800 text-sm">Alguma observação?</label>
                                    <textarea placeholder="Ex: Informações adicionais..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[13px] outline-none focus:border-black resize-none h-20 transition-colors" value={observation} onChange={(e) => setObservation(e.target.value)}></textarea>
                                </div>

                            </div>
                            
                            <div className="p-4 border-t border-slate-200 flex items-center gap-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center bg-slate-100 rounded-xl h-14 overflow-hidden border border-slate-200">
                                    <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-14 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 font-black text-xl transition-colors pb-1">-</button>
                                    <span className="w-10 text-center font-black text-lg text-slate-800">{qty}</span>
                                    <button type="button" onClick={() => setQty(qty + 1)} className="w-14 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 font-black text-xl transition-colors pb-1">+</button>
                                </div>
                                <button onClick={addToCart} className="flex-1 h-14 bg-black hover:bg-slate-800 text-white rounded-xl font-black flex justify-between items-center px-6 shadow-md transition-all active:scale-95 text-[15px]">
                                    <span>Adicionar</span>
                                    <span>{formatMoney(getComputedPrice())}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GLOBAL - HISTÓRICO DE PEDIDOS (MEUS PEDIDOS) */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                        <div className="p-5 bg-black flex justify-between items-center text-white shrink-0">
                            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <Icon name="clock" size={18}/> Meus Pedidos
                            </h3>
                            <div className="flex items-center gap-4">
                                {historyStep === 'list' && (
                                    <button onClick={refreshHistory} className="hover:text-amber-400 transition-colors" title="Atualizar Pedidos">
                                        <Icon name="refresh-cw" size={18} className={historyLoading ? "animate-spin" : ""} />
                                    </button>
                                )}
                                <button onClick={() => setIsHistoryModalOpen(false)} className="hover:text-slate-300 transition-colors">
                                    <Icon name="x" size={20}/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            {historyStep === 'auth' && (
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-slate-600 text-center mb-6">
                                        Para sua segurança, informe seu WhatsApp e senha para acessar o histórico:
                                    </p>
                                    <div className="space-y-3">
                                        <input 
                                            type="tel" 
                                            placeholder="(11) 99999-9999" 
                                            value={historyPhone} 
                                            onChange={e => setHistoryPhone(e.target.value)} 
                                            className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black text-center text-lg shadow-inner"
                                        />
                                        <input 
                                            type="password" 
                                            placeholder="Sua senha secreta" 
                                            value={historyPassword} 
                                            onChange={e => setHistoryPassword(e.target.value)} 
                                            className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black text-center text-lg shadow-inner"
                                        />
                                        {historyError && <p className="text-xs font-bold text-red-500 text-center mt-1">{historyError}</p>}
                                    </div>
                                    <button 
                                        onClick={handleHistoryAuth} 
                                        disabled={historyLoading} 
                                        className="w-full py-4 mt-2 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        {historyLoading ? <Icon name="loader" size={18} className="animate-spin" /> : 'Verificar e Buscar'}
                                    </button>
                                </div>
                            )}

                            {historyStep === 'list' && (
                                <div className="space-y-4">
                                    {historyLoading ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                                            <Icon name="loader" size={32} className="animate-spin" />
                                            <span className="font-bold text-sm uppercase">Buscando...</span>
                                        </div>
                                    ) : historyOrders.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                                            <Icon name="inbox" size={48} />
                                            <span className="font-bold text-sm uppercase text-center">Nenhum pedido encontrado<br/>para este número.</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {historyOrders.map(order => (
                                                <div key={order.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 shadow-sm flex flex-col gap-3">
                                                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                                                        <div>
                                                            <span className="bg-slate-800 text-white text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest">Pedido #{order.orderNumber}</span>
                                                            <p className="text-xs font-bold text-slate-500 mt-2">
                                                                {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-black text-emerald-600 text-lg">{formatMoney(order.total)}</span>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.status}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-xs font-bold text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                                                        {order.items}
                                                    </div>

                                                    <button 
                                                        onClick={() => handleRepeatOrder(order)}
                                                        className="w-full mt-1 bg-amber-400 hover:bg-amber-300 text-slate-950 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                    >
                                                        <Icon name="refresh-cw" size={14} /> Repetir Pedido
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MINHA CONTA MODAL GLOBAL */}
            {isFidelidadeModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                        <div className="p-5 bg-black flex justify-between items-center text-white">
                            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2"><Icon name="award" size={18}/> Minha Conta / Fidelidade</h3>
                            <button onClick={() => { setIsFidelidadeModalOpen(false); setAuthStep(fidelidadeCustomer ? 'logged_in' : 'phone'); setFidelidadeError(''); }} className="hover:text-slate-300 transition-colors"><Icon name="x" size={20}/></button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            
                            {authStep === 'phone' && (
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-slate-600 text-center mb-6">Digite o seu WhatsApp para consultar seus pontos e resgatar prêmios grátis:</p>
                                    <div className="space-y-1">
                                        <input type="tel" placeholder="(11) 99999-9999" value={fidelidadePhone} onChange={e => setFidelidadePhone(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black text-center text-lg shadow-inner"/>
                                        {fidelidadeError && <p className="text-xs font-bold text-red-500 text-center mt-2">{fidelidadeError}</p>}
                                    </div>
                                    <button onClick={handleCheckPhone} disabled={fidelidadeLoading} className="w-full py-4 mt-2 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase transition-colors shadow-md flex justify-center items-center gap-2">
                                        {fidelidadeLoading ? <Icon name="loader" size={18} className="animate-spin" /> : 'Continuar'}
                                    </button>
                                </div>
                            )}

                            {authStep === 'login' && (
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-slate-100 text-black rounded-full flex items-center justify-center mx-auto mb-3"><Icon name="user-check" size={32}/></div>
                                        <h3 className="font-black text-slate-800 text-lg">Bem-vindo de volta!</h3>
                                        <p className="text-sm font-bold text-slate-500 mt-1">{fidelidadeCustomer?.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Digite sua senha</label>
                                        <input type="password" placeholder="Sua senha secreta" value={fidelidadePassword} onChange={e => setFidelidadePassword(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black text-center text-lg shadow-inner"/>
                                        {fidelidadeError && <p className="text-xs font-bold text-red-500 text-center mt-2">{fidelidadeError}</p>}
                                    </div>
                                    <button onClick={handleLogin} className="w-full py-4 mt-2 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase transition-colors shadow-md">Entrar na Conta</button>
                                    <button onClick={() => setAuthStep('phone')} className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase mt-2">Voltar</button>
                                </div>
                            )}

                            {authStep === 'register' && (
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-slate-100 text-black rounded-full flex items-center justify-center mx-auto mb-3"><Icon name="user-plus" size={32}/></div>
                                        <h3 className="font-black text-slate-800 text-lg">Parece que você é novo aqui!</h3>
                                        <p className="text-xs font-bold text-slate-500 mt-1">Crie sua conta para começar a ganhar pontos em todos os seus pedidos.</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Como devemos te chamar?</label>
                                            <input type="text" placeholder="Seu nome completo" value={fidelidadeName} onChange={e => setFidelidadeName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black shadow-inner"/>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Crie uma senha segura</label>
                                            <input type="password" placeholder="Sua senha secreta" value={fidelidadePassword} onChange={e => setFidelidadePassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black shadow-inner"/>
                                        </div>
                                        {fidelidadeError && <p className="text-xs font-bold text-red-500 text-center mt-1">{fidelidadeError}</p>}
                                    </div>
                                    <button onClick={handleRegister} disabled={fidelidadeLoading} className="w-full py-4 mt-4 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase transition-colors shadow-md flex justify-center items-center gap-2">
                                        {fidelidadeLoading ? <Icon name="loader" size={18} className="animate-spin" /> : 'Criar Conta e Entrar'}
                                    </button>
                                    <button onClick={() => setAuthStep('phone')} className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase mt-2">Voltar</button>
                                </div>
                            )}

                            {authStep === 'set_password' && (
                                <div className="space-y-4">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-slate-100 text-black rounded-full flex items-center justify-center mx-auto mb-3"><Icon name="shield" size={32}/></div>
                                        <h3 className="font-black text-slate-800 text-lg">Atualização de Segurança</h3>
                                        <p className="text-xs font-bold text-slate-500 mt-1">Olá <b>{fidelidadeCustomer?.name}</b>! Identificamos seu histórico com a gente. Para proteger seus pontos, crie uma senha agora.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Crie uma nova senha</label>
                                        <input type="password" placeholder="Sua senha secreta" value={fidelidadePassword} onChange={e => setFidelidadePassword(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black text-center text-lg shadow-inner"/>
                                        {fidelidadeError && <p className="text-xs font-bold text-red-500 text-center mt-2">{fidelidadeError}</p>}
                                    </div>
                                    <button onClick={handleSetPassword} disabled={fidelidadeLoading} className="w-full py-4 mt-2 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase transition-colors shadow-md flex justify-center items-center gap-2">
                                        {fidelidadeLoading ? <Icon name="loader" size={18} className="animate-spin" /> : 'Salvar Senha e Entrar'}
                                    </button>
                                </div>
                            )}

                            {authStep === 'logged_in' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-black border border-slate-800 p-5 rounded-xl text-center shadow-inner relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 opacity-10 text-white"><Icon name="award" size={120} /></div>
                                        <p className="text-xs font-black text-slate-300 uppercase mb-1 tracking-widest relative z-10">Olá, {fidelidadeCustomer?.name.split(' ')[0]}! Seu Saldo Atual é:</p>
                                        <div className="flex items-center justify-center relative z-10">
                                            <span className="text-6xl font-black text-white">{pontosRestantes}</span>
                                            <span className="text-sm font-bold text-slate-400 ml-2 mt-4">pts</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button onClick={handleLogoutFidelidade} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase rounded-xl transition-colors text-xs">Sair da Conta</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHECKOUT MULTI-STEP */}
            {isCheckoutModalOpen && (isStoreOpen || cmvSettings.geral_agendamento !== false) && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] animate-slide-up relative overflow-hidden">
                        
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                            {checkoutStep > 1 ? (
                                <button onClick={() => setCheckoutStep(checkoutStep - 1)} className="text-slate-400 hover:text-black transition-colors"><Icon name="chevron-left" size={24} /></button>
                            ) : (
                                <div className="w-6"></div>
                            )}
                            <h3 className="font-black text-slate-800 text-lg">Checkout</h3>
                            <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-black transition-colors"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="pt-4 pb-2 px-6 shrink-0 bg-white border-b border-slate-100">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
                                <div className="absolute top-1/2 left-8 h-0.5 bg-black -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${(checkoutStep - 1) * 33.3}%` }}></div>
                                {[
                                    { num: 1, label: 'Entrega' },
                                    { num: 2, label: 'Fidelidade' },
                                    { num: 3, label: 'Pagamento' },
                                    { num: 4, label: 'Confirmação' }
                                ].map(step => (
                                    <div key={step.num} className="flex flex-col items-center bg-white px-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${checkoutStep >= step.num ? 'bg-black text-white' : 'bg-slate-200 text-slate-400'}`}>
                                            {checkoutStep > step.num ? <Icon name="check" size={12} /> : step.num}
                                        </div>
                                        <span className={`text-[9px] font-black mt-1 uppercase tracking-widest ${checkoutStep >= step.num ? 'text-black' : 'text-slate-400'}`}>{step.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50 custom-scrollbar">
                            
                            {checkoutStep === 1 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="space-y-3">
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b border-slate-200 pb-2">Seus Dados</h4>
                                        
                                        {customerFound && (
                                            <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl text-emerald-700 text-xs font-black uppercase flex items-center gap-2 shadow-sm mb-2 animate-slide-up">
                                                <Icon name="check-circle" size={18} /> Cliente Encontrado e Preenchido!
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center justify-between">
                                                    <span>WhatsApp *</span>
                                                    {isSearchingName && <Icon name="loader" size={10} className="animate-spin text-emerald-500" />}
                                                </label>
                                                <input type="text" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} disabled={authStep === 'logged_in'} className={`w-full p-4 border border-slate-200 rounded-xl font-bold outline-none focus:border-black transition-colors ${authStep === 'logged_in' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white'}`} placeholder="(11) 99999-9999" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo *</label>
                                                <input type="text" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} disabled={authStep === 'logged_in' && !!fidelidadeCustomer?.name} className={`w-full p-4 border border-slate-200 rounded-xl font-bold outline-none focus:border-black transition-colors ${authStep === 'logged_in' && !!fidelidadeCustomer?.name ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white'}`} placeholder="Ex: João Silva" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b border-slate-200 pb-2">Como deseja receber?</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                            {cmvSettings.geral_entregas !== false && (
                                                <button onClick={() => setOrderType('entrega')} className={`p-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 border-2 transition-all ${orderType === 'entrega' ? 'border-black bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><Icon name="truck" size={20} /> Entrega</button>
                                            )}
                                            {cmvSettings.geral_retirada !== false && (
                                                <button onClick={() => setOrderType('retirada')} className={`p-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 border-2 transition-all ${orderType === 'retirada' ? 'border-black bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><Icon name="shopping-bag" size={20} /> Retirar</button>
                                            )}
                                            {cmvSettings.geral_local !== false && (
                                                <button onClick={() => setOrderType('local')} className={`p-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 border-2 transition-all ${orderType === 'local' ? 'border-black bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><Icon name="coffee" size={20} /> Local</button>
                                            )}
                                        </div>

                                        {orderType === 'entrega' && (
                                            <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="grid grid-cols-4 gap-3">
                                                    <div className="col-span-3 space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-800 ml-1 flex items-center gap-1"><Icon name="search" size={10}/> Buscar Rua (Auto)</label>
                                                        <input ref={addressInputRef} onFocus={() => {if(window.google && !autocompleteRef.current){const p=new window.google.maps.places.Autocomplete(addressInputRef.current,{componentRestrictions:{country:"br"}});autocompleteRef.current=p;p.addListener("place_changed",()=>{const pl=p.getPlace();if(!pl.geometry)return;const addr=pl.formatted_address;setCheckoutData(pr=>({...pr,address:addr,neighborhood:''}));calcularFretePorKM(addr);});}}} type="text" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-black transition-colors" placeholder="Digite o endereço e selecione..." />
                                                    </div>
                                                    <div className="col-span-1 space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Número *</label>
                                                        <input type="text" value={checkoutData.number} onChange={e => setCheckoutData({...checkoutData, number: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black transition-colors" placeholder="123" />
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Complemento / Ref.</label>
                                                        <input type="text" value={checkoutData.complement} onChange={e => setCheckoutData({...checkoutData, complement: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black text-sm transition-colors" placeholder="Apto, Bloco..." />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Bairro (Opcional)</label>
                                                        <select value={checkoutData.neighborhood} onChange={e => { setCheckoutData({...checkoutData, neighborhood: e.target.value}); handleCalcularTaxaManual(); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black text-sm text-slate-700 transition-colors cursor-pointer">
                                                            <option value="">Apenas se não calcular auto.</option>
                                                            {deliveryAreas.filter(a => !a.isInactive).map(a => (<option key={a.id} value={a.name}>{a.name}</option>))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                    <span className="text-xs font-black text-slate-700 uppercase">
                                                        Taxa: {deliveryInfo.found ? (deliveryInfo.inactive ? '❌ Indisponível' : (deliveryFee === 0 ? 'Grátis' : formatMoney(deliveryFee))) : 'Não calculada'}
                                                    </span>
                                                    <button type="button" onClick={handleCalcularTaxaManual} className="bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-colors shadow-sm">
                                                        Calcular Frete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {cmvSettings.geral_agendamento !== false && (
                                        <div className="space-y-3">
                                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b border-slate-200 pb-2">Agendamento</h4>
                                            <label className={`flex items-center gap-2 mb-2 ${cmvSettings.geral_imediatos === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input type="checkbox" checked={isScheduled} onChange={e => { if (cmvSettings.geral_imediatos !== false) setIsScheduled(e.target.checked); }} disabled={cmvSettings.geral_imediatos === false} className="w-4 h-4 accent-black rounded cursor-pointer" />
                                                <span className="font-black text-xs text-slate-700 uppercase">{cmvSettings.geral_imediatos === false ? 'Agendamento Obrigatório' : 'Deseja agendar o pedido?'}</span>
                                            </label>
                                            
                                            {isScheduled && (
                                                <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Selecione a Data</label>
                                                        <select value={scheduledDate} onChange={e => { setScheduledDate(e.target.value); setScheduledTime(''); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-black outline-none transition-colors text-slate-800 cursor-pointer">
                                                            <option value="">Selecione a data...</option>
                                                            {availableDates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Selecione o Horário</label>
                                                        <select value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-black outline-none transition-colors text-slate-800 cursor-pointer disabled:opacity-50" disabled={!scheduledDate || availableTimes.length === 0}>
                                                            <option value="">{availableTimes.length > 0 ? 'Selecione o horário...' : 'Sem horários disponíveis'}</option>
                                                            {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {checkoutStep === 2 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    {checkoutAuthStep !== 'logged_in' ? (
                                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
                                            <div className="w-16 h-16 bg-slate-100 text-black rounded-full flex items-center justify-center mx-auto mb-4"><Icon name={checkoutAuthStep === 'login' ? 'lock' : 'user-plus'} size={32}/></div>
                                            <h3 className="font-black text-slate-800 text-lg mb-2">Proteja seus Pontos</h3>
                                            <p className="text-sm font-bold text-slate-500 mb-6">
                                                {checkoutAuthStep === 'login' ? 'Digite a sua senha para ver seus pontos e resgatar prêmios.' : 'Crie uma senha de segurança para participar do nosso Clube de Vantagens e ganhar pontos nesta compra.'}
                                            </p>
                                            
                                            <div className="space-y-1 max-w-sm mx-auto">
                                                <input type="password" placeholder="Sua senha secreta" value={fidelidadePassword} onChange={e => setFidelidadePassword(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-black text-center text-lg shadow-inner"/>
                                                {fidelidadeError && <p className="text-xs font-bold text-red-500 text-center mt-2">{fidelidadeError}</p>}
                                            </div>

                                            <div className="max-w-sm mx-auto mt-6 flex flex-col gap-3">
                                                <button onClick={checkoutAuthStep === 'login' ? handleCheckoutLogin : checkoutAuthStep === 'register' ? handleCheckoutRegister : handleCheckoutSetPassword} disabled={fidelidadeLoading} className="w-full py-4 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase transition-colors shadow-md flex justify-center items-center gap-2">
                                                    {fidelidadeLoading ? <Icon name="loader" size={18} className="animate-spin" /> : 'Entrar / Salvar Senha'}
                                                </button>
                                                <button onClick={() => setCheckoutStep(3)} className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase mt-2">Continuar sem Fidelidade</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="border border-slate-200 bg-white p-4 sm:p-5 rounded-2xl flex justify-between items-center shadow-sm">
                                                <span className="font-bold text-slate-500 text-sm md:text-base">Pontos disponíveis</span>
                                                <div className="flex items-center gap-2 border border-emerald-500 text-emerald-600 px-4 py-2 rounded-xl font-black bg-emerald-50 text-base md:text-lg">
                                                    <Icon name="gift" size={18} /> {pontosRestantes}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg mb-4">Prêmios disponíveis para resgates</h4>
                                                <div className="space-y-4">
                                                    
                                                    {(cmvSettings.fidelidade_descontos || []).map(desc => {
                                                        const isApplied = appliedDiscount?.id === desc.id;
                                                        const podeResgatar = pontosRestantes >= desc.pontos;
                                                        return (
                                                            <div key={desc.id} className={`border p-4 rounded-2xl flex items-center justify-between transition-all bg-white ${isApplied ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                                                                <div className="flex gap-4 items-center">
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isApplied ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
                                                                        <Icon name="dollar-sign" size={24} />
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="font-bold text-sm md:text-base text-slate-800">Desconto de {formatMoney(desc.valor)}</h5>
                                                                        <span className="text-xs text-slate-500">Resgate por {desc.pontos} pontos</span>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => isApplied ? setAppliedDiscount(null) : applyDiscountReward(desc)} disabled={!podeResgatar && !isApplied} className={`font-black text-xs md:text-sm uppercase transition-colors ${isApplied ? 'text-red-500 hover:text-red-700' : podeResgatar ? 'text-black hover:text-blue-600' : 'text-slate-300 cursor-not-allowed'}`}>
                                                                    {isApplied ? 'REMOVER' : 'RESGATAR'}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}

                                                    {(cmvSettings.fidelidade_produtos || []).map(prod => {
                                                        const isApplied = cart.some(i => i.isReward && i.productId === prod.productId);
                                                        const isInCartToRedeem = cart.some(i => i.productId === prod.productId && !i.isReward);
                                                        const ptsNecessarios = Math.floor(prod.price * (prod.pontosPorReal || 20));
                                                        const podeResgatar = pontosRestantes >= ptsNecessarios;
                                                        
                                                        return (
                                                            <div key={prod.id} className={`border p-4 rounded-2xl flex items-center justify-between bg-white hover:border-slate-300 transition-colors shadow-sm ${isApplied ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                                                                <div className="flex gap-4 items-center">
                                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-500 border border-emerald-100 overflow-hidden">
                                                                        {prod.imageUrl ? <img src={prod.imageUrl} className="w-full h-full object-cover"/> : <Icon name="package" size={20} />}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="font-bold text-sm md:text-base text-slate-800 line-clamp-1">{prod.name}</h5>
                                                                        <span className="text-[10px] md:text-xs text-slate-500">{formatMoney(prod.price)} • Resgate por {ptsNecessarios} pontos</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {isApplied ? (
                                                                    <button onClick={() => removeRewardFromCart(prod.productId)} className="font-black text-xs md:text-sm uppercase transition-colors shrink-0 text-red-500 hover:text-red-700">
                                                                        REMOVER
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => addRewardToCart(prod)} disabled={!podeResgatar || (!isInCartToRedeem && !podeResgatar)} className={`font-black text-xs md:text-sm uppercase transition-colors shrink-0 ${(podeResgatar && isInCartToRedeem) ? 'text-black hover:text-emerald-600' : 'text-slate-300 cursor-not-allowed'}`}>
                                                                        {podeResgatar ? (isInCartToRedeem ? 'RESGATAR' : 'ADD À SACOLA 1º') : 'FALTAM PONTOS'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {checkoutStep === 3 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="space-y-3">
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b border-slate-200 pb-2">Forma de Pagamento</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {availablePaymentMethods.map(method => (
                                                <button 
                                                    key={method.id} 
                                                    onClick={() => {
                                                        setCheckoutData({...checkoutData, paymentMethod: method.name});
                                                        if (!method.name.toLowerCase().includes('dinheiro')) setCheckoutData(prev => ({...prev, troco: ''}));
                                                    }} 
                                                    className={`p-4 rounded-xl font-black text-[13px] uppercase flex flex-col items-center justify-center gap-2 border-2 transition-all ${checkoutData.paymentMethod === method.name ? 'border-black bg-slate-900 text-white shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    <Icon name={method.name.toLowerCase().includes('dinheiro') ? 'dollar-sign' : method.name.toLowerCase().includes('pix') ? 'smartphone' : 'credit-card'} size={24} /> 
                                                    {method.name}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {checkoutData.paymentMethod && checkoutData.paymentMethod.toLowerCase().includes('dinheiro') && (
                                            <div className="w-full mt-4 space-y-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-center ml-1 mb-2">
                                                    <label className="text-[11px] font-black uppercase text-emerald-600">Troco para quanto?</label>
                                                    <button type="button" onClick={() => setCheckoutData({...checkoutData, troco: finalTotal.toFixed(2)})} className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 border border-emerald-200 px-3 py-1 rounded hover:bg-emerald-100 transition-colors">Valor Exato</button>
                                                </div>
                                                <input type="number" step="0.01" value={checkoutData.troco} onChange={e => setCheckoutData({...checkoutData, troco: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-emerald-300 rounded-xl font-bold text-lg outline-none focus:border-emerald-600 transition-colors" placeholder={`Ex: ${finalTotal.toFixed(2)}`} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Observações Gerais</label>
                                        <textarea placeholder="Ex: Informações sobre entrega, pacote, etc..." value={checkoutData.observation} onChange={e => setCheckoutData({...checkoutData, observation: e.target.value})} rows="3" className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold focus:border-black outline-none bg-slate-50 resize-none transition-colors"></textarea>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === 4 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest text-center">Resumo do Pedido</h4>
                                        </div>
                                        <div className="p-6">
                                            <div className="space-y-3 border-b border-slate-100 pb-4 mb-4">
                                                {cart.map((cItem) => (
                                                    <div key={cItem.id} className={`flex justify-between items-start text-[13px] ${cItem.isReward ? 'bg-purple-50 p-2 rounded-lg border border-purple-100' : ''}`}>
                                                        <div className="flex gap-3">
                                                            <span className={`font-black ${cItem.isReward ? 'text-purple-600' : 'text-slate-400'}`}>{cItem.qty}x</span>
                                                            <div>
                                                                <p className={`font-bold ${cItem.isReward ? 'text-purple-800' : 'text-slate-800'}`}>{cItem.name}</p>
                                                                {cItem.variationsDesc && <p className="text-[10px] text-slate-500 font-bold leading-tight mt-1">{cItem.variationsDesc}</p>}
                                                            </div>
                                                        </div>
                                                        <span className="font-black text-slate-700 shrink-0">{cItem.isReward ? 'Grátis' : formatMoney(cItem.price * cItem.qty)}</span>
                                                    </div>
                                                ))}
                                                {appliedDiscount && (
                                                    <div className="flex justify-between items-start text-[13px] bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                        <div className="flex gap-3">
                                                            <span className="font-black text-blue-600">1x</span>
                                                            <p className="font-bold text-blue-800">🎁 {appliedDiscount.nome}</p>
                                                        </div>
                                                        <span className="font-black text-blue-600 shrink-0">-{formatMoney(appliedDiscount.valor)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2 text-sm font-bold text-slate-500">
                                                <div className="flex justify-between"><span>Subtotal:</span><span>{formatMoney(cartTotal)}</span></div>
                                                {orderType === 'entrega' && <div className="flex justify-between"><span>Taxa de Entrega:</span><span>{formatMoney(deliveryFee)}</span></div>}
                                                {appliedDiscount && (
                                                    <div className="flex justify-between text-blue-600"><span>Desconto Fidelidade:</span><span>-{formatMoney(appliedDiscount.valor)}</span></div>
                                                )}
                                                
                                                <div className="flex justify-between pt-4 border-t border-slate-200 mt-4 items-center">
                                                    <span className="font-black uppercase text-slate-800 text-xs tracking-widest">Total a Pagar:</span>
                                                    <span className="text-2xl font-black text-emerald-600">{formatMoney(finalTotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 space-y-1">
                                        <p className="flex justify-between"><span>Forma de Pagamento:</span><span className="font-black text-slate-800 uppercase">{checkoutData.paymentMethod}</span></p>
                                        <p className="flex justify-between"><span>Recebimento:</span><span className="font-black text-slate-800 uppercase">{orderType}</span></p>
                                        {checkoutData.phone && <p className="flex justify-between"><span>WhatsApp:</span><span className="font-black text-slate-800">{checkoutData.phone}</span></p>}
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="p-5 border-t border-slate-200 bg-white shrink-0 flex items-center gap-3">
                            {checkoutStep > 1 && (
                                <button onClick={() => setCheckoutStep(checkoutStep - 1)} className="w-[120px] py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-sm transition-transform active:scale-95 text-[11px]">
                                    <Icon name="chevron-left" size={16} /> Voltar
                                </button>
                            )}
                            
                            {checkoutStep === 1 && (
                                <button onClick={handleNextToLoyalty} className="flex-1 py-4 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 text-[13px]">
                                    Continuar <Icon name="chevron-right" size={16} />
                                </button>
                            )}
                            {checkoutStep === 2 && (
                                <button onClick={() => setCheckoutStep(3)} className="flex-1 py-4 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 text-[13px]">
                                    Continuar p/ Pagto. <Icon name="chevron-right" size={16} />
                                </button>
                            )}
                            {checkoutStep === 3 && (
                                <button onClick={() => setCheckoutStep(4)} className="flex-1 py-4 bg-black hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 text-[13px]">
                                    Revisar Pedido <Icon name="chevron-right" size={16} />
                                </button>
                            )}
                            {checkoutStep === 4 && (
                                <button onClick={handleFinalizarPedido} disabled={isSubmitting} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 text-[13px]">
                                    {isSubmitting ? <Icon name="loader" size={18} className="animate-spin" /> : <><Icon name="check" size={18} /> Finalizar Pedido</>}
                                </button>
                            )}
                        </div>
                    </div>