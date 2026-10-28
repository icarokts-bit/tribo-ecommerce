import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../components/Icon';
import { getTxMonth, p, formatMoney } from '../utils/finance';

function ExtratoDetalhado({ transactions = [], filterMonth = '' }) {
    // Modo de visualização
    const [viewMode, setViewMode] = useState('desktop');
    
    // Filtro Rápido Superior
    const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos', 'entrada', 'saida'

    // NOVOS Filtros Detalhados
    const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos', 'pago', 'pendente'
    const [buscaTexto, setBuscaTexto] = useState(''); // Busca por Fornecedor ou Descrição
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    useEffect(() => {
        if (window.innerWidth < 1024) {
            setViewMode('app');
        }
    }, []);

    // Filtra pelo mês atual e aplica os filtros detalhados antes de agrupar
    const dadosAgrupados = useMemo(() => {
        const txsFiltradas = transactions.filter(t => {
            // 1. Filtro base de Mês
            if (getTxMonth(t) !== filterMonth) return false;

            // NOVA REGRA ROBUSTA: Ignorar movimentações de saldo (Categoria e Descrição)
            const cat = (t.category || '').toLowerCase();
            const desc = (t.description || '').toLowerCase();
            const ignorarKeywords = [
                'baixa fatura', 'transferência', 'transferencia', 'tranferencia', 
                'aplicação', 'aplicacao', 'resgate', 'saque', 'fundo de', 'fundo aluguel'
            ];

            if (ignorarKeywords.some(kw => cat.includes(kw) || desc.includes(kw))) {
                return false;
            }

            // 2. Filtro de Status (AGORA SINCRONIZADO COM O VISUAL DO CARTÃO)
            if (filtroStatus !== 'todos') {
                const statusRaw = (t.status || 'pendente').toLowerCase().trim();
                const contaNome = (t.account || t.card || '').toUpperCase();
                const isCartao = contaNome.includes('CARTÃO') || contaNome.includes('CARTAO');
                
                // Define se a transação é considerada paga (seja por status manual ou por ser cartão)
                const isConsideradoPago = statusRaw === 'pago' || isCartao;

                if (filtroStatus === 'pago' && !isConsideradoPago) return false;
                if (filtroStatus === 'pendente' && isConsideradoPago) return false;
            }

            // 3. Filtro de Texto (Fornecedor, Cliente ou Descrição)
            if (buscaTexto.trim() !== '') {
                const termo = buscaTexto.toLowerCase();
                const fornecedor = (t.supplier || '').toLowerCase();
                const cliente = (t.client || '').toLowerCase();
                
                if (!fornecedor.includes(termo) && !cliente.includes(termo) && !desc.includes(termo)) {
                    return false;
                }
            }

            // 4. Filtros de Data
            if (dataInicio && t.date < dataInicio) return false;
            if (dataFim && t.date > dataFim) return false;

            return true;
        });
        
        let agrupamento = { entradas: {}, saidas: {} };
        let totais = { entradas: 0, saidas: 0 };

        txsFiltradas.forEach(t => {
            const val = p(t.amount);
            const categoriaNome = t.category || 'Sem Categoria';
            const tipo = t.type === 'entrada' ? 'entradas' : 'saidas';

            if (!agrupamento[tipo][categoriaNome]) {
                agrupamento[tipo][categoriaNome] = {
                    total: 0,
                    itens: []
                };
            }

            agrupamento[tipo][categoriaNome].total += val;
            agrupamento[tipo][categoriaNome].itens.push(t);
            totais[tipo] += val;
        });

        Object.keys(agrupamento).forEach(tipo => {
            Object.keys(agrupamento[tipo]).forEach(cat => {
                agrupamento[tipo][cat].itens.sort((a, b) => new Date(b.date) - new Date(a.date));
            });
        });

        return { agrupamento, totais, qtdTxs: txsFiltradas.length };
    }, [transactions, filterMonth, filtroStatus, buscaTexto, dataInicio, dataFim]);

    // Função para formatar a data
    const formatarData = (dataString) => {
        if (!dataString) return '--/--/----';
        const [year, month, day] = dataString.split('-');
        return `${day}/${month}/${year}`;
    };

    const limparFiltros = () => {
        setFiltroStatus('todos');
        setBuscaTexto('');
        setDataInicio('');
        setDataFim('');
    };

    // Componente para renderizar a tabela/lista de cada categoria
    const BlocoCategoria = ({ categoria, dados, tipoColor, icone }) => {
        if (dados.itens.length === 0) return null;

        return (
            <div className="glass-card mb-6 rounded-xl overflow-hidden border shadow-sm print:shadow-none print:border-slate-300 print:mb-4 fade-in">
                <div className={`p-4 border-b flex justify-between items-center ${tipoColor} print:bg-slate-100 print:text-black print:border-b-2 print:border-slate-400`}>
                    <h3 className="font-black uppercase tracking-wider text-[13px] flex items-center gap-2">
                        <Icon name={icone} size={16} />
                        {categoria}
                    </h3>
                    <div className="text-right">
                        <span className="text-[9px] uppercase tracking-widest opacity-80 block">Total Filtrado</span>
                        <span className="text-lg font-black">{formatMoney(dados.total)}</span>
                    </div>
                </div>

                {viewMode === 'desktop' ? (
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[9px] text-slate-500 uppercase tracking-wider border-b font-black print:bg-transparent print:text-black">
                                    <th className="p-3">Data Lanç/Venc</th>
                                    <th className="p-3">Descrição / Lançamento</th>
                                    <th className="p-3">Fornecedor / Cliente</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {dados.itens.map(t => {
                                    // TRATAMENTO ROBUSTO DE STATUS (Imitando o Dashboard)
                                    const statusRaw = (t.status || 'pendente').toLowerCase().trim();
                                    const contaNome = (t.account || t.card || '').toUpperCase();
                                    
                                    // Considera pago se o status for pago OU se for uma transação de Cartão de Crédito
                                    const isCartao = contaNome.includes('CARTÃO') || contaNome.includes('CARTAO');
                                    const isPago = statusRaw === 'pago' || isCartao;
                                    const displayStatus = isPago ? 'PAGO' : (t.status || 'PENDENTE').toUpperCase();

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors print:text-black">
                                            <td className="p-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-700">{formatarData(t.date)}</span>
                                                    {t.dueDate && t.dueDate !== t.date && (
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5" title="Data de Vencimento">
                                                            V: {formatarData(t.dueDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="uppercase font-black text-slate-800">{t.description || '---'}</span>
                                                    {contaNome && (
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 flex items-center gap-1">
                                                            <Icon name={isCartao ? "credit-card" : "briefcase"} size={10}/> {contaNome}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 uppercase text-slate-500 font-bold text-[10px]">{t.supplier || t.client || '---'}</td>
                                            <td className="p-3 text-center">
                                                <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${isPago ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 print:border-none print:bg-transparent print:text-black' : 'bg-amber-100 text-amber-700 border border-amber-200 print:border-none print:bg-transparent print:text-black'}`}>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className={`p-3 text-right font-black ${tipoColor.includes('red') ? 'text-red-600 print:text-black' : 'text-blue-600 print:text-black'}`}>
                                                {formatMoney(p(t.amount))}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 p-2">
                        {dados.itens.map(t => {
                            const statusRaw = (t.status || 'pendente').toLowerCase().trim();
                            const contaNome = (t.account || t.card || '').toUpperCase();
                            const isCartao = contaNome.includes('CARTÃO') || contaNome.includes('CARTAO');
                            const isPago = statusRaw === 'pago' || isCartao;
                            const displayStatus = isPago ? 'PAGO' : (t.status || 'PENDENTE').toUpperCase();

                            return (
                                <div key={t.id} className="p-2 flex flex-col gap-1.5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase text-slate-800">{t.description || '---'}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{t.supplier || t.client || 'Sem Fornecedor'}</span>
                                        </div>
                                        <span className={`text-[13px] font-black ${tipoColor.includes('red') ? 'text-red-600' : 'text-blue-600'}`}>
                                            {formatMoney(p(t.amount))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                <Icon name="calendar" size={10}/> L: {formatarData(t.date)}
                                            </span>
                                            {t.dueDate && t.dueDate !== t.date && (
                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                    <Icon name="clock" size={10}/> V: {formatarData(t.dueDate)}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${isPago ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {displayStatus}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const saldoLiquido = dadosAgrupados.totais.entradas - dadosAgrupados.totais.saidas;
    const isPositivo = saldoLiquido >= 0;

    return (
        <div className="space-y-4 fade-in print-area">
            
            <style>{`
                @media print {
                    html, body, #root, main, .overflow-y-auto, .overflow-hidden, .h-screen { height: auto !important; min-height: 100% !important; overflow: visible !important; position: static !important; display: block !important; }
                    .glass-card, tr { break-inside: avoid; page-break-inside: avoid; }
                    .print-hidden-section { display: none !important; }
                }
            `}</style>

            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1A202C] text-white p-4 rounded-xl shadow print:shadow-none print:bg-white print:text-black print:border-b-2 print:border-black print:mb-4">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-[#F8CC82] print:text-black flex items-center gap-2">
                        Extrato Detalhado
                        <span className="bg-slate-700 text-slate-200 text-[9px] px-2 py-0.5 rounded print:border print:border-black print:bg-transparent print:text-black">
                            POR CATEGORIA
                        </span>
                    </h2>
                    <p className="text-[9px] text-slate-400 mt-0.5 uppercase print:text-slate-500">Detalhamento de Lançamentos</p>
                </div>
                
                <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-3 print-hidden-section">
                    <div className="flex w-full md:w-auto bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button type="button" onClick={() => setFiltroTipo('todos')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${filtroTipo === 'todos' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Tudo</button>
                        <button type="button" onClick={() => setFiltroTipo('saida')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${filtroTipo === 'saida' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Saídas</button>
                        <button type="button" onClick={() => setFiltroTipo('entrada')} className={`flex-1 px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${filtroTipo === 'entrada' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Entradas</button>
                    </div>
                    <div className="flex w-full md:w-auto bg-slate-800 rounded-lg p-1 border border-slate-700 hidden lg:flex">
                        <button type="button" onClick={() => setViewMode('desktop')} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === 'desktop' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Icon name="monitor" size={12}/></button>
                        <button type="button" onClick={() => setViewMode('app')} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewMode === 'app' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Icon name="smartphone" size={12}/></button>
                    </div>
                    <button type="button" onClick={() => window.print()} className="w-full md:w-auto px-4 py-2 bg-[#F27A18] hover:bg-orange-500 text-black font-black uppercase text-[10px] rounded-lg shadow-md transition-colors flex items-center justify-center gap-2">
                        <Icon name="printer" size={14} /> Imprimir
                    </button>
                </div>
            </div>

            {/* BARRA DE FILTROS DETALHADOS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print-hidden-section mb-6">
                <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                        <Icon name="filter" size={12} /> Filtros de Lançamento
                    </span>
                    {(filtroStatus !== 'todos' || buscaTexto !== '' || dataInicio !== '' || dataFim !== '') && (
                        <button type="button" onClick={limparFiltros} className="text-[9px] font-black uppercase text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1">
                            <Icon name="x" size={10} /> Limpar Filtros
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Fornecedor / Descrição</label>
                        <input type="text" placeholder="Buscar..." value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-[11px] outline-none focus:border-[#F27A18] transition-colors"/>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Status de Pagamento</label>
                        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-[11px] outline-none cursor-pointer focus:border-[#F27A18] transition-colors">
                            <option value="todos">Todos os Status</option>
                            <option value="pago">Somente Pagos / Efetivados</option>
                            <option value="pendente">Somente Pendentes</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Data Inicial</label>
                        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-[11px] outline-none focus:border-[#F27A18] transition-colors"/>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Data Final</label>
                        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-[11px] outline-none focus:border-[#F27A18] transition-colors"/>
                    </div>
                </div>
            </div>

            {/* RESUMO DO FILTRO */}
            {dadosAgrupados.qtdTxs > 0 ? (
                <div className={`grid gap-4 print-hidden-section mb-6 ${filtroTipo === 'todos' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {(filtroTipo === 'todos' || filtroTipo === 'entrada') && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm text-center">
                            <span className="text-[10px] font-black uppercase text-blue-400 block">Total de Entradas (Filtrado)</span>
                            <span className="text-2xl font-black text-blue-600 block mt-1">{formatMoney(dadosAgrupados.totais.entradas)}</span>
                        </div>
                    )}
                    {(filtroTipo === 'todos' || filtroTipo === 'saida') && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm text-center">
                            <span className="text-[10px] font-black uppercase text-red-400 block">Total de Saídas (Filtrado)</span>
                            <span className="text-2xl font-black text-red-600 block mt-1">{formatMoney(dadosAgrupados.totais.saidas)}</span>
                        </div>
                    )}
                    {filtroTipo === 'todos' && (
                        <div className={`p-4 rounded-xl shadow-sm text-center border col-span-2 md:col-span-1 ${isPositivo ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                            <span className={`text-[10px] font-black uppercase block ${isPositivo ? 'text-emerald-500' : 'text-rose-500'}`}>Saldo Líquido (Filtrado)</span>
                            <span className={`text-2xl font-black block mt-1 ${isPositivo ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatMoney(saldoLiquido)}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center p-12 text-slate-400 text-sm font-bold uppercase bg-white rounded-xl border shadow-sm print-hidden-section">
                    Nenhum lançamento encontrado com esses filtros.
                </div>
            )}

            {/* RENDERIZAÇÃO DAS SAÍDAS */}
            {(filtroTipo === 'todos' || filtroTipo === 'saida') && (
                <div className="space-y-6">
                    {Object.keys(dadosAgrupados.agrupamento.saidas).length > 0 && (
                        Object.entries(dadosAgrupados.agrupamento.saidas)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([categoria, dados]) => (
                                <BlocoCategoria 
                                    key={`saida-${categoria}`} 
                                    categoria={categoria} 
                                    dados={dados} 
                                    tipoColor="bg-red-600 text-white" 
                                    icone="arrow-up-right" 
                                />
                            ))
                    )}
                </div>
            )}

            {/* RENDERIZAÇÃO DAS ENTRADAS */}
            {(filtroTipo === 'todos' || filtroTipo === 'entrada') && (
                <div className="space-y-6 mt-8">
                    {Object.keys(dadosAgrupados.agrupamento.entradas).length > 0 && (
                        Object.entries(dadosAgrupados.agrupamento.entradas)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([categoria, dados]) => (
                                <BlocoCategoria 
                                    key={`entrada-${categoria}`} 
                                    categoria={categoria} 
                                    dados={dados} 
                                    tipoColor="bg-blue-600 text-white" 
                                    icone="arrow-down-left" 
                                />
                            ))
                    )}
                </div>
            )}
        </div>
    );
}

export default ExtratoDetalhado;