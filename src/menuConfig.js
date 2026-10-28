export const modulosSaaS = [
    // === MÓDULO COMPLETO (FINANCEIRO E GESTÃO) ===
    
    // Visão Geral
    { id: 'fin_dashboard', label: 'Lançamentos', icon: 'edit', group: 'Visão Geral', planos: ['completo', 'trial', 'master'] },
    { id: 'vendas', label: 'Vendas', icon: 'shopping-cart', group: 'Visão Geral', planos: ['completo', 'trial', 'master'] },
    { id: 'saldos', label: 'Saldo em Contas', icon: 'dollar-sign', group: 'Visão Geral', planos: ['completo', 'trial', 'master'] },
    { id: 'operacional', label: 'Operacional', icon: 'cpu', group: 'Visão Geral', planos: ['completo', 'trial', 'master'] },
    
    // Financeiro
    { id: 'a_receber', label: 'Contas a Receber', icon: 'arrow-down-circle', group: 'Financeiro', planos: ['completo', 'trial', 'master'] },
    { id: 'a_pagar', label: 'Contas a Vencer', icon: 'arrow-up-circle', group: 'Financeiro', planos: ['completo', 'trial', 'master'] },
    { id: 'cartoes', label: 'Faturas (Cartões)', icon: 'credit-card', group: 'Financeiro', planos: ['completo', 'trial', 'master'] },
    { id: 'extrato_detalhado', label: 'Extrato Completo', icon: 'list', group: 'Financeiro', planos: ['completo', 'trial', 'master'] },
    { id: 'dre', label: 'DRE', icon: 'bar-chart-2', group: 'Financeiro', planos: ['completo', 'trial', 'master'] },
    
    // Cadastro
    { id: 'fornecedores', label: 'Fornecedores', icon: 'package', group: 'Cadastro', planos: ['completo', 'trial', 'master'] },

    // Equipe e RH
    { id: 'funcionarios', label: 'Funcionários', icon: 'clipboard', group: 'Equipe e RH', planos: ['completo', 'trial', 'master'] },
    { id: 'delivery', label: 'Gestão Logística', icon: 'truck', group: 'Equipe e RH', planos: ['completo', 'trial', 'master'] },
    { id: 'freelancer', label: 'Diárias (Freelas)', icon: 'clock', group: 'Equipe e RH', planos: ['completo', 'trial', 'master'] },
    { id: 'relatorio_rh', label: 'Custos de RH', icon: 'pie-chart', group: 'Equipe e RH', planos: ['completo', 'trial', 'master'] },
    
    // Relatórios
    { id: 'resultados', label: 'Resultado Caixa', icon: 'trending-up', group: 'Relatórios', planos: ['completo', 'trial', 'master'] },
    { id: 'analise', label: 'Análise de Preços', icon: 'info', group: 'Relatórios', planos: ['completo', 'trial', 'master'] },
    { id: 'relatorio_unificado', label: 'Relatório Completo', icon: 'file-plus', group: 'Relatórios', planos: ['completo', 'trial', 'master'] },
    { id: 'marketing', label: 'Marketing', icon: 'megaphone', group: 'Relatórios', planos: ['completo', 'trial', 'master'] },

    // === MÓDULO E-COMMERCE ONLINE ===
    { id: 'gestao_pedidos', label: 'Gestão de Pedidos', icon: 'shopping-bag', group: 'E-commerce Online', planos: ['completo', 'trial', 'master'] },
    { id: 'historico_pedidos', label: 'Histórico de Pedidos', icon: 'archive', group: 'E-commerce Online', planos: ['completo', 'trial', 'master'] },
    { id: 'catalogo_delivery', label: 'Catálogo de Produtos', icon: 'grid', group: 'E-commerce Online', planos: ['completo', 'trial', 'master'] },
    { id: 'clientes_delivery', label: 'Clientes', icon: 'user', group: 'E-commerce Online', planos: ['completo', 'trial', 'master'] },
    { id: 'areas_entrega', label: 'Áreas de Entrega', icon: 'map-pin', group: 'E-commerce Online', planos: ['completo', 'trial', 'master'] },
    { id: 'fidelidade', label: 'Fidelidade', icon: 'award', group: 'E-commerce Online', planos: ['completo', 'trial', 'master'] },

    // === CONFIGURAÇÕES GERAIS ===
    { id: 'ajustes', label: 'Ajustes', icon: 'settings', group: 'Configurações', planos: ['completo', 'trial', 'master'] },
];