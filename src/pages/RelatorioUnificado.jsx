import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../components/Icon';
import { getTxMonth, isInvoicePayment } from '../utils/finance';

// Função para limpar os IDs do banco de dados caso o nome original não seja passado
const formatMethodName = (id, name) => {
    if (name && name !== id.toUpperCase()) return name; 
    const parts = id.split('_');
    if (parts.length > 1 && !isNaN(parts[parts.length - 1])) parts.pop(); 
    return parts.join(' ').toUpperCase()
        .replace('CART O', 'CARTÃO')
        .replace('DEBITO', 'DÉBITO')
        .replace('CREDITO', 'CRÉDITO');
};

function RelatorioUnificado({ metaVendas = 0, fixedCosts, recipes, complements, combos, dailyRecords, salesDays, stats, cmvSettings, formatMoney, p, calcItemCost, calcComboCost, transactions = [], filterMonth = '', paymentMethods = [] }) {
    const [apenasLiquidados, setApenasLiquidados] = useState(false);
    
    // DETETA AUTOMATICAMENTE SE É CELULAR PARA ATIVAR O MODO APP
    const [viewMode, setViewMode] = useState('desktop');
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setViewMode('app');
        }
    }, []);
    
    // ESTADOS DO SIMULADOR E IMPOSTO SIMPLES COM LOCALSTORAGE
    const [simMediaDiaria, setSimMediaDiaria] = useState('');
    const [simCmv, setSimCmv] = useState('');
    const [isTaxConfigOpen, setIsTaxConfigOpen] = useState(false);
    
    const [taxBaseMode, setTaxBaseMode] = useState(() => localStorage.getItem('tribo_taxBaseMode') || 'total'); 
    const [selectedTaxMethods, setSelectedTaxMethods] = useState(() => {
        const saved = localStorage.getItem('tribo_selectedTaxMethods');
        return saved ? JSON.parse(saved) : [];
    });
    const [manualTaxBaseValue, setManualTaxBaseValue] = useState(() => localStorage.getItem('tribo_manualTaxBaseValue') || ''); 

    // Efeitos para salvar automaticamente qualquer mudança no localStorage
    useEffect(() => { localStorage.setItem('tribo_taxBaseMode', taxBaseMode); }, [taxBaseMode]);
    useEffect(() => { localStorage.setItem('tribo_selectedTaxMethods', JSON.stringify(selectedTaxMethods)); }, [selectedTaxMethods]);
    useEffect(() => { localStorage.setItem('tribo_manualTaxBaseValue', manualTaxBaseValue); }, [manualTaxBaseValue]);

    // LIMITES DE GASTOS (%) DEFINIDOS
    const LIMITES = {
        cmv: cmvSettings.targetCMV || 35,
        taxas: 3,
        motoboy: 12,
        embalagem: 5,
        gas: 2.5
    };

    const totalFixedCosts = fixedCosts.reduce((s, c) => s + p(c.value), 0);
    
    const cmvGeral = (() => { 
        let sumCmv = 0, count = 0; 
        [...recipes, ...complements, ...combos].forEach(item => { 
            if (!item.ignoreCMV) { 
                const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items);
                const sp = p(item.sellingPrice); 
                if (sp > 0) { sumCmv += (cost / sp) * 100; count++; } 
            } 
        }); 
        return count > 0 ? (sumCmv / count).toFixed(1) : 0; 
    })();

    // =========================================================================
    // EXTRAÇÃO DINÂMICA DE FORMAS DE RECEBIMENTO
    // =========================================================================
    const ignoredKeys = ['qtdPedidos', 'clientesNovos', 'taxaEntrega', 'motoboy', 'isLaunched', 'initialized'];
    
    const extractedMethods = useMemo(() => {
        if (paymentMethods && paymentMethods.length > 0) return paymentMethods;
        const uniqueKeys = new Set();
        Object.values(dailyRecords).forEach(r => {
            Object.keys(r).forEach(k => {
                if (!ignoredKeys.includes(k) && !k.startsWith('_')) uniqueKeys.add(k);
            });
        });
        return Array.from(uniqueKeys).map(k => ({ id: k, name: k.toUpperCase() }));
    }, [dailyRecords, paymentMethods]);

    // Inicializa a base do imposto simples com todas as formas de pagamento apenas se nunca foi salvo antes
    useEffect(() => {
        const saved = localStorage.getItem('tribo_selectedTaxMethods');
        if (!saved && selectedTaxMethods.length === 0 && extractedMethods.length > 0) {
            setSelectedTaxMethods(extractedMethods.map(m => m.id));
        }
    }, [extractedMethods]);

    let mMotoboy = 0, mTaxaEntrega = 0, mClientesNovos = 0, mPedidos = 0, mFiado = 0;
    const methodTotals = {};
    extractedMethods.forEach(m => methodTotals[m.id] = 0);
    
    salesDays.forEach(d => {
        const r = dailyRecords[d] || {};
        extractedMethods.forEach(m => {
            const val = p(r[m.id]);
            methodTotals[m.id] += val;
            if (m.name.toLowerCase().includes('fiado') && apenasLiquidados) {
                // Se for modo "Só Pagos", o fiado não entra no faturamento manual
            } else if (m.name.toLowerCase().includes('fiado')) {
                mFiado += val;
            }
        });
        
        mMotoboy += p(r.motoboy); mTaxaEntrega += p(r.taxaEntrega);
        mClientesNovos += p(r.clientesNovos); 
        mPedidos += p(r.qtdPedidos); 
    });

    const [year, month] = filterMonth.split('-').map(Number);
    const today = new Date();
    let diasUteisRestantes = 0;

    const wDays = cmvSettings.workingDays || [0, 3, 4, 5, 6]; 

    if (today.getFullYear() < year || (today.getFullYear() === year && today.getMonth() + 1 < month)) {
        const lastDay = new Date(year, month, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const wd = new Date(year, month - 1, d).getDay();
            if (wDays.includes(wd)) diasUteisRestantes++;
        }
    } else if (today.getFullYear() === year && today.getMonth() + 1 === month) {
        const lastDay = new Date(year, month, 0).getDate();
        for (let d = today.getDate(); d <= lastDay; d++) {
            const wd = new Date(year, month - 1, d).getDay();
            if (wDays.includes(wd)) diasUteisRestantes++;
        }
    }

    let activeCatCosts = {};
    let mFiadoPago = 0; 

    if (transactions && transactions.length > 0) {
        transactions.forEach(t => {
            if (getTxMonth(t) === filterMonth) {
                if (t.category === 'Baixa Fatura' || t.category === 'Transferência') return;

                const statusRaw = (t.status || 'pendente').toLowerCase().trim();
                const contaNome = (t.account || t.card || '').toUpperCase();
                const isCartao = contaNome.includes('CARTÃO') || contaNome.includes('CARTAO');
                const isPago = statusRaw === 'pago' || isCartao;

                if (t.type === 'entrada' && isPago) {
                    const desc = (t.description || "").toLowerCase();
                    const cat = (t.category || "").toLowerCase();
                    if (desc.includes('fiado') || cat.includes('fiado')) {
                        mFiadoPago += p(t.amount);
                    }
                }
                
                if (apenasLiquidados) {
                    if (!isInvoicePayment(t) && t.type === 'saida' && isPago) {
                        activeCatCosts[t.category] = (activeCatCosts[t.category] || 0) + p(t.amount);
                    }
                } else {
                    activeCatCosts = stats.catCosts || {};
                }
            }
        });
    }

    if (apenasLiquidados) {
        if (stats.autoCardFees > 0) activeCatCosts['Taxas de Cartão (Auto Vendas)'] = stats.autoCardFees;
    } else {
        activeCatCosts = stats.catCosts || {};
    }

    const dataPrev = new Date(year, month - 2, 1);
    const prevMonthStr = `${dataPrev.getFullYear()}-${String(dataPrev.getMonth() + 1).padStart(2, '0')}`;
    
    let prevCatCosts = {};
    let prevAutoCardFees = 0;

    if (transactions && transactions.length > 0) {
        transactions.forEach(t => {
            if (getTxMonth(t) === prevMonthStr) {
                const c = (t.category || "").toLowerCase().trim();
                if (c === 'baixa fatura' || c === 'transferência' || c === 'transferencia') return;
                
                const statusRaw = (t.status || 'pendente').toLowerCase().trim();
                const contaNome = (t.account || t.card || '').toUpperCase();
                const isCartao = contaNome.includes('CARTÃO') || contaNome.includes('CARTAO');
                const isPago = statusRaw === 'pago' || isCartao;

                if (apenasLiquidados) {
                    if (!isInvoicePayment(t) && t.type === 'saida' && isPago) {
                        prevCatCosts[t.category] = (prevCatCosts[t.category] || 0) + p(t.amount);
                    }
                } else {
                    if (!isInvoicePayment(t) && t.type === 'saida') {
                        prevCatCosts[t.category] = (prevCatCosts[t.category] || 0) + p(t.amount);
                    }
                }
            }
        });
    }

    Object.keys(dailyRecords).forEach(d => {
        if (d.startsWith(prevMonthStr)) {
            const r = dailyRecords[d];
            if (cmvSettings.autoFeeVendas !== false) {
                prevAutoCardFees += (p(r.debito) * (p(cmvSettings.taxaDebito)/100)) + (p(r.credito) * (p(cmvSettings.taxaCredito)/100));
            }
        }
    });

    if (prevAutoCardFees > 0) {
        prevCatCosts['Taxas de Cartão (Auto Vendas)'] = prevAutoCardFees;
    }

    const todasCategoriasUnicas = Array.from(new Set([...Object.keys(activeCatCosts), ...Object.keys(prevCatCosts)]));
    
    const comparativoCategorias = todasCategoriasUnicas.map(cat => {
        const atual = activeCatCosts[cat] || 0;
        const anterior = prevCatCosts[cat] || 0;
        const diferenca = atual - anterior;
        let variacao = 0;
        if (anterior > 0) variacao = (diferenca / anterior) * 100;
        else if (atual > 0) variacao = 100;
        return { cat, atual, anterior, diferenca, variacao };
    }).sort((a, b) => b.atual - a.atual);

    // =========================================================================

    let faturamentoManual = 0;
    extractedMethods.forEach(m => {
        if (m.name.toLowerCase().includes('fiado')) {
            if (!apenasLiquidados) faturamentoManual += methodTotals[m.id];
        } else {
            faturamentoManual += methodTotals[m.id];
        }
    });

    const faturamentoTotal = apenasLiquidados ? (faturamentoManual + mFiadoPago) : p(stats.rb);
    const diferencaCaixa = p(stats.rb) - faturamentoManual;

    // LÓGICA DO IMPOSTO SIMPLES CUSTOMIZADO/MANUAL
    let baseApuradaImposto = 0;
    if (taxBaseMode === 'total') {
        baseApuradaImposto = faturamentoTotal;
    } else if (taxBaseMode === 'manual') {
        baseApuradaImposto = p(manualTaxBaseValue);
    } else {
        extractedMethods.forEach(m => {
            if (selectedTaxMethods.includes(m.id)) {
                baseApuradaImposto += methodTotals[m.id];
            }
        });
    }
    const isCustomBase = taxBaseMode !== 'total';
    const impostosEstimados = baseApuradaImposto * (p(cmvSettings.tax) / 100);

    const faltaParaMeta = Math.max(0, p(metaVendas) - faturamentoTotal);
    const metaDiariaRestante = diasUteisRestantes > 0 ? (faltaParaMeta / diasUteisRestantes) : 0;
    const progressoMeta = p(metaVendas) > 0 ? (faturamentoTotal / p(metaVendas)) * 100 : 0;

    let custoRealInsumosFinanceiro = 0;
    let taxasFinanceiroManuais = 0;
    let motoboyFinanceiroExtra = 0;
    let custoEmbalagem = 0;
    let custoGas = 0;
    let totalCustosFixosDRE = 0;
    let listaCustosFixos = [];
    
    let gastoMarketing = 0, gastoAluguel = 0, gastoFolha = 0;

    const cmvKeywords = ['insumo', 'mercadoria', 'compra', 'hortifruti', 'açougue', 'acougue', 'padaria', 'bebida', 'cmv', 'ingrediente', 'fornecedor', 'estoque', 'alimento', 'carne', 'pão', 'pao', 'queijo', 'refrigerante', 'suco'];
    const embalagemKeywords = ['embalagem', 'embalagens'];
    const gasKeywords = ['gás', 'gas'];
    const entregaKeywords = ['motoboy', 'motoqueiro', 'entrega', 'frete', 'logistica', 'logística', 'entregador', 'combustível', 'gasolina'];

    Object.entries(activeCatCosts).forEach(([cat, val]) => {
        const c = cat.toLowerCase().trim();
        if (c === 'taxas de cartão (auto vendas)') return;
        if (c === 'baixa fatura' || c === 'transferência' || c === 'transferencia') return;
        
        if (c.includes('marketing') || c.includes('anúncio') || c.includes('anuncio') || c.includes('tráfego')) gastoMarketing += val;
        if (c.includes('aluguel') || c.includes('renda/aluguel') || c.includes('predio') || c.includes('prédio')) gastoAluguel += val;
        if (c.includes('folha') || c.includes('rh') || c.includes('salário') || c.includes('salario') || c.includes('ajudante') || c.includes('funcionário')) gastoFolha += val;

        if (['taxa maquina cartão', 'taxa maquina cartao', 'taxas bancárias', 'taxas bancarias', 'taxas da máquina', 'taxa'].includes(c) || c.includes('taxa maquina')) {
            taxasFinanceiroManuais += val;
        } else if (cmvKeywords.some(k => c.includes(k))) {
            custoRealInsumosFinanceiro += val;
        } else if (embalagemKeywords.some(k => c.includes(k))) {
            custoEmbalagem += val;
        } else if (gasKeywords.some(k => c.includes(k))) {
            custoGas += val;
        } else if (entregaKeywords.some(k => c.includes(k))) {
            motoboyFinanceiroExtra += val;
        } else {
            totalCustosFixosDRE += val;
            listaCustosFixos.push({ desc: cat, val: val });
        }
    });

    const custoAquisicaoCliente = mClientesNovos > 0 ? gastoMarketing / mClientesNovos : 0;
    const ticketMedioGeral = mPedidos > 0 ? faturamentoTotal / mPedidos : 0;

    const custoInsumos = custoRealInsumosFinanceiro > 0 ? custoRealInsumosFinanceiro : (faturamentoTotal * (p(cmvGeral) / 100));
    const cmvRealFinanceiroPercent = faturamentoTotal > 0 ? (custoInsumos / faturamentoTotal) * 100 : 0;
    
    let autoCartaoDin = 0;
    extractedMethods.forEach(m => {
        if (m.name.toLowerCase().includes('débito') || m.name.toLowerCase().includes('debito')) autoCartaoDin += (methodTotals[m.id] * (p(cmvSettings.taxaDebito) / 100));
        if (m.name.toLowerCase().includes('crédito') || m.name.toLowerCase().includes('credito')) autoCartaoDin += (methodTotals[m.id] * (p(cmvSettings.taxaCredito) / 100));
    });

    const taxasCartaoAutomaticas = autoCartaoDin;
    const taxasCartaoTotais = taxasCartaoAutomaticas + taxasFinanceiroManuais;
    const totalMotoboy = motoboyFinanceiroExtra > 0 ? motoboyFinanceiroExtra : (mMotoboy + mTaxaEntrega);
    
    const totalCustosVariaveis = custoInsumos + impostosEstimados + taxasCartaoTotais + totalMotoboy + custoEmbalagem + custoGas;
    const margemContribuicaoVal = faturamentoTotal - totalCustosVariaveis;
    const lucroLiquidoFinal = margemContribuicaoVal - totalCustosFixosDRE;

    const margemContribuicaoPercentual = faturamentoTotal > 0 ? margemContribuicaoVal / faturamentoTotal : 0;
    const pontoEquilibrio = margemContribuicaoPercentual > 0 ? totalCustosFixosDRE / margemContribuicaoPercentual : 0;
    const margemSeguranca = faturamentoTotal - pontoEquilibrio;
    const projecaoAtual = stats.ticketDiario > 0 ? stats.ticketDiario * (stats.diasAtivos + diasUteisRestantes) : 0;
    const diasParaEmpatar = stats.ticketDiario > 0 ? Math.ceil(pontoEquilibrio / stats.ticketDiario) : 0;
    const lucratividade = faturamentoTotal > 0 ? (lucroLiquidoFinal / faturamentoTotal) * 100 : 0;

    const scoreFinanceiro = lucratividade >= 15 ? 100 : (lucratividade >= 5 ? 80 : (lucratividade > 0 ? 60 : 30));
    const scoreCMV = cmvRealFinanceiroPercent <= LIMITES.cmv ? 100 : (cmvRealFinanceiroPercent <= LIMITES.cmv + 5 ? 75 : 40);
    const scoreVendas = progressoMeta >= 100 ? 100 : (progressoMeta >= 80 ? 85 : (progressoMeta >= 50 ? 65 : 40));
    const scoreGeral = Math.round((scoreFinanceiro + scoreCMV + scoreVendas) / 3);

    const valorIdealCmv = faturamentoTotal * (LIMITES.cmv / 100);
    const perdaCmv = Math.max(0, custoInsumos - valorIdealCmv);
    const perdaTaxas = taxasCartaoTotais; 
    const totalLucroPerdido = perdaCmv + perdaTaxas;

    const drePercTaxas = faturamentoTotal > 0 ? (taxasCartaoTotais / faturamentoTotal) * 100 : 0;
    const drePercMotoboy = faturamentoTotal > 0 ? (totalMotoboy / faturamentoTotal) * 100 : 0;
    const drePercEmbalagem = faturamentoTotal > 0 ? (custoEmbalagem / faturamentoTotal) * 100 : 0;
    const drePercGas = faturamentoTotal > 0 ? (custoGas / faturamentoTotal) * 100 : 0;
    const drePercImpostos = faturamentoTotal > 0 ? (impostosEstimados / faturamentoTotal) * 100 : 0;

    const expenseGoals = [
        { label: 'CMV (Insumos)', currentPerc: cmvRealFinanceiroPercent, maxPerc: LIMITES.cmv, currentVal: custoInsumos },
        { label: 'Taxas Cartão', currentPerc: drePercTaxas, maxPerc: LIMITES.taxas, currentVal: taxasCartaoTotais },
        { label: 'Entregas', currentPerc: drePercMotoboy, maxPerc: LIMITES.motoboy, currentVal: totalMotoboy },
        { label: 'Embalagens', currentPerc: drePercEmbalagem, maxPerc: LIMITES.embalagem, currentVal: custoEmbalagem },
        { label: 'Gás', currentPerc: drePercGas, maxPerc: LIMITES.gas, currentVal: custoGas }
    ];

    let aiMessage = "";
    if (scoreGeral >= 80) {
        aiMessage = "A sua empresa está muito saudável! ";
        if (perdaCmv > 0) aiMessage += `O único ponto de atenção é o CMV ${ (cmvRealFinanceiroPercent - LIMITES.cmv).toFixed(1) }% acima do limite ideal. `;
        else aiMessage += "Os seus custos estão perfeitamente alinhados com a meta. ";
    } else if (scoreGeral >= 60) {
        aiMessage = "O negócio está estável, mas requer afinações. ";
        if (lucratividade < 10) aiMessage += "A lucratividade está baixa. Tente otimizar combos ou rever o preço do cardápio. ";
    } else {
        aiMessage = "⚠️ Alerta de Risco Financeiro. ";
        if (margemSeguranca < 0) aiMessage += `O faturamento ainda não cobriu o Ponto de Equilíbrio. Faltam ${formatMoney(Math.abs(margemSeguranca))}. `;
    }

    if (custoAquisicaoCliente > ticketMedioGeral && mClientesNovos > 0) {
        aiMessage += `🛑 Atenção ao Tráfego: O seu Custo de Aquisição (CAC) de ${formatMoney(custoAquisicaoCliente)} está superior ao Ticket Médio. Você está a pagar mais para atrair o cliente do que ele gasta!`;
    }

    const getStarRating = (cmv) => {
        if (cmv === 0) return '❓';
        if (cmv <= LIMITES.cmv) return '⭐⭐⭐⭐⭐';
        if (cmv <= LIMITES.cmv + 5) return '⭐⭐⭐⭐';
        if (cmv <= LIMITES.cmv + 12) return '⭐⭐⭐';
        if (cmv <= LIMITES.cmv + 20) return '⭐⭐';
        return '⭐';
    };

    const valMediaDiariaSimulada = simMediaDiaria !== '' ? p(simMediaDiaria) : stats.ticketDiario;
    const valCmvSimulado = simCmv !== '' ? p(simCmv) : LIMITES.cmv;
    
    const percCartoesSimulador = faturamentoTotal > 0 ? (taxasCartaoTotais / faturamentoTotal) * 100 : 2.9;
    const percEntregaSimulador = faturamentoTotal > 0 ? (totalMotoboy / faturamentoTotal) * 100 : 9;
    const percImpostosSimulador = p(cmvSettings.tax);
    const percEmbalagemSimulador = faturamentoTotal > 0 ? (custoEmbalagem / faturamentoTotal) * 100 : 0;
    const percGasSimulador = faturamentoTotal > 0 ? (custoGas / faturamentoTotal) * 100 : 0;
    
    const margemSimulada = 100 - valCmvSimulado - percCartoesSimulador - percEntregaSimulador - percImpostosSimulador - percEmbalagemSimulador - percGasSimulador;
    const margemSimuladaDecimal = margemSimulada > 0 ? margemSimulada / 100 : 0;
    
    const peSimulado = margemSimuladaDecimal > 0 ? totalCustosFixosDRE / margemSimuladaDecimal : 0;
    const diasEmpateSimulado = valMediaDiariaSimulada > 0 ? (peSimulado / valMediaDiariaSimulada).toFixed(1) : 0;
    const projFinalSimulada = valMediaDiariaSimulada * (stats.diasAtivos + diasUteisRestantes);
    const lucroFinalSimulado = (projFinalSimulada * margemSimuladaDecimal) - totalCustosFixosDRE;

    const AppCard = ({ label, value, perc, max, color = "text-slate-800", isAlert = false, subtext = "" }) => (
        <div className={`flex justify-between items-center p-3 rounded-xl border mb-2 shadow-sm ${isAlert ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <div>
                <div className={`text-[11px] font-black uppercase ${color}`}>{label}</div>
                {subtext && <span className="block text-[9px] text-slate-400 mt-0.5">{subtext}</span>}
            </div>
            <div className="text-right">
                <span className={`block text-[15px] font-black ${isAlert ? 'text-red-600' : color}`}>{value}</span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={`text-[10px] font-bold ${isAlert ? 'text-red-500' : 'text-slate-500'}`}>{perc}%</span>
                    {max > 0 && <span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400">MÁX {max}%</span>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 fade-in print-area">
            
            <style>{`
                @media print {
                    html, body, #root, main, .overflow-y-auto, .overflow-hidden, .h-screen { height: auto !important; min-height: 100% !important; overflow: visible !important; position: static !important; display: block !important; }
                    .glass-card, tr { break-inside: avoid; page-break-inside: avoid; }
                    .glass-card { margin-bottom: 20px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
                    .print-hidden-section { display: none !important; }
                }
            `}</style>

            {cmvRealFinanceiroPercent > 60 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-start gap-3 print-hidden-section animate-pulse">
                    <Icon name="alert-triangle" size={24} className="text-amber-500 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-black text-amber-900 uppercase text-[12px] tracking-wide">Distorção de Indicadores Detetada</h4>
                        <p className="text-[10px] text-amber-800 mt-1 font-bold leading-relaxed">
                            O sistema registou um CMV contabilístico de <span className="text-red-600">{cmvRealFinanceiroPercent.toFixed(1)}%</span>, possivelmente devido a uma concentração atípica de compras de stock (abastecimento).
                        </p>
                    </div>
                </div>
            )}

            {/* CABEÇALHO */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#1A202C] text-white p-4 rounded-xl shadow print:shadow-none print:bg-white print:text-black print:border-b-2 print:border-black print:mb-6">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-[#F8CC82] print:text-black flex items-center gap-2">
                        Relatório Unificado 
                        <span className={`text-[10px] px-2 py-0.5 rounded print:border print:border-black ${apenasLiquidados ? 'bg-green-500 text-white print:bg-transparent print:text-black' : 'bg-blue-500 text-white print:bg-transparent print:text-black'}`}>
                            {apenasLiquidados ? 'CAIXA' : 'COMPETÊNCIA'}
                        </span>
                    </h2>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase print:text-slate-500">Inteligência Financeira Tribo Sistemas</p>
                </div>
                
                <div className="flex flex-col md:flex-row w-full lg:w-auto items-center gap-3">
                    <div className="flex w-full md:w-auto items-center bg-slate-800 rounded-lg p-1 border border-slate-700 print:hidden">
                        <button type="button" onClick={() => setViewMode('desktop')} className={`flex-1 md:flex-none px-3 py-2 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === 'desktop' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <Icon name="monitor" size={12} className="inline mr-1"/> Painel
                        </button>
                        <button type="button" onClick={() => setViewMode('app')} className={`flex-1 md:flex-none px-3 py-2 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === 'app' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                            <Icon name="smartphone" size={12} className="inline mr-1"/> Modo App
                        </button>
                    </div>

                    <div className="flex w-full md:w-auto items-center bg-slate-800 rounded-lg p-1 border border-slate-700 print:hidden">
                        <button type="button" onClick={() => setApenasLiquidados(false)} className={`flex-1 px-4 py-2 rounded-md text-[9px] font-black uppercase transition-all ${!apenasLiquidados ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Tudo</button>
                        <button type="button" onClick={() => setApenasLiquidados(true)} className={`flex-1 px-4 py-2 rounded-md text-[9px] font-black uppercase transition-all ${apenasLiquidados ? 'bg-green-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Só Pagos</button>
                    </div>

                    <button type="button" onClick={() => window.print()} className="w-full md:w-auto px-4 py-2 bg-[#F27A18] hover:bg-orange-500 text-black font-black uppercase text-[10px] rounded-lg shadow-md transition-colors print:hidden flex items-center justify-center gap-2">
                        <Icon name="printer" size={14} /> Imprimir
                    </button>
                </div>
            </div>

            <div className={`grid ${viewMode === 'app' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-4`}>
                <div className="glass-card p-5 rounded-xl border-t-4 border-t-indigo-500 bg-white flex flex-col justify-between">
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5"><Icon name="activity" size={12} /> Saúde da Empresa</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${scoreGeral >= 80 ? 'border-emerald-500 text-emerald-600' : scoreGeral >= 60 ? 'border-amber-400 text-amber-500' : 'border-red-500 text-red-600'}`}>
                                <span className="text-2xl font-black">{scoreGeral}</span>
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between text-[9px] font-black uppercase text-slate-600"><span>Financeiro</span><span className={scoreFinanceiro >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{scoreFinanceiro}</span></div>
                                <div className="flex justify-between text-[9px] font-black uppercase text-slate-600"><span>Custo Prod. (CMV)</span><span className={scoreCMV >= 80 ? 'text-emerald-500' : 'text-red-500'}>{scoreCMV}</span></div>
                                <div className="flex justify-between text-[9px] font-black uppercase text-slate-600"><span>Vendas / Meta</span><span className={scoreVendas >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{scoreVendas}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`glass-card p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-center ${viewMode === 'desktop' && 'lg:col-span-2'}`}>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5"><Icon name="cpu" size={12} /> IA de Diagnóstico</h3>
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-slate-700 leading-snug">{aiMessage}</p>
                        {perdaCmv > 0 && cmvRealFinanceiroPercent <= 60 && (
                            <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3">
                                <Icon name="alert-triangle" size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-black text-red-800 uppercase">O CMV ultrapassou a meta de {LIMITES.cmv}%</p>
                                    <p className="text-[10px] text-red-600 mt-0.5 font-bold">Isso representa aproximadamente <strong>{formatMoney(perdaCmv)} de perda de lucro limpo</strong>.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PROGRESSO DA META MENSAL */}
            {p(metaVendas) > 0 && (
                <div className="glass-card p-4 rounded-xl border border-slate-200 bg-white mt-4 print:hidden">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-500">Progresso da Meta Mensal</span>
                        <span className="text-[10px] font-black text-slate-700">{formatMoney(faturamentoTotal)} / {formatMoney(metaVendas)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${progressoMeta >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(progressoMeta, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] font-bold text-slate-400">{progressoMeta.toFixed(1)}% Alcançado</span>
                        {faltaParaMeta > 0 ? (
                            <span className="text-[9px] font-bold text-slate-400">Faltam {formatMoney(faltaParaMeta)} ({formatMoney(metaDiariaRestante)}/dia)</span>
                        ) : (
                            <span className="text-[9px] font-bold text-emerald-500">Meta Atingida! 🎉</span>
                        )}
                    </div>
                </div>
            )}

            {/* METAS DE GASTOS */}
            <div className="glass-card p-4 rounded-xl border border-slate-200 bg-white mt-4 print:hidden">
                <h3 className="text-[10px] font-black uppercase text-slate-500 mb-3 flex items-center gap-1.5">
                    <Icon name="pie-chart" size={12}/> Consumo dos Limites de Gastos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {expenseGoals.map((goal, index) => {
                        const isOver = goal.currentPerc > goal.maxPerc;
                        const progress = Math.min((goal.currentPerc / goal.maxPerc) * 100, 100) || 0;
                        const maxVal = faturamentoTotal * (goal.maxPerc / 100);
                        
                        return (
                            <div key={index} className={`p-2 rounded-lg border ${isOver ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[9px] font-black uppercase text-slate-600">{goal.label}</span>
                                    <span className={`text-[10px] font-black ${isOver ? 'text-red-600' : 'text-slate-700'}`}>{goal.currentPerc.toFixed(1)}% / {goal.maxPerc}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[8px] font-black uppercase ${isOver ? 'text-red-500' : 'text-slate-400'}`}>{formatMoney(goal.currentVal)}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Máx: {formatMoney(maxVal)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CARDS PRINCIPAIS */}
            <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 print:grid-cols-5 pt-4 border-t border-slate-200 mt-4 md:mt-6`}>
                <div className="glass-card p-4 rounded-xl border-t-4 border-t-blue-500 text-center flex flex-col justify-center items-center">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Faturamento</span>
                    <h3 className={`${viewMode === 'app' ? 'text-lg' : 'text-xl'} font-black text-slate-800 mt-1 leading-none`}>{formatMoney(faturamentoTotal)}</h3>
                </div>
                
                <div className="glass-card p-4 rounded-xl border-t-4 border-t-fuchsia-500 text-center flex flex-col justify-center items-center relative">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Clientes Novos</span>
                    <h3 className={`${viewMode === 'app' ? 'text-lg' : 'text-xl'} font-black text-fuchsia-600 mt-1 mb-1 leading-none`}>{mClientesNovos}</h3>
                    {mClientesNovos > 0 && (
                        <div className="text-[8px] font-black uppercase text-slate-500 bg-fuchsia-50 border border-fuchsia-100 rounded px-1.5 py-0.5" title="Custo de Aquisição de Clientes (CAC)">
                            CAC: <span className="text-fuchsia-700">{formatMoney(custoAquisicaoCliente)}</span>
                        </div>
                    )}
                </div>

                <div className="glass-card p-4 rounded-xl border-t-4 border-t-emerald-500 text-center flex flex-col justify-center items-center">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Margem Bruta</span>
                    <h3 className={`${viewMode === 'app' ? 'text-lg' : 'text-xl'} font-black text-emerald-600 mt-1 leading-none`}>{faturamentoTotal > 0 ? (margemContribuicaoPercentual * 100).toFixed(1) : 0}%</h3>
                </div>
                <div className={`glass-card p-4 rounded-xl border-t-4 ${cmvRealFinanceiroPercent > LIMITES.cmv ? 'border-t-red-500 bg-red-50/50' : 'border-t-emerald-500'} text-center flex flex-col justify-center items-center`}>
                    <span className="text-[8px] font-black text-slate-400 block uppercase">CMV Puro</span>
                    <h3 className={`${viewMode === 'app' ? 'text-lg' : 'text-xl'} font-black mt-1 leading-none ${cmvRealFinanceiroPercent > 60 ? 'text-red-600' : (cmvRealFinanceiroPercent > LIMITES.cmv ? 'text-red-500' : 'text-emerald-600')}`}>{cmvRealFinanceiroPercent.toFixed(1)}%</h3>
                </div>
                <div className={`glass-card p-4 rounded-xl border-t-4 ${lucroLiquidoFinal >= 0 ? 'border-t-purple-500' : 'border-t-red-500'} text-center relative overflow-hidden col-span-2 md:col-span-1 flex flex-col justify-center items-center`}>
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Lucro Líquido</span>
                    <h3 className={`${viewMode === 'app' ? 'text-lg' : 'text-xl'} font-black mt-1 leading-none ${lucroLiquidoFinal >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{formatMoney(lucroLiquidoFinal)}</h3>
                </div>
            </div>

            {/* INDICADORES OPERACIONAIS */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 print:grid-cols-4 mt-3 md:mt-4`}>
                <div className="glass-card p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Total de Pedidos</span>
                    <h3 className="text-lg font-black text-slate-700 mt-1">{mPedidos}</h3>
                </div>
                <div className="glass-card p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Ticket Médio Geral</span>
                    <h3 className="text-lg font-black text-slate-700 mt-1">{formatMoney(ticketMedioGeral)}</h3>
                </div>
                <div className="glass-card p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Ponto de Equilíbrio</span>
                    <h3 className="text-lg font-black text-slate-700 mt-1">{formatMoney(pontoEquilibrio)}</h3>
                </div>
                <div className="glass-card p-3 rounded-xl border border-slate-200 text-center relative overflow-hidden">
                    <div className={`absolute left-0 top-0 w-1 h-full ${margemSeguranca >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Margem de Segurança</span>
                    <h3 className={`text-lg font-black mt-1 ${margemSeguranca >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatMoney(margemSeguranca)}</h3>
                </div>
            </div>

            {/* DRE (TABELA DE BATIMENTO) COM IMPOSTO SIMPLES CUSTOMIZADO */}
            <div className="glass-card p-4 rounded-xl space-y-3 print:border-t-4 print:border-t-slate-800 print:shadow-none mt-6">
                <h3 className="font-black text-slate-800 border-b pb-1.5 flex items-center gap-1.5"><Icon name="file-text" size={14}/> Batimento Real e Custos</h3>
                
                {viewMode === 'desktop' ? (
                    <div className="overflow-x-auto no-scrollbar pb-24">
                        <table className="w-full text-left text-[11px] font-bold border-collapse border border-slate-200">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[9px] uppercase print:bg-slate-200 print:text-black">
                                    <th className="p-2 border border-slate-700 print:border-slate-300">Demonstrativo Estrutural</th>
                                    <th className="p-2 text-right border border-slate-700 print:border-slate-300 min-w-[120px]">Valor Realizado</th>
                                    <th className="p-2 text-center border border-slate-700 print:border-slate-300 min-w-[80px]">% Ref.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700 print:text-black">
                                <tr className="bg-slate-100 font-black"><td colSpan="3" className="p-2 border print:border-slate-300">1. Faturamento Total Operacional</td></tr>
                                
                                {/* FORMAS DE PAGAMENTO RENDERIZADAS DINAMICAMENTE COM NOME FORMATADO */}
                                {extractedMethods.map(m => {
                                    const val = methodTotals[m.id];
                                    if (val === 0) return null;
                                    return (
                                        <tr key={m.id}>
                                            <td className="p-2 pl-4 border print:border-slate-300">Vendas {formatMethodName(m.id, m.name)}</td>
                                            <td className="p-2 text-right border print:border-slate-300">{formatMoney(val)}</td>
                                            <td className="p-2 text-center border print:border-slate-300">{faturamentoTotal > 0 ? ((val / faturamentoTotal) * 100).toFixed(1) : 0}%</td>
                                        </tr>
                                    );
                                })}
                                
                                {(!apenasLiquidados && diferencaCaixa !== 0) && (
                                    <tr>
                                        <td className="p-2 pl-4 border print:border-slate-300 text-slate-500 bg-slate-50 print:bg-transparent flex items-center gap-1.5"><Icon name="info" size={10} /> Ajuste de Caixa (Sistema vs Lançado)</td>
                                        <td className="p-2 text-right border print:border-slate-300 text-slate-500 bg-slate-50 print:bg-transparent">{formatMoney(diferencaCaixa)}</td>
                                        <td className="p-2 text-center border print:border-slate-300 text-slate-500 bg-slate-50 print:bg-transparent">{faturamentoTotal > 0 ? ((diferencaCaixa / faturamentoTotal) * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                )}

                                <tr className="bg-blue-50/50 font-black"><td className="p-2 border print:border-slate-300">TOTAL RECEITA BRUTA (A)</td><td className="p-2 text-right border print:border-slate-300 text-blue-700 print:text-black">{formatMoney(faturamentoTotal)}</td><td className="p-2 text-center border print:border-slate-300">100.0%</td></tr>
                                
                                <tr className="bg-slate-100 font-black"><td colSpan="3" className="p-2 border print:border-slate-300">2. Custos Variáveis Retidos</td></tr>
                                <tr className={cmvRealFinanceiroPercent > LIMITES.cmv ? "bg-red-50/30 print:bg-transparent" : ""}>
                                    <td className="p-2 pl-4 border print:border-slate-300 text-slate-900 font-black">Custo Real de Mercadoria (CMV Puro)</td>
                                    <td className="p-2 text-right border print:border-slate-300 text-red-600 print:text-black font-black">-{formatMoney(custoInsumos)}</td>
                                    <td className="p-2 text-center border print:border-slate-300 font-black">
                                        <span className={cmvRealFinanceiroPercent > LIMITES.cmv ? "text-red-600 print:text-black" : "text-emerald-600 print:text-black"}>{cmvRealFinanceiroPercent.toFixed(1)}%</span>
                                        <span className="text-[7px] text-slate-400 block mt-0.5">MÁX: {LIMITES.cmv}%</span>
                                    </td>
                                </tr>
                                
                                {/* IMPOSTO SIMPLES COM CONFIGURAÇÃO RESTAURADA E OPÇÃO MANUAL */}
                                <tr>
                                    <td className="p-2 pl-4 border print:border-slate-300">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black uppercase">Impostos Simples</span>
                                            {isCustomBase && <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-black tracking-widest">BASE {taxBaseMode === 'manual' ? 'MANUAL' : 'CUSTOMIZADA'}</span>}
                                            <button onClick={() => setIsTaxConfigOpen(!isTaxConfigOpen)} className="text-[9px] text-blue-600 hover:bg-blue-100 bg-blue-50 border border-blue-200 px-2 py-1 flex items-center gap-1 rounded font-black transition-colors print:hidden">
                                                <Icon name="settings" size={10} /> CONFIGURAR BASE
                                            </button>
                                        </div>
                                        {isCustomBase && <span className="text-[9px] text-slate-400 font-bold mt-1 block">BASE APURADA: {formatMoney(baseApuradaImposto)}</span>}
                                    </td>
                                    <td className="p-2 text-right border print:border-slate-300">-{formatMoney(impostosEstimados)}</td>
                                    <td className="p-2 text-center border print:border-slate-300">{drePercImpostos.toFixed(1)}%</td>
                                </tr>
                                
                                {/* PAINEL EXPANSÍVEL DE CONFIGURAÇÃO DO IMPOSTO */}
                                {isTaxConfigOpen && (
                                    <tr className="bg-slate-50 print:hidden shadow-inner">
                                        <td colSpan="3" className="p-4 border border-blue-100">
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                <div className="flex flex-wrap gap-2 items-center p-3 bg-slate-50 border-b border-slate-200">
                                                    <div className="flex bg-slate-200/50 p-1 rounded-lg w-full md:w-auto">
                                                        <button 
                                                            className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase rounded transition-all ${taxBaseMode === 'total' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-200'}`} 
                                                            onClick={() => { setTaxBaseMode('total'); setSelectedTaxMethods(extractedMethods.map(m => m.id)); }}
                                                        >
                                                            TOTAL
                                                        </button>
                                                        <button 
                                                            className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase rounded transition-all ${taxBaseMode === 'custom' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-200'}`} 
                                                            onClick={() => setTaxBaseMode('custom')}
                                                        >
                                                            POR FORMAS
                                                        </button>
                                                        <button 
                                                            className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase rounded transition-all ${taxBaseMode === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-200'}`} 
                                                            onClick={() => setTaxBaseMode('manual')}
                                                        >
                                                            MANUAL
                                                        </button>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-bold ml-auto px-2">
                                                        {taxBaseMode === 'manual' ? 'Digite o valor total da base de cálculo:' : 'Selecione abaixo quais vendas sofrem tributação:'}
                                                    </div>
                                                </div>
                                                
                                                {taxBaseMode === 'custom' && (
                                                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {extractedMethods.map(m => (
                                                            <label key={m.id} className="flex items-center gap-2 cursor-pointer group">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={selectedTaxMethods.includes(m.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedTaxMethods([...selectedTaxMethods, m.id]);
                                                                        else setSelectedTaxMethods(selectedTaxMethods.filter(id => id !== m.id));
                                                                    }}
                                                                    className="w-4 h-4 accent-blue-600 cursor-pointer" 
                                                                />
                                                                <span className="text-[10px] font-black uppercase text-slate-700 group-hover:text-blue-600 transition-colors">
                                                                    {formatMethodName(m.id, m.name)}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {taxBaseMode === 'manual' && (
                                                    <div className="p-4 flex flex-col gap-2 bg-white">
                                                        <label className="text-[10px] font-black uppercase text-slate-500">Valor da Base (R$)</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            className="p-3 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none w-full md:w-1/3 focus:border-blue-500 text-lg"
                                                            placeholder="Ex: 15000.00"
                                                            value={manualTaxBaseValue}
                                                            onChange={(e) => setManualTaxBaseValue(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                <tr className={drePercTaxas > LIMITES.taxas ? "bg-amber-50/30 print:bg-transparent" : ""}>
                                    <td className="p-2 pl-4 border print:border-slate-300">Taxas Maquininhas</td>
                                    <td className="p-2 text-right border print:border-slate-300">-{formatMoney(taxasCartaoTotais)}</td>
                                    <td className="p-2 text-center border print:border-slate-300 font-bold">
                                        <span className={drePercTaxas > LIMITES.taxas ? "text-red-600 print:text-black" : ""}>{drePercTaxas.toFixed(1)}%</span>
                                        <span className="text-[7px] text-slate-400 block mt-0.5">MÁX: {LIMITES.taxas}%</span>
                                    </td>
                                </tr>
                                <tr className={drePercMotoboy > LIMITES.motoboy ? "bg-amber-50/30 print:bg-transparent" : ""}>
                                    <td className="p-2 pl-4 border print:border-slate-300">Entregas / Motoboy</td>
                                    <td className="p-2 text-right border print:border-slate-300">-{formatMoney(totalMotoboy)}</td>
                                    <td className="p-2 text-center border print:border-slate-300 font-bold">
                                        <span className={drePercMotoboy > LIMITES.motoboy ? "text-red-600 print:text-black" : ""}>{drePercMotoboy.toFixed(1)}%</span>
                                        <span className="text-[7px] text-slate-400 block mt-0.5">MÁX: {LIMITES.motoboy}%</span>
                                    </td>
                                </tr>
                                {custoEmbalagem > 0 && (
                                    <tr className={drePercEmbalagem > LIMITES.embalagem ? "bg-amber-50/30 print:bg-transparent" : ""}>
                                        <td className="p-2 pl-4 border print:border-slate-300">Embalagens</td>
                                        <td className="p-2 text-right border print:border-slate-300">-{formatMoney(custoEmbalagem)}</td>
                                        <td className="p-2 text-center border print:border-slate-300 font-bold">
                                            <span className={drePercEmbalagem > LIMITES.embalagem ? "text-red-600 print:text-black" : ""}>{drePercEmbalagem.toFixed(1)}%</span>
                                            <span className="text-[7px] text-slate-400 block mt-0.5">MÁX: {LIMITES.embalagem}%</span>
                                        </td>
                                    </tr>
                                )}
                                {custoGas > 0 && (
                                    <tr className={drePercGas > LIMITES.gas ? "bg-amber-50/30 print:bg-transparent" : ""}>
                                        <td className="p-2 pl-4 border print:border-slate-300">Gás</td>
                                        <td className="p-2 text-right border print:border-slate-300">-{formatMoney(custoGas)}</td>
                                        <td className="p-2 text-center border print:border-slate-300 font-bold">
                                            <span className={drePercGas > LIMITES.gas ? "text-red-600 print:text-black" : ""}>{drePercGas.toFixed(1)}%</span>
                                            <span className="text-[7px] text-slate-400 block mt-0.5">MÁX: {LIMITES.gas}%</span>
                                        </td>
                                    </tr>
                                )}
                                <tr className="bg-red-50/20 print:bg-transparent font-black"><td className="p-2 border print:border-slate-300">TOTAL VARIÁVEIS (B)</td><td className="p-2 text-right border print:border-slate-300 text-red-600 print:text-black">-{formatMoney(totalCustosVariaveis)}</td><td className="p-2 text-center border print:border-slate-300">{faturamentoTotal > 0 ? ((totalCustosVariaveis / faturamentoTotal) * 100).toFixed(1) : 0}%</td></tr>
                                
                                <tr className="bg-amber-50/30 print:bg-transparent font-black"><td className="p-2 border print:border-slate-300">(=) MARGEM DE CONTRIBUIÇÃO (A - B)</td><td className="p-2 text-right border print:border-slate-300 text-amber-700 print:text-black">{formatMoney(margemContribuicaoVal)}</td><td className="p-2 text-center border print:border-slate-300 text-amber-700 print:text-black">{faturamentoTotal > 0 ? ((margemContribuicaoVal / faturamentoTotal) * 100).toFixed(1) : 0}%</td></tr>
                                
                                <tr className="bg-slate-100 font-black"><td colSpan="3" className="p-2 border print:border-slate-300">3. Custos Fixos</td></tr>
                                {listaCustosFixos.sort((a,b)=>b.val-a.val).map((fc, idx) => (
                                    <tr key={idx}><td className="p-2 pl-4 border print:border-slate-300 uppercase">{fc.desc}</td><td className="p-2 text-right border print:border-slate-300 text-red-400 print:text-black">-{formatMoney(fc.val)}</td><td className="p-2 text-center border print:border-slate-300">{faturamentoTotal > 0 ? ((fc.val/faturamentoTotal)*100).toFixed(1) : 0}%</td></tr>
                                ))}
                                
                                <tr className="bg-red-50/20 print:bg-transparent font-black"><td className="p-2 border print:border-slate-300">TOTAL FIXOS (C)</td><td className="p-2 text-right border print:border-slate-300 text-red-600 print:text-black">-{formatMoney(totalCustosFixosDRE)}</td><td className="p-2 text-center border print:border-slate-300">{faturamentoTotal > 0 ? ((totalCustosFixosDRE / faturamentoTotal) * 100).toFixed(1) : 0}%</td></tr>
                                
                                <tr className="bg-slate-900 text-white font-black print:bg-slate-200 print:text-black"><td className="p-2 border print:border-slate-300">(=) RESULTADO LÍQUIDO FINAL (A - B - C)</td><td className="p-2 text-right border print:border-slate-300 text-[#F8CC82] print:text-black">{formatMoney(lucroLiquidoFinal)}</td><td className="p-2 text-center border print:border-slate-300 text-[#F8CC82] print:text-black">{faturamentoTotal > 0 ? ((lucroLiquidoFinal / faturamentoTotal) * 100).toFixed(1) : 0}%</td></tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-2 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 pl-1 border-l-2 border-slate-400">Receitas (Dinâmicas)</h4>
                            
                            {extractedMethods.map(m => {
                                const val = methodTotals[m.id];
                                if (val === 0) return null;
                                return <AppCard key={m.id} label={formatMethodName(m.id, m.name)} value={formatMoney(val)} perc={faturamentoTotal > 0 ? ((val / faturamentoTotal) * 100).toFixed(1) : 0} />
                            })}
                            
                            {(!apenasLiquidados && diferencaCaixa !== 0) && (
                                <AppCard label="Ajuste Caixa (Dif)" value={formatMoney(diferencaCaixa)} perc={faturamentoTotal > 0 ? ((diferencaCaixa / faturamentoTotal) * 100).toFixed(1) : 0} color="text-slate-500" />
                            )}
                            <div className="mt-3 bg-blue-600 text-white p-3 rounded-xl flex justify-between shadow-md">
                                <span className="font-black text-[12px] uppercase">Receita Bruta</span>
                                <span className="font-black text-lg">{formatMoney(faturamentoTotal)}</span>
                            </div>
                        </div>

                        <div className="bg-red-50/30 p-2 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase text-red-400 mb-2 pl-1 border-l-2 border-red-400">Custos Variáveis</h4>
                            <AppCard label="CMV (Mercadoria)" value={`-${formatMoney(custoInsumos)}`} perc={cmvRealFinanceiroPercent.toFixed(1)} max={LIMITES.cmv} isAlert={cmvRealFinanceiroPercent > LIMITES.cmv} color="text-red-500" />
                            <AppCard label="Taxas Maquininhas" value={`-${formatMoney(taxasCartaoTotais)}`} perc={drePercTaxas.toFixed(1)} max={LIMITES.taxas} isAlert={drePercTaxas > LIMITES.taxas} color="text-red-500" />
                            <AppCard label="Motoboy / Frete" value={`-${formatMoney(totalMotoboy)}`} perc={drePercMotoboy.toFixed(1)} max={LIMITES.motoboy} isAlert={drePercMotoboy > LIMITES.motoboy} color="text-red-500" />
                            <AppCard label="Embalagens" value={`-${formatMoney(custoEmbalagem)}`} perc={drePercEmbalagem.toFixed(1)} max={LIMITES.embalagem} isAlert={drePercEmbalagem > LIMITES.embalagem} color="text-red-500" />
                            <AppCard label="Gás" value={`-${formatMoney(custoGas)}`} perc={drePercGas.toFixed(1)} max={LIMITES.gas} isAlert={drePercGas > LIMITES.gas} color="text-red-500" />
                            
                            {/* Card Impostos com botão de Config em mobile */}
                            <AppCard 
                                label={
                                    <div className="flex items-center gap-2">
                                        Impostos
                                        <button onClick={() => setIsTaxConfigOpen(!isTaxConfigOpen)} className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded border border-blue-200 flex items-center gap-0.5"><Icon name="settings" size={8}/> config</button>
                                    </div>
                                } 
                                value={`-${formatMoney(impostosEstimados)}`} 
                                perc={drePercImpostos.toFixed(1)} 
                                color="text-red-500" 
                                subtext={isCustomBase ? `BASE ${taxBaseMode === 'manual' ? 'MANUAL' : 'CUSTOMIZADA'}: ${formatMoney(baseApuradaImposto)}` : ''}
                            />
                            
                            {/* Painel de config no modo celular */}
                            {isTaxConfigOpen && (
                                <div className="bg-white p-3 rounded-lg border border-slate-200 mt-2 mb-2 shadow-inner">
                                    <div className="flex bg-slate-200/50 p-1 rounded-lg w-full mb-3">
                                        <button className={`flex-1 px-2 py-2 text-[10px] font-black uppercase rounded ${taxBaseMode === 'total' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`} onClick={() => { setTaxBaseMode('total'); setSelectedTaxMethods(extractedMethods.map(m => m.id)); }}>TOTAL</button>
                                        <button className={`flex-1 px-2 py-2 text-[10px] font-black uppercase rounded ${taxBaseMode === 'custom' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`} onClick={() => setTaxBaseMode('custom')}>POR FORMAS</button>
                                        <button className={`flex-1 px-2 py-2 text-[10px] font-black uppercase rounded ${taxBaseMode === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`} onClick={() => setTaxBaseMode('manual')}>MANUAL</button>
                                    </div>
                                    
                                    {taxBaseMode === 'custom' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {extractedMethods.map(m => (
                                                <label key={m.id} className="flex items-center gap-2 cursor-pointer text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 p-1 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedTaxMethods.includes(m.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedTaxMethods([...selectedTaxMethods, m.id]);
                                                            else setSelectedTaxMethods(selectedTaxMethods.filter(id => id !== m.id));
                                                        }}
                                                        className="w-3 h-3 accent-blue-600 cursor-pointer" 
                                                    />
                                                    {formatMethodName(m.id, m.name)}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {taxBaseMode === 'manual' && (
                                        <div className="flex flex-col gap-1 mt-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500">Valor (R$)</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="p-2 border border-slate-300 rounded font-bold text-slate-700 outline-none w-full focus:border-blue-500"
                                                placeholder="Ex: 15000.00"
                                                value={manualTaxBaseValue}
                                                onChange={(e) => setManualTaxBaseValue(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 bg-red-100 text-red-800 p-3 rounded-xl flex justify-between border border-red-200">
                                <span className="font-black text-[12px] uppercase">Total Variáveis</span>
                                <span className="font-black text-lg">-{formatMoney(totalCustosVariaveis)}</span>
                            </div>
                        </div>
                        
                        <div className="bg-amber-100 text-amber-900 p-3 rounded-xl flex justify-between shadow-md items-center">
                            <span className="font-black text-[12px] uppercase">Margem de Contrib.</span>
                            <div className="text-right">
                                <span className="font-black text-xl block">{formatMoney(margemContribuicaoVal)}</span>
                                <span className="text-[10px] font-bold opacity-80">{faturamentoTotal > 0 ? ((margemContribuicaoVal / faturamentoTotal) * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 pl-1 border-l-2 border-slate-400">Custos Fixos</h4>
                            {listaCustosFixos.sort((a,b)=>b.val-a.val).map((fc, idx) => (
                                <AppCard key={idx} label={fc.desc} value={`-${formatMoney(fc.val)}`} perc={faturamentoTotal > 0 ? ((fc.val/faturamentoTotal)*100).toFixed(1) : 0} color="text-slate-600" />
                            ))}
                            <div className="mt-3 bg-red-50 text-red-800 p-3 rounded-xl flex justify-between border border-red-200">
                                <span className="font-black text-[12px] uppercase">Total Fixos</span>
                                <span className="font-black text-lg">-{formatMoney(totalCustosFixosDRE)}</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-[#F8CC82] p-4 rounded-xl flex justify-between shadow-lg items-center border border-slate-700 mt-4">
                            <span className="font-black text-[14px] uppercase">Resultado Final</span>
                            <div className="text-right">
                                <span className="font-black text-2xl block leading-none">{formatMoney(lucroLiquidoFinal)}</span>
                                <span className="text-[11px] font-bold opacity-80">{faturamentoTotal > 0 ? ((lucroLiquidoFinal / faturamentoTotal) * 100).toFixed(1) : 0}% LÍQUIDO</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* NOVA SESSÃO: COMPARATIVO DE GASTOS */}
            <div className="glass-card p-4 rounded-xl space-y-3 print:border-t-4 print:border-t-slate-800 print:shadow-none mt-6">
                <h3 className="font-black text-slate-800 border-b pb-1.5 flex items-center gap-1.5"><Icon name="bar-chart-2" size={14}/> Comparativo de Gastos: Mês Atual vs Anterior</h3>
                
                {viewMode === 'desktop' ? (
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-[11px] font-bold border-collapse border border-slate-200">
                            <thead>
                                <tr className="bg-slate-50 text-[9px] uppercase text-slate-500 print:text-black">
                                    <th className="p-2 border border-slate-200">Categoria</th>
                                    <th className="p-2 text-right border border-slate-200">Mês Anterior ({prevMonthStr.split('-').reverse().join('/')})</th>
                                    <th className="p-2 text-right border border-slate-200">Mês Atual ({filterMonth.split('-').reverse().join('/')})</th>
                                    <th className="p-2 text-right border border-slate-200">Diferença (R$)</th>
                                    <th className="p-2 text-center border border-slate-200">Variação (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700 print:text-black">
                                {comparativoCategorias.length > 0 ? comparativoCategorias.map((item, idx) => {
                                    const isAumento = item.diferenca > 0;
                                    const isReducao = item.diferenca < 0;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-2 border border-slate-200 uppercase">{item.cat}</td>
                                            <td className="p-2 text-right border border-slate-200 text-slate-500">{formatMoney(item.anterior)}</td>
                                            <td className="p-2 text-right border border-slate-200 font-black text-slate-800">{formatMoney(item.atual)}</td>
                                            <td className={`p-2 text-right border border-slate-200 font-black ${isAumento ? 'text-red-500' : isReducao ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {isAumento ? '+' : ''}{formatMoney(item.diferenca)}
                                            </td>
                                            <td className="p-2 text-center border border-slate-200">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isAumento ? 'bg-red-50 text-red-600' : isReducao ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {isAumento ? <Icon name="arrow-up" size={10} className="inline mr-0.5"/> : isReducao ? <Icon name="arrow-down" size={10} className="inline mr-0.5"/> : ''}
                                                    {Math.abs(item.variacao).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="5" className="p-4 text-center text-slate-400 uppercase">Sem dados para comparar</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {comparativoCategorias.length > 0 ? comparativoCategorias.map((item, idx) => {
                            const isAumento = item.diferenca > 0;
                            const isReducao = item.diferenca < 0;
                            return (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-2 shadow-sm">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                                        <span className="text-[10px] font-black uppercase text-slate-700">{item.cat}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isAumento ? 'bg-red-100 text-red-700' : isReducao ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {isAumento ? '+' : isReducao ? '-' : ''}{Math.abs(item.variacao).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase text-slate-400">Mês Anterior</span>
                                            <span className="text-slate-500">{formatMoney(item.anterior)}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[8px] uppercase text-slate-400">Mês Atual</span>
                                            <span className="text-slate-800 font-black">{formatMoney(item.atual)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center p-4 text-slate-400 text-[10px] font-black uppercase border-2 border-dashed border-slate-200 rounded-lg">Sem dados para comparar</div>
                        )}
                    </div>
                )}
            </div>

            <div className={`grid ${viewMode === 'app' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4 mt-6`}>
                <div className="glass-card p-5 rounded-xl border border-slate-200 bg-white">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-1.5"><Icon name="crosshair" size={12} /> Radar de Perdas</h3>
                    <div className="space-y-3">
                        <div className={`flex justify-between items-center p-2 rounded border ${cmvRealFinanceiroPercent > LIMITES.cmv ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="text-[10px] font-black uppercase text-slate-600">CMV Excedente</span>
                            <span className={`text-sm font-black ${cmvRealFinanceiroPercent > LIMITES.cmv ? 'text-red-500' : 'text-slate-400'}`}>{formatMoney(perdaCmv)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50/50 rounded border border-red-100">
                            <span className="text-[10px] font-black uppercase text-slate-600">Total Taxas (Cartão)</span>
                            <span className="text-sm font-black text-red-500">{formatMoney(perdaTaxas)}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl space-y-3 print:shadow-none border-t-4 border-t-amber-400">
                    <h3 className="font-black text-slate-800 border-b pb-1.5 flex items-center gap-1.5"><Icon name="star" size={14} className="text-amber-400"/> Top Produtos (Rentabilidade)</h3>
                    
                    {viewMode === 'desktop' ? (
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-collapse border border-slate-200">
                                <thead>
                                    <tr className="bg-slate-50 text-[8px] text-slate-400 font-black print:text-black print:bg-slate-100">
                                        <th className="p-2 border border-slate-200">Produto</th>
                                        <th className="p-2 text-center border border-slate-200">Estrelas</th>
                                        <th className="p-2 text-right border border-slate-200">Custo</th>
                                        <th className="p-2 text-right border border-slate-200">Venda</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-[9px] font-bold text-slate-700 print:text-black">
                                    {[...recipes.map(r=>({...r, _t:'Ficha'})), ...complements.map(c=>({...c, _t:'Extra'})), ...combos.map(c=>({...c, _t:'Combo'}))]
                                        .map(item => {
                                            const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items); 
                                            const sp = p(item.sellingPrice);
                                            return { ...item, cost, sp, cmv: sp > 0 ? (cost/sp)*100 : 0 };
                                        })
                                        .sort((a,b) => a.cmv - b.cmv).slice(0, 8).map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="p-2 border border-slate-200">{item.name}</td>
                                                <td className="p-2 text-center border border-slate-200 text-[10px] tracking-widest">{getStarRating(item.cmv)}</td>
                                                <td className="p-2 text-right border border-slate-200 text-red-500">{formatMoney(item.cost)}</td>
                                                <td className="p-2 text-right border border-slate-200 text-emerald-600">{formatMoney(item.sp)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-2 mt-2">
                            {[...recipes.map(r=>({...r, _t:'Ficha'})), ...complements.map(c=>({...c, _t:'Extra'})), ...combos.map(c=>({...c, _t:'Combo'}))]
                                .map(item => {
                                    const cost = item.ingredients ? calcItemCost(item.ingredients) : calcComboCost(item.items); 
                                    const sp = p(item.sellingPrice);
                                    return { ...item, cost, sp, cmv: sp > 0 ? (cost/sp)*100 : 0 };
                                })
                                .sort((a,b) => a.cmv - b.cmv).slice(0, 8).map((item, i) => (
                                    <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-300">{i+1}</span>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-700 leading-tight">{item.name}</p>
                                                <p className="text-[9px] tracking-widest mt-0.5">{getStarRating(item.cmv)} <span className="text-slate-400 ml-1">({item.cmv.toFixed(0)}%)</span></p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-[12px] font-black text-emerald-600">{formatMoney(item.sp)}</span>
                                            <span className="text-[9px] font-bold text-red-400">Custo: {formatMoney(item.cost)}</span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            </div>

            {/* SIMULADOR */}
            <div id="simulador" className="glass-card p-5 rounded-xl space-y-4 border-l-4 border-emerald-500 bg-emerald-50/30 shadow-md print-hidden-section mt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-emerald-200 pb-2 gap-3">
                    <h3 className="font-black text-slate-800 flex items-center gap-1.5">
                        <span className="text-emerald-600"><Icon name="sliders" size={16}/></span> Simulador de Projeção Real
                    </h3>
                </div>
                <div className={`flex ${viewMode === 'app' ? 'flex-col' : 'flex-row'} gap-4 items-start bg-white p-4 rounded-lg border border-emerald-100`}>
                    <div className="w-full md:w-1/2">
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Média Diária Projetada (R$)</label>
                        <input type="number" className="w-full p-2 border border-slate-300 rounded font-bold text-slate-700 outline-none" placeholder={stats.ticketDiario.toFixed(2)} value={simMediaDiaria} onChange={(e) => setSimMediaDiaria(e.target.value)} />
                    </div>
                    <div className="w-full md:w-1/2 relative">
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">CMV Operacional Estimado (%)</label>
                        <input type="number" className="w-full p-2 border border-slate-300 rounded font-bold text-slate-700 outline-none bg-indigo-50/30" placeholder={LIMITES.cmv} value={simCmv} onChange={(e) => setSimCmv(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div><span className="text-[9px] font-black text-slate-500 block uppercase">Ponto de Equilíbrio</span><h4 className="text-xl font-black text-slate-800 mt-1">{formatMoney(peSimulado)}</h4></div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div><span className="text-[9px] font-black text-slate-500 block uppercase">Dias P/ Empatar</span><h4 className="text-xl font-black text-slate-800 mt-1">{diasEmpateSimulado}</h4></div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center shadow-sm relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div><span className="text-[9px] font-black text-blue-600 block uppercase">Projeção Mês</span><h4 className="text-xl font-black text-blue-800 mt-1">{formatMoney(projFinalSimulada)}</h4></div>
                    <div className={`p-3 rounded-xl border text-center shadow-sm relative overflow-hidden ${lucroFinalSimulado >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-300'}`}><div className={`absolute top-0 left-0 w-1 h-full ${lucroFinalSimulado >= 0 ? 'bg-emerald-600' : 'bg-red-500'}`}></div><span className="text-[9px] font-black text-slate-600 block uppercase">Lucro Final Net</span><h4 className={`text-xl font-black mt-1 ${lucroFinalSimulado >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatMoney(lucroFinalSimulado)}</h4></div>
                </div>
            </div>

        </div>
    );
}

export default RelatorioUnificado;