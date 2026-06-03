"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, TrendingUp, DollarSign, Phone, AlertTriangle, 
  CheckCircle, Clock, Building2, Users2, Coins, Ban
} from 'lucide-react';
import { KPICard } from '@/components/crm/KPICard';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { LeadStatus } from '@/types/crm';

const CHART_COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'];

export default function DashboardPage() {
  const { user } = useAuth();

  // Query de Métricas do Super Admin (rodada condicionalmente)
  const { data: saasMetrics, isLoading: isSaasLoading } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/saas/metrics');
      if (!res.ok) throw new Error('Falha ao carregar métricas do SaaS');
      return res.json();
    },
    enabled: user?.role === 'SUPERADMIN'
  });

  // Query de Métricas da Operação Comercial (rodada condicionalmente para outros papéis)
  const { data: metrics, isLoading: isMetricsLoading, error } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Falha ao carregar métricas da operação');
      return res.json();
    },
    enabled: user?.role !== 'SUPERADMIN' && !!user
  });

  // RENDER DO SUPER ADMIN (PAINEL GLOBAL DO SAAS)
  if (user?.role === 'SUPERADMIN') {
    if (isSaasLoading) {
      return (
        <div className="space-y-6 animate-pulse">
          <div>
            <div className="h-7 w-48 bg-muted rounded-md mb-2" />
            <div className="h-4 w-72 bg-muted rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-card border border-border/50 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[340px] bg-card border border-border/50 rounded-xl" />
            <div className="h-[340px] bg-card border border-border/50 rounded-xl" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Painel de Controle SaaS (CoBusiness)
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do faturamento, saúde e escala do seu ecossistema</p>
        </div>

        {/* KPIs SaaS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Receita Recorrente (MRR)" 
            value={`R$ ${saasMetrics?.mrr?.toLocaleString('pt-BR') || 0},00`} 
            change={15.4} 
            icon={Coins} 
            variant="success" 
          />
          <KPICard 
            title="Total de Empresas" 
            value={saasMetrics?.totalCompanies?.toString() || "0"} 
            change={8.7} 
            icon={Building2} 
            variant="primary" 
          />
          <KPICard 
            title="Usuários Ativos" 
            value={saasMetrics?.totalUsers?.toLocaleString('pt-BR') || "0"} 
            change={12.1} 
            icon={Users2} 
            variant="warning" 
          />
          <KPICard 
            title="Leads Gerenciados" 
            value={saasMetrics?.totalLeads?.toLocaleString('pt-BR') || "0"} 
            change={18.3} 
            icon={Target} 
          />
        </div>

        {/* Gráficos SaaS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Faturamento e Crescimento de Tenants */}
          <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Evolução do Faturamento & Clientes</h3>
              <span className="text-xs text-muted-foreground">Previsão baseada em assinatura mensal de R$ 499,00</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={saasMetrics?.chartData || []}>
                <defs>
                  <linearGradient id="saasMrrColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'mrr' ? `R$ ${value.toLocaleString('pt-BR')},00` : `${value} empresas`,
                    name === 'mrr' ? 'MRR' : 'Empresas Ativas'
                  ]}
                />
                <Area type="monotone" dataKey="mrr" stroke="hsl(142, 71%, 45%)" fill="url(#saasMrrColor)" strokeWidth={2.5} name="mrr" />
                <Area type="monotone" dataKey="empresas" stroke="hsl(221, 83%, 53%)" fill="none" strokeWidth={2} name="empresas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição de Usuários por Cliente */}
          <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Engajamento (Usuários por Empresa)</h3>
            {saasMetrics?.usersByCompany?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa para listar.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={saasMetrics?.usersByCompany || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]}>
                    {(saasMetrics?.usersByCompany || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-[10px] text-muted-foreground text-center mt-2">Principais empresas com maior volume de colaboradores</p>
          </div>
        </div>

        {/* Resumo da Infraestrutura */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Painel Operacional & Infraestrutura</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Empresas Ativas: {saasMetrics?.activeCompanies || 0}</p>
                <p className="text-xs text-muted-foreground">Clientes operando em ambiente isolado</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <Ban className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Acessos Suspensos: {saasMetrics?.suspendedCompanies || 0}</p>
                <p className="text-xs text-muted-foreground">Inadimplentes ou contas congeladas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Users2 className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Total Equipe de Venda: {saasMetrics?.totalSellers || 0}</p>
                <p className="text-xs text-muted-foreground">Sellers em todas as filiais cadastradas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Skeletons para carregamento das métricas gerais
  if (isMetricsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-7 w-48 bg-muted rounded-md mb-2" />
          <div className="h-4 w-72 bg-muted rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-card border border-border/50 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-[340px] bg-card border border-border/50 rounded-xl" />
          <div className="h-[340px] bg-card border border-border/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
        <h3 className="font-semibold text-lg">Erro ao carregar o dashboard</h3>
        <p className="text-sm mt-1">Não foi possível carregar as métricas da operação em tempo real. Verifique sua conexão.</p>
      </div>
    );
  }

  const { kpis, leadsPorMes, motivosPerda, vendedoresPerformance, leadsRecentes, alertas } = metrics;
  const progressPercent = kpis.metaMes > 0 ? ((kpis.vendasMes / kpis.metaMes) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.role === 'VENDEDOR' 
              ? 'Seu desempenho comercial e progresso pessoal' 
              : 'Visão operacional e resultados da equipe em tempo real'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border/50 px-3 py-1.5 rounded-lg shadow-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Atualizado agora</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title={user?.role === 'VENDEDOR' ? "Meus Leads Ativos" : "Total de Leads"} 
          value={kpis.totalLeads.toLocaleString()} 
          icon={Target} 
          variant="primary" 
        />
        <KPICard 
          title={user?.role === 'VENDEDOR' ? "Minhas Vendas (Mês)" : "Vendas da Filial/Empresa"} 
          value={kpis.vendasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          icon={DollarSign} 
          variant="success" 
        />
        <KPICard 
          title="Taxa de Conversão" 
          value={`${kpis.taxaConversao}%`} 
          icon={TrendingUp} 
          variant="warning" 
        />
        <KPICard 
          title="Contatos Hoje" 
          value={`${kpis.contatosHoje}/${kpis.metaDiaria}`} 
          changeLabel="meta diária" 
          icon={Phone} 
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads por mês */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Comercial (Últimos 6 Meses)</h3>
          {leadsPorMes.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de evolução para exibir neste período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={leadsPorMes}>
                <defs>
                  <linearGradient id="colorNovos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVendidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="novos" stroke="hsl(221, 83%, 53%)" fill="url(#colorNovos)" strokeWidth={2} name="Novos Leads" />
                <Area type="monotone" dataKey="vendidos" stroke="hsl(142, 71%, 45%)" fill="url(#colorVendidos)" strokeWidth={2} name="Leads Vendidos" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Motivos de perda */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Motivos de Perda (Todas Abordagens)</h3>
          {motivosPerda.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm text-center">
              Nenhuma perda registrada sob o filtro selecionado.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={motivosPerda}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="quantidade"
                    nameKey="motivo"
                  >
                    {motivosPerda.map((_: any, index: number) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2 overflow-y-auto max-h-[100px] pr-1">
                {motivosPerda.map((item: any, i: number) => (
                  <div key={item.motivo} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground truncate max-w-[130px]">{item.motivo}</span>
                    </div>
                    <span className="font-semibold text-foreground">{item.quantidade}x</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent leads */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Meus Leads Recentes</h3>
            <a href="/leads" className="text-xs text-primary font-semibold hover:underline">Ver todos</a>
          </div>
          {leadsRecentes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhum lead sob seu escopo no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {leadsRecentes.map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 hover:bg-muted/10 px-1 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <span className="text-xs font-bold">{lead.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{lead.nome}</p>
                      <p className="text-xs text-muted-foreground">{lead.cidade}/{lead.estado}</p>
                    </div>
                  </div>
                  <StatusBadge status={lead.status as LeadStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendedores performance / Leaderboard */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {user?.role === 'VENDEDOR' ? "Meu Desempenho e Metas" : "Desempenho da Equipe"}
            </h3>
            {user?.role !== 'VENDEDOR' && (
              <a href="/ranking" className="text-xs text-primary font-semibold hover:underline">Visualizar Ranking</a>
            )}
          </div>
          {vendedoresPerformance.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Sem dados de vendedores disponíveis.
            </div>
          ) : (
            <div className="space-y-4">
              {vendedoresPerformance.map((v: any, i: number) => {
                const isCurrentUser = user?.name === v.nome;
                return (
                  <div key={v.id} className={`space-y-2 p-2 rounded-lg transition-colors ${isCurrentUser ? 'bg-primary/5 border border-primary/10' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            {v.nome}
                            {isCurrentUser && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Você</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{v.filial}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">
                          {v.vendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} / {v.metaVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">vendas no mês</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-primary transition-all duration-500"
                        style={{ width: `${Math.min((v.vendas / v.metaVendas) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Alertas e Monitoramento Comercial</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Leads Sem Responsável */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">{alertas.leadsSemResponsavel} leads pendentes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user?.role === 'VENDEDOR' 
                  ? 'Aguardando vendedor na sua filial.' 
                  : 'Aguardando atribuição na filial.'}
              </p>
            </div>
          </div>

          {/* Card 2: Progresso da Meta */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="w-full">
              <p className="text-sm font-bold text-foreground">Meta {progressPercent}% Atingida</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {kpis.vendasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {kpis.metaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <div className="w-full h-1.5 bg-emerald-500/10 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(Number(progressPercent), 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Leads Parados por Tempo de Inatividade */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors">
            <Clock className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="w-full">
              <p className="text-sm font-bold text-foreground">{alertas.totalParados} leads inativos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sem ligações ou visitas agendadas.</p>
              
              {/* Distribuição por faixas de atraso */}
              <div className="grid grid-cols-5 gap-1.5 mt-2.5">
                <div className="text-center p-1 rounded bg-amber-500/10 border border-amber-500/20" title="Leads parados há 5 dias">
                  <p className="text-[9px] text-amber-600 font-bold">5d</p>
                  <p className="text-[11px] font-extrabold text-foreground">{alertas.parados5Dias}</p>
                </div>
                <div className="text-center p-1 rounded bg-orange-500/10 border border-orange-500/20" title="Leads parados há 10 dias">
                  <p className="text-[9px] text-orange-600 font-bold">10d</p>
                  <p className="text-[11px] font-extrabold text-foreground">{alertas.parados10Dias}</p>
                </div>
                <div className="text-center p-1 rounded bg-red-400/10 border border-red-400/20" title="Leads parados há 15 dias">
                  <p className="text-[9px] text-red-500 font-bold">15d</p>
                  <p className="text-[11px] font-extrabold text-foreground">{alertas.parados15Dias}</p>
                </div>
                <div className="text-center p-1 rounded bg-red-500/10 border border-red-500/20" title="Leads parados há 20 dias">
                  <p className="text-[9px] text-red-600 font-bold">20d</p>
                  <p className="text-[11px] font-extrabold text-foreground">{alertas.parados20Dias}</p>
                </div>
                <div className="text-center p-1 rounded bg-red-700/10 border border-red-700/20" title="Leads parados há 25+ dias">
                  <p className="text-[9px] text-red-700 font-bold">25d+</p>
                  <p className="text-[11px] font-extrabold text-foreground">{alertas.parados25Dias}</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
