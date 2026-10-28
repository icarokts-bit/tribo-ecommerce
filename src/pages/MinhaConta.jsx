import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

export default function MinhaConta() {
    const [user, setUser] = useState(null);
    
    // Estados dos Dados da Empresa
    const [empresa, setEmpresa] = useState({
        nome: '',
        email: '',
        endereco: '',
        site: ''
    });
    const [loadingDados, setLoadingDados] = useState(false);
    const [msgDados, setMsgDados] = useState({ type: '', text: '' });

    // Estados da Troca de Senha
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingSenha, setLoadingSenha] = useState(false);
    const [msgSenha, setMsgSenha] = useState({ type: '', text: '' });

    // Carregar os dados ao abrir a tela
    useEffect(() => {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            setUser(currentUser);
            const db = firebase.firestore();
            
            // Busca os dados da empresa salvos no banco
            db.collection('empresas').doc(currentUser.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        setEmpresa(doc.data());
                    } else {
                        // Se for o primeiro acesso, preenche o email com o do login
                        setEmpresa(prev => ({ ...prev, email: currentUser.email }));
                    }
                })
                .catch(err => console.error("Erro ao buscar dados:", err));
        }
    }, []);

    // Função para Salvar Dados da Empresa
    const handleSalvarDados = async (e) => {
        e.preventDefault();
        setMsgDados({ type: '', text: '' });
        setLoadingDados(true);

        try {
            const db = firebase.firestore();
            // Salva ou atualiza os dados no Firestore vinculados ao UID do usuário
            await db.collection('empresas').doc(user.uid).set(empresa, { merge: true });
            
            setMsgDados({ type: 'success', text: 'Dados da conta atualizados com sucesso!' });
            
            // Apaga a mensagem após 3 segundos
            setTimeout(() => setMsgDados({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            setMsgDados({ type: 'error', text: 'Ocorreu um erro ao salvar os dados.' });
        } finally {
            setLoadingDados(false);
        }
    };

    // Função para Trocar a Senha
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMsgSenha({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMsgSenha({ type: 'error', text: 'As novas senhas não coincidem.' });
            return;
        }

        if (newPassword.length < 6) {
            setMsgSenha({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setLoadingSenha(true);
        try {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            
            setMsgSenha({ type: 'success', text: 'Senha atualizada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            setTimeout(() => setMsgSenha({ type: '', text: '' }), 4000);
        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                setMsgSenha({ type: 'error', text: 'A senha atual está incorreta.' });
            } else {
                setMsgSenha({ type: 'error', text: 'Erro ao trocar a senha. Tente novamente.' });
            }
        } finally {
            setLoadingSenha(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 fade-in mt-2 pb-10">
            {/* Cabeçalho da Página */}
            <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Icon name="user" size={24} className="text-emerald-500" /> Minha Conta
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">Gerencie os dados da sua empresa e credenciais de acesso.</p>
            </div>

            {/* SEÇÃO 1: DADOS DA EMPRESA */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-lg text-white">
                        <Icon name="building" size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-700 uppercase text-sm">Dados da Empresa</h3>
                        <p className="text-[11px] text-slate-500 font-bold">Informações principais do seu negócio</p>
                    </div>
                </div>

                <form onSubmit={handleSalvarDados} className="p-6 space-y-5">
                    {msgDados.text && (
                        <div className={`p-3 rounded-lg text-[11px] font-black uppercase flex items-center gap-2 ${msgDados.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            <Icon name={msgDados.type === 'error' ? 'alert-circle' : 'check-circle'} size={16} />
                            {msgDados.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Nome da Empresa */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Nome da Empresa / Razão Social</label>
                            <input 
                                type="text" 
                                required
                                value={empresa.nome}
                                onChange={(e) => setEmpresa({...empresa, nome: e.target.value})}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                                placeholder="Ex: Tribo Burger"
                            />
                        </div>

                        {/* E-mail */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">E-mail de Contato</label>
                            <input 
                                type="email" 
                                required
                                value={empresa.email}
                                onChange={(e) => setEmpresa({...empresa, email: e.target.value})}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                                placeholder="contato@empresa.com"
                            />
                        </div>

                        {/* Site */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Site ou Redes Sociais</label>
                            <input 
                                type="text" 
                                value={empresa.site}
                                onChange={(e) => setEmpresa({...empresa, site: e.target.value})}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                                placeholder="www.seusite.com.br"
                            />
                        </div>

                        {/* Endereço */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Endereço Completo</label>
                            <input 
                                type="text" 
                                value={empresa.endereco}
                                onChange={(e) => setEmpresa({...empresa, endereco: e.target.value})}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                                placeholder="Rua, Número, Bairro, Cidade - Estado"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loadingDados}
                            className={`px-6 py-3 text-white font-black uppercase text-[11px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${loadingDados ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg'}`}
                        >
                            {loadingDados ? 'Salvando...' : <><Icon name="save" size={14} /> Salvar Dados</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* SEÇÃO 2: TROCA DE SENHA */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-lg text-white">
                        <Icon name="lock" size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-700 uppercase text-sm">Segurança de Acesso</h3>
                        <p className="text-[11px] text-slate-500 font-bold">Altere sua senha periodicamente</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
                    {msgSenha.text && (
                        <div className={`p-3 rounded-lg text-[11px] font-black uppercase flex items-center gap-2 ${msgSenha.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            <Icon name={msgSenha.type === 'error' ? 'alert-circle' : 'check-circle'} size={16} />
                            {msgSenha.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Senha Atual</label>
                        <input 
                            type="password" 
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-slate-800 focus:bg-white transition-all" 
                            placeholder="Digite sua senha atual"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Nova Senha</label>
                            <input 
                                type="password" 
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-slate-800 focus:bg-white transition-all" 
                                placeholder="Mínimo de 6 caracteres"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Confirmar Nova Senha</label>
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-slate-800 focus:bg-white transition-all" 
                                placeholder="Repita a nova senha"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loadingSenha}
                            className={`px-6 py-3 text-white font-black uppercase text-[11px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${loadingSenha ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-black hover:shadow-lg'}`}
                        >
                            {loadingSenha ? 'Validando...' : 'Atualizar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}