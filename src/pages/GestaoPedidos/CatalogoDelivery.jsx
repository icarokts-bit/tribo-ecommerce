import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import Icon from '../components/Icon';

export default function Produtos({ user, permissoes }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Estado do formulário
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', sku: '', description: '', category: '', imageUrl: '',
        price: 0, promoPrice: 0, isPromo: false,
        isActive: true, destaque: false,
        weight: 0, dimensions: { length: 0, width: 0, height: 0 },
        variations: []
    });

    // Estado temporário para adicionar nova variação (Ex: Cor -> Preto, Branco)
    const [newVarName, setNewVarName] = useState('');
    const [newVarOptions, setNewVarOptions] = useState('');

    const donoUid = permissoes?.donoUid || user?.uid;

    useEffect(() => {
        if (!donoUid) return;
        const fetchProducts = async () => {
            try {
                const docRef = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).get();
                if (docRef.exists) {
                    setProducts(docRef.data().products || []);
                }
            } catch (error) {
                console.error("Erro ao buscar produtos:", error);
            }
            setLoading(false);
        };
        fetchProducts();
    }, [donoUid]);

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
                name: '', sku: '', description: '', category: '', imageUrl: '',
                price: 0, promoPrice: 0, isPromo: false, isActive: true, destaque: false,
                weight: 0, dimensions: { length: 0, width: 0, height: 0 }, variations: []
            });
        }
        setNewVarName('');
        setNewVarOptions('');
        setIsModalOpen(true);
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

        let updatedProducts;
        if (editingId) {
            updatedProducts = products.map(p => p.id === editingId ? newProduct : p);
        } else {
            updatedProducts = [...products, newProduct];
        }

        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set({
                products: updatedProducts
            }, { merge: true });
            
            setProducts(updatedProducts);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Erro ao salvar. Verifique a consola.");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Tem a certeza que deseja remover este modelo 3D do catálogo?")) return;
        
        const updatedProducts = products.filter(p => p.id !== id);
        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).set({
                products: updatedProducts
            }, { merge: true });
            setProducts(updatedProducts);
        } catch (error) {
            console.error("Erro ao remover:", error);
        }
    };

    const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div className="p-8 flex justify-center"><Icon name="loader" size={32} className="animate-spin text-slate-400" /></div>;

    return (
        <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white"><Icon name="box" size={20}/></div>
                    <div>
                        <h1 className="font-black text-slate-800 text-lg uppercase tracking-widest leading-none">Meus Modelos 3D</h1>
                        <span className="text-xs font-bold text-slate-500">Gestão de Catálogo e SKUs</span>
                    </div>
                </div>
                <button onClick={() => openModal()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-colors">
                    <Icon name="plus" size={16}/> Novo Produto
                </button>
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
                                            <img src={product.imageUrl || 'https://via.placeholder.com/150?text=3D'} alt={product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                                            <div>
                                                <p className="font-black text-slate-800 text-sm">{product.name}</p>
                                                {product.destaque && <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase mt-1 inline-block">Destaque</span>}
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

            {/* MODAL DE EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-black text-slate-800 text-lg">{editingId ? 'Editar Modelo 3D' : 'Novo Modelo 3D'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Categoria *</label>
                                    <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" placeholder="Ex: Displays, Decoração..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">URL da Imagem</label>
                                    <input type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" placeholder="https://link-da-foto.com/foto.jpg" />
                                </div>
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
                                        <span className="text-xs font-black uppercase text-slate-700">Produto Ativo</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1">
                                        <input type="checkbox" checked={formData.destaque} onChange={e => setFormData({...formData, destaque: e.target.checked})} className="w-4 h-4 accent-amber-500" />
                                        <span className="text-xs font-black uppercase text-amber-600">Destacar</span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-4 border border-slate-200 rounded-xl space-y-4">
                                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2"><Icon name="truck" size={16}/> Logística (Correios / Melhor Envio)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Peso (kg)</label>
                                        <input type="number" step="0.001" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-black" placeholder="Ex: 0.150" />
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