import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import Icon from '../components/Icon';

const IMAGEM_PADRAO_PROJETOS = "https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=600&q=80";

export default function GestaoDelivery({ user, permissoes, donoUid: propDonoUid }) {
    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;

    const [abaAtiva, setAbaAtiva] = useState('personalizar');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mensagemSucesso, setMensagemSucesso] = useState('');

    // Estado completo das configurações da Loja / Site
    const [lojaInfo, setLojaInfo] = useState({
        nomeLoja: 'Aluá 3D',
        corPrincipal: '#3B82F6',
        templateSelecionado: 'vibrante',
        whatsapp: '',
        telefone: '',
        endereco: '',
        mostrarEndereco: true,
        linkPersonalizado: 'alua3d',
        dominioProprio: '',
        logoUrl: '',
        bannerUrl: '',
        // Campos do Banner Lateral (Substituto do Totem Vertical)
        totemUrl: IMAGEM_PADRAO_PROJETOS,
        bannerSecundarioUrl: IMAGEM_PADRAO_PROJETOS,
        bannerSecundarioTag: 'PROJETOS ESPECIAIS',
        bannerSecundarioTitulo: 'Personalize com a sua Marca',
        bannerSecundarioTexto: 'Displays NFC, chaveiros corporativos e peças exclusivas.',
        bannerSecundarioBotao: 'Solicitar Cotação',
        // Configurações extras das outras abas
        lojaAberta: true,
        pedidoMinimo: 0,
        tempoPreparo: '1 a 3 dias úteis',
        chavePix: '',
        nomeRecebedorPix: ''
    });

    useEffect(() => {
        if (!donoUid) return;

        const carregarAjustes = async () => {
            try {
                // Procura nas rotas de settings do usuário
                const docRef = db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/loja`);
                const snap = await docRef.get();

                if (snap.exists) {
                    const dados = snap.data();
                    setLojaInfo(prev => ({
                        ...prev,
                        ...dados,
                        whatsapp: dados.whatsapp || dados.telefone || '',
                        bannerSecundarioUrl: dados.bannerSecundarioUrl || dados.totemUrl || IMAGEM_PADRAO_PROJETOS,
                        totemUrl: dados.bannerSecundarioUrl || dados.totemUrl || IMAGEM_PADRAO_PROJETOS,
                        bannerSecundarioTag: dados.bannerSecundarioTag || 'PROJETOS ESPECIAIS',
                        bannerSecundarioTitulo: dados.bannerSecundarioTitulo || 'Personalize com a sua Marca',
                        bannerSecundarioTexto: dados.bannerSecundarioTexto || 'Displays NFC, chaveiros corporativos e peças exclusivas.',
                        bannerSecundarioBotao: dados.bannerSecundarioBotao || 'Solicitar Cotação'
                    }));
                } else {
                    // Fallback caso esteja salvo noutro documento dentro de settings
                    const colSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings`).get();
                    if (!colSnap.empty) {
                        const dados = colSnap.docs[0].data();
                        setLojaInfo(prev => ({
                            ...prev,
                            ...dados,
                            whatsapp: dados.whatsapp || dados.telefone || '',
                            bannerSecundarioUrl: dados.bannerSecundarioUrl || dados.totemUrl || IMAGEM_PADRAO_PROJETOS,
                            totemUrl: dados.bannerSecundarioUrl || dados.totemUrl || IMAGEM_PADRAO_PROJETOS
                        }));
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar ajustes:", error);
            }
            setLoading(false);
        };

        carregarAjustes();
    }, [donoUid]);

    // Compressor de Imagem Inteligente (Redimensiona para o tamanho ideal sem pesar no Firebase)
    const comprimirImagem = (file, maxWidth, maxHeight, callback) => {
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/webp', 0.8));
            };
        };
    };

    const handleUploadLogo = (e) => {
        comprimirImagem(e.target.files[0], 500, 500, (url) => {
            setLojaInfo(prev => ({ ...prev, logoUrl: url }));
        });
    };

    const handleUploadBannerPrincipal = (e) => {
        comprimirImagem(e.target.files[0], 1200, 600, (url) => {
            setLojaInfo(prev => ({ ...prev, bannerUrl: url }));
        });
    };

    const handleUploadBannerSecundario = (e) => {
        comprimirImagem(e.target.files[0], 600, 400, (url) => {
            setLojaInfo(prev => ({
                ...prev,
                totemUrl: url,
                bannerSecundarioUrl: url
            }));
        });
    };

    const handleSalvarAjustes = async (e) => {
        if (e) e.preventDefault();
        if (!donoUid) return alert("Erro: Usuário não identificado.");

        setSaving(true);
        try {
            const payload = {
                ...lojaInfo,
                linkPersonalizado: (lojaInfo.linkPersonalizado || '').toLowerCase().trim(),
                telefone: lojaInfo.whatsapp, // Garante compatibilidade com os dois nomes de campo
                totemUrl: lojaInfo.bannerSecundarioUrl || lojaInfo.totemUrl || IMAGEM_PADRAO_PROJETOS,
                updatedAt: new Date().toISOString()
            };

            const settingsCol = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings`);
            const snap = await settingsCol.get();

            if (snap.empty) {
                await settingsCol.doc('loja').set(payload, { merge: true });
            } else {
                // Atualiza todos os documentos de settings existentes para garantir sincronia imediata
                await Promise.all(
                    snap.docs.map(doc => settingsCol.doc(doc.id).set(payload, { merge: true }))
                );
            }

            setMensagemSucesso('Configurações salvas e publicadas no site com sucesso!');
            setTimeout(() => setMensagemSucesso(''), 4000);
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            alert("Erro ao salvar configurações.");
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center items-center">
                <Icon name="loader" size={36} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-slate-50 min-h-screen font-sans text-slate-800">
            
            {/* Notificação Flutuante de Sucesso */}
            {mensagemSucesso && (
                <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border-2 border-white">
                    <span>✓</span> {mensagemSucesso}
                </div>
            )}

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* MENU LATERAL ESQUERDO */}
                <aside className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1 sticky top-6">
                        <button
                            onClick={() => setAbaAtiva('geral')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                                abaAtiva === 'geral' ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Icon name="settings" size={16} /> Geral
                        </button>

                        <button
                            onClick={() => setAbaAtiva('personalizar')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                                abaAtiva === 'personalizar' ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Icon name="layout" size={16} /> Personalizar Site
                        </button>

                        <button
                            onClick={() => setAbaAtiva('horarios')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                                abaAtiva === 'horarios' ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Icon name="clock" size={16} /> Horários & Envios
                        </button>

                        <button
                            onClick={() => setAbaAtiva('financeiro')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                                abaAtiva === 'financeiro' ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Icon name="dollar-sign" size={16} /> Dados Financeiros
                        </button>

                        <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                            <button
                                onClick={handleSalvarAjustes}
                                disabled={saving}
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="save" size={16} />}
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>

                            {lojaInfo.linkPersonalizado && (
                                <a
                                    href={`/${lojaInfo.linkPersonalizado}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Icon name="external-link" size={14} /> Ver Meu Site Online
                                </a>
                            )}
                        </div>
                    </div>
                </aside>

                {/* CONTEÚDO PRINCIPAL DIREITO */}
                <main className="lg:col-span-9 space-y-6">
                    
                    {/* ========================================================= */}
                    {/* ABA: PERSONALIZAR SITE                                    */}
                    {/* ========================================================= */}
                    {abaAtiva === 'personalizar' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-8">
                            
                            {/* 1. APARÊNCIA E TEMA DA VITRINE */}
                            <div className="bg-purple-50/30 border border-purple-100 rounded-2xl p-5 space-y-4">
                                <h3 className="text-xs font-black uppercase text-purple-800 tracking-wider flex items-center gap-2">
                                    <Icon name="layout" size={15} /> Aparência e Tema da Vitrine
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                                    <div className="md:col-span-3 space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block">Cor Principal da Marca</label>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                                            <input
                                                type="color"
                                                value={lojaInfo.corPrincipal}
                                                onChange={e => setLojaInfo({ ...lojaInfo, corPrincipal: e.target.value })}
                                                className="w-10 h-9 rounded cursor-pointer border-0"
                                            />
                                            <span className="text-xs font-black uppercase text-slate-600">{lojaInfo.corPrincipal}</span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-9 space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block">Layout do Site (Template)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                            {[
                                                { id: 'minimalista', nome: 'Minimalista', sub: '(Premium)' },
                                                { id: 'marketplace', nome: 'Marketplace', sub: '(Lateral)' },
                                                { id: 'vibrante', nome: 'Vibrante', sub: '(Marketop Pro)' },
                                                { id: 'classico', nome: 'Clássico', sub: '(Varejo)' },
                                                { id: 'app', nome: 'App Mobile', sub: '(Delivery)' }
                                            ].map(tpl => (
                                                <button
                                                    key={tpl.id}
                                                    type="button"
                                                    onClick={() => setLojaInfo({ ...lojaInfo, templateSelecionado: tpl.id })}
                                                    className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                                        lojaInfo.templateSelecionado === tpl.id
                                                            ? 'border-purple-600 bg-purple-50/60 text-purple-800 shadow-xs'
                                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <Icon name="zap" size={16} className={lojaInfo.templateSelecionado === tpl.id ? 'text-purple-600' : 'text-slate-400'} />
                                                    <span className="font-black text-[10px] uppercase leading-tight">{tpl.nome}</span>
                                                    <span className="font-bold text-[9px] opacity-75">{tpl.sub}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. IDENTIDADE VISUAL & DOMÍNIOS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Identidade e Contato (WhatsApp do Botão Flutuante) */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase text-purple-700 tracking-wider border-b border-slate-100 pb-2">
                                        Identidade Visual & Contato
                                    </h3>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome de Exibição da Loja</label>
                                        <input
                                            type="text"
                                            value={lojaInfo.nomeLoja}
                                            onChange={e => setLojaInfo({ ...lojaInfo, nomeLoja: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500"
                                            placeholder="Ex: Aluá 3D"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">WhatsApp / Telefone (Botão do Site)</label>
                                            <input
                                                type="text"
                                                value={lojaInfo.whatsapp}
                                                onChange={e => setLojaInfo({ ...lojaInfo, whatsapp: e.target.value, telefone: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500"
                                                placeholder="Ex: 11988123464"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Endereço Físico</label>
                                            <input
                                                type="text"
                                                value={lojaInfo.endereco}
                                                onChange={e => setLojaInfo({ ...lojaInfo, endereco: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500"
                                                placeholder="Ex: Rua Exemplo, 123"
                                            />
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-2.5 p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={lojaInfo.mostrarEndereco !== false}
                                            onChange={e => setLojaInfo({ ...lojaInfo, mostrarEndereco: e.target.checked })}
                                            className="w-4 h-4 accent-purple-600"
                                        />
                                        <span className="text-xs font-black uppercase text-purple-900">Deixar endereço visível no site?</span>
                                    </label>
                                </div>

                                {/* Endereço do Site (Domínios) */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider border-b border-slate-100 pb-2">
                                        Endereço do Site (Domínios)
                                    </h3>

                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 block">Link Padrão Gratuito</label>
                                        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                                            <span className="px-3 py-3 bg-slate-100 text-slate-500 text-xs font-bold border-r border-slate-200">
                                                tribo-ecommerce.vercel.app/
                                            </span>
                                            <input
                                                type="text"
                                                value={lojaInfo.linkPersonalizado}
                                                onChange={e => setLojaInfo({ ...lojaInfo, linkPersonalizado: e.target.value })}
                                                className="flex-1 p-3 font-black text-xs text-slate-800 outline-none"
                                                placeholder="alua3d"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase text-blue-800">Utilizar Domínio Próprio (.com.br)</label>
                                            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">PRO</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={lojaInfo.dominioProprio || ''}
                                                onChange={e => setLojaInfo({ ...lojaInfo, dominioProprio: e.target.value })}
                                                placeholder="Ex: www.minhaloja.com.br"
                                                className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                            />
                                            <button type="button" onClick={handleSalvarAjustes} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase">
                                                Vincular
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ========================================================= */}
                            {/* 3. ASSETS DA LOJA (LOGO + BANNER HORIZONTAL + BANNER PROJETOS ESPECIAIS) */}
                            {/* ========================================================= */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                                    <Icon name="image" size={16} className="text-purple-600" /> Assets da Loja e Banners Promocionais
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    
                                    {/* CARD 1: LOGO DA LOJA */}
                                    <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between bg-white shadow-xs space-y-4">
                                        <div className="text-center">
                                            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Logo da Loja</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Tamanho recomendado: 500x500 px (Quadrada)</p>
                                        </div>

                                        <div className="w-36 h-36 mx-auto rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                                            {lojaInfo.logoUrl ? (
                                                <img src={lojaInfo.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <Icon name="image" size={36} className="text-slate-300" />
                                            )}
                                        </div>

                                        <label className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs uppercase tracking-wider rounded-xl text-center cursor-pointer transition-colors block">
                                            Substituir Arquivo
                                            <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                                        </label>
                                    </div>

                                    {/* CARD 2: BANNER HORIZONTAL PRINCIPAL */}
                                    <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between bg-white shadow-xs space-y-4">
                                        <div className="text-center">
                                            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Banner Horizontal</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Tamanho recomendado: 1200x500 px</p>
                                        </div>

                                        <div className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                                            {lojaInfo.bannerUrl ? (
                                                <img src={lojaInfo.bannerUrl} alt="Banner Horizontal" className="w-full h-full object-cover" />
                                            ) : (
                                                <Icon name="image" size={36} className="text-slate-300" />
                                            )}
                                        </div>

                                        <label className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs uppercase tracking-wider rounded-xl text-center cursor-pointer transition-colors block">
                                            Substituir Arquivo
                                            <input type="file" accept="image/*" onChange={handleUploadBannerPrincipal} className="hidden" />
                                        </label>
                                    </div>

                                    {/* CARD 3: ANTIGO TOTEM VERTICAL -> AGORA BANNER LATERAL (PROJETOS ESPECIAIS) COM FOTO E TEXTO */}
                                    <div className="border-2 border-orange-200 rounded-2xl p-5 flex flex-col justify-between bg-orange-50/20 shadow-xs space-y-3">
                                        <div className="text-center">
                                            <span className="bg-orange-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">NOVO</span>
                                            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider mt-1">
                                                Banner Lateral (Projetos Especiais)
                                            </h4>
                                            <p className="text-[10px] font-black text-orange-600 mt-0.5">
                                                Tamanho exato para encaixe perfeito: 600x400 px
                                            </p>
                                        </div>

                                        {/* Preview com Imagem Padrão garantida */}
                                        <div className="w-full h-36 rounded-xl border-2 border-dashed border-orange-300 bg-white flex items-center justify-center overflow-hidden p-1.5 shadow-inner">
                                            <img
                                                src={lojaInfo.bannerSecundarioUrl || lojaInfo.totemUrl || IMAGEM_PADRAO_PROJETOS}
                                                alt="Preview Banner Lateral"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        </div>

                                        <label className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] uppercase tracking-wider rounded-xl text-center cursor-pointer transition-colors block shadow-xs">
                                            Escolher Foto (600x400 px)
                                            <input type="file" accept="image/*" onChange={handleUploadBannerSecundario} className="hidden" />
                                        </label>

                                        {/* Campos para editar os Textos e Botão do Banner Lateral */}
                                        <div className="space-y-2 pt-2 border-t border-orange-200/60 text-left">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-500 block">Selo Laranja Superior</label>
                                                <input
                                                    type="text"
                                                    value={lojaInfo.bannerSecundarioTag || ''}
                                                    onChange={e => setLojaInfo({ ...lojaInfo, bannerSecundarioTag: e.target.value })}
                                                    placeholder="Ex: PROJETOS ESPECIAIS"
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-500 block">Título Principal</label>
                                                <input
                                                    type="text"
                                                    value={lojaInfo.bannerSecundarioTitulo || ''}
                                                    onChange={e => setLojaInfo({ ...lojaInfo, bannerSecundarioTitulo: e.target.value })}
                                                    placeholder="Ex: Personalize com a sua Marca"
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-500 block">Texto em Baixo da Imagem</label>
                                                <textarea
                                                    rows="2"
                                                    value={lojaInfo.bannerSecundarioTexto || ''}
                                                    onChange={e => setLojaInfo({ ...lojaInfo, bannerSecundarioTexto: e.target.value })}
                                                    placeholder="Ex: Displays NFC, chaveiros corporativos e peças exclusivas."
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500 resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-500 block">Texto do Botão</label>
                                                <input
                                                    type="text"
                                                    value={lojaInfo.bannerSecundarioBotao || ''}
                                                    onChange={e => setLojaInfo({ ...lojaInfo, bannerSecundarioBotao: e.target.value })}
                                                    placeholder="Ex: Solicitar Cotação"
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Botão Inferior de Salvar */}
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleSalvarAjustes}
                                    disabled={saving}
                                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-colors flex items-center gap-2"
                                >
                                    <Icon name="save" size={16} />
                                    {saving ? 'Salvando Configurações...' : 'Salvar e Publicar no Site'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* ABA: GERAL                                                */}
                    {/* ========================================================= */}
                    {abaAtiva === 'geral' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Status de Funcionamento da Loja</h3>
                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={lojaInfo.lojaAberta !== false}
                                    onChange={e => setLojaInfo({ ...lojaInfo, lojaAberta: e.target.checked })}
                                    className="w-5 h-5 accent-emerald-600"
                                />
                                <div>
                                    <span className="font-black text-sm text-slate-800 block">Loja Aberta para Receber Pedidos</span>
                                    <span className="text-xs text-slate-500">Quando desmarcado, exibe aviso de loja fechada no topo do catálogo.</span>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* ABA: HORÁRIOS & ENVIOS                                    */}
                    {/* ========================================================= */}
                    {abaAtiva === 'horarios' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Prazos de Produção e Envio</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Prazo Médio de Produção / Envio</label>
                                    <input
                                        type="text"
                                        value={lojaInfo.tempoPreparo || ''}
                                        onChange={e => setLojaInfo({ ...lojaInfo, tempoPreparo: e.target.value })}
                                        placeholder="Ex: 1 a 3 dias úteis"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Valor de Pedido Mínimo (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={lojaInfo.pedidoMinimo || 0}
                                        onChange={e => setLojaInfo({ ...lojaInfo, pedidoMinimo: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* ABA: DADOS FINANCEIROS                                    */}
                    {/* ========================================================= */}
                    {abaAtiva === 'financeiro' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <h3 className="font-black text-sm uppercase text-slate-800">Configuração de Recebimento (PIX)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Chave PIX da Loja</label>
                                    <input
                                        type="text"
                                        value={lojaInfo.chavePix || ''}
                                        onChange={e => setLojaInfo({ ...lojaInfo, chavePix: e.target.value })}
                                        placeholder="CNPJ, E-mail, Telefone ou Chave Aleatória"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome do Favorecido</label>
                                    <input
                                        type="text"
                                        value={lojaInfo.nomeRecebedorPix || ''}
                                        onChange={e => setLojaInfo({ ...lojaInfo, nomeRecebedorPix: e.target.value })}
                                        placeholder="Nome ou Razão Social"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}