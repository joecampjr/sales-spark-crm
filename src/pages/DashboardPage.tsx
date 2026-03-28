import { Target, Users, TrendingUp, DollarSign, Phone, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { KPICard } from '@/components/crm/KPICard';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { mockKPIs, mockLeads, mockChartData, mockVendedores } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { LeadStatus } from '@/types/crm';

const CHART_COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'];

export default function DashboardPage() {
  const progressPercent = ((mockKPIs.vendasMes / mockKPIs.metaMes) * 100).toFixed(0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da sua operação comercial</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total de Leads" value={mockKPIs.totalLeads.toLocaleString()} change={12.5} icon={Target} variant="primary" />
        <KPICard title="Vendas do Mês" value={`R$ ${(mockKPIs.vendasMes / 1000).toFixed(0)}k`} change={8.2} icon={DollarSign} variant="success" />
        <KPICard title="Taxa de Conversão" value={`${mockKPIs.taxaConversao}%`} change={-2.1} icon={TrendingUp} variant="warning" />
        <KPICard title="Contatos Hoje" value={`${mockKPIs.contatosHoje}/${mockKPIs.metaDiaria}`} changeLabel="meta diária" icon={Phone} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads por mês */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Mês</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mockChartData.leadsPorMes}>
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
              <Area type="monotone" dataKey="novos" stroke="hsl(221, 83%, 53%)" fill="url(#colorNovos)" strokeWidth={2} />
              <Area type="monotone" dataKey="vendidos" stroke="hsl(142, 71%, 45%)" fill="url(#colorVendidos)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Motivos de perda */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Motivos de Perda</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={mockChartData.motivosPerda}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="quantidade"
                nameKey="motivo"
              >
                {mockChartData.motivosPerda.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {mockChartData.motivosPerda.slice(0, 3).map((item, i) => (
              <div key={item.motivo} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-muted-foreground">{item.motivo}</span>
                </div>
                <span className="font-medium text-foreground">{item.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent leads */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Leads Recentes</h3>
            <a href="/leads" className="text-xs text-primary font-medium hover:underline">Ver todos</a>
          </div>
          <div className="space-y-3">
            {mockLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-semibold text-foreground">{lead.nome.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{lead.cidade}/{lead.estado}</p>
                  </div>
                </div>
                <StatusBadge status={lead.status as LeadStatus} />
              </div>
            ))}
          </div>
        </div>

        {/* Vendedores performance */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Desempenho Vendedores</h3>
            <a href="/ranking" className="text-xs text-primary font-medium hover:underline">Ranking</a>
          </div>
          <div className="space-y-4">
            {mockVendedores.map((v, i) => (
              <div key={v.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">{v.filial}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{v.vendas}/{v.metaVendas}</p>
                    <p className="text-xs text-muted-foreground">vendas</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-primary transition-all duration-500"
                    style={{ width: `${Math.min((v.vendas / v.metaVendas) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Alertas Comerciais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">7 leads sem responsável</p>
              <p className="text-xs text-muted-foreground">Aguardando distribuição</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <Clock className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">12 leads parados</p>
              <p className="text-xs text-muted-foreground">Sem atualização há 5+ dias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Meta 68% atingida</p>
              <p className="text-xs text-muted-foreground">R$ 342k de R$ 500k</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
