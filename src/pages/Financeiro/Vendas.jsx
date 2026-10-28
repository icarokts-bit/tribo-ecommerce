import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from '../../components/Icon';
import { p, formatMoney } from '../../utils/finance';
import { db } from '../../firebase';

const DailyInput = React.memo(({ dateStr, field, initialValue, activeUid, className, placeholder }) => {
    const [val, setVal] = useState(initialValue || '');
    useEffect(() => { setVal(initialValue || ''); }, [initialValue]);
    
    const handleBlur = () => {
        if (val !== (initialValue || '')) {
            db.collection(`artifacts/tribo-burger-financeiro/users/${activeUid}/dailyRecords`)
              .doc(dateStr)
              .set({[field]: val}, {merge:true});
        }
    };
    
    return (
        <input 
            className={`w-full min-w-[80px] min-h-[36px] bg-transparent outline-none text-right md:text-center font-bold px-2 md:px-0 text-slate-700 focus:bg-emerald-50 focus:text-emerald-700 transition-colors ${className || ''}`} 
            value={val} 
            onChange={e => setVal(e.target.value)} 
            onBlur={handleBlur} 
            placeholder={placeholder || "0"} 
        />
    );
});

function Vendas({ stats, newDayDate, setNewDayDate, user, salesDays, dailyRecords, columnTotals, openDailyLaunch, reopenDailyLaunch, paymentMethods, cmvSettings }) {
    
    const [filtroDiaSemana, setFiltroDiaSemana] = useState('todos');
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    
    const bottomRef = useRef(null);
    const tableScrollRef = useRef(null);
    
    // Estados do formulário de Nova/Edição de Forma de Recebimento
    const [editingMethodId, setEditingMethodId] = useState(null);
    const [methodName, setMethodName] = useState('');
    const [feeType, setFeeType] = useState('percent');
    const [taxVal, setTaxVal] = useState('');
    const [settlementType, setSettlementType] = useState('next_business_day');
    const [delay, setDelay] = useState('0');
    const [closeDay, setCloseDay] = useState('0');
    const [payDay, setPayDay] = useState('3');
    
    const [showOnMenu, setShowOnMenu] = useState(true);
    const [maquina, setMaquina] = useState(''); 
    
    // NOVO: Estado para controlar se lança no "A Receber"
    const [lancaAReceber, setLancaAReceber] = useState(true);

    const [funcionarios, setFuncionarios] = useState([]);

    // ESTADOS DO ACERTO DE MOTOQUEIRO AUTOMÁTICO
    const [isAcertoModalOpen, setIsAcertoModalOpen] = useState(false);
    const [acertoDate, setAcertoDate] = useState('');
    const [acertoMotoqueiro, setAcertoMotoqueiro] = useState('');
    
    const [carregandoAcerto, setCarregandoAcerto] = useState(false);
    const [acertoResultados, setAcertoResultados] = useState([]);

    useEffect(() => {
        if (!user) return;
        const unsub = db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/funcionarios`)
            .onSnapshot(snap => {
                setFuncionarios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsub();
    }, [user]);

    const scrollTable = (direction) => {
        if (tableScrollRef.current) {
            const scrollAmount = 350; 
            tableScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const handleDeleteDay = async (dateStr) => {
        const formattedDate = dateStr.split('-').reverse().join('/');
        if (window.confirm(`Tem certeza absoluta que deseja excluir TODOS os lançamentos do dia ${formattedDate}? Essa ação não pode ser desfeita.`)) {
            try {
                await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/dailyRecords`).doc(dateStr).delete();
            } catch (error) {
                alert("Erro ao excluir o dia: " + error.message);
            }
        }
    };

    const handleAddMethod = async () => {
        if (!methodName || !user) return alert("Preencha o nome da forma de recebimento!");
        
        const methodId = editingMethodId || (methodName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now());
        const newMethod = {
            id: methodId,
            name: methodName,
            feeType,
            tax: parseFloat(taxVal) || 0,
            settlementType,
            delay: parseInt(delay) || 0,
            closeDay: parseInt(closeDay) || 0,
            payDay: parseInt(payDay) || 0,
            maquina, 
            showOnMenu,
            lancaAReceber // NOVO: Salva a configuração de A Receber
        };

        let updated;
        if (editingMethodId) {
            updated = (paymentMethods || []).map(m => m.id === editingMethodId ? newMethod : m);
        } else {
            updated = [...(paymentMethods || []), newMethod];
        }

        await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/settings`).doc('paymentMethods').set({ methods: updated }, { merge: true });
        
        setMethodName(''); setTaxVal(''); setDelay('0'); setMaquina(''); setShowOnMenu(true); setLancaAReceber(true); setEditingMethodId(null);
    };

    const handleEditMethod = (m) => {
        setEditingMethodId(m.id);
        setMethodName(m.name);
        setFeeType(m.feeType || 'percent');
        setTaxVal(m.tax || '');
        setSettlementType(m.settlementType || 'days');
        setDelay(m.delay || '0');
        setCloseDay(m.closeDay || '0');
        setPayDay(m.payDay || '3');
        setMaquina(m.maquina || '');
        setShowOnMenu(m.showOnMenu !== false); 
        setLancaAReceber(m.lancaAReceber !== false); // NOVO: Lê a configuração
    };

    const handleDeleteMethod = async (idToRemove) => {
        if (!user || !window.confirm("Deseja realmente excluir esta forma de recebimento?")) return;
        const updated = paymentMethods.filter(m => m.id !== idToRemove);
        await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/settings`).doc('paymentMethods').set({ methods: updated }, { merge: true });
        
        if (editingMethodId === idToRemove) {
            setMethodName(''); setTaxVal(''); setDelay('0'); setMaquina(''); setShowOnMenu(true); setLancaAReceber(true); setEditingMethodId(null);
        }
    };

    const moveColumn = async (index, direction) => {
        if (!user || !paymentMethods) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= paymentMethods.length) return;
        
        const newMethods = [...paymentMethods];
        const temp = newMethods[index];
        newMethods[index] = newMethods[newIndex];
        newMethods[newIndex] = temp;
        
        await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/settings`).doc('paymentMethods').set({ methods: newMethods }, { merge: true });
    };

    // ==========================================
    // FUNÇÕES DO ACERTO AUTOMÁTICO
    // ==========================================
    const openAcertoModal = (dateStr) => {
        setAcertoDate(dateStr);
        setAcertoMotoqueiro('');
        setAcertoResultados([]);
        setIsAcertoModalOpen(true);
    };

    const buscarPedidosMotoqueiro = async () => {
        if (!acertoMotoqueiro) return alert("Selecione um motoqueiro primeiro.");
        setCarregandoAcerto(true);
        setAcertoResultados([]);
        
        try {
            const snap = await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_orders`)
                                 .orderBy('createdAt', 'desc')
                                 .limit(300)
                                 .get();
            
            const orders = snap.docs.map(doc => doc.data());
            
            const filtered = orders.filter(o => {
                if (o.motoqueiro !== acertoMotoqueiro) return false;
                if (!o.createdAt || !o.createdAt.startsWith(acertoDate)) return false;
                return true;
            });
            
            if (filtered.length === 0) {
                alert(`Nenhuma entrega encontrada para ${acertoMotoqueiro} na data selecionada.`);
                setCarregandoAcerto(false);
                return;
            }

            const grouped = {};
            filtered.forEach(o => {
                const pm = o.paymentMethod || 'Não Informado';
                if (!grouped[pm]) grouped[pm] = 0;
                grouped[pm] += (Number(o.total) || 0);
            });

            const results = Object.keys(grouped).map(pmName => {
                const matched = (paymentMethods || []).find(m => m.name.toLowerCase() === pmName.toLowerCase());
                return {
                    originalName: pmName,
                    mappedId: matched ? matched.id : '',
                    total: grouped[pmName]
                };
            });

            setAcertoResultados(results);

        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
            alert("Erro ao buscar os pedidos.");
        }
        setCarregandoAcerto(false);
    };

    const handleMapChange = (originalName, newMappedId) => {
        setAcertoResultados(prev => prev.map(r => r.originalName === originalName ? { ...r, mappedId: newMappedId } : r));
    };

    const confirmAcertoAutomatico = async () => {
        if (acertoResultados.some(r => !r.mappedId && r.total > 0)) {
            return alert("Atenção: Você precisa selecionar em qual coluna/máquina deseja lançar cada um dos valores.");
        }

        const r = dailyRecords[acertoDate] || {};
        let updates = {};
        let totalSomado = 0;

        acertoResultados.forEach(res => {
            if (res.total > 0 && res.mappedId) {
                const currentVal = p(r[res.mappedId]);
                updates[res.mappedId] = (updates[res.mappedId] || currentVal) + res.total;
                totalSomado += res.total;
            }
        });

        if (totalSomado === 0) return alert("Nenhum valor novo para lançar.");

        try {
            await db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/dailyRecords`)
                .doc(acertoDate)
                .set(updates, { merge: true });

            alert(`Acerto Automático de R$ ${formatMoney(totalSomado)} concluído e lançado no caixa do dia!`);
            setIsAcertoModalOpen(false);
        } catch (error) {
            alert("Erro ao lançar acerto no caixa: " + error.message);
        }
    };


    const refDateStr = newDayDate || new Date().toISOString().split('T')[0];
    const [refYear, refMonth] = refDateStr.split('-').map(Number);
    const wDaysConfig = cmvSettings?.workingDays?.length > 0 ? cmvSettings.workingDays : [0, 1, 2, 3, 4, 5, 6];

    const { diasTrabalhados, diasRestantes, totalDiasOperacao } = useMemo(() => {
        let totais = 0;
        const lastDay = new Date(refYear, refMonth, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const wd = new Date(refYear, refMonth - 1, d).getDay();
            if (wDaysConfig.includes(wd)) totais++;
        }
        const trabalhados = salesDays.length; 
        const restantes = Math.max(0, totais - trabalhados);
        return { diasTrabalhados: trabalhados, diasRestantes: restantes, totalDiasOperacao: totais };
    }, [refYear, refMonth, salesDays.length, wDaysConfig]);

    const diasDaSemanaAbrev = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasLabel = wDaysConfig.length === 7 ? "(Todos os Dias)" : `(${[...wDaysConfig].sort().map(d => diasDaSemanaAbrev[d]).join(', ')})`;

    const diasFiltrados = useMemo(() => {
        if (filtroDiaSemana === 'todos') return salesDays;
        return salesDays.filter(d => {
            const [year, month, day] = d.split('-');
            const dateObj = new Date(year, month - 1, day);
            return dateObj.getDay().toString() === filtroDiaSemana;
        });
    }, [salesDays, filtroDiaSemana]);

    const totaisFiltrados = useMemo(() => {
        const totais = { totalDia: 0, pedidos: 0, clientesNovos: 0 };
        (paymentMethods || []).forEach(m => totais[m.id] = 0);

        diasFiltrados.forEach(d => {
            const r = dailyRecords[d] || {};
            let totalDia = 0;
            (paymentMethods || []).forEach(m => {
                const val = p(r[m.id]);
                totalDia += val;
                totais[m.id] += val;
            });
            totais.totalDia += totalDia;
            totais.pedidos += p(r.qtdPedidos);
            totais.clientesNovos += p(r.clientesNovos);
        });
        return totais;
    }, [diasFiltrados, dailyRecords, paymentMethods]);

    return (
        <div className="space-y-4 fade-in">
            {/* WIDGETS DO TOPO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stat-banner !border-emerald-200 !bg-emerald-50 p-4 rounded-xl text-center shadow-sm">
                    <p className="font-black uppercase tracking-wider text-emerald-600 mb-1">Faturamento Bruto Acumulado</p>
                    <h3 className="text-2xl font-black text-emerald-900">{formatMoney(stats.rb)}</h3>
                </div>
                <div className="stat-banner !border-slate-800 !bg-slate-900 p-4 rounded-xl text-center shadow-sm">
                    <p className="font-black uppercase tracking-wider text-slate-400 mb-1">Taxas de Operação Retidas (Máquinas)</p>
                    <h3 className="text-2xl font-black text-red-400">-{formatMoney(stats.autoCardFees)}</h3>
                </div>
            </div>
            
            {/* BARRA DE FERRAMENTAS */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-2xl border shadow-sm gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-2">
                        <Icon name="calendar-days" className="text-emerald-500" />
                        <h2 className="font-black uppercase tracking-widest text-[11px] md:text-sm text-slate-700">Caixa Diário</h2>
                    </div>
                    
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-sm flex flex-col items-center md:ml-4">
                        <h3 className="text-[#F8CC82] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Icon name="calendar" size={12} /> Dias de Operação {diasLabel}
                        </h3>
                        <div className="flex items-center text-center divide-x divide-slate-700/80">
                            <div className="px-4 flex flex-col items-center">
                                <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">Trabalhados</span>
                                <span className="text-xl font-black text-emerald-400 leading-none my-1">{diasTrabalhados}</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400">De {totalDiasOperacao} Dias</span>
                            </div>
                            <div className="px-4 flex flex-col items-center">
                                <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">Restantes</span>
                                <span className="text-xl font-black text-amber-500 leading-none my-1">{diasRestantes}</span>
                                <span className="text-[8px] font-bold uppercase text-slate-400">No Mês</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="flex bg-slate-100 border border-slate-200 rounded-xl shadow-sm">
                        <button type="button" onClick={() => scrollTable('left')} className="p-2 px-3 text-slate-500 hover:text-emerald-600 hover:bg-white border-r border-slate-200 transition-colors rounded-l-xl"><Icon name="chevron-left" size={14} /></button>
                        <button type="button" onClick={() => scrollTable('right')} className="p-2 px-3 text-slate-500 hover:text-emerald-600 hover:bg-white transition-colors rounded-r-xl"><Icon name="chevron-right" size={14} /></button>
                    </div>

                    <button type="button" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} className="w-full md:w-auto bg-slate-100 border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-white hover:border-emerald-300 px-4 py-2 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-sm">
                        <Icon name="arrow-down" size={14} /> Ir p/ Final
                    </button>

                    <button 
                        onClick={() => {
                            setEditingMethodId(null);
                            setMethodName(''); setTaxVal(''); setDelay('0'); setMaquina(''); setShowOnMenu(true); setLancaAReceber(true);
                            setIsConfigModalOpen(true);
                        }}
                        className="w-full md:w-auto bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 px-4 py-2 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        <Icon name="settings" size={14} /> Formas de Recebimento
                    </button>

                    <div className="w-full md:w-auto flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden pr-2">
                        <div className="bg-slate-200 px-3 py-2 flex items-center justify-center text-slate-500"><Icon name="filter" size={14} /></div>
                        <select value={filtroDiaSemana} onChange={(e) => setFiltroDiaSemana(e.target.value)} className="bg-transparent border-none text-[11px] font-black uppercase text-slate-700 p-2 outline-none w-full md:w-auto cursor-pointer focus:ring-0">
                            <option value="todos">Todos os Dias</option><option value="0">Domingos</option><option value="1">Segundas</option><option value="2">Terças</option><option value="3">Quartas</option><option value="4">Quintas</option><option value="5">Sextas</option><option value="6">Sábados</option>
                        </select>
                    </div>

                    <div className="flex w-full md:w-auto items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <input type="date" className="font-bold bg-transparent outline-none border-0 text-[10px] md:text-sm flex-1 md:flex-none text-slate-700" value={newDayDate} onChange={e=>setNewDayDate(e.target.value)} />
                        <button type="button" onClick={()=>db.collection(`artifacts/tribo-burger-financeiro/users/${user.uid}/dailyRecords`).doc(newDayDate).set({initialized:true},{merge:true})} className="bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-lg font-black uppercase text-[10px] md:text-sm whitespace-nowrap hover:bg-black transition-colors shadow-sm">Abrir Dia</button>
                    </div>
                </div>
            </div>
            
            {/* TABELA DINÂMICA */}
            <div ref={tableScrollRef} className="glass-card rounded-xl overflow-hidden border border-slate-200 shadow-sm overflow-x-auto no-scrollbar bg-white">
                <table className="w-full text-center min-w-max whitespace-nowrap tabela-app">
                    <thead className="bg-slate-900 text-white uppercase text-[9px] border-b hidden md:table-header-group">
                        <tr>
                            <th className="p-3 md:sticky left-0 z-20 bg-slate-900 min-w-[140px]">Data Caixa</th>
                            <th className="p-3 bg-amber-500 text-black">Total Dia</th>
                            <th className="p-3 bg-blue-600 text-white">Pedidos</th>
                            <th className="p-3 bg-fuchsia-600 text-white">Clientes Novos</th>
                            <th className="p-3 bg-blue-800 text-white">Ticket Médio</th>
                            <th className="p-3 bg-emerald-600 text-white">Ação</th>
                            
                            {(paymentMethods || []).map((m, index) => (
                                <th key={m.id} className="p-1 border-l border-slate-700 min-w-[130px] group transition-all">
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={() => moveColumn(index, -1)} className={`p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer ${index === 0 ? 'invisible' : 'opacity-30 group-hover:opacity-100'}`}><Icon name="chevron-left" size={14} /></button>
                                        <span className="truncate flex-1">{m.name}</span>
                                        <button type="button" onClick={() => moveColumn(index, 1)} className={`p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer ${index === paymentMethods.length - 1 ? 'invisible' : 'opacity-30 group-hover:opacity-100'}`}><Icon name="chevron-right" size={14} /></button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-[10px]">
                        {diasFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={6 + (paymentMethods?.length || 0)} className="p-8 text-center text-slate-400 uppercase font-black text-xs md:table-cell hidden">Nenhum dia encontrado para este filtro.</td>
                                <div className="p-8 text-center text-slate-400 uppercase font-black text-xs md:hidden block">Nenhum dia encontrado.</div>
                            </tr>
                        ) : (
                            diasFiltrados.map(d => {
                                const r = dailyRecords[d] || {}; 
                                
                                let totalDia = 0;
                                let hasValuesToLaunch = false;
                                
                                (paymentMethods || []).forEach(m => {
                                    const val = p(r[m.id]);
                                    totalDia += val;
                                    if (val > 0) hasValuesToLaunch = true;
                                });
                                
                                const [year, month, day] = d.split('-');
                                const dataObj = new Date(year, month - 1, day);
                                const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                const nomeDia = diasDaSemana[dataObj.getDay()];
                                const dataFormatada = `${nomeDia} - ${day}/${month}/${year}`;

                                return (
                                    <tr key={d} className="hover:bg-slate-50 md:table-row block mb-4 md:mb-0 border md:border-0 rounded-xl md:rounded-none overflow-hidden">
                                        <td data-label="Data Caixa" className="p-2 md:border-r bg-white md:sticky left-0 min-w-[140px] border-b md:border-b-0 border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center justify-end md:justify-between px-2 w-full gap-4">
                                                <span className="font-black whitespace-nowrap text-slate-800">{dataFormatada}</span>
                                                <button type="button" onClick={() => handleDeleteDay(d)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-1.5 rounded transition-colors" title="Excluir dia"><Icon name="trash" size={12} /></button>
                                            </div>
                                        </td>
                                        
                                        <td data-label="Total do Dia" className="p-2 md:bg-amber-50 font-black text-slate-900 text-right md:text-center border-b md:border-b-0 border-slate-100">{formatMoney(totalDia)}</td>
                                        <td data-label="Total de Pedidos" className="p-0 border-b md:border-b-0 md:border-r border-slate-100 md:bg-blue-50/30"><DailyInput dateStr={d} field="qtdPedidos" initialValue={r.qtdPedidos} activeUid={user.uid} className="!text-blue-700" placeholder="0" /></td>
                                        <td data-label="Clientes Novos" className="p-0 border-b md:border-b-0 md:border-r border-slate-100 md:bg-fuchsia-50/30"><DailyInput dateStr={d} field="clientesNovos" initialValue={r.clientesNovos} activeUid={user.uid} className="!text-fuchsia-700" placeholder="0" /></td>
                                        <td data-label="Ticket Médio" className="p-2 border-b md:border-b-0 md:border-r border-slate-100 md:bg-blue-50/50 font-black text-blue-900 text-right md:text-center">{formatMoney(p(r.qtdPedidos) > 0 ? totalDia / p(r.qtdPedidos) : 0)}</td>
                                        
                                        {/* COLUNA DE AÇÕES COM BOTÃO DE ACERTO AUTOMÁTICO */}
                                        <td data-label="Status / Ação" className="p-2 md:p-1 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                                            <div className="flex flex-col gap-1">
                                                {r.isLaunched ? (
                                                    <button type="button" onClick={() => reopenDailyLaunch(d)} className="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 font-black uppercase text-[8px] rounded border border-slate-200 cursor-pointer transition-colors" title="Clique para reabrir o caixa">
                                                        Fechado (Reabrir)
                                                    </button>
                                                ) : hasValuesToLaunch ? (
                                                    <button type="button" onClick={() => openDailyLaunch(d, r)} className="w-full py-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[8px] rounded shadow-sm transition-colors cursor-pointer">Lançar Caixa</button>
                                                ) : (
                                                    <button disabled className="w-full py-1.5 bg-slate-50 text-slate-300 font-black uppercase text-[8px] rounded cursor-not-allowed border border-slate-100">Sem Valor</button>
                                                )}

                                                <button type="button" onClick={() => openAcertoModal(d)} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-500 text-indigo-700 hover:text-white font-black uppercase text-[8px] rounded border border-indigo-200 shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1" title="Puxar entregas e lançar acerto">
                                                    <Icon name="motorcycle" size={10} /> Acerto Auto.
                                                </button>
                                            </div>
                                        </td>

                                        {(paymentMethods || []).map(m => (
                                            <td key={m.id} data-label={m.name} className="p-0 border-b md:border-b-0 md:border-r border-slate-100 hover:bg-slate-50">
                                                <DailyInput dateStr={d} field={m.id} initialValue={r[m.id]} activeUid={user.uid} placeholder="0,00" />
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-900 text-white font-black uppercase border-t-4 border-emerald-500 md:table-row block mt-4 rounded-xl overflow-hidden shadow-lg">
                            <td data-label={filtroDiaSemana !== 'todos' ? 'Soma do Filtro' : 'Soma do Mês'} className="p-2 md:sticky left-0 bg-slate-900 z-10 text-right md:text-center text-emerald-400 min-w-[140px] border-b md:border-b-0 border-slate-700">
                                {filtroDiaSemana !== 'todos' ? 'SOMA FILTRADA' : 'SOMA TOTAL'}
                            </td>
                            <td data-label="Total Dia" className="p-2 md:bg-amber-500 md:text-black text-right md:text-center border-b md:border-b-0 border-slate-700">{formatMoney(totaisFiltrados.totalDia)}</td>
                            <td data-label="Pedidos Totais" className="p-2 md:bg-blue-600 text-right md:text-center border-b md:border-b-0 border-slate-700">{totaisFiltrados.pedidos}</td>
                            <td data-label="Total Clientes Novos" className="p-2 md:bg-fuchsia-600 text-white text-right md:text-center border-b md:border-b-0 border-slate-700">{totaisFiltrados.clientesNovos}</td>
                            <td data-label="Ticket Médio Geral" className="p-2 md:border-r md:bg-blue-800 text-[#F8CC82] text-right md:text-center border-b md:border-b-0 border-slate-700">{formatMoney(totaisFiltrados.pedidos > 0 ? totaisFiltrados.totalDia / totaisFiltrados.pedidos : 0)}</td>
                            <td data-label="Ações" className="p-2 md:border-r md:bg-slate-800 text-right md:text-center border-b md:border-b-0 border-slate-700">--</td>
                            
                            {(paymentMethods || []).map(m => (
                                <td key={m.id} data-label={m.name} className="p-2 md:border-r md:bg-slate-800 text-right md:text-center border-b md:border-b-0 border-slate-700">{formatMoney(totaisFiltrados[m.id])}</td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div ref={bottomRef} className="pt-2" />

            {/* MODAL: ACERTO AUTOMÁTICO DE MOTOQUEIRO */}
            {isAcertoModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col scale-up-center overflow-hidden border-t-4 border-indigo-500">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2 text-sm">
                                <Icon name="motorcycle" size={18} /> Acerto Automático
                            </h3>
                            <button onClick={() => setIsAcertoModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Icon name="x" size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5 bg-white overflow-y-auto max-h-[75vh]">
                            
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Quem é o Motoqueiro?</label>
                                    <select value={acertoMotoqueiro} onChange={e => { setAcertoMotoqueiro(e.target.value); setAcertoResultados([]); }} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm">
                                        <option value="">Selecione...</option>
                                        {funcionarios.map(f => (
                                            <option key={f.id} value={f.nome}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={buscarPedidosMotoqueiro} disabled={carregandoAcerto} className="h-11 px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black uppercase text-[10px] rounded-xl transition-colors flex items-center gap-2">
                                        {carregandoAcerto ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="search" size={16} />}
                                        Buscar
                                    </button>
                                </div>
                            </div>

                            {acertoResultados.length > 0 && (
                                <div className="border-t border-slate-100 pt-4 space-y-3">
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-[10px] font-bold text-emerald-800 mb-2">
                                        Sucesso! Encontramos os valores abaixo. Agora, indique para qual Máquina/Coluna cada valor deve ser enviado:
                                    </div>
                                    
                                    {acertoResultados.map((res, index) => (
                                        <div key={index} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                                                    <Icon name="tag" size={12} className="text-slate-400"/> Vendas em: <span className="text-indigo-600">{res.originalName}</span>
                                                </span>
                                                <span className="font-black text-emerald-600 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                                    {formatMoney(res.total)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-1">
                                                <Icon name="corner-down-right" size={14} className="text-slate-300 ml-1" />
                                                <select 
                                                    value={res.mappedId} 
                                                    onChange={e => handleMapChange(res.originalName, e.target.value)} 
                                                    className={`flex-1 p-2 bg-white border rounded-lg font-bold outline-none text-xs ${!res.mappedId ? 'border-amber-400 focus:border-amber-500' : 'border-slate-300 focus:border-indigo-500'}`}
                                                >
                                                    <option value="">-- Selecione a Máquina/Coluna de Destino --</option>
                                                    {(paymentMethods || []).map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name} {m.maquina ? `(MÁQ: ${m.maquina})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}

                                    <button onClick={confirmAcertoAutomatico} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-sm rounded-xl transition-all shadow-md mt-4 flex justify-center items-center gap-2">
                                        <Icon name="check-circle" size={18} /> Confirmar e Lançar no Caixa
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* MODAL DE CONFIGURAÇÃO DE RECEBIMENTOS */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] scale-up-center overflow-hidden border-t-4 border-emerald-500">
                        
                        <div className="p-5 border-b bg-slate-900 flex justify-between items-center">
                            <h3 className="font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <Icon name="settings" size={18} /> Configurar Formas de Recebimento
                            </h3>
                            <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <Icon name="x" size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50">
                            
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 mb-6 shadow-sm">
                                <h4 className="font-black uppercase flex items-center gap-2 text-[11px] mb-2">
                                    <Icon name="info" size={14} /> Inteligência de Lançamento
                                </h4>
                                <p className="text-[10px] font-bold">
                                    Configure as regras exatas. Informe a "Máquina Física" para organizar o Acerto Automático do Motoqueiro na tabela do dia.
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome da Forma de Recebimento</label>
                                            <input type="text" value={methodName} onChange={e=>setMethodName(e.target.value)} placeholder="Ex: Débito Mercado Pago" className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-indigo-500 ml-1 flex items-center gap-1">
                                                <Icon name="smartphone" size={10} /> Pertence a qual Máquina? (Opcional)
                                            </label>
                                            <input type="text" value={maquina} onChange={e=>setMaquina(e.target.value)} placeholder="Ex: Máquina 1 (Mercado Pago)" className="w-full mt-1 p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl font-bold outline-none focus:border-indigo-500" />
                                            <p className="text-[8px] text-slate-400 mt-1 font-bold pl-1">Escreva o mesmo nome para agrupar opções no acerto.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Regra de Taxa</label>
                                            <div className="flex mt-1">
                                                <select value={feeType} onChange={e=>setFeeType(e.target.value)} className="w-3/5 p-2.5 bg-slate-50 border border-r-0 rounded-l-xl font-bold outline-none text-[10px]">
                                                    <option value="percent">% Porcentagem sobre venda</option>
                                                    <option value="fixed">$ Valor Fixo por venda</option>
                                                </select>
                                                <input type="number" step="0.01" value={taxVal} onChange={e=>setTaxVal(e.target.value)} placeholder="Ex: 2.5" className="w-2/5 p-2.5 bg-white border rounded-r-xl font-bold outline-none text-center focus:border-emerald-500" />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prazo de Pagamento</label>
                                            <div className="flex mt-1">
                                                <select value={settlementType} onChange={e=>setSettlementType(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold outline-none text-[10px]">
                                                    <option value="days">Dias Corridos (Ex: Pago em 30 dias)</option>
                                                    <option value="next_business_day">Próx. Dia Útil</option>
                                                    <option value="weekly">Semanal (Ex: iFood)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {settlementType === 'days' && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cai na conta em quantos dias?</label>
                                            <input type="number" value={delay} onChange={e=>setDelay(e.target.value)} placeholder="Dias: 30" className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl font-bold outline-none focus:border-emerald-500" />
                                        </div>
                                    )}

                                    {settlementType === 'weekly' && (
                                        <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3 rounded-xl border border-orange-100">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-800 ml-1">Fecha a semana no:</label>
                                                <select value={closeDay} onChange={e=>setCloseDay(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg font-bold outline-none text-[10px]">
                                                    <option value="0">Domingo</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-orange-800 ml-1">Paga na:</label>
                                                <select value={payDay} onChange={e=>setPayDay(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg font-bold outline-none text-[10px]">
                                                    <option value="0">Domingo</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <label className="text-[11px] font-black uppercase text-slate-700">Visível no Cardápio Digital?</label>
                                            <p className="text-[9px] font-bold text-slate-500">Se desmarcado, esta opção só aparecerá para o caixa interno (Ex: Fiado).</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={showOnMenu} onChange={e => setShowOnMenu(e.target.checked)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>

                                    {/* NOVO: OPÇÃO DE LANÇAR NO CONTAS A RECEBER */}
                                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                                        <div>
                                            <label className="text-[11px] font-black uppercase text-indigo-800">Lançar no "A Receber"?</label>
                                            <p className="text-[9px] font-bold text-indigo-600">Se marcado, as vendas vão para a aba 'A Receber' aguardando liquidação.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={lancaAReceber} onChange={e => setLancaAReceber(e.target.checked)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-indigo-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    
                                    <button onClick={handleAddMethod} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase rounded-xl transition-all shadow-md mt-4 active:scale-95">
                                        {editingMethodId ? 'Salvar Alterações' : '+ Adicionar Método'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(paymentMethods || []).map(m => (
                                    <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                                        
                                        {m.showOnMenu === false && (
                                            <div className="absolute top-0 right-0 bg-slate-200 text-slate-500 text-[8px] font-black uppercase px-2 py-1 rounded-bl-lg border-l border-b border-slate-300">Uso Interno</div>
                                        )}

                                        <div>
                                            <h5 className="font-black uppercase text-slate-800 flex flex-col gap-1.5 mb-2 mt-1">
                                                <span className="flex items-center gap-1.5 text-[11px]"><Icon name="credit-card" size={12} className="text-slate-400" /> {m.name}</span>
                                                {m.maquina && (
                                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5 text-[8px] font-black w-fit flex items-center gap-1">
                                                        <Icon name="smartphone" size={8} /> MÁQ: {m.maquina}
                                                    </span>
                                                )}
                                            </h5>
                                            <p className="text-[10px] font-bold text-slate-500">TAXA: <span className={m.tax > 0 ? 'text-red-500' : 'text-emerald-500'}>{m.feeType === 'percent' ? `${m.tax}%` : `R$ ${formatMoney(m.tax)}/venda`}</span></p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">PRAZO: <span className="text-emerald-500 uppercase">{m.settlementType === 'days' ? `${m.delay}D` : m.settlementType === 'next_business_day' ? 'Próx. Dia Útil' : 'Semanal'}</span></p>
                                            
                                            {/* ALERTA SE NÃO LANÇAR NO A RECEBER */}
                                            {m.lancaAReceber === false && (
                                                <div className="mt-2 bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-1 text-[9px] font-black w-fit flex items-center gap-1">
                                                    <Icon name="alert-triangle" size={10} /> NÃO VAI PARA "A RECEBER"
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                            <button onClick={() => handleEditMethod(m)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 py-1.5 rounded-lg transition-colors"><Icon name="edit" size={12} /> Editar</button>
                                            <button onClick={() => handleDeleteMethod(m.id)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 py-1.5 rounded-lg transition-colors"><Icon name="trash" size={12} /> Excluir</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Vendas;