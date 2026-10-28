import React, { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon';
import { formatMoney } from '../utils/finance';

function ConsultorIA({ stats, faturamentoTotal, filterMonth, user }) {
    // DESCOBRE O NOME DO CLIENTE LOGADO
    const nomeUsuario = user?.displayName ? user.displayName.toUpperCase() : (user?.email ? user.email.split('@')[0].toUpperCase() : 'USUÁRIO');

    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [isConfigOpen, setIsConfigOpen] = useState(!localStorage.getItem('gemini_api_key'));
    
    // AGORA A MENSAGEM INICIAL USA A VARIÁVEL DINÂMICA DO NOME
    const [messages, setMessages] = useState([
        { role: 'ai', text: `Olá, ${nomeUsuario}! Sou o seu Consultor Financeiro IA. Já analisei os seus números de faturamento deste mês. O que gostaria de saber?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const handleSaveKey = () => {
        localStorage.setItem('gemini_api_key', apiKey.trim());
        localStorage.removeItem('gemini_active_model'); 
        setIsConfigOpen(false);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !apiKey) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        const cleanKey = apiKey.trim();
        
        // VARIÁVEIS EXATAS PARA O CÁLCULO
        const ticketDiario = stats.ticketDiario || 0;
        const custosTotais = faturamentoTotal - stats.lucro;

        // O NOVO CÉREBRO: Regras estritas de comportamento e cálculo
        const combinedPrompt = `Você é um Consultor Financeiro Sênior ajudando o dono da hamburgueria 'Tribo Sistemas'.

DADOS FINANCEIROS REAIS DO MÊS ${filterMonth}:
- Faturamento Atual (Receita): ${formatMoney(faturamentoTotal)}
- Média de Venda por Dia (Ticket Diário): ${formatMoney(ticketDiario)}
- Total de Pedidos: ${stats.totalPedidos}
- Ticket Médio por Pedido: ${formatMoney(stats.ticketPedido)}
- Custos Lançados (Fixos + Variáveis): ${formatMoney(custosTotais)}
- Resultado Parcial Atual: ${formatMoney(stats.lucro)}

REGRAS ESTRITAS PARA A SUA RESPOSTA:
1. NÃO SEJA ALARMISTA: Se o resultado parcial estiver negativo, lembre que é absolutamente normal no meio do mês, pois os custos fixos são lançados de forma antecipada ou integral, enquanto a receita entra aos poucos.
2. FAÇA A MATEMÁTICA EXATA: Se ele pedir uma projeção, CALCULE. Use a "Média de Venda por Dia" (${formatMoney(ticketDiario)}) multiplicada pelos dias úteis que ele informar, e some com o Faturamento Atual. Mostre o cálculo na tela.
3. AJA COMO UM DIRETOR FINANCEIRO: Seja direto, analítico e resolutivo. Responda exatamente à pergunta. Sem discursos genéricos.

Mensagem do dono da Tribo Sistemas: "${userMsg}"`;

        try {
            let activeModel = localStorage.getItem('gemini_active_model');
            
            if (!activeModel) {
                const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
                const modelsData = await modelsRes.json();
                
                if (modelsData.error) throw new Error(modelsData.error.message);

                const validModels = (modelsData.models || []).filter(m => 
                    m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
                );
                
                const preferred = ['models/gemini-1.5-flash', 'models/gemini-1.5-pro', 'models/gemini-pro', 'models/gemini-1.0-pro'];
                
                let chosenModel = null;
                for (let pref of preferred) {
                    if (validModels.some(m => m.name === pref)) {
                        chosenModel = pref;
                        break;
                    }
                }
                
                if (!chosenModel && validModels.length > 0) chosenModel = validModels[0].name;
                if (!chosenModel) throw new Error("Nenhum servidor de IA compatível foi encontrado.");
                
                activeModel = chosenModel.replace('models/', '');
                localStorage.setItem('gemini_active_model', activeModel);
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${cleanKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: combinedPrompt }] }]
                })
            });

            const data = await response.json();
            
            if (data.error) {
                if (data.error.code === 404) localStorage.removeItem('gemini_active_model');
                throw new Error(data.error.message);
            } else {
                const aiText = data.candidates[0].content.parts[0].text;
                setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: `⚠️ Erro: ${error.message}` }]);
            localStorage.removeItem('gemini_active_model');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4 fade-in max-w-4xl mx-auto h-[80vh] flex flex-col">
            
            <div className="flex justify-between items-center bg-[#1A202C] text-white p-4 rounded-xl shadow-lg">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                        <Icon name="cpu" size={20}/> Consultor IA
                    </h2>
                    <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest">Inteligência Artificial conectada ao seu faturamento</p>
                </div>
                <button onClick={() => setIsConfigOpen(!isConfigOpen)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                    <Icon name="settings" size={16} className="text-slate-300" />
                </button>
            </div>

            {isConfigOpen && (
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl shadow-sm">
                    <h3 className="font-black text-indigo-800 uppercase text-[10px] mb-2 flex items-center gap-1">
                        <Icon name="key" size={12}/> Configurar Chave Mestra (Google Gemini)
                    </h3>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)} 
                            placeholder="Cole aqui a sua API Key do Google Gemini..." 
                            className="flex-1 p-2 rounded-lg border border-indigo-200 text-sm font-bold outline-none focus:border-indigo-500"
                        />
                        <button onClick={handleSaveKey} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black uppercase text-[10px] hover:bg-indigo-700 transition-colors">
                            Salvar Chave
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                            }`}>
                                {msg.role === 'ai' && <div className="text-[8px] font-black text-indigo-400 uppercase mb-1 flex items-center gap-1"><Icon name="cpu" size={10}/> Consultor IA</div>}
                                {msg.role === 'user' && <div className="text-[8px] font-black text-blue-200 uppercase mb-1 flex items-center gap-1 justify-end"><Icon name="user" size={10}/> Você</div>}
                                
                                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2 items-center">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        disabled={isLoading || !apiKey}
                        placeholder={apiKey ? "Pergunte algo sobre as vendas..." : "Configure a chave da API primeiro..."}
                        className="flex-1 p-3 bg-slate-100 border-none rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow disabled:opacity-50"
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !apiKey || !input.trim()}
                        className="p-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon name="send" size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ConsultorIA;