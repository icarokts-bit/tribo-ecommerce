import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

export default function CustosProdutos({ user, permissoes, donoUid: propDonoUid }) {
    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;

    const [fichas, setFichas] = useState([]);
    const [estoqueInsumos, setEstoqueInsumos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    // Modais
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Tarifas padrão salvas no banco
    const [configTaxas, setConfigTaxas] = useState({
        tarifaKwh: 0.95,
        potenciaMediaWatts: 180,
        custoHoraMaquina: 1.20,
        custoHoraMaoDeObra: 25.00,
        taxaFalhaPadrao: 5
    });

    // Formulário da Ficha (Tempo em Minutos com conversão automática para Horas)
    const [formData, setFormData] = useState({
        nome: '',
        precoVenda: '',
        peso: 0.300,
        comprimento: 20,
        largura: 15,
        altura: 10,
        tempoTotalMaquinaMinutos: 0,
        potenciaWatts: 180,
        tarifaKwh: 0.95,
        custoHoraMaquina: 1.20,
        tempoManualMinutos: 0,
        custoHoraMaoDeObra: 25.00,
        taxaFalhaPerc: 5,
        embalagemCusto: 0,
        ingredientes: []
    });

    // Campos temporários para adicionar Insumo / Filamento
    const [insumoSelectId, setInsumoSelectId] = useState('');
    const [ingNome, setIngNome] = useState('');
    const [ingUnidade, setIngUnidade] = useState('g_kg');
    const [ingQtdUsada, setIngQtdUsada] = useState('');
    const [ingCustoUnitario, setIngCustoUnitario] = useState('');

    useEffect(() => {
        if (!donoUid) return;

        db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cost_rates`).get().then(doc => {
            if (doc.exists) {
                setConfigTaxas(prev => ({ ...prev, ...doc.data() }));
            }
        });

        db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`).get().then(snap => {
            setEstoqueInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }).catch(() => {});

        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`)
            .onSnapshot(snap => {
                setFichas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            }, () => setLoading(false));

        return () => unsub();
    }, [donoUid]);

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Converte minutos para texto claro: Ex: 40 -> "40 min (0.67h)" | 150 -> "2h 30min (2.50h)"
    const formatarMinutosParaTexto = (totalMin) => {
        const minNum = Number(totalMin || 0);
        if (minNum <= 0) return '0 min (0h)';
        const h = Math.floor(minNum / 60);
        const m = Math.round(minNum % 60);
        const dec = (minNum / 60).toFixed(2);
        if (h > 0 && m > 0) return `${h}h ${m}min (${dec}h)`;
        if (h > 0) return `${h}h (${dec}h)`;
        return `${m} min (${dec}h)`;
    };

    const handleSalvarConfigTaxas = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cost_rates`).set(configTaxas, { merge: true });
            setIsConfigOpen(false);
            alert("Tarifas padrão salvas com sucesso!");
        } catch (err) {
            alert("Erro ao salvar tarifas.");
        }
    };

    const abrirModalNovaFicha = (ficha = null) => {
        if (ficha) {
            setEditingId(ficha.id);
            const minutosConvertidos = ficha.tempoTotalMaquinaMinutos !== undefined
                ? Number(ficha.tempoTotalMaquinaMinutos)
                : (Number(ficha.tempoMaquinaHoras || 0) * 60) + Number(ficha.tempoMaquinaMinutos || 0);

            setFormData({
                nome: ficha.nome || ficha.name || '',
                precoVenda: ficha.precoVenda || ficha.price || 0,
                peso: ficha.peso ?? 0.300,
                comprimento: ficha.comprimento ?? 20,
                largura: ficha.largura ?? 15,
                altura: ficha.altura ?? 10,
                tempoTotalMaquinaMinutos: minutosConvertidos,
                potenciaWatts: ficha.potenciaWatts ?? configTaxas.potenciaMediaWatts,
                tarifaKwh: ficha.tarifaKwh ?? configTaxas.tarifaKwh,
                custoHoraMaquina: ficha.custoHoraMaquina ?? configTaxas.custoHoraMaquina,
                tempoManualMinutos: ficha.tempoManualMinutos ?? 0,
                custoHoraMaoDeObra: ficha.custoHoraMaoDeObra ?? configTaxas.custoHoraMaoDeObra,
                taxaFalhaPerc: ficha.taxaFalhaPerc ?? configTaxas.taxaFalhaPadrao,
                embalagemCusto: ficha.embalagemCusto ?? 0,
                ingredientes: Array.isArray(ficha.ingredientes) ? ficha.ingredientes : []
            });
        } else {
            setEditingId(null);
            setFormData({
                nome: '',
                precoVenda: '',
                peso: 0.300,
                comprimento: 20,
                largura: 15,
                altura: 10,
                tempoTotalMaquinaMinutos: 0,
                potenciaWatts: configTaxas.potenciaMediaWatts,
                tarifaKwh: configTaxas.tarifaKwh,
                custoHoraMaquina: configTaxas.custoHoraMaquina,
                tempoManualMinutos: 0,
                custoHoraMaoDeObra: configTaxas.custoHoraMaoDeObra,
                taxaFalhaPerc: configTaxas.taxaFalhaPadrao,
                embalagemCusto: 0,
                ingredientes: []
            });
        }
        setInsumoSelectId('');
        setIngNome('');
        setIngUnidade('g_kg');
        setIngQtdUsada('');
        setIngCustoUnitario('');
        setIsModalOpen(true);
    };

    const handleSelecionarInsumoEstoque = (e) => {
        const id = e.target.value;
        setInsumoSelectId(id);
        if (!id) return;
        const item = estoqueInsumos.find(i => i.id === id);
        if (item) {
            setIngNome(item.nome || item.name || '');
            setIngUnidade(item.unidade || 'un');
            setIngCustoUnitario(item.custoUnitario || item.precoCusto || '');
        }
    };

    const handleAdicionarIngrediente = () => {
        if (!ingNome.trim() || !ingQtdUsada) return alert("Preencha o nome do material/insumo e a quantidade usada.");
        const qtd = Number(ingQtdUsada || 0);
        const valorInformado = Number(ingCustoUnitario || 0);

        const custoFinalItem = ingUnidade === 'g_kg'
            ? (valorInformado / 1000) * qtd
            : valorInformado * qtd;

        const novoIng = {
            id: crypto.randomUUID(),
            nome: ingNome.trim(),
            unidade: ingUnidade === 'g_kg' ? 'g' : ingUnidade,
            qtd: qtd,
            custoBaseInformado: valorInformado,
            modoCalculo: ingUnidade,
            custoTotal: Number(custoFinalItem.toFixed(4))
        };

        setFormData(prev => ({
            ...prev,
            ingredientes: [...prev.ingredientes, novoIng]
        }));
        setInsumoSelectId('');
        setIngNome('');
        setIngQtdUsada('');
        setIngCustoUnitario('');
    };

    const removerIngrediente = (id) => {
        setFormData(prev => ({
            ...prev,
            ingredientes: prev.ingredientes.filter(i => i.id !== id)
        }));
    };

    // Cálculo automático em tempo real convertendo Minutos -> Horas
    const resumoCalculado = useMemo(() => {
        const custoMateriais = formData.ingredientes.reduce((acc, i) => acc + Number(i.custoTotal || 0), 0);

        const minutosMaquina = Number(formData.tempoTotalMaquinaMinutos || 0);
        const horasTotaisMaquina = minutosMaquina / 60;

        const consumoKwh = (Number(formData.potenciaWatts || 0) / 1000) * horasTotaisMaquina;
        const custoEnergia = consumoKwh * Number(formData.tarifaKwh || 0);
        const custoDepreciacaoMaquina = horasTotaisMaquina * Number(formData.custoHoraMaquina || 0);

        const horasManuais = Number(formData.tempoManualMinutos || 0) / 60;
        const custoMaoDeObra = horasManuais * Number(formData.custoHoraMaoDeObra || 0);
        const custoEmbalagem = Number(formData.embalagemCusto || 0);

        const subtotalProducao = custoMateriais + custoEnergia + custoDepreciacaoMaquina + custoMaoDeObra + custoEmbalagem;
        const baseRisco = custoMateriais + custoEnergia + custoDepreciacaoMaquina;
        const custoTaxaFalha = baseRisco * (Number(formData.taxaFalhaPerc || 0) / 100);

        const custoTotalProducao = subtotalProducao + custoTaxaFalha;
        const venda = Number(formData.precoVenda || 0);
        const lucroBruto = venda - custoTotalProducao;
        const margemPerc = venda > 0 ? (lucroBruto / venda) * 100 : 0;

        return {
            custoMateriais,
            minutosMaquina,
            horasTotaisMaquina,
            consumoKwh,
            custoEnergia,
            custoDepreciacaoMaquina,
            custoMaoDeObra,
            custoEmbalagem,
            custoTaxaFalha,
            custoTotalProducao,
            venda,
            lucroBruto,
            margemPerc
        };
    }, [formData]);

    const handleSalvarFicha = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        if (!formData.nome.trim()) return alert("Informe o nome do produto.");

        setSaving(true);
        try {
            const idDoc = editingId || crypto.randomUUID();
            const minTotais = Number(formData.tempoTotalMaquinaMinutos || 0);

            const payload = {
                id: idDoc,
                ...formData,
                nome: formData.nome.trim(),
                precoVenda: Number(formData.precoVenda || 0),
                tempoTotalMaquinaMinutos: minTotais,
                tempoMaquinaHoras: Math.floor(minTotais / 60),
                tempoMaquinaMinutos: Math.round(minTotais % 60),
                peso: Number(formData.peso || 0),
                comprimento: Number(formData.comprimento || 0),
                largura: Number(formData.largura || 0),
                altura: Number(formData.altura || 0),
                custoMateriais: Number(resumoCalculado.custoMateriais.toFixed(2)),
                custoEnergia: Number(resumoCalculado.custoEnergia.toFixed(2)),
                custoMaquina: Number(resumoCalculado.custoDepreciacaoMaquina.toFixed(2)),
                custoMaoDeObra: Number(resumoCalculado.custoMaoDeObra.toFixed(2)),
                custoFalha: Number(resumoCalculado.custoTaxaFalha.toFixed(2)),
                custoTotal: Number(resumoCalculado.custoTotalProducao.toFixed(2)),
                lucroBruto: Number(resumoCalculado.lucroBruto.toFixed(2)),
                margemLucro: Number(resumoCalculado.margemPerc.toFixed(1)),
                updatedAt: new Date().toISOString()
            };

            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).doc(idDoc).set(payload, { merge: true });
            setIsModalOpen(false);
        } catch (err) {
            alert("Erro ao salvar ficha de custos.");
        }
        setSaving(false);
    };

    const handleExcluirFicha = async (id) => {
        if (!window.confirm("Deseja remover esta ficha de custos?")) return;
        try {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).doc(id).delete();
        } catch (err) {}
    };

    const fichasFiltradas = fichas.filter(f => (f.nome || '').toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100 text-slate-800">
            
            {/* CABEÇALHO */}
            <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Icon name="pie-chart" size={22} />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-base md:text-lg uppercase tracking-wider leading-none">
                            Engenharia & Fichas de Custos
                        </h1>
                        <span className="text-xs font-bold text-slate-400">
                            Matéria-Prima, Energia (kWh), Hora-Máquina, Mão de Obra e Embalagem
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 cursor-pointer"
                    >
                        <Icon name="settings" size={15} /> Configurar Tarifas (kWh / Hora)
                    </button>

                    <button
                        onClick={() => abrirModalNovaFicha()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                        <Icon name="plus" size={16} /> + Nova Ficha de Custos
                    </button>
                </div>
            </header>

            {/* CARDS RESUMO DAS TARIFAS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-amber-600 block">Tarifa de Energia</span>
                    <span className="text-lg font-black text-slate-800">{formatMoney(configTaxas.tarifaKwh)} / kWh</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Potência: {configTaxas.potenciaMediaWatts}W</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-blue-600 block">Hora-Máquina</span>
                    <span className="text-lg font-black text-slate-800">{formatMoney(configTaxas.custoHoraMaquina)} / hora</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Depreciação + Manutenção</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-purple-600 block">Mão de Obra</span>
                    <span className="text-lg font-black text-slate-800">{formatMoney(configTaxas.custoHoraMaoDeObra)} / hora</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Acabamento e montagem</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-rose-600 block">Taxa de Falha</span>
                    <span className="text-lg font-black text-slate-800">{configTaxas.taxaFalhaPadrao}% padrão</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Segurança contra perdas</span>
                </div>
            </div>

            {/* TABELA DE FICHAS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <input
                        type="text"
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        placeholder="Buscar produto na ficha de custos..."
                        className="w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="p-4">Produto</th>
                                <th className="p-4 text-center">Tempo Máq.</th>
                                <th className="p-4 text-right">Materiais</th>
                                <th className="p-4 text-right">Energia + Máq.</th>
                                <th className="p-4 text-right">Mão de Obra</th>
                                <th className="p-4 text-right">Custo Total</th>
                                <th className="p-4 text-right">Preço Venda</th>
                                <th className="p-4 text-center">Lucro Bruto</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="9" className="p-10 text-center text-xs font-bold text-slate-400">Carregando...</td></tr>
                            ) : fichasFiltradas.length === 0 ? (
                                <tr><td colSpan="9" className="p-12 text-center text-xs font-black uppercase text-slate-400">Nenhuma ficha cadastrada.</td></tr>
                            ) : (
                                fichasFiltradas.map(f => {
                                    const energiaMaisMaq = Number(f.custoEnergia || 0) + Number(f.custoMaquina || 0) + Number(f.custoFalha || 0);
                                    const minSalvos = f.tempoTotalMaquinaMinutos !== undefined
                                        ? Number(f.tempoTotalMaquinaMinutos)
                                        : (Number(f.tempoMaquinaHoras || 0) * 60) + Number(f.tempoMaquinaMinutos || 0);

                                    return (
                                        <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/80 text-xs">
                                            <td className="p-4 font-black text-slate-800">{f.nome}</td>
                                            <td className="p-4 text-center font-bold text-slate-500">{formatarMinutosParaTexto(minSalvos)}</td>
                                            <td className="p-4 text-right font-bold text-slate-600">{formatMoney(f.custoMateriais)}</td>
                                            <td className="p-4 text-right font-bold text-amber-700">{formatMoney(energiaMaisMaq)}</td>
                                            <td className="p-4 text-right font-bold text-purple-700">{formatMoney(f.custoMaoDeObra)}</td>
                                            <td className="p-4 text-right font-black text-rose-600">{formatMoney(f.custoTotal)}</td>
                                            <td className="p-4 text-right font-black text-emerald-600">{formatMoney(f.precoVenda)}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2.5 py-1 rounded-full text-[10px]">
                                                    {formatMoney(f.lucroBruto)} ({Number(f.margemLucro || 0).toFixed(0)}%)
                                                </span>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <button onClick={() => abrirModalNovaFicha(f)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"><Icon name="edit" size={16} /></button>
                                                <button onClick={() => handleExcluirFicha(f.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Icon name="trash-2" size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: CRIAR / EDITAR FICHA DE CUSTOS */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                        
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Icon name="pie-chart" size={20} className="text-indigo-600" />
                                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">
                                    {editingId ? 'Editar Ficha de Custos' : 'Nova Ficha de Custos'}
                                </h3>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 text-xl cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSalvarFicha} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                                
                                {/* COLUNA ESQUERDA */}
                                <div className="lg:col-span-6 space-y-5">
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-2">
                                            1. Info Base do Produto
                                        </span>
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-700 block mb-1">Nome do Produto *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.nome}
                                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                                placeholder="Ex: Display NFC Google Review"
                                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-indigo-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-700 block mb-1">Preço de Venda Praticado (R$) *</label>
                                            <input
                                                type="number"
                                                step="any"
                                                required
                                                value={formData.precoVenda}
                                                onChange={e => setFormData({ ...formData, precoVenda: e.target.value })}
                                                placeholder="Ex: 49.90"
                                                className="w-full p-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-base font-black text-emerald-800 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* BLOCO DE TEMPO EM MINUTOS + ENERGIA */}
                                    <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 space-y-4">
                                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                            <span className="text-xs font-black uppercase text-indigo-800 tracking-wider">
                                                ⚡ 2. Tempo em Minutos, Energia & Máquina
                                            </span>
                                            <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                                Minutos → Horas
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                            <div className="sm:col-span-6">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-black uppercase text-indigo-900">
                                                        Tempo de Máquina (Minutos)
                                                    </label>
                                                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                                        = {formatarMinutosParaTexto(formData.tempoTotalMaquinaMinutos)}
                                                    </span>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    value={formData.tempoTotalMaquinaMinutos}
                                                    onChange={e => setFormData({ ...formData, tempoTotalMaquinaMinutos: e.target.value })}
                                                    placeholder="Ex: 40 (p/ 40 min) ou 150 (p/ 2h30)"
                                                    className="w-full p-2.5 bg-white border-2 border-indigo-300 focus:border-indigo-600 rounded-xl text-sm font-black text-slate-900 outline-none"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Potência (Watts)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.potenciaWatts}
                                                    onChange={e => setFormData({ ...formData, potenciaWatts: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Tarifa (R$/kWh)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.tarifaKwh}
                                                    onChange={e => setFormData({ ...formData, tarifaKwh: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end pt-1">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-blue-700 block mb-1">Hora-Máq. (R$/h)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.custoHoraMaquina}
                                                    onChange={e => setFormData({ ...formData, custoHoraMaquina: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-purple-700 block mb-1">Mão Obra (Min)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    value={formData.tempoManualMinutos}
                                                    onChange={e => setFormData({ ...formData, tempoManualMinutos: e.target.value })}
                                                    placeholder="Ex: 10"
                                                    className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs font-black text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-purple-700 block mb-1">Valor Hora (R$/h)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.custoHoraMaoDeObra}
                                                    onChange={e => setFormData({ ...formData, custoHoraMaoDeObra: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-rose-600 block mb-1">Taxa Falha (%)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.taxaFalhaPerc}
                                                    onChange={e => setFormData({ ...formData, taxaFalhaPerc: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-white/90 rounded-xl p-3 border border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                                            <div>
                                                <span className="text-slate-400 font-bold block">⚡ Energia ({resumoCalculado.consumoKwh.toFixed(2)} kWh)</span>
                                                <strong className="text-amber-600 font-black">{formatMoney(resumoCalculado.custoEnergia)}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold block">⚙️ Desgaste Máq.</span>
                                                <strong className="text-blue-600 font-black">{formatMoney(resumoCalculado.custoDepreciacaoMaquina)}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold block">🛠️ Mão de Obra</span>
                                                <strong className="text-purple-600 font-black">{formatMoney(resumoCalculado.custoMaoDeObra)}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold block">⚠️ Risco Falha ({formData.taxaFalhaPerc}%)</span>
                                                <strong className="text-rose-600 font-black">{formatMoney(resumoCalculado.custoTaxaFalha)}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Caixa p/ Frete */}
                                    <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/30 space-y-3">
                                        <span className="text-xs font-black uppercase text-orange-800 tracking-wider block border-b border-orange-200/60 pb-2">
                                            3. Caixa p/ Frete e Custo de Embalagem
                                        </span>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Peso (kg)</label>
                                                <input type="number" step="any" value={formData.peso} onChange={e => setFormData({ ...formData, peso: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Comp. (cm)</label>
                                                <input type="number" step="any" value={formData.comprimento} onChange={e => setFormData({ ...formData, comprimento: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Larg. (cm)</label>
                                                <input type="number" step="any" value={formData.largura} onChange={e => setFormData({ ...formData, largura: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Alt. (cm)</label>
                                                <input type="number" step="any" value={formData.altura} onChange={e => setFormData({ ...formData, altura: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-emerald-800 block mb-1">Custo Caixa (R$)</label>
                                                <input type="number" step="any" value={formData.embalagemCusto} onChange={e => setFormData({ ...formData, embalagemCusto: e.target.value })} placeholder="0,00" className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-center" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUNA DIREITA */}
                                <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                                                📦 4. Matéria-Prima, Filamento e Insumos
                                            </span>
                                            <span className="text-xs font-black text-slate-500">
                                                Subtotal: {formatMoney(resumoCalculado.custoMateriais)}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                                            {estoqueInsumos.length > 0 && (
                                                <select
                                                    value={insumoSelectId}
                                                    onChange={handleSelecionarInsumoEstoque}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="">Puxar insumo/filamento do Estoque (Opcional)...</option>
                                                    {estoqueInsumos.map(item => (
                                                        <option key={item.id} value={item.id}>{item.nome || item.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                                <div className="sm:col-span-5">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Material / Filamento</label>
                                                    <input
                                                        type="text"
                                                        value={ingNome}
                                                        onChange={e => setIngNome(e.target.value)}
                                                        placeholder="Ex: Filamento PETG, Tag NFC..."
                                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                                                    />
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Unidade</label>
                                                    <select
                                                        value={ingUnidade}
                                                        onChange={e => setIngUnidade(e.target.value)}
                                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                                                    >
                                                        <option value="g_kg">Gramas (Informar R$/Kg)</option>
                                                        <option value="un">Unidade (R$/un)</option>
                                                        <option value="g">Gramas (R$/g)</option>
                                                        <option value="ml">Mililitros (R$/ml)</option>
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                                                        {ingUnidade.startsWith('g') ? 'Peso (g)' : 'Qtd'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={ingQtdUsada}
                                                        onChange={e => setIngQtdUsada(e.target.value)}
                                                        placeholder="30"
                                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                                                        {ingUnidade === 'g_kg' ? 'Preço 1Kg' : 'Custo Un.'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={ingCustoUnitario}
                                                        onChange={e => setIngCustoUnitario(e.target.value)}
                                                        placeholder={ingUnidade === 'g_kg' ? '95.00' : '1.50'}
                                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleAdicionarIngrediente}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs uppercase cursor-pointer"
                                            >
                                                + Adicionar Material / Insumo na Ficha
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1">
                                            {formData.ingredientes.length === 0 ? (
                                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-xs font-bold text-slate-400">
                                                    Nenhum material adicionado.
                                                </div>
                                            ) : (
                                                formData.ingredientes.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                                                        <div>
                                                            <span className="font-black text-slate-800">{item.nome}</span>
                                                            <span className="text-slate-400 font-bold ml-2">({item.qtd}{item.unidade})</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-rose-600">{formatMoney(item.custoTotal)}</span>
                                                            <button type="button" onClick={() => removerIngrediente(item.id)} className="text-red-400 hover:text-red-600 font-black">✕</button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* PAINEL ESCURO DE LUCRO */}
                                    <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
                                        <div className="space-y-1 text-xs border-b border-slate-800 pb-3">
                                            <div className="flex justify-between text-slate-400 font-bold">
                                                <span>Matéria-Prima / Filamento / Insumos:</span>
                                                <span>{formatMoney(resumoCalculado.custoMateriais)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 font-bold">
                                                <span>Energia Elétrica ({resumoCalculado.consumoKwh.toFixed(2)} kWh) + Hora-Máquina:</span>
                                                <span>{formatMoney(resumoCalculado.custoEnergia + resumoCalculado.custoDepreciacaoMaquina)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400 font-bold">
                                                <span>Mão de Obra + Embalagem + Taxa de Falha ({formData.taxaFalhaPerc}%):</span>
                                                <span>{formatMoney(resumoCalculado.custoMaoDeObra + resumoCalculado.custoEmbalagem + resumoCalculado.custoTaxaFalha)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                                            <span className="text-slate-400">Custo de Produção Total</span>
                                            <span className="text-rose-400 text-base">-{formatMoney(resumoCalculado.custoTotalProducao)}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider border-b border-slate-800 pb-3">
                                            <span className="text-slate-400">Venda Projetada</span>
                                            <span className="text-emerald-400 text-base">{formatMoney(resumoCalculado.venda)}</span>
                                        </div>

                                        <div className="flex justify-between items-center pt-1">
                                            <span className="font-black text-sm uppercase tracking-wider">Margem de Lucro Líquido</span>
                                            <div className="text-right">
                                                <span className={`text-2xl font-black block leading-none ${resumoCalculado.lucroBruto >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                    {formatMoney(resumoCalculado.lucroBruto)}
                                                </span>
                                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase">
                                                    {resumoCalculado.margemPerc.toFixed(1)}% Lucro
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-7 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase shadow-md flex items-center gap-2 cursor-pointer"
                                >
                                    <Icon name="save" size={16} />
                                    {saving ? 'Salvando...' : 'Salvar Custos'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CONFIGURAR TARIFAS PADRÃO */}
            {isConfigOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-base uppercase">Tarifas Padrão de Produção</h3>
                                <span className="text-xs text-slate-400">Preenchidas automaticamente em novas fichas</span>
                            </div>
                            <button type="button" onClick={() => setIsConfigOpen(false)} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>

                        <form onSubmit={handleSalvarConfigTaxas} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Tarifa Energia (R$/kWh)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={configTaxas.tarifaKwh}
                                        onChange={e => setConfigTaxas({ ...configTaxas, tarifaKwh: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Potência Média (Watts)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={configTaxas.potenciaMediaWatts}
                                        onChange={e => setConfigTaxas({ ...configTaxas, potenciaMediaWatts: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Hora-Máquina (R$/h)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={configTaxas.custoHoraMaquina}
                                        onChange={e => setConfigTaxas({ ...configTaxas, custoHoraMaquina: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Mão de Obra (R$/h)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={configTaxas.custoHoraMaoDeObra}
                                        onChange={e => setConfigTaxas({ ...configTaxas, custoHoraMaoDeObra: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-black uppercase text-slate-600 block mb-1">Margem de Segurança / Falha (%)</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={configTaxas.taxaFalhaPadrao}
                                    onChange={e => setConfigTaxas({ ...configTaxas, taxaFalhaPadrao: Number(e.target.value) })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setIsConfigOpen(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase">Salvar Padrão</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}