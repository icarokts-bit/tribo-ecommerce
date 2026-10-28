import React, { useMemo } from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney } from '../../utils/finance';

function Saldos({ accounts, transactions, getEffectiveStatus }) {
    
    // 1. Limpa os duplicados "fantasmas" da base de dados antes de processar
    const uniqueAccounts = useMemo(() => {
        const map = new Map();
        (accounts || []).forEach(acc => {
            if (acc.name && !map.has(acc.name.trim().toLowerCase())) {
                map.set(acc.name.trim().toLowerCase(), acc);
            }
        });
        return Array.from(map.values());
    }, [accounts]);

    // 2. Calcula os saldos unificando nomes maiúsculos/minúsculos (Normalização Forte)
    const accountBalances = useMemo(() => {
        const bal = {}; 
        
        // Inicializa as contas
        uniqueAccounts.forEach(a => {
            const key = a.name.trim().toLowerCase();
            bal[key] = 0;
        });
        
        // Soma todos os lançamentos ignorando maiúsculas e espaços extras
        transactions.forEach(t => {
            if (getEffectiveStatus(t) === 'pago') {
                const amt = p(t.amount);
                
                if (t.account) {
                    const accKey = String(t.account).trim().toLowerCase();
                    if (t.type === 'entrada') bal[accKey] = (bal[accKey] || 0) + amt;
                    else if (t.type === 'saida') bal[accKey] = (bal[accKey] || 0) - amt;
                    else if (t.type === 'transferencia') bal[accKey] = (bal[accKey] || 0) - amt; 
                }
                
                if (t.type === 'transferencia' && t.destinationAccount) {
                    const destKey = String(t.destinationAccount).trim().toLowerCase();
                    bal[destKey] = (bal[destKey] || 0) + amt; 
                }
            }
        });
        return bal;
    }, [transactions, uniqueAccounts, getEffectiveStatus]);

    // 3. Calcula o património total usando a chave normalizada
    const totalPatrimony = useMemo(() => 
        uniqueAccounts.filter(a => a.type === 'corrente')
        .reduce((acc, a) => acc + (accountBalances[(a.name||'').trim().toLowerCase()] || 0), 0)
    , [uniqueAccounts, accountBalances]);

    return (
        <div className="space-y-4 fade-in">
            <div className="stat-banner !border-black !bg-[#D97757] p-5 rounded-xl text-center"><p className="font-black uppercase tracking-wider mb-1 text-white opacity-80">Patrimônio Líquido Disponível em Caixa</p><h3 className="text-3xl font-black text-white">{formatMoney(totalPatrimony)}</h3></div>
            
            <div className="space-y-3">
                <h2 className="font-black uppercase text-slate-800 border-b-2 pb-1.5 flex items-center gap-1.5"><Icon name="star" size={14} className="text-[#D97757]" /> Contas Principais</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {uniqueAccounts.filter(a => a.type === 'corrente' && ['MERCADO PAGO', 'C6 BANK', 'IFOOD', 'CAIXA LOJA'].includes((a.name||'').trim().toUpperCase())).map(acc => {
                        const bal = accountBalances[(acc.name||'').trim().toLowerCase()] || 0;
                        return (
                        <div key={acc.id || acc.name} className="glass-card p-4 rounded-xl border-l-4 border-[#F27A18] flex flex-col justify-center items-center bg-orange-50/30">
                            <span className="font-black text-slate-500 uppercase tracking-widest text-[9px]">{acc.name}</span>
                            <h3 className={"text-xl font-black mt-1 " + (bal>=0?'text-slate-900':'text-red-500')}>{formatMoney(bal)}</h3>
                        </div>
                    )})}
                </div>
            </div>
            
            <div className="space-y-3">
                <h2 className="font-black uppercase text-slate-800 border-b-2 pb-1.5 flex items-center gap-1.5"><Icon name="trending-up" size={14} className="text-emerald-600" /> Fundos & Aplicações</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {uniqueAccounts.filter(a => a.type === 'corrente' && ['FUNDO', 'APLICAÇÃO', 'APLICACAO', 'INVESTIMENTO', 'RESERVA', 'POUPANÇA', 'POUPANCA'].some(k => (a.name||'').toUpperCase().includes(k)) && !['MERCADO PAGO', 'C6 BANK', 'IFOOD', 'CAIXA LOJA'].includes((a.name||'').trim().toUpperCase())).map(acc => {
                        const bal = accountBalances[(acc.name||'').trim().toLowerCase()] || 0;
                        return (
                        <div key={acc.id || acc.name} className="glass-card p-4 rounded-xl border-l-4 border-emerald-500 flex flex-col justify-center items-center bg-emerald-50/20">
                            <span className="font-black text-slate-500 uppercase tracking-widest text-[9px]">{acc.name}</span>
                            <h3 className={"text-lg font-black mt-1 " + (bal>=0?'text-emerald-700':'text-red-500')}>{formatMoney(bal)}</h3>
                        </div>
                    )})}
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="font-black uppercase text-slate-800 border-b-2 pb-1.5 flex items-center gap-1.5"><Icon name="wallet" size={14} className="text-slate-500" /> Outras Contas Operacionais</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {uniqueAccounts.filter(a => a.type === 'corrente' && !['MERCADO PAGO', 'C6 BANK', 'IFOOD', 'CAIXA LOJA'].includes((a.name||'').trim().toUpperCase()) && !['FUNDO', 'APLICAÇÃO', 'APLICACAO', 'INVESTIMENTO', 'RESERVA', 'POUPANÇA', 'POUPANCA'].some(k => (a.name||'').toUpperCase().includes(k))).map(acc => {
                        const bal = accountBalances[(acc.name||'').trim().toLowerCase()] || 0;
                        return (
                        <div key={acc.id || acc.name} className="glass-card p-4 rounded-xl border-l-4 border-[#1A202C] flex flex-col justify-center items-center">
                            <span className="font-black text-slate-400 uppercase tracking-widest text-[9px]">{acc.name}</span>
                            <h3 className={"text-base font-black mt-1 " + (bal>=0?'text-slate-800':'text-red-500')}>{formatMoney(bal)}</h3>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
}

export default Saldos;