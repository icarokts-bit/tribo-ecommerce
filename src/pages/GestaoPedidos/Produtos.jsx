import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function Produtos({ user, permissoes }) {
    const [products, setProducts] = useState([]);
    const [categoriesList, setCategoriesList] = useState([]);
    const [produtosDoCusto, setProdutosDoCusto] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    
    // Modais
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Crop Modal
    const [cropModal, setCropModal] = useState({
        open: false, 
        rawImage: '', 
        target: 'product', 
        aspect: '1:1', 
        mode: 'cover', 
        zoom: 1, 
        offsetX: 0, 
        offsetY: 0
    });
    
    const canvasPreviewRef = useRef(null);
    const loadedImgRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '', 
        sku: '', 
        description: '', 
        category: '', 
        imageUrl: '',
        price: 0, 
        promoPrice: 0, 
        isPromo: false, 
        isActive: true, 
        destaque: false, 
        novidade: false, 
        maisVendido: false,
        weight: 0, 
        dimensions: { length: 0, width: 0, height: 0 }, 
        variations: []
    });

    const [catForm, setCatForm] = useState({ 
        id: '', 
        name: '', 
        imageUrl: '', 
        aspect: '1:1', 
        tagOption: 'DESTAQUE', 
        customTag: '' 
    });
    
    const [newVarName, setNewVarName] = useState('');
    const [newVarOptions, setNewVarOptions] = useState('');
    const donoUid = permissoes?.donoUid || user?.uid;

    const sincronizarCatalogoPublico = async (novosProdutos, novasCategorias) => {
        if (!donoUid) throw new Error("Usuário não autenticado.");
        const payload = { updatedAt: new Date().toISOString() };
        
        if (novosProdutos !== undefined) {
            Object.assign(payload, { products: novosProdutos, produtos: novosProdutos });
        }
        if (novasCategorias !== undefined) {
            Object.assign(payload, { categories: novasCategorias, categorias: novasCategorias });
        }
        
        await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set(payload, { merge: true });
        
        try { 
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/loja`).set(payload, { merge: true }); 
        } catch (e) {}
    };

    useEffect(() => {
        if (!donoUid) return;
        const fetchData = async () => {
            try {
                const docRef = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).get();
                if (docRef.exists) {
                    const data = docRef.data();
                    setProducts(data.products || []);
                    setCategoriesList(data.categories || []);
                }
                const recSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).get();
                setProdutosDoCusto(recSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {}
            setLoading(false);
        };
        fetchData();
    }, [donoUid]);

    const abrirRecortadorComArquivo = (file, destino = 'product') => {
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => iniciarModalCrop(event.target.result, destino);
    };

    const iniciarModalCrop = (imgSrc, destino = 'product', aspectInicial = null) => {
        if (!imgSrc) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgSrc;
        img.onload = () => {
            loadedImgRef.current = img;
            let propDetectada = aspectInicial || (destino === 'category' ? (catForm.aspect || '1:1') : '1:1');
            if (!aspectInicial && destino === 'category') {
                const ratio = img.width / img.height;
                propDetectada = ratio > 1.6 ? '16:9' : ratio > 1.2 ? '3:2' : '1:1';
            }
            setCropModal({ 
                open: true, 
                rawImage: imgSrc, 
                target: destino, 
                aspect: propDetectada, 
                mode: 'cover', 
                zoom: 1, 
                offsetX: 0, 
                offsetY: 0 
            });
        };
    };

    useEffect(() => {
        if (!cropModal.open || !loadedImgRef.current || !canvasPreviewRef.current) return;
        const canvas = canvasPreviewRef.current;
        const ctx = canvas.getContext('2d');
        const img = loadedImgRef.current;
        
        let W = 560; 
        let H = 560;
        
        if (cropModal.aspect === '3:2') { 
            W = 600; 
            H = 400; 
        } else if (cropModal.aspect === '16:9') { 
            W = 640; 
            H = 360; 
        } else if (cropModal.aspect === 'original') {
            const maxDim = 580;
            if (img.width >= img.height) {
                W = maxDim;
                H = Math.max(240, Math.round((img.height / img.width) * maxDim));
            } else {
                H = maxDim;
                W = Math.max(240, Math.round((img.width / img.height) * maxDim));
            }
        }
        
        canvas.width = W; 
        canvas.height = H;
        
        ctx.fillStyle = '#FFFFFF'; 
        ctx.fillRect(0, 0, W, H);
        
        const baseScale = cropModal.mode === 'cover' 
            ? Math.max(W / img.width, H / img.height) 
            : Math.min(W / img.width, H / img.height);
            
        const finalScale = baseScale * Number(cropModal.zoom || 1);
        const drawWidth = img.width * finalScale; 
        const drawHeight = img.height * finalScale;
        
        const maxShiftX = Math.max(180, Math.abs(drawWidth - W) / 2 + 120);
        const maxShiftY = Math.max(180, Math.abs(drawHeight - H) / 2 + 120);
        const centerX = (W - drawWidth) / 2 + (Number(cropModal.offsetX) / 100) * maxShiftX;
        const centerY = (H - drawHeight) / 2 + (Number(cropModal.offsetY) / 100) * maxShiftY;
        
        ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);
    }, [cropModal]);

    const confirmarRecortePadraoSite = () => {
        if (!canvasPreviewRef.current) return;
        let urlFinalPadronizada = canvasPreviewRef.current.toDataURL('image/webp', 0.75);
        if (urlFinalPadronizada.length > 135000) {
            urlFinalPadronizada = canvasPreviewRef.current.toDataURL('image/jpeg', 0.68);
        }
        
        if (cropModal.target === 'product') {
            setFormData(prev => ({ ...prev, imageUrl: urlFinalPadronizada }));
        } else {
            setCatForm(prev => ({ ...prev, imageUrl: urlFinalPadronizada, aspect: cropModal.aspect }));
        }
        setCropModal(prev => ({ ...prev, open: false }));
    };

    const handleImageUpload = (e) => { 
        const file = e.target.files[0]; 
        if (file) abrirRecortadorComArquivo(file, 'product'); 
        e.target.value = ''; 
    };
    
    const handleCatImageUpload = (e) => { 
        const file = e.target.files[0]; 
        if (file) abrirRecortadorComArquivo(file, 'category'); 
        e.target.value = ''; 
    };

    const comprimirImagemBase64Antiga = (base64Str) => {
        return new Promise((resolve) => {
            if (!base64Str || !base64Str.startsWith('data:image') || base64Str.length < 115000) {
                return resolve(base64Str);
            }
            const img = new Image(); 
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width; 
                let h = img.height; 
                const maxDim = 550;
                
                if (w >= h && w > maxDim) { 
                    h = Math.round((h * maxDim) / w); 
                    w = maxDim; 
                } else if (h > w && h > maxDim) { 
                    w = Math.round((w * maxDim) / h); 
                    h = maxDim; 
                }
                
                canvas.width = w; 
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.68));
            };
            img.onerror = () => resolve(base64Str);
        });
    };

    const obterDescricaoPosicaoMosaico = (idx) => {
        const slot = (idx % 8) + 1;
        if (slot === 1) return '1º • Card Esquerdo (Ideal 1:1 Quadrado)';
        if (slot === 2) return '2º • Centro Topo (Ideal 16:9 ou 3:2)';
        if (slot === 3) return '3º • Centro Base (Ideal 16:9 ou 3:2)';
        if (slot === 4) return '4º • Destaque Direito Grande (Ideal 1:1 ou 3:2)';
        return `${slot}º • Linha Inferior do Mosaico`;
    };

    const moverPosicaoCategoria = async (indexAtual, direcao) => {
        const novoIndex = indexAtual + direcao;
        if (novoIndex < 0 || novoIndex >= categoriesList.length) return;
        
        const novaLista = [...categoriesList];
        const [itemMovido] = novaLista.splice(indexAtual, 1);
        novaLista.splice(novoIndex, 0, itemMovido);
        
        setCategoriesList(novaLista);
        try { 
            await sincronizarCatalogoPublico(undefined, novaLista); 
        } catch (err) {}
    };

    const selecionarCategoriaParaEditar = (cat) => {
        const tagAtual = cat.tag !== undefined ? cat.tag : 'DESTAQUE';
        const opcoesPadraoTag = ['DESTAQUE', 'LANÇAMENTOS', 'OFERTAS', 'MAIS VENDIDOS', 'NOVIDADES', 'PERSONALIZADOS', 'CATEGORIA', ''];
        
        setCatForm({ 
            id: cat.id, 
            name: cat.name || '', 
            imageUrl: cat.imageUrl || '', 
            aspect: cat.aspect || '1:1', 
            tagOption: opcoesPadraoTag.includes(tagAtual) ? tagAtual : 'OUTRO', 
            customTag: opcoesPadraoTag.includes(tagAtual) ? '' : tagAtual 
        });
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!catForm.name.trim()) return;
        setSaving(true);
        try {
            const tagFinal = catForm.tagOption === 'OUTRO' ? catForm.customTag.trim().toUpperCase() : catForm.tagOption;
            const newCat = { 
                id: catForm.id || crypto.randomUUID(), 
                name: catForm.name.trim(), 
                imageUrl: await comprimirImagemBase64Antiga(catForm.imageUrl || ''), 
                aspect: catForm.aspect || '1:1', 
                tag: tagFinal 
            };
            const rawUpdatedCats = catForm.id ? categoriesList.map(c => c.id === catForm.id ? newCat : c) : [...categoriesList, newCat];
            const updatedCats = await Promise.all(rawUpdatedCats.map(async (c) => ({ ...c, imageUrl: await comprimirImagemBase64Antiga(c.imageUrl || '') })));
            
            await sincronizarCatalogoPublico(undefined, updatedCats);
            setCategoriesList(updatedCats);
            setCatForm({ id: '', name: '', imageUrl: '', aspect: '1:1', tagOption: 'DESTAQUE', customTag: '' });
        } catch (error) { 
            alert("Erro ao salvar categoria."); 
        }
        setSaving(false);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Excluir esta categoria?")) return;
        const updatedCats = categoriesList.filter(c => c.id !== id);
        await sincronizarCatalogoPublico(undefined, updatedCats);
        setCategoriesList(updatedCats);
    };

    const openModal = (product = null) => {
        if (product) {
            setEditingId(product.id);
            setFormData({
                name: product.name || '', 
                sku: product.sku || '', 
                description: product.description || '', 
                category: product.category || '', 
                imageUrl: product.imageUrl || '',
                price: product.price || 0, 
                promoPrice: product.promoPrice || 0, 
                isPromo: product.isPromo || false, 
                isActive: product.isActive !== false,
                destaque: product.destaque || false, 
                novidade: product.novidade || false, 
                maisVendido: product.maisVendido || false,
                weight: product.weight || 0, 
                dimensions: product.dimensions || { length: 0, width: 0, height: 0 }, 
                variations: product.variations || []
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '', sku: '', description: '', category: categoriesList[0]?.name || '', imageUrl: '', 
                price: 0, promoPrice: 0, isPromo: false, isActive: true,
                destaque: false, novidade: false, maisVendido: false, 
                weight: 0, dimensions: { length: 0, width: 0, height: 0 }, variations: []
            });
        }
        setNewVarName(''); 
        setNewVarOptions(''); 
        setIsModalOpen(true);
    };

    const handleImportarDoCusto = (e) => {
        const idEscolhido = e.target.value;
        if (!idEscolhido) return;
        const prodCusto = produtosDoCusto.find(p => p.id === idEscolhido);
        if (prodCusto) {
            setFormData(prev => ({ 
                ...prev, 
                name: prodCusto.nome || '', 
                price: prodCusto.precoVenda || prodCusto.precoSugerido || 0, 
                weight: prodCusto.peso || 0, 
                dimensions: { 
                    length: prodCusto.comprimento || 0, 
                    width: prodCusto.largura || 0, 
                    height: prodCusto.altura || 0 
                } 
            }));
        }
    };

    const handleAddVariation = () => {
        if (!newVarName || !newVarOptions) return;
        const optionsArray = newVarOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
        setFormData(prev => ({ 
            ...prev, 
            variations: [...prev.variations, { name: newVarName.trim(), options: optionsArray }] 
        }));
        setNewVarName(''); 
        setNewVarOptions('');
    };

    const handleRemoveVariation = (index) => {
        setFormData(prev => ({ 
            ...prev, 
            variations: prev.variations.filter((_, i) => i !== index) 
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const precoNormal = Number(formData.price || 0);
            const precoPromocional = Number(formData.promoPrice || 0);
            const precoFinalVenda = formData.isPromo && precoPromocional > 0 ? precoPromocional : precoNormal;
            
            const newProduct = {
                id: editingId || crypto.randomUUID(), 
                ...formData,
                imageUrl: await comprimirImagemBase64Antiga(formData.imageUrl || ''),
                price: precoNormal, 
                promoPrice: precoPromocional, 
                sellingPrice: precoFinalVenda,
                weight: Number(formData.weight || 0),
                dimensions: { 
                    length: Number(formData.dimensions.length || 0), 
                    width: Number(formData.dimensions.width || 0), 
                    height: Number(formData.dimensions.height || 0) 
                }
            };
            
            const rawUpdatedProducts = editingId ? products.map(p => p.id === editingId ? newProduct : p) : [...products, newProduct];
            const updatedProducts = await Promise.all(rawUpdatedProducts.map(async (p) => ({ ...p, imageUrl: await comprimirImagemBase64Antiga(p.imageUrl || '') })));
            
            await sincronizarCatalogoPublico(updatedProducts, undefined);
            setProducts(updatedProducts);
            setIsModalOpen(false);
        } catch (error) { 
            alert("Erro ao salvar produto."); 
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remover este produto do catálogo?")) return;
        const updatedProducts = products.filter(p => p.id !== id);
        await sincronizarCatalogoPublico(updatedProducts, undefined);
        setProducts(updatedProducts);
    };

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    if (loading) return <div className="p-8 flex justify-center"><Icon name="loader" size={32} className="animate-spin text-slate-400" /></div>;

    return (
        <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Icon name="box" size={20}/></div>
                    <div>
                        <h1 className="font-black text-slate-800 text-lg uppercase tracking-widest leading-none">Meus Produtos</h1>
                        <span className="text-xs font-bold text-slate-500">Gestão de Catálogo e Mosaico</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsCatModalOpen(true)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 cursor-pointer">
                        <Icon name="grid" size={16}/> Categorias e Mosaico ({categoriesList.length})
                    </button>
                    <button onClick={() => openModal()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 cursor-pointer">
                        <Icon name="plus" size={16}/> Novo Produto
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto cadastrado..." className="w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                                <th className="p-4">Produto</th>
                                <th className="p-4">SKU / Categoria</th>
                                <th className="p-4">Preço</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.filter(p => (p.name || '').toLowerCase().includes(busca.toLowerCase())).map(product => (
                                <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" />
                                        <div>
                                            <p className="font-black text-slate-800 text-sm line-clamp-1">{product.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.destaque && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded uppercase">Top</span>}
                                                {product.novidade && <span className="text-[9px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.5 rounded uppercase">Novo</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-800 text-xs">{product.sku || 'Sem SKU'}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{product.category}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className={`font-black text-sm ${product.isPromo ? 'text-emerald-600' : 'text-slate-800'}`}>
                                            {formatMoney(product.isPromo ? product.promoPrice : product.price)}
                                        </p>
                                        {product.isPromo && <p className="text-[10px] text-slate-400 line-through font-bold">{formatMoney(product.price)}</p>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openModal(product)} className="text-blue-500 hover:text-blue-700 p-2"><Icon name="edit" size={18}/></button>
                                        <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-600 p-2"><Icon name="trash-2" size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL CATEGORIAS */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div><h3 className="font-black text-slate-800 text-lg uppercase">Categorias & Posição no Mosaico</h3></div>
                            <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-black"><Icon name="x" size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden cursor-pointer group">
                                            {catForm.imageUrl ? (
                                                <img src={catForm.imageUrl} alt="Cat" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-2">
                                                    <Icon name="camera" size={22} className="text-slate-300 mx-auto group-hover:text-indigo-500"/>
                                                    <span className="text-[9px] font-black uppercase text-slate-400 block mt-1">Escolher Foto</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleCatImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                        {catForm.imageUrl && (
                                            <button type="button" onClick={() => iniciarModalCrop(catForm.imageUrl, 'category', catForm.aspect)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">
                                                ✂️ Ajustar ({catForm.aspect || '1:1'})
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome da Categoria *</label>
                                            <input type="text" required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Ex: Chaveiros, Combos..." className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-indigo-600 block mb-1">Formato do Card no Site</label>
                                            <select value={catForm.aspect || '1:1'} onChange={e => { const novoAspect = e.target.value; setCatForm({...catForm, aspect: novoAspect}); if (catForm.imageUrl) iniciarModalCrop(catForm.imageUrl, 'category', novoAspect); }} className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg font-black text-xs text-indigo-900 outline-none focus:border-indigo-500">
                                                <option value="1:1">Quadrado (1:1)</option>
                                                <option value="3:2">Retangular Mosaico (3:2)</option>
                                                <option value="16:9">Panorâmico Largo (16:9)</option>
                                                <option value="original">Proporção Livre da Foto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-orange-600 block mb-1">Texto em Laranja (Selo)</label>
                                            <select value={catForm.tagOption} onChange={e => setCatForm({...catForm, tagOption: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-orange-500">
                                                <option value="DESTAQUE">DESTAQUE</option>
                                                <option value="LANÇAMENTOS">LANÇAMENTOS</option>
                                                <option value="">Sem Texto Laranja</option>
                                                <option value="OUTRO">Digitar Outro Texto...</option>
                                            </select>
                                        </div>
                                        {catForm.tagOption === 'OUTRO' && (
                                            <div className="sm:col-span-3">
                                                <label className="text-[10px] font-black uppercase text-orange-600 block mb-1">Digite o Texto Personalizado do Selo *</label>
                                                <input type="text" required value={catForm.customTag} onChange={e => setCatForm({...catForm, customTag: e.target.value})} placeholder="Ex: EDIÇÃO LIMITADA, PROMOÇÃO..." className="w-full p-2.5 bg-white border border-orange-300 rounded-lg font-bold text-sm outline-none focus:border-orange-500"/>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/70">
                                    {catForm.id && (
                                        <button type="button" onClick={() => setCatForm({ id: '', name: '', imageUrl: '', aspect: '1:1', tagOption: 'DESTAQUE', customTag: '' })} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-black text-xs uppercase cursor-pointer">Cancelar</button>
                                    )}
                                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs uppercase">
                                        {saving ? 'Salvando...' : catForm.id ? 'Atualizar Categoria' : 'Adicionar Categoria'}
                                    </button>
                                </div>
                            </form>
                            
                            <div className="space-y-2.5">
                                {categoriesList.map((cat, index) => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-indigo-300">
                                        <div className="flex items-center gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <button type="button" disabled={index === 0} onClick={() => moverPosicaoCategoria(index, -1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-indigo-600 hover:text-white disabled:opacity-30 text-slate-700 font-black text-xs">↑</button>
                                                <button type="button" disabled={index === categoriesList.length - 1} onClick={() => moverPosicaoCategoria(index, 1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-indigo-600 hover:text-white disabled:opacity-30 text-slate-700 font-black text-xs">↓</button>
                                            </div>
                                            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                                {cat.imageUrl ? <img src={cat.imageUrl} className="w-full h-full object-cover" /> : <Icon name="image" size={18} className="text-slate-300" />}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded">{obterDescricaoPosicaoMosaico(index)}</span>
                                                    <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">Fmt: {cat.aspect || '1:1'}</span>
                                                    {cat.tag && <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{cat.tag}</span>}
                                                </div>
                                                <span className="font-black text-slate-800 text-sm">{cat.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => { selecionarCategoriaParaEditar(cat); if (cat.imageUrl) iniciarModalCrop(cat.imageUrl, 'category', cat.aspect || '1:1'); }} className="px-2.5 py-1.5 text-xs font-black uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg">✂️ Enquadrar</button>
                                            <button onClick={() => selecionarCategoriaParaEditar(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Icon name="edit-2" size={16}/></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Icon name="trash" size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIÇÃO PRODUTO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-black text-slate-800 text-lg">{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black cursor-pointer"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {!editingId && (
                                <div className="mb-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <label className="text-[10px] font-black uppercase text-emerald-800 block mb-2 flex items-center gap-1">
                                        <Icon name="download" size={14} /> Importar de uma Ficha Técnica (Custo)
                                    </label>
                                    <select onChange={handleImportarDoCusto} className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none text-slate-700 focus:border-emerald-500 cursor-pointer">
                                        <option value="">{produtosDoCusto.length > 0 ? "Selecione um produto cadastrado no custo..." : "Você ainda não cadastrou nenhuma ficha técnica..."}</option>
                                        {produtosDoCusto.map(prod => {
                                            const custo = Number(prod.custoTotal || 0);
                                            const markup = Number(prod.markupEscolhido || 3);
                                            const precoLoja = custo * markup;
                                            const precoMkt = Number(prod.precoSugerido || prod.precoVenda || 0);
                                            return (
                                                <option key={prod.id} value={prod.id}>
                                                    {prod.nome} (Custo: {formatMoney(custo)} • Sug. Loja: {formatMoney(precoLoja)} • Sug. Mkt: {formatMoney(precoMkt)})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 transition-colors">
                                {formData.imageUrl ? (
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className="w-44 h-44 rounded-2xl shadow-sm border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            <label className="text-[11px] font-black uppercase text-slate-700 bg-white hover:bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-xs cursor-pointer transition-colors">
                                                📷 Trocar Foto <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            </label>
                                            <button type="button" onClick={() => iniciarModalCrop(formData.imageUrl, 'product', '1:1')} className="text-[11px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full shadow-xs cursor-pointer transition-colors flex items-center gap-1">
                                                ✂️ Ajustar / Cortar 1:1
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="text-center p-4 cursor-pointer w-full block">
                                        <Icon name="camera" size={36} className="text-slate-300 mx-auto mb-3" />
                                        <span className="text-xs font-black uppercase text-slate-600 block">Clique para selecionar foto do produto</span>
                                        <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">Enquadramento padrão 1:1 quadrado</p>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Produto *</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">SKU (Código Interno)</label>
                                    <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" placeholder="Ex: TOTEM-NFC-01" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex justify-between">
                                    <span>Categoria *</span>
                                    <button type="button" onClick={() => setIsCatModalOpen(true)} className="text-indigo-600 hover:underline cursor-pointer">+ Gerenciar Categorias e Posições</button>
                                </label>
                                {categoriesList.length > 0 ? (
                                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black">
                                        <option value="">Selecione uma categoria...</option>
                                        {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" placeholder="Ex: Displays, Chaveiros..." />
                                )}
                            </div>

                            {/* CAIXA DE DESCRIÇÃO AMPLIADA E RESPONSIVA (PULOS DE LINHA MANTIDOS) */}
                            <div className="space-y-1 w-full">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 block mb-1">
                                    Descrição Comercial <span className="text-indigo-600 lowercase font-bold">(pode usar pular linha)</span>
                                </label>
                                <textarea 
                                    rows="6" 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})} 
                                    placeholder="Descreva todos os detalhes, brindes ou instruções de personalização..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-y whitespace-pre-line" 
                                />
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preço Normal (R$)</label>
                                        <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center justify-between">
                                            <span>Preço Promo (Oferta)</span>
                                            <input type="checkbox" checked={formData.isPromo} onChange={e => setFormData({...formData, isPromo: e.target.checked})} className="w-4 h-4 accent-rose-600" title="Ativar Promoção"/>
                                        </label>
                                        <input type="number" step="0.01" disabled={!formData.isPromo} value={formData.promoPrice} onChange={e => setFormData({...formData, promoPrice: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-rose-500 disabled:opacity-50" />
                                    </div>
                                    <div className="space-y-1 flex flex-col justify-end">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 h-[46px]">
                                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 accent-black" />
                                            <span className="text-xs font-black uppercase text-slate-700">Produto Visível / Ativo</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 block mb-2">Selos de Destaque na Vitrine</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <label className={`flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border transition-all ${formData.destaque ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200'}`}>
                                            <input type="checkbox" checked={formData.destaque} onChange={e => setFormData({...formData, destaque: e.target.checked})} className="w-4 h-4 accent-emerald-600" />
                                            <div>
                                                <span className="text-xs font-black uppercase text-emerald-700 block leading-none">★ Selo TOP</span>
                                                <span className="text-[10px] text-slate-400 font-bold">Vai p/ Carrossel Destaque</span>
                                            </div>
                                        </label>

                                        <label className={`flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border transition-all ${formData.novidade ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200'}`}>
                                            <input type="checkbox" checked={formData.novidade} onChange={e => setFormData({...formData, novidade: e.target.checked})} className="w-4 h-4 accent-blue-600" />
                                            <div>
                                                <span className="text-xs font-black uppercase text-blue-700 block leading-none">✨ Selo NOVIDADE</span>
                                                <span className="text-[10px] text-slate-400 font-bold">Destaca lançamento</span>
                                            </div>
                                        </label>

                                        <label className={`flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border transition-all ${formData.maisVendido ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}`}>
                                            <input type="checkbox" checked={formData.maisVendido} onChange={e => setFormData({...formData, maisVendido: e.target.checked})} className="w-4 h-4 accent-amber-600" />
                                            <div>
                                                <span className="text-xs font-black uppercase text-amber-700 block leading-none">🔥 MAIS VENDIDO</span>
                                                <span className="text-[10px] text-slate-400 font-bold">Campeão de vendas</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2"><Icon name="truck" size={16}/> Logística (Correios / Melhor Envio)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Peso (kg)</label>
                                        <input type="number" step="0.001" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Comprimento (cm)</label>
                                        <input type="number" value={formData.dimensions.length} onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, length: e.target.value}})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Largura (cm)</label>
                                        <input type="number" value={formData.dimensions.width} onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, width: e.target.value}})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Altura (cm)</label>
                                        <input type="number" value={formData.dimensions.height} onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, height: e.target.value}})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-slate-50/50">
                                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2"><Icon name="layers" size={16}/> Variações (Cor, Tamanho, Material)</h4>
                                {formData.variations.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {formData.variations.map((v, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <div>
                                                    <span className="font-black text-xs text-slate-800 mr-2">{v.name}:</span>
                                                    <span className="text-xs font-bold text-slate-500">{v.options.join(', ')}</span>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveVariation(idx)} className="text-red-400 hover:text-red-600"><Icon name="trash" size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row gap-2 items-end bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="w-full md:w-1/3 space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo (Ex: Cor)</label>
                                        <input type="text" value={newVarName} onChange={e => setNewVarName(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-black" />
                                    </div>
                                    <div className="w-full md:flex-1 space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Opções (Separadas por vírgula)</label>
                                        <input type="text" value={newVarOptions} onChange={e => setNewVarOptions(e.target.value)} placeholder="Preto, Branco, Cinza..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-black" />
                                    </div>
                                    <button type="button" onClick={handleAddVariation} className="w-full md:w-auto p-2.5 bg-slate-800 text-white rounded-lg font-black uppercase text-xs hover:bg-black transition-colors shrink-0 cursor-pointer">
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors cursor-pointer">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer">
                                {saving ? <Icon name="loader" size={16} className="animate-spin"/> : <Icon name="save" size={16}/>} Salvar Produto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CROP IMAGEM */}
            {cropModal.open && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-wider">✂️ Escolher Proporção e Enquadrar</h3>
                            </div>
                            <button type="button" onClick={() => setCropModal(prev => ({ ...prev, open: false }))} className="text-white/70 hover:text-white text-xl cursor-pointer">✕</button>
                        </div>
                        <div className="p-5 space-y-3.5">
                            <div className="grid grid-cols-4 gap-1 bg-indigo-50 p-1.5 rounded-xl border border-indigo-100">
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, aspect: '1:1', mode: 'cover', zoom: 1, offsetX: 0, offsetY: 0 }))} className={`py-2 px-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${cropModal.aspect === '1:1' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-100'}`}>1:1 Quadrado</button>
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, aspect: '3:2', mode: 'cover', zoom: 1, offsetX: 0, offsetY: 0 }))} className={`py-2 px-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${cropModal.aspect === '3:2' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-100'}`}>3:2 Mosaico</button>
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, aspect: '16:9', mode: 'cover', zoom: 1, offsetX: 0, offsetY: 0 }))} className={`py-2 px-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${cropModal.aspect === '16:9' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-100'}`}>16:9 Largo</button>
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, aspect: 'original', mode: 'contain', zoom: 1, offsetX: 0, offsetY: 0 }))} className={`py-2 px-1 rounded-lg font-black text-[10px] uppercase cursor-pointer ${cropModal.aspect === 'original' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-100'}`}>Livre</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, mode: 'cover', zoom: 1, offsetX: 0, offsetY: 0 }))} className={`py-2 rounded-lg font-black text-xs uppercase transition-all cursor-pointer ${cropModal.mode === 'cover' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>✂️ Preencher Tudo</button>
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, mode: 'contain', zoom: 1, offsetX: 0, offsetY: 0 }))} className={`py-2 rounded-lg font-black text-xs uppercase transition-all cursor-pointer ${cropModal.mode === 'contain' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>🖼️ Foto Inteira c/ Margem</button>
                            </div>
                            <div className="w-72 max-h-64 mx-auto rounded-2xl border-2 border-indigo-500 shadow-inner overflow-hidden bg-slate-900 flex items-center justify-center relative">
                                <canvas ref={canvasPreviewRef} className="max-w-full max-h-60 w-auto h-auto object-contain" />
                            </div>
                            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <div className="flex justify-between font-black uppercase text-[10px] text-slate-600 mb-1"><span>🔍 Zoom</span><span>{Math.round(cropModal.zoom * 100)}%</span></div>
                                    <input type="range" min="0.5" max="3" step="0.05" value={cropModal.zoom} onChange={e => setCropModal(prev => ({ ...prev, zoom: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><span className="font-black uppercase text-[10px] text-slate-600 block mb-1">↔️ Horizontal</span><input type="range" min="-100" max="100" step="1" value={cropModal.offsetX} onChange={e => setCropModal(prev => ({ ...prev, offsetX: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" /></div>
                                    <div><span className="font-black uppercase text-[10px] text-slate-600 block mb-1">↕️ Vertical</span><input type="range" min="-100" max="100" step="1" value={cropModal.offsetY} onChange={e => setCropModal(prev => ({ ...prev, offsetY: Number(e.target.value) }))} className="w-full accent-indigo-600 cursor-pointer" /></div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setCropModal(prev => ({ ...prev, open: false }))} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase cursor-pointer">Cancelar</button>
                                <button type="button" onClick={confirmarRecortePadraoSite} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md cursor-pointer">✓ Aplicar Formato</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }`}</style>
        </div>
    );
}