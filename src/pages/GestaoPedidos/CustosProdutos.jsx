import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import Icon from '../../components/Icon';

// Tradutor Universal: Evita erro de NaN no Firebase permitindo o uso de vírgula ou ponto
const safeNum = (val) => {
    if (typeof val === 'number') return val || 0;
    if (!val) return 0;
    const parsed = Number(String(val).replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

export default function CustosProdutos({ user, permissoes, donoUid: propDonoUid }) {
    const donoUid = propDonoUid || permissoes?.donoUid || user?.uid;

    const [fichas, setFichas] = useState([]);
    const [estoqueInsumos, setEstoqueInsumos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [configTaxas, setConfigTaxas] = useState({
        tarifaKwh: 0.95,
        potenciaMediaWatts: 180,
        custoHoraMaquina: 1.20,
        custoHoraMaoDeObra: 25.00,
        taxaFalhaPadrao: 5,
        markupSugeridoPadrao: 3.0,
        taxaMarketplacePerc: 18, 
        taxaMarketplaceFixa: 3.00
    });

    const [formData, setFormData] = useState({
        nome: '', precoVenda: '', markupEscolhido: 3.0, taxaMarketplacePerc: 18, taxaMarketplaceFixa: 3.00,
        peso: 0.000, comprimento: 0, largura: 0, altura: 0,
        tempoTotalMaquinaMinutos: 0, potenciaWatts: 180, tarifaKwh: 0.95, custoHoraMaquina: 1.20,
        tempoManualMinutos: 0, custoHoraMaoDeObra: 25.00, taxaFalhaPerc: 5, embalagemCusto: 0, ingredientes: []
    });

    const [insumoSelectId, setInsumoSelectId] = useState('');
    const [ingNome, setIngNome] = useState('');
    const [ingUnidade, setIngUnidade] = useState('g');
    const [ingQtdUsada, setIngQtdUsada] = useState('');
    const [ingCustoUnitario, setIngCustoUnitario] = useState('');

    useEffect(() => {
        if (!donoUid) return;

        db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cost_rates`).get().then(doc => {
            if (doc.exists) setConfigTaxas(prev => ({ ...prev, ...doc.data() }));
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

    const formatMoney = (val) => safeNum(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const formatarMinutosParaTexto = (totalMin) => {
        const minNum = safeNum(totalMin);
        if (minNum <= 0) return '0 min (0h)';
        const h = Math.floor(minNum / 60);
        const m = Math.round(minNum % 60);
        const dec = (minNum / 60).toFixed(2);
        if (h > 0 && m > 0) return `${h}h ${m}min (${dec}h)`;
        if (h > 0) return `${h}h (${dec}h)`;
        return `${m} min (${dec}h)`;
    };

    const calcularCustoItem = (unidade, qtd, precoBase) => {
        const q = safeNum(qtd);
        const p = safeNum(precoBase);
        const un = String(unidade || 'g').toLowerCase();

        if (un === 'g' || un === 'g_kg' || un === 'gramas' || un === 'kg') return p > 1 ? (p / 1000) * q : p * q;
        if (un === 'ml' || un === 'l') return p > 1 ? (p / 1000) * q : p * q;
        return p * q;
    };

    const previewCustoItemAtual = useMemo(() => {
        return calcularCustoItem(ingUnidade, ingQtdUsada, ingCustoUnitario);
    }, [ingUnidade, ingQtdUsada, ingCustoUnitario]);

    const handleSalvarConfigTaxas = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        try {
            await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/settings/cost_rates`).set(configTaxas, { merge: true });
            setIsConfigOpen(false);
            alert("Configurações salvas com sucesso!");
        } catch (err) { alert("Erro ao salvar tarifas."); }
    };

    const prepararFichaCorrigida = (ficha, ehDuplicacao = false) => {
        const minConv = ficha.tempoTotalMaquinaMinutos !== undefined ? safeNum(ficha.tempoTotalMaquinaMinutos) : (safeNum(ficha.tempoMaquinaHoras) * 60) + safeNum(ficha.tempoMaquinaMinutos);
        
        const ingCorrigidos = (Array.isArray(ficha.ingredientes) ? ficha.ingredientes : []).map(ing => {
            const ingAjustado = { ...ing };
            if (ehDuplicacao) ingAjustado.id = crypto.randomUUID();
            
            if ((ing.unidade === 'g' || ing.unidade === 'ml' || ing.modoCalculo === 'g_kg') && safeNum(ing.custoBaseInformado) > 1 && safeNum(ing.custoTotal) > safeNum(ing.custoBaseInformado)) {
                ingAjustado.custoTotal = safeNum((safeNum(ing.custoBaseInformado) / 1000) * safeNum(ing.qtd));
            }
            return ingAjustado;
        });

        return {
            ...ficha,
            nome: ehDuplicacao ? `${ficha.nome || ficha.name} (Cópia)` : (ficha.nome || ficha.name || ''),
            markupEscolhido: safeNum(ficha.markupEscolhido ?? configTaxas.markupSugeridoPadrao ?? 3.0),
            taxaMarketplacePerc: safeNum(ficha.taxaMarketplacePerc ?? configTaxas.taxaMarketplacePerc ?? 0),
            taxaMarketplaceFixa: safeNum(ficha.taxaMarketplaceFixa ?? configTaxas.taxaMarketplaceFixa ?? 0),
            tempoTotalMaquinaMinutos: minConv,
            ingredientes: ingCorrigidos
        };
    };

    const abrirModalNovaFicha = (ficha = null, modoCopiar = false) => {
        if (ficha) {
            setEditingId(modoCopiar ? null : ficha.id);
            setFormData(prepararFichaCorrigida(ficha, modoCopiar));
        } else {
            setEditingId(null);
            setFormData({
                nome: '', precoVenda: '', peso: 0, comprimento: 0, largura: 0, altura: 0,
                markupEscolhido: safeNum(configTaxas.markupSugeridoPadrao ?? 3.0),
                taxaMarketplacePerc: safeNum(configTaxas.taxaMarketplacePerc ?? 0),
                taxaMarketplaceFixa: safeNum(configTaxas.taxaMarketplaceFixa ?? 0),
                tempoTotalMaquinaMinutos: 0, potenciaWatts: safeNum(configTaxas.potenciaMediaWatts),
                tarifaKwh: safeNum(configTaxas.tarifaKwh), custoHoraMaquina: safeNum(configTaxas.custoHoraMaquina),
                tempoManualMinutos: 0, custoHoraMaoDeObra: safeNum(configTaxas.custoHoraMaoDeObra),
                taxaFalhaPerc: safeNum(configTaxas.taxaFalhaPadrao), embalagemCusto: 0, ingredientes: []
            });
        }
        setInsumoSelectId(''); setIngNome(''); setIngUnidade('g'); setIngQtdUsada(''); setIngCustoUnitario('');
        setIsModalOpen(true);
    };

    const handleSelecionarInsumoEstoque = (e) => {
        const id = e.target.value;
        setInsumoSelectId(id);
        if (!id) return;
        const item = estoqueInsumos.find(i => i.id === id);
        if (item) {
            const n = item.nome || item.name || '';
            const u = String(item.unidade || item.unit || '').toLowerCase();
            setIngNome(n);
            if (u.includes('kg') || u === 'g' || n.toLowerCase().includes('filamento')) setIngUnidade('g');
            else if (u.includes('l') || u === 'ml' || n.toLowerCase().includes('resina')) setIngUnidade('ml');
            else setIngUnidade('un');
            setIngCustoUnitario(item.custoUnitario || item.precoCusto || item.price || item.valor || '');
        }
    };

    const handleAdicionarIngrediente = () => {
        if (!ingNome.trim() || !ingQtdUsada) return alert("Preencha o nome do material/filamento e a quantidade usada.");
        const qtd = safeNum(ingQtdUsada);
        const valorInformado = safeNum(ingCustoUnitario);
        const custoFinalItem = calcularCustoItem(ingUnidade, qtd, valorInformado);

        const novoIng = {
            id: crypto.randomUUID(), nome: ingNome.trim(), unidade: ingUnidade,
            qtd: qtd, custoBaseInformado: valorInformado, modoCalculo: ingUnidade, custoTotal: safeNum(custoFinalItem)
        };

        setFormData(prev => {
            let novoPeso = safeNum(prev.peso);
            let novoCustoEmb = safeNum(prev.embalagemCusto);
            let novoC = safeNum(prev.comprimento);
            let novoL = safeNum(prev.largura);
            let novoA = safeNum(prev.altura);
            const nomeMin = ingNome.toLowerCase();

            if (novoIng.unidade === 'g' || novoIng.unidade === 'ml') novoPeso += (qtd / 1000);

            if (nomeMin.includes('caixa') || nomeMin.includes('papelão') || nomeMin.includes('embalagem')) {
                novoCustoEmb += custoFinalItem;
                const matchMedidas = nomeMin.match(/(\d+)\s*[xX*]\s*(\d+)\s*[xX*]\s*(\d+)/);
                if (matchMedidas) {
                    novoC = safeNum(matchMedidas[1]); novoL = safeNum(matchMedidas[2]); novoA = safeNum(matchMedidas[3]);
                }
                if (novoPeso === 0 || (novoPeso < 0.05 && novoIng.unidade !== 'g' && novoIng.unidade !== 'ml')) novoPeso += 0.050; 
            }

            return {
                ...prev, peso: safeNum(novoPeso), embalagemCusto: safeNum(novoCustoEmb),
                comprimento: novoC, largura: novoL, altura: novoA, ingredientes: [...prev.ingredientes, novoIng]
            };
        });

        setInsumoSelectId(''); setIngNome(''); setIngQtdUsada(''); setIngCustoUnitario('');
    };

    const removerIngrediente = (id) => {
        setFormData(prev => ({ ...prev, ingredientes: prev.ingredientes.filter(i => i.id !== id) }));
    };

    const resumoCalculado = useMemo(() => {
        const custoMateriais = formData.ingredientes.reduce((acc, i) => acc + safeNum(i.custoTotal), 0);
        const horasTotaisMaquina = safeNum(formData.tempoTotalMaquinaMinutos) / 60;
        const custoEnergia = ((safeNum(formData.potenciaWatts) / 1000) * horasTotaisMaquina) * safeNum(formData.tarifaKwh);
        const custoDepreciacaoMaquina = horasTotaisMaquina * safeNum(formData.custoHoraMaquina);
        const custoMaoDeObra = (safeNum(formData.tempoManualMinutos) / 60) * safeNum(formData.custoHoraMaoDeObra);
        const custoEmbalagem = safeNum(formData.embalagemCusto);

        const subtotalProducao = custoMateriais + custoEnergia + custoDepreciacaoMaquina + custoMaoDeObra + custoEmbalagem;
        const custoTaxaFalha = (custoMateriais + custoEnergia + custoDepreciacaoMaquina) * (safeNum(formData.taxaFalhaPerc) / 100);
        const custoTotalProducao = subtotalProducao + custoTaxaFalha;

        const taxaVendaPerc = safeNum(formData.taxaMarketplacePerc);
        const taxaVendaFixa = safeNum(formData.taxaMarketplaceFixa);
        const vendaPraticada = safeNum(formData.precoVenda);

        const custoMarketplaceReal = (vendaPraticada * (taxaVendaPerc / 100)) + taxaVendaFixa;
        const custoTotalGeral = custoTotalProducao + custoMarketplaceReal;
        const lucroBruto = vendaPraticada - custoTotalGeral;
        const margemPerc = vendaPraticada > 0 ? (lucroBruto / vendaPraticada) * 100 : 0;

        const calcSmartPrice = (markup) => {
            const divisor = 1 - (taxaVendaPerc / 100);
            if (divisor <= 0) return 0;
            return ((custoTotalProducao * markup) + taxaVendaFixa) / divisor;
        };

        const precoSugeridoAtacado = calcSmartPrice(2.0);
        const precoSugeridoPadrao = calcSmartPrice(3.0);
        const precoSugeridoPremium = calcSmartPrice(4.0);
        const precoSugeridoPersonalizado = calcSmartPrice(Math.max(1.1, safeNum(formData.markupEscolhido || 3.0)));

        return {
            custoMateriais, custoEnergia, custoDepreciacaoMaquina, custoMaoDeObra, custoEmbalagem, custoTaxaFalha,
            custoTotalProducao, custoMarketplaceReal, custoTotalGeral,
            precoSugeridoAtacado, precoSugeridoPadrao, precoSugeridoPremium, precoSugeridoPersonalizado,
            vendaPraticada, lucroBruto, margemPerc
        };
    }, [formData]);

    const aplicarPrecoSugerido = (valorSugerido, markupRef = null) => {
        setFormData(prev => ({
            ...prev,
            precoVenda: safeNum(valorSugerido).toFixed(2),
            ...(markupRef ? { markupEscolhido: markupRef } : {})
        }));
    };

    const handleSalvarFicha = async (e) => {
        e.preventDefault();
        if (!donoUid) return;
        if (!formData.nome.trim()) return alert("Informe o nome do produto.");

        setSaving(true);
        try {
            const idDoc = editingId || crypto.randomUUID();
            const minTotais = safeNum(formData.tempoTotalMaquinaMinutos);

            const payload = {
                id: idDoc,
                ...formData, // Mantém compatibilidade com outros dados legados
                nome: formData.nome.trim(),
                precoVenda: safeNum(formData.precoVenda),
                precoSugerido: safeNum(resumoCalculado.precoSugeridoPersonalizado),
                markupEscolhido: safeNum(formData.markupEscolhido || 3.0),
                taxaMarketplacePerc: safeNum(formData.taxaMarketplacePerc),
                taxaMarketplaceFixa: safeNum(formData.taxaMarketplaceFixa),
                tempoTotalMaquinaMinutos: minTotais,
                tempoMaquinaHoras: Math.floor(minTotais / 60),
                tempoMaquinaMinutos: Math.round(minTotais % 60),
                peso: safeNum(formData.peso),
                comprimento: safeNum(formData.comprimento),
                largura: safeNum(formData.largura),
                altura: safeNum(formData.altura),
                embalagemCusto: safeNum(formData.embalagemCusto),
                potenciaWatts: safeNum(formData.potenciaWatts),
                tarifaKwh: safeNum(formData.tarifaKwh),
                custoHoraMaquina: safeNum(formData.custoHoraMaquina),
                tempoManualMinutos: safeNum(formData.tempoManualMinutos),
                custoHoraMaoDeObra: safeNum(formData.custoHoraMaoDeObra),
                taxaFalhaPerc: safeNum(formData.taxaFalhaPerc),
                custoMateriais: safeNum(resumoCalculado.custoMateriais),
                custoEnergia: safeNum(resumoCalculado.custoEnergia),
                custoMaquina: safeNum(resumoCalculado.custoDepreciacaoMaquina),
                custoMaoDeObra: safeNum(resumoCalculado.custoMaoDeObra),
                custoFalha: safeNum(resumoCalculado.custoTaxaFalha),
                custoTotal: safeNum(resumoCalculado.custoTotalProducao),
                custoVendaMarketplace: safeNum(resumoCalculado.custoMarketplaceReal),
                lucroBruto: safeNum(resumoCalculado.lucroBruto),
                margemLucro: safeNum(resumoCalculado.margemPerc),
                updatedAt: new Date().toISOString()
            };

            await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).doc(idDoc).set(payload, { merge: true });
            setIsModalOpen(false);
        } catch (err) { 
            console.error(err);
            alert("Erro ao salvar ficha de custos: Verifique se todos os campos numéricos foram preenchidos corretamente."); 
        }
        setSaving(false);
    };

    const handleExcluirFicha = async (id) => {
        if (!window.confirm("Deseja remover esta ficha de custos?")) return;
        try { await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/ecommerce_products`).doc(id).delete(); } catch (err) {}
    };

    const fichasFiltradas = fichas.filter(f => (f.nome || '').toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="p-4 md:p-6 space-y-6 font-sans min-h-screen bg-slate-100 text-slate-800">
            <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Icon name="pie-chart" size={22} /></div>
                    <div>
                        <h1 className="font-black text-slate-900 text-base md:text-lg uppercase tracking-wider leading-none">Engenharia, Custos & Marketplace</h1>
                        <span className="text-xs font-bold text-slate-400">Cálculo de Preço Sugerido com integração de taxas Shopee, ML e Cartões</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button onClick={() => setIsConfigOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 cursor-pointer">
                        <Icon name="settings" size={15} /> Configurar Tarifas & Marketplace
                    </button>
                    <button onClick={() => abrirModalNovaFicha()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm cursor-pointer">
                        <Icon name="plus" size={16} /> + Nova Ficha de Custos
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
                <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30">
                    <span className="text-[10px] font-black uppercase text-indigo-700 block">Taxas Marketplace Padrão</span>
                    <span className="text-lg font-black text-indigo-900">{configTaxas.taxaMarketplacePerc}%</span>
                    <span className="text-[11px] text-indigo-600 font-bold block">+ {formatMoney(configTaxas.taxaMarketplaceFixa)} fixo</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto na ficha de custos..." className="w-full max-w-md px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="p-4">Produto</th>
                                <th className="p-4 text-center">Tempo Máq.</th>
                                <th className="p-4 text-right">Materiais</th>
                                <th className="p-4 text-right">Custo Produção</th>
                                <th className="p-4 text-right text-indigo-600">Preço Sugerido</th>
                                <th className="p-4 text-right text-emerald-600">Venda / Taxas</th>
                                <th className="p-4 text-center">Lucro Real</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="p-10 text-center text-xs font-bold text-slate-400">Carregando...</td></tr>
                            ) : fichasFiltradas.length === 0 ? (
                                <tr><td colSpan="8" className="p-12 text-center text-xs font-black uppercase text-slate-400">Nenhuma ficha cadastrada.</td></tr>
                            ) : (
                                fichasFiltradas.map(f => {
                                    const minSalvos = f.tempoTotalMaquinaMinutos !== undefined ? safeNum(f.tempoTotalMaquinaMinutos) : (safeNum(f.tempoMaquinaHoras) * 60) + safeNum(f.tempoMaquinaMinutos);
                                    const sugerido = f.precoSugerido || 0;
                                    return (
                                        <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/80 text-xs">
                                            <td className="p-4 font-black text-slate-800">{f.nome}</td>
                                            <td className="p-4 text-center font-bold text-slate-500">{formatarMinutosParaTexto(minSalvos)}</td>
                                            <td className="p-4 text-right font-bold text-slate-600">{formatMoney(f.custoMateriais)}</td>
                                            <td className="p-4 text-right font-black text-rose-600">{formatMoney(f.custoTotal)}</td>
                                            <td className="p-4 text-right font-black text-indigo-600 bg-indigo-50/30">{formatMoney(sugerido)}</td>
                                            <td className="p-4 text-right">
                                                <span className="font-black text-emerald-600 block">{formatMoney(f.precoVenda)}</span>
                                                {f.custoVendaMarketplace > 0 && <span className="text-[9px] text-slate-400 font-bold block">-{formatMoney(f.custoVendaMarketplace)} taxas</span>}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2.5 py-1 rounded-full text-[10px]">{formatMoney(f.lucroBruto)} ({safeNum(f.margemLucro).toFixed(0)}%)</span>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <button onClick={() => abrirModalNovaFicha(f, true)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg mr-1 cursor-pointer" title="Duplicar"><Icon name="copy" size={16} /></button>
                                                <button onClick={() => abrirModalNovaFicha(f)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-1 cursor-pointer" title="Editar"><Icon name="edit" size={16} /></button>
                                                <button onClick={() => handleExcluirFicha(f.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg cursor-pointer" title="Excluir"><Icon name="trash-2" size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: NOVA FICHA DE CUSTOS COM MARKETPLACE E AUTOMAÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Icon name="pie-chart" size={20} className="text-indigo-600" />
                                <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">{editingId ? 'Editar Ficha de Custos' : 'Nova Ficha de Custos'}</h3>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 text-xl cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSalvarFicha} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                                <div className="lg:col-span-6 space-y-4">
                                    {/* 1. INFO BASE */}
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3.5">
                                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-100 pb-2">1. Produto & Taxas Marketplace</span>
                                        <div>
                                            <label className="text-xs font-black uppercase text-slate-700 block mb-1">Nome do Produto *</label>
                                            <input type="text" required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:border-indigo-600" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-indigo-800 block mb-1">Taxa Shopee/ML (%)</label>
                                                <input type="number" step="any" value={formData.taxaMarketplacePerc} onChange={e => setFormData({ ...formData, taxaMarketplacePerc: e.target.value })} className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-center outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-indigo-800 block mb-1">Taxa Fixa (R$)</label>
                                                <input type="number" step="any" value={formData.taxaMarketplaceFixa} onChange={e => setFormData({ ...formData, taxaMarketplaceFixa: e.target.value })} className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-center outline-none" />
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 space-y-2.5 mt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">💡 Preço Sugerido Seguro:</span>
                                                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-700">
                                                    <span>Markup:</span>
                                                    <input type="number" step="0.1" min="1.1" value={formData.markupEscolhido} onChange={e => setFormData({ ...formData, markupEscolhido: e.target.value })} className="w-12 p-1 bg-white border border-indigo-300 rounded text-center font-black" />
                                                    <span>x =</span>
                                                    <button type="button" onClick={() => aplicarPrecoSugerido(resumoCalculado.precoSugeridoPersonalizado)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded cursor-pointer">{formatMoney(resumoCalculado.precoSugeridoPersonalizado)}</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button type="button" onClick={() => aplicarPrecoSugerido(resumoCalculado.precoSugeridoAtacado, 2.0)} className="p-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-center transition-all cursor-pointer group">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-700 block">Atacado (2x)</span>
                                                    <strong className="text-xs font-black text-slate-800 block mt-0.5">{formatMoney(resumoCalculado.precoSugeridoAtacado)}</strong>
                                                </button>
                                                <button type="button" onClick={() => aplicarPrecoSugerido(resumoCalculado.precoSugeridoPadrao, 3.0)} className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-center transition-all cursor-pointer shadow-2xs">
                                                    <span className="text-[9px] font-black uppercase text-emerald-100 block">★ Loja (3x)</span>
                                                    <strong className="text-xs font-black text-white block mt-0.5">{formatMoney(resumoCalculado.precoSugeridoPadrao)}</strong>
                                                </button>
                                                <button type="button" onClick={() => aplicarPrecoSugerido(resumoCalculado.precoSugeridoPremium, 4.0)} className="p-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-center transition-all cursor-pointer group">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-700 block">Premium (4x)</span>
                                                    <strong className="text-xs font-black text-slate-800 block mt-0.5">{formatMoney(resumoCalculado.precoSugeridoPremium)}</strong>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-black uppercase text-slate-700">Preço Venda Praticado *</label>
                                                <span className="text-[10px] font-bold text-slate-400">Sugerido Livre: <strong className="text-indigo-600">{formatMoney(resumoCalculado.precoSugeridoPersonalizado)}</strong></span>
                                            </div>
                                            <input type="number" step="any" required value={formData.precoVenda} onChange={e => setFormData({ ...formData, precoVenda: e.target.value })} className="w-full p-3 bg-emerald-50/60 border-2 border-emerald-400 rounded-xl text-base font-black text-emerald-900 outline-none focus:border-emerald-600" />
                                        </div>
                                    </div>

                                    {/* 2. TEMPO MÁQUINA */}
                                    <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 space-y-4">
                                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                            <span className="text-xs font-black uppercase text-indigo-800 tracking-wider">⚡ 2. Tempo de Máquina & Operação</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                            <div className="sm:col-span-6">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10px] font-black uppercase text-indigo-900">Tempo de Máq. (Min)</label>
                                                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">= {formatarMinutosParaTexto(formData.tempoTotalMaquinaMinutos)}</span>
                                                </div>
                                                <input type="number" step="any" min="0" value={formData.tempoTotalMaquinaMinutos} onChange={e => setFormData({ ...formData, tempoTotalMaquinaMinutos: e.target.value })} placeholder="40 ou 150" className="w-full p-2.5 bg-white border-2 border-indigo-300 focus:border-indigo-600 rounded-xl text-sm font-black text-slate-900 outline-none" />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Potência (W)</label>
                                                <input type="number" step="any" value={formData.potenciaWatts} onChange={e => setFormData({ ...formData, potenciaWatts: e.target.value })} className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Tarifa (R$/kWh)</label>
                                                <input type="number" step="any" value={formData.tarifaKwh} onChange={e => setFormData({ ...formData, tarifaKwh: e.target.value })} className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end pt-1">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-blue-700 block mb-1">Hora-Máq (R$/h)</label>
                                                <input type="number" step="any" value={formData.custoHoraMaquina} onChange={e => setFormData({ ...formData, custoHoraMaquina: e.target.value })} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-purple-700 block mb-1">Mão Obra (Min)</label>
                                                <input type="number" step="any" min="0" value={formData.tempoManualMinutos} onChange={e => setFormData({ ...formData, tempoManualMinutos: e.target.value })} className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs font-black text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-purple-700 block mb-1">Valor Hora (R$/h)</label>
                                                <input type="number" step="any" value={formData.custoHoraMaoDeObra} onChange={e => setFormData({ ...formData, custoHoraMaoDeObra: e.target.value })} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-rose-600 block mb-1">Taxa Falha (%)</label>
                                                <input type="number" step="any" value={formData.taxaFalhaPerc} onChange={e => setFormData({ ...formData, taxaFalhaPerc: e.target.value })} className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs font-bold text-center" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. LOGÍSTICA */}
                                    <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/30 space-y-3">
                                        <div className="flex justify-between items-center border-b border-orange-200/60 pb-2">
                                            <span className="text-xs font-black uppercase text-orange-800 tracking-wider flex items-center gap-1.5"><Icon name="truck" size={15} /> 3. Caixa & Logística</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
                                            <div><label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Peso (kg)</label><input type="number" step="any" value={formData.peso} onChange={e => setFormData({ ...formData, peso: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" /></div>
                                            <div><label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Comp. (cm)</label><input type="number" step="any" value={formData.comprimento} onChange={e => setFormData({ ...formData, comprimento: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" /></div>
                                            <div><label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Larg. (cm)</label><input type="number" step="any" value={formData.largura} onChange={e => setFormData({ ...formData, largura: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" /></div>
                                            <div><label className="text-[10px] font-black uppercase text-orange-900 block mb-1">Alt. (cm)</label><input type="number" step="any" value={formData.altura} onChange={e => setFormData({ ...formData, altura: e.target.value })} className="w-full p-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-center" /></div>
                                            <div><label className="text-[10px] font-black uppercase text-emerald-800 block mb-1">Custo Caixa (R$)</label><input type="number" step="any" value={formData.embalagemCusto} onChange={e => setFormData({ ...formData, embalagemCusto: e.target.value })} className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-center" /></div>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUNA DIREITA */}
                                <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">📦 4. Matéria-Prima & Insumos</span>
                                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">Subtotal: {formatMoney(resumoCalculado.custoMateriais)}</span>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                                            <div>
                                                <select value={insumoSelectId} onChange={handleSelecionarInsumoEstoque} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none cursor-pointer">
                                                    <option value="">-- Selecionar filamento ou caixa do Estoque --</option>
                                                    {estoqueInsumos.map(item => (
                                                        <option key={item.id} value={item.id}>{item.nome || item.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Nome do Item *</label>
                                                <input type="text" value={ingNome} onChange={e => setIngNome(e.target.value)} placeholder="Ex: Resina 3D ou Caixa 16*11*5..." className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-indigo-600" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                <div className="sm:col-span-5">
                                                    <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Como calcular?</label>
                                                    <select value={ingUnidade} onChange={e => setIngUnidade(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none cursor-pointer">
                                                        <option value="g">Gramas (Preço Kg)</option>
                                                        <option value="ml">Mililitro (Preço Litro)</option>
                                                        <option value="un">Unidade (Preço Un.)</option>
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">{ingUnidade === 'g' ? 'Peso (g)' : ingUnidade === 'ml' ? 'Qtd (ml)' : 'Qtd (un)'}</label>
                                                    <input type="number" step="any" value={ingQtdUsada} onChange={e => setIngQtdUsada(e.target.value)} placeholder={ingUnidade === 'g' ? '20' : '1'} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-center outline-none focus:border-indigo-600" />
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="text-[10px] font-black uppercase text-emerald-700 block mb-1">{ingUnidade === 'g' ? 'Preço 1 Kg (R$)' : ingUnidade === 'ml' ? 'Preço 1 Litro (R$)' : 'Custo Unitário (R$)'}</label>
                                                    <input type="number" step="any" value={ingCustoUnitario} onChange={e => setIngCustoUnitario(e.target.value)} placeholder={ingUnidade === 'g' ? '68.00' : '1.50'} className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-center outline-none focus:border-emerald-600" />
                                                </div>
                                            </div>
                                            {ingQtdUsada && ingCustoUnitario && (
                                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px]">
                                                    <span className="font-bold text-indigo-800">
                                                        {ingUnidade === 'g' ? `Cálculo: (${formatMoney(ingCustoUnitario)} ÷ 1000g) × ${ingQtdUsada}g` : ingUnidade === 'ml' ? `Cálculo: (${formatMoney(ingCustoUnitario)} ÷ 1000ml) × ${ingQtdUsada}ml` : `Cálculo: ${ingQtdUsada} × ${formatMoney(ingCustoUnitario)}`}
                                                    </span>
                                                    <strong className="font-black text-indigo-900">= {formatMoney(previewCustoItemAtual)}</strong>
                                                </div>
                                            )}
                                            <button type="button" onClick={handleAdicionarIngrediente} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase cursor-pointer shadow-xs transition-colors">
                                                + Adicionar Material
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1">
                                            {formData.ingredientes.map(item => (
                                                <div key={item.id} className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
                                                    <div>
                                                        <span className="font-black text-slate-800">{item.nome}</span>
                                                        <span className="text-slate-500 font-bold ml-2">
                                                            ({item.qtd}{item.unidade} {(item.unidade === 'g' || item.unidade === 'ml') && item.custoBaseInformado ? `• R$ ${item.custoBaseInformado}/${item.unidade === 'g' ? 'kg' : 'L'}` : ''})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-rose-600">{formatMoney(item.custoTotal)}</span>
                                                        <button type="button" onClick={() => removerIngrediente(item.id)} className="text-red-400 hover:text-red-600 font-black cursor-pointer">✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* RESULTADO FINANCEIRO FINAL */}
                                    <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2.5 shadow-lg">
                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                                            <span className="text-slate-400">Custo de Produção</span>
                                            <span className="text-rose-400 text-base">-{formatMoney(resumoCalculado.custoTotalProducao)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                                            <span className="text-slate-400">Taxas Marketplace</span>
                                            <span className="text-rose-400 text-base">-{formatMoney(resumoCalculado.custoMarketplaceReal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider border-b border-slate-800 pb-2.5 pt-1">
                                            <span className="text-slate-400">Venda Praticada</span>
                                            <span className="text-emerald-400 text-base">{formatMoney(resumoCalculado.vendaPraticada)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="font-black text-sm uppercase tracking-wider">Lucro Real</span>
                                            <div className="text-right">
                                                <span className={`text-2xl font-black block leading-none ${resumoCalculado.lucroBruto >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{formatMoney(resumoCalculado.lucroBruto)}</span>
                                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase">{resumoCalculado.margemPerc.toFixed(1)}% Margem</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl uppercase tracking-widest text-xs hover:bg-slate-100 cursor-pointer">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-7 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase shadow-md flex items-center gap-2 cursor-pointer">
                                    <Icon name="save" size={16} /> {saving ? 'Salvando...' : 'Salvar Custos'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONFIGURACOES */}
            {isConfigOpen && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <h3 className="font-black text-base uppercase">Configurações & Marketplace</h3>
                            <button type="button" onClick={() => setIsConfigOpen(false)} className="text-white/70 hover:text-white text-xl cursor-pointer">✕</button>
                        </div>
                        <form onSubmit={handleSalvarConfigTaxas} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="font-black uppercase text-slate-600 block mb-1">Tarifa Luz (R$/kWh)</label><input type="number" step="any" value={configTaxas.tarifaKwh} onChange={e => setConfigTaxas({ ...configTaxas, tarifaKwh: Number(e.target.value) })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none" /></div>
                                <div><label className="font-black uppercase text-slate-600 block mb-1">Potência (Watts)</label><input type="number" step="any" value={configTaxas.potenciaMediaWatts} onChange={e => setConfigTaxas({ ...configTaxas, potenciaMediaWatts: Number(e.target.value) })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="font-black uppercase text-slate-600 block mb-1">Hora-Máquina (R$/h)</label><input type="number" step="any" value={configTaxas.custoHoraMaquina} onChange={e => setConfigTaxas({ ...configTaxas, custoHoraMaquina: Number(e.target.value) })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none" /></div>
                                <div><label className="font-black uppercase text-slate-600 block mb-1">Mão de Obra (R$/h)</label><input type="number" step="any" value={configTaxas.custoHoraMaoDeObra} onChange={e => setConfigTaxas({ ...configTaxas, custoHoraMaoDeObra: Number(e.target.value) })} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl mt-2">
                                <div><label className="font-black uppercase text-indigo-700 block mb-1">Shopee / ML (%)</label><input type="number" step="any" value={configTaxas.taxaMarketplacePerc} onChange={e => setConfigTaxas({ ...configTaxas, taxaMarketplacePerc: Number(e.target.value) })} className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl font-bold outline-none" /></div>
                                <div><label className="font-black uppercase text-indigo-700 block mb-1">Taxa Fixa (R$)</label><input type="number" step="any" value={configTaxas.taxaMarketplaceFixa} onChange={e => setConfigTaxas({ ...configTaxas, taxaMarketplaceFixa: Number(e.target.value) })} className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl font-bold outline-none" /></div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button type="button" onClick={() => setIsConfigOpen(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase cursor-pointer">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase cursor-pointer">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}