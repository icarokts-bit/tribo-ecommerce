import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import Icon from './components/Icon'; // Garante que tem os ícones

// Páginas Públicas
import Cardapio from './pages/Cardapio';

// Páginas Administrativas
import Login from './pages/Login';

// ATENÇÃO AOS CAMINHOS: Ajuste as pastas abaixo conforme onde guardou os ficheiros
import Kanban from './pages/GestaoPedidos/Kanban'; 
import Produtos from './pages/Produtos'; // ou './pages/GestaoPedidos/Produtos' se guardou lá

// ==========================================
// 1. COMPONENTE DE LAYOUT (MENU LATERAL)
// ==========================================
function AdminLayout({ children, user }) {
  const location = useLocation();
  
  // Aqui definimos os botões do seu menu lateral
  const menuItems = [
      { path: '/admin/pedidos', label: 'Painel de Produção', icon: 'trello' },
      { path: '/admin/produtos', label: 'Meus Modelos 3D', icon: 'box' },
  ];

  return (
      <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
          
          {/* BARRA LATERAL (SIDEBAR) */}
          <aside className="w-16 md:w-64 bg-slate-900 text-white flex flex-col transition-all duration-300 shrink-0 z-50">
              <div className="h-16 flex items-center justify-center border-b border-slate-800 shrink-0">
                  <span className="hidden md:block font-black tracking-widest text-lg text-amber-400">TRIBO 3D</span>
                  <span className="block md:hidden font-black text-amber-400">3D</span>
              </div>
              
              <nav className="flex-1 py-4 space-y-2 px-2 md:px-4">
                  {menuItems.map(item => {
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                          <Link 
                              key={item.path} 
                              to={item.path} 
                              className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${isActive ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                              title={item.label}
                          >
                              <Icon name={item.icon} size={20} className="shrink-0" />
                              <span className="hidden md:block truncate text-sm">{item.label}</span>
                          </Link>
                      );
                  })}
              </nav>

              <div className="p-4 border-t border-slate-800 flex items-center justify-center md:justify-start gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden md:block overflow-hidden">
                      <p className="text-xs font-bold truncate text-slate-200">{user?.displayName}</p>
                      <button onClick={() => auth.signOut()} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-black tracking-widest mt-0.5 block">Sair</button>
                  </div>
              </div>
          </aside>

          {/* ÁREA CENTRAL (Onde o Kanban e os Produtos carregam) */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              {children}
          </main>
      </div>
  );
}

// ==========================================
// 2. ROTEAMENTO PRINCIPAL DA APLICAÇÃO
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

  const handleLogin = (loggedUser, userPermissoes) => {
    setUser(loggedUser);
    setPermissoes(userPermissoes);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="text-white font-black tracking-widest uppercase">Carregando Sistema...</span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        
        {/* ROTA DA VITRINE E-COMMERCE */}
        <Route path="/:slug" element={<Cardapio />} />

        {/* ROTA DE LOGIN */}
        <Route path="/login" element={
          !user ? <Login onLogin={handleLogin} /> : <Navigate to="/admin/pedidos" replace />
        } />

        {/* ROTAS DO PAINEL ADMINISTRATIVO COM SIDEBAR */}
        <Route path="/admin/*" element={
          user ? (
            <AdminLayout user={user}>
              <Routes>
                <Route path="/" element={<Navigate to="pedidos" replace />} />
                <Route path="pedidos" element={<Kanban user={user} permissoes={permissoes} />} />
                <Route path="produtos" element={<Produtos user={user} permissoes={permissoes} />} />
              </Routes>
            </AdminLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* ROTA PADRÃO FALLBACK */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </Router>
  );
}

export default App;