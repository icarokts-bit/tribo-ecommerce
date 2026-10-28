import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { formatMoney, p, getTxMonth } from '../utils/finance';
import Icon from '../components/Icon';

function MarketingMenu({ filterMonth, transactions, user }) {
    // ESTADO DO FORMULÁRIO
    const [formData, setFormData] = useState({
        impressoes: '',
        compras: '',
        investidoAds: '',
        retorno: '',
        adicoes: '',
        valorCarrinhos: '',
        seguidoresInicio: '',
        seguidoresFinal: ''
    });

    const [isSaving, setIsSaving] = useState(false);

    // CARREGAR DADOS DO FIREBASE QUANDO MUDAR O MÊS
    useEffect(() => {
        if (!user || !filterMonth) return;
        const fetchData = async () => {
            const doc = await db.collection(`usuarios/${user.uid}/marketing`).doc(filterMonth).get();
            if (doc.exists) {
                setFormData(doc.data());
            } else {
                setFormData({
                    impressoes: '', compras: '', investidoAds: '', retorno: '',
                    adicoes: '', valorCarrinhos: '', seguidoresInicio: '', seguidoresFinal: ''
                });
            }
        };
        fetchData();
    }, [filterMonth, user]);

    // SALVAR DADOS NO FIREBASE
    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await db.collection(`usuarios/${user.uid}/marketing`).doc(filterMonth).set(formData);
            alert("Dados de marketing salvos com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar os dados.");
        }
        setIsSaving(false);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // PROCESSAR DADOS DO ERP (TRANSAÇÕES)
    const { erpAnuncios, erpTotalMarketing, erpRetornoVendas } = useMemo(() => {
        let anuncios = 0;
        let totalMark = 0;
        let vendas = 0;

        transactions.forEach(t => {
            if (getTxMonth(t) === filterMonth) {
                if (t.type === 'entrada') {
                    vendas += p(t.amount);
                }
                if (t.type === 'saida') {
                    const cat = t.category?.toLowerCase() || '';
                    if (cat.includes('marketing') || cat.includes('anúncio') || cat.includes('ads')) {
                        totalMark += p(t.amount);
                        if (cat.includes('anúncio') || cat.includes('ads') || cat.includes('tráfego') || cat.includes('facebook') || cat.includes('meta') || cat.includes('google')) {
                            anuncios += p(t.amount);
                        }
                    }
                }
            }
        });

        return { erpAnuncios: anuncios, erpTotalMarketing: totalMark, erpRetornoVendas: vendas };
    }, [transactions, filterMonth]);

    // CÁLCULOS DO TERMÔMETRO (Baseados nos inputs do form)
    const investido = p(formData.investidoAds);
    const retorno = p(formData.retorno);
    const impressoes = p(formData.impressoes);
    const compras = p(formData.compras);
    const adicoes = p(formData.adicoes);
    const valorCarrinhos = p(formData.valorCarrinhos);
    const segInicio = p(formData.seguidoresInicio);
    const segFinal = p(formData.seguidoresFinal);

    // ROAS (Return On Ad Spend)
    const roas = investido > 0 ? (retorno / investido) : 0;
    
    // Lucro Líquido (ROI)
    const lucroLiquido = retorno - investido;
    const margemRoi = investido > 0 ? (lucroLiquido / investido) * 100 : 0;

    // CPA (Custo por Aquisição/Compra)
    const cpa = compras > 0 ? (investido / compras) : 0;

    // Abandono de Carrinho (Taxa)
    const abandono = adicoes > 0 ? ((adicoes - compras) / adicoes) * 100 : 0;
    let abandonoStatus = "TAXA EXCELENTE";
    if (abandono > 70) abandonoStatus = "TAXA CRÍTICA - MUITA GENTE DESISTINDO";
    else if (abandono > 50) abandonoStatus = "TAXA DENTRO DO ACEITÁVEL";

    // Novos Seguidores
    const novosSeguidores = segFinal - segInicio;

    return (
        <div className="max-w-6xl mx-auto space-y-4 fade-in pb-10">
            
            {/* CARDS SUPERIORES ERP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-blue-500 block mb-1 tracking-wider flex items-center gap-1">
                        GASTO ERP (ANÚNCIOS)
                    </span>
                    <span className="text-xl font-black text-slate-800">{formatMoney(erpAnuncios)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-wider flex items-center gap-1">
                        $ GASTO ERP (TOTAL MARKETING)
                    </span>
                    <span className="text-xl font-black text-slate-800">{formatMoney(erpTotalMarketing)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-emerald-500 block mb-1 tracking-wider flex items-center gap-1">
                        <Icon name="trending-up" size={12}/> RETORNO GERADO (VENDAS)
                    </span>
                    <span className="text-xl font-black text-slate-800">{formatMoney(erpRetornoVendas)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUNA ESQUERDA: FORMULÁRIO */}
                <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-5 self-start">
                    <h3 className="font-black uppercase text-slate-800 text-sm mb-4 tracking-widest text-center border-b pb-3">
                        INSERIR FEEDBACK MENSAL
                    </h3>

                    {/* Conversão e Vendas */}
                    <div className="mb-4">
                        <div className="bg-blue-50 py-1.5 px-3 rounded text-center mb-3">
                            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Conversão & Vendas</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Impressões</label>
                                <input type="number" name="impressoes" value={formData.impressoes} onChange={handleChange} placeholder="EX: 108779" className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Compras (Qtd)</label>
                                <input type="number" name="compras" value={formData.compras} onChange={handleChange} placeholder="EX: 110" className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Investido Ads (R$)</label>
                                <input type="number" step="0.01" name="investidoAds" value={formData.investidoAds} onChange={handleChange} className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Retorno (R$)</label>
                                <input type="number" step="0.01" name="retorno" value={formData.retorno} onChange={handleChange} className="w-full p-2 text-xs font-bold bg-emerald-50 border border-emerald-400 rounded outline-none focus:border-emerald-600 text-emerald-700" />
                            </div>
                        </div>
                    </div>

                    {/* Funil do Carrinho */}
                    <div className="mb-4">
                        <div className="bg-orange-50 py-1.5 px-3 rounded text-center mb-3">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Funil do Carrinho</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Adições (Qtd)</label>
                                <input type="number" name="adicoes" value={formData.adicoes} onChange={handleChange} placeholder="EX: 249" className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Valor Carrinhos (R$)</label>
                                <input type="number" step="0.01" name="valorCarrinhos" value={formData.valorCarrinhos} onChange={handleChange} placeholder="EX: 11800.20" className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-orange-500" />
                            </div>
                        </div>
                    </div>

                    {/* Audiência */}
                    <div className="mb-5">
                        <div className="bg-fuchsia-50 py-1.5 px-3 rounded text-center mb-3">
                            <span className="text-[10px] font-black uppercase text-fuchsia-600 tracking-widest">Audiência (Instagram)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Seguidores Início</label>
                                <input type="number" name="seguidoresInicio" value={formData.seguidoresInicio} onChange={handleChange} placeholder="EX: 3120" className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-fuchsia-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Seguidores Final</label>
                                <input type="number" name="seguidoresFinal" value={formData.seguidoresFinal} onChange={handleChange} placeholder="EX: 3308" className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded outline-none focus:border-fuchsia-500" />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full bg-black text-[#F8CC82] font-black uppercase tracking-widest p-3 rounded-lg hover:scale-[1.02] transition-transform shadow-md text-xs"
                    >
                        {isSaving ? 'Salvando...' : 'Gravar Dados do Mês'}
                    </button>
                </div>

                {/* COLUNA DIREITA: TERMÔMETRO */}
                <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-5 self-start">
                    <h3 className="font-black uppercase text-slate-800 text-sm mb-4 tracking-widest border-b pb-3">
                        TERMÔMETRO DA CAMPANHA
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* ROAS */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
                            <span className="text-[11px] font-black uppercase text-blue-500 block mb-1 tracking-wider">ROAS (Retorno Sobre Invest.)</span>
                            <span className="text-3xl font-black text-blue-700 block mb-1">{roas.toFixed(1)}X</span>
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">A CADA R$ 1 INVESTIDO, VOLTOU R$ {roas.toFixed(2)}</span>
                        </div>
                        
                        {/* LUCRO (ROI) */}
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center">
                            <span className="text-[11px] font-black uppercase text-emerald-600 block mb-1 tracking-wider">Lucro Líquido (ROI)</span>
                            <span className="text-3xl font-black text-emerald-600 block mb-1">{formatMoney(lucroLiquido)}</span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">MARGEM DE {margemRoi > 0 ? '+' : ''}{margemRoi.toFixed(0)}% SOBRE INVESTIDO</span>
                        </div>
                        
                        {/* CPA */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                            <span className="text-[11px] font-black uppercase text-slate-500 block mb-1 tracking-wider">CPA (Custo por Compra)</span>
                            <span className="text-3xl font-black text-slate-700 block mb-1">{formatMoney(cpa)}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GASTO MÉDIO PARA FAZER 1 VENDA</span>
                        </div>

                        {/* ABANDONO */}
                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 text-center">
                            <span className="text-[11px] font-black uppercase text-orange-600 block mb-1 tracking-wider">Abandono de Carrinho</span>
                            <span className="text-3xl font-black text-orange-500 block mb-1">{abandono.toFixed(2)}%</span>
                            <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">{abandonoStatus}</span>
                        </div>
                    </div>

                    {/* NOVOS SEGUIDORES */}
                    <div className="bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl p-4 text-center mb-4">
                        <span className="text-[11px] font-black uppercase text-fuchsia-600 block mb-1 tracking-wider">Novos Seguidores</span>
                        <span className="text-3xl font-black text-fuchsia-600 block mb-1">{novosSeguidores > 0 ? `+${novosSeguidores}` : novosSeguidores}</span>
                        <span className="text-[9px] font-bold text-fuchsia-400 uppercase tracking-widest">Crescimento da base no mês</span>
                    </div>

                    {/* RESUMO DA ANÁLISE */}
                    <div className="border border-slate-300 rounded-lg p-4">
                        <span className="text-xs font-black uppercase text-slate-800 block mb-1">Resumo da Análise:</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                            Seus anúncios geraram <span className="text-blue-600">{impressoes} impressões</span> e atraíram o interesse de muita gente, resultando em <span className="text-orange-500">{adicoes} adições ao carrinho</span> (Potencial de {formatMoney(valorCarrinhos)}). Desses, <span className="text-emerald-600">{compras} pessoas fecharam pedido</span>.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default MarketingMenu;