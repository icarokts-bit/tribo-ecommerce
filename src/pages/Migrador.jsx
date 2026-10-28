import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db as newDb } from '../firebase'; // Importa o banco NOVO do seu SaaS

// ⚠️ COLOQUE AQUI AS CREDENCIAIS DO SEU FIREBASE ANTIGO (TRIBO BURGER)
const oldFirebaseConfig = {
    apiKey: "SUA_API_KEY_ANTIGA",
    authDomain: "SEU_DOMAIN_ANTIGO",
    projectId: "SEU_PROJECT_ID_ANTIGO",
    storageBucket: "SEU_BUCKET_ANTIGO",
    messagingSenderId: "SEU_SENDER_ANTIGO",
    appId: "SEU_APP_ID_ANTIGO"
};

// Inicializa o app antigo em paralelo com o novo (sem dar conflito)
const oldApp = firebase.apps.find(app => app.name === 'TriboAntiga') || firebase.initializeApp(oldFirebaseConfig, 'TriboAntiga');
const oldDb = oldApp.firestore();

function Migrador() {
    const [oldUid, setOldUid] = useState('');
    const [newUid, setNewUid] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const colecoesParaMigrar = [
        'recipes', 
        'complements', 
        'combos', 
        'fixedCosts', 
        'dailyRecords', 
        'settings',
        'transactions'
    ];

    const iniciarMigracao = async () => {
        if (!oldUid || !newUid) return alert("Preencha os dois UIDs!");
        if (!window.confirm("Isso vai puxar os dados do Firebase antigo e injetar no novo. Confirma?")) return;
        
        setLoading(true);
        setStatus('Iniciando migração...');

        try {
            // 1. Copia o documento principal do usuário (Perfil, Nome, etc)
            setStatus('Copiando perfil do usuário...');
            const userDoc = await oldDb.collection('usuarios').doc(oldUid).get();
            if (userDoc.exists) {
                await newDb.collection('usuarios').doc(newUid).set(userDoc.data(), { merge: true });
            }

            // 2. Copia todas as subcoleções listadas
            for (const colecao of colecoesParaMigrar) {
                setStatus(`Copiando ${colecao}...`);
                const snapshot = await oldDb.collection(`usuarios/${oldUid}/${colecao}`).get();
                
                if (!snapshot.empty) {
                    const batch = newDb.batch();
                    snapshot.forEach(doc => {
                        const newRef = newDb.collection(`usuarios/${newUid}/${colecao}`).doc(doc.id);
                        batch.set(newRef, doc.data(), { merge: true });
                    });
                    await batch.commit();
                }
            }

            setStatus('✅ Migração concluída com sucesso!');
        } catch (error) {
            console.error("Erro na migração:", error);
            setStatus(`❌ Erro: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-xl mx-auto space-y-6 bg-white rounded-xl shadow-xl mt-10 border-t-4 border-emerald-500">
            <h2 className="text-2xl font-black text-slate-800">Migrador de Banco de Dados</h2>
            <p className="text-sm font-bold text-slate-500">Transfira um usuário completo do sistema Tribo Burger para o novo SaaS.</p>
            
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">UID do Usuário ANTIGO (Tribo Burger)</label>
                    <input 
                        type="text" 
                        className="w-full p-3 border border-slate-300 rounded font-bold outline-none focus:border-emerald-500 bg-slate-50 mt-1" 
                        value={oldUid} 
                        onChange={e => setOldUid(e.target.value)} 
                        placeholder="Ex: u8D9asjd923jkas..."
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">UID do Usuário NOVO (SaaS)</label>
                    <input 
                        type="text" 
                        className="w-full p-3 border border-slate-300 rounded font-bold outline-none focus:border-emerald-500 bg-slate-50 mt-1" 
                        value={newUid} 
                        onChange={e => setNewUid(e.target.value)} 
                        placeholder="Ex: Pk289daksd210d..."
                    />
                </div>

                <button 
                    onClick={iniciarMigracao} 
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase rounded shadow-lg transition-all disabled:opacity-50"
                >
                    {loading ? 'Processando...' : 'Iniciar Migração'}
                </button>

                {status && (
                    <div className="p-4 bg-slate-900 text-emerald-400 rounded-lg font-bold text-sm text-center">
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Migrador;