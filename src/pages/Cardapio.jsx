import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import Icon from '../components/Icon';

// Importa os 5 templates
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
                
                // Pega os dados e garante que tem cor e template padrão se o cliente não tiver escolhido
                const info = docLoja.data();
                if(!info.corPrincipal) info.corPrincipal = '#3b82f6';
                if(!info.templateSelecionado) info.templateSelecionado = 'minimalista';
                setLojaInfo(info);

                const catSnap = await db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/menu_categories`).orderBy('order').get();
                setCategorias(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                const [recipesSnap, combosSnap] = await Promise.all([
                    db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/recipes`).where('sellable', '==', true).get(),
                    db.collection(`artifacts/tribo-burger-financeiro/users/${donoUid}/combos`).get()
                ]);

                const recipes = recipesSnap.docs.map(d => ({ id: d.id, _t: 'item', ...d.data() }));
                const combos = combosSnap.docs.map(d => ({ id: d.id, _t: 'combo', ...d.data() }));
                setProdutos([...recipes, ...combos]);

            } catch (error) { console.error(error); }
            setLoading(false);
        };
        carregarDados();
    }, [slug]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Icon name="loader" className="animate-spin text-slate-300" size={48}/></div>;
    if (!lojaInfo) return <div className="text-center p-10"><h1 className="text-2xl font-black">Loja não encontrada</h1></div>;

    // INJEÇÃO MÁGICA DA COR (Variável CSS Global)
    const estiloDinamico = { '--cor-primaria': lojaInfo.corPrincipal };
    
    // ESCOLHE O COMPONENTE CERTO
    const ComponenteVisual = TEMPLATES[lojaInfo.templateSelecionado] || TemplateMinimalista;

    return (
        <div style={estiloDinamico} className="w-full min-h-screen">
            <ComponenteVisual loja={lojaInfo} produtos={produtos} categorias={categorias} />
        </div>
    );
}