import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon'; 
import { db } from '../firebase'; 

function PainelMaster({ usuarioLogado }) {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [renovarModal, setRenovarModal] = useState(null); 

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            const snapshot = await db.collection('usuarios').get();
            const listaUsuarios = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            listaUsuarios.sort((a, b) => (b.role === 'master' ? 1 : -1));
            setUsuarios(listaUsuarios);
        } catch (error) {
            console.error("Erro ao buscar clientes no Firebase:", error);
            alert("Erro ao carregar clientes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (usuarioLogado?.role === 'master') {
            fetchUsuarios();
        }
    }, [usuarioLogado?.role]);

    const calcularStatus = (dataExpira, status_assinatura) => {
        if (status_assinatura === 'bloqueado' || status_assinatura === 'bloqueada') {
            return { texto: 'Bloqueado', cor: 'bg-red-100 text-red-700', dias: 0 };
        }
        if (!dataExpira) return { texto: 'Sem data', cor: 'bg-slate-100 text-slate-700', dias: 0 };
        
        const hoje = new Date();
        const vencimento = new Date(dataExpira);
        const diffTempo = vencimento - hoje;
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

        if (diffDias < 0) return { texto: 'Vencido', cor: 'bg-red-100 text-red-700', dias: diffDias };
        if (diffDias <= 5) return { texto: 'Vence em breve', cor: 'bg-amber-100 text-amber-700', dias: diffDias };
        return { texto: 'Ativo', cor: 'bg-emerald-100 text-emerald-700', dias: diffDias };
    };

    const executarRenovacao = async (meses, nomePlano) => {
        if (!renovarModal) return;
        try {
            const dataBase = renovarModal.expiraEm ? new Date(renovarModal.expiraEm) : new Date();
            const inicioRenovacao = dataBase < new Date() ? new Date() : dataBase;
            inicioRenovacao.setMonth(inicioRenovacao.getMonth() + meses);

            await db.collection('usuarios').doc(renovarModal.id).update({
                expiraEm: inicioRenovacao.toISOString(),
                status_assinatura: 'ativa',
                plano: nomePlano, // SALVANDO SE É 'cmv' ou 'completo'
                vencimento: null 
            });

            alert(`Acesso renovado com sucesso! O cliente agora está no plano: ${nomePlano.toUpperCase()}`);
            setRenovarModal(null);
            fetchUsuarios(); 
        } catch (error) {
            console.error("Erro ao renovar:", error);
            alert("Erro ao renovar assinatura.");
        }
    };

    const suspenderAcesso = async (userId) => {
        const confirmar = window.confirm("🚨 ATENÇÃO: Tem certeza que deseja SUSPENDER o acesso deste cliente? Ele será bloqueado imediatamente.");
        if (!confirmar) return;
        try {
            await db.collection('usuarios').doc(userId).update({
                expiraEm: '2000-01-01T00:00:00.000Z',
                status_assinatura: 'bloqueado',
                plano: 'suspenso'
            });
            alert("Acesso do cliente suspenso com sucesso!");
            fetchUsuarios(); 
        } catch (error) {
            console.error("Erro ao suspender:", error);
            alert("Erro ao suspender cliente.");
        }
    };

    if (usuarioLogado?.role !== 'master') {
        return <div className="p-4 text-red-500 font-black text-center mt-10">Acesso Negado. Esta área é restrita para administradores.</div>;
    }

    return (
        <div className="p-6 fade-in bg-slate-50 min-h-screen relative">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Icon name="shield" size={24} className="text-indigo-600" />
                        Painel Master de Assinaturas
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Gestão de Liberação e Bloqueio de Clientes SaaS</p>
                </div>
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md">
                    Total de Usuários: {usuarios.length}
                </div>
            </div>

            {loading ? (
                <div className="text-center p-10 text-slate-500 font-bold">Buscando clientes no Firebase...</div>
            ) : usuarios.length === 0 ? (
                <div className="text-center p-10 text-slate-500 font-bold bg-white rounded-xl border border-slate-200">Nenhum usuário encontrado.</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white text-[12px] uppercase tracking-wider">
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Plano Atual</th>
                                <th className="p-4">Vencimento / Próx. Renovação</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Ações de Acesso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {usuarios.map(user => {
                                const status = calcularStatus(user.expiraEm, user.status_assinatura);
                                return (
                                    <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${status.texto === 'Bloqueado' ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-4">
                                            <p className="font-black text-slate-800">
                                                {user.nome || user.email}
                                                {user.role === 'master' && (
                                                    <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase font-bold tracking-widest align-middle">Master</span>
                                                )}
                                            </p>
                                            {user.nome && <p className="text-[11px] text-slate-500">{user.email}</p>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold uppercase text-[11px] px-2 py-1 rounded ${user.plano === 'suspenso' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                                                {user.plano || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">
                                            {user.expiraEm && user.expiraEm !== '2000-01-01T00:00:00.000Z' 
                                                ? user.expiraEm.split('T')[0].split('-').reverse().join('/') 
                                                : '--'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${status.cor}`}>
                                                {status.texto} {status.dias > 0 && status.texto !== 'Bloqueado' && `(${status.dias} dias)`}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button onClick={() => setRenovarModal(user)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-3 py-2 rounded transition-colors font-black text-[10px] uppercase flex items-center gap-1" title="Renovar Assinatura">
                                                <Icon name="check-circle" size={14} /> Renovar
                                            </button>
                                            {user.id !== usuarioLogado.uid && (
                                                <button onClick={() => suspenderAcesso(user.id)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-3 py-2 rounded transition-colors font-black text-[10px] uppercase flex items-center gap-1" title="Suspender e Bloquear Acesso">
                                                    <Icon name="lock" size={14} /> Suspender
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL DE RENOVAÇÃO DIVIDIDO EM 2 COLUNAS */}
            {renovarModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-2xl border-t-4 border-emerald-500 scale-up-center relative">
                        <button onClick={() => setRenovarModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                            <Icon name="x" size={20} />
                        </button>
                        
                        <h3 className="font-black text-slate-800 text-lg mb-1 uppercase tracking-wider">Renovar Assinatura</h3>
                        <p className="text-[11px] font-bold text-slate-500 mb-5 uppercase">
                            Cliente: <span className="text-emerald-600">{renovarModal.nome || renovarModal.email}</span>
                        </p>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* COLUNA PLANO CMV */}
                            <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-black text-slate-700 uppercase mb-3 text-center border-b border-slate-200 pb-2">Liberar Só CMV</h4>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => executarRenovacao(1, 'cmv')} className="p-2.5 border border-slate-200 bg-white rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-bold text-[10px] text-slate-600 uppercase transition-colors">
                                        +1 Mês (CMV)
                                    </button>
                                    <button onClick={() => executarRenovacao(6, 'cmv')} className="p-2.5 border border-slate-200 bg-white rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-bold text-[10px] text-slate-600 uppercase transition-colors">
                                        +6 Meses (CMV)
                                    </button>
                                    <button onClick={() => executarRenovacao(12, 'cmv')} className="p-2.5 border border-slate-200 bg-white rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-bold text-[10px] text-slate-600 uppercase transition-colors">
                                        +1 Ano (CMV)
                                    </button>
                                </div>
                            </div>

                            {/* COLUNA PLANO COMPLETO */}
                            <div className="flex-1 bg-emerald-50 p-4 rounded-xl border border-emerald-200 relative">
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm whitespace-nowrap">Acesso Total</span>
                                <h4 className="text-xs font-black text-emerald-800 uppercase mb-3 text-center border-b border-emerald-200 pb-2">Liberar Completo</h4>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => executarRenovacao(1, 'completo')} className="p-2.5 border border-emerald-200 bg-white rounded-lg hover:border-emerald-500 hover:bg-emerald-100 font-bold text-[10px] text-emerald-700 uppercase transition-colors">
                                        +1 Mês (Completo)
                                    </button>
                                    <button onClick={() => executarRenovacao(6, 'completo')} className="p-2.5 border border-emerald-200 bg-white rounded-lg hover:border-emerald-500 hover:bg-emerald-100 font-bold text-[10px] text-emerald-700 uppercase transition-colors">
                                        +6 Meses (Completo)
                                    </button>
                                    <button onClick={() => executarRenovacao(12, 'completo')} className="p-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-black text-[10px] uppercase shadow-sm transition-colors">
                                        +1 Ano (Completo)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PainelMaster;