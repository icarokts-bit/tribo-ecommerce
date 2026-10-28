import React from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney, getTxMonth } from '../../utils/finance';

function APagar({ transactions, accounts, filterMonth, getEffectiveStatus, openLiquidation }) {
    
    // 1. Identifica quais contas são Cartões de Crédito
    const nomesCartoes = accounts.filter(a => a.type === 'cartao').map(a => a.name);

    // 2. Separa as transações normais das faturas consolidadas
    const txsNormais = [];
    const cartoesConsolidados = {};

    // Inicializa o objeto de cartões para evitar erros
    nomesCartoes.forEach(c => {
        cartoesConsolidados[c] = { total: 0, pago: 0, date: null };
    });

    // 3. Processa TODAS as transações (não apenas as do mês de emissão, mas as que VENCEM no mês ou ROLAM para o mês)
    transactions.forEach(t => {
        const txMonth = getTxMonth(t); // Mês de lançamento (compra)
        const clearanceMonth = t.clearanceDate ? t.clearanceDate.substring(0, 7) : txMonth; // Mês de Vencimento
        const isBaixaFatura = t.category && (t.category.toLowerCase() === 'baixa fatura' || t.category.toLowerCase().includes('pagamento de fatura'));
        const isRolagem = t.category && (t.category.toLowerCase() === 'saldo rolado' || t.category.toLowerCase() === 'fatura rolada');

        // LÓGICA DO CARTÃO DE CRÉDITO
        if (isBaixaFatura) {
            // Se for baixa (pagamento) de fatura e bater com o mês de filtro
            if (t.type === 'entrada' && (t.billingMonth === filterMonth || clearanceMonth === filterMonth)) {
                const linkedCard = nomesCartoes.find(c => t.account === c || (t.description && t.description.toUpperCase().includes(c.toUpperCase())));
                if (linkedCard) cartoesConsolidados[linkedCard].pago += p(t.amount);
            }
        } 
        else if (nomesCartoes.includes(t.account)) {
            // É uma despesa no cartão de crédito (compra)
            if (t.type === 'saida') {
                // Soma a fatura se a compra foi no mês de filtro OU se foi um Saldo Rolado que vence no mês do filtro
                if (txMonth === filterMonth || (isRolagem && clearanceMonth === filterMonth)) {
                    cartoesConsolidados[t.account].total += p(t.amount);
                    
                    if (!cartoesConsolidados[t.account].date || (t.clearanceDate && t.clearanceDate > cartoesConsolidados[t.account].date)) {
                        cartoesConsolidados[t.account].date = t.clearanceDate || t.date;
                    }
                }
            }
        } 
        else {
            // Se for conta corrente normal e do mês ativo, entra na lista de despesas normais
            if (t.type === 'saida' && txMonth === filterMonth) {
                if (getEffectiveStatus(t) !== 'pago') {
                    const valorTotal = p(t.amount);
                    const valorJaPago = p(t.valorPago || 0);
                    const restante = valorTotal - valorJaPago;
                    
                    if (restante > 0) {
                        txsNormais.push({ 
                            ...t, 
                            amount: restante, 
                            originalAmount: valorTotal 
                        });
                    }
                }
            }
        }
    });

    // 4. Cria os "Itens Virtuais" representando o saldo devedor exato da fatura
    const faturas = [];
    Object.keys(cartoesConsolidados).forEach(nomeCartao => {
        const { total, pago, date } = cartoesConsolidados[nomeCartao];
        const saldoDevedor = total - pago;
        
        // Só inclui a fatura na aba "A Vencer" se o saldo devedor for maior que zero (5 cêntimos de tolerância)
        if (saldoDevedor > 0.05) {
            faturas.push({
                id: `fatura-${nomeCartao}-${filterMonth}`,
                description: `FATURA - ${nomeCartao}`,
                category: 'Fatura de Cartão',
                account: nomeCartao,
                amount: saldoDevedor, 
                clearanceDate: date || `${filterMonth}-10`, // Padrão dia 10 se não tiver data
                isInvoice: true 
            });
        }
    });

    // 5. Junta as transações normais com as faturas consolidadas
    const todasPendencias = [...txsNormais, ...faturas];

    // 6. Agrupa tudo pelas datas de vencimento (clearanceDate) e soma os totais do dia
    const grouped = todasPendencias.reduce((acc, t) => {
        const date = t.clearanceDate || t.date;
        if (!acc[date]) acc[date] = { total: 0, items: [] };
        acc[date].items.push(t);
        acc[date].total += p(t.amount); 
        return acc;
    }, {});

    // 7. Ordena as datas cronologicamente
    const sortedDates = Object.keys(grouped).sort();

    // 8. Calcula o total geral do mês usando apenas os saldos restantes
    const totalGeral = todasPendencias.reduce((acc, t) => acc + p(t.amount), 0);

    const hojeStr = new Date().toISOString().split('T')[0];

    return (
        <div className="fade-in space-y-4">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                        <Icon name="arrow-up-circle" size={20} className="text-red-500" />
                        Contas a Vencer
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lançamentos pendentes</p>
                </div>
                <div className="text-right bg-red-50 p-2 md:p-3 rounded-xl border border-red-100">
                    <span className="block text-[9px] md:text-[10px] font-black text-red-400 uppercase tracking-widest">Total a Pagar (Mês)</span>
                    <span className="text-lg md:text-xl font-black text-red-600">{formatMoney(totalGeral)}</span>
                </div>
            </div>

            {sortedDates.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center">
                    <Icon name="check-circle" size={40} className="text-emerald-400 mb-3" />
                    <span className="text-sm font-black text-slate-500 uppercase">Tudo limpo!</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Nenhuma conta pendente para este mês.</span>
                </div>
            ) : (
                sortedDates.map(date => {
                    const [y, m, d] = date.split('-');
                    const dataFormatada = `${d}/${m}`;
                    const isAtrasado = date < hojeStr;

                    return (
                        <div key={date} className={`bg-white rounded-2xl shadow-sm border overflow-hidden mb-4 ${isAtrasado ? 'border-red-300 shadow-red-500/10' : 'border-slate-200'}`}>
                            
                            {/* CABEÇALHO DO DIA + TOTAL DO DIA */}
                            <div className={`p-3 flex justify-between items-center border-b ${isAtrasado ? 'bg-red-50 border-red-200' : 'bg-slate-100/50 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded font-black text-xs uppercase ${isAtrasado ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                                        {dataFormatada}
                                    </span>
                                    {isAtrasado && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse flex items-center gap-1"><Icon name="alert-triangle" size={12}/> Atrasado</span>}
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:inline">Total do Dia:</span>
                                    <span className="font-black text-sm text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{formatMoney(grouped[date].total)}</span>
                                </div>
                            </div>

                            {/* LISTA DE ITENS DO DIA */}
                            <div className="divide-y divide-slate-100">
                                {grouped[date].items.map(t => (
                                    <div key={t.id} className={`p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors gap-3 ${t.isInvoice ? 'bg-slate-50 border-l-4 border-l-indigo-400' : ''}`}>
                                        <div className="flex flex-col">
                                            <span className={`font-black uppercase text-[11px] md:text-xs ${t.isInvoice ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                {t.description}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                {t.category} {t.account && !t.isInvoice ? `• ${t.account}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between w-full md:w-auto gap-4 mt-2 md:mt-0">
                                            <span className="font-black text-red-500 text-sm">{formatMoney(p(t.amount))}</span>
                                            
                                            <button 
                                                onClick={() => openLiquidation(t)} 
                                                className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] transition-all shadow-sm flex items-center gap-1.5 border ${
                                                    t.isInvoice 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white' 
                                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                                                }`}
                                            >
                                                <Icon name={t.isInvoice ? "credit-card" : "check-square"} size={14} /> 
                                                {t.isInvoice ? 'Pagar Fatura' : 'Liquidar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default APagar;