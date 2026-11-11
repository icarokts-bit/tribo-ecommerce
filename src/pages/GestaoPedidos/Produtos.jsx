import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function Produtos({ user, permissoes }) {
    const [products, setProducts] = useState([]);
    const [categoriesList, setCategoriesList] = useState([]);
    const [produtosDoCusto, setProdutosDoCusto] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Modais
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Estado do formulário de Produto
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', sku: '', description: '', category: '', imageUrl: '',
        price: 0, promoPrice: 0, isPromo: false,
        isActive: true, destaque: false,
        weight: 0, dimensions: { length: 0, width: 0, height: 0 },
        variations: []
    });

    // Estado do formulário de Categoria com Foto
    const [catForm, setCatForm] = useState({ id: '', name: '', imageUrl: '' });

    const [newVarName, setNewVarName] = useState('');
    const [newVarOptions, setNewVarOptions] = useState('');

    const donoUid = permissoes?.donoUid || user?.uid;

    useEffect(() => {
        if (!donoUid) return;
        const fetchData = async () => {
            try {
                const docRef = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).get();
                if (docRef.exists) {
                    setProducts(docRef.data().products || []);
                    setCategoriesList(docRef.data().categories || []);
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

    // COMPRESSOR DE IMAGEM INTELIGENTE (Serve para Produto e Categoria)
    const compressImage = (file, maxWidth = 800, callback) => {
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                } else {
                    if (height > maxWidth) { width = Math.round((width * maxWidth) / height); height = maxWidth; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/webp', 0.75));
            };
        };
    };

    const handleImageUpload = (e) => {
        compressImage(e.target.files[0], 800, (compressedUrl) => {
            setFormData(prev => ({ ...prev, imageUrl: compressedUrl }));
        });
    };

    const handleCatImageUpload = (e) => {
        compressImage(e.target.files[0], 600, (compressedUrl) => {
            setCatForm(prev => ({ ...prev, imageUrl: compressedUrl }));
        });
    };

    // ==========================================
    // GESTÃO DE CATEGORIAS COM FOTO
    // ==========================================
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!catForm.name.trim()) return;
        setSaving(true);

        const newCat = {
            id: catForm.id || crypto.randomUUID(),
            name: catForm.name.trim(),
            imageUrl: catForm.imageUrl || ''
        };

        const updatedCats = catForm.id
            ? categoriesList.map(c => c.id === catForm.id ? newCat : c)
            : [...categoriesList, newCat];

        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set({
                categories: updatedCats
            }, { merge: true });
            setCategoriesList(updatedCats);
            setCatForm({ id: '', name: '', imageUrl: '' });
        } catch (error) {
            alert("Erro ao salvar categoria.");
        }
        setSaving(false);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Excluir esta categoria?")) return;
        const updatedCats = categoriesList.filter(c => c.id !== id);
        await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set({
            categories: updatedCats
        }, { merge: true });
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
                isActive: product.isActive !== false, destaque: product.destaque || false,
                weight: product.weight || 0, dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
                variations: product.variations || []
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '', sku: '', description: '', category: categoriesList[0]?.name || '', imageUrl: '',
                price: 0, promoPrice: 0, isPromo: false, isActive: true, destaque: false,
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
                price: prodCusto.precoVenda || 0,
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
        
        const newProduct = {
            id: editingId || crypto.randomUUID(),
            ...formData,
            price: Number(formData.price),
            promoPrice: Number(formData.promoPrice),
            weight: Number(formData.weight),
            dimensions: {
                length: Number(formData.dimensions.length),
                width: Number(formData.dimensions.width),
                height: Number(formData.dimensions.height)
            }
        };

        const updatedProducts = editingId
            ? products.map(p => p.id === editingId ? newProduct : p)
            : [...products, newProduct];

        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set({
                products: updatedProducts
            }, { merge: true });
            setProducts(updatedProducts);
            setIsModalOpen(false);
        } catch (error) {
            alert("Erro ao salvar.");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Tem a certeza que deseja remover este produto do catálogo?")) return;
        const updatedProducts = products.filter(p => p.id !== id);
        await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set({
            products: updatedProducts
        }, { merge: true });
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
                        <span className="text-xs font-bold text-slate-500">Gestão de Catálogo, Categorias e SKUs</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsCatModalOpen(true)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors">
                        <Icon name="grid" size={16}/> Categorias e Fotos ({categoriesList.length})
                    </button>
                    <button onClick={() => openModal()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors">
                        <Icon name="plus" size={16}/> Novo Produto
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                                <th className="p-4">Produto</th>
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
                                                {product.destaque && <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase mt-1 inline-block">Top / Destaque</span>}
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
                                            <button onClick={() => openModal(product)} className="text-blue-500 hover:text-blue-700 p-2"><Icon name="edit" size={18}/></button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-600 p-2"><Icon name="trash-2" size={18}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL DE CATEGORIAS COM FOTO */}
            {isCatModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg uppercase">Categorias da Vitrine</h3>
                                <p className="text-xs font-bold text-slate-400">Adicione fotos para criar o mosaico visual no topo da loja</p>
                            </div>
                            <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-black"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden shrink-0 cursor-pointer group">
                                    {catForm.imageUrl ? (
                                        <img src={catForm.imageUrl} alt="Cat" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <div className="text-center">
                                            <Icon name="camera" size={20} className="text-slate-300 mx-auto group-hover:text-indigo-500"/>
                                            <span className="text-[8px] font-black uppercase text-slate-400 block">Foto</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleCatImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>

                                <div className="flex-1 w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Nome do Departamento / Categoria</label>
                                    <input 
                                        type="text" required value={catForm.name} 
                                        onChange={e => setCatForm({...catForm, name: e.target.value})} 
                                        placeholder="Ex: Chaveiros, Displays NFC, Luminárias..."
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="flex gap-2 w-full md:w-auto mt-auto">
                                    {catForm.id && (
                                        <button type="button" onClick={() => setCatForm({ id: '', name: '', imageUrl: '' })} className="px-3 py-2.5 bg-slate-200 text-slate-600 rounded-lg font-black text-xs uppercase">Cancelar</button>
                                    )}
                                    <button type="submit" disabled={saving} className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs uppercase whitespace-nowrap">
                                        {catForm.id ? 'Atualizar' : 'Adicionar'}
                                    </button>
                                </div>
                            </form>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {categoriesList.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                                {cat.imageUrl ? <img src={cat.imageUrl} className="w-full h-full object-contain p-1" alt={cat.name} /> : <Icon name="image" size={18} className="text-slate-300" />}
                                            </div>
                                            <span className="font-black text-slate-800 text-sm">{cat.name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setCatForm(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Icon name="edit-2" size={15}/></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Icon name="trash" size={15}/></button>
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
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black"><Icon name="x" size={24} /></button>
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
                                                {prod.nome} (Custo base: {formatMoney(prod.custoTotal || 0)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer relative overflow-hidden">
                                {formData.imageUrl ? (
                                    <div className="flex flex-col items-center">
                                        <img src={formData.imageUrl} alt="Preview" className="h-40 w-auto object-contain rounded-lg shadow-sm border border-slate-200 bg-white p-2" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 mt-3 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm group-hover:text-emerald-500 transition-colors">Alterar Foto</span>
                                    </div>
                                ) : (
                                    <div className="text-center p-4">
                                        <Icon name="camera" size={36} className="text-slate-300 mx-auto mb-3 group-hover:text-emerald-500 transition-colors" />
                                        <span className="text-xs font-black uppercase text-slate-500">Clique para selecionar foto do produto</span>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">A foto será redimensionada e otimizada automaticamente</p>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
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
                                    <button type="button" onClick={() => setIsCatModalOpen(true)} className="text-indigo-600 hover:underline">+ Gerenciar Categorias com Fotos</button>
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

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preço Normal (R$)</label>
                                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-black" />
                                </div>
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center justify-between">
                                        Preço Promo <input type="checkbox" checked={formData.isPromo} onChange={e => setFormData({...formData, isPromo: e.target.checked})} className="accent-emerald-500" title="Ativar Promoção"/>
                                    </label>
                                    <input type="number" step="0.01" disabled={!formData.isPromo} value={formData.promoPrice} onChange={e => setFormData({...formData, promoPrice: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-emerald-500 disabled:opacity-50" />
                                </div>
                                <div className="flex items-center gap-2 md:col-span-2 pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1">
                                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 accent-black" />
                                        <span className="text-xs font-black uppercase text-slate-700">Ativo</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1">
                                        <input type="checkbox" checked={formData.destaque} onChange={e => setFormData({...formData, destaque: e.target.checked})} className="w-4 h-4 accent-amber-500" />
                                        <span className="text-xs font-black uppercase text-amber-600">Selo TOP</span>
                                    </label>
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
                                    <button type="button" onClick={handleAddVariation} className="w-full md:w-auto p-2.5 bg-slate-800 text-white rounded-lg font-black uppercase text-xs hover:bg-black transition-colors shrink-0">
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2">
                                {saving ? <Icon name="loader" size={16} className="animate-spin"/> : <Icon name="save" size={16}/>} Salvar Produto
                            </button>
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