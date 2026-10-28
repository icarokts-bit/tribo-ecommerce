import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase'; 
import Icon from '../../components/Icon';

const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const p = (val) => parseFloat(String(val).replace(',', '.')) || 0;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CLOUD_FUNCTIONS_URL = "https://us-central1-tribo-sistemas-saas.cloudfunctions.net";

const getCategoryIcon = (catName = '') => {
    const norm = catName.toLowerCase();
    if (norm === 'início' || norm === 'destaques') return 'star'; 
    if (norm.includes('hambur') || norm.includes('burguer')) return 'disc';
    if (norm.includes('smash')) return 'zap';
    if (norm.includes('frango')) return 'feather';
    if (norm.includes('salada')) return 'leaf';
    if (norm.includes('porç') || norm.includes('porc')) return 'grid';
    if (norm.includes('bebi')) return 'coffee';
    if (norm.includes('sobre')) return 'gift';
    if (norm.includes('acrés') || norm.includes('acres')) return 'plus-circle';
    return 'shopping-bag';
};

function formatarTelefone(telefone) {
    if (!telefone) return '';
    let limpo = String(telefone).replace(/\D/g, '');
    if (limpo.length === 10 || limpo.length === 11) limpo = '55' + limpo;
    return limpo;
}

const normalizePhone = (phone) => {
    if (!phone) return "";
    let num = String(phone).replace(/\D/g, "");
    if (num.startsWith("55") && num.length >= 12) num = num.substring(2);
    if (num.length === 11 && num[2] === '9') num = num.substring(0, 2) + num.substring(3);
    return num;
};

export default function TotemPDV() {
    const { slug } = useParams();
    const navigate = useNavigate();
    
    const [shopUid, setShopUid] = useState(null);
    const [shopConfig, setShopConfig] = useState(null);
    const [cmvSettings, setCmvSettings] = useState({});
    const [catalogItems, setCatalogItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [complementGroups, setComplementGroups] = useState([]);
    
    const [paymentOptions, setPaymentOptions] = useState(['Pagar no Caixa']);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [trocoPara, setTrocoPara] = useState('');
    
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productQty, setProductQty] = useState(1);
    const [productObs, setProductObs] = useState('');
    const [selectedComplements, setSelectedComplements] = useState({});
    
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('tipo_consumo'); 
    const [tipoConsumo, setTipoConsumo] = useState(''); 
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [matchedClientId, setMatchedClientId] = useState(null);
    const [isSearchingPhone, setIsSearchingPhone] = useState(false);
    
    // --- ESTADOS DO FIDELIDADE E MINHA CONTA ---
    const [isFidelidadeModalOpen, setIsFidelidadeModalOpen] = useState(false);
    const [authStep, setAuthStep] = useState('phone'); 
    const [checkoutAuthStep, setCheckoutAuthStep] = useState('check'); 
    const [fidelidadePhone, setFidelidadePhone] = useState('');
    const [fidelidadeName, setFidelidadeName] = useState('');
    const [fidelidadePassword, setFidelidadePassword] = useState('');
    const [fidelidadeError, setFidelidadeError] = useState('');
    const [fidelidadeLoading, setFidelidadeLoading] = useState(false);
    const [fidelidadeCustomer, setFidelidadeCustomer] = useState(null);
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    
    // --- ESTADOS DO HISTÓRICO DE PEDIDOS ---
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyPhone, setHistoryPhone] = useState('');
    const [historyPassword, setHistoryPassword] = useState('');
    const [historyError, setHistoryError] = useState('');
    const [historyOrders, setHistoryOrders] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyStep, setHistoryStep] = useState('auth'); 

    const [successOrderInfo, setSuccessOrderInfo] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const carouselRef = useRef(null);

    const scrollCarousel = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = 400; 
            carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    // TEMPORIZADOR DE INATIVIDADE (Volta para a tela de descanso)
    useEffect(() => {
        let timeoutId;
        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setShowWelcomeScreen(true);
                setCart([]); 
                setSelectedProduct(null);
                setIsCheckoutModalOpen(false);
                setIsMobileCartOpen(false);
                setCustomerName('');
                setCustomerPhone('');
                setTipoConsumo('');
                setSelectedPaymentMethod('');
                setTrocoPara('');
                setSelectedCategory('Início');
                
                // Reset Geral de Estados
                setFidelidadeCustomer(null);
                setAppliedDiscount(null);
                setIsFidelidadeModalOpen(false);
                setFidelidadePhone('');
                setFidelidadeName('');
                setFidelidadePassword('');
                setAuthStep('phone');
                setCheckoutAuthStep('check');

                setIsHistoryModalOpen(false);
                setHistoryPhone('');
                setHistoryPassword('');
                setHistoryStep('auth');
            }, 60000); 
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('mousedown', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('keypress', resetTimer);

        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('mousedown', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('keypress', resetTimer);
        };
    }, []);

    // CARREGAR DADOS DA LOJA
    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/totem/init/${slug}`);
                if (!response.ok) throw new Error('Falha ao inicializar');
                
                const data = await response.json();
                setShopUid(data.shopUid);
                setCatalogItems(data.activeProducts || []);
                setComplementGroups(data.complementGroups || []);
                setShopConfig(data.shopConfig || {});
                setCmvSettings(data.shopConfig || {});

                const rawCats = [...new Set((data.activeProducts || []).map(p => p.category))].filter(Boolean);
                const finalCategories = ['Início', ...rawCats];
                
                setCategories(finalCategories);
                setSelectedCategory('Início');

                if (data.shopUid) {
                    try {
                        const paySnap = await db.doc(`artifacts/tribo-burger-financeiro/users/${data.shopUid}/settings/paymentMethods`).get();
                        if (paySnap.exists && paySnap.data().methods) {
                            const loadedMethods = paySnap.data().methods.map(m => m.name);
                            if (loadedMethods.length > 0) setPaymentOptions(loadedMethods);
                        }
                    } catch (err) {
                        console.error("Aviso: Falha ao carregar métricas secundárias", err);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error("Erro ao carregar o Totem:", error);
                setLoading(false);
            }
        };
        fetchShopData();
    }, [slug]);

    const cartTotalBruto = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const valorDescontoFidelidade = appliedDiscount ? Number(appliedDiscount.valor) : 0;
    const finalTotal = Math.max(0, cartTotalBruto - valorDescontoFidelidade);
    
    const pontosUsadosNosProdutos = cart.filter(i => i.isReward).reduce((acc, i) => acc + (i.pointsCost * i.qty), 0);
    const pontosUsadosNoDesconto = appliedDiscount ? appliedDiscount.pontos : 0;
    const pontosUsadosNoCarrinho = pontosUsadosNosProdutos + pontosUsadosNoDesconto;
    const pontosRestantes = Math.max(0, fidelidadeCustomer ? ((fidelidadeCustomer.pontosAtuais || 0) - pontosUsadosNoCarrinho) : 0);

    const callFidelidadeApi = async (payload) => {
        try {
            const response = await fetch(`${CLOUD_FUNCTIONS_URL}/apiFidelidade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload })
            });
            if (!response.ok) throw new Error("Erro de rede");
            const json = await response.json();
            if (json.data && json.data.error) throw new Error(json.data.error);
            return json.data;
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const processCustomerLoyalty = (cust) => {
        if (!cust) return;
        let saldoCalculado = 0;
        if (cust.saldoExato !== undefined) {
            saldoCalculado = Number(cust.saldoExato);
        } else {
            const totalGastoNuvem = Number(cust.totalSpent) || 0;
            const ptsReais = Math.floor(totalGastoNuvem * (parseFloat(cmvSettings.fidelidade_pontosPorReal) || 1));
            const ptsManuais = Number(cust.manualPoints !== undefined ? cust.manualPoints : (cust.points !== undefined ? cust.points : (cust.pontos || 0)));
            const ptsUsadosReais = Number(cust.pontosUsadosReais || 0);

            saldoCalculado = Math.max(0, ptsReais + ptsManuais - ptsUsadosReais);
        }
        const updatedCust = { ...cust, pontosAtuais: saldoCalculado };
        setFidelidadeCustomer(updatedCust);
    };

    // =========================================================
    // FUNÇÕES DO HISTÓRICO DE PEDIDOS COM FALLBACK E REFRESH
    // =========================================================
    const fetchOrderHistory = async (phoneToSearch) => {
        setHistoryStep('list');
        setHistoryLoading(true);
        try {
            const limpo = normalizePhone(phoneToSearch);
            const rawSearchDigits = limpo.replace(/\D/g, '');
            const searchSuffix = rawSearchDigits.length > 8 ? rawSearchDigits.slice(-8) : rawSearchDigits;

            const snap = await db.collection(`artifacts/tribo-burger-financeiro/users/${shopUid}/delivery_orders`)
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
            const result = await callFidelidadeApi({ acao: 'consultar', donoUid: shopUid, phone: limpo });
            
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
            if (customerPhone) setHistoryPhone(customerPhone);
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
            const result = await callFidelidadeApi({ acao: 'consultar', donoUid: shopUid, phone: limpo });
            
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
             setIsMobileCartOpen(true);
        }
    };
    // =========================================================

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setProductQty(1);
        setProductObs('');
        setSelectedComplements({});
    };

    const getGroupsToDisplay = () => {
        if (!selectedProduct) return [];
        if (selectedProduct.linkedGroups?.length > 0) {
            return selectedProduct.linkedGroups.map(id => complementGroups.find(g => g.id === id)).filter(Boolean);
        }
        return selectedProduct.complements || selectedProduct.complementos || selectedProduct.groups || selectedProduct.opcionais || [];
    };

    const getQtyComplement = (groupId, itemId) => {
        const arr = selectedComplements[groupId] || [];
        const found = arr.find(x => (x.id || x.name || x.nome) === itemId);
        return found ? found.qty : 0;
    };

    const handleUpdateComplement = (group, item, delta) => {
        const gId = group.id || group.name;
        const iId = item.id || item.name || item.nome;
        const currentArr = selectedComplements[gId] || [];
        const currentQty = getQtyComplement(gId, iId);
        const maxForGroup = parseInt(group.max) || 99;
        const currentGroupTotalQty = currentArr.reduce((sum, i) => sum + i.qty, 0);

        if (delta > 0) {
            if (maxForGroup === 1) {
                setSelectedComplements(prev => ({ ...prev, [gId]: [{ ...item, qty: 1 }] }));
                return;
            }
            if (currentGroupTotalQty >= maxForGroup) return; 
            if (currentQty >= (parseInt(item.maxQtd) || 1)) return; 

            if (currentQty === 0) {
                setSelectedComplements(prev => ({ ...prev, [gId]: [...currentArr, { ...item, qty: 1 }] }));
            } else {
                setSelectedComplements(prev => ({
                    ...prev,
                    [gId]: currentArr.map(x => (x.id || x.name || x.nome) === iId ? { ...x, qty: x.qty + 1 } : x)
                }));
            }
        } else if (delta < 0) {
            if (currentQty <= 1) {
                setSelectedComplements(prev => ({
                    ...prev,
                    [gId]: currentArr.filter(x => (x.id || x.name || x.nome) !== iId)
                }));
            } else {
                setSelectedComplements(prev => ({
                    ...prev,
                    [gId]: currentArr.map(x => (x.id || x.name || x.nome) === iId ? { ...x, qty: x.qty - 1 } : x)
                }));
            }
        }
    };

    const getModalComputedPrice = () => {
        if (!selectedProduct) return 0;
        const basePrice = selectedProduct.promoPrice > 0 ? selectedProduct.promoPrice : selectedProduct.price;
        let compTotal = 0;
        Object.values(selectedComplements).forEach(arr => {
            arr.forEach(item => { compTotal += (Number(item.price || item.valor || 0) * item.qty); });
        });
        return (Number(basePrice) + compTotal) * Number(productQty || 1);
    };

    const handleAddToCart = () => {
        if (!selectedProduct) return;
        const groups = getGroupsToDisplay();
        for (const group of groups) {
            const gId = group.id || group.name;
            const min = parseInt(group.min) || 0;
            const currentArr = selectedComplements[gId] || [];
            const currentGroupTotalQty = currentArr.reduce((sum, i) => sum + i.qty, 0);
            if (currentGroupTotalQty < min) {
                alert(`Por favor, selecione pelo menos ${min} opção(ões) em "${group.name || group.nome}".`);
                return;
            }
        }

        const basePrice = selectedProduct.promoPrice > 0 ? selectedProduct.promoPrice : selectedProduct.price;
        let compTotal = 0;
        const compNames = [];
        Object.values(selectedComplements).forEach(arr => {
            arr.forEach(item => {
                compTotal += (Number(item.price || item.valor || 0) * item.qty);
                compNames.push(`${item.qty > 1 ? item.qty + 'x ' : ''}${item.name || item.nome}`);
            });
        });

        const unitItemPrice = Number(basePrice) + compTotal;
        const newItem = {
            id: crypto.randomUUID(),
            productId: selectedProduct.id,
            name: selectedProduct.name,
            basePrice: basePrice,
            totalItemPrice: unitItemPrice,
            price: unitItemPrice,
            qty: productQty,
            observation: productObs,
            complementsDesc: compNames.join(', '),
            isReward: false
        };
        
        setCart([...cart, newItem]);
        setSelectedProduct(null);
    };

    const handleRemoveFromCart = (cartId) => {
        setCart(cart.filter(item => item.id !== cartId));
    };

    const openCheckout = () => {
        setCheckoutStep('tipo_consumo');
        setTipoConsumo('');
        setCustomerPhone('');
        setCustomerName('');
        setSelectedPaymentMethod('');
        setTrocoPara('');
        setMatchedClientId(null);
        setFidelidadeCustomer(null);
        setAppliedDiscount(null);
        setIsCheckoutModalOpen(true);
    };

    const handleTipoConsumoSelect = (tipo) => {
        setTipoConsumo(tipo);
        setCheckoutStep('phone');
    };

    const handlePhoneNext = async () => {
        const cleanPhone = formatarTelefone(customerPhone);
        if (cleanPhone.length < 8) {
            alert("Por favor, digite um telefone válido.");
            return;
        }

        setIsSearchingPhone(true);
        try {
            const response = await fetch(`${API_BASE}/api/totem/lookup-customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, phone: cleanPhone })
            });
            const data = await response.json();
            if (data.found) {
                setMatchedClientId(data.clientId);
                if (data.name) setCustomerName(data.name);
            } else {
                setMatchedClientId(null);
            }
        } catch (error) {
            setMatchedClientId(null);
        } finally {
            setIsSearchingPhone(false);
            setCheckoutStep('name');
        }
    };

    const handleNameNext = async () => {
        if (!customerName.trim()) {
            alert("Por favor, digite seu nome!");
            return;
        }

        if (cmvSettings.fidelidade_ativo && cmvSettings.fidelidade_canalPortal !== false) {
            setCheckoutStep('fidelidade_auth');
            setFidelidadeLoading(true);
            setFidelidadeError('');
            
            let limpo = normalizePhone(customerPhone);
            try {
                const result = await callFidelidadeApi({ acao: 'consultar', donoUid: shopUid, phone: limpo });
                if (result && result.success && result.found) {
                    const cust = result.customer;
                    processCustomerLoyalty(cust);
                    if (cust.password) setAuthStep('login');
                    else setAuthStep('set_password');
                } else {
                    setAuthStep('register');
                }
            } catch(e) { }
            setFidelidadeLoading(false);
        } else {
            setCheckoutStep('payment');
        }
    };

    const handleLoginFidelidade = () => {
        if (!fidelidadePassword) { setFidelidadeError("Digite sua senha."); return; }
        if (fidelidadeCustomer.password === fidelidadePassword) {
            setFidelidadeError('');
            processCustomerLoyalty(fidelidadeCustomer);
            setCheckoutStep('fidelidade_loja'); 
        } else {
            setFidelidadeError("Senha incorreta.");
        }
    };

    const handleRegisterFidelidade = async () => {
        if (!fidelidadePassword) { setFidelidadeError("Crie uma senha."); return; }
        setFidelidadeError('');
        setFidelidadeLoading(true);
        let limpo = normalizePhone(customerPhone);

        try {
            const result = await callFidelidadeApi({
                acao: 'registrar', donoUid: shopUid, phone: limpo, name: customerName, password: fidelidadePassword,
                bonusAtivo: cmvSettings.fidelidade_bonusAtivo, bonusPontos: cmvSettings.fidelidade_bonusPontos
            });
            if (result && result.success) {
                processCustomerLoyalty(result.customer);
                setCheckoutStep('fidelidade_loja');
            } else {
                setFidelidadeError(result.error || "Falha ao criar conta.");
            }
        } catch (error) { setFidelidadeError("Falha ao criar conta."); }
        setFidelidadeLoading(false);
    };

    const handleSetPasswordFidelidade = async () => {
        if (!fidelidadePassword) { setFidelidadeError("Crie uma senha."); return; }
        setFidelidadeError('');
        setFidelidadeLoading(true);
        try {
            const result = await callFidelidadeApi({
                acao: 'atualizar_senha', donoUid: shopUid, customerId: fidelidadeCustomer.id, password: fidelidadePassword
            });
            if (result && result.success) {
                const updatedCust = { ...fidelidadeCustomer, password: fidelidadePassword };
                processCustomerLoyalty(updatedCust);
                setCheckoutStep('fidelidade_loja');
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
        const existingItemIndex = cart.findIndex(item => item.productId === prod.productId && !item.isReward);
        
        if (existingItemIndex >= 0) {
            const newCart = [...cart];
            const existingItem = newCart[existingItemIndex];
            
            if (existingItem.qty > 1) {
                existingItem.qty -= 1;
                newCart.push({ ...existingItem, id: crypto.randomUUID(), qty: 1, originalPrice: existingItem.price, price: 0, totalItemPrice: 0, name: `🎁 [RESGATE] ${existingItem.name}`, isReward: true, pointsCost: ptsCalculados });
            } else {
                existingItem.originalPrice = existingItem.price;
                existingItem.price = 0;
                existingItem.totalItemPrice = 0;
                existingItem.name = `🎁 [RESGATE] ${existingItem.name}`;
                existingItem.isReward = true;
                existingItem.pointsCost = ptsCalculados;
            }
            setCart(newCart);
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
                const samePaid = newCart.find(i => i.productId === productId && !i.isReward && i.complementsDesc === rewardItem.complementsDesc && i.observation === rewardItem.observation);
                if (samePaid) { samePaid.qty += 1; } 
                else { newCart.push({ ...rewardItem, id: crypto.randomUUID(), price: rewardItem.originalPrice, totalItemPrice: rewardItem.originalPrice, name: cleanName, isReward: false, pointsCost: 0, originalPrice: undefined }); }
            }
            setCart(newCart);
        }
    };

    const applyDiscountReward = (desc) => {
        if (cart.some(i => i.isReward)) {
            alert("Atenção: Já existe um produto resgatado na sacola. Só é permitido 1 resgate por pedido.");
            return;
        }
        setAppliedDiscount({ id: desc.id, valor: desc.valor, pontos: desc.pontos, nome: `Desconto de ${formatMoney(desc.valor)}` });
    };

    const finalizeOrder = async () => {
        if (!selectedPaymentMethod) {
            alert("Por favor, selecione uma forma de pagamento!");
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        const telefoneFinalizado = formatarTelefone(customerPhone);
        
        let observacaoFinal = '';
        if (pontosUsadosNoCarrinho > 0) {
            observacaoFinal = `[RESGATE DE ${pontosUsadosNoCarrinho} PONTOS] `;
        }

        const arrayItensBase = cart.map(i => ({
            id: String(i.productId || i.id || 'sem-id'),
            itemId: String(i.productId || i.id || 'sem-id'),
            cartItemId: String(i.id), 
            name: String(i.name),
            nome: String(i.name),
            price: Number(i.isReward ? (i.originalPrice || 0) : i.price) || 0,
            preco: Number(i.isReward ? (i.originalPrice || 0) : i.price) || 0,
            valor: Number(i.isReward ? (i.originalPrice || 0) : i.price) || 0,
            qty: Number(i.qty) || 1,
            quantidade: Number(i.qty) || 1,
            type: 'recipe',
            observation: String(i.observation || ''),
            observacao: String(i.observation || ''),
            complementsDesc: String(i.complementsDesc || ''),
            isReward: Boolean(i.isReward || false),
            pointsCost: Number(i.pointsCost) || 0
        }));

        try {
            const response = await fetch(`${API_BASE}/api/totem/finalize-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug,
                    customerName: customerName.trim(),
                    customerPhone: telefoneFinalizado, 
                    tipoConsumo,
                    cart: arrayItensBase,
                    cartTotal: finalTotal,
                    discountAmount: valorDescontoFidelidade,
                    pontosUsados: pontosUsadosNoCarrinho,
                    customerId: fidelidadeCustomer ? fidelidadeCustomer.id : null,
                    paymentMethod: selectedPaymentMethod,
                    trocoPara: trocoPara,
                    observation: observacaoFinal
                })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Erro ao enviar');

            setSuccessOrderInfo({
                numero: data.numero,
                nome: customerName.trim(),
                tipoConsumo
            });
            
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setTipoConsumo('');
            setSelectedPaymentMethod('');
            setTrocoPara('');
            setMatchedClientId(null);
            setFidelidadeCustomer(null);
            setAppliedDiscount(null);
            setIsCheckoutModalOpen(false);
            setIsMobileCartOpen(false);
            setIsSubmitting(false); 
            
            setTimeout(() => {
                setSuccessOrderInfo(null);
                if (categories.length > 0) setSelectedCategory(categories[0]);
                setShowWelcomeScreen(true);
            }, 8000);

        } catch (error) {
            console.error("Erro seguro ao finalizar pedido:", error);
            alert("Houve um erro ao enviar seu pedido. Chame um atendente.");
            setIsSubmitting(false); 
        }
    };

    if (loading) return <div className="h-[100dvh] w-full flex items-center justify-center font-black text-2xl text-amber-400 uppercase bg-slate-950">Carregando Autoatendimento...</div>;

    if (successOrderInfo) {
        return (
            <div className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up select-none text-white">
                <div className="bg-slate-900 border border-slate-800 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col items-center gap-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mb-4">
                        <Icon name="check" size={64} />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">Pedido Enviado!</h1>
                    <div className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-6 py-2 rounded-full text-sm sm:text-base font-black uppercase tracking-wider">
                        {successOrderInfo.tipoConsumo}
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-slate-300">{successOrderInfo.nome}, sua senha é:</p>
                    <div className="bg-slate-950 text-amber-400 text-6xl sm:text-7xl font-black px-10 sm:px-12 py-6 rounded-3xl tracking-widest my-4 border border-slate-800 shadow-inner">
                        #{successOrderInfo.numero}
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-red-400 uppercase mt-2 text-center">
                        Dirija-se ao caixa para realizar o pagamento e aguarde ser chamado.
                    </p>
                    <p className="text-slate-500 font-bold mt-6">Esta tela reiniciará automaticamente...</p>
                </div>
            </div>
        );
    }

    const isMainPage = selectedCategory === 'Início';
    const filteredProducts = isMainPage 
        ? catalogItems.filter(p => Number(p.promoPrice) > 0)
        : catalogItems.filter(p => p.category === selectedCategory);
    const featuredProducts = catalogItems.filter(p => p.destaque === true || p.isDestaque === true || p.featured === true || p.recomendado === true);
    
    const bannerUrl = shopConfig?.bannerUrl || shopConfig?.coverUrl || '';
    const totemCoverUrl = shopConfig?.totemCoverUrl || bannerUrl; 

    if (showWelcomeScreen) {
        const isHorizontal = shopConfig?.totemOrientation === 'horizontal';

        return (
            <div 
                className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-end cursor-pointer select-none overflow-hidden animate-fade-in-up"
                onClick={() => setShowWelcomeScreen(false)}
            >
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes kenBurns {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.03); }
                        100% { transform: scale(1); }
                    }
                    .animate-ken-burns {
                        animation: kenBurns 20s ease-in-out infinite;
                    }
                `}} />

                {totemCoverUrl ? (
                    <img 
                        src={totemCoverUrl} 
                        alt="Capa Totem" 
                        className={`absolute inset-0 w-full h-full animate-ken-burns ${isHorizontal ? 'object-fill' : 'object-contain'}`} 
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center animate-ken-burns">
                        <Icon name="image" size={100} className="text-slate-800" />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                
                <div className="relative z-10 w-full px-6 pb-20 sm:pb-32 flex flex-col items-center animate-bounce">
                    <div className="bg-amber-400 text-slate-950 w-full max-w-md py-6 sm:py-8 rounded-full font-black text-2xl sm:text-3xl uppercase tracking-widest shadow-[0_0_50px_rgba(251,191,36,0.8)] flex items-center justify-center gap-4 pointer-events-none">
                        <Icon name="shopping-bag" size={36} /> Faça seu pedido
                    </div>
                    <p className="text-white font-black uppercase tracking-widest mt-6 text-sm sm:text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Toque em qualquer lugar para iniciar</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
            
            {/* LADO ESQUERDO/TOPO: MENU DE CATEGORIAS */}
            <div className="w-full lg:w-32 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-row lg:flex-col items-center p-3 lg:py-6 gap-3 shrink-0 overflow-x-auto lg:overflow-y-auto z-30" style={{ scrollbarWidth: 'none' }}>
                {shopConfig?.logoUrl ? (
                    <img src={shopConfig.logoUrl} alt="Logo" className="hidden lg:block w-14 h-14 object-cover rounded-2xl bg-white p-1 mb-2 shadow-md shrink-0" />
                ) : (
                    <div className="hidden lg:flex w-14 h-14 bg-amber-400 text-slate-950 rounded-2xl items-center justify-center font-black mb-2 shadow-md shrink-0">
                        <Icon name="shopping-bag" size={28} />
                    </div>
                )}
                
                <span className="hidden lg:block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Menu</span>

                {categories.map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`shrink-0 w-24 lg:w-26 py-3 lg:py-4 px-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${
                                isSelected 
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-lg lg:scale-105' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-bold'
                            }`}
                        >
                            <Icon name={getCategoryIcon(cat)} size={20} className="lg:w-6 lg:h-6" />
                            <span className="text-[10px] lg:text-[11px] leading-tight text-center line-clamp-2 uppercase tracking-tight">{cat}</span>
                        </button>
                    );
                })}

                {/* BOTÃO PEDIDOS / HISTÓRICO FIXO NA BARRA ESQUERDA DO TOTEM */}
                <button onClick={openHistoryModal} className="shrink-0 w-24 lg:w-26 py-3 lg:py-4 px-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-slate-400 hover:text-white hover:bg-slate-800/60 font-bold mt-auto border border-slate-800">
                    <Icon name="clock" size={20} className="lg:w-6 lg:h-6" />
                    <span className="text-[10px] lg:text-[11px] leading-tight text-center line-clamp-2 uppercase tracking-tight">Pedidos</span>
                </button>
            </div>

            {/* CENTRO: BANNER DE TOPO MAIOR + PRODUTOS */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="h-40 md:h-56 lg:h-72 bg-slate-900 relative overflow-hidden shrink-0 border-b border-slate-800 flex items-center">
                    {bannerUrl ? (
                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-amber-500/20 flex items-center px-6 lg:px-10">
                            <div>
                                <span className="bg-amber-400 text-slate-950 text-[10px] lg:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Autoatendimento</span>
                                <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight mt-2">{shopConfig?.companyName || 'Faça seu pedido'}</h2>
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-4 md:p-6">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-amber-400 drop-shadow-md">
                            {isMainPage ? 'Destaques e Promoções' : selectedCategory}
                        </h1>
                    </div>
                </div>

                {/* CONTEÚDO ROLÁVEL (CARROSSEL + GRADE DE PRODUTOS) */}
                <div className="flex-1 overflow-y-auto pb-8">
                    
                    {/* CARROSSEL DE DESTAQUES */}
                    {isMainPage && featuredProducts.length > 0 && (
                        <div className="pt-6 px-4 lg:px-6 relative group">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg lg:text-xl font-black text-white uppercase flex items-center gap-2">
                                    <Icon name="star" size={20} className="text-amber-400 fill-amber-400" /> Destaques
                                </h2>
                            </div>
                            
                            <div className="relative">
                                <button 
                                    onClick={() => scrollCarousel('left')}
                                    className="hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-slate-800 hover:bg-amber-400 text-white hover:text-slate-900 rounded-full items-center justify-center shadow-xl border-2 border-slate-900 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Icon name="chevron-left" size={24} />
                                </button>

                                <div 
                                    ref={carouselRef}
                                    className="flex overflow-x-auto gap-4 pb-4 snap-x scroll-smooth" 
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    {featuredProducts.map(product => {
                                        const price = Number(product.promoPrice) > 0 ? Number(product.promoPrice) : Number(product.price || 0);
                                        const rewardInfo = (cmvSettings.fidelidade_produtos || []).find(rp => rp.productId === product.id);

                                        return (
                                            <div 
                                                key={`feat-${product.id}`} 
                                                onClick={() => openProductModal(product)} 
                                                className="snap-start shrink-0 w-[300px] lg:w-[380px] bg-slate-900 border border-amber-400/30 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                                            >
                                                {product.imageUrl ? (
                                                    <div className="w-full h-56 lg:h-64 relative">
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                        <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-[11px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-md">
                                                            Recomendado
                                                        </div>
                                                        {rewardInfo && cmvSettings.fidelidade_ativo && (
                                                            <div className="absolute top-3 right-3 w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-slate-950 shadow-lg z-10" title="Resgate com Pontos">
                                                                <Icon name="gift" size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-56 lg:h-64 bg-slate-800 flex items-center justify-center text-slate-600 relative">
                                                        <Icon name="image" size={48} />
                                                        <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-[11px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-md">
                                                            Recomendado
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="p-5 flex flex-col flex-1 justify-between gap-3">
                                                    <div>
                                                        <h3 className="font-black text-white text-xl lg:text-2xl leading-tight line-clamp-2">{product.name}</h3>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-auto">
                                                        <span className="text-2xl lg:text-3xl font-black text-amber-400">{formatMoney(price)}</span>
                                                        <div className="bg-amber-400 text-slate-950 rounded-xl px-5 py-2.5 font-black text-sm uppercase shadow-md flex items-center gap-1">
                                                            <Icon name="plus" size={18} /> Add
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button 
                                    onClick={() => scrollCarousel('right')}
                                    className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-slate-800 hover:bg-amber-400 text-white hover:text-slate-900 rounded-full items-center justify-center shadow-xl border-2 border-slate-900 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Icon name="chevron-right" size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {isMainPage && filteredProducts.length > 0 && (
                        <div className="pt-2 px-4 lg:px-6 mb-2">
                            <h2 className="text-lg lg:text-xl font-black text-white uppercase flex items-center gap-2">
                                <Icon name="zap" size={20} className="text-red-500 fill-red-500" /> Promoções Ativas
                            </h2>
                        </div>
                    )}
                    
                    <div className={`p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start ${isMainPage && featuredProducts.length > 0 ? 'pt-2' : ''}`}>
                        {filteredProducts.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-16">
                                <p className="text-base lg:text-lg font-bold uppercase">
                                    {isMainPage ? 'Nenhuma promoção no momento.' : 'Nenhum produto ativo nesta categoria.'}
                                </p>
                            </div>
                        ) : (
                            filteredProducts.map(product => {
                                const price = Number(product.promoPrice) > 0 ? Number(product.promoPrice) : Number(product.price || 0);
                                const rewardInfo = (cmvSettings.fidelidade_produtos || []).find(rp => rp.productId === product.id);

                                return (
                                    <div 
                                        key={product.id} 
                                        onClick={() => openProductModal(product)} 
                                        className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-amber-400/50 active:scale-[0.99] transition-all flex p-3 lg:p-4 gap-4 shadow-sm h-fit"
                                    >
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-black text-white text-base lg:text-lg leading-tight mb-1">{product.name}</h3>
                                                <p className="text-slate-400 text-[11px] lg:text-xs font-bold line-clamp-2 leading-relaxed">{product.description}</p>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-lg lg:text-xl font-black text-amber-400">{formatMoney(price)}</span>
                                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center font-black shadow-md shrink-0">
                                                    <Icon name="plus" size={18} />
                                                </div>
                                            </div>
                                        </div>
                                        {product.imageUrl ? (
                                            <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden shrink-0 border border-slate-800 relative">
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                {Number(product.promoPrice) > 0 && (
                                                    <span className="absolute top-1 right-1 bg-red-500 text-white font-black px-2 py-0.5 rounded-full text-[9px] lg:text-[10px] uppercase shadow">Promo</span>
                                                )}
                                                {rewardInfo && cmvSettings.fidelidade_ativo && (
                                                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-amber-400 rounded-md flex items-center justify-center text-slate-950 shadow-lg z-10">
                                                        <Icon name="gift" size={12} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-28 h-28 lg:w-36 lg:h-36 bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                                                <Icon name="image" size={24} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="hidden md:flex bg-slate-900 border-t border-slate-800 px-6 py-4 items-center justify-center shrink-0">
                    <div className="flex items-center gap-2 text-amber-400">
                        <Icon name="shopping-bag" size={20} />
                        <span className="text-sm font-black uppercase tracking-widest">Autoatendimento • Toque nos itens e finalize no totem</span>
                    </div>
                </div>

                <div className="lg:hidden bg-slate-900 border-t border-slate-800 p-4 shrink-0 flex items-center justify-between z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Total do Pedido</span>
                        <span className="text-xl font-black text-amber-400">{formatMoney(finalTotal)}</span>
                    </div>
                    <button 
                        onClick={() => setIsMobileCartOpen(true)}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-3 rounded-full font-black uppercase tracking-wider flex items-center gap-3 shadow-lg active:scale-95 transition-transform"
                    >
                        <Icon name="shopping-cart" size={20} />
                        <span>Ver Carrinho</span>
                        <span className="bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-full text-xs">{cart.length}</span>
                    </button>
                </div>
            </div>

            {/* CARRINHO */}
            <div className={`fixed inset-0 lg:static lg:w-[400px] bg-slate-900 lg:border-l border-slate-800 flex flex-col h-[100dvh] lg:h-full z-50 shrink-0 transform transition-transform duration-300 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                <div className="p-5 lg:p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="text-lg lg:text-xl font-black text-white uppercase flex items-center gap-2">
                        <Icon name="shopping-cart" size={24} className="text-amber-400"/> Seu Pedido
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="bg-amber-400 text-slate-950 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">{cart.length}</span>
                        <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden bg-slate-800 text-slate-400 hover:text-white p-2 rounded-full">
                            <Icon name="chevron-down" size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 opacity-75">
                            <Icon name="shopping-bag" size={56} />
                            <p className="text-sm font-black uppercase text-center px-6">Carrinho vazio. Toque nos produtos para adicionar.</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className={`bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2 ${item.isReward ? 'border-amber-400/50 bg-amber-400/5' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 items-start">
                                        <span className={`font-black text-xs px-2.5 py-1 rounded-lg ${item.isReward ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>{item.qty}x</span>
                                        <div>
                                            <h4 className={`font-black text-[15px] lg:text-base leading-tight ${item.isReward ? 'text-amber-400' : 'text-white'}`}>{item.name}</h4>
                                            {item.isReward ? (
                                                <p className="text-amber-400/70 font-bold text-[11px] lg:text-xs mt-0.5 uppercase tracking-widest">{item.pointsCost} pontos</p>
                                            ) : (
                                                <p className="text-amber-400 font-bold text-[11px] lg:text-xs mt-0.5">{formatMoney(item.totalItemPrice)} <span className="text-slate-500 text-[10px]">(un.)</span></p>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-600 hover:text-red-400 p-1.5"><Icon name="trash-2" size={18}/></button>
                                </div>
                                {item.complementsDesc && (
                                    <div className="text-slate-400 bg-slate-900 p-2 rounded-xl text-[11px] font-bold border border-slate-800">
                                        + Extras: {item.complementsDesc}
                                    </div>
                                )}
                                {item.observation && <div className="text-amber-400/90 bg-amber-400/10 p-2 rounded-lg text-[11px] font-bold border border-amber-400/20">Obs: {item.observation}</div>}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-5 lg:p-6 bg-slate-950 border-t border-slate-800 shrink-0 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-base lg:text-lg font-black text-slate-400 uppercase">Total:</span>
                        <span className="text-2xl lg:text-3xl font-black text-amber-400">{formatMoney(finalTotal)}</span>
                    </div>
                    <button 
                        disabled={cart.length === 0}
                        onClick={openCheckout}
                        className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 py-4 lg:py-5 rounded-full font-black text-lg lg:text-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <span>Continuar</span> <Icon name="arrow-right" size={22} />
                    </button>
                </div>
            </div>

            {/* MODAL 1: DETALHES DO PRODUTO */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90dvh] sm:h-[90vh] text-slate-100 animate-fade-in-up">
                        <div className="p-5 sm:p-6 flex justify-between items-center border-b border-slate-800 shrink-0 bg-slate-900">
                            <h2 className="text-base sm:text-lg font-black uppercase tracking-widest text-white">Detalhes do produto</h2>
                            <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><Icon name="x" size={20}/></button>
                        </div>

                        <div className="p-5 sm:p-6 flex gap-4 sm:gap-6 shrink-0 bg-slate-900 items-center">
                            {(selectedProduct.image || selectedProduct.imageUrl || selectedProduct.foto) && (
                                <img src={selectedProduct.image || selectedProduct.imageUrl || selectedProduct.foto} alt="" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl border border-slate-800 shrink-0 shadow-sm" />
                            )}
                            <div className="flex-1">
                                <h3 className="font-black text-white text-xl sm:text-2xl leading-tight">{selectedProduct.name}</h3>
                                <p className="text-[13px] sm:text-[14px] font-bold text-slate-400 mt-2 line-clamp-3 leading-snug">{selectedProduct.description}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-900 pb-24">
                            {(() => {
                                const groups = getGroupsToDisplay();
                                if (groups.length === 0) {
                                    return <p className="text-sm text-slate-500 font-bold text-center py-12 uppercase">Este produto não possui complementos adicionais.</p>;
                                }

                                return groups.map((group, gIdx) => {
                                    const gId = group.id || group.name;
                                    const selectedItems = selectedComplements[gId] || [];
                                    const itemsList = group.items || group.opcoes || group.options || [];
                                    const maxAllowed = parseInt(group.max) || 99;
                                    const minRequired = parseInt(group.min) || 0;
                                    const isSingleChoice = maxAllowed === 1;
                                    const currentGroupTotalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0);

                                    return (
                                        <div key={gIdx} className="border-b-4 border-slate-950">
                                            <div className="bg-slate-950/60 p-4 sm:p-5">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-black text-white text-sm sm:text-base uppercase">{group.name || group.nome}</h4>
                                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                                            {isSingleChoice ? 'Escolha 1 opção' : `Escolha até ${maxAllowed} opções`}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap justify-end items-center gap-1 sm:gap-2 mt-1 max-w-[120px]">
                                                        <span className="bg-slate-800 text-slate-300 text-[10px] sm:text-xs px-2 py-1 rounded font-black tracking-widest whitespace-nowrap">
                                                            {currentGroupTotalQty}/{maxAllowed}
                                                        </span>
                                                        {minRequired > 0 && (
                                                            <span className="bg-amber-400 text-slate-950 text-[10px] sm:text-xs px-2 py-1 rounded font-black tracking-widest uppercase whitespace-nowrap">
                                                                Obrigatório
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                {itemsList.map((item, iIdx) => {
                                                    const itemName = item.name || item.nome;
                                                    const itemPrice = Number(item.price || item.valor || 0);
                                                    const maxItemQty = parseInt(item.maxQtd) || 1;
                                                    const qty = getQtyComplement(gId, itemName);

                                                    return (
                                                        <div 
                                                            key={iIdx} 
                                                            onClick={() => isSingleChoice ? handleUpdateComplement(group, item, 1) : null}
                                                            className={`flex justify-between items-center p-4 border-t border-slate-800 transition-colors ${isSingleChoice ? 'cursor-pointer hover:bg-slate-800/50' : ''}`}
                                                        >
                                                            <div className="pr-2">
                                                                <p className="text-[14px] sm:text-base font-bold text-white leading-tight">{itemName}</p>
                                                                {itemPrice > 0 && (
                                                                    <p className="text-[12px] sm:text-[14px] font-bold text-amber-400 mt-0.5">
                                                                        + R$ {itemPrice.toFixed(2).replace('.', ',')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="shrink-0">
                                                                {isSingleChoice ? (
                                                                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-colors ${qty > 0 ? 'border-amber-400' : 'border-slate-700'}`}>
                                                                        {qty > 0 && <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-amber-400" />}
                                                                    </div>
                                                                ) : (
                                                                    qty === 0 ? (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleUpdateComplement(group, item, 1); }} 
                                                                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-amber-400 text-2xl sm:text-3xl font-light bg-slate-800 hover:bg-slate-700 rounded-full transition-colors pb-1"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    ) : (
                                                                        maxItemQty === 1 ? (
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleUpdateComplement(group, item, -1); }} 
                                                                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-amber-400 text-3xl sm:text-4xl font-light bg-slate-800 hover:bg-slate-700 rounded-full transition-colors pb-1"
                                                                            >
                                                                                -
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2 sm:gap-3 bg-slate-950 p-1 rounded-full border border-slate-800">
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateComplement(group, item, -1); }} 
                                                                                    className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-amber-400 text-2xl sm:text-3xl font-light hover:bg-slate-800 rounded-full transition-colors pb-1"
                                                                                >
                                                                                    -
                                                                                </button>
                                                                                <span className="font-black text-white text-base sm:text-lg w-4 sm:w-5 text-center">{qty}</span>
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateComplement(group, item, 1); }} 
                                                                                    className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-amber-400 text-xl sm:text-2xl font-light hover:bg-slate-800 rounded-full transition-colors"
                                                                                >
                                                                                    +
                                                                                </button>
                                                                            </div>
                                                                        )
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            
                            <div className="p-5 sm:p-6 border-t-4 border-slate-950">
                                <label className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Icon name="edit-3" size={16}/> Alguma observação?</label>
                                <textarea 
                                    value={productObs} 
                                    onChange={e => setProductObs(e.target.value)} 
                                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[13px] sm:text-[14px] font-bold text-white focus:border-amber-400 outline-none resize-none h-20 sm:h-24 placeholder:text-slate-600" 
                                    placeholder="Ex: Tirar a cebola, maionese à parte..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex gap-3 sm:gap-4 shrink-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center justify-between border border-slate-800 rounded-xl w-[110px] sm:w-[140px] px-1 sm:px-2 h-12 sm:h-14 bg-slate-900">
                                <button onClick={() => productQty > 1 && setProductQty(productQty - 1)} className="text-amber-400 text-3xl sm:text-4xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-light active:bg-slate-800 rounded-lg pb-1 sm:pb-2">-</button>
                                <span className="font-black text-white text-lg sm:text-xl">{productQty}</span>
                                <button onClick={() => setProductQty(productQty + 1)} className="text-amber-400 text-2xl sm:text-3xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-light active:bg-slate-800 rounded-lg pb-0 sm:pb-1">+</button>
                            </div>
                            <button 
                                onClick={handleAddToCart} 
                                className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black uppercase text-base sm:text-lg px-4 sm:px-6 flex justify-between items-center transition-all shadow-md h-12 sm:h-14 cursor-pointer"
                            >
                                <span>Adicionar</span>
                                <span>{formatMoney(getModalComputedPrice())}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GLOBAL - HISTÓRICO DE PEDIDOS (MEUS PEDIDOS) */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
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
                                <button onClick={() => setIsHistoryModalOpen(false)} className="hover:text-slate-400 transition-colors">
                                    <Icon name="x" size={20}/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            {historyStep === 'auth' && (
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-slate-400 text-center mb-6">
                                        Para sua segurança, informe seu WhatsApp e senha para acessar o histórico:
                                    </p>
                                    <div className="space-y-3">
                                        <input 
                                            type="tel" 
                                            placeholder="(11) 99999-9999" 
                                            value={historyPhone} 
                                            onChange={e => setHistoryPhone(e.target.value)} 
                                            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white outline-none focus:border-amber-400 text-center text-lg transition-colors"
                                        />
                                        <input 
                                            type="password" 
                                            placeholder="Sua senha secreta" 
                                            value={historyPassword} 
                                            onChange={e => setHistoryPassword(e.target.value)} 
                                            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white outline-none focus:border-amber-400 text-center text-lg transition-colors"
                                        />
                                        {historyError && <p className="text-xs font-bold text-red-400 text-center mt-1">{historyError}</p>}
                                    </div>
                                    <button 
                                        onClick={handleHistoryAuth} 
                                        disabled={historyLoading} 
                                        className="w-full py-4 mt-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black uppercase transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        {historyLoading ? <Icon name="loader" size={18} className="animate-spin" /> : 'Verificar e Buscar'}
                                    </button>
                                </div>
                            )}

                            {historyStep === 'list' && (
                                <div className="space-y-4">
                                    {historyLoading ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-amber-400/50 gap-3">
                                            <Icon name="loader" size={32} className="animate-spin" />
                                            <span className="font-bold text-sm uppercase text-slate-400">Buscando...</span>
                                        </div>
                                    ) : historyOrders.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-600 gap-3">
                                            <Icon name="inbox" size={48} />
                                            <span className="font-bold text-sm uppercase text-center text-slate-400">Nenhum pedido encontrado<br/>para este número.</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {historyOrders.map(order => (
                                                <div key={order.id} className="border border-slate-800 rounded-2xl p-4 bg-slate-950 shadow-sm flex flex-col gap-3">
                                                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                                                        <div>
                                                            <span className="bg-amber-400/20 text-amber-400 text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest border border-amber-400/30">Pedido #{order.orderNumber}</span>
                                                            <p className="text-xs font-bold text-slate-500 mt-2">
                                                                {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-black text-white text-lg">{formatMoney(order.total)}</span>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{order.status}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-xs font-bold text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-line">
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

            {/* MODAL CHECKOUT MULTI-STEP */}
            {isCheckoutModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border-t-8 border-amber-400 text-white relative max-h-[90vh]">
                        
                        {/* BOTÃO X FLUTUANTE */}
                        <button onClick={() => setIsCheckoutModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white z-50 bg-slate-800 rounded-full p-2">
                            <Icon name="x" size={24} />
                        </button>

                        <div className="flex-1 overflow-y-auto">
                            {checkoutStep === 'tipo_consumo' && (
                                <div className="p-6 sm:p-10 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                                        <Icon name="shopping-bag" size={32} className="sm:w-10 sm:h-10" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Onde você vai consumir?</h2>
                                    <p className="text-sm sm:text-lg font-bold text-slate-400 mb-8">Selecione a modalidade do seu pedido.</p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => handleTipoConsumoSelect('Consumir no Local')}
                                            className="bg-slate-950 border-4 border-slate-800 hover:border-amber-400 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group cursor-pointer"
                                        >
                                            <div className="w-14 h-14 bg-slate-900 group-hover:bg-amber-400 text-amber-400 group-hover:text-slate-950 rounded-2xl flex items-center justify-center transition-colors">
                                                <Icon name="coffee" size={28} />
                                            </div>
                                            <span className="font-black text-lg uppercase">Consumir no Local</span>
                                        </button>

                                        <button 
                                            onClick={() => handleTipoConsumoSelect('Para Viagem')}
                                            className="bg-slate-950 border-4 border-slate-800 hover:border-amber-400 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 group cursor-pointer"
                                        >
                                            <div className="w-14 h-14 bg-slate-900 group-hover:bg-amber-400 text-amber-400 group-hover:text-slate-950 rounded-2xl flex items-center justify-center transition-colors">
                                                <Icon name="package" size={28} />
                                            </div>
                                            <span className="font-black text-lg uppercase">Para Viagem</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === 'phone' && (
                                <div className="p-6 sm:p-10 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                                        <Icon name="phone" size={32} className="sm:w-10 sm:h-10" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Qual seu Telefone?</h2>
                                    <p className="text-sm sm:text-lg font-bold text-slate-400 mb-6 sm:mb-8">Vamos buscar seu cadastro para agilizar.</p>
                                    
                                    <input 
                                        type="tel" autoFocus
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        className="w-full bg-slate-950 border-4 border-slate-800 text-center p-5 sm:p-8 rounded-2xl sm:rounded-3xl font-black text-2xl sm:text-3xl outline-none focus:border-amber-400 text-white placeholder:text-slate-700 transition-colors"
                                    />
                                    
                                    <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                        <button onClick={() => setCheckoutStep('tipo_consumo')} className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-6 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl sm:rounded-3xl font-black uppercase text-lg sm:text-xl active:bg-slate-800">Voltar</button>
                                        <button 
                                            onClick={handlePhoneNext}
                                            disabled={formatarTelefone(customerPhone).length < 12 || isSearchingPhone}
                                            className="w-full flex-1 bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-2xl sm:rounded-3xl font-black uppercase text-xl sm:text-2xl tracking-widest shadow-xl active:scale-95 transition-transform flex justify-center items-center gap-3 py-4 sm:py-0 cursor-pointer"
                                        >
                                            {isSearchingPhone ? 'Buscando...' : 'Continuar'} <Icon name="arrow-right" size={24} className="sm:w-7 sm:h-7" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === 'name' && (
                                <div className="p-6 sm:p-10 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                                        <Icon name="user" size={32} className="sm:w-10 sm:h-10" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Qual o seu nome?</h2>
                                    {matchedClientId ? (
                                        <p className="text-[10px] sm:text-xs font-black text-amber-400 bg-amber-400/10 py-1.5 px-4 rounded-full inline-block mb-3 sm:mb-4 uppercase tracking-wider border border-amber-400/20">Cliente identificado!</p>
                                    ) : (
                                        <p className="text-[10px] sm:text-xs font-black text-slate-400 bg-slate-800 py-1.5 px-4 rounded-full inline-block mb-3 sm:mb-4 uppercase tracking-wider">Novo cliente</p>
                                    )}
                                    <p className="text-sm sm:text-lg font-bold text-slate-400 mb-6 sm:mb-8">Precisamos do seu nome para te chamar quando o pedido ficar pronto.</p>
                                    
                                    <input 
                                        type="text" autoFocus
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Seu nome..."
                                        className="w-full bg-slate-950 border-4 border-slate-800 text-center p-5 sm:p-8 rounded-2xl sm:rounded-3xl font-black text-2xl sm:text-3xl outline-none focus:border-amber-400 text-white placeholder:text-slate-700 transition-colors"
                                    />

                                    <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                        <button onClick={() => setCheckoutStep('phone')} className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-6 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl sm:rounded-3xl font-black uppercase text-lg sm:text-xl active:bg-slate-800">Voltar</button>
                                        <button 
                                            onClick={handleNameNext} 
                                            disabled={!customerName.trim()}
                                            className="w-full flex-1 bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-2xl sm:rounded-3xl font-black uppercase text-xl sm:text-2xl tracking-widest shadow-xl active:scale-95 transition-transform flex justify-center items-center gap-3 py-4 sm:py-0 cursor-pointer"
                                        >
                                            Continuar <Icon name="arrow-right" size={24} className="sm:w-7 sm:h-7" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* NOVA ABA: AUTENTICAÇÃO DO FIDELIDADE (Caso loja tenha ativo) */}
                            {checkoutStep === 'fidelidade_auth' && (
                                <div className="p-6 sm:p-10 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                                        <Icon name={authStep === 'login' ? 'lock' : 'user-plus'} size={32} className="sm:w-10 sm:h-10" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Clube de Vantagens</h2>
                                    <p className="text-sm sm:text-lg font-bold text-slate-400 mb-6 sm:mb-8">
                                        {authStep === 'login' ? 'Identificámos o seu número! Digite a senha para usar ou ganhar pontos.' : 'Crie uma senha rápida de 4 dígitos para proteger os seus pontos.'}
                                    </p>

                                    <div className="space-y-4 max-w-sm mx-auto">
                                        <input 
                                            type="password" placeholder="Sua senha secreta" 
                                            value={fidelidadePassword} onChange={e => setFidelidadePassword(e.target.value)} 
                                            className="w-full bg-slate-950 border-4 border-slate-800 text-center p-5 rounded-2xl font-black text-2xl outline-none focus:border-amber-400 text-white placeholder:text-slate-700"
                                        />
                                        {fidelidadeError && <p className="text-sm font-bold text-red-400">{fidelidadeError}</p>}
                                    </div>

                                    <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto">
                                        <button 
                                            onClick={authStep === 'login' ? handleLoginFidelidade : authStep === 'register' ? handleRegisterFidelidade : handleSetPasswordFidelidade} 
                                            disabled={fidelidadeLoading} 
                                            className="w-full py-5 bg-amber-400 text-slate-950 rounded-2xl font-black uppercase text-xl shadow-md flex justify-center items-center gap-2"
                                        >
                                            {fidelidadeLoading ? <Icon name="loader" size={24} className="animate-spin" /> : 'Confirmar Senha'}
                                        </button>
                                        <button onClick={() => setCheckoutStep('payment')} className="w-full py-4 text-slate-400 hover:text-white font-bold text-sm uppercase">Pular, não quero pontos agora</button>
                                    </div>
                                </div>
                            )}

                            {/* NOVA ABA: LOJA DE RESGATES DO FIDELIDADE (Totem) */}
                            {checkoutStep === 'fidelidade_loja' && (
                                <div className="p-6 sm:p-10">
                                    <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-950 p-5 rounded-2xl border border-slate-800 mb-6">
                                        <div className="text-center sm:text-left mb-4 sm:mb-0">
                                            <span className="block text-sm font-black text-slate-400 uppercase tracking-widest">Saldo Disponível</span>
                                            <span className="text-4xl font-black text-amber-400 flex items-center gap-2">
                                                <Icon name="award" size={32} /> {pontosRestantes} pts
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="font-black text-white text-lg uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Prêmios Disponíveis</h3>
                                    
                                    <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                                        
                                        {/* Lista de Descontos */}
                                        {(cmvSettings.fidelidade_descontos || []).map(desc => {
                                            const isApplied = appliedDiscount?.id === desc.id;
                                            const podeResgatar = pontosRestantes >= desc.pontos;
                                            return (
                                                <div key={desc.id} className={`p-4 sm:p-5 rounded-2xl flex items-center justify-between transition-all ${isApplied ? 'bg-amber-400/20 border-2 border-amber-400' : 'bg-slate-950 border border-slate-800'}`}>
                                                    <div className="flex gap-4 items-center">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isApplied ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-amber-400'}`}>
                                                            <Icon name="dollar-sign" size={24} />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-sm sm:text-base text-white">Desconto de R$ {desc.valor}</h5>
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{desc.pontos} pts</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => isApplied ? setAppliedDiscount(null) : applyDiscountReward(desc)} disabled={!podeResgatar && !isApplied} className={`px-4 py-2 rounded-lg font-black text-xs uppercase ${isApplied ? 'bg-red-500/20 text-red-400 border border-red-500' : podeResgatar ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-600'}`}>
                                                        {isApplied ? 'Remover' : podeResgatar ? 'Resgatar' : 'Faltam Pontos'}
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Lista de Produtos Recompensa */}
                                        {(cmvSettings.fidelidade_produtos || []).map(prod => {
                                            const isApplied = cart.some(i => i.isReward && i.productId === prod.productId);
                                            const isInCartToRedeem = cart.some(i => i.productId === prod.productId && !i.isReward);
                                            const ptsNecessarios = Math.floor(prod.price * (prod.pontosPorReal || 20));
                                            const podeResgatar = pontosRestantes >= ptsNecessarios;
                                            
                                            return (
                                                <div key={prod.id} className={`p-4 sm:p-5 rounded-2xl flex items-center justify-between transition-all ${isApplied ? 'bg-amber-400/20 border-2 border-amber-400' : 'bg-slate-950 border border-slate-800'}`}>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-slate-900 border border-slate-800 overflow-hidden">
                                                            {prod.imageUrl ? <img src={prod.imageUrl} className="w-full h-full object-cover"/> : <Icon name="package" size={20} className="text-slate-600" />}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-sm sm:text-base text-white">{prod.name}</h5>
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{ptsNecessarios} pts</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => isApplied ? removeRewardFromCart(prod.productId) : addRewardToCart(prod)} disabled={!podeResgatar || (!isInCartToRedeem && !isApplied)} className={`px-4 py-2 rounded-lg font-black text-xs uppercase ${isApplied ? 'bg-red-500/20 text-red-400 border border-red-500' : (podeResgatar && isInCartToRedeem) ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-600'}`}>
                                                        {isApplied ? 'Remover' : (podeResgatar ? (isInCartToRedeem ? 'Resgatar' : 'Adicione Antes') : 'Faltam Pontos')}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                        <button onClick={() => setCheckoutStep('payment')} className="w-full py-5 bg-amber-400 text-slate-950 rounded-2xl sm:rounded-3xl font-black uppercase text-xl sm:text-2xl tracking-widest shadow-xl active:scale-95 transition-transform flex justify-center items-center gap-3">
                                            Ir para Pagamento <Icon name="arrow-right" size={24} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === 'payment' && (
                                <div className="p-6 sm:p-10 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 mt-4">
                                        <Icon name="credit-card" size={32} className="sm:w-10 sm:h-10" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Forma de Pagamento</h2>
                                    <p className="text-sm sm:text-lg font-bold text-slate-400 mb-8">Como deseja pagar no caixa?</p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[30vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                                        {paymentOptions.map((method, idx) => {
                                            const isSelected = selectedPaymentMethod === method;
                                            return (
                                                <button 
                                                    key={idx}
                                                    onClick={() => setSelectedPaymentMethod(method)}
                                                    disabled={isSubmitting}
                                                    className={`border-4 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group cursor-pointer disabled:opacity-50 ${isSelected ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-950 hover:border-amber-400/50'}`}
                                                >
                                                    <span className={`font-black text-lg uppercase ${isSelected ? 'text-amber-400' : 'text-white group-hover:text-amber-400/80'}`}>{method}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selectedPaymentMethod && (
                                        <div className="mt-6 p-6 border-2 border-amber-400/30 bg-slate-900 rounded-3xl animate-fade-in-up">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm font-black text-slate-400 uppercase">Subtotal</span>
                                                <span className="text-sm font-black text-white">{formatMoney(cartTotalBruto)}</span>
                                            </div>
                                            {appliedDiscount && (
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-sm font-black text-amber-400 uppercase">Desconto Fidelidade</span>
                                                    <span className="text-sm font-black text-amber-400">-{formatMoney(appliedDiscount.valor)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center border-t border-slate-700 pt-4 mb-6">
                                                <span className="text-xl font-black text-white uppercase tracking-widest">Total a Pagar</span>
                                                <span className="text-3xl font-black text-amber-400">{formatMoney(finalTotal)}</span>
                                            </div>

                                            {selectedPaymentMethod.toLowerCase().includes('dinheiro') && (
                                                <div className="mb-6 pt-4 border-t border-slate-800">
                                                    <label className="text-sm font-black uppercase text-amber-400 flex items-center justify-center gap-2 mb-3">
                                                        <Icon name="dollar-sign" size={16} /> Troco para quanto? (Opcional)
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Ex: 50.00" 
                                                        value={trocoPara} 
                                                        onChange={e => setTrocoPara(e.target.value)} 
                                                        className="w-full max-w-xs mx-auto bg-slate-950 border-2 border-slate-700 text-center p-4 rounded-2xl font-black text-2xl outline-none focus:border-amber-400 text-white placeholder:text-slate-600 transition-colors block" 
                                                    />
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => finalizeOrder()}
                                                disabled={isSubmitting}
                                                className="w-full bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 py-4 rounded-2xl font-black uppercase text-xl tracking-widest shadow-xl active:scale-95 transition-transform flex justify-center items-center gap-3 cursor-pointer"
                                            >
                                                {isSubmitting ? 'A Enviar...' : 'Confirmar e Finalizar'} <Icon name="check-circle" size={24} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}