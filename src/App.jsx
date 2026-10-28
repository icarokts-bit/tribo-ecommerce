import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import Icon from './components/Icon'; 

// Páginas Públicas
import Cardapio from './pages/Cardapio';
import Login from './pages/Login';

// Módulos de E-commerce
import Kanban from './pages/GestaoPedidos/Kanban'; 
import Produtos from './pages/GestaoPedidos/Produtos'; // Altere para './pages/Produtos' se guardou fora da pasta GestaoPedidos

// ==========================================
// 1. CONFIGURAÇÃO DOS MÓDULOS (MENU COMPLETO)
// ==========================================
export const modulosSaaS = [
    // === MÓDULO COMPLETO (FINANCEIRO E GESTÃO) ===
    
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

    // === MÓDULO E-COMMERCE ONLINE ===
    { id: 'gestao_pedidos', label: 'Gestão de Pedidos', icon: 'shopping-bag', group: 'E-commerce Online', path: '/admin/pedidos', planos: ['completo', 'trial', 'master'] },
    { id: 'historico_pedidos', label: 'Histórico de Pedidos', icon: 'archive', group: 'E-commerce Online', path: '/admin/historico', planos: ['completo', 'trial', 'master'] },
    { id: 'catalogo_delivery', label: 'Catálogo de Produtos', icon: 'grid', group: 'E-commerce Online', path: '/admin/produtos', planos: ['completo', 'trial', 'master'] },
    { id: 'clientes_delivery', label: 'Clientes', icon: 'user', group: 'E-commerce Online', path: '/admin/clientes', planos: ['completo', 'trial', 'master'] },
    { id: 'areas_entrega', label: 'Áreas de Entrega', icon: 'map-pin', group: 'E-commerce Online', path: '/admin/areas-entrega', planos: ['completo', 'trial', 'master'] },
    { id: 'fidelidade', label: 'Fidelidade', icon: 'award', group: 'E-commerce Online', path: '/admin/fidelidade', planos: ['completo', 'trial', 'master'] },

    // === CONFIGURAÇÕES GERAIS ===
    { id: 'ajustes', label: 'Ajustes', icon: 'settings', group: 'Configurações', path: '/admin/ajustes', planos: ['completo', 'trial', 'master'] },
];

// ==========================================
// 2. COMPONENTE DE LAYOUT (MENU LATERAL)
// ==========================================
function AdminLayout({ children, user }) {
  const location = useLocation();
  
  // Agrupa os módulos pelo nome do grupo
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

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
// 3. ROTEAMENTO PRINCIPAL
// ==========================================
function App() {
  const [user, setUser] = useState(null);
  const [permissoes, setPermissoes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) setUser(currentUser);
      else { setUser(null); setPermissoes(null); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><span className="text-white font-black tracking-widest uppercase">Carregando Sistema...</span></div>;

  return (
    <Router>
      <Routes>
        {/* Rota da Loja Pública */}
        <Route path="/:slug" element={<Cardapio />} />
        
        {/* Rota de Login */}
        <Route path="/login" element={!user ? <Login onLogin={(u, p) => { setUser(u); setPermissoes(p); }} /> : <Navigate to="/admin/pedidos" replace />} />

        {/* Rotas do Admin */}
        <Route path="/admin/*" element={user ? (
            <AdminLayout user={user}>
              <Routes>
                <Route path="/" element={<Navigate to="pedidos" replace />} />
                
                {/* Módulos Prontos do E-commerce */}
                <Route path="pedidos" element={<Kanban user={user} permissoes={permissoes} />} />
                <Route path="produtos" element={<Produtos user={user} permissoes={permissoes} />} />
                
                {/* Rota temporária para os módulos que ainda vamos migrar/construir */}
                <Route path="*" element={
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-100">
                        <Icon name="tool" size={48} className="text-slate-300 mb-4" />
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Módulo em Construção</h2>
                        <p className="text-sm font-bold text-slate-500 mt-2">Esta tela do ERP está sendo migrada para a nova versão.</p>
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