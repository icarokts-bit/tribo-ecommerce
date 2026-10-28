import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/functions'; // Importação essencial para chamar o backend

export default function GestaoFuncionarios() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [cargosPermitidos, setCargosPermitidos] = useState(['Motoboy', 'Caixa', 'Gerente', 'Chapeiro']);
    
    const [showModal, setShowModal] = useState(false);
    const [showCargoModal, setShowCargoModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estados do Formulário de Cadastro / Edição
    const [editingId, setEditingId] = useState(null);
    const [nome, setNome] = useState('');
    const [cargo, setCargo] = useState('');
    const [telefone, setTelefone] = useState('');
    const [salario, setSalario] = useState('');
    const [dataAdmissao, setDataAdmissao] = useState('');
    
    // Estados para o Acesso do Sistema (Login)
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    
    const [novoCargo, setNovoCargo] = useState('');

    const db = firebase.firestore();
    const currentUser = firebase.auth().currentUser;

    useEffect(() => {
        if (!currentUser) return;

        const basePath = db.collection('artifacts').doc('tribo-burger-financeiro').collection('users').doc(currentUser.uid);

        const unsubscribeFunc = basePath.collection('funcionarios').orderBy('nome').onSnapshot((snapshot) => {
            const funcData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFuncionarios(funcData);
            setLoading(false);
        });

        const unsubscribeCargos = basePath.collection('configuracoes').doc('rh').onSnapshot((doc) => {
            if (doc.exists && doc.data().cargos) {
                setCargosPermitidos(doc.data().cargos);
            } else {
                setCargosPermitidos(['Motoboy', 'Caixa', 'Gerente', 'Chapeiro']);
            }
        });

        return () => {
            unsubscribeFunc();
            unsubscribeCargos();
        };
    }, [currentUser, db]);

    const abrirModalNovo = () => {
        setEditingId(null);
        setNome(''); setCargo(''); setTelefone(''); setSalario(''); setDataAdmissao('');
        setEmail(''); setSenha('');
        setShowModal(true);
    };

    const abrirModalEdicao = (func) => {
        setEditingId(func.id);
        setNome(func.nome || '');
        setCargo(func.cargo || '');
        setTelefone(func.telefone || '');
        setSalario(func.salarioBase ? String(func.salarioBase) : '');
        setDataAdmissao(func.dataAdmissao || '');
        setEmail(func.email || '');
        setSenha(''); // Deixa vazio por segurança, preencher apenas se quiser redefinir/vincular
        setShowModal(true);
    };

    const deletarFuncionario = async (id) => {
        if (window.confirm("Atenção: Isso remove o funcionário da lista, mas não exclui o login dele do sistema por segurança. Deseja continuar?")) {
            try {
                await db.collection('artifacts').doc('tribo-burger-financeiro').collection('users').doc(currentUser.uid).collection('funcionarios').doc(id).delete();
            } catch (error) {
                console.error("Erro ao deletar:", error);
                alert("Erro ao excluir funcionário.");
            }
        }
    };

    const handleSalvarFuncionario = async (e) => {
        e.preventDefault();
        if (!currentUser) { alert('Erro: Usuário não logado.'); return; }
        if (!cargo) { alert('Selecione um cargo para o funcionário.'); return; }

        setIsSubmitting(true);

        try {
            const funcionariosRef = db.collection('artifacts').doc('tribo-burger-financeiro').collection('users').doc(currentUser.uid).collection('funcionarios');

            const payload = {
                nome,
                cargo: cargo.trim(),
                telefone,
                salarioBase: parseFloat(String(salario).replace(',', '.')),
                dataAdmissao,
                status: 'Ativo'
            };

            if (editingId) {
                payload.email = email;
                await funcionariosRef.doc(editingId).update(payload);

                // Se o usuário informou senha na edição, tenta vincular/criar o acesso de login Auth
                if (senha) {
                    if (!email) {
                        alert('Para vincular acesso ao sistema, informe o e-mail.');
                        setIsSubmitting(false);
                        return;
                    }
                    try {
                        const criarFuncionarioFn = firebase.functions().httpsCallable('criarFuncionario');
                        const res = await criarFuncionarioFn({
                            nome,
                            email,
                            password: senha,
                            cargo: cargo.trim().toLowerCase()
                        });
                        await funcionariosRef.doc(editingId).update({ authUid: res.data.uid, email });
                    } catch (authErr) {
                        console.warn("Aviso Auth:", authErr.message);
                    }
                }
                alert("Dados atualizados com sucesso!");
            } else {
                // É UM NOVO FUNCIONÁRIO
                payload.dataCadastro = firebase.firestore.FieldValue.serverTimestamp();

                // Se informou e-mail E senha, cria o acesso completo via Backend
                if (email && senha) {
                    const criarFuncionarioFn = firebase.functions().httpsCallable('criarFuncionario');
                    const res = await criarFuncionarioFn({
                        nome,
                        email,
                        password: senha,
                        cargo: cargo.trim().toLowerCase()
                    });
                    
                    payload.email = email;
                    await funcionariosRef.doc(res.data.uid).set(payload);
                    alert("Funcionário e credenciais de acesso criados com sucesso!");
                
                // Se informou apenas um dos dois, avisa o usuário
                } else if (email || senha) {
                    alert("Para criar um acesso ao sistema, preencha tanto o E-mail quanto a Senha. Caso contrário, deixe ambos em branco.");
                    setIsSubmitting(false);
                    return;
                
                // Se deixou ambos em branco, salva apenas no banco de dados local
                } else {
                    await funcionariosRef.add(payload);
                    alert("Funcionário cadastrado com sucesso (sem acesso ao sistema)!");
                }
            }

            setNome(''); setCargo(''); setTelefone(''); setSalario(''); setDataAdmissao(''); setEmail(''); setSenha('');
            setEditingId(null);
            setShowModal(false);
            
        } catch (error) {
            console.error("Erro ao salvar:", error);
            if (error.message.includes("email address is already in use")) {
                alert('❌ Este e-mail já está em uso por outro usuário.');
            } else if (error.message.includes("Password should be at least")) {
                alert('❌ A senha deve ter no mínimo 6 caracteres.');
            } else {
                alert(`❌ Erro: ${error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdicionarCargo = async () => {
        if (!novoCargo.trim()) return;
        const cargoFormatado = novoCargo.trim();
        const checkDuplicado = cargosPermitidos.find(c => c.toUpperCase() === cargoFormatado.toUpperCase());

        if (checkDuplicado) { alert('Este cargo já está cadastrado!'); return; }
        try {
            const configRef = db.collection('artifacts').doc('tribo-burger-financeiro').collection('users').doc(currentUser.uid).collection('configuracoes').doc('rh');
            const novasCargos = [...cargosPermitidos, cargoFormatado];
            await configRef.set({ cargos: novasCargos }, { merge: true });
            setCargo(cargoFormatado); setNovoCargo(''); setShowCargoModal(false);
        } catch (error) { alert('❌ Erro ao adicionar o cargo.'); }
    };

    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

    const funcionariosAgrupados = funcionarios.reduce((acc, func) => {
        const categoria = (func.cargo || 'OUTROS').trim().toUpperCase(); 
        if (!acc[categoria]) acc[categoria] = [];
        acc[categoria].push(func); return acc;
    }, {});
    const categoriasOrdenadas = Object.keys(funcionariosAgrupados).sort();

    return (
        <div className="p-6 text-white min-h-screen bg-slate-950 font-sans">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                        <Icon name="users" size={28} className="text-emerald-500" /> Gestão de Equipe
                    </h1>
                    <p className="text-slate-400 text-sm font-bold uppercase mt-1">Controle de funcionários, acessos e salários.</p>
                </div>
                <button onClick={abrirModalNovo} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 hover:scale-105">
                    <Icon name="user-plus" size={16} /> Novo Funcionário
                </button>
            </div>

            {loading ? (
                <div className="text-center text-slate-500 py-10 font-bold uppercase tracking-widest">Carregando equipe...</div>
            ) : funcionarios.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center">
                    <div className="bg-slate-800 p-4 rounded-full text-slate-500 mb-4"><Icon name="users" size={40} /></div>
                    <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest mb-2">Nenhum funcionário cadastrado</h3>
                    <p className="text-slate-500 font-bold">Cadastre o primeiro membro da sua equipe clicando no botão acima.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {categoriasOrdenadas.map((categoria) => (
                        <div key={categoria} className="fade-in">
                            <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                                <Icon name="briefcase" size={16} className="text-emerald-500" /> {categoria}
                                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full ml-2">{funcionariosAgrupados[categoria].length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {funcionariosAgrupados[categoria].map((func) => (
                                    <div key={func.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 transition-colors group relative overflow-hidden shadow-sm">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                        <div className="flex justify-between items-start mb-4 pl-3">
                                            <div>
                                                <h3 className="text-lg font-black text-white uppercase tracking-wider">{func.nome}</h3>
                                                <span className="inline-block bg-slate-800 text-emerald-400 text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest mt-1">{func.cargo}</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => abrirModalEdicao(func)} className="text-slate-500 hover:text-emerald-400 transition-colors"><Icon name="edit" size={16} /></button>
                                                <button onClick={() => deletarFuncionario(func.id)} className="text-slate-500 hover:text-red-500 transition-colors"><Icon name="trash" size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pl-3">
                                            {func.email && (
                                                <div className="flex items-center gap-2 text-xs text-sky-400 font-bold mb-2">
                                                    <Icon name="mail" size={12} /> {func.email}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-slate-400 font-bold"><Icon name="phone" size={14} className="text-slate-500" /> {func.telefone || 'Não informado'}</div>
                                            <div className="flex items-center gap-2 text-sm text-slate-400 font-bold mt-3 pt-3 border-t border-slate-800"><Icon name="dollar-sign" size={14} className="text-emerald-500" /> Base: <span className="text-white">{formatarMoeda(func.salarioBase)}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl scale-up-center max-h-[90vh] flex flex-col">
                        <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2"><Icon name={editingId ? "edit" : "user-plus"} size={20} className="text-emerald-500" /> {editingId ? 'Editar Funcionário & Acesso' : 'Novo Funcionário'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-red-500 transition-colors"><Icon name="x" size={20} /></button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 relative">
                            <form onSubmit={handleSalvarFuncionario} className="p-6 space-y-6">
                                {showCargoModal && (
                                    <div className="absolute inset-0 bg-slate-900/95 z-10 flex items-center justify-center p-6 backdrop-blur-sm rounded-b-2xl">
                                        <div className="w-full max-w-sm bg-slate-950 border border-slate-800 p-6 rounded-2xl shadow-2xl">
                                            <h3 className="font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2"><Icon name="plus-circle" size={18}/> Novo Cargo</h3>
                                            <input type="text" autoFocus value={novoCargo} onChange={e => setNovoCargo(e.target.value)} placeholder="Ex: Entregador" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none mb-4" />
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setShowCargoModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs py-3 rounded-xl">Cancelar</button>
                                                <button type="button" onClick={handleAdicionarCargo} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs py-3 rounded-xl shadow-lg">Salvar</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* DADOS PESSOAIS */}
                                <div>
                                    <h4 className="text-emerald-500 font-black uppercase tracking-widest text-[10px] mb-3 border-b border-slate-800 pb-1">Dados Pessoais e Contrato</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Nome Completo *</label>
                                            <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Telefone (WhatsApp)</label>
                                            <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none" />
                                        </div>
                                        
                                        <div className="space-y-1 flex flex-col justify-end">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Cargo/Função *</label>
                                            <div className="flex gap-2">
                                                <select required value={cargo} onChange={(e) => setCargo(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none">
                                                    <option value="">Selecione...</option>
                                                    {cargosPermitidos.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <button type="button" onClick={() => setShowCargoModal(true)} className="bg-slate-800 hover:bg-emerald-500 text-slate-400 px-4 rounded-xl flex items-center justify-center"><Icon name="plus" size={16} /></button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Salário/Diária *</label>
                                                <input type="number" step="0.01" required value={salario} onChange={(e) => setSalario(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admissão *</label>
                                                <input type="date" required value={dataAdmissao} onChange={(e) => setDataAdmissao(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:border-emerald-500 outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ACESSO AO SISTEMA */}
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-2">
                                    <h4 className="text-sky-400 font-black uppercase tracking-widest text-[10px] mb-3 border-b border-slate-800 pb-1 flex items-center gap-1.5"><Icon name="lock" size={12}/> Acesso ao Sistema</h4>
                                    <p className="text-[10px] text-slate-500 mb-4 font-bold">
                                        {editingId ? 'Atualize o e-mail ou informe uma nova senha para criar/vincular o login de acesso.' : 'Estes dados permitirão que o funcionário faça login no painel. Caso não preencha, o funcionário não terá acesso ao sistema.'}
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">E-mail de Acesso (Opcional)</label>
                                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="luiz@seusistema.com" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-bold text-sky-400 focus:border-sky-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Senha (Mín. 6 chars - Opcional)</label>
                                            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="******" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-bold text-sky-400 focus:border-sky-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3 border-t border-slate-800 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs py-4 rounded-xl">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-900 disabled:text-emerald-700 text-white font-black uppercase text-xs py-4 rounded-xl shadow-lg flex justify-center items-center gap-2 transition-colors">
                                        {isSubmitting ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="save" size={16} />} 
                                        {isSubmitting ? 'Salvando...' : 'Salvar Funcionário'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}