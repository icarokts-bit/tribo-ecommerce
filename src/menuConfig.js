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
    { id: 'custos_produtos', label: 'Custos de Produtos', icon: 'pie-chart', group: 'E-commerce Online', path: '/admin/custos-produtos', planos: ['completo', 'trial', 'master'] },
    { id: 'estoque', label: 'Estoque', icon: 'layers', group: 'E-commerce Online', path: '/admin/estoque', planos: ['completo', 'trial', 'master'] },
    { id: 'clientes_delivery', label: 'Clientes', icon: 'user', group: 'E-commerce Online', path: '/admin/clientes', planos: ['completo', 'trial', 'master'] },
    { id: 'areas_entrega', label: 'Áreas de Entrega', icon: 'map-pin', group: 'E-commerce Online', path: '/admin/areas-entrega', planos: ['completo', 'trial', 'master'] },
    { id: 'fidelidade', label: 'Fidelidade', icon: 'award', group: 'E-commerce Online', path: '/admin/fidelidade', planos: ['completo', 'trial', 'master'] },

    // Configurações
    { id: 'ajustes', label: 'Ajustes', icon: 'settings', group: 'Configurações', path: '/admin/ajustes', planos: ['completo', 'trial', 'master'] },
];