import React, { useState } from 'react';
import { auth, db } from '../firebase'; // O 'db' voltou para lermos o crachá do funcionário

function Login({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [nome, setNome] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [sucesso, setSucesso] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSucesso('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                // 1. Cria a conta no Firebase Auth
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await user.updateProfile({
                    displayName: nome
                });

                // 2. Envia o e-mail de verificação
                await user.sendEmailVerification();
                
                // 3. Desloga o cliente IMEDIATAMENTE
                await auth.signOut();

                // 4. Mostra a mensagem verde e limpa o formulário
                setSucesso('Falta pouco! Enviamos um link de confirmação para o seu e-mail. Verifique a Caixa de Entrada (e o SPAM).');
                setIsRegistering(false);
                setPassword('');
                setEmail('');
                
            } else {
                // Fluxo de LOGIN normal
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Exceção de segurança para não bloquear contas master
                const isMasterEmail = user.email === 'burger.tribo@gmail.com' || user.email === 'icaro.kts@gmail.com';
                
                if (!user.emailVerified && !isMasterEmail) {
                    await auth.signOut();
                    setError('Acesso bloqueado. Você precisa confirmar seu e-mail primeiro! Verifique sua caixa de entrada.');
                    setIsLoading(false);
                    return;
                }

                // ==========================================
                // LÓGICA: LEITURA DO CRACHÁ (FUNCIONÁRIO)
                // ==========================================
                let permissoes = { 
                    isFuncionario: false, 
                    donoUid: user.uid, 
                    cargo: 'dono' 
                };

                const crachaRef = await db.collection('acessos_funcionarios').doc(user.uid).get();
                
                if (crachaRef.exists) {
                    const dadosCracha = crachaRef.data();
                    
                    if (dadosCracha.ativo === false) {
                        await auth.signOut();
                        setError('Seu acesso foi desativado. Procure a gerência.');
                        setIsLoading(false);
                        return;
                    }

                    permissoes = {
                        isFuncionario: true,
                        donoUid: dadosCracha.donoUid,
                        cargo: dadosCracha.cargo
                    };
                }

                // Envia o usuário E as permissões para o App.js
                onLogin(user, permissoes);
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está cadastrado no sistema.');
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('E-mail ou senha inválidos.');
            } else {
                setError('Ocorreu um erro ao tentar acessar. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest">Tribo Sistemas</h1>
                    <p className="text-sm text-slate-500 mt-2">Gestão de E-commerce e Produção</p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm font-bold mb-4 text-center">{error}</div>}
                
                {sucesso && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-xl text-sm font-bold mb-4 text-center">{sucesso}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {isRegistering && (
                        <div>
                            <label className="text-xs font-bold text-slate-600 ml-1">Seu Nome / Nome da Loja</label>
                            <input 
                                type="text" 
                                required={isRegistering} 
                                value={nome} 
                                onChange={e => setNome(e.target.value)} 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-500" 
                                placeholder="Como devemos te chamar?" 
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-600 ml-1">E-mail</label>
                        <input 
                            type="email" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-500" 
                            placeholder="seu@email.com" 
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-600 ml-1">Senha</label>
                        <input 
                            type="password" 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-500" 
                            placeholder="••••••••" 
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black uppercase tracking-wide rounded-xl shadow-md transition-colors mt-2">
                        {isLoading ? 'Processando...' : (isRegistering ? 'Criar Conta e Confirmar E-mail' : 'Entrar no Sistema')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={() => { setIsRegistering(!isRegistering); setError(''); setSucesso(''); }} type="button" className="text-sm font-bold text-indigo-500 hover:text-indigo-700">
                        {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Teste grátis'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;