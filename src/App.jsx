import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';

// Páginas Públicas
import Cardapio from './pages/Cardapio';

// Páginas Administrativas
import Login from './pages/Login';
import Kanban from './pages/GestaoPedidos/Kanban';

function App() {
  const [user, setUser] = useState(null);
  const [permissoes, setPermissoes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitora se o usuário está logado ao recarregar a página
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        setPermissoes(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Função chamada pelo Login.jsx para injetar usuário e regras do crachá
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
        
        {/* =========================================
            1. VITRINE PÚBLICA DO E-COMMERCE
        ========================================= */}
        {/* Rota dinâmica que captura o link da loja (ex: /loja3d) */}
        <Route path="/:slug" element={<Cardapio />} />


        {/* =========================================
            2. AUTENTICAÇÃO
        ========================================= */}
        <Route path="/login" element={
          !user ? <Login onLogin={handleLogin} /> : <Navigate to="/admin/pedidos" replace />
        } />


        {/* =========================================
            3. ÁREA ADMINISTRATIVA DO LOJISTA
        ========================================= */}
        <Route path="/admin/*" element={
          user ? (
            <Routes>
              {/* Redireciona a raiz do admin direto para os pedidos */}
              <Route path="/" element={<Navigate to="pedidos" replace />} />
              
              {/* Painel Kanban (Gestão de Produção e Envios) */}
              <Route path="pedidos" element={<Kanban user={user} permissoes={permissoes} />} />
              
              {/* No futuro, rotas como /admin/produtos, /admin/configuracoes entram aqui */}
            </Routes>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* Rota de Fallback: Se acessar a raiz vazia, manda para o login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </Router>
  );
}

export default App;