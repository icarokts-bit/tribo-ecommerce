import React, { useMemo, useEffect } from 'react';
import Icon from '../../components/Icon';

export default function DashboardFin({
    txForm, setTxForm, uniqueDescriptions, accounts, categories, suppliers, cmvSettings,
    filteredDashboard, visibleTxCount, setVisibleTxCount, getEffectiveStatus,
    safeDateDisplay, formatMoney, searchQuery, setSearchQuery, typeFilter, setTypeFilter,
    statusFilter, setStatusFilter, accFilter, setAccFilter, isCatMenuOpen, setIsCatMenuOpen,
    catFilter, setCatFilter, handleSaveTx, executeDelete, deleteConfirmId
}) {
    const totaisFiltrados = useMemo(() => {
        let entradas = 0; let saidas = 0;
        filteredDashboard.forEach(t => {
            const desc = (t.description || "").toLowerCase();
            const cat = (t.category || "").toLowerCase();
            const isInvoice = desc.includes("fatura") || cat.includes("fatura");
            if (isInvoice) return; 
            
            if (t.type === 'entrada') entradas += parseFloat(t.amount || 0);
            if (t.type === 'saida') saidas += parseFloat(t.amount || 0);
        });
        return { entradas, saidas, saldo: entradas - saidas };
    }, [filteredDashboard]);

    // Verifica se a conta selecionada é do tipo 'cartao' (ignora se for transferência)
    const isCreditCardSelected = useMemo(() => {
        if (txForm.type === 'transferencia') return false;
        const selectedAcc = accounts?.find(a => a.name === txForm.acc);
        return selectedAcc && selectedAcc.type === 'cartao';
    }, [txForm.acc, accounts, txForm.type]);

    // Quando não é cartão (ou se mudou para transferência), reseta as parcelas para 1
    useEffect(() => {
        if (!isCreditCardSelected && txForm.inst > 1) {
            setTxForm(prev => ({ ...prev, inst: 1 }));
        }
    }, [isCreditCardSelected, setTxForm, txForm.inst]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-in">
            
            {/* ================= 1. FORMULÁRIO DE LANÇAMENTO ================= */}
            <form onSubmit={handleSaveTx} className="lg:col-span-1 bg-white p-4 rounded-xl space-y-3 border-[3px] border-black h-fit relative">
                {txForm.id && <div className="absolute -top-3 right-4 bg-blue-600 text-white font-black px-2 py-0.5 rounded text-[10px]">A Editar</div>}
                
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {['entrada','saida','transferencia'].map(t => (
                        <button key={t} type="button" onClick={() => setTxForm({...txForm, type: t, feeType:'none', feePercent:0, inst: 1})} 
                            className={`flex-1 py-1.5 rounded-md text-[10px] font-black transition-all ${txForm.type===t ? 'bg-white border-[3px] border-black text-black' : 'text-slate-400 hover:text-slate-600'}`}>
                            {t === 'entrada' ? 'Entrada' : t === 'saida' ? 'Saída' : 'Transferência'}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Descrição</label>
                        <input type="text" list="desc-history" required 
                            className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-700 outline-none focus:border-slate-400" 
                            value={txForm.desc} onChange={e=>setTxForm({...txForm, desc: e.target.value})} />
                        <datalist id="desc-history">{uniqueDescriptions?.map((desc, idx) => <option key={idx} value={desc} />)}</datalist>
                    </div>
                    <div>
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Nº NF</label>
                        <input type="text" placeholder="Ex: 1234" 
                            className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-700 outline-none focus:border-slate-400" 
                            value={txForm.nf || ''} onChange={e=>setTxForm({...txForm, nf: e.target.value})} />
                    </div>
                </div>
                
                {/* GRID ADAPTÁVEL: 3 Colunas para Entrada/Saída, 2 Colunas para Transferência */}
                <div className={`grid gap-2 ${txForm.type === 'transferencia' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    <div>
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">
                            {txForm.type === 'transferencia' ? 'Conta Origem' : 'Conta'}
                        </label>
                        <select className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-900 outline-none focus:border-slate-400" 
                            value={txForm.acc} onChange={e=>setTxForm({...txForm, acc: e.target.value})}>
                            <option value="">Escolha...</option>
                            {accounts?.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Valor</label>
                        <input type="text" placeholder="0,00" required 
                            className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-700 outline-none focus:border-slate-400" 
                            value={txForm.val} onChange={e=>setTxForm({...txForm, val: e.target.value})} />
                    </div>

                    {/* SÓ MOSTRA AS PARCELAS SE NÃO FOR TRANSFERÊNCIA */}
                    {txForm.type !== 'transferencia' && (
                        <div>
                            <label className={`block font-black text-[10px] mb-0.5 ml-1 transition-colors ${isCreditCardSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                Parcelas
                            </label>
                            <input type="number" min="1" 
                                className={`w-full p-2 border rounded-md font-black text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 transition-colors ${isCreditCardSelected ? 'bg-indigo-50 border-indigo-200 focus:border-indigo-400' : 'bg-white border-slate-200'}`} 
                                value={txForm.inst} onChange={e=>setTxForm({...txForm, inst: e.target.value})} 
                                disabled={!isCreditCardSelected} 
                                title={isCreditCardSelected ? "Introduza a quantidade de parcelas" : "Selecione um cartão de crédito para ativar as parcelas"}
                            />
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    {txForm.type === 'transferencia' ? (
                        <div>
                            <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Conta Destino</label>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-900 outline-none focus:border-slate-400" 
                                value={txForm.destAcc} onChange={e=>setTxForm({...txForm, destAcc: e.target.value})}>
                                <option value="">Escolha...</option>
                                {accounts?.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Categoria</label>
                            <select className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-900 outline-none focus:border-slate-400" 
                                value={txForm.cat} onChange={e=>setTxForm({...txForm, cat: e.target.value})}>
                                <option value="">Escolha...</option>
                                {categories?.sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Fornecedor</label>
                        <select className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100" 
                            value={txForm.sup} onChange={e=>setTxForm({...txForm, sup: e.target.value})} disabled={txForm.type==='transferencia'}>
                            <option value="">Escolha...</option>
                            {suppliers?.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                
                {txForm.type === 'entrada' && (
                    <div className="bg-[#f0fdf4] border-[2px] border-[#bbf7d0] p-2.5 rounded-lg text-[9px] mt-1">
                        <label className="font-black text-[#065f46] flex items-center gap-1 mb-2">AUTO TAXAR LANÇAMENTO?</label>
                        <div className="flex gap-1.5">
                            <button type="button" onClick={() => setTxForm({...txForm, feeType: 'none', feePercent: 0})} 
                                className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all ${txForm.feeType === 'none' ? 'bg-[#10b981] text-white border-2 border-[#10b981]' : 'bg-white text-slate-700 border-2 border-slate-200'}`}>Não</button>
                            <button type="button" onClick={() => setTxForm({...txForm, feeType: 'debito', feePercent: cmvSettings?.taxaDebito})} 
                                className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all ${txForm.feeType === 'debito' ? 'bg-[#10b981] text-white border-2 border-[#10b981]' : 'bg-white text-slate-700 border-2 border-slate-200'}`}>Débito</button>
                            <button type="button" onClick={() => setTxForm({...txForm, feeType: 'credito', feePercent: cmvSettings?.taxaCredito})} 
                                className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all ${txForm.feeType === 'credito' ? 'bg-[#10b981] text-white border-2 border-[#10b981]' : 'bg-white text-slate-700 border-2 border-slate-200'}`}>Crédito</button>
                            <button type="button" onClick={() => setTxForm({...txForm, feeType: 'custom', feePercent: ''})} 
                                className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all ${txForm.feeType === 'custom' ? 'bg-[#10b981] text-white border-2 border-[#10b981]' : 'bg-white text-slate-700 border-2 border-slate-200'}`}>Outro</button>
                        </div>
                        {txForm.feeType === 'custom' && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] font-black text-[#065f46]">Qual a porcentagem (%)?</span>
                                <input type="number" step="0.01" className="p-1.5 bg-white border-2 border-[#bbf7d0] rounded-md text-[10px] font-bold w-16 outline-none text-center text-slate-800" 
                                    value={txForm.feePercent} onChange={e => setTxForm({...txForm, feePercent: e.target.value})} placeholder="%" />
                            </div>
                        )}
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 mt-1 relative">
                    <div>
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Data Lanç.</label>
                        <input type="date" className="w-full p-2 bg-white border border-slate-200 rounded-md font-black text-slate-700 outline-none focus:border-slate-400" 
                            value={txForm.date} onChange={e=>setTxForm({...txForm, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-slate-400 block font-black text-[10px] mb-0.5 ml-1">Vencimento</label>
                        <input type="date" className={`w-full p-2 bg-white border rounded-md font-black text-slate-700 outline-none transition-all ${txForm.acc && txForm.acc.toUpperCase().includes('C6') ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 focus:border-slate-400'}`}
                            value={txForm.clearance} onChange={e=>setTxForm({...txForm, clearance: e.target.value})} />
                    </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                    <button type="button" onClick={()=>setTxForm({...txForm, status: 'pago'})} 
                        className={`flex-1 p-2.5 rounded-md font-black transition-all ${txForm.status==='pago'?'bg-[#22c55e] text-white border-[3px] border-transparent':'bg-white text-slate-400 border-[3px] border-slate-100 hover:border-slate-200'}`}>Pago</button>
                    <button type="button" onClick={()=>setTxForm({...txForm, status: 'pendente'})} 
                        className={`flex-1 p-2.5 rounded-md font-black transition-all ${txForm.status==='pendente'?'bg-[#f97316] text-white border-[3px] border-transparent':'bg-white text-slate-400 border-[3px] border-slate-100 hover:border-slate-200'}`}>Pendente</button>
                </div>
                
                <button className="w-full bg-black text-[#F8CC82] p-3 rounded-md font-black text-[11px] mt-2 hover:bg-slate-900 transition-all border-[3px] border-black">Gravar Movimentação</button>
            </form>

            {/* ================= 2. ESPAÇO PARA O HISTÓRICO (LADO DIREITO) ================= */}
            <div className="lg:col-span-2 glass-card rounded-xl shadow-sm h-[550px] flex flex-col border overflow-hidden">
                <div className="p-3 bg-slate-50 border-b space-y-2 relative">
                    <div className="relative">
                        <Icon name="search" size={14} className="absolute left-3 top-2.5 text-slate-300" />
                        <input type="text" placeholder="Pesquisar histórico..." className="w-full pl-9 pr-3 py-2 bg-white border rounded-xl font-bold outline-none text-[10px]" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative">
                        <select className="p-1.5 border rounded-lg font-black text-[9px] outline-none" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="todos">Tipo: Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="transferencia">Transferências</option></select>
                        <select className="p-1.5 border rounded-lg font-black text-[9px] outline-none" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="todos">Status: Todos</option><option value="pago">Pagos</option><option value="pendente">Pendentes</option></select>
                        <select className="p-1.5 border rounded-lg font-black text-[9px] outline-none" value={accFilter} onChange={e=>setAccFilter(e.target.value)}><option value="todas">Conta: Todas</option>{accounts?.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}</select>
                        
                        {/* MENU MULTI-SELEÇÃO DE CATEGORIAS AJUSTADO */}
                        <div className="relative">
                            <button type="button" onClick={() => setIsCatMenuOpen(!isCatMenuOpen)} className="w-full p-1.5 border rounded-lg font-black text-[9px] bg-white text-left flex justify-between items-center h-full">
                                <span className="truncate">{catFilter.length === 0 ? 'Cat: Todas' : `${catFilter.length} Selecionadas`}</span>
                                <Icon name="arrow-down" size={12} />
                            </button>
                            {isCatMenuOpen && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white border rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto p-2 flex flex-col gap-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black cursor-pointer p-1.5 hover:bg-slate-50 rounded whitespace-nowrap">
                                        <input type="checkbox" checked={catFilter.length === 0} onChange={() => setCatFilter([])} className="accent-[#F27A18] shrink-0" /> 
                                        <span>Todas as Categorias</span>
                                    </label>
                                    <hr className="my-1 border-slate-200"/>
                                    {categories?.sort((a,b)=>a.name.localeCompare(b.name)).map(c => (
                                        <label key={c.id} className="flex items-center gap-2 text-[9px] font-black cursor-pointer p-1.5 hover:bg-slate-50 rounded overflow-hidden">
                                            <input type="checkbox" checked={catFilter.includes(c.name)} onChange={(e) => {
                                                if(e.target.checked) setCatFilter([...catFilter, c.name]);
                                                else setCatFilter(catFilter.filter(x => x !== c.name));
                                            }} className="accent-[#F27A18] shrink-0" /> 
                                            <span className="truncate whitespace-nowrap">{c.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* BARRA DE TOTAIS */}
                    <div className="flex justify-between items-center bg-[#1A202C] text-white p-2 rounded-lg shadow-inner mt-2">
                        <span className="text-[9px] font-black text-slate-400 tracking-widest">Totais Filtrados:</span>
                        <div className="flex gap-4">
                            <span className="text-[10px] font-black text-green-400">In: {formatMoney(totaisFiltrados.entradas)}</span>
                            <span className="text-[10px] font-black text-red-400">Out: -{formatMoney(totaisFiltrados.saidas)}</span>
                            <span className="text-[10px] font-black text-white ml-2">Total: {formatMoney(totaisFiltrados.saldo)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar divide-y" onClick={() => isCatMenuOpen && setIsCatMenuOpen(false)}>
                    {filteredDashboard?.slice(0, visibleTxCount).map(t => {
                        const effectiveStatus = getEffectiveStatus(t);
                        return (
                            <div key={t.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center font-black text-[9px] ${t.type === 'entrada' ? 'bg-green-100 text-green-700' : (t.type === 'transferencia' ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-600')}`}>
                                        {t.type === 'entrada' ? 'IN' : (t.type === 'transferencia' ? 'TR' : 'OUT')}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-[11px] leading-none">{t.description}</p>
                                            {t.nf && <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border">NF: {t.nf}</span>}
                                            <span className={`status-badge ${effectiveStatus==='pago'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>
                                                {effectiveStatus === 'pago' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </div>
                                        <p className="font-bold text-slate-400 mt-1 text-[8px]">Lanç: {safeDateDisplay(t.date)} | Venc: {safeDateDisplay(t.clearanceDate)} | {t.account} | {t.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-800">{formatMoney(t.amount)}</p>
                                    <div className="flex gap-1 items-center">
                                        <button type="button" onClick={() => {
                                            setTxForm({ desc: t.description || '', val: t.amount?.toString() || '', type: t.type, acc: t.account || '', destAcc: t.destinationAccount || '', cat: t.category || '', sup: t.supplier || '', date: t.date || '', clearance: t.clearanceDate || '', status: t.status, inst: t.installments || 1, feeType: t.feeType || 'none', feePercent: t.feePercent || 0, nf: t.nf || '' });
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }} className="text-amber-500 font-black text-[8px] bg-slate-100 px-2 py-1.5 rounded hover:bg-amber-100 transition-all">Duplicar</button>
                                        <button type="button" onClick={()=>{setTxForm({id:t.id, desc:t.description||'', val:t.amount?.toString()||'', type:t.type, acc:t.account||'', destAcc:t.destinationAccount||'', cat:t.category||'', sup:t.supplier||'', date:t.date||'', clearance:t.clearanceDate||'', status:t.status, inst:t.installments || 1, feeType: t.feeType || 'none', feePercent: t.feePercent || 0, nf: t.nf || ''}); window.scrollTo({top:0, behavior:'smooth'});}} className="text-blue-500 font-black text-[8px] bg-slate-100 px-2 py-1.5 rounded hover:bg-blue-100">Editar</button>
                                        <button type="button" onClick={() => executeDelete('transactions', t.id)} className={`transition-all px-2 py-1.5 font-black text-[8px] rounded ${deleteConfirmId === t.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                                            {deleteConfirmId === t.id ? "Sim" : "Excluir"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredDashboard?.length > visibleTxCount && (
                        <button type="button" onClick={() => setVisibleTxCount(prev => prev + 15)} className="w-full p-3 bg-slate-50 text-slate-500 font-black text-[9px] hover:bg-slate-100">Carregar Mais Histórico (+{filteredDashboard.length - visibleTxCount})</button>
                    )}
                </div>
            </div>
        </div>
    );
}