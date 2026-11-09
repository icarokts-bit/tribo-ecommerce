import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/Icon';
import { db } from '../../firebase';

export default function Estoque({ donoUid, formatMoney: globalFormatMoney }) {
    const formatMoney = globalFormatMoney || ((val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    const p = (val) => Number(val || 0);

    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [nome, setNome] = useState('');
    const [tipo, setTipo] = useState('materia_prima'); // 'materia_prima' ou 'produto_acabado'
    const [quantidade, setQuantidade] = useState('');
    const [estoqueMinimo, setEstoqueMinimo] = useState('');
    const [unidade, setUnidade] = useState('un'); // g, kg, un, cm, m, ml, l
    const [custoUnitario, setCustoUnitario] = useState(''); // Custo por UNIDADE DE MEDIDA (Ex: Custo por grama)

    useEffect(() => {
        if (!donoUid) return;
        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`)
            .onSnapshot(snap => {
                setItens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
        return () => unsub();
    }, [donoUid]);

    const itensFiltrados = useMemo(() => {
        return itens.filter(item => item.nome.toLowerCase().includes(search.toLowerCase()))
                    .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [itens, search]);

    const openModal = (item = null) => {
        if (item) {
            setEditingId(item.id);
            setNome(item.nome || '');
            setTipo(item.tipo || 'materia_prima');
            setQuantidade(item.quantidade || '');
            setEstoqueMinimo(item.estoqueMinimo || '');
            setUnidade(item.unidade || 'un');
            setCustoUnitario(item.custoUnitario || '');
        } else {
            setEditingId(null);
            setNome(''); setTipo('materia_prima'); setQuantidade(''); setEstoqueMinimo(''); setUnidade('un'); setCustoUnitario('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!nome) return alert("Nome é obrigatório.");

        const payload = {
            nome,
            tipo,
            unidade,
            quantidade: p(quantidade),
            estoqueMinimo: p(estoqueMinimo),
            custoUnitario: p(custoUnitario),
            valorTotalEstoque: p(quantidade) * p(custoUnitario),
            updatedAt: new Date().toISOString()
        };

        const colRef = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`);
        
        try {
            if (editingId) {
                await colRef.doc(editingId).update(payload);
            } else {
                await colRef.add({ ...payload, createdAt: new Date().toISOString() });
            }
            setIsModalOpen(false);
        } catch (error) {
            alert("Erro ao salvar no estoque: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Deseja excluir este item do estoque? Produtos que usam este material poderão apresentar erros no cálculo.")) {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`).doc(id).delete();
        }
    };

    return (
        <div className="space-y-6 fade-in p-2 md:p-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-800">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <Icon name="layers" size={24} />
                        Gestão de Estoque
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Matérias-primas e produtos para pronta entrega</p>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="flex-1 md:w-64 bg-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-700 focus-within:border-indigo-500 transition-colors">
                        <Icon name="search" size={16} className="text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar item..." className="bg-transparent border-none text-white text-xs outline-none w-full placeholder-slate-500" />
                    </div>
                    <button onClick={() => openModal()} className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[11px] shadow transition-colors flex items-center justify-center gap-2 shrink-0">
                        <Icon name="plus" size={14} /> Novo Item
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400 font-black uppercase text-sm"><Icon name="loader" className="animate-spin inline mr-2" /> Carregando Estoque...</div>
            ) : itens.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center bg-slate-50/50">
                    <Icon name="archive" size={48} className="text-slate-300 mb-3" />
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Estoque Vazio</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2">Cadastre os seus filamentos, argolas, caixas, etc.</p>
                </div>
            ) : (
                <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
                            <tr>
                                <th className="p-4">Item</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4 text-center">Qtd Atual</th>
                                <th className="p-4 text-right">Custo Unid.</th>
                                <th className="p-4 text-right">Total Estocado</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                            {itensFiltrados.map(item => {
                                const statusBaixo = item.estoqueMinimo > 0 && item.quantidade <= item.estoqueMinimo;
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tipo === 'materia_prima' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    <Icon name={item.tipo === 'materia_prima' ? 'box' : 'package'} size={14} />
                                                </div>
                                                <span className="font-black text-slate-800">{item.nome}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${item.tipo === 'materia_prima' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                {item.tipo === 'materia_prima' ? 'Matéria-Prima' : 'Produto Final'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[11px] font-black ${statusBaixo ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {item.quantidade} <span className="text-[9px] uppercase">{item.unidade}</span>
                                            </span>
                                            {statusBaixo && <span className="block text-[8px] text-red-500 uppercase mt-1">Estoque Baixo</span>}
                                        </td>
                                        <td className="p-4 text-right text-slate-500">{formatMoney(item.custoUnitario)} <span className="text-[9px]">/{item.unidade}</span></td>
                                        <td className="p-4 text-right text-indigo-600 font-black">{formatMoney(item.valorTotalEstoque)}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Icon name="edit" size={14} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Icon name="trash" size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col scale-up-center overflow-hidden">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                                <Icon name="layers" size={18} className="text-indigo-500" />
                                {editingId ? 'Editar Estoque' : 'Novo Item no Estoque'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="p-6 bg-white space-y-4">
                            <form id="estoqueForm" onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">O que você está cadastrando? *</label>
                                    <div className="flex gap-2">
                                        <label className={`flex-1 p-3 border rounded-xl cursor-pointer transition-colors flex flex-col items-center gap-1 ${tipo === 'materia_prima' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'}`}>
                                            <input type="radio" name="tipo" value="materia_prima" checked={tipo === 'materia_prima'} onChange={(e) => setTipo(e.target.value)} className="hidden" />
                                            <Icon name="box" size={16} />
                                            <span className="text-[10px] font-black uppercase">Matéria-Prima</span>
                                        </label>
                                        <label className={`flex-1 p-3 border rounded-xl cursor-pointer transition-colors flex flex-col items-center gap-1 ${tipo === 'produto_acabado' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                                            <input type="radio" name="tipo" value="produto_acabado" checked={tipo === 'produto_acabado'} onChange={(e) => setTipo(e.target.value)} className="hidden" />
                                            <Icon name="package" size={16} />
                                            <span className="text-[10px] font-black uppercase">Produto Físico</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Nome do Item *</label>
                                    <input type="text" required value={nome} onChange={e=>setNome(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" placeholder={tipo === 'materia_prima' ? "Ex: Filamento PETG Preto" : "Ex: Chaveiro Aluá 3D"} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Qtd Atual</label>
                                        <input type="number" step="0.01" required value={quantidade} onChange={e=>setQuantidade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500" placeholder="Ex: 1000" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Unid. de Medida</label>
                                        <select value={unidade} onChange={e=>setUnidade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500">
                                            <option value="g">Gramas (g)</option>
                                            <option value="kg">Quilos (kg)</option>
                                            <option value="un">Unidades (un)</option>
                                            <option value="m">Metros (m)</option>
                                            <option value="cm">Centímetros (cm)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Custo Unitário (R$)</label>
                                        <input type="number" step="0.0001" required value={custoUnitario} onChange={e=>setCustoUnitario(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500" placeholder={`Ex: 0.10 por ${unidade}`} title={`Custo por 1 ${unidade}`} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Alerta Estoque Baixo</label>
                                        <input type="number" step="0.01" value={estoqueMinimo} onChange={e=>setEstoqueMinimo(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-amber-500" placeholder="Avisar quando chegar a..." />
                                    </div>
                                </div>
                                
                                {quantidade && custoUnitario && (
                                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex justify-between items-center mt-2">
                                        <span className="text-[10px] font-black text-indigo-700 uppercase">Valor Total Imobilizado:</span>
                                        <span className="font-black text-indigo-600">{formatMoney(p(quantidade) * p(custoUnitario))}</span>
                                    </div>
                                )}
                            </form>
                        </div>
                        
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-black uppercase text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" form="estoqueForm" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition-all flex items-center gap-2">
                                <Icon name="save" size={14} /> Salvar Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}