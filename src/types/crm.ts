// Types for the CRM system

export type UserRole = 'admin' | 'supervisor' | 'gerente' | 'vendedor';

export type LeadStatus =
  | 'novo'
  | 'aguardando_primeiro_contato'
  | 'contato_realizado'
  | 'em_negociacao'
  | 'aguardando_retorno'
  | 'precisa_visita'
  | 'visita_agendada'
  | 'vendido'
  | 'perdido'
  | 'sem_interesse'
  | 'sem_cobertura'
  | 'achou_caro';

export type LeadPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export type ContactType = 'ligacao' | 'whatsapp' | 'visita' | 'email' | 'outro';

export interface User {
  id: string;
  empresa_id: string;
  filial_id?: string;
  nome: string;
  email: string;
  perfil: UserRole;
  ativo: boolean;
  ultimo_acesso?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Empresa {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone?: string;
  slug: string;
  ativo: boolean;
  created_at: string;
}

export interface Filial {
  id: string;
  empresa_id: string;
  nome: string;
  cidade: string;
  estado: string;
  ativa: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  empresa_id: string;
  filial_id: string;
  vendedor_id?: string;
  supervisor_id?: string;
  nome: string;
  telefone: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  origem?: string;
  status: LeadStatus;
  prioridade: LeadPriority;
  valor_estimado?: number;
  observacoes?: string;
  sem_responsavel: boolean;
  data_entrada: string;
  created_at: string;
  updated_at: string;
  vendedor?: User;
  filial?: Filial;
}

export interface Contato {
  id: string;
  empresa_id: string;
  lead_id: string;
  vendedor_id: string;
  tipo_contato: ContactType;
  resultado: string;
  observacao?: string;
  created_at: string;
}

export interface KPIData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  aguardando_primeiro_contato: 'Aguardando 1º Contato',
  contato_realizado: 'Contato Realizado',
  em_negociacao: 'Em Negociação',
  aguardando_retorno: 'Aguardando Retorno',
  precisa_visita: 'Precisa de Visita',
  visita_agendada: 'Visita Agendada',
  vendido: 'Vendido',
  perdido: 'Perdido',
  sem_interesse: 'Sem Interesse',
  sem_cobertura: 'Sem Cobertura',
  achou_caro: 'Achou Caro',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-info/10 text-info',
  aguardando_primeiro_contato: 'bg-warning/10 text-warning',
  contato_realizado: 'bg-primary/10 text-primary',
  em_negociacao: 'bg-accent/10 text-accent',
  aguardando_retorno: 'bg-warning/10 text-warning',
  precisa_visita: 'bg-warning/10 text-warning',
  visita_agendada: 'bg-info/10 text-info',
  vendido: 'bg-success/10 text-success',
  perdido: 'bg-destructive/10 text-destructive',
  sem_interesse: 'bg-muted text-muted-foreground',
  sem_cobertura: 'bg-muted text-muted-foreground',
  achou_caro: 'bg-destructive/10 text-destructive',
};

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};
