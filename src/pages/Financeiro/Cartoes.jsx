import React from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney, getTxMonth, isInvoicePayment } from '../../utils/finance';

function Cartoes({ cardStats, filterMonth, setInvoiceModal, transactions = [] }) {
    return (
        <div className="space-y-4 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardStats.map(card => {
                    // 1. Pega todas as compras deste cartão no mês atual.
                    // ATUALIZAÇÃO: Forçamos a 'Fatura Rolada' a aparecer na lista de compras!
                    const cardTxs = transactions
                        .filter(t => t.account === card.name && getTxMonth(t) === filterMonth && (!isInvoicePayment(t) || t.category === 'Fatura Rolada'))
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                    // 2. Calcula o valor total DA FATURA (Compras + Saldo Rolado do mês passado)
                    const faturaTotal = cardTxs.reduce((acc, t) => t.type === 'saida' ? acc + p(t.amount) : acc - p(t.amount), 0);

                    // 3. Verifica pagamentos e rolagens feitos NESTE mês
                    const faturaPagamentos = transactions.filter(t =>
                        t.account === card.name &&
                        isInvoicePayment(t) &&
                        t.type === 'entrada' &&
                        (t.billingMonth === filterMonth || getTxMonth(t) === filterMonth)
                    );
                    
                    // Separar o dinheiro real que o cliente pagou da "Rolagem Automática"
                    const pagamentosReais = faturaPagamentos.filter(t => !String(t.description).includes('Rolagem'));
                    const pagamentosRolados = faturaPagamentos.filter(t => String(t.description).includes('Rolagem'));

                    const valorPagoReal = pagamentosReais.reduce((acc, t) => acc + p(t.amount), 0);
                    const valorRolado = pagamentosRolados.reduce((acc, t) => acc + p(t.amount), 0);
                    const valorPagoSistema = valorPagoReal + valorRolado;
                    
                    const saldoPendenteReal = faturaTotal - valorPagoReal;
                    const saldoPendenteSistema = faturaTotal - valorPagoSistema;
                    
                    // Margem de 5 cêntimos
                    const isPaga = faturaTotal > 0 && valorPagoSistema >= (faturaTotal - 0.05); 
                    const isParcialmentePaga = valorPagoReal > 0 && valorRolado > 0;

                    return (
                        <div key={card.id} className={`glass-card rounded-xl border p-4 shadow-sm flex flex-col transition-all ${isPaga ? (isParcialmentePaga ? 'bg-orange-50/30 border-orange-200' : 'bg-emerald-50/30 border-emerald-200') : 'bg-white'}`}>
                            {/* CABEÇALHO DA FATURA */}
                            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                                <div className="w-full">
                                    <div className="flex justify-between items-start w-full">
                                        <div>
                                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                                                <Icon name="credit-card" size={12} className={isPaga ? (isParcialmentePaga ? "text-orange-500" : "text-emerald-500") : "text-slate-400"}/> {card.name}
                                            </h3>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Fatura Prevista ({filterMonth})</p>
                                        </div>
                                        
                                        {/* ETIQUETAS DE STATUS DA FATURA */}
                                        {faturaTotal > 0 && (
                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded shadow-sm ${isPaga ? (isParcialmentePaga ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white') : 'bg-orange-100 text-orange-600 border border-orange-200'}`}>
                                                {isPaga ? (isParcialmentePaga ? 'Parcial' : 'Paga') : 'Aberta'}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="mt-2">
                                        <h2 className={`text-2xl font-black leading-none ${isPaga && !isParcialmentePaga ? 'text-emerald-600 line-through opacity-70' : 'text-slate-900'}`}>
                                            {formatMoney(faturaTotal)}
                                        </h2>
                                    </div>
                                    
                                    {/* RESUMO PARCIAL: Exibe os valores se o pagamento não foi integral */}
                                    {isParcialmentePaga && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 border-dashed grid grid-cols-2 gap-2">
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <span className="block text-[8px] font-black text-emerald-600 uppercase">Pago de Fato</span>
                                                <span className="text-xs font-black text-emerald-700">{formatMoney(valorPagoReal)}</span>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <span className="block text-[8px] font-black text-red-500 uppercase">Rolado (Em Aberto)</span>
                                                <span className="text-xs font-black text-red-600">{formatMoney(valorRolado)}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* ALERTA DE PAGAMENTO PARCIAL (Se sobrou saldo sem baixa) */}
                                    {!isPaga && valorPagoReal > 0 && (
                                        <p className="text-[9px] font-black text-orange-500 mt-1 uppercase">Falta pagar: {formatMoney(saldoPendenteReal)}</p>
                                    )}
                                </div>
                            </div>
                            
                            {/* ESCONDE O BOTÃO SE JÁ ESTIVER PAGA OU ROLADA */}
                            {!isPaga && faturaTotal > 0 && (
                                <div className="mb-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setInvoiceModal({ cardName: card.name, total: saldoPendenteSistema > 0 ? saldoPendenteSistema : faturaTotal })} 
                                        className="w-full bg-black text-[#F8CC82] px-3 py-2 rounded-lg font-black uppercase text-[10px] shadow-md hover:bg-slate-800 transition-colors tracking-wider flex items-center justify-center gap-2"
                                    >
                                        <Icon name="check-circle" size={14} /> Dar Baixa na Fatura
                                    </button>
                                </div>
                            )}

                            {/* EXTRATO DETALHADO COMPRA A COMPRA */}
                            <div className="flex-1 flex flex-col">
                                <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1">
                                    <Icon name="list" size={10} /> Extrato Detalhado
                                </h4>
                                
                                {cardTxs.length > 0 ? (
                                    <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                                        {cardTxs.map(tx => (
                                            <div key={tx.id} className={`flex justify-between items-center p-2.5 rounded-lg border transition-colors ${tx.category === 'Fatura Rolada' ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                                                <div className="flex flex-col overflow-hidden mr-2">
                                                    <span className={`text-[10px] font-black uppercase truncate ${tx.category === 'Fatura Rolada' ? 'text-orange-700' : 'text-slate-700'}`} title={tx.description}>
                                                        {tx.description}
                                                    </span>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className={`text-[8px] font-bold bg-white px-1 py-0.5 rounded border ${tx.category === 'Fatura Rolada' ? 'text-orange-500 border-orange-200' : 'text-slate-500 border-slate-200'}`}>
                                                            {tx.date.split('-').reverse().join('/')}
                                                        </span>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase truncate">
                                                            • {tx.category}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <span className={`text-[11px] font-black tracking-tight ${tx.type === 'saida' ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {tx.type === 'saida' ? '-' : '+'}{formatMoney(p(tx.amount))}
                                                    </span>
                                                    {tx.installments > 1 && (
                                                        <span className="block text-[7px] text-slate-400 font-bold uppercase mt-0.5">Parcelado</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Fatura<br/>Zerada</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {cardStats.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Icon name="credit-card" size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 font-black uppercase text-[11px]">Nenhum cartão cadastrado</p>
                        <p className="text-slate-400 font-bold text-[9px] mt-1">Vá à aba Ajustes para adicionar os seus cartões de crédito.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Cartoes;