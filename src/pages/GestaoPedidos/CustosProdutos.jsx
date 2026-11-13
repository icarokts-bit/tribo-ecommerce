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

    // Configurações Globais de Custos Operacionais (Salvas no Firebase para não precisar digitar toda vez)
    const [configTaxas, setConfigTaxas] = useState({
        tarifaKwh: 0.95,          // R$ por kWh na conta de luz
        potenciaMediaWatts: 180,  // Consumo médio em Watts da máquina/equipamento (ex: Impressora 3D CoreXY = ~180W)
        custoHoraMaquina: 1.20,   // R$/h de depreciação + manutenção (bicos, PEI, correias)
        custoHoraMaoDeObra: 25.00,// R$/h do operador (pós-processamento, montagem, embalagem)
        taxaFalhaPadrao: 5        // % de margem de perda / refugo
    });

    // Estado do Formulário da Ficha de Custos
    const [formData, setFormData] = useState({
        nome: '',
        precoVenda: '',
        peso: 0.300,
        comprimento: 20,
        largura: 15,
        altura: 10,
        // Parâmetros de Tempo, Energia e Operação
        tempoMaquinaHoras: 0,
        tempoMaquinaMinutos: 0,
        potenciaWatts: 180,
        tarifaKwh: 0.95,
        custoHoraMaquina: 1.20,
        tempoManualMinutos: 0,
        custoHoraMaoDeObra: 25.00,
        taxaFalhaPerc: 5,
        embalagemCusto: 0,
        // Lista de Materiais / Filamentos / Ingredientes
        ingredientes: []
    });

    // Campos temporários para adicionar Insumo / Filamento / Ingrediente
    const [insumoSelectId, setInsumoSelectId] = useState('');
    const [ingNome, setIngNome] = useState('');
    const [ingUnidade, setIngUnidade] = useState('g'); // g, un, ml, m
    const [ingQtdUsada, setIngQtdUsada] = useState('');
    const [ingCustoUnitario, setIngCustoUnitario] = useState(''); // Se for 'g', usuário pode informar preço do Kg

    useEffect(() => {
        if (!donoUid) return;

        // 1. Carrega Configurações Padrão de Energia e Hora
        db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cost_rates`).get().then(doc => {
            if (doc.exists) {
                setConfigTaxas(prev => ({ ...prev, ...doc.data() }));
            }
        });

        // 2. Carrega Insumos do Estoque (se houver)
        db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/estoque`).get().then(snap => {
            setEstoqueInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }).catch(() => {});

        // 3. Escuta as Fichas de Custo em tempo real
        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`)
            .onSnapshot(snap => {
                const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFichas(lista);
                setLoading(false);
            }, () => setLoading(false));

        return () => unsub();
    }, [donoUid]);

    const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Salva as tarifas globais padrão (Energia, Máquina, Mão de Obra)
    const handleSalvarConfigTaxas = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cost_rates`).set(configTaxas, { merge: true });
            setIsConfigOpen(false);
            alert("Tarifas padrão de Energia e Hora salvas com sucesso!");
        } catch (err) {
            alert("Erro ao salvar tarifas.");
        }
    };

    const abrirModalNovaFicha = (ficha = null) => {
        if (ficha) {
            setEditingId(ficha.id);
            setFormData({
                nome: ficha.nome || ficha.name || '',
                precoVenda: ficha.precoVenda || ficha.price || 0,
                peso: ficha.peso ?? 0.300,
                comprimento: ficha.comprimento ?? 20,
                largura: ficha.largura ?? 15,
                altura: ficha.altura ?? 10,
                tempoMaquinaHoras: ficha.tempoMaquinaHoras ?? 0,
                tempoMaquinaMinutos: ficha.tempoMaquinaMinutos ?? 0,
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
                tempoMaquinaHoras: 0,
                tempoMaquinaMinutos: 0,
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
        setIngUnidade('g');
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

        // Se a unidade for 'g' (gramas, ex: Filamento 3D) e o usuário digitou o preço do Quilo (ex: R$ 95,00/kg),
        // ou se escolheu 'g_kg', divide por 1000 automaticamente:
        let custoFinalItem = 0;
        if (ingUnidade === 'g_kg') {
            custoFinalItem = (valorInformado / 1000) * qtd;
        } else {
            custoFinalItem = valorInformado * qtd;
        }

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

    // =========================================================================
    // CÁLCULO AUTOMÁTICO EM TEMPO REAL DE TODOS OS CUSTOS (MATERIAIS + ENERGIA + HORA)
    // =========================================================================
    const resumoCalculado = useMemo(() => {
        // 1. Soma dos Materiais / Filamentos / Insumos (Tags NFC, argolas, etc.)
        const custoMateriais = formData.ingredientes.reduce((acc, i) => acc + Number(i.custoTotal || 0), 0);

        // 2. Tempo Total de Máquina em horas decimais
        const horasTotaisMaquina = Number(formData.tempoMaquinaHoras || 0) + (Number(formData.tempoMaquinaMinutos || 0) / 60);

        // 3. Custo de Energia Elétrica (kWh = (Watts / 1000) * Horas * Tarifa)
        const consumoKwh = (Number(formData.potenciaWatts || 0) / 1000) * horasTotaisMaquina;
        const custoEnergia = consumoKwh * Number(formData.tarifaKwh || 0);

        // 4. Custo de Hora-Máquina (Depreciação + Manutenção preventiva por hora)
        const custoDepreciacaoMaquina = horasTotaisMaquina * Number(formData.custoHoraMaquina || 0);

        // 5. Custo de Mão de Obra Manual (Pós-processamento, fatiamento, colagem, embalagem)
        const horasManuais = Number(formData.tempoManualMinutos || 0) / 60;
        const custoMaoDeObra = horasManuais * Number(formData.custoHoraMaoDeObra || 0);

        // 6. Embalagem Fixa
        const custoEmbalagem = Number(formData.embalagemCusto || 0);

        // Subtotal antes da taxa de falha
        const subtotalProducao = custoMateriais + custoEnergia + custoDepreciacaoMaquina + custoMaoDeObra + custoEmbalagem;

        // 7. Taxa de Falha / Refugo (aplicada sobre materiais + energia + máquina)
        const baseRisco = custoMateriais + custoEnergia + custoDepreciacaoMaquina;
        const custoTaxaFalha = baseRisco * (Number(formData.taxaFalhaPerc || 0) / 100);

        // CUSTO TOTAL FINAL DE PRODUÇÃO
        const custoTotalProducao = subtotalProducao + custoTaxaFalha;

        // Margem de Lucro
        const venda = Number(formData.precoVenda || 0);
        const lucroBruto = venda - custoTotalProducao;
        const margemPerc = venda > 0 ? (lucroBruto / venda) * 100 : 0;

        return {
            custoMateriais,
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
            const payload = {
                id: idDoc,
                ...formData,
                nome: formData.nome.trim(),
                precoVenda: Number(formData.precoVenda || 0),
                peso: Number(formData.peso || 0),
                comprimento: Number(formData.comprimento || 0),
                largura: Number(formData.largura || 0),
                altura: Number(formData.altura || 0),
                // Salva também os custos discriminados para relatórios
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
            console.error("Erro ao salvar ficha de custo:", err);
            alert("Erro ao salvar ficha de custos.");
        }
        setSaving(false);
    };

    const handleExcluirFicha = async (id) => {
        if (!window.confirm("Deseja remover esta ficha de custos?")) return;
        try {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).doc(id).delete();
        } catch (err) {
            console.error("Erro ao excluir:", err);
        }
    };

    const fichasFiltradas = fichas.filter(f =>
        (f.nome || '').toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100 text-slate-800">
            
            {/* CABEÇALHO DA PÁGINA DE CUSTOS */}
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
                            Cálculo completo: Matéria-Prima, Energia (kWh), Hora-Máquina, Mão de Obra e Embalagem
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                    >
                        <Icon name="settings" size={15} /> Configurar Tarifas (kWh / Hora)
                    </button>

                    <button
                        onClick={() => abrirModalNovaFicha()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                        <Icon name="plus" size={16} /> + Nova Ficha de Custos
                    </button>
                </div>
            </header>

            {/* RESUMO DAS TARIFAS ATUAIS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-amber-600 block">Tarifa de Energia (Luz)</span>
                    <span className="text-lg font-black text-slate-800">{formatMoney(configTaxas.tarifaKwh)} / kWh</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Potência base: {configTaxas.potenciaMediaWatts}W</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-blue-600 block">Hora-Máquina (Deprec.+Manut.)</span>
                    <span className="text-lg font-black text-slate-800">{formatMoney(configTaxas.custoHoraMaquina)} / hora</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Desgaste do equipamento</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-purple-600 block">Hora Mão de Obra</span>
                    <span className="text-lg font-black text-slate-800">{formatMoney(configTaxas.custoHoraMaoDeObra)} / hora</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Acabamento e montagem</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-rose-600 block">Margem de Falha / Refugo</span>
                    <span className="text-lg font-black text-slate-800">{configTaxas.taxaFalhaPadrao}% padrão</span>
                    <span className="text-[11px] text-slate-400 font-bold block">Segurança contra perdas</span>
                </div>
            </div>

            {/* TABELA DE FICHAS DE CUSTOS CADASTRADAS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar produto na ficha de custos..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                        />
                        <Icon name="search" size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    </div>
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
                                <tr><td colSpan="9" className="p-10 text-center text-xs font-bold text-slate-400">Carregando fichas...</td></tr>
                            ) : fichasFiltradas.length === 0 ? (
                                <tr><td colSpan="9" className="p-12 text-center text-xs font-black uppercase text-slate-400">Nenhuma ficha de custo cadastrada.</td></tr>
                            ) : (
                                fichasFiltradas.map(f => {
                                    const energiaMaisMaq = Number(f.custoEnergia || 0) + Number(f.custoMaquina || 0) + Number(f.custoFalha || 0);
                                    return (
                                        <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors text-xs">
                                            <td className="p-4 font-black text-slate-800">{f.nome}</td>
                                            <td className="p-4 text-center font-bold text-slate-500">
                                                {f.tempoMaquinaHoras || 0}h {f.tempoMaquinaMinutos || 0}m
                                            </td>
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

            {/* ========================================================================= */}
            {/* MODAL: NOVA FICHA DE CUSTOS (COM HORA, ENERGIA, DEPRECIAÇÃO E MATERIAIS)  */}
            {/* ========================================================================= */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                        
                        {/* Topo Fixo */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Icon name="pie-chart" size={20} className="text-indigo-600" />
                                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">
                                    {editingId ? 'Editar Ficha de Custos' : 'Nova Ficha de Custos'}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 text-xl cursor-pointer">✕</button>
                        </div>

                        {/* Corpo Rolável em 2 Colunas */}
                        <form onSubmit={handleSalvarFicha} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                                
                                {/* COLUNA ESQUERDA (6 COLUNAS): INFO BASE + TEMPO/ENERGIA + FRETE */}
                                <div className="lg:col-span-6 space-y-5">
                                    
                                    {/* 1. Info Base */}
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                            <Icon name="info" size={14} /> 1. Info Base do Produto
                                        </span>

                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-700 block mb-1">Nome do Produto *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.nome}
                                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                                placeholder="Ex: Display NFC Google Review"
                                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-700 block mb-1">Preço de Venda Praticado (R$) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.precoVenda}
                                                onChange={e => setFormData({ ...formData, precoVenda: e.target.value })}
                                                placeholder="Ex: 49.90"
                                                className="w-full p-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-base font-black text-emerald-800 outline-none focus:border-emerald-600"
                                            />
                                        </div>
                                    </div>

                                    {/* 2. Custos Operacionais: Tempo de Máquina, Energia Elétrica e Mão de Obra */}
                                    <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 space-y-4">
                                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                            <span className="text-xs font-black uppercase text-indigo-800 tracking-wider flex items-center gap-1.5">
                                                ⚡ 2. Custo de Hora, Energia Elétrica & Máquina
                                            </span>
                                            <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                                3D & Geral
                                            </span>
                                        </div>

                                        {/* Linha 1: Tempo de Impressão / Máquina */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Horas Máq.</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formData.tempoMaquinaHoras}
                                                    onChange={e => setFormData({ ...formData, tempoMaquinaHoras: e.target.value })}
                                                    placeholder="Ex: 2"
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Minutos Máq.</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    value={formData.tempoMaquinaMinutos}
                                                    onChange={e => setFormData({ ...formData, tempoMaquinaMinutos: e.target.value })}
                                                    placeholder="Ex: 30"
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Potência (Watts)</label>
                                                <input
                                                    type="number"
                                                    value={formData.potenciaWatts}
                                                    onChange={e => setFormData({ ...formData, potenciaWatts: e.target.value })}
                                                    title="Consumo médio da máquina em Watts (Ex: Impressora 3D = 150W a 220W)"
                                                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Tarifa (R$/kWh)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.tarifaKwh}
                                                    onChange={e => setFormData({ ...formData, tarifaKwh: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                        </div>

                                        {/* Linha 2: Hora-Máquina (Depreciação), Mão de Obra Manual, Embalagem e Taxa de Falha */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end pt-1">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-blue-700 block mb-1" title="Depreciação + Manutenção da máquina por hora">
                                                    Hora-Máq. (R$/h)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.custoHoraMaquina}
                                                    onChange={e => setFormData({ ...formData, custoHoraMaquina: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-purple-700 block mb-1" title="Minutos de trabalho manual (limpeza, montagem, colagem)">
                                                    Mão Obra (Min)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formData.tempoManualMinutos}
                                                    onChange={e => setFormData({ ...formData, tempoManualMinutos: e.target.value })}
                                                    placeholder="Minutos"
                                                    className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs font-black text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-purple-700 block mb-1">Valor Hora (R$/h)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.custoHoraMaoDeObra}
                                                    onChange={e => setFormData({ ...formData, custoHoraMaoDeObra: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-rose-600 block mb-1" title="Margem para cobrir perdas ou falhas de impressão">
                                                    Taxa Falha (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={formData.taxaFalhaPerc}
                                                    onChange={e => setFormData({ ...formData, taxaFalhaPerc: e.target.value })}
                                                    className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs font-bold text-center"
                                                />
                                            </div>
                                        </div>

                                        {/* Mini Resumo Automático da Energia e Horas */}
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

                                    {/* 3. Caixa p/ Frete (Melhor Envio / Correios) */}
                                    <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/30 space-y-3">
                                        <span className="text-xs font-black uppercase text-orange-800 tracking-wider flex items-center gap-1.5 border-b border-orange-200/60 pb-2">
                                            <Icon name="truck" size={15} /> 3. Caixa p/ Frete e Custo de Embalagem
                                        </span>

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Peso (kg)</label>
                                                <input type="number" step="0.001" value={formData.peso} onChange={e => setFormData({ ...formData, peso: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Comp. (cm)</label>
                                                <input type="number" value={formData.comprimento} onChange={e => setFormData({ ...formData, comprimento: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Larg. (cm)</label>
                                                <input type="number" value={formData.largura} onChange={e => setFormData({ ...formData, largura: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Alt. (cm)</label>
                                                <input type="number" value={formData.altura} onChange={e => setFormData({ ...formData, altura: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-emerald-800 block mb-1">Custo Caixa (R$)</label>
                                                <input type="number" step="0.01" value={formData.embalagemCusto} onChange={e => setFormData({ ...formData, embalagemCusto: e.target.value })} placeholder="0,00" className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-center" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUNA DIREITA (6 COLUNAS): MATERIAIS / FILAMENTO / INSUMOS + CARD PRETO DE LUCRO */}
                                <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                                    
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                                                📦 4. Matéria-Prima, Filamento e Insumos
                                            </span>
                                            <span className="text-xs font-black text-slate-500">
                                                Subtotal: {formatMoney(resumoCalculado.custoMateriais)}
                                            </span>
                                        </div>

                                        {/* Formulário rápido para adicionar Filamento (em gramas) ou Insumo (Tag NFC, Argola, etc.) */}
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                                            {estoqueInsumos.length > 0 && (
                                                <select
                                                    value={insumoSelectId}
                                                    onChange={handleSelecionarInsumoEstoque}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="">Puxar insumo/filamento cadastrado no Estoque (Opcional)...</option>
                                                    {estoqueInsumos.map(item => (
                                                        <option key={item.id} value={item.id}>{item.nome || item.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                                <div className="sm:col-span-5">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Material / Filamento / Item</label>
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
                                                        step="0.01"
                                                        value={ingQtdUsada}
                                                        onChange={e => setIngQtdUsada(e.target.value)}
                                                        placeholder={ingUnidade.startsWith('g') ? 'Ex: 45' : '1'}
                                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                                                        {ingUnidade === 'g_kg' ? 'Preço 1Kg' : 'Custo Un.'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
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
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs uppercase transition-colors cursor-pointer"
                                            >
                                                + Adicionar Material / Insumo na Ficha
                                            </button>
                                        </div>

                                        {/* Lista de Materiais Adicionados */}
                                        <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1">
                                            {formData.ingredientes.length === 0 ? (
                                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-xs font-bold text-slate-400">
                                                    Nenhum material adicionado. Adicione o peso do filamento, tag NFC, chaveiro, etc.
                                                </div>
                                            ) : (
                                                formData.ingredientes.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                                                        <div>
                                                            <span className="font-black text-slate-800">{item.nome}</span>
                                                            <span className="text-slate-400 font-bold ml-2">
                                                                ({item.qtd}{item.unidade})
                                                            </span>
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

                                    {/* PAINEL ESCURO DE RESULTADO FINAL E MARGEM DE LUCRO */}
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

                            {/* Rodapé Fixo */}
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

            {/* ========================================================================= */}
            {/* MODAL: CONFIGURAR TARIFAS PADRÃO (ENERGIA, MÁQUINA E MÃO DE OBRA)         */}
            {/* ========================================================================= */}
            {isConfigOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-base uppercase">Tarifas Padrão de Produção</h3>
                                <span className="text-xs text-slate-400">Valores preenchidos automaticamente em novas fichas</span>
                            </div>
                            <button onClick={() => setIsConfigOpen(false)} className="text-white/70 hover:text-white text-xl">✕</button>
                        </div>

                        <form onSubmit={handleSalvarConfigTaxas} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Tarifa Energia (R$/kWh)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={configTaxas.tarifaKwh}
                                        onChange={e => setConfigTaxas({ ...configTaxas, tarifaKwh: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Potência Média (Watts)</label>
                                    <input
                                        type="number"
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
                                        step="0.01"
                                        value={configTaxas.custoHoraMaquina}
                                        onChange={e => setConfigTaxas({ ...configTaxas, custoHoraMaquina: Number(e.target.value) })}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-black uppercase text-slate-600 block mb-1">Mão de Obra (R$/h)</label>
                                    <input
                                        type="number"
                                        step="0.01"
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
                                    step="0.5"
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