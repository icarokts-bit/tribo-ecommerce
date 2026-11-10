import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { db } from '../firebase';
import Icon from '../components/Icon';

export default function Cardapio() {
    // 1. Lê o link da loja a partir do URL (ex: "alua3d")
    const { slug } = useParams();
    
    const [lojaInfo, setLojaInfo] = useState(null);
    const [lojaUid, setLojaUid] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [erroLoja, setErroLoja] = useState(false);

    // Motor de busca da loja e carregamento de dados
    useEffect(() => {
        if (!slug) return;

        const carregarLojaEProdutos = async () => {
            try {
                // PASSO A: Procurar o UID do dono da loja que tem este slug
                let donoEncontradoUid = null;
                let infoLojaEncontrada = null;

                // Como a loja do cliente está dentro do documento 'storeProfile' de cada UID,
                // precisamos de usar um collectionGroup para procurar em todos os users.
                const profilesSnapshot = await db.collectionGroup('settings').where('linkPersonalizado', '==', slug.toLowerCase()).get();

                if (profilesSnapshot.empty) {
                    setErroLoja(true);
                    setLoading(false);
                    return;
                }

                // Encontramos a loja! Pegamos os dados e extraímos o UID do dono a partir do caminho (path) do documento
                const docLoja = profilesSnapshot.docs[0];
                infoLojaEncontrada = docLoja.data();
                
                // O caminho no Firebase é: artifacts/tribo-burger-financeiro/users/UID_DO_DONO/settings/storeProfile
                // Então dividimos a string do caminho e pegamos o UID (que está na 4ª posição, índice 3)
                donoEncontradoUid = docLoja.ref.path.split('/')[3]; 

                setLojaInfo(infoLojaEncontrada);
                setLojaUid(donoEncontradoUid);

                // PASSO B: Agora que temos o UID do dono, vamos carregar os produtos e categorias DELE
                if (donoEncontradoUid) {
                    // Carrega as Categorias
                    const catSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoEncontradoUid}/menu_categories`).orderBy('order').get();
                    const catData = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCategorias(catData);

                    // Carrega os Produtos (Receitas e Combos)
                    // (Simplificando: pega tudo o que é vendido na loja)
                    const [recipesSnap, combosSnap] = await Promise.all([
                        db.collection(`artifacts/tribo-burger-financeiro/users/${donoEncontradoUid}/recipes`).where('sellable', '==', true).get(),
                        db.collection(`artifacts/tribo-burger-financeiro/users/${donoEncontradoUid}/combos`).get()
                    ]);

                    const recipesData = recipesSnap.docs.map(d => ({ id: d.id, _t: 'item', ...d.data() }));
                    const combosData = combosSnap.docs.map(d => ({ id: d.id, _t: 'combo', ...d.data() }));
                    
                    setProdutos([...recipesData, ...combosData]);
                }

            } catch (error) {
                console.error("Erro ao carregar loja:", error);
                setErroLoja(true);
            }
            setLoading(false);
        };

        carregarLojaEProdutos();
    }, [slug]);

    // Tela de Carregamento
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Icon name="loader" size={48} className="animate-spin text-slate-300 mb-4" />
                <p className="font-black tracking-widest text-slate-400 uppercase text-sm">Carregando Cardápio...</p>
            </div>
        );
    }

    // Tela de Erro (Loja não encontrada)
    if (erroLoja || !lojaInfo) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <Icon name="store" size={64} className="text-slate-300 mb-4" />
                <h1 className="text-2xl font-black text-slate-800 uppercase mb-2">Loja não encontrada</h1>
                <p className="text-slate-500 font-bold mb-6">O link que acessou não existe ou foi desativado.</p>
                <a href="/" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs">Criar a minha loja grátis</a>
            </div>
        );
    }

    // ==========================================
    // RENDERIZAÇÃO DA VITRINE DA LOJA DO CLIENTE
    // ==========================================
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24">
            
            {/* CABEÇALHO / BANNER */}
            <div className="relative w-full h-48 md:h-64 bg-slate-800">
                {lojaInfo.bannerUrl ? (
                    <img src={lojaInfo.bannerUrl} alt={`Capa da loja ${lojaInfo.nomeLoja}`} className="w-full h-full object-cover opacity-80" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600"><Icon name="image" size={48}/></div>
                )}
                
                {/* DEGRADÊ PARA MELHORAR LEITURA */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            </div>

            {/* INFO DA LOJA (LOGOTIPO E NOME) */}
            <div className="max-w-4xl mx-auto px-4 relative -mt-16 md:-mt-20 z-10 flex flex-col md:flex-row items-center md:items-end gap-4 mb-8">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl p-1 shadow-xl shrink-0">
                    {lojaInfo.logoUrl ? (
                        <img src={lojaInfo.logoUrl} alt={`Logo ${lojaInfo.nomeLoja}`} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                        <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                            <span className="font-black text-xs uppercase text-center leading-tight">{lojaInfo.nomeLoja || 'Sua Loja'}</span>
                        </div>
                    )}
                </div>
                <div className="text-center md:text-left flex-1 md:pb-2">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tight">{lojaInfo.nomeLoja || 'Sua Loja'}</h1>
                    {lojaInfo.mostrarEndereco && lojaInfo.endereco && (
                        <p className="text-slate-500 font-bold text-sm mt-1 flex items-center justify-center md:justify-start gap-1">
                            <Icon name="map-pin" size={14} /> {lojaInfo.endereco}
                        </p>
                    )}
                </div>
            </div>

            {/* CORPO DO CARDÁPIO */}
            <main className="max-w-4xl mx-auto px-4 space-y-12">
                
                {produtos.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                        <Icon name="package" size={48} className="text-slate-300 mb-4 mx-auto" />
                        <h3 className="font-black text-slate-500 uppercase tracking-widest text-sm">Loja Vazia</h3>
                        <p className="text-slate-400 font-bold text-xs mt-2">Esta loja ainda não cadastrou produtos para venda.</p>
                    </div>
                ) : (
                    <>
                        {/* Renderiza categorias e os produtos dentro delas */}
                        {categorias.map(cat => {
                            // Filtra produtos desta categoria
                            const prodsNestaCat = produtos.filter(p => p.category === cat.id);
                            
                            // Se a categoria estiver vazia, não a mostra
                            if (prodsNestaCat.length === 0) return null;

                            return (
                                <section key={cat.id}>
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        {cat.name}
                                        <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                                    </h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {prodsNestaCat.map(prod => (
                                            <div key={prod.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex gap-4 hover:border-blue-300 transition-colors cursor-pointer group">
                                                
                                                <div className="flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="font-black text-slate-800 text-sm uppercase group-hover:text-blue-600 transition-colors">{prod.name}</h3>
                                                        {prod.description && (
                                                            <p className="text-[11px] text-slate-500 font-bold mt-1 line-clamp-2 leading-relaxed">
                                                                {prod.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="mt-3">
                                                        <span className="font-black text-emerald-600 text-base">
                                                            R$ {Number(prod.sellingPrice || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* FOTO DO PRODUTO (Se houver no futuro) */}
                                                <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
                                                    {prod.imageUrl ? (
                                                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icon name="image" size={24} className="text-slate-300" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )}
            </main>

            {/* CARRINHO FLUTUANTE (Mockup) */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Icon name="shopping-bag" size={24} />
                        <span className="font-black uppercase text-xs tracking-widest">Sacola Vazia</span>
                    </div>
                    <button className="bg-slate-200 text-slate-400 px-6 py-3 rounded-xl font-black uppercase text-xs cursor-not-allowed">
                        Ver Sacola
                    </button>
                </div>
            </div>

        </div>
    );
}