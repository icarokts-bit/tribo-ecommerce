import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';

// CHAVE DE API FIXADA NO SISTEMA (Segura pelas restrições de domínio do Google Cloud)
const GOOGLE_MAPS_API_KEY = "AIzaSyARk776Wc3Ir48sxblkv71ubYeM8tVlG5k";

export default function AreaEntregaDelivery() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bairros'); 
    const [searchQuery, setSearchQuery] = useState('');
    
    const [bairros, setBairros] = useState([]);
    const [regioes, setRegioes] = useState([]);
    const [configGeral, setConfigGeral] = useState({
        cidadePadrao: 'Bragança Paulista - SP',
        enderecoLoja: '',
        tempoRetirada: 15,
        latLoja: -22.9529,
        lngLoja: -46.5418
    });

    const [isBairroModalOpen, setIsBairroModalOpen] = useState(false);
    const [isRegiaoModalOpen, setIsRegiaoModalOpen] = useState(false);

    const [bairroForm, setBairroForm] = useState({
        id: '', cidade: 'Bragança Paulista - SP', nome: '', deliveryFee: '', time: 15, observation: '', driverFee: '', isInactive: false
    });

    const [regiaoForm, setRegiaoForm] = useState({
        id: '', km: 1, deliveryFee: '', time: 15, observation: '', driverFee: '', isInactive: false
    });

    // Estados e Refs para o Google Maps Real
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const markerRef = useRef(null);
    const circlesRef = useRef([]);
    const [storeCenter, setStoreCenter] = useState({ lat: -22.9529, lng: -46.5418 }); // Padrão: Bragança

    const formatMoney = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const p = (val) => parseFloat(String(val).replace(',', '.')) || 0;

    // 1. CARREGA OS DADOS DO BANCO
    useEffect(() => {
        const carregarDados = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const docRef = db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/areas`);
                const docSnap = await docRef.get();
                
                if (docSnap.exists) {
                    const data = docSnap.data();
                    setBairros(data.bairros || []);
                    setRegioes(data.regioes || []);
                    if (data.configGeral) {
                        setConfigGeral(prev => ({ ...prev, ...data.configGeral }));
                        if (data.configGeral.latLoja && data.configGeral.lngLoja) {
                            setStoreCenter({ lat: Number(data.configGeral.latLoja), lng: Number(data.configGeral.lngLoja) });
                        }
                    }
                } else {
                    setRegioes([
                        { id: '1', km: 1, deliveryFee: 3.00, time: 15, driverFee: 3.00, isInactive: false },
                        { id: '2', km: 2, deliveryFee: 3.00, time: 15, driverFee: 3.00, isInactive: false },
                        { id: '3', km: 3, deliveryFee: 4.00, time: 15, driverFee: 4.00, isInactive: false }
                    ]);
                }
            } catch (error) {
                console.error("Erro ao carregar áreas:", error);
            } finally {
                setLoading(false);
            }
        };
        carregarDados();
    }, []);

    // 2. CARREGA O SCRIPT DO GOOGLE MAPS
    useEffect(() => {
        const scriptId = 'google-maps-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            script.onload = () => setGoogleMapsLoaded(true);
        } else {
            if (window.google && window.google.maps) setGoogleMapsLoaded(true);
        }
    }, []);

    // 3. DESCOBRE A COORDENADA DA LOJA (GEOCODING)
    useEffect(() => {
        if (!googleMapsLoaded || !configGeral.enderecoLoja) return;

        const timer = setTimeout(() => {
            const geocoder = new window.google.maps.Geocoder();
            const enderecoCompleto = `${configGeral.enderecoLoja}, ${configGeral.cidadePadrao || 'Bragança Paulista - SP'}`;
            
            geocoder.geocode({ address: enderecoCompleto }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
                    const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
                    setStoreCenter({ lat, lng });
                    setConfigGeral(prev => ({ ...prev, latLoja: lat, lngLoja: lng }));
                }
            });
        }, 800); 

        return () => clearTimeout(timer);
    }, [googleMapsLoaded, configGeral.enderecoLoja, configGeral.cidadePadrao]);

    // 4. INICIALIZA O MAPA
    useEffect(() => {
        if (!googleMapsLoaded || !mapRef.current || map) return;

        const newMap = new window.google.maps.Map(mapRef.current, {
            center: storeCenter,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
        });

        markerRef.current = new window.google.maps.Marker({
            map: newMap,
            position: storeCenter,
            icon: {
                url: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239333ea" width="40px" height="40px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
            }
        });

        setMap(newMap);
    }, [googleMapsLoaded, map, storeCenter]);

    // 5. ATUALIZA O CENTRO E DESENHA OS RAIOS REAIS EM KM
    useEffect(() => {
        if (!map || !markerRef.current) return;

        map.setCenter(storeCenter);
        markerRef.current.setPosition(storeCenter);

        circlesRef.current.forEach(c => c.setMap(null));
        circlesRef.current = [];

        const sortedRegioes = [...regioes].sort((a, b) => b.km - a.km);

        sortedRegioes.forEach((regiao) => {
            if (regiao.isInactive) return;
            
            const circle = new window.google.maps.Circle({
                strokeColor: "#10b981",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#10b981",
                fillOpacity: 0.08,
                map,
                center: storeCenter,
                radius: regiao.km * 1000
            });
            circlesRef.current.push(circle);
        });

        if (sortedRegioes.length > 0 && sortedRegioes[0].km > 0 && !sortedRegioes[0].isInactive) {
            const bounds = circlesRef.current[0]?.getBounds();
            if (bounds) map.fitBounds(bounds);
        } else {
            map.setZoom(14);
        }

    }, [map, storeCenter, regioes]);

    const salvarNoBanco = async (novosBairros, novasRegioes, novaConfig) => {
        const user = auth.currentUser;
        if (!user) return;

        let configParaSalvar = novaConfig || configGeral;

        // Garante que salva a coordenada atualizada da loja junto com o endereço
        if (window.google?.maps?.Geocoder && configParaSalvar.enderecoLoja) {
            try {
                const geocoder = new window.google.maps.Geocoder();
                const endCompleto = `${configParaSalvar.enderecoLoja}, ${configParaSalvar.cidadePadrao || 'Bragança Paulista - SP'}`;
                const coords = await new Promise((resolve) => {
                    geocoder.geocode({ address: endCompleto }, (results, status) => {
                        if (status === 'OK' && results?.[0]?.geometry?.location) {
                            const loc = results[0].geometry.location;
                            resolve({
                                lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
                                lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng
                            });
                        } else {
                            resolve(null);
                        }
                    });
                });
                if (coords) {
                    configParaSalvar = { ...configParaSalvar, latLoja: coords.lat, lngLoja: coords.lng };
                    setConfigGeral(configParaSalvar);
                    setStoreCenter(coords);
                }
            } catch (e) {}
        }
        
        await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/areas`).set({
            bairros: novosBairros || bairros,
            regioes: novasRegioes || regioes,
            configGeral: configParaSalvar
        }, { merge: true });

        if (novaConfig) {
            alert("✅ Configurações Gerais e localização da loja salvas com sucesso!");
        }
    };

    const abrirModalBairro = (bairro = null) => {
        if (bairro) {
            setBairroForm({ ...bairro });
        } else {
            setBairroForm({ id: '', cidade: configGeral.cidadePadrao, nome: '', deliveryFee: '', time: 15, observation: '', driverFee: '', isInactive: false });
        }
        setIsBairroModalOpen(true);
    };

    const salvarBairro = async () => {
        if (!bairroForm.nome) { alert("Informe o nome do bairro."); return; }
        
        let novosBairros = [...bairros];
        const bairroFormatado = {
            ...bairroForm,
            id: bairroForm.id || crypto.randomUUID(),
            deliveryFee: p(bairroForm.deliveryFee),
            driverFee: bairroForm.driverFee !== '' ? p(bairroForm.driverFee) : p(bairroForm.deliveryFee)
        };

        const index = novosBairros.findIndex(b => b.id === bairroFormatado.id);
        if (index > -1) novosBairros[index] = bairroFormatado;
        else novosBairros.push(bairroFormatado);

        novosBairros.sort((a, b) => a.nome.localeCompare(b.nome));
        setBairros(novosBairros);
        await salvarNoBanco(novosBairros, regioes, null);
        setIsBairroModalOpen(false);
    };

    const deletarBairro = async (id) => {
        if (window.confirm("Deseja remover este bairro?")) {
            const novosBairros = bairros.filter(b => b.id !== id);
            setBairros(novosBairros);
            await salvarNoBanco(novosBairros, regioes, null);
        }
    };

    const abrirModalRegiao = (regiao = null) => {
        if (regiao) {
            setRegiaoForm({ ...regiao });
        } else {
            const nextKm = regioes.length > 0 ? Math.max(...regioes.map(r => Number(r.km))) + 1 : 1;
            setRegiaoForm({ id: '', km: nextKm, deliveryFee: '', time: 15, observation: '', driverFee: '', isInactive: false });
        }
        setIsRegiaoModalOpen(true);
    };

    const salvarRegiao = async () => {
        if (!regiaoForm.km) { alert("Informe o Raio (KM)."); return; }
        
        let novasRegioes = [...regioes];
        const regiaoFormatada = {
            ...regiaoForm,
            id: regiaoForm.id || crypto.randomUUID(),
            km: Number(regiaoForm.km),
            deliveryFee: p(regiaoForm.deliveryFee),
            driverFee: regiaoForm.driverFee !== '' ? p(regiaoForm.driverFee) : p(regiaoForm.deliveryFee)
        };

        const index = novasRegioes.findIndex(r => r.id === regiaoFormatada.id);
        if (index > -1) novasRegioes[index] = regiaoFormatada;
        else novasRegioes.push(regiaoFormatada);

        novasRegioes.sort((a, b) => a.km - b.km);
        setRegioes(novasRegioes);
        await salvarNoBanco(bairros, novasRegioes, null);
        setIsRegiaoModalOpen(false);
    };

    const deletarRegiao = async (id) => {
        if (window.confirm("Deseja remover esta região de entrega?")) {
            const novasRegioes = regioes.filter(r => r.id !== id);
            setRegioes(novasRegioes);
            await salvarNoBanco(bairros, novasRegioes, null);
        }
    };

    const bairrosFiltrados = bairros.filter(b => b.nome.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <div className="p-10 text-center font-black text-purple-600 uppercase">Carregando Áreas...</div>;

    return (
        <div className="w-full h-[calc(100vh-80px)] flex flex-col md:flex-row bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-2 fade-in">
            
            <div className="relative bg-slate-100 w-full h-56 md:h-auto md:flex-1 border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 z-0">
                <div ref={mapRef} className="absolute inset-0 opacity-80"></div>
                
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 md:pb-10 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-2xl shadow-lg border border-slate-200 text-center pointer-events-auto scale-90 md:scale-100">
                        <h4 className="font-black text-slate-800 text-xs md:text-sm">Raio de Cobertura Ativo</h4>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase mt-0.5">{configGeral.enderecoLoja || 'Endereço não configurado'}</p>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-[400px] flex-1 md:flex-none flex flex-col bg-white relative z-20 shadow-xl overflow-hidden">
                
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-4">
                        <Icon name="map" size={18} className="text-purple-600" /> Áreas de Entrega
                    </h2>
                    
                    <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('regioes')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-colors ${activeTab === 'regioes' ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Regiões</button>
                        <button onClick={() => setActiveTab('bairros')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-colors ${activeTab === 'bairros' ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Bairros</button>
                        <button onClick={() => setActiveTab('geral')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-colors ${activeTab === 'geral' ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Geral</button>
                    </div>
                </div>

                {activeTab === 'regioes' && (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        <div className="p-4 space-y-2 flex-1">
                            {regioes.length === 0 && <p className="text-center text-slate-400 font-bold text-xs uppercase mt-10">Nenhuma região cadastrada.</p>}
                            {regioes.map(regiao => (
                                <div key={regiao.id} className={`flex items-center justify-between p-3 rounded-xl border ${regiao.isInactive ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:border-purple-300'} transition-colors`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${regiao.isInactive ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'}`}>
                                            <Icon name={regiao.isInactive ? "x" : "check"} size={16} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-sm">
                                                {regiao.isInactive ? 'Não Entregamos' : `Até ${regiao.km} KM`}
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-500">
                                                {regiao.isInactive 
                                                    ? `Não entregamos aqui • ${regiao.time} min` 
                                                    : `${regiao.deliveryFee === 0 ? 'Grátis' : formatMoney(regiao.deliveryFee)} • ${regiao.time} min • Repasse: ${formatMoney(regiao.driverFee)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => abrirModalRegiao(regiao)} className="p-2 text-slate-400 hover:text-purple-600 transition-colors"><Icon name="more-vertical" size={18} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <button onClick={() => abrirModalRegiao()} className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs rounded-xl shadow-md transition-colors">Nova Região (KM)</button>
                        </div>
                    </div>
                )}

                {activeTab === 'bairros' && (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        <div className="p-4 pb-2">
                            <div className="relative">
                                <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Pesquisar bairro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-purple-500" />
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-2 flex-1 pt-2">
                            {bairrosFiltrados.length === 0 && <p className="text-center text-slate-400 font-bold text-xs uppercase mt-10">Nenhum bairro cadastrado.</p>}
                            {bairrosFiltrados.map(bairro => (
                                <div key={bairro.id} className={`flex items-center justify-between p-3 rounded-xl border ${bairro.isInactive ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:border-purple-300'} transition-colors`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bairro.isInactive ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'}`}>
                                            <Icon name={bairro.isInactive ? "x" : "check"} size={16} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-sm truncate max-w-[200px]">{bairro.nome}</h4>
                                            <p className="text-[10px] font-bold text-slate-500">
                                                {bairro.isInactive 
                                                    ? `Não entregamos aqui` 
                                                    : `${bairro.deliveryFee === 0 ? 'Grátis' : formatMoney(bairro.deliveryFee)} • ${bairro.time} min • ${formatMoney(bairro.driverFee)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => abrirModalBairro(bairro)} className="p-2 text-slate-400 hover:text-purple-600 transition-colors"><Icon name="more-vertical" size={18} /></button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <button onClick={() => abrirModalBairro()} className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs rounded-xl shadow-md transition-colors">Novo Bairro</button>
                        </div>
                    </div>
                )}

                {activeTab === 'geral' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <h4 className="font-black text-slate-800 uppercase text-xs mb-3 border-b pb-2">Endereço Base da Loja</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Endereço Completo (Atualiza o Mapa)</label>
                                    <input type="text" value={configGeral.enderecoLoja} onChange={e => setConfigGeral({...configGeral, enderecoLoja: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm" placeholder="Ex: Av. Antônio Pires Pimentel, 123" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cidade Padrão (Filtro de Busca)</label>
                                    <input type="text" value={configGeral.cidadePadrao} onChange={e => setConfigGeral({...configGeral, cidadePadrao: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm" />
                                    <p className="text-[9px] font-bold text-slate-400 ml-1 mt-0.5">Define a cidade para centralizar o mapa.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-black text-slate-800 uppercase text-xs mb-3 border-b pb-2">Retirada no Local</h4>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tempo médio p/ Retirada (Minutos)</label>
                                <input type="number" value={configGeral.tempoRetirada} onChange={e => setConfigGeral({...configGeral, tempoRetirada: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm" />
                            </div>
                        </div>

                        <button onClick={() => salvarNoBanco(bairros, regioes, configGeral)} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs rounded-xl shadow-md transition-colors mt-4">Salvar Configurações</button>
                    </div>
                )}
            </div>

            {isBairroModalOpen && (
                <div className="modal-overlay z-[120] p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl scale-up-center overflow-hidden border-t-4 border-purple-500">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black uppercase text-slate-800 tracking-tight text-sm">
                                {bairroForm.id ? 'Editar Bairro' : 'Novo Bairro'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {bairroForm.id && (
                                    <button onClick={() => { deletarBairro(bairroForm.id); setIsBairroModalOpen(false); }} className="text-slate-300 hover:text-red-500 p-1"><Icon name="trash" size={16}/></button>
                                )}
                                <button onClick={() => setIsBairroModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><Icon name="x" size={18}/></button>
                            </div>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cidade *</label>
                                <input type="text" value={bairroForm.cidade} onChange={e => setBairroForm({...bairroForm, cidade: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-purple-600 ml-1">Nome do Bairro *</label>
                                <input type="text" value={bairroForm.nome} onChange={e => setBairroForm({...bairroForm, nome: e.target.value})} className="w-full p-2.5 bg-white border-2 border-purple-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500" placeholder="Ex: Jardim São José" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor Entrega *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">R$</span>
                                        <input type="number" step="0.01" value={bairroForm.deliveryFee} onChange={e => setBairroForm({...bairroForm, deliveryFee: e.target.value})} className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-purple-500 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tempo (Min)</label>
                                    <input type="number" value={bairroForm.time} onChange={e => setBairroForm({...bairroForm, time: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-purple-500 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Taxa do Entregador (Repasse)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">R$</span>
                                    <input type="number" step="0.01" value={bairroForm.driverFee} onChange={e => setBairroForm({...bairroForm, driverFee: e.target.value})} placeholder="Igual ao valor de entrega" className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-purple-500 text-sm" />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 ml-1 mt-0.5">Deixe em branco se for igual ao valor da entrega cobrado do cliente.</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-slate-700">Não entregamos nessa região</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={bairroForm.isInactive} onChange={e => setBairroForm({...bairroForm, isInactive: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                            <button onClick={() => setIsBairroModalOpen(false)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black uppercase text-xs rounded-xl transition-colors">Cancelar</button>
                            <button onClick={salvarBairro} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs rounded-xl shadow-md transition-colors">Atualizar</button>
                        </div>
                    </div>
                </div>
            )}

            {isRegiaoModalOpen && (
                <div className="modal-overlay z-[120] p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl scale-up-center overflow-hidden border-t-4 border-emerald-500">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black uppercase text-slate-800 tracking-tight text-sm">
                                {regiaoForm.id ? 'Editar Região (KM)' : 'Nova Região (KM)'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {regiaoForm.id && (
                                    <button onClick={() => { deletarRegiao(regiaoForm.id); setIsRegiaoModalOpen(false); }} className="text-slate-300 hover:text-red-500 p-1"><Icon name="trash" size={16}/></button>
                                )}
                                <button onClick={() => setIsRegiaoModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><Icon name="x" size={18}/></button>
                            </div>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-emerald-600 ml-1">Distância Máxima (Raio em KM) *</label>
                                <div className="relative">
                                    <input type="number" min="1" value={regiaoForm.km} onChange={e => setRegiaoForm({...regiaoForm, km: e.target.value})} className="w-full p-2.5 bg-white border-2 border-emerald-200 rounded-xl font-black text-slate-800 outline-none focus:border-emerald-500 text-sm" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">KM</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor Entrega *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">R$</span>
                                        <input type="number" step="0.01" value={regiaoForm.deliveryFee} onChange={e => setRegiaoForm({...regiaoForm, deliveryFee: e.target.value})} className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-emerald-500 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tempo (Min)</label>
                                    <input type="number" value={regiaoForm.time} onChange={e => setRegiaoForm({...regiaoForm, time: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Taxa do Entregador (Repasse)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">R$</span>
                                    <input type="number" step="0.01" value={regiaoForm.driverFee} onChange={e => setRegiaoForm({...regiaoForm, driverFee: e.target.value})} placeholder="Igual ao valor de entrega" className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-emerald-500 text-sm" />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 ml-1 mt-0.5">Deixe em branco se for igual ao valor cobrado.</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-slate-700">Não entregamos nessa região</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={regiaoForm.isInactive} onChange={e => setRegiaoForm({...regiaoForm, isInactive: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                            <button onClick={() => setIsRegiaoModalOpen(false)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-black uppercase text-xs rounded-xl transition-colors">Cancelar</button>
                            <button onClick={salvarRegiao} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs rounded-xl shadow-md transition-colors">Atualizar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}