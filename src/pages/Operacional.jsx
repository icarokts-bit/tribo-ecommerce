import React, { useState, useMemo } from 'react';
import Icon from '../components/Icon'; 

function Operacional({ logs, addOpLog, deleteOpLog }) {
    const [form, setForm] = useState({
        type: 'Troca de Gás',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Filtra as datas mais recentes para os Cards e calcula duração do gás
    const { lastGas, lastOilFilter, lastOilChange, gasDuration, daysInUse } = useMemo(() => {
        const gasLogs = logs.filter(l => l.type === 'Troca de Gás');
        const filterLogs = logs.filter(l => l.type === 'Filtragem do Óleo');
        const oilLogs = logs.filter(l => l.type === 'Troca do Óleo');

        let gasDuration = null;
        let daysInUse = null;

        // Se tem pelo menos 1 registro de gás, calcula quantos dias está em uso hoje
        if (gasLogs.length > 0) {
            const lastDate = new Date(`${gasLogs[0].date}T12:00:00`); 
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            const diffInUse = today.getTime() - lastDate.getTime();
            daysInUse = Math.floor(diffInUse / (1000 * 3600 * 24));
        }

        // Se tem pelo menos 2 registros de gás, calcula quanto tempo o anterior durou
        if (gasLogs.length > 1) {
            const currentGasDate = new Date(`${gasLogs[0].date}T12:00:00`);
            const previousGasDate = new Date(`${gasLogs[1].date}T12:00:00`);
            const diffTime = currentGasDate.getTime() - previousGasDate.getTime();
            gasDuration = Math.floor(diffTime / (1000 * 3600 * 24));
        }

        return {
            lastGas: gasLogs.length > 0 ? gasLogs[0].date : null,
            lastOilFilter: filterLogs.length > 0 ? filterLogs[0].date : null,
            lastOilChange: oilLogs.length > 0 ? oilLogs[0].date : null,
            gasDuration,
            daysInUse
        };
    }, [logs]);

    // CÁLCULO DE ALERTA 1: 5 dias ou mais sem filtrar o óleo
    const isOilFilterDelayed = useMemo(() => {
        if (!lastOilFilter) return false; 
        const lastDate = new Date(`${lastOilFilter}T12:00:00`); 
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
        return diffDays >= 5;
    }, [lastOilFilter]);

    // CÁLCULO DE ALERTA 2: 21 dias ou mais sem trocar o óleo
    const isOilChangeDelayed = useMemo(() => {
        if (!lastOilChange) return false; 
        const lastDate = new Date(`${lastOilChange}T12:00:00`); 
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
        return diffDays >= 21;
    }, [lastOilChange]);

    const handleSave = (e) => {
        e.preventDefault();
        addOpLog({ ...form, timestamp: new Date().toISOString() });
        setForm({ ...form, notes: '' }); 
    };

    const formatDate = (dateStr) => dateStr.split('-').reverse().join('/');

    return (
        <div className="space-y-6 fade-in">
            {/* CABEÇALHO */}
            <div className="flex justify-between items-center bg-[#1A202C] text-white p-4 rounded-xl shadow">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-[#F8CC82] flex items-center gap-2">
                        <Icon name="clipboard-check" size={20} /> Rotina Operacional
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Controle de Gás e Óleo</p>
                </div>
            </div>

            {/* CARDS DE RESUMO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CARD DE GÁS */}
                <div className="glass-card p-5 rounded-xl border-l-4 border-l-orange-500 bg-orange-50/50 shadow-sm relative">
                    <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">Última Troca de Gás</span>
                    <h3 className="text-xl font-black text-slate-800">
                        {lastGas ? formatDate(lastGas) : 'Sem registro'}
                    </h3>
                    
                    {/* INFO DE DURAÇÃO DO GÁS */}
                    {lastGas && (
                        <div className="mt-2 pt-2 border-t border-orange-200/50 space-y-1">
                            <p className="text-[9px] font-black text-orange-700 uppercase tracking-wide flex items-center gap-1">
                                <Icon name="clock" size={10} /> Em uso há: {daysInUse} dia(s)
                            </p>
                            {gasDuration !== null && (
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                    <Icon name="rotate-ccw" size={10} /> O anterior durou: {gasDuration} dia(s)
                                </p>
                            )}
                        </div>
                    )}
                </div>
                
                {/* CARD DE FILTRAGEM DE ÓLEO (ALERTA 5 DIAS) */}
                <div className={`glass-card p-5 rounded-xl border-l-4 shadow-sm relative overflow-hidden transition-colors ${
                    isOilFilterDelayed ? 'border-l-red-600 bg-red-50' : 'border-l-yellow-500 bg-yellow-50/50'
                }`}>
                    {isOilFilterDelayed && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg flex items-center gap-1 animate-pulse shadow-md">
                            <Icon name="alert-triangle" size={10} /> Atrasado
                        </div>
                    )}
                    <span className={`text-[10px] font-black uppercase block mb-1 ${isOilFilterDelayed ? 'text-red-600' : 'text-yellow-600'}`}>
                        Última Filtragem (Óleo)
                    </span>
                    <h3 className={`text-xl font-black ${isOilFilterDelayed ? 'text-red-700' : 'text-slate-800'}`}>
                        {lastOilFilter ? formatDate(lastOilFilter) : 'Sem registro'}
                    </h3>
                    {isOilFilterDelayed && (
                        <p className="text-[9px] font-black text-red-500 mt-1.5 uppercase tracking-wide">
                            ⚠️ Mais de 5 dias! Necessário filtrar.
                        </p>
                    )}
                </div>

                {/* CARD DE TROCA DE ÓLEO (ALERTA 21 DIAS) */}
                <div className={`glass-card p-5 rounded-xl border-l-4 shadow-sm relative overflow-hidden transition-colors ${
                    isOilChangeDelayed ? 'border-l-red-600 bg-red-50' : 'border-l-amber-700 bg-amber-50'
                }`}>
                    {isOilChangeDelayed && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg flex items-center gap-1 animate-pulse shadow-md">
                            <Icon name="alert-triangle" size={10} /> Atrasado
                        </div>
                    )}
                    <span className={`text-[10px] font-black uppercase block mb-1 ${isOilChangeDelayed ? 'text-red-600' : 'text-amber-800'}`}>
                        Última Troca de Óleo
                    </span>
                    <h3 className={`text-xl font-black ${isOilChangeDelayed ? 'text-red-700' : 'text-slate-800'}`}>
                        {lastOilChange ? formatDate(lastOilChange) : 'Sem registro'}
                    </h3>
                    {isOilChangeDelayed && (
                        <p className="text-[9px] font-black text-red-500 mt-1.5 uppercase tracking-wide">
                            ⚠️ Mais de 21 dias! Necessário trocar.
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FORMULÁRIO */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-5 rounded-xl shadow-sm bg-white border">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-4 border-b pb-2">Novo Registro</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-1">
                                <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Ação Realizada</label>
                                <select 
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-800"
                                    value={form.type}
                                    onChange={e => setForm({...form, type: e.target.value})}
                                >
                                    <option value="Troca de Gás">Troca de Gás</option>
                                    <option value="Filtragem do Óleo">Filtragem do Óleo</option>
                                    <option value="Troca do Óleo">Troca do Óleo</option>
                                </select>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Data</label>
                                <input 
                                    type="date" 
                                    required
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-800"
                                    value={form.date}
                                    onChange={e => setForm({...form, date: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-black uppercase text-slate-400 ml-1 text-[10px]">Observação (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Cilindro 45kg..."
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-800"
                                    value={form.notes}
                                    onChange={e => setForm({...form, notes: e.target.value})}
                                />
                            </div>

                            <button type="submit" className="w-full bg-[#1A202C] text-[#F8CC82] p-3 rounded-xl font-black uppercase shadow hover:bg-slate-800 transition-colors">
                                Registrar Ação
                            </button>
                        </form>
                    </div>
                </div>

                {/* TABELA DE HISTÓRICO */}
                <div className="lg:col-span-2">
                    <div className="glass-card rounded-xl overflow-hidden border shadow-sm bg-white h-full">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                                <Icon name="list" size={14} /> Histórico Operacional
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] font-bold">
                                <thead className="bg-[#1A202C] text-white uppercase text-[9px]">
                                    <tr>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Ação</th>
                                        <th className="p-3">Observação</th>
                                        <th className="p-3 text-center">Excluir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-slate-700">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="p-6 text-center text-slate-400 uppercase">Nenhum registro encontrado.</td>
                                        </tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 whitespace-nowrap">{formatDate(log.date)}</td>
                                                <td className="p-3 uppercase">
                                                    <span className={`px-2 py-1 rounded text-[9px] ${
                                                        log.type === 'Troca de Gás' ? 'bg-orange-100 text-orange-700' :
                                                        log.type === 'Filtragem do Óleo' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {log.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-500 font-normal">{log.notes || '-'}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => deleteOpLog(log.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded hover:bg-red-100 transition-colors" title="Excluir">
                                                        <Icon name="trash" size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Operacional;