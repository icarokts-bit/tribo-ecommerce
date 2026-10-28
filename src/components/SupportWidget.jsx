import React, { useState } from 'react';
import Icon from './Icon';
import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    const numeroWhatsApp = "5511971399885"; 
    // Texto do WhatsApp atualizado para Tribo Sistemas
    const mensagemPadrao = encodeURIComponent("Olá! Preciso de ajuda com o sistema Tribo Sistemas.");
    const linkWhatsapp = `https://wa.me/${numeroWhatsApp}?text=${mensagemPadrao}`;

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setIsSending(true);

        try {
            const userEmail = firebase.auth().currentUser?.email || 'Nao_logado@email.com';
            const enviarEmail = firebase.functions().httpsCallable('enviarEmailSuporte');
            
            await enviarEmail({
                assunto: emailSubject,
                mensagem: emailBody,
                emailCliente: userEmail
            });

            alert('✅ Mensagem enviada com sucesso! Retornaremos o mais breve possível.');
            
            setShowEmailModal(false);
            setEmailSubject('');
            setEmailBody('');
        } catch (error) {
            console.error("Erro no envio:", error);
            alert('❌ Erro ao enviar a mensagem. Tente novamente mais tarde ou use o WhatsApp.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
            
            {/* JANELA DE SUPORTE */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 mb-4 w-72 overflow-hidden scale-up-center origin-bottom-right">
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {/* Alterado para 'info' */}
                            <Icon name="info" size={18} className="text-emerald-400" />
                            <h3 className="font-black uppercase tracking-widest text-xs">Central de Ajuda</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <Icon name="x" size={16} />
                        </button>
                    </div>
                    
                    <div className="p-5 flex flex-col gap-3">
                        <p className="text-xs font-bold text-slate-500 mb-2">
                            Como podemos te ajudar hoje? Escolha um canal abaixo:
                        </p>
                        
                        <a 
                            href={linkWhatsapp} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-3 rounded-xl transition-colors group"
                        >
                            <div className="bg-emerald-500 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                                {/* Alterado para 'smartphone' (seguro) */}
                                <Icon name="smartphone" size={16} />
                            </div>
                            <div>
                                <span className="block text-[11px] font-black uppercase text-emerald-700">WhatsApp</span>
                                <span className="block text-[9px] font-bold text-emerald-600/70">Resposta rápida</span>
                            </div>
                        </a>

                        <button 
                            onClick={() => { setShowEmailModal(true); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl transition-colors group text-left"
                        >
                            <div className="bg-slate-800 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                                {/* Alterado para 'file-text' (seguro) */}
                                <Icon name="file-text" size={16} />
                            </div>
                            <div>
                                <span className="block text-[11px] font-black uppercase text-slate-700">Enviar E-mail</span>
                                <span className="block text-[9px] font-bold text-slate-500">Pelo sistema</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL DE COMPOSIÇÃO DE E-MAIL */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 scale-up-center">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 text-sm">
                                {/* Alterado para 'file-text' (seguro) */}
                                <Icon name="file-text" size={18} className="text-emerald-500" /> Enviar Mensagem
                            </h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Icon name="x" size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSendEmail} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Para:</label>
                                <input 
                                    type="text" 
                                    disabled 
                                    value="Suporte Tribo Sistemas" 
                                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs outline-none" 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assunto:</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ex: Dúvida sobre o lançamento de vendas" 
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs outline-none focus:border-emerald-500" 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Mensagem:</label>
                                <textarea 
                                    required 
                                    rows="4" 
                                    placeholder="Descreva o que precisa..." 
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs outline-none focus:border-emerald-500 resize-none" 
                                ></textarea>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSending}
                                    className={`flex-1 text-white font-black uppercase text-xs p-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 ${isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                >
                                    {isSending ? (
                                        <>Enviando...</>
                                    ) : (
                                        <><Icon name="check-circle" size={14} /> Enviar Mensagem</>
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowEmailModal(false)} 
                                    disabled={isSending}
                                    className="px-4 bg-slate-200 text-slate-600 font-black uppercase text-xs rounded-xl hover:bg-slate-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BOTÃO FLUTUANTE PRINCIPAL */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isOpen ? 'bg-slate-800 text-white rotate-12 scale-90' : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-110 animate-bounce'}`}
            >
                {/* Alterado para 'info' conforme você pediu */}
                {isOpen ? <Icon name="x" size={24} /> : <Icon name="info" size={28} />}
            </button>
            
        </div>
    );
}