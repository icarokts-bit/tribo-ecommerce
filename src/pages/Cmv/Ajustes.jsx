import React, { useState, useMemo } from 'react';
import Icon from '../../components/Icon';
import AjustesImpressao from '../GestaoPedidos/AjustesImpressao'; 
import { auth, db } from '../../firebase';

export default function Ajustes({ 
    cmvSettings, setCmvSettings, metaVendas, setMetaVendas, 
    saveCMVDoc, saveMeta, catForm, setCatForm, addCat, 
    accForm, setAccForm, handleSaveAcc, accounts, categories, executeDelete 
}) {

    const [activeTab, setActiveTab] = useState('geral'); 
    const [agendamentoTab, setAgendamentoTab] = useState('config'); 

    // =========================================================================
    // LÓGICA UNIVERSAL BLINDADA PARA CONTAS E CATEGORIAS (Remove Duplicados)
    // =========================================================================
    const [localAccForm, setLocalAccForm] = useState({ id: null, originalName: '', name: '', type: 'corrente', closing: '', due: '' });
    const [localCatForm, setLocalCatForm] = useState('');

    // Filtra duplicados visualmente baseados no nome
    const safeAccounts = useMemo(() => {
        const map = new Map();
        (accounts || []).forEach(acc => {
            if (acc.name && !map.has(acc.name.trim().toLowerCase())) {
                map.set(acc.name.trim().toLowerCase(), acc);
            }
        });
        return Array.from(map.values());
    }, [accounts]);

    const safeCategories = useMemo(() => {
        const map = new Map();
        (categories || []).forEach(cat => {
            if (cat.name && !map.has(cat.name.trim().toLowerCase())) {
                map.set(cat.name.trim().toLowerCase(), cat);
            }
        });
        return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [categories]);

    // SALVAR OU EDITAR CONTA UNIVERSAL
    const handleUniversalSaveAcc = async (e) => {
        e.preventDefault();
        const user = auth?.currentUser;
        if (!user || !localAccForm.name.trim()) return;

        const isEditing = !!localAccForm.originalName;

        // 1. Tenta atualizar na Collection
        try {
            const accRef = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/accounts`);
            if (localAccForm.id) {
                await accRef.doc(localAccForm.id).update({
                    name: localAccForm.name, type: localAccForm.type, closing: localAccForm.closing || '', due: localAccForm.due || ''
                }).catch(() => {});
            } else {
                await accRef.add({
                    name: localAccForm.name, type: localAccForm.type, closing: localAccForm.closing || '', due: localAccForm.due || '', group: 'operacional'
                }).catch(() => {});
            }
        } catch (err) {}

        // 2. Atualiza nas Settings (se existir lá)
        let currentAccs = cmvSettings.accounts || [];
        if (isEditing) {
            currentAccs = currentAccs.map(a => 
                (a.id === localAccForm.id || a.name === localAccForm.originalName) 
                ? { ...a, name: localAccForm.name, type: localAccForm.type, closing: localAccForm.closing, due: localAccForm.due } 
                : a
            );
        } else {
            currentAccs.push({ id: crypto.randomUUID(), name: localAccForm.name, type: localAccForm.type, closing: localAccForm.closing, due: localAccForm.due });
        }
        updateSetting('accounts', currentAccs);

        setLocalAccForm({ id: null, originalName: '', name: '', type: 'corrente', closing: '', due: '' });
    };

    // DELETAR CONTA UNIVERSAL
    const handleUniversalDeleteAcc = async (acc) => {
        if (!window.confirm(`Deseja excluir permanentemente a conta "${acc.name}"?`)) return;
        const user = auth?.currentUser;
        if (!user) return;

        if (acc.id) {
            try { await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/accounts`).doc(acc.id).delete().catch(()=>{}); } catch(e) {}
            try { executeDelete('accounts', acc.id); } catch(e) {}
        }

        try {
            const snap = await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/accounts`).where('name', '==', acc.name).get();
            snap.forEach(doc => doc.ref.delete());
        } catch(e) {}

        if (cmvSettings.accounts) {
            const currentAccs = cmvSettings.accounts.filter(a => a.id !== acc.id && a.name !== acc.name);
            updateSetting('accounts', currentAccs);
        }
    };

    // ADICIONAR E DELETAR CATEGORIAS UNIVERSAL
    const handleUniversalAddCat = async (e) => {
        e.preventDefault();
        const user = auth?.currentUser;
        if (!user || !localCatForm.trim()) return;

        try { await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/categories`).add({ name: localCatForm.trim(), type: 'despesa' }).catch(()=>{}); } catch(e) {}
        
        const currentCats = cmvSettings.categories || [];
        currentCats.push({ id: crypto.randomUUID(), name: localCatForm.trim() });
        updateSetting('categories', currentCats);
        
        setLocalCatForm('');
    };

    const handleUniversalDeleteCat = async (cat) => {
        if (!window.confirm(`Deseja excluir a categoria "${cat.name}"?`)) return;
        const user = auth?.currentUser;
        if (!user) return;

        if (cat.id) {
            try { await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/categories`).doc(cat.id).delete().catch(()=>{}); } catch(e){}
            try { executeDelete('categories', cat.id); } catch(e){}
        }

        try {
            const snap = await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/categories`).where('name', '==', cat.name).get();
            snap.forEach(doc => doc.ref.delete());
        } catch(e) {}

        if (cmvSettings.categories) {
            const currentCats = cmvSettings.categories.filter(c => c.id !== cat.id && c.name !== cat.name);
            updateSetting('categories', currentCats);
        }
    };
    // =========================================================================

    const handleSaveSettings = () => saveCMVDoc('settings', cmvSettings);

    const updateSetting = (campo, valor) => {
        const newSettings = { ...cmvSettings, [campo]: valor };
        setCmvSettings(newSettings);
        saveCMVDoc('settings', newSettings);
    };

    const diasDaSemana = [
        { id: 1, label: 'Segunda' }, { id: 2, label: 'Terça' }, { id: 3, label: 'Quarta' },
        { id: 4, label: 'Quinta' }, { id: 5, label: 'Sexta' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }
    ];

    const workingDays = cmvSettings.workingDays || [0, 3, 4, 5, 6];

    const toggleDay = (dayId) => {
        let newDays = [...workingDays];
        if (newDays.includes(dayId)) newDays = newDays.filter(d => d !== dayId);
        else newDays.push(dayId);
        updateSetting('workingDays', newDays);
    };

    const horariosLoja = cmvSettings.horarios || [
        { dia: 0, nome: 'Domingo', ativo: true, abertura: '18:00', fechamento: '23:30' },
        { dia: 1, nome: 'Segunda', ativo: false, abertura: '18:00', fechamento: '23:30' },
        { dia: 2, nome: 'Terça', ativo: true, abertura: '18:00', fechamento: '23:30' },
        { dia: 3, nome: 'Quarta', ativo: true, abertura: '18:00', fechamento: '23:30' },
        { dia: 4, nome: 'Quinta', ativo: true, abertura: '18:00', fechamento: '23:30' },
        { dia: 5, nome: 'Sexta', ativo: true, abertura: '18:00', fechamento: '23:59' },
        { dia: 6, nome: 'Sábado', ativo: true, abertura: '18:00', fechamento: '23:59' },
    ];

    const handleHorarioChange = (index, campo, valor) => {
        const novosHorarios = [...horariosLoja];
        novosHorarios[index] = { ...novosHorarios[index], [campo]: valor };
        updateSetting('horarios', novosHorarios);
    };

    // =========================================================================
    // CONFIGURAÇÕES EXCLUSIVAS DO ROBÔ IA
    // =========================================================================
    const horariosIA = cmvSettings.ia_horarios || horariosLoja;

    const handleHorarioIAChange = (index, campo, valor) => {
        const novosHorarios = [...horariosIA];
        novosHorarios[index] = { ...novosHorarios[index], [campo]: valor };
        updateSetting('ia_horarios', novosHorarios);
    };

    const sincronizarDadosParaIA = () => {
        const linkBase = cmvSettings.menuLink ? `https://tribotech.com.br/${cmvSettings.menuLink}` : 'https://tribotech.com.br';
        const newSettings = {
            ...cmvSettings,
            ia_ativo: cmvSettings.ia_ativo !== false,
            ia_nomeLoja: cmvSettings.companyName || '',
            ia_linkCardapio: linkBase,
            ia_endereco: cmvSettings.storeAddress || '',
            ia_telefone: cmvSettings.storePhone || '',
            ia_trabalhaDelivery: cmvSettings.geral_entregas !== false,
            ia_trabalhaRetirada: cmvSettings.geral_retirada !== false,
            ia_trabalhaLocal: cmvSettings.geral_local !== false,
            ia_horarios: horariosLoja
        };
        setCmvSettings(newSettings);
        saveCMVDoc('settings', newSettings);
        alert('✅ Dados sincronizados com sucesso das abas Geral, Site e Horários!');
    };

    const horariosAgendamento = cmvSettings.horariosAgendamento || [
        { dia: 0, nome: 'DOM', ativo: true, abertura: '20:00', fechamento: '22:00' },
        { dia: 1, nome: 'SEG', ativo: false, abertura: '20:00', fechamento: '22:00' },
        { dia: 2, nome: 'TER', ativo: false, abertura: '20:00', fechamento: '22:00' },
        { dia: 3, nome: 'QUA', ativo: false, abertura: '20:00', fechamento: '22:00' },
        { dia: 4, nome: 'QUI', ativo: true, abertura: '20:00', fechamento: '22:00' },
        { dia: 5, nome: 'SEX', ativo: true, abertura: '20:00', fechamento: '23:00' },
        { dia: 6, nome: 'SAB', ativo: true, abertura: '20:00', fechamento: '23:00' },
    ];

    const handleHorarioAgendamentoChange = (index, campo, valor) => {
        const novosHorarios = [...horariosAgendamento];
        novosHorarios[index] = { ...novosHorarios[index], [campo]: valor };
        updateSetting('horariosAgendamento', novosHorarios);
    };

    const handleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const targetWidth = type === 'logo' ? 400 : (type === 'totemCover' ? 800 : 1200);
                
                if (width > targetWidth) {
                    const ratio = targetWidth / width;
                    width = width * ratio;
                    height = height * ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64Str = canvas.toDataURL('image/jpeg', 0.8);
                
                let keyName = '';
                if (type === 'logo') keyName = 'logoUrl';
                else if (type === 'banner') keyName = 'bannerUrl';
                else if (type === 'totemCover') keyName = 'totemCoverUrl';

                updateSetting(keyName, base64Str);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const formatSlug = (value) => {
        return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    };

    const ToggleSwitch = ({ checked, onChange }) => (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={checked || false} onChange={onChange} />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
        </label>
    );

    const ToggleRow = ({ title, description, checked, onChange, icon }) => (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-200 transition-colors">
            <div className="pr-4 flex gap-4 items-center">
                {icon && <div className="text-emerald-500 bg-emerald-50 p-2 rounded-lg">{icon}</div>}
                <div>
                    <h4 className="font-bold text-xs text-slate-800">{title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{checked ? 'Ativado' : 'Desativado'}</span>
                <ToggleSwitch checked={checked} onChange={onChange} />
            </div>
        </div>
    );

    const SidebarButton = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg text-[11px] font-black uppercase transition-all whitespace-nowrap
                ${activeTab === id
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }
            `}
        >
            <Icon name={icon} size={16} className={activeTab === id ? 'text-purple-600' : 'text-slate-400'} />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full fade-in pb-32">
            
            {/* CABEÇALHO */}
            <div className="flex justify-between items-center bg-[#1A202C] text-white p-4 rounded-xl shadow mb-6">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-[#F8CC82] flex items-center gap-2">
                        <Icon name="settings" size={20} /> Configurações
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Ajustes gerais do sistema e loja</p>
                </div>
            </div>

            {/* LAYOUT COM MENU LATERAL */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                
                {/* MENU LATERAL */}
                <div className="w-full md:w-56 bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-row md:flex-col gap-1 overflow-x-auto flex-shrink-0 custom-scrollbar sticky top-4">
                    <SidebarButton id="geral" icon="tool" label="Geral" />
                    <SidebarButton id="site" icon="layout" label="Personalizar Site" />
                    <SidebarButton id="horarios" icon="clock" label="Horários Delivery" />
                    <SidebarButton id="robo_ia" icon="message-circle" label="Robô IA (WhatsApp)" />
                    <SidebarButton id="impressao" icon="printer" label="Impressão" />
                    <SidebarButton id="agendamento" icon="calendar" label="Agendamento" />
                    <SidebarButton id="financeiro" icon="dollar-sign" label="Dados Financeiros" />
                </div>

                {/* ÁREA DE CONTEÚDO */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] w-full">
                    
                    {/* ABA: GERAL (Tipos de Pedido e Automações) */}
                    {activeTab === 'geral' && (
                        <div className="p-6 space-y-8 animate-fade-in-up">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 mb-4">Tipos de pedidos</h3>
                                <div className="space-y-2">
                                    <ToggleRow title="Trabalha com entregas" description="Ative se você aceita pedidos para entrega em domicílio" checked={cmvSettings.geral_entregas !== false} onChange={(e) => updateSetting('geral_entregas', e.target.checked)} />
                                    <ToggleRow title="Trabalha com retirada" description="Ative se o seu cliente pode retirar o pedido no seu estabelecimento" checked={cmvSettings.geral_retirada !== false} onChange={(e) => updateSetting('geral_retirada', e.target.checked)} />
                                    <ToggleRow title="Trabalha com consumo no local" description="Ative se o seu cliente pode fazer um pedido para ser consumido no seu estabelecimento" checked={cmvSettings.geral_local !== false} onChange={(e) => updateSetting('geral_local', e.target.checked)} />
                                </div>
                                <div className="border-t border-slate-100 my-4 border-dashed"></div>
                                <div className="space-y-2">
                                    <ToggleRow title="Trabalha com pedidos imediatos" description="Ative se o seu cliente pode fazer pedidos para agora, ou seja, não agendado" checked={cmvSettings.geral_imediatos !== false} onChange={(e) => updateSetting('geral_imediatos', e.target.checked)} />
                                    <ToggleRow title="Trabalha com agendamento" description="Ative se você aceita pedidos agendados para momentos previamente definidos" checked={cmvSettings.geral_agendamento !== false} onChange={(e) => updateSetting('geral_agendamento', e.target.checked)} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 mb-4">Configurações gerais</h3>
                                <div className="space-y-2">
                                    <ToggleRow title="Finalizar pedidos automaticamente após 24 horas" description="Pedidos em aberto há mais de 24h serão finalizados automaticamente pelo sistema" checked={cmvSettings.geral_autoFinalizar24h || false} onChange={(e) => updateSetting('geral_autoFinalizar24h', e.target.checked)} />
                                    <ToggleRow title="Finalizar pedidos agendados 3d após data" description="Pedidos agendados em aberto serão finalizados automaticamente pelo sistema 3 dias após a data de agendamento" checked={cmvSettings.geral_autoFinalizarAgendado3d || false} onChange={(e) => updateSetting('geral_autoFinalizarAgendado3d', e.target.checked)} />
                                    <ToggleRow title="Imprimir e aceitar pedidos de delivery/retirada automaticamente" description="Os novos pedidos serão aceitos e impressos de forma automática" checked={cmvSettings.geral_autoAceitarImprimirDelivery || false} onChange={(e) => updateSetting('geral_autoAceitarImprimirDelivery', e.target.checked)} />
                                    <ToggleRow title="Imprimir e aceitar pedidos de mesa/comanda automaticamente" description="Os novos pedidos de mesa serão aceitos e impressos de forma automática" checked={cmvSettings.geral_autoAceitarImprimirMesa || false} onChange={(e) => updateSetting('geral_autoAceitarImprimirMesa', e.target.checked)} />
                                    <ToggleRow title="Notificação de Pedidos" description="Notificação sonora e visual de novos pedidos ativa" checked={cmvSettings.geral_notificacaoPedidos !== false} icon={<Icon name="bell" size={16} />} onChange={(e) => updateSetting('geral_notificacaoPedidos', e.target.checked)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA: PERSONALIZAR SITE */}
                    {activeTab === 'site' && (
                        <div className="p-6 space-y-8 animate-fade-in-up">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2">Detalhes da Loja</h3>
                                <p className="text-xs text-slate-500 font-bold mb-4">Defina o nome da sua loja, link personalizado e contatos.</p>
                                <div className="space-y-4 max-w-2xl">
                                    <div className="space-y-1">
                                        <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Nome de Exibição da Loja</label>
                                        <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" value={cmvSettings.companyName || ''} onChange={e => setCmvSettings({...cmvSettings, companyName: e.target.value})} onBlur={handleSaveSettings} placeholder="Ex: Tribo Burger" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Link Personalizado do Cardápio</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-purple-500 transition-colors">
                                            <span className="px-4 text-slate-400 font-bold text-xs bg-slate-100 border-r border-slate-200 hidden sm:block h-full py-3">tribotech.com.br/</span>
                                            <input type="text" className="w-full p-3 bg-transparent font-bold outline-none text-sm text-slate-700 placeholder-slate-300" value={cmvSettings.menuLink || ''} onChange={e => setCmvSettings({...cmvSettings, menuLink: formatSlug(e.target.value)})} onBlur={handleSaveSettings} placeholder="seucardapio" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">WhatsApp / Telefone</label>
                                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" value={cmvSettings.storePhone || ''} onChange={e => setCmvSettings({...cmvSettings, storePhone: e.target.value})} onBlur={handleSaveSettings} placeholder="(11) 99999-9999" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Endereço Físico</label>
                                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" value={cmvSettings.storeAddress || ''} onChange={e => setCmvSettings({...cmvSettings, storeAddress: e.target.value})} onBlur={handleSaveSettings} placeholder="Rua Exemplo, 123" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                                        <input type="checkbox" id="showAddress" checked={cmvSettings.showAddress || false} onChange={e => updateSetting('showAddress', e.target.checked)} className="w-5 h-5 accent-purple-500 rounded cursor-pointer" />
                                        <label htmlFor="showAddress" className="font-black uppercase text-slate-600 text-[10px] cursor-pointer">Deixar endereço visível para os clientes no Cardápio Digital?</label>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-8">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6">Imagens da Loja e Totem</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-between text-center">
                                        <label className="font-black uppercase text-slate-700 text-xs block">Logo da Loja</label>
                                        <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden flex-shrink-0 border border-slate-300 shadow-sm mx-auto">
                                            {cmvSettings.logoUrl ? <img src={cmvSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><Icon name="user" size={32} /></div>}
                                        </div>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="text-[10px] w-full cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" />
                                    </div>
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-between text-center">
                                        <label className="font-black uppercase text-slate-700 text-xs block">Capa Menu (Horizontal)</label>
                                        <div className="w-full h-24 bg-white rounded-2xl overflow-hidden flex-shrink-0 border border-slate-300 shadow-sm">
                                            {cmvSettings.bannerUrl ? <img src={cmvSettings.bannerUrl} alt="Banner" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><Icon name="layout" size={32} /></div>}
                                        </div>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="text-[10px] w-full cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" />
                                    </div>
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-between text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg">TOTEM</div>
                                        <label className="font-black uppercase text-slate-700 text-xs block">Capa Tela Descanso</label>
                                        <div className="w-16 h-24 bg-white rounded-2xl overflow-hidden flex-shrink-0 border border-slate-300 shadow-sm mx-auto">
                                            {cmvSettings.totemCoverUrl ? <img src={cmvSettings.totemCoverUrl} alt="Capa Totem" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100"><Icon name="image" size={24} /></div>}
                                        </div>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'totemCover')} className="text-[10px] w-full cursor-pointer file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" />
                                    </div>
                                </div>
                                <div className="mt-6 max-w-2xl bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                    <label className="font-black uppercase text-slate-800 text-xs mb-2 block">Orientação da Tela de Descanso do Totem</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 cursor-pointer transition-colors" value={cmvSettings.totemOrientation || 'vertical'} onChange={e => updateSetting('totemOrientation', e.target.value)}>
                                        <option value="vertical">Vertical (Totem em Pé)</option>
                                        <option value="horizontal">Horizontal (Monitor / TV deitado)</option>
                                    </select>
                                    <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl mt-3 text-xs font-bold text-purple-900">
                                        <p className="font-black uppercase mb-1">📐 Tamanho ideal para criar a arte:</p>
                                        {cmvSettings.totemOrientation === 'horizontal' ? <span>🖥️ Modo Horizontal: Crie a imagem exatamente com <b>1920 x 1080 pixels</b> (Formato TV/Computador).</span> : <span>📱 Modo Vertical: Crie a imagem exatamente com <b>1080 x 1920 pixels</b> (Formato Story/Totem em pé).</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA: HORÁRIOS */}
                    {activeTab === 'horarios' && (
                        <div className="p-6 space-y-6 animate-fade-in-up">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2">Horários de Funcionamento (Delivery)</h3>
                                <p className="text-xs text-slate-500 font-bold mb-6">Defina os dias e horários que o seu Delivery recebe pedidos. O cardápio online será bloqueado automaticamente fora desse horário.</p>
                                <div className="space-y-3 max-w-3xl">
                                    {horariosLoja.map((horario, index) => (
                                        <div key={horario.dia} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-2xl transition-all ${horario.ativo ? 'bg-white border-purple-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                                            <div className="flex items-center gap-3 w-32 mb-3 sm:mb-0">
                                                <input type="checkbox" checked={horario.ativo} onChange={e => handleHorarioChange(index, 'ativo', e.target.checked)} className="w-5 h-5 accent-purple-500 rounded cursor-pointer" />
                                                <span className={`font-black uppercase text-xs ${horario.ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{horario.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <input type="time" disabled={!horario.ativo} value={horario.abertura} onChange={e => handleHorarioChange(index, 'abertura', e.target.value)} className="w-full sm:w-auto p-2 border border-slate-200 rounded-xl font-bold outline-none bg-slate-50 text-slate-700 focus:border-purple-500 disabled:opacity-50 transition-colors text-sm" />
                                                <span className="font-black text-slate-400 text-[10px] uppercase">Até</span>
                                                <input type="time" disabled={!horario.ativo} value={horario.fechamento} onChange={e => handleHorarioChange(index, 'fechamento', e.target.value)} className="w-full sm:w-auto p-2 border border-slate-200 rounded-xl font-bold outline-none bg-slate-50 text-slate-700 focus:border-purple-500 disabled:opacity-50 transition-colors text-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* NOVA ABA: ROBÔ IA (WHATSAPP) */}
                    {/* ========================================================================= */}
                    {activeTab === 'robo_ia' && (
                        <div className="p-6 space-y-8 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-purple-700 flex items-center gap-2">
                                        <Icon name="message-circle" size={18} /> Configurações do Robô IA (WhatsApp)
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold mt-1">
                                        O assistente virtual lerá exatamente os dados preenchidos abaixo para responder aos seus clientes.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={sincronizarDadosParaIA}
                                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] transition-colors flex items-center gap-2 self-start sm:self-auto shadow-sm"
                                >
                                    <Icon name="refresh-cw" size={14} /> Puxar Dados das Outras Abas
                                </button>
                            </div>

                            {/* CHAVE MESTRA DO ROBÔ */}
                            <div className="max-w-3xl">
                                <ToggleRow 
                                    title="Ativar Atendimento por Inteligência Artificial no WhatsApp" 
                                    description="Quando ativado, o robô responde dúvidas de cardápio, promoções, endereço e horários automaticamente." 
                                    checked={cmvSettings.ia_ativo !== false} 
                                    onChange={(e) => updateSetting('ia_ativo', e.target.checked)} 
                                />
                            </div>

                            {/* DADOS PRINCIPAIS PARA O ROBÔ */}
                            <div className="space-y-4 max-w-3xl">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">1. Identidade e Links da Loja</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Nome da Loja (Para o Robô falar)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" 
                                            value={cmvSettings.ia_nomeLoja ?? cmvSettings.companyName ?? ''} 
                                            onChange={e => setCmvSettings({...cmvSettings, ia_nomeLoja: e.target.value})} 
                                            onBlur={handleSaveSettings} 
                                            placeholder="Ex: Tribo Tech Burger" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Link Direto do Cardápio Digital</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" 
                                            value={cmvSettings.ia_linkCardapio ?? (cmvSettings.menuLink ? `https://tribotech.com.br/${cmvSettings.menuLink}` : '')} 
                                            onChange={e => setCmvSettings({...cmvSettings, ia_linkCardapio: e.target.value})} 
                                            onBlur={handleSaveSettings} 
                                            placeholder="https://tribotech.com.br/sualoja" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Endereço Completo (Retirada / Local)</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" 
                                            value={cmvSettings.ia_endereco ?? cmvSettings.storeAddress ?? ''} 
                                            onChange={e => setCmvSettings({...cmvSettings, ia_endereco: e.target.value})} 
                                            onBlur={handleSaveSettings} 
                                            placeholder="Rua Exemplo, 123 - Centro" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Telefone / WhatsApp de Contato</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors" 
                                            value={cmvSettings.ia_telefone ?? cmvSettings.storePhone ?? ''} 
                                            onChange={e => setCmvSettings({...cmvSettings, ia_telefone: e.target.value})} 
                                            onBlur={handleSaveSettings} 
                                            placeholder="(11) 99999-9999" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MODALIDADES DE ENTREGA E RETIRADA */}
                            <div className="space-y-3 max-w-3xl pt-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">2. Modalidades de Atendimento que o Robô deve informar</h4>
                                <ToggleRow 
                                    title="Trabalha com Delivery (Entregas)" 
                                    description="O robô informará aos clientes que vocês fazem entregas em domicílio." 
                                    checked={(cmvSettings.ia_trabalhaDelivery ?? cmvSettings.geral_entregas) !== false} 
                                    onChange={(e) => updateSetting('ia_trabalhaDelivery', e.target.checked)} 
                                />
                                <ToggleRow 
                                    title="Permite Retirar o Pedido no Balcão (Retirada)" 
                                    description="O robô informará que o cliente pode fazer o pedido e retirar na loja." 
                                    checked={(cmvSettings.ia_trabalhaRetirada ?? cmvSettings.geral_retirada) !== false} 
                                    onChange={(e) => updateSetting('ia_trabalhaRetirada', e.target.checked)} 
                                />
                                <ToggleRow 
                                    title="Trabalha com Consumo no Local (Salão/Mesas)" 
                                    description="O robô informará que o cliente pode comer presencialmente no estabelecimento." 
                                    checked={(cmvSettings.ia_trabalhaLocal ?? cmvSettings.geral_local) !== false} 
                                    onChange={(e) => updateSetting('ia_trabalhaLocal', e.target.checked)} 
                                />
                            </div>

                            {/* HORÁRIOS QUE O ROBÔ VAI RESPONDER */}
                            <div className="space-y-4 max-w-3xl pt-2">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">3. Dias e Horários de Funcionamento para o Robô</h4>
                                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">Configure os dias e horários exatos que o robô deve informar quando o cliente perguntar.</p>
                                </div>
                                <div className="space-y-2.5">
                                    {horariosIA.map((horario, index) => (
                                        <div key={horario.dia} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border rounded-2xl transition-all ${horario.ativo ? 'bg-white border-purple-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                                            <div className="flex items-center gap-3 w-32 mb-2 sm:mb-0">
                                                <input type="checkbox" checked={horario.ativo} onChange={e => handleHorarioIAChange(index, 'ativo', e.target.checked)} className="w-5 h-5 accent-purple-500 rounded cursor-pointer" />
                                                <span className={`font-black uppercase text-xs ${horario.ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{horario.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <input type="time" disabled={!horario.ativo} value={horario.abertura} onChange={e => handleHorarioIAChange(index, 'abertura', e.target.value)} className="w-full sm:w-auto p-2 border border-slate-200 rounded-xl font-bold outline-none bg-slate-50 text-slate-700 focus:border-purple-500 disabled:opacity-50 transition-colors text-sm" />
                                                <span className="font-black text-slate-400 text-[10px] uppercase">Até</span>
                                                <input type="time" disabled={!horario.ativo} value={horario.fechamento} onChange={e => handleHorarioIAChange(index, 'fechamento', e.target.value)} className="w-full sm:w-auto p-2 border border-slate-200 rounded-xl font-bold outline-none bg-slate-50 text-slate-700 focus:border-purple-500 disabled:opacity-50 transition-colors text-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* INSTRUÇÕES EXTRAS OPCIONAIS */}
                            <div className="space-y-2 max-w-3xl pt-2">
                                <label className="font-black uppercase text-slate-700 text-xs block">4. Informações Extras para o Robô (Opcional)</label>
                                <p className="text-[10px] text-slate-500 font-bold">Escreva avisos importantes, tempo médio de entrega, formas de pagamento aceitas ou regras que o robô deve saber.</p>
                                <textarea 
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-purple-500 text-sm text-slate-700 transition-colors"
                                    value={cmvSettings.ia_instrucoesExtras || ''}
                                    onChange={e => setCmvSettings({...cmvSettings, ia_instrucoesExtras: e.target.value})}
                                    onBlur={handleSaveSettings}
                                    placeholder="Ex: Aceitamos Pix, Cartão e Dinheiro. Tempo médio de entrega é de 40 a 50 minutos."
                                />
                            </div>

                            <div className="pt-2 max-w-3xl">
                                <button 
                                    type="button" 
                                    onClick={() => { handleSaveSettings(); alert('✅ Configurações do Robô IA salvas com sucesso!'); }} 
                                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-black uppercase text-xs transition-colors shadow-md"
                                >
                                    Salvar Configurações do Robô IA
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ABA: AGENDAMENTO */}
                    {activeTab === 'agendamento' && (
                        <div className="flex flex-col h-full animate-fade-in-up">
                            <div className="flex border-b border-slate-200 bg-slate-50 pt-2 px-4 gap-6 overflow-x-auto custom-scrollbar">
                                <button onClick={() => setAgendamentoTab('config')} className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${agendamentoTab === 'config' ? 'text-purple-600 border-purple-600' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}>Configurações</button>
                                <button onClick={() => setAgendamentoTab('horarios')} className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${agendamentoTab === 'horarios' ? 'text-purple-600 border-purple-600' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}>Horários</button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {agendamentoTab === 'config' ? (
                                    <div className="space-y-6 max-w-4xl fade-in">
                                        <div><h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-6">Configurações de agendamento <Icon name="help-circle" size={16} className="text-slate-400"/></h3><h4 className="text-sm font-bold text-slate-700 mb-4">Agendamento de pedidos</h4></div>
                                        <div className="space-y-4">
                                            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                                <label className="font-black text-slate-800 text-xs block mb-1">Tempo de antecedência mínima</label>
                                                <p className="text-[10px] text-slate-500 font-bold mb-3">O cliente só poderá agendar um pedido para após o tempo de antecedência mínima.</p>
                                                <div className="flex items-center gap-3">
                                                    <input type="number" min="0" className="w-24 p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-sm outline-none focus:border-purple-500 text-center transition-colors" value={cmvSettings.agendamento_antecedenciaMinima ?? 1} onChange={e => updateSetting('agendamento_antecedenciaMinima', e.target.value)} />
                                                    <span className="text-xs font-bold text-slate-600">horas</span>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                                <label className="font-black text-slate-800 text-xs block mb-1">Tempo de antecedência máxima</label>
                                                <p className="text-[10px] text-slate-500 font-bold mb-3">O sistema não irá permitir o agendamento de pedidos para uma data que exceda o tempo de antecedência máxima.</p>
                                                <div className="flex items-center gap-3">
                                                    <input type="number" min="1" className="w-24 p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-sm outline-none focus:border-purple-500 text-center transition-colors" value={cmvSettings.agendamento_antecedenciaMaxima ?? 15} onChange={e => updateSetting('agendamento_antecedenciaMaxima', e.target.value)} />
                                                    <span className="text-xs font-bold text-slate-600">dias</span>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                                <label className="font-black text-slate-800 text-xs block mb-1">Intervalo de horários</label>
                                                <p className="text-[10px] text-slate-500 font-bold mb-3">Os horários de entrega dos pedidos agendados serão divididos em intervalos iguais segundo o valor que você informar aqui.</p>
                                                <div className="flex items-center gap-3">
                                                    <input type="number" min="5" step="5" className="w-24 p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-sm outline-none focus:border-purple-500 text-center transition-colors" value={cmvSettings.agendamento_intervaloMinutos ?? 30} onChange={e => updateSetting('agendamento_intervaloMinutos', e.target.value)} />
                                                    <span className="text-xs font-bold text-slate-600">minutos</span>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                                <label className="font-black text-slate-800 text-xs block mb-1">Quantidade máxima de pedidos por intervalo</label>
                                                <p className="text-[10px] text-slate-500 font-bold mb-3">Informe um valor caso queira que o sistema só permita uma certa quantidade de pedidos para cada intervalo.</p>
                                                <div className="flex items-center gap-3">
                                                    <input type="number" min="1" className="w-24 p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-sm outline-none focus:border-purple-500 text-center transition-colors" value={cmvSettings.agendamento_maxPedidosIntervalo ?? 5} onChange={e => updateSetting('agendamento_maxPedidosIntervalo', e.target.value)} />
                                                    <span className="text-xs font-bold text-slate-600">pedidos</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-2">
                                            <ToggleRow title="Cliente pode agendar apenas para o próximo dia disponível" description="Com esta opção ativa, o cliente só poderá agendar apenas para o próximo dia de agendamento disponível" checked={cmvSettings.agendamento_apenasProximoDia} onChange={e => updateSetting('agendamento_apenasProximoDia', e.target.checked)} />
                                            <ToggleRow title="Bloquear agendamentos para o mesmo dia" description="Ao ativar essa opção, o cliente não poderá fazer agendamentos para o mesmo dia" checked={cmvSettings.agendamento_bloquearMesmoDia} onChange={e => updateSetting('agendamento_bloquearMesmoDia', e.target.checked)} />
                                            <ToggleRow title="Iniciar preparação dos pedidos agendados automaticamente" description="Os pedidos agendados serão movidos para o status Em Preparação um determinado tempo antes do horário agendado e serão impressos." checked={cmvSettings.agendamento_preparoAutomatico} onChange={e => updateSetting('agendamento_preparoAutomatico', e.target.checked)} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 fade-in max-w-6xl">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-slate-800 mb-6">Horário de entrega dos pedidos agendados</h3>
                                            {horariosAgendamento.map((horario, index) => (
                                                <div key={horario.dia} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 group">
                                                    <div className="flex items-center gap-4 w-24"><span className="font-bold text-xs text-slate-700">{horario.nome}</span></div>
                                                    <div className="flex items-center gap-2 flex-1 justify-start">
                                                        {horario.ativo ? (
                                                            <>
                                                                <input type="time" value={horario.abertura} onChange={e => handleHorarioAgendamentoChange(index, 'abertura', e.target.value)} className="px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-700 focus:border-purple-500 outline-none transition-colors w-24 text-center" />
                                                                <input type="time" value={horario.fechamento} onChange={e => handleHorarioAgendamentoChange(index, 'fechamento', e.target.value)} className="px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-700 focus:border-purple-500 outline-none transition-colors w-24 text-center" />
                                                                <button onClick={() => handleHorarioAgendamentoChange(index, 'ativo', false)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors ml-2" title="Desativar Dia"><Icon name="trash-2" size={14} /></button>
                                                            </>
                                                        ) : (<span className="text-xs text-slate-400 italic">Fechado</span>)}
                                                    </div>
                                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!horario.ativo ? <button onClick={() => handleHorarioAgendamentoChange(index, 'ativo', true)} className="text-purple-600 hover:text-purple-800 text-xs font-black uppercase flex items-center gap-1 transition-colors"><Icon name="plus" size={14}/> Ativar</button> : <button className="text-slate-400 hover:text-purple-600 transition-colors" title="Copiar Horário"><Icon name="copy" size={14}/></button>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                                            <h3 className="text-sm font-black text-slate-800 mb-2">Datas personalizadas</h3>
                                            <p className="text-xs text-slate-500 mb-6">Configure horários diferentes para certas datas, elas irão sobrepor os horários de agendamento.</p>
                                            <button className="w-full py-3 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-700 uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm mb-10"><Icon name="plus" size={14}/> Adicionar</button>
                                            <div className="flex flex-col items-center justify-center py-10 opacity-40"><Icon name="package" size={48} className="text-slate-400 mb-4"/><p className="text-sm font-bold text-slate-500">Nenhuma personalização cadastrada</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ABA: DADOS FINANCEIROS / ERP */}
                    {activeTab === 'financeiro' && (
                        <div className="p-6 space-y-8 animate-fade-in-up">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* CARD METAS E TAXAS */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b pb-2 flex items-center gap-2">
                                        <Icon name="percent" size={16} className="text-emerald-500"/> Metas e Taxas Base
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Meta de Vendas Mensal (R$)</label>
                                            <div className="flex gap-2">
                                                <input type="number" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-sm focus:border-emerald-500 transition-colors" value={metaVendas} onChange={e => setMetaVendas(e.target.value)} />
                                                <button onClick={() => saveMeta(metaVendas)} className="bg-slate-900 hover:bg-black text-[#F8CC82] px-6 rounded-xl font-black uppercase text-xs transition-colors">Salvar</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1 text-[10px]">CMV Alvo (%)</label><input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500 transition-colors" value={cmvSettings.targetCMV} onChange={e => setCmvSettings({...cmvSettings, targetCMV: e.target.value})} onBlur={handleSaveSettings} /></div>
                                            <div className="space-y-1"><label className="font-black uppercase text-emerald-500 ml-1 text-[10px]">Imposto (%)</label><input type="number" step="0.01" className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-bold outline-none text-emerald-800 focus:border-emerald-500 transition-colors" value={cmvSettings.tax || ''} onChange={e => setCmvSettings({...cmvSettings, tax: e.target.value})} onBlur={handleSaveSettings} /></div>
                                            <div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Taxa Débito (%)</label><input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500 transition-colors" value={cmvSettings.taxaDebito} onChange={e => setCmvSettings({...cmvSettings, taxaDebito: e.target.value})} onBlur={handleSaveSettings} /></div>
                                            <div className="space-y-1"><label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Taxa Crédito (%)</label><input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500 transition-colors" value={cmvSettings.taxaCredito} onChange={e => setCmvSettings({...cmvSettings, taxaCredito: e.target.value})} onBlur={handleSaveSettings} /></div>
                                            <div className="space-y-1 md:col-span-2"><label className="font-black uppercase text-orange-400 ml-1 text-[10px]">Taxa iFood (%)</label><input type="number" step="0.01" className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl font-bold outline-none text-orange-800 focus:border-orange-500 transition-colors" value={cmvSettings.ifoodTax} onChange={e => setCmvSettings({...cmvSettings, ifoodTax: e.target.value})} onBlur={handleSaveSettings} /></div>
                                        </div>
                                    </div>
                                </div>

                                {/* CARD DIAS FINANCEIROS */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b pb-2 flex items-center gap-2">
                                        <Icon name="calendar" size={16} className="text-emerald-500"/> Dias Financeiros (Projeções)
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold mb-4">Dias que a loja abre para cálculo de metas de faturamento mensal e Dashboard.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {diasDaSemana.map(dia => {
                                            const isSelected = workingDays.includes(dia.id);
                                            return (
                                                <button key={dia.id} type="button" onClick={() => toggleDay(dia.id)} className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all border ${isSelected ? 'bg-[#F27A18] text-black border-[#F27A18] shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200'}`}>
                                                    {dia.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* CARD CONTAS (MÉTODO BLINDADO) */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b pb-2 flex items-center gap-2">
                                        <Icon name="wallet" size={16} className="text-blue-500"/> Contas e Cartões
                                    </h3>
                                    <form onSubmit={handleUniversalSaveAcc} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Nome da Conta/Cartão" required className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none text-sm focus:border-blue-500 transition-colors" value={localAccForm.name} onChange={e => setLocalAccForm({...localAccForm, name: e.target.value})} />
                                            <select className="p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none text-sm focus:border-blue-500 transition-colors" value={localAccForm.type} onChange={e => setLocalAccForm({...localAccForm, type: e.target.value, closing: e.target.value === 'corrente' ? '' : localAccForm.closing, due: e.target.value === 'corrente' ? '' : localAccForm.due})}>
                                                <option value="corrente">Conta Corrente</option>
                                                <option value="cartao">Cartão de Crédito</option>
                                            </select>
                                        </div>
                                        {localAccForm.type === 'cartao' && (
                                            <div className="flex gap-2 fade-in">
                                                <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Dia Fechamento</label><input type="number" min="1" max="31" placeholder="Ex: 25" required className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none text-sm focus:border-blue-500 transition-colors" value={localAccForm.closing} onChange={e => setLocalAccForm({...localAccForm, closing: e.target.value})} /></div>
                                                <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-1 block mb-1">Dia Vencimento</label><input type="number" min="1" max="31" placeholder="Ex: 5" required className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none text-sm focus:border-blue-500 transition-colors" value={localAccForm.due} onChange={e => setLocalAccForm({...localAccForm, due: e.target.value})} /></div>
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-1">
                                            <button type="submit" className={`flex-1 ${localAccForm.originalName ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3 rounded-xl font-black uppercase text-xs transition-colors shadow-sm`}>
                                                {localAccForm.originalName ? 'Salvar Edição' : 'Adicionar Conta'}
                                            </button>
                                            {localAccForm.originalName && (
                                                <button type="button" onClick={() => setLocalAccForm({ id: null, originalName: '', name: '', type: 'corrente', closing: '', due: '' })} className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-5 rounded-xl font-black uppercase text-xs transition-colors flex items-center justify-center">
                                                    <Icon name="x" size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                    
                                    <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-1">
                                        {safeAccounts.map((acc, index) => (
                                            <div key={acc.id || index} className={`flex justify-between items-center p-4 border rounded-xl transition-colors ${localAccForm.originalName === acc.name ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 text-sm">{acc.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex gap-2 items-center">
                                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{acc.type}</span>
                                                        {acc.type === 'cartao' && acc.closing && acc.due && (<span className="text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">F:{acc.closing} | V:{acc.due}</span>)}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setLocalAccForm({ id: acc.id || null, originalName: acc.name, name: acc.name, type: acc.type || 'corrente', closing: acc.closing || '', due: acc.due || '' })} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 bg-slate-50 rounded-lg transition-colors" title="Editar Conta"><Icon name="edit" size={16} /></button>
                                                    <button onClick={() => handleUniversalDeleteAcc(acc)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 bg-slate-50 rounded-lg transition-colors" title="Excluir Conta"><Icon name="trash" size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* CARD CATEGORIAS (MÉTODO BLINDADO) */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 border-b pb-2 flex items-center gap-2">
                                        <Icon name="tag" size={16} className="text-indigo-500"/> Categorias Financeiras
                                    </h3>
                                    <form onSubmit={handleUniversalAddCat} className="flex gap-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <input type="text" placeholder="Nova Categoria" required className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none text-sm focus:border-indigo-500 transition-colors" value={localCatForm} onChange={e => setLocalCatForm(e.target.value)} />
                                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-black uppercase text-xs transition-colors shadow-sm">Add</button>
                                    </form>
                                    <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-1">
                                        {safeCategories && safeCategories.length > 0 ? safeCategories.map((cat, index) => (
                                            <div key={cat.id || index} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                                                <span className="font-black text-slate-700 text-xs uppercase">{cat.name}</span>
                                                <button onClick={() => handleUniversalDeleteCat(cat)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 bg-slate-50 rounded-lg transition-colors" title="Excluir Categoria"><Icon name="trash" size={16} /></button>
                                            </div>
                                        )) : (<p className="text-center text-xs font-black uppercase text-slate-400 py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhuma categoria cadastrada</p>)}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ABA: IMPRESSÃO */}
                    {activeTab === 'impressao' && (
                        <div className="animate-fade-in-up">
                            <AjustesImpressao />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}