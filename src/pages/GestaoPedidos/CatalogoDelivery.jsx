import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';

export default function CatalogoDelivery() {
    const [loading, setLoading] = useState(true);
    const [catalogItems, setCatalogItems] = useState([]);
    const [catalogCategories, setCatalogCategories] = useState([]);
    const [complementGroups, setComplementGroups] = useState([]); 
    const [activeCategory, setActiveCategory] = useState('Todas');
    
    // Aba Principal (Produtos x Complementos)
    const [activeMainTab, setActiveMainTab] = useState('produtos');

    // Dados do CMV
    const [cmvItems, setCmvItems] = useState([]); 
    
    // Estados de Modais
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); 
    
    // Upload de Imagem
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Abas do Modal de Produto
    const [activeModalTab, setActiveModalTab] = useState('informacoes'); 

    // Formulários
    const [productForm, setProductForm] = useState({ 
        id: '', name: '', description: '', price: '', promoPrice: '', 
        category: '', imageUrl: '', isActive: true, cmvId: null,
        etiqueta: '', destaque: false, isPromo: false, 
        codigoPdv: '', codigoInterno: '', linkedGroups: [], precoCusto: ''
    });
    
    const [groupForm, setGroupForm] = useState({
        id: '', name: '', min: 0, max: 99, items: []
    });

    const [newCategoryName, setNewCategoryName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const formatMoney = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const p = (val) => parseFloat(String(val).replace(',', '.')) || 0;

    const gerarCodigoPDV = (itens) => {
        const codigos = itens.map(p => parseInt(p.codigoPdv, 10)).filter(c => !isNaN(c));
        return codigos.length > 0 ? (Math.max(...codigos) + 1).toString() : '1001';
    };

    useEffect(() => {
        const carregarDados = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const catRef = db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery/catalog_state`);
                const catSnap = await catRef.get();
                
                if (catSnap.exists) {
                    const data = catSnap.data();
                    setCatalogItems(data.products || []);
                    setCatalogCategories(data.categories?.length > 0 ? data.categories : ['Hambúrgueres', 'Bebidas', 'Sobremesas']);
                    setComplementGroups(data.complementGroups || []);
                } else {
                    setCatalogCategories(['Hambúrgueres', 'Bebidas', 'Sobremesas']);
                }

                const cmvRef = db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/cmv_data/state`);
                const cmvSnap = await cmvRef.get();
                
                if (cmvSnap.exists) {
                    const data = cmvSnap.data();
                    const fichas = data.recipes || [];
                    const combos = data.combos || [];
                    const importable = [
                        ...fichas.map(f => ({ ...f, importType: 'Ficha', cost: (f.cost || 0) / (f.yield || 1) })),
                        ...combos.map(c => ({ ...c, importType: 'Combo', cost: c.cost || 0 }))
                    ].filter(item => Number(item.sellingPrice) > 0);
                    
                    setCmvItems(importable);
                }
            } catch (error) {
                console.error("Erro ao carregar catálogo:", error);
            } finally {
                setLoading(false);
            }
        };
        carregarDados();
    }, []);

    const salvarCatalogoNoBanco = async (novosProdutos, novasCategorias, novosGrupos) => {
        const user = auth.currentUser;
        if (!user) return;
        await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery/catalog_state`).set({
            products: novosProdutos || catalogItems,
            categories: novasCategorias || catalogCategories,
            complementGroups: novosGrupos || complementGroups
        }, { merge: true });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Por favor, selecione uma imagem válida (JPG, PNG, etc).'); return; }

        setIsUploadingImage(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const targetWidth = 600;
                const minSize = Math.min(width, height);
                const startX = (width - minSize) / 2; const startY = (height - minSize) / 2;

                canvas.width = targetWidth; canvas.height = targetWidth;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, targetWidth, targetWidth);
                const base64Str = canvas.toDataURL('image/jpeg', 0.75);
                setProductForm({ ...productForm, imageUrl: base64Str });
                setIsUploadingImage(false);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSalvarProduto = async () => {
        let novosProdutos = [...catalogItems];
        const index = novosProdutos.findIndex(p => p.id === productForm.id);
        
        let codigoPdvSeguro = productForm.codigoPdv;
        if (!codigoPdvSeguro) { codigoPdvSeguro = gerarCodigoPDV(catalogItems); } 
        else {
            const repetido = catalogItems.find(p => p.codigoPdv === codigoPdvSeguro && p.id !== productForm.id);
            if (repetido) {
                alert(`Atenção: O código PDV ${codigoPdvSeguro} já está em uso pelo produto "${repetido.name}". Geramos um novo código.`);
                codigoPdvSeguro = gerarCodigoPDV(catalogItems);
            }
        }
        
        const produtoFormatado = {
            ...productForm,
            id: productForm.id || crypto.randomUUID(), price: p(productForm.price), promoPrice: p(productForm.promoPrice), precoCusto: p(productForm.precoCusto),
            category: productForm.category || (catalogCategories[0] || 'Outros'), codigoPdv: codigoPdvSeguro, linkedGroups: productForm.linkedGroups || []
        };

        if (index > -1) novosProdutos[index] = produtoFormatado;
        else novosProdutos.push(produtoFormatado);

        let novasCats = [...catalogCategories];
        if (produtoFormatado.category && !novasCats.includes(produtoFormatado.category)) {
            novasCats.push(produtoFormatado.category); setCatalogCategories(novasCats);
        }

        setCatalogItems(novosProdutos);
        await salvarCatalogoNoBanco(novosProdutos, novasCats, complementGroups);
        setIsProductModalOpen(false);
    };

    const abrirModalNovo = () => {
        setProductForm({ 
            id: '', name: '', description: '', price: '', promoPrice: '', precoCusto: '',
            category: catalogCategories[0] || '', imageUrl: '', isActive: true, cmvId: null,
            etiqueta: '', destaque: false, isPromo: false, codigoPdv: '', codigoInterno: '', linkedGroups: [] 
        });
        setActiveModalTab('informacoes');
        setIsProductModalOpen(true);
    };

    const abrirModalEdicao = (produto) => {
        setProductForm({ ...produto, linkedGroups: produto.linkedGroups || [] });
        setActiveModalTab('informacoes');
        setIsProductModalOpen(true);
    };

    const duplicarProduto = async (produto) => {
        const codigoPdvSeguro = gerarCodigoPDV(catalogItems);
        const novoProduto = {
            ...produto,
            id: crypto.randomUUID(),
            name: `${produto.name} (Cópia)`,
            codigoPdv: codigoPdvSeguro,
            isActive: false // Mantém inativo inicialmente por segurança
        };
        const novosProdutos = [...catalogItems, novoProduto];
        setCatalogItems(novosProdutos);
        await salvarCatalogoNoBanco(novosProdutos);
    };

    const deletarProduto = async (produtoId) => {
        if(window.confirm("Deseja excluir este produto da vitrine?")) {
            const novosProdutos = catalogItems.filter(p => p.id !== produtoId);
            setCatalogItems(novosProdutos);
            await salvarCatalogoNoBanco(novosProdutos, catalogCategories, complementGroups);
        }
    };

    const toggleStatus = async (produtoId) => {
        const novosProdutos = catalogItems.map(p => p.id === produtoId ? { ...p, isActive: !p.isActive } : p);
        setCatalogItems(novosProdutos);
        await salvarCatalogoNoBanco(novosProdutos);
    };

    const abrirModalNovoGrupo = () => {
        setGroupForm({ id: '', name: '', min: 0, max: 99, items: [] });
        setIsGroupModalOpen(true);
    };

    const abrirModalEditarGrupo = (grupo) => {
        setGroupForm(grupo);
        setIsGroupModalOpen(true);
    };

    const deletarGrupo = async (grupoId) => {
        if(window.confirm("Deseja excluir este grupo de complementos? Isso removerá o vínculo com todos os produtos.")) {
            const novosGrupos = complementGroups.filter(g => g.id !== grupoId);
            setComplementGroups(novosGrupos);
            await salvarCatalogoNoBanco(catalogItems, catalogCategories, novosGrupos);
        }
    };

    const salvarGrupoComplemento = async () => {
        if (!groupForm.name) { alert("Dê um nome ao grupo!"); return; }
        
        let novosGrupos = [...complementGroups];
        const index = novosGrupos.findIndex(g => g.id === groupForm.id);
        const isNew = index === -1;
        const newId = groupForm.id || crypto.randomUUID();
        
        const grupoFormatado = {
            ...groupForm,
            id: newId,
            items: groupForm.items.map(i => ({ ...i, price: p(i.price), maxQtd: parseInt(i.maxQtd) || 1 }))
        };

        if (!isNew) novosGrupos[index] = grupoFormatado;
        else novosGrupos.push(grupoFormatado);

        setComplementGroups(novosGrupos);
        await salvarCatalogoNoBanco(catalogItems, catalogCategories, novosGrupos);

        if (isProductModalOpen && isNew) {
            setProductForm(prev => ({
                ...prev,
                linkedGroups: [...(prev.linkedGroups || []), newId]
            }));
        }

        setIsGroupModalOpen(false);
    };

    const toggleVinculoGrupo = (grupoId) => {
        setProductForm(prev => {
            const linked = prev.linkedGroups || [];
            if (linked.includes(grupoId)) return { ...prev, linkedGroups: linked.filter(id => id !== grupoId) };
            return { ...prev, linkedGroups: [...linked, grupoId] };
        });
    };

    const handleCriarCategoria = async () => {
        if (!newCategoryName.trim()) return;
        const catExiste = catalogCategories.some(c => c.toLowerCase() === newCategoryName.trim().toLowerCase());
        if (catExiste) { alert("Categoria já existe!"); return; }
        const novasCats = [...catalogCategories, newCategoryName.trim()];
        setCatalogCategories(novasCats);
        await salvarCatalogoNoBanco(catalogItems, novasCats);
        setNewCategoryName(''); setIsCategoryModalOpen(false);
    };

    const handleImportarCMV = async (itemCMV) => {
        if (catalogItems.find(p => p.cmvId === itemCMV.id)) { alert("Item já importado!"); return; }
        const novoProduto = {
            id: crypto.randomUUID(), cmvId: itemCMV.id, name: itemCMV.name, description: '', precoCusto: itemCMV.cost || 0,
            price: p(itemCMV.sellingPrice), promoPrice: 0, category: itemCMV.category || catalogCategories[0] || 'Outros', 
            imageUrl: '', isActive: true, etiqueta: '', destaque: false, isPromo: false, 
            codigoPdv: gerarCodigoPDV(catalogItems), codigoInterno: '', linkedGroups: []
        };
        const novosProdutos = [...catalogItems, novoProduto];
        let novasCats = [...catalogCategories];
        if (novoProduto.category && !novasCats.includes(novoProduto.category)) { novasCats.push(novoProduto.category); setCatalogCategories(novasCats); }
        setCatalogItems(novosProdutos);
        await salvarCatalogoNoBanco(novosProdutos, novasCats);
        alert(`${itemCMV.name} importado!`);
    };

    const produtosFiltrados = catalogItems.filter(p => {
        const matchCategoria = activeCategory === 'Todas' || p.category === activeCategory;
        const matchBusca = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategoria && matchBusca;
    });

    const complementosFiltrados = complementGroups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const produtosVinculados = isGroupModalOpen ? catalogItems.filter(p => p.linkedGroups?.includes(groupForm.id)) : [];

    if (loading) return <div className="p-10 text-center font-black text-emerald-500 uppercase">Carregando Catálogo...</div>;

    return (
        <div className="max-w-[1400px] mx-auto mt-2 pb-10 fade-in">
            
            {/* TOPO: Abas Principais e Botões de Ação */}
            <div className="bg-white p-4 rounded-t-2xl border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex gap-6 border-b-2 border-transparent">
                    <button onClick={() => setActiveMainTab('produtos')} className={`font-black uppercase text-sm pb-2 -mb-[18px] transition-colors ${activeMainTab === 'produtos' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}>PRODUTOS</button>
                    <button onClick={() => setActiveMainTab('complementos')} className={`font-black uppercase text-sm pb-2 -mb-[18px] transition-colors ${activeMainTab === 'complementos' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}>COMPLEMENTOS</button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500 w-48 transition-all" />
                    </div>
                    
                    {activeMainTab === 'produtos' ? (
                        <>
                            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] transition-colors border border-slate-200 shadow-sm">
                                <Icon name="download-cloud" size={14} /> Puxar do CMV
                            </button>
                            <button onClick={abrirModalNovo} className="flex items-center gap-2 bg-[#A855F7] hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] transition-colors shadow-sm">
                                <Icon name="plus" size={14} /> Novo Produto
                            </button>
                        </>
                    ) : (
                        <button onClick={abrirModalNovoGrupo} className="flex items-center gap-2 bg-[#A855F7] hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] transition-colors shadow-sm">
                            <Icon name="plus" size={14} /> Novo Complemento
                        </button>
                    )}
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL (Troca entre Produtos x Complementos) */}
            <div className="flex flex-col md:flex-row bg-white rounded-b-2xl shadow-sm min-h-[600px] border border-t-0 border-slate-200">
                
                {activeMainTab === 'produtos' ? (
                    <>
                        {/* Sidebar de Categorias */}
                        <div className="w-full md:w-64 border-r border-slate-200 p-4 bg-slate-50/50">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest">Categorias</h3>
                                <button onClick={() => setIsCategoryModalOpen(true)} className="text-slate-400 hover:text-purple-600 p-1 bg-white rounded shadow-sm border border-slate-200 transition-colors"><Icon name="plus" size={14} /></button>
                            </div>
                            <ul className="space-y-1">
                                <li>
                                    <button onClick={() => setActiveCategory('Todas')} className={`w-full text-left px-3 py-2.5 rounded-lg font-bold text-sm flex items-center justify-between transition-colors ${activeCategory === 'Todas' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                                        Todas <span className="bg-white px-2 py-0.5 rounded text-[10px] shadow-sm font-black border border-slate-100">{catalogItems.length}</span>
                                    </button>
                                </li>
                                {catalogCategories.map(cat => (
                                    <li key={cat} className="group relative flex items-center">
                                        <button onClick={() => setActiveCategory(cat)} className={`w-full text-left px-3 py-2.5 rounded-lg font-bold text-sm flex items-center justify-between transition-colors ${activeCategory === cat ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'text-slate-600 hover:bg-slate-100'}`}>
                                            <span className="truncate pr-6">{cat}</span> 
                                            <span className="bg-white px-2 py-0.5 rounded text-[10px] shadow-sm font-black border border-slate-100">{catalogItems.filter(p => p.category === cat).length}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Grade de Produtos */}
                        <div className="flex-1 p-6 bg-slate-50/30">
                            {produtosFiltrados.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 font-bold uppercase text-sm"><Icon name="package" size={48} className="mx-auto mb-3 opacity-50" />Nenhum produto encontrado.</div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                                    {produtosFiltrados.map(produto => (
                                        <div key={produto.id} className={`flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${!produto.isActive ? 'opacity-60 grayscale-[50%]' : 'border-slate-200 hover:border-purple-300'}`}>
                                            <div className="w-[72px] h-[72px] bg-slate-100 rounded-lg flex-shrink-0 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                                                {produto.imageUrl ? <img src={produto.imageUrl} alt={produto.name} className="w-full h-full object-cover" /> : <Icon name="image" size={24} className="text-slate-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-slate-800 text-sm truncate">{produto.name}</h4>
                                                    <div className="flex items-center gap-1">
                                                        {produto.destaque && <Icon name="star" size={14} className="text-amber-500 fill-amber-500 mr-1" title="Destaque"/>}
                                                        
                                                        <button onClick={() => abrirModalEdicao(produto)} className="p-1 text-slate-400 hover:text-purple-600 rounded hover:bg-slate-50 transition-colors" title="Editar">
                                                            <Icon name="edit-2" size={16}/>
                                                        </button>
                                                        <button onClick={() => duplicarProduto(produto)} className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-50 transition-colors" title="Duplicar">
                                                            <Icon name="copy" size={16}/>
                                                        </button>
                                                        <button onClick={() => deletarProduto(produto.id)} className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-50 transition-colors" title="Excluir">
                                                            <Icon name="trash" size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-black text-emerald-600 text-[13px]">{formatMoney(produto.isPromo && produto.promoPrice > 0 ? produto.promoPrice : produto.price)}</span>
                                                    {produto.isPromo && produto.promoPrice > 0 && <span className="text-slate-400 line-through text-[10px] font-bold">{formatMoney(produto.price)}</span>}
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-bold border border-slate-200" title="Código PDV">PDV: {produto.codigoPdv || 'S/C'}</span>
                                                    <button onClick={() => toggleStatus(produto.id)} className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1 border transition-colors ${produto.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                        {produto.isActive ? <><Icon name="arrow-up-circle" size={10}/> Ativo</> : <><Icon name="eye-off" size={10}/> Oculto</>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Aba Principal de Complementos */
                    <div className="flex-1 p-6 bg-slate-50/50 w-full">
                        {complementosFiltrados.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-bold uppercase text-sm"><Icon name="layers" size={48} className="mx-auto mb-3 opacity-50" />Nenhum grupo de complemento encontrado.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {complementosFiltrados.map(grupo => (
                                    <div key={grupo.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-[13px]">{grupo.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                        {Number(grupo.min) === 1 && Number(grupo.max) === 1 ? 'Apenas uma das opções (obrigatória)' : 
                                                         Number(grupo.min) === 0 ? `Mais de uma opção com repetição (min. 0, máx ${grupo.max})` : 
                                                         `Mais de uma opção com repetição (min. ${grupo.min}, máx ${grupo.max})`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1 -mt-1 -mr-1">
                                                    <button onClick={() => abrirModalEditarGrupo(grupo)} className="p-1.5 text-slate-400 hover:text-purple-600 rounded transition-colors"><Icon name="edit-2" size={14}/></button>
                                                    <button onClick={() => deletarGrupo(grupo.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"><Icon name="trash" size={14}/></button>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-tight">
                                                <span className="font-black text-slate-700">Opções:</span> {grupo.items.map(i => i.name).join(', ')}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm">
                                                {grupo.items.length}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL COMPLEXO DO PRODUTO (REMODELADO COMO CARDÁPIO WEB) */}
            {isProductModalOpen && (
                <div className="modal-overlay z-[110] p-4 flex items-center justify-center fixed inset-0 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-[800px] h-[85vh] flex flex-col rounded-xl shadow-2xl scale-up-center overflow-hidden">
                        
                        {/* Header Tabs */}
                        <div className="flex justify-between items-end border-b border-slate-200 bg-white px-6 pt-5 shrink-0 relative">
                            <div className="flex gap-8">
                                <button onClick={() => setActiveModalTab('informacoes')} className={`font-black uppercase text-[11px] tracking-wider pb-3 border-b-2 transition-colors ${activeModalTab === 'informacoes' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>INFORMAÇÕES</button>
                                <button onClick={() => setActiveModalTab('complementos')} className={`font-black uppercase text-[11px] tracking-wider pb-3 border-b-2 transition-colors ${activeModalTab === 'complementos' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>COMPLEMENTOS</button>
                                <button onClick={() => setActiveModalTab('disponibilidade')} className={`font-black uppercase text-[11px] tracking-wider pb-3 border-b-2 transition-colors ${activeModalTab === 'disponibilidade' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>DISPONIBILIDADE</button>
                            </div>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-red-500 mb-3 absolute right-6 top-5"><Icon name="x" size={20}/></button>
                        </div>
                        
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">
                            
                            {/* ABA: INFORMAÇÕES */}
                            {activeModalTab === 'informacoes' && (
                                <div className="flex flex-col md:flex-row gap-8">
                                    
                                    {/* Coluna Esquerda: Imagem */}
                                    <div className="w-[180px] shrink-0 flex flex-col gap-3">
                                        <label className={`w-full aspect-square bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group transition-colors shadow-sm ${isUploadingImage ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100 hover:border-purple-300'}`}>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                                            {isUploadingImage ? (
                                                <div className="text-center text-purple-600">
                                                    <Icon name="loader" size={24} className="mx-auto mb-1 animate-spin" />
                                                </div>
                                            ) : productForm.imageUrl ? (
                                                <>
                                                    <img src={productForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute bottom-2 right-2 bg-purple-600 p-2 rounded-lg text-white shadow-md">
                                                        <Icon name="edit-2" size={14}/>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center text-slate-300">
                                                    <Icon name="plus" size={36} className="mx-auto group-hover:text-purple-400 transition-colors"/>
                                                </div>
                                            )}
                                        </label>
                                        {productForm.imageUrl && (
                                            <button onClick={() => setProductForm({...productForm, imageUrl: ''})} className="w-full py-2 bg-white border border-slate-200 text-slate-500 font-black text-[10px] uppercase rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1">
                                                <Icon name="trash" size={12}/> Remover Imagem
                                            </button>
                                        )}
                                        <div className="mt-2">
                                            <span className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Link da imagem (opcional)</span>
                                            <input type="text" value={productForm.imageUrl} onChange={e => setProductForm({...productForm, imageUrl: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] outline-none font-bold text-slate-600" placeholder="https://..." />
                                        </div>
                                    </div>

                                    {/* Coluna Direita: Formulário */}
                                    <div className="flex-1 space-y-5">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-purple-600 ml-1 bg-white px-1">Nome do produto *</label>
                                            <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-500 transition-colors" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-center">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Categoria *</label>
                                                <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-purple-400 transition-colors">
                                                    {catalogCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Etiqueta</label>
                                                <select value={productForm.etiqueta} onChange={e => setProductForm({...productForm, etiquette: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-purple-400 transition-colors">
                                                    <option value="">Nenhuma</option><option value="Novidade">Novidade</option><option value="Vegano">Vegano</option><option value="Apimentado">Apimentado</option>
                                                </select>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer mt-5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 pr-4">
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${productForm.destaque ? 'bg-purple-500' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-all ${productForm.destaque ? 'left-[22px]' : 'left-0.5'}`}></div>
                                                </div>
                                                <input type="checkbox" checked={productForm.destaque} onChange={e => setProductForm({...productForm, destaque: e.target.checked})} className="hidden" />
                                                <span className="text-xs font-black text-slate-600">Destaque</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-center border-t border-slate-100 pt-5">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preço de venda *</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                                                    <input type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-purple-400 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preço promocional *</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                                                    <input type="number" step="0.01" value={productForm.promoPrice} onChange={e => setProductForm({...productForm, promoPrice: e.target.value})} disabled={!productForm.isPromo} className={`w-full p-2.5 pl-9 border rounded-xl font-black outline-none transition-colors ${productForm.isPromo ? 'bg-white border-purple-400 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`} />
                                                </div>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer mt-5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 pr-4">
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${productForm.isPromo ? 'bg-purple-500' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-all ${productForm.isPromo ? 'left-[22px]' : 'left-0.5'}`}></div>
                                                </div>
                                                <input type="checkbox" checked={productForm.isPromo} onChange={e => setProductForm({...productForm, isPromo: e.target.checked})} className="hidden" />
                                                <span className="text-xs font-black text-slate-600">Promocional</span>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] gap-4 pt-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preço de custo</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                                                    <input type="number" step="0.01" value={productForm.precoCusto} onChange={e => setProductForm({...productForm, precoCusto: e.target.value})} className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-purple-400" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código PDV</label>
                                                <input type="text" placeholder="Automático" value={productForm.codigoPdv} onChange={e => setProductForm({...productForm, codigoPdv: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-purple-400 placeholder:text-slate-300" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código Interno</label>
                                                <input type="text" value={productForm.codigoInterno} onChange={e => setProductForm({...productForm, codigoInterno: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-purple-400" />
                                            </div>
                                        </div>

                                        <div className="space-y-1 border-t border-slate-100 pt-5">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descrição do produto</label>
                                            <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-sm text-slate-700 outline-none focus:border-purple-400 min-h-[100px] resize-y" placeholder="Crocante por fora e suculento por dentro. Leva pão brioche..."></textarea>
                                            <p className="text-[10px] text-slate-400 font-medium px-1 mt-1">
                                                Estilize a descrição com <span className="font-bold">*texto*</span>, <i>_texto_</i> ou <span className="line-through">~texto~</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ABA: COMPLEMENTOS (Com lista unificada e botão de criar direto) */}
                            {activeModalTab === 'complementos' && (
                                <div className="space-y-6 pb-4 animate-fade-in">
                                    <button onClick={abrirModalNovoGrupo} className="w-full py-4 border border-purple-300 border-dashed rounded-xl text-purple-600 font-black uppercase text-xs hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        <Icon name="plus" size={16} /> NOVO COMPLEMENTO
                                    </button>

                                    <div>
                                        <h3 className="font-black uppercase text-slate-800 text-xs mb-1">Complementos Disponíveis</h3>
                                        <p className="text-[10px] text-slate-500 font-medium mb-4">Selecione (clicando) os grupos que deseja ativar neste produto.</p>
                                        
                                        {complementGroups.length === 0 ? (
                                            <div className="text-center py-10 text-slate-400 font-medium text-sm border border-dashed border-slate-200 rounded-xl">
                                                Nenhum complemento cadastrado no sistema. Crie o primeiro botão acima!
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {complementGroups.map(grupo => {
                                                    const isLinked = productForm.linkedGroups?.includes(grupo.id);
                                                    return (
                                                        <div key={grupo.id} onClick={() => toggleVinculoGrupo(grupo.id)} className={`cursor-pointer bg-white border p-4 rounded-xl flex justify-between items-center shadow-sm transition-all ${isLinked ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 hover:border-purple-300'}`}>
                                                            <div className="flex-1 pr-4">
                                                                <h4 className={`font-black text-[13px] ${isLinked ? 'text-purple-900' : 'text-slate-800'}`}>{grupo.name}</h4>
                                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                                    {Number(grupo.min) === 1 && Number(grupo.max) === 1 ? 'Apenas uma das opções (obrigatória)' : 
                                                                     Number(grupo.min) === 0 ? `Mais de uma opção com repetição (min. 0, máx ${grupo.max})` : 
                                                                     `Mais de uma opção com repetição (min. ${grupo.min}, máx ${grupo.max})`}
                                                                </p>
                                                                <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 opacity-70"><span className="font-black text-slate-700">Opções:</span> {grupo.items.map(i => i.name).join(', ')}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4 shrink-0">
                                                                <span className="text-[10px] font-black text-slate-400">{grupo.items.length} itens</span>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isLinked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 text-transparent'}`}>
                                                                    <Icon name="check" size={14}/>
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); abrirModalEditarGrupo(grupo); }} className="p-2 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-white transition-colors" title="Editar Opções Deste Grupo">
                                                                    <Icon name="edit-2" size={16}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ABA: DISPONIBILIDADE (Placeholder) */}
                            {activeModalTab === 'disponibilidade' && (
                                <div className="text-center py-20 text-slate-400">
                                    <Icon name="clock" size={48} className="mx-auto mb-4 opacity-40"/>
                                    <h3 className="font-black text-slate-600 text-lg uppercase tracking-tight">Disponibilidade de Horário</h3>
                                    <p className="text-sm font-medium mt-2 max-w-md mx-auto">Esta função permite definir horários específicos em que o produto será vendido (ex: Apenas Almoço). Estará disponível na próxima atualização.</p>
                                </div>
                            )}

                        </div>

                        {/* Footer / Ações */}
                        <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-600 font-black uppercase text-xs tracking-wider rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleSalvarProduto} className="px-8 py-2.5 bg-[#A855F7] hover:bg-purple-600 text-white font-black uppercase text-xs tracking-wider rounded-lg shadow-md transition-colors">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-MODAL: CRIAR/EDITAR GRUPO DE COMPLEMENTOS (SPLIT SCREEN IDÊNTICO À IMAGEM) */}
            {isGroupModalOpen && (
                <div className="modal-overlay z-[120] p-4 flex items-center justify-center fixed inset-0 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-[1000px] h-[85vh] flex flex-col rounded-xl shadow-2xl scale-up-center overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-200 bg-white px-6 py-4 shrink-0">
                            <h3 className="text-lg font-medium text-slate-800">{groupForm.id ? 'Editar complemento' : 'Novo complemento'}</h3>
                            <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={20}/></button>
                        </div>

                        {/* Split Body */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            
                            {/* Coluna Esquerda: Formulário de Opções */}
                            <div className="flex-1 overflow-y-auto p-6 md:border-r border-slate-200 bg-white">
                                
                                <div className="relative border border-purple-500 rounded-md h-12 flex items-center px-3 mb-6">
                                    <span className="absolute -top-2.5 left-2 bg-white px-1 text-[10px] text-purple-600 font-bold">Nome do complemento *</span>
                                    <input type="text" value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} placeholder="Turbine seu lanche..." className="w-full outline-none text-sm text-slate-800 font-medium bg-transparent" />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="relative border border-slate-300 rounded-md h-12 flex items-center px-3 bg-white">
                                        <span className="absolute -top-2.5 left-2 bg-white px-1 text-[10px] text-slate-500 font-medium">Qtd Mínima de Seleção</span>
                                        <input type="number" min="0" value={groupForm.min} onChange={e => setGroupForm({...groupForm, min: e.target.value})} className="w-full outline-none text-sm text-slate-800 bg-transparent" />
                                    </div>
                                    <div className="relative border border-slate-300 rounded-md h-12 flex items-center px-3 bg-white">
                                        <span className="absolute -top-2.5 left-2 bg-white px-1 text-[10px] text-slate-500 font-medium">Qtd Máxima de Seleção</span>
                                        <input type="number" min="1" value={groupForm.max} onChange={e => setGroupForm({...groupForm, max: e.target.value})} className="w-full outline-none text-sm text-slate-800 bg-transparent" />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-800 text-sm">Opções</h4>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setGroupForm({...groupForm, items: [...groupForm.items, { id: crypto.randomUUID(), name: '', price: 0, maxQtd: 1 }]})} className="text-purple-600 font-bold text-xs flex items-center gap-1 hover:text-purple-700">
                                            + ADICIONAR OPÇÃO
                                        </button>
                                        <button className="text-slate-600 font-bold text-xs flex items-center gap-1 hover:bg-slate-50 p-1.5 rounded"><Icon name="menu" size={14}/> ORDENAR</button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {groupForm.items.length === 0 && <p className="text-[11px] font-medium text-slate-400 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">Adicione os ingredientes, extras ou opções de escolha.</p>}
                                    
                                    {groupForm.items.map((item, index) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <Icon name="move" className="text-slate-400 cursor-grab opacity-60 hover:opacity-100 hidden sm:block" size={16} />
                                            
                                            <div className="flex-1 relative border border-slate-300 rounded-md h-10 flex items-center px-3 bg-white focus-within:border-slate-400 transition-colors">
                                                <input type="text" placeholder="Nome" value={item.name} onChange={e => { const newIt = [...groupForm.items]; newIt[index].name = e.target.value; setGroupForm({...groupForm, items: newIt}); }} className="w-full outline-none text-sm text-slate-700 font-medium" />
                                                <Icon name="lock" size={14} className="text-slate-300 ml-2" />
                                            </div>
                                            
                                            <div className="w-20 relative border border-slate-300 rounded-md h-10 bg-white focus-within:border-slate-400 transition-colors">
                                                <span className="absolute -top-2.5 left-2 bg-white px-1 text-[9px] text-slate-500 font-medium">Qtd. Máx</span>
                                                <input type="number" min="1" value={item.maxQtd} onChange={e => { const newIt = [...groupForm.items]; newIt[index].maxQtd = e.target.value; setGroupForm({...groupForm, items: newIt}); }} className="w-full h-full outline-none text-sm text-slate-700 text-center" />
                                            </div>
                                            
                                            <div className="w-28 relative border border-slate-300 rounded-md h-10 bg-white focus-within:border-slate-400 transition-colors">
                                                <span className="absolute -top-2.5 left-2 bg-white px-1 text-[9px] text-slate-500 font-medium">Preço</span>
                                                <div className="flex items-center h-full px-2">
                                                    <span className="text-sm text-slate-400 mr-1 font-medium">R$</span>
                                                    <input type="number" step="0.01" value={item.price} onChange={e => { const newIt = [...groupForm.items]; newIt[index].price = e.target.value; setGroupForm({...groupForm, items: newIt}); }} className="w-full outline-none text-sm text-slate-700" />
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 ml-1 shrink-0">
                                                <Icon name="tag" size={16} className="text-slate-400 cursor-pointer hover:text-slate-600"/>
                                                <span className="text-slate-300 mx-1">—</span>
                                                <Icon name="check-circle" size={20} className="text-emerald-500"/>
                                                <button onClick={() => { const newIt = groupForm.items.filter((_, i) => i !== index); setGroupForm({...groupForm, items: newIt}); }} className="p-1 hover:bg-slate-100 rounded ml-1 transition-colors">
                                                    <Icon name="trash" size={18} className="text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Coluna Direita: Informações de Vínculo */}
                            <div className="w-full md:w-[320px] bg-white md:bg-slate-50/50 p-6 overflow-y-auto shrink-0 border-t md:border-t-0 border-slate-200">
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{produtosVinculados.length} produtos usam este complemento</h4>
                                {produtosVinculados.length > 0 ? (
                                    <>
                                        <p className="text-red-500 text-[11px] mb-4 font-medium leading-tight">As modificações serão aplicadas em todos os produtos onde este complemento é usado</p>
                                        <div className="space-y-3">
                                            {produtosVinculados.map(p => (
                                                <div key={p.id} className="bg-white border border-slate-200 rounded-md p-3 shadow-sm flex flex-col justify-center">
                                                    <p className="font-bold text-slate-700 text-sm">{p.name}</p>
                                                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium"><Icon name="box" size={12}/> {p.category}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-500 text-[11px] mt-2 font-medium">Este complemento ainda não foi vinculado a nenhum produto do seu cardápio.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsGroupModalOpen(false)} className="px-6 py-2 bg-white border border-slate-300 text-slate-500 font-bold uppercase text-xs tracking-wider rounded flex items-center justify-center hover:bg-slate-50 transition-colors">CANCELAR</button>
                            <button onClick={salvarGrupoComplemento} className="px-8 py-2 bg-slate-200 hover:bg-[#A855F7] text-slate-500 hover:text-white font-bold uppercase text-xs tracking-wider rounded transition-colors flex items-center justify-center shadow-sm">SALVAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CRIAR CATEGORIA */}
            {isCategoryModalOpen && (
                <div className="modal-overlay z-[120] p-4 flex items-center justify-center fixed inset-0 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden scale-up-center">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 uppercase text-sm">Nova Categoria</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={18}/></button>
                        </div>
                        <div className="p-6">
                            <input type="text" placeholder="Nome (Ex: Lanches Especiais)" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} autoFocus className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-purple-500" />
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                            <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-500 font-black text-xs uppercase hover:bg-slate-200 rounded-lg">Cancelar</button>
                            <button onClick={handleCriarCategoria} className="px-6 py-2 bg-purple-600 text-white font-black text-xs uppercase rounded-lg shadow hover:bg-purple-700">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}