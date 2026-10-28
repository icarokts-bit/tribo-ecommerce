import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

export default function GestaoFreelancer() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [contas, setContas] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados do Formulário
    const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
    const [funcionarioId, setFuncionarioId] = useState('');
    const [valorDiaria, setValorDiaria] = useState('');
    const [observacao, setObservacao] = useState(''); // NOVO CAMPO: Observação/Desconto
    const [contaSaida, setContaSaida] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    useEffect(() => {
        if (!currentUser) return;
        const basePath = `artifacts/tribo-burger-financeiro/users/${currentUser.uid}`;

        // 1. Busca Funcionários (Você pode listar todos e selecionar quem fez o freela)
        const unsubFunc = db.collection(`${basePath}/funcionarios`)
            .onSnapshot(s => setFuncionarios(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // 2. Busca Contas
        const unsubContas = db.collection(`${basePath}/accounts`)
            .where('type', '==', 'corrente')
            .onSnapshot(s => setContas(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // 3. Busca Histórico (Categoria: Pagamento Freelancer)
        const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
        const unsubHist = db.collection(`${basePath}/transactions`)
            .where('category', '==', 'Pagamento Freelancer')
            .onSnapshot(s => {
                const logs = s.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Filtramos o mês atual no JavaScript
                const logsDoMes = logs.filter(log => log.date && log.date.startsWith(mesAtual));
                
                // Ordena do mais recente para o mais antigo
                logsDoMes.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
                
                setHistorico(logsDoMes);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar histórico:", error);
                setLoading(false);
            });

        return () => { unsubFunc(); unsubContas(); unsubHist(); };
    }, [currentUser, db]);

    const handleSelecionarFuncionario = (id) => {
        setFuncionarioId(id);
        const funcSelecionado = funcionarios.find(f => f.id === id);
        if (funcSelecionado && funcSelecionado.salarioBase) {
            setValorDiaria(funcSelecionado.salarioBase.toString());
        }
    };

    const handleLancarPagamento = async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSaving(true);

        const diaria = parseFloat(valorDiaria.replace(',', '.')) || 0;

        if (diaria <= 0) {
            alert("O valor final da diária deve ser maior que zero.");
            setIsSaving(false);
            return;
        }

        const freela = funcionarios.find(f => f.id === funcionarioId);
        const nomeFreela = freela ? freela.nome : 'Freelancer Avulso';
        
        // Concatena a observação à descrição caso exista
        const descricaoFinal = observacao.trim() ? `Diária Freela: ${nomeFreela} (${observacao.trim()})` : `Diária Freela: ${nomeFreela}`;

        try {
            const transacaoRef = db.collection(`artifacts/tribo-burger-financeiro/users/${currentUser.uid}/transactions`).doc();
            const timestamp = new Date().toISOString();

            await transacaoRef.set({
                description: descricaoFinal,
                amount: diaria,
                type: 'saida',
                account: contaSaida,
                destinationAccount: '',
                category: 'Pagamento Freelancer',
                supplier: nomeFreela,
                status: 'pendente', // Lança para as Contas a Vencer
                date: dataLancamento,
                clearanceDate: dataLancamento,
                installments: 1,
                feeType: 'none',
                feePercent: 0,
                timestamp
            });

            alert('✅ Diária enviada para Contas a Vencer com sucesso!');
            
            // Limpa os valores
            setFuncionarioId('');
            setValorDiaria('');
            setObservacao('');
            
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl sticky top-6">
                    <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 mb-1">
                        <Icon name="briefcase" size={24} className="text-indigo-400" />
                        Diárias / Freelas
                    </h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-6 border-b border-slate-800 pb-4">
                        Lançamento de diárias para chapeiros, garçons, etc.
                    </p>

                    <form onSubmit={handleLancarPagamento} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Data do Expediente</label>
                            <input 
                                type="date" required
                                value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Colaborador / Freelancer</label>
                            <select 
                                required value={funcionarioId} onChange={(e) => handleSelecionarFuncionario(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-indigo-500 outline-none"
                            >
                                <option value="">Selecione o colaborador...</option>
                                {funcionarios.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 text-indigo-400">Valor Final da Diária (R$)</label>
                                <input 
                                    type="number" step="0.01" required
                                    value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} placeholder="0.00"
                                    className="w-full bg-slate-950 border border-indigo-900/50 rounded-xl p-3 font-black text-indigo-400 focus:border-indigo-500 outline-none text-center text-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Observações (Opcional)</label>
                            <input 
                                type="text"
                                value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Desconto de R$ 10 (Atraso)"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-slate-300 focus:border-indigo-500 outline-none text-sm placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Previsão Conta de Saída</label>
                            <select 
                                required value={contaSaida} onChange={(e) => setContaSaida(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-indigo-500 outline-none"
                            >
                                <option value="">De onde vai sair? (Ex: Caixa, Pix)</option>
                                {contas.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <button 
                            type="submit" disabled={isSaving}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-xs p-4 rounded-xl shadow-lg mt-4 transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? 'Lançando...' : <><Icon name="clock" size={16} /> Enviar p/ Contas a Vencer</>}
                        </button>
                    </form>
                </div>
            </div>

            {/* LADO DIREITO: HISTÓRICO RECENTE */}
            <div className="w-full md:w-2/3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-full">
                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-6 text-slate-300">
                        <Icon name="list" size={20} /> Histórico de Lançamentos
                    </h3>

                    {loading ? (
                        <div className="text-center text-slate-500 font-bold uppercase mt-10">Carregando histórico...</div>
                    ) : historico.length === 0 ? (
                        <div className="text-center text-slate-500 font-bold uppercase mt-10 bg-slate-950 p-10 rounded-xl border border-slate-800 border-dashed">
                            Nenhum freelancer lançado neste mês.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historico.map(log => (
                                <div key={log.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-800 p-3 rounded-lg text-slate-400">
                                            <Icon name="briefcase" size={20} />
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
                                            <span className="font-black text-white text-sm text-indigo-400">{formatarMoeda(log.amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}