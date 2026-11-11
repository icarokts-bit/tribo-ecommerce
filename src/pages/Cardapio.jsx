import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import Icon from '../components/Icon';

import TemplateMinimalista from './templates/TemplateMinimalista';
import TemplateMarketplace from './templates/TemplateMarketplace';
import TemplateVibrante from './templates/TemplateVibrante';
import TemplateClassico from './templates/TemplateClassico';
import TemplateApp from './templates/TemplateApp';

const TEMPLATES = {
    'minimalista': TemplateMinimalista,
    'marketplace': TemplateMarketplace,
    'vibrante': TemplateVibrante,
    'classico': TemplateClassico,
    'app': TemplateApp
};

export default function Cardapio() {
    const { slug } = useParams();
    const [lojaInfo, setLojaInfo] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const carregarDados = async () => {
            try {
                const profilesSnap = await db.collectionGroup('settings').where('linkPersonalizado', '==', slug.toLowerCase()).get();
                if (profilesSnap.empty) { setLoading(false); return; }

                const docLoja = profilesSnap.docs[0];
                const donoUid = docLoja.ref.path.split('/')[3]; 
                
                const info = docLoja.data();
                if (!info.corPrincipal) info.corPrincipal = '#3b82f6';
                if (!info.templateSelecionado) info.templateSelecionado = 'minimalista';
                setLojaInfo(info);

                // Carrega os produtos do catalog_state (onde a tela Produtos.jsx salva)
                const catalogDoc = await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/delivery/catalog_state`).get();
                if (catalogDoc.exists && catalogDoc.data().products) {
                    const ativos = catalogDoc.data().products
                        .filter(p => p.isActive !== false)
                        .map(p => ({ ...p, sellingPrice: p.isPromo ? p.promoPrice : p.price }));
                    
                    setProdutos(ativos);

                    // Extrai as categorias únicas dos produtos cadastrados
                    const catsUnicas = [...new Set(ativos.map(p => p.category).filter(Boolean))].map(c => ({ id: c, name: c }));
                    setCategorias(catsUnicas);
                }
            } catch (error) { console.error("Erro ao carregar vitrine:", error); }
            setLoading(false);
        };
        carregarDados();
    }, [slug]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Icon name="loader" className="animate-spin text-slate-300" size={48}/></div>;
    if (!lojaInfo) return <div className="text-center p-10"><h1 className="text-2xl font-black">Loja não encontrada</h1></div>;

    const estiloDinamico = { '--cor-primaria': lojaInfo.corPrincipal };
    const ComponenteVisual = TEMPLATES[lojaInfo.templateSelecionado] || TemplateMinimalista;

    return (
        <div style={estiloDinamico} className="w-full min-h-screen">
            <ComponenteVisual loja={lojaInfo} produtos={produtos} categorias={categorias} />
        </div>
    );
}