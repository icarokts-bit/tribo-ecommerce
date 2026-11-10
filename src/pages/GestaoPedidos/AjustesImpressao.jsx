import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';

export default function AjustesImpressao({ donoUid }) {
    const [activeTab, setActiveTab] = useState('personalizar_site');
    const [loading, setLoading] = useState(true);
    
    // ==========================================
    // ESTADOS: PERSONALIZAR SITE
    // ==========================================
    const [savingSite, setSavingSite] = useState(false);
    const [formData, setFormData] = useState({
        nomeLoja: '',
        linkPersonalizado: '',
        whatsapp: '',
        endereco: '',
        mostrarEndereco: true,
        logoUrl: '',
        bannerUrl: '',
        totemUrl: ''
    });

    // ==========================================
    // ESTADOS: IMPRESSORAS (Agente Local)
    // ==========================================
    const [regras, setRegras] = useState([]);
    const [salvandoImpressora, setSalvandoImpressora] = useState(false);
    const [impressorasLocais, setImpressorasLocais] = useState([]);
    const [buscandoImpressoras, setBuscandoImpressoras] = useState(false);
    const [novaRegra, setNovaRegra] = useState({
        setor: 'Caixa',
        tipo: 'padrao',
        nomeCompartilhado: '',
        bobina: '80mm',
        vias: 1
    });

    // CARREGAMENTO INICIAL DE TODOS OS DADOS
    useEffect(() => {
        if (!donoUid) return;
        
        const loadAllSettings = async () => {
            try {
                // 1. Carrega Perfil do Site
                const siteDoc = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings`).doc('storeProfile').get();
                if (siteDoc.exists) {
                    setFormData(prev => ({ ...prev, ...siteDoc.data() }));
                }

                // 2. Carrega Regras de Impressão
                const printDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery_settings/printer_rules`).get();
                if (printDoc.exists && printDoc.data().regras) {
                    setRegras(printDoc.data().regras);
                }
            } catch (error) {
                console.error("Erro ao carregar configurações:", error);
            }
            setLoading(false);
        };
        
        loadAllSettings();
    }, [donoUid]);

    // ==========================================
    // FUNÇÕES: PERSONALIZAR SITE
    // ==========================================
    const handleChangeSite = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            return alert("A imagem é muito grande. Escolha uma imagem com menos de 2MB.");
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, [field]: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSite = async (e) => {
        e.preventDefault();
        setSavingSite(true);
        try {
            const slug = formData.linkPersonalizado.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
            const payload = { ...formData, linkPersonalizado: slug, updatedAt: new Date().toISOString() };

            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings`).doc('storeProfile').set(payload, { merge: true });
            
            setFormData(payload);
            alert("Configurações da loja guardadas com sucesso!");
        } catch (error) {
            alert("Erro ao salvar: " + error.message);
        }
        setSavingSite(false);
    };

    // ==========================================
    // FUNÇÕES: IMPRESSORAS (Agente Local)
    // ==========================================
    const handleSalvarRegras = async (regrasAtualizadas) => {
        setSalvandoImpressora(true);
        await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery_settings/printer_rules`).set({
            regras: regrasAtualizadas
        }, { merge: true });
        setRegras(regrasAtualizadas);
        setSalvandoImpressora(false);
    };

    const buscarImpressorasDoAgente = async () => {
        setBuscandoImpressoras(true);
        try {
            const response = await fetch('http://localhost:8080/impressoras');
            if (!response.ok) throw new Error('Agente falhou');
            const data = await response.json();
            setImpressorasLocais(data);
        } catch (error) {
            alert("Não foi possível conectar. O Agente 'Tribo Print' está rodando no seu computador?");
        } finally {
            setBuscandoImpressoras(false);
        }
    };

    const adicionarRegra = () => {
        if (!novaRegra.nomeCompartilhado) {
            alert("Selecione uma impressora válida e compartilhada na lista.");
            return;
        }
        const regraComId = { ...novaRegra, id: crypto.randomUUID() };
        handleSalvarRegras([...regras, regraComId]);
        setNovaRegra({ setor: 'Caixa', tipo: 'padrao', nomeCompartilhado: '', bobina: '80mm', vias: 1 });
        setImpressorasLocais([]);
    };

    const removerRegra = (idParaRemover) => {
        if (window.confirm("Excluir esta impressora?")) {
            handleSalvarRegras(regras.filter(r => r.id !== idParaRemover));
        }
    };

    // ==========================================
    // RENDERIZAÇÃO GERAL
    // ==========================================
    if (loading) {
        return <div className="p-8 text-center text-slate-400 font-black uppercase"><Icon name="loader" className="animate-spin inline mr-2" /> Carregando Ajustes...</div>;
    }

    const tabs = [
        { id: 'geral', label: 'Geral', icon: 'settings' },
        { id: 'personalizar_site', label: 'Personalizar Site', icon: 'layout' },
        { id: 'horarios', label: 'Horários Delivery', icon: 'clock' },
        { id: 'robo_ia', label: 'Robô IA (WhatsApp)', icon: 'message-square' },
        { id: 'impressao', label: 'Impressão', icon: 'printer' },
        { id: 'agendamento', label: 'Agendamento', icon: 'calendar' },
        { id: 'financeiros', label: 'Dados Financeiros', icon: 'dollar-sign' }
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-2 md:p-4 fade-in max-w-7xl mx-auto h-[calc(100vh-2rem)]">
            
            {/* MENU LATERAL DE ABAS */}
            <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar h-fit max-h-full">
                <div className="p-4 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all ${
                                activeTab === tab.id 
                                ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                        >
                            <Icon name={tab.icon} size={16} className={activeTab === tab.id ? 'text-fuchsia-600' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ÁREA DE CONTEÚDO PRINCIPAL */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar p-6">
                
                {/* ABA: PERSONALIZAR SITE */}
                {activeTab === 'personalizar_site' ? (
                    <form onSubmit={handleSaveSite} className="space-y-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Detalhes da Loja</h2>
                                <p className="text-xs font-bold text-slate-500 mt-1">Defina o nome da sua loja, link personalizado e contatos.</p>
                            </div>
                            <button type="submit" disabled={savingSite} className="bg-slate-900 hover:bg-black text-[#F8CC82] px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-md transition-colors flex items-center gap-2">
                                {savingSite ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="save" size={14} />}
                                Salvar Alterações
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Nome de Exibição da Loja</label>
                                <input 
                                    type="text" name="nomeLoja" value={formData.nomeLoja} onChange={handleChangeSite} 
                                    className="w-full lg:w-2/3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-fuchsia-500 focus:bg-white transition-colors"
                                    placeholder="Ex: Tribo Tech"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Link Personalizado do Cardápio / Site</label>
                                <div className="flex items-center w-full lg:w-2/3">
                                    <span className="bg-slate-100 border border-r-0 border-slate-200 text-slate-500 px-4 py-3 rounded-l-xl font-bold text-sm">
                                        tribosistemas.com.br/
                                    </span>
                                    <input 
                                        type="text" name="linkPersonalizado" value={formData.linkPersonalizado} onChange={handleChangeSite} 
                                        className="flex-1 p-3 bg-white border border-slate-200 rounded-r-xl font-black text-sm text-slate-800 outline-none focus:border-fuchsia-500"
                                        placeholder="sua-loja"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full lg:w-2/3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">WhatsApp / Telefone</label>
                                    <input 
                                        type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChangeSite} 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-fuchsia-500 focus:bg-white"
                                        placeholder="Ex: 11988123464"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Endereço Físico</label>
                                    <input 
                                        type="text" name="endereco" value={formData.endereco} onChange={handleChangeSite} 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-fuchsia-500 focus:bg-white"
                                        placeholder="Ex: Rua Exemplo, 123"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 bg-fuchsia-50 border border-fuchsia-100 p-4 rounded-xl cursor-pointer w-full lg:w-2/3 group">
                                <input 
                                    type="checkbox" name="mostrarEndereco" checked={formData.mostrarEndereco} onChange={handleChangeSite}
                                    className="w-5 h-5 accent-fuchsia-600 cursor-pointer"
                                />
                                <span className="text-xs font-black text-fuchsia-900 uppercase">Deixar endereço visível para os clientes no site?</span>
                            </label>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Imagens da Loja e Totem</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50 shadow-sm relative overflow-hidden group">
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-3">Logo da Loja</span>
                                    <div className="w-32 h-32 bg-slate-200 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                                        {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Icon name="image" size={32} className="text-slate-400" />}
                                    </div>
                                    <label className="cursor-pointer bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-colors text-center w-full">
                                        Escolher Arquivo
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                    </label>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50 shadow-sm relative overflow-hidden group">
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-3">Capa Menu (Horizontal)</span>
                                    <div className="w-full h-32 bg-slate-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                                        {formData.bannerUrl ? <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" /> : <Icon name="image" size={32} className="text-slate-400" />}
                                    </div>
                                    <label className="cursor-pointer bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-colors text-center w-full">
                                        Escolher Arquivo
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'bannerUrl')} />
                                    </label>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg">Totem</div>
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-3">Capa Tela Descanso</span>
                                    <div className="w-24 h-32 bg-slate-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                                        {formData.totemUrl ? <img src={formData.totemUrl} alt="Totem" className="w-full h-full object-cover" /> : <Icon name="smartphone" size={32} className="text-slate-400" />}
                                    </div>
                                    <label className="cursor-pointer bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-colors text-center w-full">
                                        Escolher Arquivo
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'totemUrl')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </form>
                ) 
                
                /* ABA: IMPRESSÃO (Agente Local Preservado) */
                : activeTab === 'impressao' ? (
                    <div className="space-y-6">
                        <div className="mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                                <Icon name="printer" size={24} className="text-emerald-500" /> Roteamento de Impressoras (Agente Local)
                            </h2>
                            <p className="text-sm text-slate-500 font-bold mt-1">Configure para quais impressoras o sistema deve enviar os cupons automaticamente.</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Setor</label>
                                <input type="text" value={novaRegra.setor} onChange={e => setNovaRegra({...novaRegra, setor: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none" placeholder="Ex: Chapa" />
                            </div>
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo de Cupom</label>
                                <select value={novaRegra.tipo} onChange={e => setNovaRegra({...novaRegra, tipo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                                    <option value="padrao">Padrão (Completo)</option>
                                    <option value="producao">Produção (S/ Preço)</option>
                                </select>
                            </div>
                            
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex justify-between items-center">
                                    Impressora no Windows
                                    <button type="button" onClick={buscarImpressorasDoAgente} disabled={buscandoImpressoras} className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition-colors">
                                        <Icon name="search" size={10} className={buscandoImpressoras ? "animate-pulse" : ""} /> 
                                        {buscandoImpressoras ? 'Buscando...' : 'Buscar Instalações'}
                                    </button>
                                </label>
                                
                                {impressorasLocais.length > 0 ? (
                                    <select value={novaRegra.nomeCompartilhado} onChange={e => setNovaRegra({...novaRegra, nomeCompartilhado: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                                        <option value="">Selecione uma impressora...</option>
                                        {impressorasLocais.map((imp, idx) => (
                                            <option key={idx} value={imp.ShareName || ''} disabled={!imp.Shared} className={!imp.Shared ? "text-red-400 font-normal" : "text-emerald-700 font-bold"}>
                                                {imp.Name} {imp.Shared ? `(✔ Pronta)` : '(⚠️ COMPARTILHE PRIMEIRO)'}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div onClick={buscarImpressorasDoAgente} className="w-full p-2.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-400 bg-white cursor-pointer hover:bg-slate-50 flex items-center">
                                        Clique em Buscar Instalações...
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 md:col-span-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Bobina</label>
                                <select value={novaRegra.bobina} onChange={e => setNovaRegra({...novaRegra, bobina: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                                    <option value="80mm">80mm</option>
                                    <option value="58mm">58mm</option>
                                </select>
                            </div>
                            <div className="space-y-1 md:col-span-1 flex gap-2">
                                <div className="w-16">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Vias</label>
                                    <input type="number" min="1" max="5" value={novaRegra.vias} onChange={e => setNovaRegra({...novaRegra, vias: Number(e.target.value)})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none" />
                                </div>
                                <button onClick={adicionarRegra} disabled={salvandoImpressora} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors h-[42px] mt-auto">
                                    <Icon name="plus" size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-sm font-black text-slate-800 uppercase mb-3">Impressoras Ativas</h3>
                        <div className="space-y-3">
                            {regras.length === 0 && <p className="text-slate-400 text-sm font-bold py-6 text-center border-2 border-dashed border-slate-100 rounded-xl">Nenhuma impressora configurada.</p>}
                            
                            {regras.map(regra => (
                                <div key={regra.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-6">
                                        <div className="flex items-center gap-3 w-40">
                                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Icon name="printer" size={16} /></div>
                                            <div><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Setor</p><p className="font-bold text-slate-800">{regra.setor}</p></div>
                                        </div>
                                        <div className="w-40"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Rede Windows</p><p className="font-bold text-emerald-600">\\ {regra.nomeCompartilhado}</p></div>
                                        <div className="w-32"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Layout</p><p className="font-bold text-slate-700">{regra.tipo === 'padrao' ? 'Padrão Completo' : 'Produção / Cozinha'}</p></div>
                                        <div className="w-20"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Bobina</p><p className="font-bold text-slate-700">{regra.bobina}</p></div>
                                        <div className="w-16"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Vias</p><p className="font-bold text-slate-700 bg-slate-100 text-center rounded">{regra.vias}x</p></div>
                                    </div>
                                    <button onClick={() => removerRegra(regra.id)} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-lg border border-slate-200 transition-colors"><Icon name="trash" size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) 
                
                /* ABA PADRÃO EM DESENVOLVIMENTO */
                : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 py-20 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Icon name="tool" size={48} className="opacity-50" />
                        <h3 className="font-black uppercase tracking-widest text-sm">Aba em Desenvolvimento</h3>
                        <p className="text-xs font-bold text-center px-4">As opções de {tabs.find(t => t.id === activeTab)?.label} serão ativadas na próxima atualização.</p>
                    </div>
                )}
            </div>
        </div>
    );
}