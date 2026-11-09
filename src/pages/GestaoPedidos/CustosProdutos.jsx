import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/Icon';
import { db } from '../../firebase';

export default function CustosProdutos({ donoUid, formatMoney: globalFormatMoney }) {
    const formatMoney = globalFormatMoney || ((val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    const p = (val) => Number(val || 0);

    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [nome, setNome] = useState('');
    const [precoVenda, setPrecoVenda] = useState('');
    const [peso, setPeso] = useState(''); 
    const [largura, setLargura] = useState(''); 
    const [altura, setAltura] = useState(''); 
    const [comprimento, setComprimento] = useState(''); 

    const [componentes, setComponentes] = useState([]);

    useEffect(() => {
        if (!donoUid) return;
        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`)
            .onSnapshot(snap => {
                setProdutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
        return () => unsub();
    }, [donoUid]);

    const custoTotalProduto = useMemo(() => {
        return componentes.reduce((acc, comp) => acc + (p(comp.custoUnitario) * p(comp.quantidade)), 0);
    }, [componentes]);

    const margemLucro = p(precoVenda) > 0 ? ((p(precoVenda) - custoTotalProduto) / p(precoVenda)) * 100 : 0;
    const lucroReais = p(precoVenda) - custoTotalProduto;

    const addComponente = () => {
        setComponentes([...componentes, { id: Date.now(), nome: '', custoUnitario: '', quantidade: 1 }]);
    };

    const updateComponente = (id, field, value) => {
        setComponentes(componentes.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeComponente = (id) => {
        setComponentes(componentes.filter(c => c.id !== id));
    };

    const openModal = (prod = null) => {
        if (prod) {
            setEditingId(prod.id);
            setNome(prod.nome || '');
            setPrecoVenda(prod.precoVenda || '');
            setPeso(prod.peso || '');
            setLargura(prod.largura || '');
            setAltura(prod.altura || '');
            setComprimento(prod.comprimento || '');
            setComponentes(prod.componentes || []);
        } else {
            setEditingId(null);
            setNome(''); setPrecoVenda(''); setPeso(''); setLargura(''); setAltura(''); setComprimento('');
            setComponentes([]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!nome || !precoVenda) return alert("Nome e Preço de Venda são obrigatórios.");

        const payload = {
            nome, 
            precoVenda: p(precoVenda),
            peso: p(peso), largura: p(largura), altura: p(altura), comprimento: p(comprimento),
            componentes,
            custoTotal: custoTotalProduto,
            updatedAt: new Date().toISOString()
        };

        const colRef = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`);
        
        try {
            if (editingId) {
                await colRef.doc(editingId).update(payload);
            } else {
                await colRef.add({ ...payload, createdAt: new Date().toISOString() });
            }
            setIsModalOpen(false);
        } catch (error) {
            alert("Erro ao salvar custos: " + error.message);
        }
    };

    return (
        <div className="space-y-6 fade-in p-2 md:p-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-800">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <Icon name="pie-chart" size={24} />
                        Custos de Produtos
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Ficha técnica, margem de lucro e logística</p>
                </div>
                <button onClick={() => openModal()} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[11px] shadow transition-colors flex items-center justify-center gap-2">
                    <Icon name="plus" size={14} /> Nova Ficha
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400 font-black uppercase text-sm"><Icon name="loader" className="animate-spin inline mr-2" /> Carregando Custos...</div>
            ) : produtos.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center bg-slate-50/50">
                    <Icon name="pie-chart" size={48} className="text-slate-300 mb-3" />
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Nenhum custo registado</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2">Clique em "Nova Ficha" para simular a sua margem de lucro.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {produtos.map(prod => (
                        <div key={prod.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col p-4">
                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                <h3 className="font-black text-slate-800 text-sm leading-tight flex-1 pr-2">{prod.nome}</h3>
                                <button onClick={() => openModal(prod)} className="bg-slate-100 text-blue-600 p-1.5 rounded-lg shadow-sm hover:bg-blue-50 transition-colors shrink-0"><Icon name="edit" size={14} /></button>
                            </div>
                            
                            {prod.peso > 0 && (
                                <div className="mb-3 bg-orange-50 text-orange-800 text-[10px] font-bold p-2 rounded-lg flex items-center gap-2 border border-orange-100">
                                    <Icon name="truck" size={12}/> {prod.peso}kg | {prod.comprimento}x{prod.largura}x{prod.altura}cm
                                </div>
                            )}
                            
                            <div className="mt-auto space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-400 uppercase">Custo de Produção</span>
                                    <span className="text-red-500 font-black">{formatMoney(prod.custoTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-400 uppercase">Preço de Venda</span>
                                    <span className="text-emerald-600 text-sm font-black">{formatMoney(prod.precoVenda)}</span>
                                </div>
                                
                                {prod.precoVenda > 0 && (
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase">Lucro Líquido Bruto</span>
                                        <span className={`text-xs font-black px-2 py-1 rounded ${((prod.precoVenda - prod.custoTotal) / prod.precoVenda) * 100 >= 40 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {formatMoney(prod.precoVenda - prod.custoTotal)} ({(((prod.precoVenda - (prod.custoTotal||0)) / prod.precoVenda) * 100).toFixed(0)}%)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col scale-up-center overflow-hidden">
                        
                        <div className="p-4 md:p-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                                <Icon name="pie-chart" size={18} className="text-indigo-500" />
                                {editingId ? 'Editar Ficha de Custos' : 'Nova Ficha de Custos'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Icon name="x" size={24} /></button>
                        </div>

                        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-100">
                            <form id="costForm" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5"><Icon name="info" size={12}/> Info Base</h4>
                                        
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Nome do Produto *</label>
                                            <input type="text" required value={nome} onChange={e=>setNome(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-indigo-500 text-slate-800" placeholder="Ex: Display NFC Google Review" />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Preço de Venda Praticado (R$) *</label>
                                            <input type="number" step="0.01" required value={precoVenda} onChange={e=>setPrecoVenda(e.target.value)} className="w-full p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-black text-sm outline-none focus:border-emerald-500" placeholder="Ex: 49.90" />
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm space-y-3">
                                        <h4 className="text-[10px] font-black uppercase text-orange-800 border-b border-orange-200 pb-2 flex items-center gap-1.5"><Icon name="truck" size={12}/> Caixa p/ Frete (Melhor Envio)</h4>
                                        <p className="text-[9px] font-bold text-orange-600">Insira as medidas do produto já embalado pronto para envio.</p>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-orange-800 block mb-1">Peso (Kg)</label>
                                                <input type="number" step="0.001" value={peso} onChange={e=>setPeso(e.target.value)} className="w-full p-2 bg-white border border-orange-200 rounded text-center font-black outline-none focus:border-orange-500 text-xs text-slate-700" placeholder="0.300" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-orange-800 block mb-1">Comp. (cm)</label>
                                                <input type="number" value={comprimento} onChange={e=>setComprimento(e.target.value)} className="w-full p-2 bg-white border border-orange-200 rounded text-center font-black outline-none focus:border-orange-500 text-xs text-slate-700" placeholder="20" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-orange-800 block mb-1">Larg. (cm)</label>
                                                <input type="number" value={largura} onChange={e=>setLargura(e.target.value)} className="w-full p-2 bg-white border border-orange-200 rounded text-center font-black outline-none focus:border-orange-500 text-xs text-slate-700" placeholder="15" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-orange-800 block mb-1">Alt. (cm)</label>
                                                <input type="number" value={altura} onChange={e=>setAltura(e.target.value)} className="w-full p-2 bg-white border border-orange-200 rounded text-center font-black outline-none focus:border-orange-500 text-xs text-slate-700" placeholder="10" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 flex flex-col h-full">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                                            <h4 className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1.5"><Icon name="pie-chart" size={12}/> Ficha de Custos (Produção)</h4>
                                            <button type="button" onClick={addComponente} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded font-black text-[9px] uppercase border border-indigo-100 flex items-center gap-1 transition-colors">
                                                <Icon name="plus" size={10}/> Add Componente
                                            </button>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                                            {componentes.length === 0 ? (
                                                <div className="text-center py-6 text-slate-400 font-bold text-[10px] border border-dashed rounded-lg">
                                                    Nenhum custo adicionado. O lucro será de 100%.
                                                </div>
                                            ) : (
                                                componentes.map((c, index) => (
                                                    <div key={c.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 relative group">
                                                        <div className="w-8 flex-shrink-0 text-center text-[10px] font-black text-slate-300">{index + 1}</div>
                                                        <div className="flex-1">
                                                            <input type="text" value={c.nome} onChange={e => updateComponente(c.id, 'nome', e.target.value)} className="w-full bg-transparent outline-none font-bold text-xs text-slate-700 placeholder-slate-300" placeholder="Item (Ex: Filamento PETG)" />
                                                        </div>
                                                        <div className="w-16">
                                                            <label className="text-[7px] font-black text-slate-400 uppercase leading-none">Custo (R$)</label>
                                                            <input type="number" step="0.01" value={c.custoUnitario} onChange={e => updateComponente(c.id, 'custoUnitario', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1 text-center font-bold text-xs outline-none focus:border-indigo-400" placeholder="0.10" />
                                                        </div>
                                                        <div className="text-[10px] font-black text-slate-300">x</div>
                                                        <div className="w-14">
                                                            <label className="text-[7px] font-black text-slate-400 uppercase leading-none">Qtd</label>
                                                            <input type="number" step="0.01" value={c.quantidade} onChange={e => updateComponente(c.id, 'quantidade', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1 text-center font-bold text-xs outline-none focus:border-indigo-400" placeholder="100" />
                                                        </div>
                                                        <div className="w-16 text-right font-black text-red-500 text-xs flex-shrink-0 pt-3">
                                                            {formatMoney(p(c.custoUnitario) * p(c.quantidade))}
                                                        </div>
                                                        <button type="button" onClick={() => removeComponente(c.id)} className="absolute -right-2 -top-2 bg-red-100 text-red-500 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white shadow-sm">
                                                            <Icon name="x" size={10} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-inner mt-auto">
                                            <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Custo de Produção Base</span>
                                                <span className="font-black text-red-400 text-sm">-{formatMoney(custoTotalProduto)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Venda Projetada</span>
                                                <span className="font-black text-emerald-400 text-sm">{formatMoney(p(precoVenda))}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1">
                                                <span className="text-[11px] font-black text-white uppercase">Margem de Lucro Bruto</span>
                                                <div className="text-right flex flex-col items-end">
                                                    <span className={`font-black text-xl leading-none ${margemLucro >= 40 ? 'text-indigo-400' : margemLucro > 0 ? 'text-amber-400' : 'text-red-500'}`}>
                                                        {formatMoney(lucroReais)}
                                                    </span>
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded mt-1 ${margemLucro >= 40 ? 'bg-indigo-500/20 text-indigo-300' : margemLucro > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-400'}`}>
                                                        {margemLucro.toFixed(1)}% LUCRO
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" form="costForm" className="px-6 py-2.5 bg-slate-900 hover:bg-black text-[#F8CC82] text-xs font-black uppercase rounded-xl shadow-md transition-all flex items-center gap-2">
                                <Icon name="save" size={14} /> {editingId ? 'Atualizar' : 'Salvar'} Custos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}