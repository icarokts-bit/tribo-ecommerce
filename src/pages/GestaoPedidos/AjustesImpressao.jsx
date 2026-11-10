import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Icon from '../../components/Icon';

export default function AjustesImpressao({ donoUid, accounts = [], categories = [], cmvSettings = {} }) {
    const [activeTab, setActiveTab] = useState('personalizar_site');
    const [loading, setLoading] = useState(true);
    
    // ==========================================
    // ESTADOS: PERSONALIZAR SITE E DOMÍNIO
    // ==========================================
    const [savingSite, setSavingSite] = useState(false);
    const [vinculandoDominio, setVinculandoDominio] = useState(false);
    const [dominioInput, setDominioInput] = useState('');
    const [formData, setFormData] = useState({
        nomeLoja: '',
        linkPersonalizado: '',
        whatsapp: '',
        endereco: '',
        mostrarEndereco: true,
        logoUrl: '',
        bannerUrl: '',
        totemUrl: '',
        dominioProprio: '',
        dominioStatus: ''
    });

    // ==========================================
    // ESTADOS: IMPRESSORAS (Agente Local)
    // ==========================================
    const [regras, setRegras] = useState([]);
    const [salvandoImpressora, setSalvandoImpressora] = useState(false);
    const [impressorasLocais, setImpressorasLocais] = useState([]);
    const [buscandoImpressoras, setBuscandoImpressoras] = useState(false);
    const [novaRegra, setNovaRegra] = useState({
        setor: 'Caixa', tipo: 'padrao', nomeCompartilhado: '', bobina: '80mm', vias: 1
    });

    // ==========================================
    // ESTADOS: DADOS FINANCEIROS
    // ==========================================
    const [savingFin, setSavingFin] = useState(false);
    const [metasForm, setMetasForm] = useState({
        metaVendas: 30000, targetCMV: 35, tax: 4.8, taxaDebito: 1.61, taxaCredito: 3.51, taxaIfood: 17.19, workingDays: [0, 1, 2, 3, 4, 5, 6]
    });
    const [newAccName, setNewAccName] = useState('');
    const [newAccType, setNewAccType] = useState('Conta Corrente');
    const [newCatName, setNewCatName] = useState('');

    useEffect(() => {
        if (!donoUid) return;
        const loadAllSettings = async () => {
            try {
                const siteDoc = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings`).doc('storeProfile').get();
                if (siteDoc.exists) {
                    setFormData(prev => ({ ...prev, ...siteDoc.data() }));
                    setDominioInput(siteDoc.data().dominioProprio || '');
                }
                const printDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery_settings/printer_rules`).get();
                if (printDoc.exists && printDoc.data().regras) setRegras(printDoc.data().regras);
            } catch (error) { console.error("Erro ao carregar configurações:", error); }
            setLoading(false);
        };
        loadAllSettings();
    }, [donoUid]);

    useEffect(() => {
        if (cmvSettings && Object.keys(cmvSettings).length > 0) {
            setMetasForm({
                metaVendas: cmvSettings.metaVendas || 30000, targetCMV: cmvSettings.targetCMV || 35, tax: cmvSettings.tax || 4.8, taxaDebito: cmvSettings.taxaDebito || 1.61, taxaCredito: cmvSettings.taxaCredito || 3.51, taxaIfood: cmvSettings.taxaIfood || 17.19, workingDays: cmvSettings.workingDays || [0, 1, 2, 3, 4, 5, 6]
            });
        }
    }, [cmvSettings]);

    const handleChangeSite = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return alert("A imagem é muito grande. Escolha uma imagem com menos de 2MB.");
        const reader = new FileReader();
        reader.onloadend = () => { setFormData(prev => ({ ...prev, [field]: reader.result })); };
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
        } catch (error) { alert("Erro ao salvar: " + error.message); }
        setSavingSite(false);
    };

    // ==========================================
    // FUNÇÃO: VINCULAR DOMÍNIO NA VERCEL
    // ==========================================
    const handleVincularDominio = async () => {
        if (!dominioInput) return alert("Digite o domínio que deseja vincular.");
        
        // Limpa o domínio (remove http://, https:// e barras no final)
        const domLimpo = dominioInput.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0].toLowerCase();
        
        setVinculandoDominio(true);
        try {
            const functions = getFunctions();
            // Chama a Cloud Function que conecta com a API da Vercel
            const vincularDominioFunc = httpsCallable(functions, 'vincularDominio');
            
            await vincularDominioFunc({ dominio: domLimpo });
            
            setFormData(prev => ({ ...prev, dominioProprio: domLimpo, dominioStatus: 'pendente_dns' }));
            alert("Domínio vinculado ao sistema! Siga as instruções de DNS abaixo.");
        } catch (error) {
            alert(`Erro ao vincular domínio: ${error.message}`);
        }
        setVinculandoDominio(false);
    };

    // ==========================================
    // FUNÇÕES: IMPRESSÃO E FINANCEIRO
    // ==========================================
    const handleSalvarRegras = async (regrasAtualizadas) => {
        setSalvandoImpressora(true);
        await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery_settings/printer_rules`).set({ regras: regrasAtualizadas }, { merge: true });
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
        } catch (error) { alert("Não foi possível conectar. O Agente 'Tribo Print' está rodando no seu computador?"); } finally { setBuscandoImpressoras(false); }
    };
    const adicionarRegra = () => {
        if (!novaRegra.nomeCompartilhado) { alert("Selecione uma impressora válida e compartilhada na lista."); return; }
        const regraComId = { ...novaRegra, id: crypto.randomUUID() };
        handleSalvarRegras([...regras, regraComId]);
        setNovaRegra({ setor: 'Caixa', tipo: 'padrao', nomeCompartilhado: '', bobina: '80mm', vias: 1 });
        setImpressorasLocais([]);
    };
    const removerRegra = (idParaRemover) => {
        if (window.confirm("Excluir esta impressora?")) handleSalvarRegras(regras.filter(r => r.id !== idParaRemover));
    };
    const handleSaveMetas = async (e) => {
        e.preventDefault();
        setSavingFin(true);
        try {
            const payload = { metaVendas: Number(metasForm.metaVendas), targetCMV: Number(metasForm.targetCMV), tax: Number(metasForm.tax), taxaDebito: Number(metasForm.taxaDebito), taxaCredito: Number(metasForm.taxaCredito), taxaIfood: Number(metasForm.taxaIfood), workingDays: metasForm.workingDays };
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cmvSettings`).set(payload, { merge: true });
            alert("Metas e Taxas atualizadas com sucesso!");
        } catch (error) { alert("Erro ao salvar: " + error.message); }
        setSavingFin(false);
    };
    const toggleDay = (dayInt) => {
        setMetasForm(prev => {
            const days = prev.workingDays || [];
            if (days.includes(dayInt)) return { ...prev, workingDays: days.filter(d => d !== dayInt) };
            return { ...prev, workingDays: [...days, dayInt] };
        });
    };
    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (!newAccName) return;
        try { await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/accounts`).add({ name: newAccName.toUpperCase(), type: newAccType }); setNewAccName(''); } catch (err) { alert(err.message); }
    };
    const handleDeleteAccount = async (id) => {
        if (window.confirm("Excluir esta conta?")) await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/accounts`).doc(id).delete();
    };
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCatName) return;
        try { await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/categories`).add({ name: newCatName.toUpperCase() }); setNewCatName(''); } catch (err) { alert(err.message); }
    };
    const handleDeleteCategory = async (id) => {
        if (window.confirm("Excluir esta categoria?")) await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/categories`).doc(id).delete();
    };

    if (loading) return <div className="p-8 text-center text-slate-400 font-black uppercase"><Icon name="loader" className="animate-spin inline mr-2" /> Carregando Ajustes...</div>;

    const tabs = [
        { id: 'geral', label: 'Geral', icon: 'settings' },
        { id: 'personalizar_site', label: 'Personalizar Site', icon: 'layout' },
        { id: 'horarios', label: 'Horários Delivery', icon: 'clock' },
        { id: 'robo_ia', label: 'Robô IA (WhatsApp)', icon: 'message-square' },
        { id: 'impressao', label: 'Impressão', icon: 'printer' },
        { id: 'agendamento', label: 'Agendamento', icon: 'calendar' },
        { id: 'financeiros', label: 'Dados Financeiros', icon: 'dollar-sign' }
    ];
    const daysOfWeek = [ { id: 1, name: 'SEGUNDA' }, { id: 2, name: 'TERÇA' }, { id: 3, name: 'QUARTA' }, { id: 4, name: 'QUINTA' }, { id: 5, name: 'SEXTA' }, { id: 6, name: 'SÁBADO' }, { id: 0, name: 'DOMINGO' } ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-2 md:p-4 fade-in max-w-[1400px] mx-auto h-[calc(100vh-2rem)]">
            
            {/* MENU LATERAL */}
            <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar h-fit max-h-full">
                <div className="p-4 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all ${
                                activeTab === tab.id ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                        >
                            <Icon name={tab.icon} size={16} className={activeTab === tab.id ? 'text-fuchsia-600' : 'text-slate-400'} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar p-6">
                
                {/* ABA: PERSONALIZAR SITE */}
                {activeTab === 'personalizar_site' ? (
                    <form onSubmit={handleSaveSite} className="space-y-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Detalhes da Loja</h2>
                                <p className="text-xs font-bold text-slate-500 mt-1">Defina o nome da sua loja, links e logotipo.</p>
                            </div>
                            <button type="submit" disabled={savingSite} className="bg-slate-900 hover:bg-black text-[#F8CC82] px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-md transition-colors flex items-center gap-2">
                                {savingSite ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="save" size={14} />} Salvar Alterações
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* COLUNA ESQUERDA: INFOS BÁSICAS */}
                            <div className="space-y-5">
                                <h3 className="text-sm font-black text-fuchsia-600 uppercase flex items-center gap-2 border-b border-fuchsia-100 pb-2"><Icon name="file-text" size={16} /> Identidade Visual</h3>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Nome de Exibição da Loja</label>
                                    <input 
                                        type="text" name="nomeLoja" value={formData.nomeLoja} onChange={handleChangeSite} 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-fuchsia-500" placeholder="Ex: Tribo Tech" required
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">WhatsApp / Telefone</label>
                                        <input 
                                            type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChangeSite} 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-fuchsia-500" placeholder="Ex: 11988123464"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Endereço Físico</label>
                                        <input 
                                            type="text" name="endereco" value={formData.endereco} onChange={handleChangeSite} 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-fuchsia-500" placeholder="Ex: Rua Exemplo, 123"
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-3 bg-fuchsia-50 border border-fuchsia-100 p-4 rounded-xl cursor-pointer group">
                                    <input type="checkbox" name="mostrarEndereco" checked={formData.mostrarEndereco} onChange={handleChangeSite} className="w-5 h-5 accent-fuchsia-600 cursor-pointer" />
                                    <span className="text-[11px] font-black text-fuchsia-900 uppercase">Deixar endereço visível no site?</span>
                                </label>
                            </div>

                            {/* COLUNA DIREITA: DOMÍNIOS */}
                            <div className="space-y-5">
                                <h3 className="text-sm font-black text-blue-600 uppercase flex items-center gap-2 border-b border-blue-100 pb-2"><Icon name="globe" size={16} /> Endereço do Site (Domínios)</h3>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Link Padrão Gratuito</label>
                                    <div className="flex items-center">
                                        <span className="bg-slate-200 text-slate-500 px-3 py-3 rounded-l-xl font-bold text-xs border border-slate-300 border-r-0">tribo-ecommerce.vercel.app/</span>
                                        <input 
                                            type="text" name="linkPersonalizado" value={formData.linkPersonalizado} onChange={handleChangeSite} 
                                            className="flex-1 p-3 bg-white border border-slate-300 rounded-r-xl font-black text-sm text-slate-800 outline-none focus:border-blue-500" placeholder="sua-loja" required
                                        />
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <label className="text-[10px] font-black uppercase text-blue-700 block mb-1.5 flex justify-between">
                                        <span>Utilizar Domínio Próprio (.com.br)</span>
                                        <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded">PRO</span>
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            type="text" value={dominioInput} onChange={e => setDominioInput(e.target.value)} 
                                            className="flex-1 p-3 bg-white border border-blue-200 rounded-lg font-bold text-sm text-slate-800 outline-none focus:border-blue-500" placeholder="Ex: www.minhaloja.com.br"
                                        />
                                        <button 
                                            type="button" onClick={handleVincularDominio} disabled={vinculandoDominio}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg font-black uppercase text-[10px] transition-colors whitespace-nowrap shadow-sm"
                                        >
                                            {vinculandoDominio ? 'Vinculando...' : 'Vincular'}
                                        </button>
                                    </div>

                                    {formData.dominioProprio && (
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 mt-2">
                                            <p className="text-[10px] font-bold text-slate-600 mb-2">Para o site funcionar em <strong className="text-blue-600">{formData.dominioProprio}</strong>, configure o DNS no painel onde comprou o domínio (Ex: Registro.br) com os dados abaixo:</p>
                                            
                                            <div className="bg-slate-50 border border-slate-100 p-2 rounded text-[10px] font-mono font-bold text-slate-700 mb-2 flex justify-between">
                                                <span>TIPO: <span className="text-fuchsia-600">A</span></span>
                                                <span>NOME: <span className="text-fuchsia-600">@</span></span>
                                                <span>VALOR: <span className="text-fuchsia-600">76.76.21.21</span></span>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-100 p-2 rounded text-[10px] font-mono font-bold text-slate-700 flex justify-between">
                                                <span>TIPO: <span className="text-fuchsia-600">CNAME</span></span>
                                                <span>NOME: <span className="text-fuchsia-600">www</span></span>
                                                <span>VALOR: <span className="text-fuchsia-600">cname.vercel-dns.com</span></span>
                                            </div>
                                            
                                            <p className="text-[9px] text-slate-400 mt-2 font-bold flex items-center gap-1"><Icon name="clock" size={10} /> Após configurar, aguarde até 24h para propagação automática do SSL.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* IMAGENS */}
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Icon name="image" size={16} className="text-fuchsia-600"/> Assets da Loja</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50 shadow-sm relative overflow-hidden group">
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-3">Logo da Loja</span>
                                    <div className="w-32 h-32 bg-slate-200 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                                        {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Icon name="image" size={32} className="text-slate-400" />}
                                    </div>
                                    <label className="cursor-pointer bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-colors w-full text-center">
                                        Substituir Arquivo <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                                    </label>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50 shadow-sm relative overflow-hidden group">
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-3">Banner Horizontal</span>
                                    <div className="w-full h-32 bg-slate-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                                        {formData.bannerUrl ? <img src={formData.bannerUrl} alt="Banner" className="w-full h-full object-cover" /> : <Icon name="image" size={32} className="text-slate-400" />}
                                    </div>
                                    <label className="cursor-pointer bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-colors w-full text-center">
                                        Substituir Arquivo <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'bannerUrl')} />
                                    </label>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center bg-slate-50 shadow-sm relative overflow-hidden group">
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-3">Totem Vertical</span>
                                    <div className="w-24 h-32 bg-slate-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                                        {formData.totemUrl ? <img src={formData.totemUrl} alt="Totem" className="w-full h-full object-cover" /> : <Icon name="smartphone" size={32} className="text-slate-400" />}
                                    </div>
                                    <label className="cursor-pointer bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-colors w-full text-center">
                                        Substituir Arquivo <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'totemUrl')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </form>
                )
                
                /* ABA DADOS FINANCEIROS */
                : activeTab === 'financeiros' ? (
                    <div className="space-y-8 fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <form onSubmit={handleSaveMetas} className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white">
                                <h3 className="flex items-center gap-2 text-emerald-600 font-black uppercase text-sm border-b border-slate-100 pb-3 mb-4"><Icon name="info" size={16} /> Metas e Taxas Base</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Meta de Vendas Mensal (R$)</label>
                                        <div className="flex gap-2">
                                            <input type="number" value={metasForm.metaVendas} onChange={e => setMetasForm({...metasForm, metaVendas: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500 text-slate-800" />
                                            <button type="submit" disabled={savingFin} className="bg-slate-900 hover:bg-black text-[#F8CC82] px-5 rounded-lg font-black uppercase text-[10px] transition-colors">{savingFin ? '...' : 'Salvar'}</button>
                                        </div>
                                    </div>
                                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">CMV Alvo (%)</label><input type="number" value={metasForm.targetCMV} onChange={e => setMetasForm({...metasForm, targetCMV: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500" /></div>
                                    <div><label className="text-[10px] font-black uppercase text-emerald-600 block mb-1">Imposto (%)</label><input type="number" step="0.01" value={metasForm.tax} onChange={e => setMetasForm({...metasForm, tax: e.target.value})} className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-sm outline-none text-emerald-800" /></div>
                                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Taxa Débito (%)</label><input type="number" step="0.01" value={metasForm.taxaDebito} onChange={e => setMetasForm({...metasForm, taxaDebito: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500" /></div>
                                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Taxa Crédito (%)</label><input type="number" step="0.01" value={metasForm.taxaCredito} onChange={e => setMetasForm({...metasForm, taxaCredito: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-emerald-500" /></div>
                                    <div className="col-span-2"><label className="text-[10px] font-black uppercase text-orange-600 block mb-1">Taxa iFood (%)</label><input type="number" step="0.01" value={metasForm.taxaIfood} onChange={e => setMetasForm({...metasForm, taxaIfood: e.target.value})} className="w-full p-2.5 bg-orange-50 border border-orange-200 rounded-lg font-bold text-sm outline-none text-orange-800" /></div>
                                </div>
                            </form>
                            <div className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white">
                                <h3 className="flex items-center gap-2 text-emerald-600 font-black uppercase text-sm border-b border-slate-100 pb-3 mb-4"><Icon name="info" size={16} /> Dias Financeiros (Projeções)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {daysOfWeek.map(day => {
                                        const isSelected = (metasForm.workingDays || []).includes(day.id);
                                        return <button key={day.id} onClick={() => toggleDay(day.id)} className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase transition-colors border ${isSelected ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>{day.name}</button>;
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white">
                                <h3 className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm border-b border-slate-100 pb-3 mb-4"><Icon name="info" size={16} /> Contas e Cartões</h3>
                                <form onSubmit={handleAddAccount} className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-4">
                                    <div className="flex gap-2 mb-3">
                                        <input type="text" value={newAccName} onChange={e => setNewAccName(e.target.value)} required className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none" placeholder="Nome da Conta" />
                                        <select value={newAccType} onChange={e => setNewAccType(e.target.value)} className="w-1/3 p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white"><option value="Conta Corrente">Corrente</option><option value="Cartão de Crédito">Crédito</option></select>
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] py-2.5 rounded-lg shadow-sm transition-colors">Adicionar</button>
                                </form>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                    {accounts.map(acc => (
                                        <div key={acc.id} className="flex justify-between items-center border border-slate-200 p-3 rounded-xl bg-white shadow-sm hover:border-slate-300">
                                            <div><p className="font-black text-slate-800 text-sm">{acc.name}</p><span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block">{acc.type === 'Cartão de Crédito' ? 'CRÉDITO' : 'CORRENTE'}</span></div>
                                            <button onClick={() => handleDeleteAccount(acc.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded"><Icon name="trash" size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white">
                                <h3 className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm border-b border-slate-100 pb-3 mb-4"><Icon name="info" size={16} /> Categorias</h3>
                                <form onSubmit={handleAddCategory} className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-4 flex gap-2">
                                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} required className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none" placeholder="Nova Categoria" />
                                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 font-black uppercase text-[10px] rounded-lg shadow-sm">ADD</button>
                                </form>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center border border-slate-200 p-3 rounded-xl bg-white shadow-sm hover:border-slate-300">
                                            <p className="font-black text-slate-800 text-xs uppercase">{cat.name}</p>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded"><Icon name="trash" size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )

                /* ABA IMPRESSÃO */
                : activeTab === 'impressao' ? (
                    <div className="space-y-6">
                        <div className="mb-6 border-b border-slate-100 pb-4"><h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2"><Icon name="printer" size={24} className="text-emerald-500" /> Roteamento de Impressoras (Agente Local)</h2></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                            <div className="space-y-1 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Setor</label><input type="text" value={novaRegra.setor} onChange={e => setNovaRegra({...novaRegra, setor: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none" /></div>
                            <div className="space-y-1 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo</label><select value={novaRegra.tipo} onChange={e => setNovaRegra({...novaRegra, tipo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold bg-white"><option value="padrao">Padrão</option><option value="producao">Produção</option></select></div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex justify-between">Windows <button type="button" onClick={buscarImpressorasDoAgente} className="text-emerald-500">Buscar</button></label>
                                {impressorasLocais.length > 0 ? (
                                    <select value={novaRegra.nomeCompartilhado} onChange={e => setNovaRegra({...novaRegra, nomeCompartilhado: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold bg-white">
                                        <option value="">Selecione...</option>
                                        {impressorasLocais.map((imp, idx) => <option key={idx} value={imp.ShareName || ''} disabled={!imp.Shared}>{imp.Name} {imp.Shared ? `(✔ Pronta)` : '(⚠️ COMPARTILHE PRIMEIRO)'}</option>)}
                                    </select>
                                ) : ( <div onClick={buscarImpressorasDoAgente} className="w-full p-2.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-400 bg-white cursor-pointer hover:bg-slate-50 flex items-center">Buscar Instalações...</div> )}
                            </div>
                            <div className="space-y-1 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Bobina</label><select value={novaRegra.bobina} onChange={e => setNovaRegra({...novaRegra, bobina: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold bg-white"><option value="80mm">80mm</option><option value="58mm">58mm</option></select></div>
                            <div className="space-y-1 md:col-span-1 flex gap-2">
                                <div className="w-16"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Vias</label><input type="number" min="1" max="5" value={novaRegra.vias} onChange={e => setNovaRegra({...novaRegra, vias: Number(e.target.value)})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none" /></div>
                                <button onClick={adicionarRegra} disabled={salvandoImpressora} className="flex-1 bg-emerald-500 text-white rounded-lg flex items-center justify-center transition-colors h-[42px] mt-auto"><Icon name="plus" size={18} /></button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {regras.map(regra => (
                                <div key={regra.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex items-center gap-3 w-40"><div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Icon name="printer" size={16} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Setor</p><p className="font-bold text-slate-800">{regra.setor}</p></div></div>
                                        <div className="w-40"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Rede Windows</p><p className="font-bold text-emerald-600">\\ {regra.nomeCompartilhado}</p></div>
                                        <div className="w-20"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Bobina</p><p className="font-bold text-slate-700">{regra.bobina}</p></div>
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