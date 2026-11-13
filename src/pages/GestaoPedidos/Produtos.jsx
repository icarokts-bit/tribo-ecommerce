import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function Produtos({ user, permissoes }) {
    const [products, setProducts] = useState([]);
    const [categoriesList, setCategoriesList] = useState([]);
    const [produtosDoCusto, setProdutosDoCusto] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Modais principais
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // =====================================================================
    // ESTADOS DO RECORTADOR DE IMAGEM (800x800 PRODUTO | 900x600 MOSAICO)
    // =====================================================================
    const [cropModal, setCropModal] = useState({
        open: false,
        rawImage: '',
        target: 'product', // 'product' | 'category'
        aspect: '1:1',     // '1:1' (800x800), '3:2' (900x600 Universal Mosaico), '16:9' (1200x680 Banner)
        mode: 'cover',     // 'cover' (Cortar e Preencher 100%) | 'contain' (Foto inteira c/ margem)
        zoom: 1,
        offsetX: 0,
        offsetY: 0
    });
    const canvasPreviewRef = useRef(null);
    const loadedImgRef = useRef(null);

    // Estado do formulário de Produto
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', sku: '', description: '', category: '', imageUrl: '',
        price: 0, promoPrice: 0, isPromo: false,
        isActive: true, destaque: false, novidade: false, maisVendido: false,
        weight: 0, dimensions: { length: 0, width: 0, height: 0 },
        variations: []
    });

    // Estado do formulário de Categoria com Foto e Selo Laranja
    const [catForm, setCatForm] = useState({
        id: '',
        name: '',
        imageUrl: '',
        tagOption: 'DESTAQUE',
        customTag: ''
    });

    const [newVarName, setNewVarName] = useState('');
    const [newVarOptions, setNewVarOptions] = useState('');

    const donoUid = permissoes?.donoUid || user?.uid;

    // Função auxiliar que sincroniza Produtos e Categorias em todos os documentos da vitrine pública
    const sincronizarCatalogoPublico = async (novosProdutos, novasCategorias) => {
        if (!donoUid) return;
        const payload = {};
        if (novosProdutos !== undefined) {
            payload.products = novosProdutos;
            payload.produtos = novosProdutos;
        }
        if (novasCategorias !== undefined) {
            payload.categories = novasCategorias;
            payload.categorias = novasCategorias;
        }
        payload.donoUid = donoUid;
        payload.updatedAt = new Date().toISOString();

        await Promise.all([
            db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set(payload, { merge: true }),
            db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/loja`).set(payload, { merge: true }),
            db.doc(`lojas/${donoUid}`).set(payload, { merge: true })
        ]);
    };

    useEffect(() => {
        if (!donoUid) return;
        const fetchData = async () => {
            try {
                const docRef = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).get();
                if (docRef.exists) {
                    const data = docRef.data();
                    const prodsCarregados = data.products || [];
                    const catsCarregadas = data.categories || [];
                    setProducts(prodsCarregados);
                    setCategoriesList(catsCarregadas);

                    // Garante que os documentos públicos estejam sincronizados logo ao abrir a tela
                    sincronizarCatalogoPublico(prodsCarregados, catsCarregadas).catch(() => {});
                }

                const recSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).get();
                const custos = recSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProdutosDoCusto(custos);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            }
            setLoading(false);
        };
        fetchData();
    }, [donoUid]);

    // =====================================================================
    // LÓGICA DO RECORTADOR E PADRONIZADOR DE FOTOS
    // =====================================================================
    const abrirRecortadorComArquivo = (file, destino = 'product') => {
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            iniciarModalCrop(event.target.result, destino);
        };
    };

    const iniciarModalCrop = (imgSrc, destino = 'product') => {
        if (!imgSrc) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgSrc;
        img.onload = () => {
            loadedImgRef.current = img;
            setCropModal({
                open: true,
                rawImage: imgSrc,
                target: destino,
                aspect: destino === 'category' ? '3:2' : '1:1',
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

        let W = 800;
        let H = 800;
        if (cropModal.aspect === '3:2') { W = 900; H = 600; }
        if (cropModal.aspect === '16:9') { W = 1200; H = 680; }

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

        const maxShiftX = Math.max(250, Math.abs(drawWidth - W) / 2 + 150);
        const maxShiftY = Math.max(250, Math.abs(drawHeight - H) / 2 + 150);

        const centerX = (W - drawWidth) / 2 + (Number(cropModal.offsetX) / 100) * maxShiftX;
        const centerY = (H - drawHeight) / 2 + (Number(cropModal.offsetY) / 100) * maxShiftY;

        ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);
    }, [cropModal]);

    const confirmarRecortePadraoSite = () => {
        if (!canvasPreviewRef.current) return;
        const urlFinalPadronizada = canvasPreviewRef.current.toDataURL('image/webp', 0.84);

        if (cropModal.target === 'product') {
            setFormData(prev => ({ ...prev, imageUrl: urlFinalPadronizada }));
        } else {
            setCatForm(prev => ({ ...prev, imageUrl: urlFinalPadronizada }));
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

    // ==========================================
    // GESTÃO DE CATEGORIAS
    // ==========================================
    const opcoesPadraoTag = ['DESTAQUE', 'LANÇAMENTOS', 'OFERTAS', 'MAIS VENDIDOS', 'NOVIDADES', 'PERSONALIZADOS', 'CATEGORIA', ''];

    const selecionarCategoriaParaEditar = (cat) => {
        const tagAtual = cat.tag !== undefined ? cat.tag : 'DESTAQUE';
        const ehPadrao = opcoesPadraoTag.includes(tagAtual);
        setCatForm({
            id: cat.id,
            name: cat.name || '',
            imageUrl: cat.imageUrl || '',
            tagOption: ehPadrao ? tagAtual : 'OUTRO',
            customTag: ehPadrao ? '' : tagAtual
        });
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!catForm.name.trim()) return;
        setSaving(true);

        const tagFinal = catForm.tagOption === 'OUTRO'
            ? catForm.customTag.trim().toUpperCase()
            : catForm.tagOption;

        const newCat = {
            id: catForm.id || crypto.randomUUID(),
            name: catForm.name.trim(),
            imageUrl: catForm.imageUrl || '',
            tag: tagFinal
        };

        const updatedCats = catForm.id
            ? categoriesList.map(c => c.id === catForm.id ? newCat : c)
            : [...categoriesList, newCat];

        try {
            await sincronizarCatalogoPublico(products, updatedCats);
            setCategoriesList(updatedCats);
            setCatForm({ id: '', name: '', imageUrl: '', tagOption: 'DESTAQUE', customTag: '' });
        } catch (error) {
            alert("Erro ao salvar categoria.");
        }
        setSaving(false);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Excluir esta categoria?")) return;
        const updatedCats = categoriesList.filter(c => c.id !== id);
        await sincronizarCatalogoPublico(products, updatedCats);
        setCategoriesList(updatedCats);
    };

    // ==========================================
    // GESTÃO DE PRODUTOS
    // ==========================================
    const openModal = (product = null) => {
        if (product) {
            setEditingId(product.id);
            setFormData({
                name: product.name || '', sku: product.sku || '', description: product.description || '',
                category: product.category || '', imageUrl: product.imageUrl || '',
                price: product.price || 0, promoPrice: product.promoPrice || 0, isPromo: product.isPromo || false,
                isActive: product.isActive !== false,
                destaque: product.destaque || false,
                novidade: product.novidade || false,
                maisVendido: product.maisVendido || false,
                weight: product.weight || 0, dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
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
        
        const precoNormal = Number(formData.price || 0);
        const precoPromocional = Number(formData.promoPrice || 0);
        const precoFinalVenda = formData.isPromo && precoPromocional > 0 ? precoPromocional : precoNormal;

        const newProduct = {
            id: editingId || crypto.randomUUID(),
            ...formData,
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

        const updatedProducts = editingId
            ? products.map(p => p.id === editingId ? newProduct : p)
            : [...products, newProduct];

        try {
            await sincronizarCatalogoPublico(updatedProducts, categoriesList);
            setProducts(updatedProducts);
            setIsModalOpen(false);
        } catch (error) {
            alert("Erro ao salvar.");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja remover este produto do catálogo?")) return;
        const updatedProducts = products.filter(p => p.id !== id);
        await sincronizarCatalogoPublico(updatedProducts, categoriesList);
        setProducts(updatedProducts);
    };

    const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div className="p-8 flex justify-center"><Icon name="loader" size={32} className="animate-spin text-slate-400" /></div>;

    return (
        <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Icon name="box" size={20}/></div>
                    <div>
                        <h1 className="font-black text-slate-800 text-lg uppercase tracking-widest leading-none">Meus Produtos</h1>
                        <span className="text-xs font-bold text-slate-500">Gestão de Catálogo, Mosaico de Categorias e Recorte Padrão</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsCatModalOpen(true)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors cursor-pointer">
                        <Icon name="grid" size={16}/> Categorias e Fotos ({categoriesList.length})
                    </button>
                    <button onClick={() => openModal()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors cursor-pointer">
                        <Icon name="plus" size={16}/> Novo Produto
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                                <th className="p-4">Produto / Selos</th>
                                <th className="p-4">SKU / Categoria</th>
                                <th className="p-4">Preço</th>
                                <th className="p-4">Logística</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Nenhum produto cadastrado.</td></tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={product.imageUrl || 'https://via.placeholder.com/150?text=3D'} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white" />
                                            <div>
                                                <p className="font-black text-slate-800 text-sm">{product.name}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.destaque && <span className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded uppercase">Top / Destaque</span>}
                                                    {product.novidade && <span className="text-[9px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.5 rounded uppercase">Novidade</span>}
                                                    {product.maisVendido && <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase">Mais Vendido</span>}
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
                                        <td className="p-4 text-xs font-bold text-slate-600 space-y-1">
                                            <p><Icon name="scale" size={12} className="inline mr-1"/> {product.weight} kg</p>
                                            <p><Icon name="maximize" size={12} className="inline mr-1"/> {product.dimensions?.length}x{product.dimensions?.width}x{product.dimensions?.height} cm</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {product.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => openModal(product)} className="text-blue-500 hover:text-blue-700 p-2 cursor-pointer"><Icon name="edit" size={18}/></button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-600 p-2 cursor-pointer"><Icon name="trash-2" size={18}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL DE CATEGORIAS COM FOTO PADRONIZADA (900x600 UNIVERSAL DO MOSAICO) */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg uppercase">Categorias do Mosaico</h3>
                                <p className="text-xs font-bold text-slate-400">Padrão Universal 900x600 px: encaixa automaticamente no celular e no PC</p>
                            </div>
                            <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-black"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                        <div className="w-32 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden cursor-pointer group">
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
                                            <button
                                                type="button"
                                                onClick={() => iniciarModalCrop(catForm.imageUrl, 'category')}
                                                className="text-[10px] font-black uppercase text-indigo-600 hover:underline cursor-pointer"
                                            >
                                                ✂️ Ajustar Corte
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome da Categoria *</label>
                                            <input 
                                                type="text" required value={catForm.name} 
                                                onChange={e => setCatForm({...catForm, name: e.target.value})} 
                                                placeholder="Ex: Chaveiros, Combos..."
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-orange-600 block mb-1">Texto em Laranja (Selo)</label>
                                            <select
                                                value={catForm.tagOption}
                                                onChange={e => setCatForm({...catForm, tagOption: e.target.value})}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-orange-500 cursor-pointer"
                                            >
                                                <option value="DESTAQUE">DESTAQUE</option>
                                                <option value="LANÇAMENTOS">LANÇAMENTOS</option>
                                                <option value="NOVIDADES">NOVIDADES</option>
                                                <option value="OFERTAS">OFERTAS</option>
                                                <option value="MAIS VENDIDOS">MAIS VENDIDOS</option>
                                                <option value="PERSONALIZADOS">PERSONALIZADOS</option>
                                                <option value="CATEGORIA">CATEGORIA</option>
                                                <option value="">Sem Texto Laranja</option>
                                                <option value="OUTRO">Digitar Outro Texto...</option>
                                            </select>
                                        </div>

                                        {catForm.tagOption === 'OUTRO' && (
                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-orange-600 block mb-1">Digite o Texto Personalizado do Selo *</label>
                                                <input 
                                                    type="text" required value={catForm.customTag} 
                                                    onChange={e => setCatForm({...catForm, customTag: e.target.value})} 
                                                    placeholder="Ex: EDIÇÃO LIMITADA, PROMOÇÃO..."
                                                    className="w-full p-2.5 bg-white border border-orange-300 rounded-lg font-bold text-sm outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/70">
                                    {catForm.id && (
                                        <button type="button" onClick={() => setCatForm({ id: '', name: '', imageUrl: '', tagOption: 'DESTAQUE', customTag: '' })} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-black text-xs uppercase">Cancelar</button>
                                    )}
                                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs uppercase cursor-pointer">
                                        {catForm.id ? 'Atualizar Categoria' : 'Adicionar Categoria'}
                                    </button>
                                </div>
                            </form>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {categoriesList.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-11 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                                {cat.imageUrl ? <img src={cat.imageUrl} className="w-full h-full object-cover" alt={cat.name} /> : <Icon name="image" size={18} className="text-slate-300" />}
                                            </div>
                                            <div>
                                                {cat.tag && <span className="text-[9px] font-black uppercase text-orange-500 block leading-none mb-0.5">{cat.tag}</span>}
                                                <span className="font-black text-slate-800 text-sm">{cat.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    selecionarCategoriaParaEditar(cat);
                                                    if (cat.imageUrl) iniciarModalCrop(cat.imageUrl, 'category');
                                                }}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                                                title="Cortar / Ajustar Foto"
                                            >
                                                ✂️
                                            </button>
                                            <button onClick={() => selecionarCategoriaParaEditar(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded cursor-pointer"><Icon name="edit-2" size={15}/></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"><Icon name="trash" size={15}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDIÇÃO DE PRODUTO */}
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
                                    <select 
                                        onChange={handleImportarDoCusto} 
                                        className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none text-slate-700 focus:border-emerald-500 cursor-pointer"
                                    >
                                        <option value="">
                                            {produtosDoCusto.length > 0 
                                                ? "Selecione um produto cadastrado no custo..." 
                                                : "Você ainda não cadastrou nenhuma ficha técnica..."}
                                        </option>
                                        {produtosDoCusto.map(prod => (
                                            <option key={prod.id} value={prod.id}>
                                                {prod.nome} (Custo: {formatMoney(prod.custoTotal || 0)} • Sugerido: {formatMoney(prod.precoSugerido || prod.precoVenda || 0)})
                                            </option>
                                        ))}
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
                                                📷 Trocar Foto
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => iniciarModalCrop(formData.imageUrl, 'product')}
                                                className="text-[11px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                                            >
                                                ✂️ Cortar / Deixar Padrão Site
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="text-center p-4 cursor-pointer w-full block">
                                        <Icon name="camera" size={36} className="text-slate-300 mx-auto mb-3" />
                                        <span className="text-xs font-black uppercase text-slate-600 block">Clique para selecionar foto do produto</span>
                                        <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">
                                            Abre automaticamente o recortador padrão quadrado do site (800x800 px)
                                        </p>
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
                                    <button type="button" onClick={() => setIsCatModalOpen(true)} className="text-indigo-600 hover:underline cursor-pointer">+ Gerenciar Categorias com Fotos e Selos</button>
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

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descrição Comercial</label>
                                <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black resize-none" />
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

            {/* MODAL INTERATIVO DE CORTE E ENQUADRAMENTO */}
            {cropModal.open && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-wider">✂️ Ajustar e Cortar Padrão Site</h3>
                                <span className="text-[11px] text-slate-400">
                                    {cropModal.aspect === '3:2' ? 'Padrão Universal Mosaico (900x600 px)' : cropModal.aspect === '16:9' ? 'Banner Panorâmico (1200x680 px)' : 'Quadrado Padrão Vitrine (800x800 px)'}
                                </span>
                            </div>
                            <button type="button" onClick={() => setCropModal(prev => ({ ...prev, open: false }))} className="text-white/70 hover:text-white text-xl cursor-pointer">✕</button>
                        </div>

                        <div className="p-5 space-y-3.5">
                            {cropModal.target === 'category' && (
                                <div className="grid grid-cols-3 gap-1.5 bg-indigo-50 p-1.5 rounded-xl border border-indigo-100">
                                    <button
                                        type="button"
                                        onClick={() => setCropModal(prev => ({ ...prev, aspect: '3:2' }))}
                                        className={`py-1.5 px-2 rounded-lg font-black text-[10px] uppercase cursor-pointer ${
                                            cropModal.aspect === '3:2' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                    >
                                        Mosaico (900x600)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCropModal(prev => ({ ...prev, aspect: '16:9' }))}
                                        className={`py-1.5 px-2 rounded-lg font-black text-[10px] uppercase cursor-pointer ${
                                            cropModal.aspect === '16:9' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                    >
                                        Largo (1200x680)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCropModal(prev => ({ ...prev, aspect: '1:1' }))}
                                        className={`py-1.5 px-2 rounded-lg font-black text-[10px] uppercase cursor-pointer ${
                                            cropModal.aspect === '1:1' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                    >
                                        Quadrado (800x800)
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setCropModal(prev => ({ ...prev, mode: 'cover', zoom: 1, offsetX: 0, offsetY: 0 }))}
                                    className={`py-2 rounded-lg font-black text-xs uppercase transition-all cursor-pointer ${
                                        cropModal.mode === 'cover' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    ✂️ Cortar / Preencher
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCropModal(prev => ({ ...prev, mode: 'contain', zoom: 1, offsetX: 0, offsetY: 0 }))}
                                    className={`py-2 rounded-lg font-black text-xs uppercase transition-all cursor-pointer ${
                                        cropModal.mode === 'contain' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    🖼️ Foto Inteira
                                </button>
                            </div>

                            <div className={`mx-auto rounded-2xl border-2 border-indigo-500 shadow-inner overflow-hidden bg-slate-100 relative ${
                                cropModal.aspect === '1:1' ? 'w-64 h-64' : 'w-72 h-48'
                            }`}>
                                <canvas ref={canvasPreviewRef} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 pointer-events-none border border-white/40 grid grid-cols-3 grid-rows-3">
                                    <div className="border-r border-b border-white/25" />
                                    <div className="border-r border-b border-white/25" />
                                    <div className="border-b border-white/25" />
                                    <div className="border-r border-b border-white/25" />
                                    <div className="border-r border-b border-white/25 bg-indigo-500/10" title="Área central segura" />
                                    <div className="border-b border-white/25" />
                                </div>
                            </div>

                            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <div className="flex justify-between font-black uppercase text-[10px] text-slate-600 mb-1">
                                        <span>🔍 Zoom (Aproximar)</span>
                                        <span>{Math.round(cropModal.zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="3"
                                        step="0.05"
                                        value={cropModal.zoom}
                                        onChange={e => setCropModal(prev => ({ ...prev, zoom: Number(e.target.value) }))}
                                        className="w-full accent-indigo-600 cursor-pointer"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="flex justify-between font-black uppercase text-[10px] text-slate-600 mb-1">
                                            <span>↔️ Posição Horizontal</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-100"
                                            max="100"
                                            step="1"
                                            value={cropModal.offsetX}
                                            onChange={e => setCropModal(prev => ({ ...prev, offsetX: Number(e.target.value) }))}
                                            className="w-full accent-indigo-600 cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between font-black uppercase text-[10px] text-slate-600 mb-1">
                                            <span>↕️ Posição Vertical</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-100"
                                            max="100"
                                            step="1"
                                            value={cropModal.offsetY}
                                            onChange={e => setCropModal(prev => ({ ...prev, offsetY: Number(e.target.value) }))}
                                            className="w-full accent-indigo-600 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setCropModal(prev => ({ ...prev, open: false }))}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmarRecortePadraoSite}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md cursor-pointer"
                                >
                                    ✓ Aplicar Padrão Site
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
            `}</style>
        </div>
    );
}