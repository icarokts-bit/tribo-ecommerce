import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import Icon from '../../components/Icon';

export default function AjustesImpressao() {
    const [regras, setRegras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    // NOVOS ESTADOS PARA A BUSCA DE IMPRESSORAS
    const [impressorasLocais, setImpressorasLocais] = useState([]);
    const [buscandoImpressoras, setBuscandoImpressoras] = useState(false);

    const [novaRegra, setNovaRegra] = useState({
        setor: 'Caixa',
        tipo: 'padrao',
        nomeCompartilhado: '',
        bobina: '80mm',
        vias: 1
    });

    useEffect(() => {
        const fetchRegras = async () => {
            const user = auth.currentUser;
            if (!user) return;
            const snap = await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/printer_rules`).get();
            if (snap.exists && snap.data().regras) {
                setRegras(snap.data().regras);
            }
            setLoading(false);
        };
        fetchRegras();
    }, []);

    const handleSalvarRegras = async (regrasAtualizadas) => {
        setSalvando(true);
        const user = auth.currentUser;
        await db.doc(`artifacts/tribo-burger-financeiro/users/${user.uid}/delivery_settings/printer_rules`).set({
            regras: regrasAtualizadas
        }, { merge: true });
        setRegras(regrasAtualizadas);
        setSalvando(false);
    };

    // NOVA FUNÇÃO: BATE LÁ NO AGENTE LOCAL PARA BUSCAR A LISTA DO WINDOWS
    const buscarImpressorasDoAgente = async () => {
        setBuscandoImpressoras(true);
        try {
            const response = await fetch('http://localhost:8080/impressoras');
            if (!response.ok) throw new Error('Agente falhou');
            const data = await response.json();
            setImpressorasLocais(data);
        } catch (error) {
            alert("Não foi possível conectar. O Agente 'Tribo Print' está rodando no seu computador?");
        } finally {
            setBuscandoImpressoras(false);
        }
    };

    const adicionarRegra = () => {
        if (!novaRegra.nomeCompartilhado) {
            alert("Selecione uma impressora válida e compartilhada na lista.");
            return;
        }
        const regraComId = { ...novaRegra, id: crypto.randomUUID() };
        handleSalvarRegras([...regras, regraComId]);
        setNovaRegra({ setor: 'Caixa', tipo: 'padrao', nomeCompartilhado: '', bobina: '80mm', vias: 1 });
        setImpressorasLocais([]); // Limpa a busca após adicionar
    };

    const removerRegra = (idParaRemover) => {
        const confirmou = window.confirm("Excluir esta impressora?");
        if (confirmou) {
            handleSalvarRegras(regras.filter(r => r.id !== idParaRemover));
        }
    };

    if (loading) return <div className="p-10 font-bold text-slate-500">Carregando configurações...</div>;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-4xl">
            <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                    <Icon name="printer" size={24} className="text-emerald-500" /> Roteamento de Impressoras (Agente Local)
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">Configure para quais impressoras o sistema deve enviar os cupons automaticamente.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Setor</label>
                    <input type="text" value={novaRegra.setor} onChange={e => setNovaRegra({...novaRegra, setor: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none" placeholder="Ex: Chapa" />
                </div>
                <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo de Cupom</label>
                    <select value={novaRegra.tipo} onChange={e => setNovaRegra({...novaRegra, tipo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                        <option value="padrao">Padrão (Completo)</option>
                        <option value="producao">Produção (S/ Preço)</option>
                    </select>
                </div>
                
                {/* CAMPO ATUALIZADO: BOTÃO DE BUSCA + SELECT DINÂMICO */}
                <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex justify-between items-center">
                        Impressora no Windows
                        <button 
                            type="button" 
                            onClick={buscarImpressorasDoAgente} 
                            disabled={buscandoImpressoras}
                            className="text-emerald-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                            <Icon name="search" size={10} className={buscandoImpressoras ? "animate-pulse" : ""} /> 
                            {buscandoImpressoras ? 'Buscando...' : 'Buscar Instalações'}
                        </button>
                    </label>
                    
                    {impressorasLocais.length > 0 ? (
                        <select 
                            value={novaRegra.nomeCompartilhado} 
                            onChange={e => setNovaRegra({...novaRegra, nomeCompartilhado: e.target.value})} 
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white"
                        >
                            <option value="">Selecione uma impressora...</option>
                            {impressorasLocais.map((imp, idx) => (
                                <option 
                                    key={idx} 
                                    value={imp.ShareName || ''} 
                                    disabled={!imp.Shared} 
                                    className={!imp.Shared ? "text-red-400 font-normal" : "text-emerald-700 font-bold"}
                                >
                                    {imp.Name} {imp.Shared ? `(✔ Pronta)` : '(⚠️ COMPARTILHE PRIMEIRO)'}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div 
                            onClick={buscarImpressorasDoAgente}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-400 bg-white cursor-pointer hover:bg-slate-50 flex items-center"
                        >
                            Clique em Buscar Instalações...
                        </div>
                    )}
                </div>

                <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Bobina</label>
                    <select value={novaRegra.bobina} onChange={e => setNovaRegra({...novaRegra, bobina: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none bg-white">
                        <option value="80mm">80mm</option>
                        <option value="58mm">58mm</option>
                    </select>
                </div>
                <div className="space-y-1 md:col-span-1 flex gap-2">
                    <div className="w-16">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Vias</label>
                        <input type="number" min="1" max="5" value={novaRegra.vias} onChange={e => setNovaRegra({...novaRegra, vias: Number(e.target.value)})} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none" />
                    </div>
                    <button onClick={adicionarRegra} disabled={salvando} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors h-[42px] mt-auto">
                        <Icon name="plus" size={18} />
                    </button>
                </div>
            </div>

            <h3 className="text-sm font-black text-slate-800 uppercase mb-3">Impressoras Ativas</h3>
            <div className="space-y-3">
                {regras.length === 0 && <p className="text-slate-400 text-sm font-bold py-6 text-center border-2 border-dashed border-slate-100 rounded-xl">Nenhuma impressora configurada.</p>}
                
                {regras.map(regra => (
                    <div key={regra.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-6">
                            <div className="flex items-center gap-3 w-40">
                                <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Icon name="printer" size={16} /></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Setor</p><p className="font-bold text-slate-800">{regra.setor}</p></div>
                            </div>
                            <div className="w-40"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Rede Windows</p><p className="font-bold text-emerald-600">\\ {regra.nomeCompartilhado}</p></div>
                            <div className="w-32"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Layout</p><p className="font-bold text-slate-700">{regra.tipo === 'padrao' ? 'Padrão Completo' : 'Produção / Cozinha'}</p></div>
                            <div className="w-20"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Bobina</p><p className="font-bold text-slate-700">{regra.bobina}</p></div>
                            <div className="w-16"><p className="text-[10px] font-black text-slate-400 uppercase leading-none">Vias</p><p className="font-bold text-slate-700 bg-slate-100 text-center rounded">{regra.vias}x</p></div>
                        </div>
                        <button onClick={() => removerRegra(regra.id)} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-lg border border-slate-200 transition-colors"><Icon name="trash" size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}