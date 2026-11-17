import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function Estoque({ user, permissoes, donoUid: propDonoUid }) {
    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;
    const [insumos, setInsumos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    
    // Controle do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Formulário do Insumo
    const [formData, setFormData] = useState({
        nome: '',
        unidade: 'un', // 'un', 'g' (kg), 'ml' (litros)
        quantidadeEstoque: '',
        custoUnitario: '' // R$/un, R$/kg ou R$/Litro
    });

    useEffect(() => {
        if (!donoUid) return;
        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`)
            .onSnapshot(snap => {
                setInsumos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            }, () => setLoading(false));

        return () => unsub();
    }, [donoUid]);

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const openModal = (item = null) => {
        if (item) {
            setEditingId(item.id);
            setFormData({
                nome: item.nome || item.name || '',
                unidade: item.unidade || item.unit || 'un',
                quantidadeEstoque: item.quantidadeEstoque || item.qtd || 0,
                custoUnitario: item.custoUnitario || item.precoCusto || item.price || item.valor || 0
            });
        } else {
            setEditingId(null);
            setFormData({
                nome: '',
                unidade: 'un',
                quantidadeEstoque: '',
                custoUnitario: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        if (!formData.nome.trim()) return alert('Preencha o nome do insumo.');
        
        setSaving(true);
        try {
            const idDoc = editingId || crypto.randomUUID();
            const payload = {
                id: idDoc,
                nome: formData.nome.trim(),
                unidade: formData.unidade,
                quantidadeEstoque: Number(formData.quantidadeEstoque || 0),
                custoUnitario: Number(formData.custoUnitario || 0),
                updatedAt: new Date().toISOString()
            };

            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`).doc(idDoc).set(payload, { merge: true });
            setIsModalOpen(false);
        } catch (err) {
            alert('Erro ao salvar insumo.');
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja remover este item do estoque? Ele deixará de aparecer nas opções da Ficha de Custos.")) return;
        try {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`).doc(id).delete();
        } catch (err) {}
    };

    const insumosFiltrados = insumos.filter(i => (i.nome || '').toLowerCase().includes(busca.toLowerCase()));

    // Total em dinheiro parado no estoque
    const valorEmEstoque = insumos.reduce((acc, curr) => acc + (Number(curr.quantidadeEstoque || 0) * Number(curr.custoUnitario || 0)), 0);

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100 text-slate-800">
            
            <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                        <Icon name="package" size={22} />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-base md:text-lg uppercase tracking-wider leading-none">
                            Estoque de Matéria-Prima
                        </h1>
                        <span className="text-xs font-bold text-slate-400">
                            Controle de filamentos, caixas, resinas e insumos base.
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right border-r border-slate-200 pr-4 hidden sm:block">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor em Estoque</span>
                        <strong className="text-sm font-black text-slate-800">{formatMoney(valorEmEstoque)}</strong>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
                    >
                        <Icon name="plus" size={16} /> + Novo Insumo
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <input
                        type="text"
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        placeholder="Buscar material no estoque..."
                        className="w-full max-w-md px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500 shadow-sm"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="p-4">Material / Insumo</th>
                                <th className="p-4 text-center">Unidade</th>
                                <th className="p-4 text-center">Qtd. Estoque</th>
                                <th className="p-4 text-right">Preço Base (Custo)</th>
                                <th className="p-4 text-right">Valor Parado (Total)</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="p-10 text-center text-xs font-bold text-slate-400">Carregando estoque...</td></tr>
                            ) : insumosFiltrados.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-xs font-black uppercase text-slate-400">Nenhum insumo cadastrado.</td></tr>
                            ) : (
                                insumosFiltrados.map(i => {
                                    const qtd = Number(i.quantidadeEstoque || 0);
                                    const custo = Number(i.custoUnitario || 0);
                                    const total = qtd * custo;

                                    return (
                                        <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50/80 text-xs">
                                            <td className="p-4 font-black text-slate-800">{i.nome}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                    i.unidade === 'g' ? 'bg-indigo-50 text-indigo-600' :
                                                    i.unidade === 'ml' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {i.unidade === 'g' ? 'Gramas (Kg)' : i.unidade === 'ml' ? 'Ml (Litro)' : 'Unidade'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-bold text-slate-600">
                                                {qtd} {i.unidade === 'g' ? 'Kg' : i.unidade === 'ml' ? 'Litros' : 'un'}
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-600">
                                                {formatMoney(custo)}
                                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                                    por {i.unidade === 'g' ? '1 Kg' : i.unidade === 'ml' ? '1 Litro' : 'peça'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black text-emerald-600">{formatMoney(total)}</td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <button onClick={() => openModal(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1 cursor-pointer"><Icon name="edit" size={16} /></button>
                                                <button onClick={() => handleDelete(i.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg cursor-pointer"><Icon name="trash-2" size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div className="flex items-center gap-2.5">
                                <Icon name="package" size={20} className="text-orange-500" />
                                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">
                                    {editingId ? 'Editar Insumo' : 'Novo Insumo / Material'}
                                </h3>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 text-xl cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nome do Material / Insumo *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: Filamento PETG Branco, Resina, Caixa 16x11x5"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Unidade de Medida</label>
                                    <select
                                        value={formData.unidade}
                                        onChange={e => setFormData({ ...formData, unidade: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:border-orange-500"
                                    >
                                        <option value="un">Unidade (Caixas, Argolas)</option>
                                        <option value="g">Gramas (Usar preço do Kg)</option>
                                        <option value="ml">Mililitros (Usar preço do Litro)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                                        Qtd. em {formData.unidade === 'g' ? 'Kilos (Kg)' : formData.unidade === 'ml' ? 'Litros (L)' : 'Estoque'}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.quantidadeEstoque}
                                        onChange={e => setFormData({ ...formData, quantidadeEstoque: e.target.value })}
                                        placeholder="Ex: 5"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-emerald-700 block mb-1">
                                    Preço Base Custo ({formData.unidade === 'g' ? 'Preço de 1 Kg' : formData.unidade === 'ml' ? 'Preço de 1 Litro' : 'Custo da Unidade'}) *
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    value={formData.custoUnitario}
                                    onChange={e => setFormData({ ...formData, custoUnitario: e.target.value })}
                                    placeholder={formData.unidade === 'g' ? 'Ex: 68.00' : 'Ex: 1.50'}
                                    className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-sm font-black text-center outline-none focus:border-emerald-500 text-emerald-900"
                                />
                                {formData.unidade !== 'un' && (
                                    <span className="text-[9px] font-bold text-slate-400 block text-center mt-1">
                                        O sistema irá extrair automaticamente a fração (gramas ou ml) na Ficha de Custos.
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-colors cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow-md transition-colors cursor-pointer">
                                    {saving ? 'Salvando...' : 'Salvar Insumo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}