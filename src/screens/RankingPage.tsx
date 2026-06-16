"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, TrendingUp, Target, Phone, Award, DollarSign, Briefcase } from 'lucide-react';

export default function RankingPage() {
  const { user } = useAuth();

  // Filter States
  const [branchId, setBranchId] = useState<string>('todos');
  const [period, setPeriod] = useState<string>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Compute startDate & endDate from period selection
  const dateParams = useMemo(() => {
    let startStr = '';
    let endStr = '';
    const now = new Date();

    if (period === 'today') {
      startStr = now.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      startStr = yesterday.toISOString().split('T')[0];
      endStr = yesterday.toISOString().split('T')[0];
    } else if (period === '7days') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 6);
      startStr = d7.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    } else if (period === '30days') {
      const d30 = new Date();
      d30.setDate(now.getDate() - 29);
      startStr = d30.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    } else if (period === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = startOfMonth.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    } else if (period === 'custom') {
      startStr = customStartDate;
      endStr = customEndDate;
    }

    return { startDate: startStr, endDate: endStr };
  }, [period, customStartDate, customEndDate]);

  // Load branches (for admin/supervisor/superadmin filters)
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-ranking-filter'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Falha ao carregar filiais');
      return res.json();
    },
    enabled: !!user && ['ADMIN', 'SUPERVISOR', 'SUPERADMIN'].includes(user.role)
  });

  // Query Sellers ranking metrics
  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ['sellers-ranking', branchId, dateParams.startDate, dateParams.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId && branchId !== 'todos') params.append('branchId', branchId);
      if (dateParams.startDate) params.append('startDate', dateParams.startDate);
      if (dateParams.endDate) params.append('endDate', dateParams.endDate);
      const res = await fetch(`/api/sellers?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar vendedores');
      return res.json();
    }
  });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-xl" title="1º Lugar">🥇</span>;
      case 1:
        return <span className="text-xl" title="2º Lugar">🥈</span>;
      case 2:
        return <span className="text-xl" title="3º Lugar">🥉</span>;
      default:
        return <span className="text-xs font-semibold text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center mx-auto">#{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ranking de Vendedores</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe e compare o desempenho comercial da equipe</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-wrap items-center gap-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex flex-col gap-1 min-w-[150px] flex-1 sm:flex-initial">
          <label className="text-xs font-semibold text-muted-foreground">Período</label>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="thisMonth">Este Mês</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {period === 'custom' && (
          <>
            <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
              <label className="text-xs font-semibold text-muted-foreground">De</label>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[120px] flex-1 sm:flex-initial">
              <label className="text-xs font-semibold text-muted-foreground">Até</label>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </>
        )}

        {/* Branch Filter - Only for Roles admin, supervisor, superadmin */}
        {user && ['ADMIN', 'SUPERVISOR', 'SUPERADMIN'].includes(user.role) && (
          <div className="flex flex-col gap-1 min-w-[150px] flex-1 sm:flex-initial">
            <label className="text-xs font-semibold text-muted-foreground">Filial</label>
            <select 
              value={branchId} 
              onChange={(e) => setBranchId(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="todos">Todas as Filiais</option>
              <option value="sem_filial">Sem Filial</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">
            <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-primary rounded-full mb-3" role="status">
              <span className="sr-only">Carregando...</span>
            </div>
            <p className="text-sm">Carregando classificação...</p>
          </div>
        ) : vendedores.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <Award className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm">Nenhum dado encontrado para o filtro selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 text-center w-16">Posição</th>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4 text-center">Leads Adicionados</th>
                  <th className="py-3 px-4 text-center">Leads Vinculados</th>
                  <th className="py-3 px-4 text-center">Contatos (Interações)</th>
                  <th className="py-3 px-4 text-center">Conversão</th>
                  <th className="py-3 px-4 text-center">Vendas</th>
                  <th className="py-3 px-4 text-right">Faturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {vendedores.map((v: any, index: number) => {
                  const isCurrentUser = user?.id === v.userId;
                  return (
                    <tr 
                      key={v.id} 
                      className={`hover:bg-muted/30 transition-colors duration-150 ${isCurrentUser ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center align-middle">
                        {getRankBadge(index)}
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{v.name}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground block">{v.email || 'Sem e-mail'}</span>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-sm text-foreground">
                        {v.branch?.name || <span className="text-muted-foreground italic text-xs">Sem Filial</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-sm text-foreground font-semibold">
                        {v.leadsCreatedCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-sm text-foreground font-semibold">
                        {v.leadsLinkedCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle text-sm text-foreground font-semibold">
                        {v.interactionsCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="text-sm font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                          {v.conversionRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="text-sm font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                          {v.salesCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right align-middle text-sm font-bold text-emerald-600">
                        {v.salesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
