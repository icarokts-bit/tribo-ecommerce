import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import Icon from './components/Icon'; 

// ==========================================
// IMPORTAÇÕES DAS PÁGINAS E MÓDULOS
// ==========================================

// Públicas
import Cardapio from './pages/Cardapio';
import Login from './pages/Login';

// Módulos Financeiros (Pasta Financeiro)
import DashboardFin from './pages/Financeiro/DashboardFin';
import Vendas from './pages/Financeiro/Vendas';
import Saldos from './pages/Financeiro/Saldos';
import AReceber from './pages/Financeiro/AReceber';
import APagar from './pages/Financeiro/APagar';
import Cartoes from './pages/Financeiro/Cartoes';
import Dre from './pages/Financeiro/Dre';
import Fornecedores from './pages/Financeiro/Fornecedores';
import Resultados from './pages/Financeiro/Resultados';

// Módulos E-commerce (Pasta GestaoPedidos)
import Kanban from './pages/GestaoPedidos/Kanban'; 
import Produtos from './pages/GestaoPedidos/Produtos'; 
import HistoricoPedidos from './pages/GestaoPedidos/HistoricoPedidos';
import ClientesDelivery from './pages/GestaoPedidos/ClientesDelivery';
import Fidelidade from './pages/GestaoPedidos/Fidelidade';
import AjustesImpressao from './pages/GestaoPedidos/AjustesImpressao';

// Módulos Avulsos / RH (Pasta pages)
import ExtratoDetalhado from './pages/ExtratoDetalhado';
import GestaoFuncionarios from './pages/GestaoFuncionarios';
import GestaoDelivery from './pages/GestaoDelivery';
import GestaoFreelancer from './pages/GestaoFreelancer';
import RelatorioRH from './pages/RelatorioRH'; // <--- CORREÇÃO AQUI

// ==========================================
// CONFIGURAÇÃO DOS MÓDULOS (MENU)
// ==========================================
export const modulosSaaS = [
    // Visão Geral
    { id: 'fin_dashboard', label: 'Lançamentos', icon: 'edit', group: 'Visão Geral', path: '/admin/lancamentos', planos: ['completo', 'trial', 'master'] },
    { id: 'vendas', label: 'Vendas', icon: 'shopping-cart', group: 'Visão Geral', path: '/admin/vendas', planos: ['completo', 'trial', 'master'] },
    { id: 'saldos', label: 'Saldo em Contas', icon: 'dollar-sign', group: 'Visão Geral', path: '/admin/saldos', planos: ['completo', 'trial', 'master'] },
    { id: 'operacional', label: 'Operacional', icon: 'cpu', group: 'Visão Geral', path: '/admin/operacional', planos: ['completo', 'trial', 'master'] },
    
    // Financeiro
    { id: 'a_receber', label: 'Contas a Receber', icon: 'arrow-down-circle', group: 'Financeiro', path: '/admin/a-receber', planos: ['completo', 'trial', 'master'] },
    { id: 'a_pagar', label: 'Contas a Vencer', icon: 'arrow-up-circle', group: 'Financeiro', path: '/admin/a-pagar', planos: ['completo', 'trial', 'master'] },
    { id: 'cartoes', label: 'Faturas (Cartões)', icon: 'credit-card', group: 'Financeiro', path: '/admin/cartoes', planos: ['completo', 'trial', 'master'] },
    { id: 'extrato_detalhado', label: 'Extrato Completo', icon: 'list', group: 'Financeiro', path: '/admin/extrato', planos: ['completo', 'trial', 'master'] },
    { id: 'dre', label: 'DRE', icon: 'bar-chart-2', group: 'Financeiro', path: '/admin/dre', planos: ['completo', 'trial', 'master'] },
    
    // Cadastro
    { id: 'fornecedores', label: 'Fornecedores', icon: 'package', group: 'Cadastro', path: '/admin/fornecedores', planos: ['completo', 'trial', 'master'] },

    // Equipe e RH
    { id: 'funcionarios', label: 'Funcionários', icon: 'clipboard', group: 'Equipe e RH', path: '/admin/funcionarios', planos: ['completo', 'trial', 'master'] },
    { id: 'delivery', label: 'Gestão Logística', icon: 'truck', group: 'Equipe e RH', path: '/admin/logistica', planos: ['completo', 'trial', 'master'] },
    { id: 'freelancer', label: 'Diárias (Freelas)', icon: 'clock', group: 'Equipe e RH', path: '/admin/freelancer', planos: ['completo', 'trial', 'master'] },
    { id: 'relatorio_rh', label: 'Custos de RH', icon: 'pie-chart', group: 'Equipe e RH', path: '/admin/custos-rh', planos: ['completo', 'trial', 'master'] },
    
    // Relatórios
    { id: 'resultados', label: 'Resultado Caixa', icon: 'trending-up', group: 'Relatórios', path: '/admin/resultados', planos: ['completo', 'trial', 'master'] },
    { id: 'analise', label: 'Análise de Preços', icon: 'info', group: 'Relatórios', path: '/admin/analise', planos: ['completo', 'trial', 'master'] },
    { id: 'relatorio_unificado', label: 'Relatório Completo', icon: 'file-plus', group: 'Relatórios', path: '/admin/relatorios', planos: ['completo', 'trial', 'master'] },
    { id: 'marketing', label: 'Marketing', icon: 'megaphone', group: 'Relatórios', path: '/admin/marketing', planos: ['completo', 'trial', 'master'] },

    // E-commerce Online
    { id: 'gestao_pedidos', label: 'Gestão de Pedidos', icon: 'shopping-bag', group: 'E-commerce Online', path: '/admin/pedidos', planos: ['completo', 'trial', 'master'] },
    { id: 'historico_pedidos', label: 'Histórico de Pedidos', icon: 'archive', group: 'E-commerce Online', path: '/admin/historico', planos: ['completo', 'trial', 'master'] },
    { id: 'catalogo_delivery', label: 'Catálogo de Produtos', icon: 'grid', group: 'E-commerce Online', path: '/admin/produtos', planos: ['completo', 'trial', 'master'] },
    { id: 'clientes_delivery', label: 'Clientes', icon: 'user', group: 'E-commerce Online', path: '/admin/clientes', planos: ['completo', 'trial', 'master'] },
    { id: 'areas_entrega', label: 'Áreas de Entrega', icon: 'map-pin', group: 'E-commerce Online', path: '/admin/areas-entrega', planos: ['completo', 'trial', 'master'] },
    { id: 'fidelidade', label: 'Fidelidade', icon: 'award', group: 'E-commerce Online', path: '/admin/fidelidade', planos: ['completo', 'trial', 'master'] },

    // Configurações
    { id: 'ajustes', label: 'Ajustes', icon: 'settings', group: 'Configurações', path: '/admin/ajustes', planos: ['completo', 'trial', 'master'] },
];

// ==========================================
// COMPONENTE DE LAYOUT (MENU LATERAL)
// ==========================================
function AdminLayout({ children, user }) {
  const location = useLocation();
  
  const groupedModules = modulosSaaS.reduce((acc, modulo) => {
      if (!acc[modulo.group]) acc[modulo.group] = [];
      acc[modulo.group].push(modulo);
      return acc;
  }, {});

  return (
      <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
          <aside className="w-16 md:w-64 bg-slate-900 text-white flex flex-col transition-all duration-300 shrink-0 z-50">
              <div className="h-16 flex items-center justify-center border-b border-slate-800 shrink-0 bg-slate-950">
                  <span className="hidden md:block font-black tracking-widest text-lg text-amber-400">TRIBO SISTEMAS</span>
                  <span className="block md:hidden font-black text-amber-400">TS</span>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar">
                  {Object.entries(groupedModules).map(([groupName, items]) => (
                      <div key={groupName}>
                          <h3 className="hidden md:block text-[10px] font-black uppercase text-slate-500 tracking-widest px-4 mb-2">{groupName}</h3>
                          <div className="space-y-1 px-2">
                              {items.map(item => {
                                  const isActive = location.pathname.startsWith(item.path);
                                  return (
                                      <Link 
                                          key={item.id} 
                                          to={item.path} 
                                          className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${isActive ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                          title={item.label}
                                      >
                                          <Icon name={item.icon} size={18} className="shrink-0" />
                                          <span className="hidden md:block truncate text-xs">{item.label}</span>
                                      </Link>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </nav>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-center md:justify-start gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden md:block overflow-hidden">
                      <p className="text-xs font-bold truncate text-slate-200">{user?.displayName}</p>
                      <button onClick={() => auth.signOut()} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-black tracking-widest mt-0.5 block">Sair do Sistema</button>
                  </div>
              </div>
          </aside>

          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 md:p-6 relative custom-scrollbar">
              {children}
          </main>

          <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 4px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
          `}</style>
      </div>
  );
}

// ==========================================
// ROTEAMENTO E MOTOR DE DADOS PRINCIPAL
// ==========================================
function App() {
  const [user, setUser] = useState(null);
  const [permissoes, setPermissoes] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados Globais do ERP Financeiro
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [cmvSettings, setCmvSettings] = useState({ taxaDebito: 1.5, taxaCredito: 3.5 });

  // Estados de Formulários e Filtros
  const todayStr = new Date().toISOString().split('T')[0];
  const [txForm, setTxForm] = useState({
      desc: '', val: '', type: 'saida', acc: '', destAcc: '', cat: '', sup: '',
      date: todayStr, clearance: todayStr, status: 'pago', inst: 1, feeType: 'none', feePercent: 0, nf: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [accFilter, setAccFilter] = useState('todas');
  const [catFilter, setCatFilter] = useState([]);
  const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);
  const [visibleTxCount, setVisibleTxCount] = useState(30);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) setUser(currentUser);
      else { setUser(null); setPermissoes(null); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const donoUid = permissoes?.donoUid || user?.uid;

  useEffect(() => {
    if (!donoUid) return;
    const basePath = `artifacts/tribo-burger-financeiro/users/${donoUid}`;

    const unsubTx = db.collection(`${basePath}/transactions`).onSnapshot(snap => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.log(err));

    const unsubAcc = db.collection(`${basePath}/accounts`).onSnapshot(snap => {
        setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.log(err));

    const unsubCat = db.collection(`${basePath}/categories`).onSnapshot(snap => {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.log(err));

    const unsubSup = db.collection(`${basePath}/suppliers`).onSnapshot(snap => {
        setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.log(err));

    const unsubSales = db.collection(`${basePath}/sales`).onSnapshot(snap => {
        setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.log(err));

    return () => { unsubTx(); unsubAcc(); unsubCat(); unsubSup(); unsubSales(); };
  }, [donoUid]);

  const formatMoney = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const safeDateDisplay = (dateStr) => {
      if (!dateStr) return '-';
      const parts = String(dateStr).split('T')[0].split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  const getEffectiveStatus = (t) => t?.status || 'pendente';

  const uniqueDescriptions = useMemo(() => {
      const set = new Set((transactions || []).map(t => t.description).filter(Boolean));
      return Array.from(set);
  }, [transactions]);

  const filteredDashboard = useMemo(() => {
      return (transactions || []).filter(t => {
          const matchesSearch = !searchQuery || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
          const matchesType = typeFilter === 'todos' || t.type === typeFilter;
          const matchesStatus = statusFilter === 'todos' || getEffectiveStatus(t) === statusFilter;
          const matchesAcc = accFilter === 'todas' || t.account === accFilter;
          const matchesCat = catFilter.length === 0 || catFilter.includes(t.category);
          return matchesSearch && matchesType && matchesStatus && matchesAcc && matchesCat;
      }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [transactions, searchQuery, typeFilter, statusFilter, accFilter, catFilter]);

  const handleSaveTx = async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!donoUid) return;
      const basePath = `artifacts/tribo-burger-financeiro/users/${donoUid}/transactions`;
      const amountNum = parseFloat(String(txForm.val).replace(',', '.')) || 0;
      const payload = {
          description: txForm.desc, amount: amountNum, type: txForm.type,
          account: txForm.acc, destinationAccount: txForm.destAcc || '',
          category: txForm.cat, supplier: txForm.sup || '',
          date: txForm.date, clearanceDate: txForm.clearance || txForm.date,
          status: txForm.status, installments: Number(txForm.inst) || 1,
          feeType: txForm.feeType || 'none', feePercent: Number(txForm.feePercent) || 0,
          nf: txForm.nf || '', updatedAt: new Date().toISOString()
      };
      try {
          if (txForm.id) await db.doc(`${basePath}/${txForm.id}`).update(payload);
          else await db.collection(basePath).add({ ...payload, createdAt: new Date().toISOString() });
          setTxForm({ desc: '', val: '', type: 'saida', acc: '', destAcc: '', cat: '', sup: '', date: todayStr, clearance: todayStr, status: 'pago', inst: 1, feeType: 'none', feePercent: 0, nf: '' });
      } catch (err) { console.error("Erro ao gravar transação:", err); }
  };

  const executeDelete = async (collectionName, id) => {
      if (deleteConfirmId !== id) { setDeleteConfirmId(id); return; }
      try {
          await db.doc(`artifacts/tribo-burger-financeiro/users/${donoUid}/${collectionName}/${id}`).delete();
          setDeleteConfirmId(null);
      } catch (err) { console.error("Erro ao excluir:", err); }
  };

  // Pacote de propriedades injetado em todas as páginas
  const erpProps = {
      user, permissoes, donoUid,
      transactions, setTransactions, accounts, setAccounts, categories, setCategories,
      suppliers, setSuppliers, sales, setSales, cmvSettings, setCmvSettings,
      txForm, setTxForm, uniqueDescriptions, filteredDashboard,
      visibleTxCount, setVisibleTxCount, getEffectiveStatus, safeDateDisplay, formatMoney,
      searchQuery, setSearchQuery, typeFilter, setTypeFilter, statusFilter, setStatusFilter,
      accFilter, setAccFilter, isCatMenuOpen, setIsCatMenuOpen, catFilter, setCatFilter,
      handleSaveTx, executeDelete, deleteConfirmId, setDeleteConfirmId,
      selectedMonth, setSelectedMonth, selectedYear, setSelectedYear
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><span className="text-white font-black tracking-widest uppercase">Carregando Sistema...</span></div>;

  return (
    <Router>
      <Routes>
        <Route path="/:slug" element={<Cardapio />} />
        
        <Route path="/login" element={!user ? <Login onLogin={(u, p) => { setUser(u); setPermissoes(p); }} /> : <Navigate to="/admin/pedidos" replace />} />

        <Route path="/admin/*" element={user ? (
            <AdminLayout user={user}>
              <Routes>
                <Route path="/" element={<Navigate to="pedidos" replace />} />
                
                {/* Rotas Mapeadas - Visão Geral */}
                <Route path="lancamentos" element={<DashboardFin {...erpProps} />} />
                <Route path="vendas" element={<Vendas {...erpProps} />} />
                <Route path="saldos" element={<Saldos {...erpProps} />} />

                {/* Rotas Mapeadas - Financeiro */}
                <Route path="a-receber" element={<AReceber {...erpProps} />} />
                <Route path="a-pagar" element={<APagar {...erpProps} />} />
                <Route path="cartoes" element={<Cartoes {...erpProps} />} />
                <Route path="extrato" element={<ExtratoDetalhado {...erpProps} />} />
                <Route path="dre" element={<Dre {...erpProps} />} />

                {/* Rotas Mapeadas - Cadastro e RH */}
                <Route path="fornecedores" element={<Fornecedores {...erpProps} />} />
                <Route path="funcionarios" element={<GestaoFuncionarios {...erpProps} />} />
                <Route path="logistica" element={<GestaoDelivery {...erpProps} />} />
                <Route path="freelancer" element={<GestaoFreelancer {...erpProps} />} />
                <Route path="custos-rh" element={<RelatorioRH {...erpProps} />} /> {/* <--- CORREÇÃO AQUI */}

                {/* Rotas Mapeadas - Relatórios */}
                <Route path="resultados" element={<Resultados {...erpProps} />} />

                {/* Rotas Mapeadas - E-commerce */}
                <Route path="pedidos" element={<Kanban {...erpProps} />} />
                <Route path="produtos" element={<Produtos {...erpProps} />} />
                <Route path="historico" element={<HistoricoPedidos {...erpProps} />} />
                <Route path="clientes" element={<ClientesDelivery {...erpProps} />} />
                <Route path="fidelidade" element={<Fidelidade {...erpProps} />} />
                <Route path="ajustes" element={<AjustesImpressao {...erpProps} />} />
                
                <Route path="*" element={
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-100">
                        <Icon name="tool" size={48} className="text-slate-300 mb-4" />
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Módulo em Construção</h2>
                        <p className="text-sm font-bold text-slate-500 mt-2">Esta tela do ERP está a ser preparada ou aguarda o ficheiro correspondente.</p>
                    </div>
                } />
              </Routes>
            </AdminLayout>
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;