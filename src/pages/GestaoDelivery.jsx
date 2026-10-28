import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

export default function GestaoDelivery() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [contas, setContas] = useState([]);
    
    // Novo Estado para Histórico Completo e Filtro de Mês
    const [historicoCompleto, setHistoricoCompleto] = useState([]);
    const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7)); 
    
    const [loading, setLoading] = useState(true);

    // Estados do Formulário
    const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
    const [funcionarioId, setFuncionarioId] = useState('');
    const [valorDiaria, setValorDiaria] = useState('');
    const [valorTaxas, setValorTaxas] = useState('');
    const [observacao, setObservacao] = useState(''); // NOVO CAMPO: Observação/Desconto
    const [contaSaida, setContaSaida] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // NOVO ESTADO: Armazena as entregas do dia do motoboy selecionado
    const [entregasDoDia, setEntregasDoDia] = useState([]);

    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    useEffect(() => {
        if (!currentUser) return;
        const basePath = `artifacts/tribo-burger-financeiro/users/${currentUser.uid}`;

        // 1. Busca Funcionários
        const unsubFunc = db.collection(`${basePath}/funcionarios`)
            .onSnapshot(s => setFuncionarios(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // 2. Busca Contas
        const unsubContas = db.collection(`${basePath}/accounts`)
            .where('type', '==', 'corrente')
            .onSnapshot(s => setContas(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // 3. Busca Histórico Completo de Motoboys
        const unsubHist = db.collection(`${basePath}/transactions`)
            .where('category', '==', 'Pagamento Motoboy')
            .onSnapshot(s => {
                const logs = s.docs.map(d => ({ id: d.id, ...d.data() }));
                setHistoricoCompleto(logs);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar histórico:", error);
                setLoading(false);
            });

        return () => { unsubFunc(); unsubContas(); unsubHist(); };
    }, [currentUser, db]);

    // =======================================================
    // BUSCA AUTOMÁTICA DE TAXAS E ENTREGAS DO MOTOBOY DO DIA
    // =======================================================
    useEffect(() => {
        if (!currentUser || !funcionarioId || !dataLancamento) {
            setEntregasDoDia([]);
            return;
        }

        const fetchEntregasDoDia = async () => {
            const motoqueiro = funcionarios.find(f => f.id === funcionarioId);
            if (!motoqueiro) return;

            const nomeMotoboy = motoqueiro.nome;
            const ordersRef = db.collection(`artifacts/tribo-burger-financeiro/users/${currentUser.uid}/delivery_orders`);

            try {
                // Busca pedidos concluídos deste motoboy
                const snap = await ordersRef
                    .where('motoqueiro', '==', nomeMotoboy)
                    .where('status', '==', 'concluido')
                    .get();

                // Filtra os que aconteceram na data selecionada
                const entregas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(order => {
                    const orderDate = (order.updatedAt || order.createdAt || '').split('T')[0];
                    return orderDate === dataLancamento;
                });

                setEntregasDoDia(entregas);

                // Soma as taxas (pega de taxaEntregador ou deliveryFee)
                const totalTaxas = entregas.reduce((acc, curr) => acc + (Number(curr.taxaEntregador || curr.deliveryFee) || 0), 0);
                
                if (totalTaxas > 0) {
                    setValorTaxas(totalTaxas.toFixed(2));
                } else {
                    setValorTaxas('');
                }

            } catch (error) {
                console.error("Erro ao buscar as entregas diárias:", error);
            }
        };

        fetchEntregasDoDia();
    }, [currentUser, funcionarioId, dataLancamento, funcionarios, db]);


    // Aplica o filtro de mês no JavaScript para não bugar o Firebase
    const historico = historicoCompleto
        .filter(log => log.date && log.date.startsWith(mesFiltro))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    const handleSelecionarFuncionario = (id) => {
        setFuncionarioId(id);
        const funcSelecionado = funcionarios.find(f => f.id === id);
        if (funcSelecionado && funcSelecionado.salarioBase) {
            setValorDiaria(funcSelecionado.salarioBase.toString());
        } else {
            setValorDiaria('');
        }
    };

    const handleLancarPagamento = async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSaving(true);

        const diaria = parseFloat(valorDiaria.replace(',', '.')) || 0;
        const taxas = parseFloat(valorTaxas.replace(',', '.')) || 0;

        if (diaria <= 0 && taxas <= 0) {
            alert("O valor da diária ou das taxas deve ser preenchido.");
            setIsSaving(false);
            return;
        }

        const motoqueiro = funcionarios.find(f => f.id === funcionarioId);
        const nomeMotoboy = motoqueiro ? motoqueiro.nome : 'Motoboy Avulso';
        
        // Formata a observação para incluir nos lançamentos
        const obsFormatada = observacao.trim() ? ` (${observacao.trim()})` : '';

        try {
            const transacaoRef = db.collection(`artifacts/tribo-burger-financeiro/users/${currentUser.uid}/transactions`);
            const batch = db.batch(); 
            const timestamp = new Date().toISOString();

            if (diaria > 0) {
                const docRefDiaria = transacaoRef.doc();
                batch.set(docRefDiaria, {
                    description: `Diária: ${nomeMotoboy}${obsFormatada}`, amount: diaria, type: 'saida', account: contaSaida, destinationAccount: '', category: 'Pagamento Motoboy', supplier: nomeMotoboy, status: 'pendente', date: dataLancamento, clearanceDate: dataLancamento, installments: 1, feeType: 'none', feePercent: 0, timestamp
                });
            }

            if (taxas > 0) {
                const docRefTaxas = transacaoRef.doc();
                batch.set(docRefTaxas, {
                    description: `Taxas de Entrega: ${nomeMotoboy}${obsFormatada}`, amount: taxas, type: 'saida', account: contaSaida, destinationAccount: '', category: 'Pagamento Motoboy', supplier: nomeMotoboy, status: 'pendente', date: dataLancamento, clearanceDate: dataLancamento, installments: 1, feeType: 'none', feePercent: 0, timestamp
                });
            }

            await batch.commit();
            alert('✅ Lançamentos enviados para Contas a Vencer com sucesso!');
            
            setFuncionarioId('');
            setValorDiaria('');
            setValorTaxas('');
            setObservacao(''); // Limpa a observação
            setEntregasDoDia([]); // Limpa as entregas do painel
            
        } catch (error) {
            console.error("Erro ao lançar:", error);
            alert('❌ Erro ao lançar pagamento.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    };

    return (
        <div className="p-6 text-white min-h-screen bg-slate-950 font-sans flex flex-col md:flex-row gap-6">
            
            {/* LADO ESQUERDO: FORMULÁRIO DE LANÇAMENTO */}
            <div className="w-full md:w-1/3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar">
                    <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 mb-1">
                        <Icon name="truck" size={24} className="text-emerald-500" />
                        Delivery
                    </h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-6 border-b border-slate-800 pb-4">
                        Lançamento diário de Motoboys.
                    </p>

                    <form onSubmit={handleLancarPagamento} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Data do Expediente</label>
                            <input type="date" required value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Motoboy / Entregador</label>
                            <select required value={funcionarioId} onChange={(e) => handleSelecionarFuncionario(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none">
                                <option value="">Selecione quem realizou a rota...</option>
                                {funcionarios.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 text-emerald-500">Valor da Diária</label>
                                <input type="number" step="0.01" value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-emerald-900/50 rounded-xl p-3 font-black text-emerald-400 focus:border-emerald-500 outline-none text-center" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 text-indigo-400">Taxas de Entrega</label>
                                <input type="number" step="0.01" value={valorTaxas} onChange={(e) => setValorTaxas(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-indigo-900/50 rounded-xl p-3 font-black text-indigo-400 focus:border-indigo-500 outline-none text-center" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Observações (Opcional)</label>
                            <input 
                                type="text"
                                value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Adiantamento de R$ 20..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-slate-300 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-600"
                            />
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center mt-2">
                            <span className="text-xs font-black uppercase text-slate-400">Total Previsto:</span>
                            <span className="text-xl font-black text-white">{formatarMoeda((parseFloat(valorDiaria) || 0) + (parseFloat(valorTaxas) || 0))}</span>
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Previsão Conta de Saída</label>
                            <select required value={contaSaida} onChange={(e) => setContaSaida(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none">
                                <option value="">De onde vai sair? (Ex: Caixa, Pix)</option>
                                {contas.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <button type="submit" disabled={isSaving} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs p-4 rounded-xl shadow-lg mt-4 transition-all flex items-center justify-center gap-2">
                            {isSaving ? 'Lançando...' : <><Icon name="clock" size={16} /> Enviar p/ Contas a Vencer</>}
                        </button>
                    </form>

                    {/* MINI RELATÓRIO DE ENTREGAS DO DIA */}
                    {entregasDoDia.length > 0 && (
                        <div className="mt-8 border-t border-slate-800 pt-5">
                            <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-3 flex items-center gap-2">
                                <Icon name="list" size={14} /> Relatório de Entregas ({entregasDoDia.length})
                            </h4>
                            <div className="space-y-2">
                                {entregasDoDia.map((entrega) => (
                                    <div key={entrega.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center hover:border-slate-700 transition-colors">
                                        <div>
                                            <p className="text-xs font-black text-slate-200">
                                                Pedido: #{entrega.id.slice(0, 5).toUpperCase()}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 flex items-center gap-1">
                                                <Icon name="credit-card" size={10} /> {entrega.paymentMethod || 'Dinheiro'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400">
                                                Total: {formatarMoeda(entrega.total)}
                                            </p>
                                            <p className="text-[10px] font-black text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded mt-1 inline-block">
                                                Taxa: {formatarMoeda(entrega.taxaEntregador || entrega.deliveryFee)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LADO DIREITO: HISTÓRICO RECENTE */}
            <div className="w-full md:w-2/3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-full">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 text-slate-300">
                            <Icon name="list" size={20} /> Histórico de Lançamentos
                        </h3>
                        
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-slate-500">Mês:</span>
                            <input 
                                type="month" 
                                value={mesFiltro} 
                                onChange={(e) => setMesFiltro(e.target.value)} 
                                className="bg-transparent border-none text-emerald-500 font-black outline-none text-xs cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center text-slate-500 font-bold uppercase mt-10">Carregando histórico...</div>
                    ) : historico.length === 0 ? (
                        <div className="text-center text-slate-500 font-bold uppercase mt-10 bg-slate-950 p-10 rounded-xl border border-slate-800 border-dashed">
                            Nenhum pagamento encontrado para o mês selecionado.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historico.map(log => (
                                <div key={log.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-800 p-3 rounded-lg text-slate-400">
                                            <Icon name="truck" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm uppercase text-slate-200">{log.description || log.supplier}</h4>
                                            
                                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase mt-1">
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Icon name="calendar" size={10} /> {log.date.split('-').reverse().join('/')}
                                                </span>
                                                
                                                <span className={`flex items-center gap-1 ${log.status === 'pendente' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    <Icon name={log.status === 'pendente' ? 'clock' : 'check-circle'} size={10} />
                                                    {log.status === 'pendente' ? 'A Vencer' : 'Pago'}
                                                </span>
                                                
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <Icon name="credit-card" size={10} /> {log.account}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 bg-slate-900 p-2 md:p-3 rounded-lg border border-slate-800">
                                        <div className="text-right border-l border-slate-700 pl-4">
                                            <span className="block text-[10px] font-black text-slate-400 uppercase">Valor Lançado</span>
                                            <span className="font-black text-white text-sm">{formatarMoeda(log.amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
}