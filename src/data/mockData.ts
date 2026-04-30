import { User, UserRole } from '@/types/crm';

// Mock current user for demo
export const mockCurrentUser: User = {
  id: '1',
  name: 'Administrador Spark',
  email: 'admin@admin.com',
  role: 'ADMIN',
  createdAt: new Date().toISOString()
};

// Mock data for demonstration
export const mockKPIs = {
  totalLeads: 1247,
  leadsNovos: 89,
  emNegociacao: 234,
  vendidos: 156,
  perdidos: 67,
  taxaConversao: 12.5,
  contatosHoje: 45,
  metaDiaria: 60,
  vendasMes: 342500,
  metaMes: 500000,
};

export const mockLeads = [
  { id: '1', nome: 'João Pereira', telefone: '(11) 99999-1234', cidade: 'São Paulo', estado: 'SP', status: 'novo' as const, prioridade: 'alta' as const, vendedor: 'Maria Santos', filial: 'São Paulo Centro', valor_estimado: 15000, data_entrada: '2024-03-15', origem: 'Site' },
  { id: '2', nome: 'Ana Costa', telefone: '(21) 98888-5678', cidade: 'Rio de Janeiro', estado: 'RJ', status: 'em_negociacao' as const, prioridade: 'media' as const, vendedor: 'Pedro Lima', filial: 'Rio Centro', valor_estimado: 28000, data_entrada: '2024-03-14', origem: 'Indicação' },
  { id: '3', nome: 'Roberto Alves', telefone: '(31) 97777-9012', cidade: 'Belo Horizonte', estado: 'MG', status: 'contato_realizado' as const, prioridade: 'baixa' as const, vendedor: 'Lucas Oliveira', filial: 'BH Savassi', valor_estimado: 8500, data_entrada: '2024-03-13', origem: 'WhatsApp' },
  { id: '4', nome: 'Fernanda Lima', telefone: '(41) 96666-3456', cidade: 'Curitiba', estado: 'PR', status: 'aguardando_retorno' as const, prioridade: 'urgente' as const, vendedor: 'Maria Santos', filial: 'São Paulo Centro', valor_estimado: 45000, data_entrada: '2024-03-12', origem: 'Telefone' },
  { id: '5', nome: 'Marcelo Souza', telefone: '(51) 95555-7890', cidade: 'Porto Alegre', estado: 'RS', status: 'vendido' as const, prioridade: 'alta' as const, vendedor: 'Pedro Lima', filial: 'Rio Centro', valor_estimado: 32000, data_entrada: '2024-03-10', origem: 'Site' },
  { id: '6', nome: 'Carla Mendes', telefone: '(61) 94444-2345', cidade: 'Brasília', estado: 'DF', status: 'perdido' as const, prioridade: 'media' as const, vendedor: 'Lucas Oliveira', filial: 'BH Savassi', valor_estimado: 12000, data_entrada: '2024-03-08', origem: 'Indicação' },
  { id: '7', nome: 'Thiago Ramos', telefone: '(71) 93333-6789', cidade: 'Salvador', estado: 'BA', status: 'novo' as const, prioridade: 'alta' as const, vendedor: undefined, filial: 'São Paulo Centro', valor_estimado: 22000, data_entrada: '2024-03-16', origem: 'Site' },
  { id: '8', nome: 'Patricia Dias', telefone: '(85) 92222-0123', cidade: 'Fortaleza', estado: 'CE', status: 'visita_agendada' as const, prioridade: 'media' as const, vendedor: 'Maria Santos', filial: 'São Paulo Centro', valor_estimado: 18500, data_entrada: '2024-03-11', origem: 'Evento' },
];

export const mockVendedores = [
  { id: '1', nome: 'Maria Santos', leadsAtivos: 23, contatosHoje: 8, metaDiaria: 10, vendas: 12, metaVendas: 20, taxaConversao: 15.2, filial: 'São Paulo Centro' },
  { id: '2', nome: 'Pedro Lima', leadsAtivos: 18, contatosHoje: 12, metaDiaria: 10, vendas: 8, metaVendas: 15, taxaConversao: 11.8, filial: 'Rio Centro' },
  { id: '3', nome: 'Lucas Oliveira', leadsAtivos: 15, contatosHoje: 5, metaDiaria: 10, vendas: 6, metaVendas: 12, taxaConversao: 9.4, filial: 'BH Savassi' },
];

export const mockEmpresas = [
  { id: '1', nome_fantasia: 'TechSales Pro', cnpj: '12.345.678/0001-90', plano: 'Premium', usuarios: 45, leads_mes: 1247, status: 'ativa' },
  { id: '2', nome_fantasia: 'Vendas Express', cnpj: '98.765.432/0001-10', plano: 'Básico', usuarios: 12, leads_mes: 345, status: 'ativa' },
  { id: '3', nome_fantasia: 'Comercial Plus', cnpj: '11.222.333/0001-44', plano: 'Profissional', usuarios: 28, leads_mes: 789, status: 'ativa' },
];

export const mockFiliais = [
  { id: '1', nome: 'São Paulo Centro', cidade: 'São Paulo', estado: 'SP', vendedores: 15, leads: 456, ativa: true },
  { id: '2', nome: 'Rio Centro', cidade: 'Rio de Janeiro', estado: 'RJ', vendedores: 10, leads: 312, ativa: true },
  { id: '3', nome: 'BH Savassi', cidade: 'Belo Horizonte', estado: 'MG', vendedores: 8, leads: 234, ativa: true },
];

export const mockChartData = {
  leadsPorMes: [
    { mes: 'Jan', novos: 120, vendidos: 45, perdidos: 23 },
    { mes: 'Fev', novos: 145, vendidos: 52, perdidos: 28 },
    { mes: 'Mar', novos: 167, vendidos: 61, perdidos: 19 },
    { mes: 'Abr', novos: 189, vendidos: 72, perdidos: 34 },
    { mes: 'Mai', novos: 201, vendidos: 68, perdidos: 25 },
    { mes: 'Jun', novos: 178, vendidos: 78, perdidos: 21 },
  ],
  motivosPerda: [
    { motivo: 'Preço alto', quantidade: 34 },
    { motivo: 'Sem cobertura', quantidade: 22 },
    { motivo: 'Concorrência', quantidade: 18 },
    { motivo: 'Sem interesse', quantidade: 15 },
    { motivo: 'Timing ruim', quantidade: 11 },
  ],
  leadsPorOrigem: [
    { origem: 'Site', quantidade: 340 },
    { origem: 'Indicação', quantidade: 280 },
    { origem: 'WhatsApp', quantidade: 220 },
    { origem: 'Telefone', quantidade: 180 },
    { origem: 'Evento', quantidade: 120 },
  ],
  funilComercial: [
    { etapa: 'Novos', quantidade: 89 },
    { etapa: 'Contato', quantidade: 67 },
    { etapa: 'Negociação', quantidade: 45 },
    { etapa: 'Proposta', quantidade: 28 },
    { etapa: 'Fechamento', quantidade: 15 },
  ],
};
