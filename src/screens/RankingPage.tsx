"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, TrendingUp, Target, Phone, Award, DollarSign, Briefcase, ChevronUp, ChevronDown, List, LayoutGrid, Coins, Users2 } from 'lucide-react';

export default function RankingPage() {
  const { user } = useAuth();

  // Filter States
  const [branchId, setBranchId] = useState<string>('todos');
  const [period, setPeriod] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // View mode State: 'list' (Table) or 'cards' (Cards Scorecard)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  // Ranking Metric State (defines how ranks are calculated)
  const [rankingMetric, setRankingMetric] = useState<'salesCount' | 'salesValue' | 'conversionRate'>('salesCount');

  // Calculate the number of days in the active period for dynamic contacts meta
  const numDays = useMemo(() => {
    if (period === 'today' || period === 'yesterday') return 1;
    if (period === '7days') return 7;
    if (period === '30days') return 30;
    
    if (period === 'thisMonth') {
      const now = new Date();
      return now.getDate(); // Number of days in the month so far
    }
    
    if (period === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    return 30; // Fallback
  }, [period, customStartDate, customEndDate]);

  // Sorting States
  const [sortField, setSortField] = useState<string>('salesCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleRankingMetricChange = (metric: 'salesCount' | 'salesValue' | 'conversionRate') => {
    setRankingMetric(metric);
    // Set table sort to align with the new metric
    setSortField(metric);
    setSortDirection('desc');
  };

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

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [branches]);

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

  const handleSort = (field: string) => {
    if (['salesCount', 'salesValue', 'conversionRate'].includes(field)) {
      setRankingMetric(field as any);
    }
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedVendedores = useMemo(() => {
    const list = [...vendedores];
    list.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nested branch sorting
      if (sortField === 'branch') {
        valA = a.branch?.name || '';
        valB = b.branch?.name || '';
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      // Numeric comparison
      valA = valA ?? 0;
      valB = valB ?? 0;

      if (valA !== valB) {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // Tie-breaker rules for performance metrics
      if (sortField === 'salesCount') {
        return sortDirection === 'asc'
          ? (a.salesValue ?? 0) - (b.salesValue ?? 0)
          : (b.salesValue ?? 0) - (a.salesValue ?? 0);
      } else if (sortField === 'salesValue') {
        return sortDirection === 'asc'
          ? (a.salesCount ?? 0) - (b.salesCount ?? 0)
          : (b.salesCount ?? 0) - (a.salesCount ?? 0);
      } else if (sortField === 'conversionRate') {
        return sortDirection === 'asc'
          ? (a.salesCount ?? 0) - (b.salesCount ?? 0)
          : (b.salesCount ?? 0) - (a.salesCount ?? 0);
      }

      return 0;
    });
    return list;
  }, [vendedores, sortField, sortDirection]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-xl" title="1º Lugar">🥇</span>;
      case 2:
        return <span className="text-xl" title="2º Lugar">🥈</span>;
      case 3:
        return <span className="text-xl" title="3º Lugar">🥉</span>;
      default:
        return <span className="text-xs font-semibold text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center mx-auto">#{rank}</span>;
    }
  };

  const renderSortHeader = (label: string, field: string, align: 'center' | 'left' | 'right' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`py-3 px-4 cursor-pointer select-none hover:bg-muted/60 transition-colors ${
          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
        }`}
      >
        <div className={`flex items-center gap-1 ${
          align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
        }`}>
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-primary" />
            )
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ranking de Vendedores</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe e compare o desempenho comercial da equipe</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* View Mode Switcher (Lista / Cartões) */}
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1 shadow-inner border border-border/50">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                viewMode === 'cards'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cartões
            </button>
          </div>

          {/* Metric Selector Tabs */}
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1 shadow-inner border border-border/50">
            <button
              onClick={() => handleRankingMetricChange('salesCount')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                rankingMetric === 'salesCount'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${rankingMetric === 'salesCount' ? 'text-amber-500' : ''}`} />
              Vendas
            </button>
            <button
              onClick={() => handleRankingMetricChange('salesValue')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                rankingMetric === 'salesValue'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className={`w-3.5 h-3.5 ${rankingMetric === 'salesValue' ? 'text-emerald-500' : ''}`} />
              Faturado
            </button>
            <button
              onClick={() => handleRankingMetricChange('conversionRate')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                rankingMetric === 'conversionRate'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${rankingMetric === 'conversionRate' ? 'text-blue-500' : ''}`} />
              Conversão
            </button>
          </div>
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
              {sortedBranches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Leaderboard Table / Cards */}
      {isLoading ? (
        <div className="bg-card border border-border/50 rounded-xl p-16 text-center text-muted-foreground">
          <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-primary rounded-full mb-3" role="status">
            <span className="sr-only">Carregando...</span>
          </div>
          <p className="text-sm">Carregando classificação...</p>
        </div>
      ) : vendedores.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-xl p-16 text-center text-muted-foreground">
          <Award className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm">Nenhum dado encontrado para o filtro selecionado.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                  <th className="py-3 px-4 text-center w-16">Posição</th>
                  {renderSortHeader('Vendedor', 'name', 'left')}
                  {renderSortHeader('Filial', 'branch', 'left')}
                  {renderSortHeader('Leads Adicionados', 'leadsCreatedCount', 'center')}
                  {renderSortHeader('Leads Vinculados', 'leadsLinkedCount', 'center')}
                  {renderSortHeader('Contatos (Interações)', 'interactionsCount', 'center')}
                  {renderSortHeader('Conversão', 'conversionRate', 'center')}
                  {renderSortHeader('Vendas', 'salesCount', 'center')}
                  {renderSortHeader('Faturado', 'salesValue', 'right')}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedVendedores.map((v: any, index: number) => {
                  const isCurrentUser = user?.id === v.userId;
                  return (
                    <tr 
                      key={v.id} 
                      className={`hover:bg-muted/30 transition-colors duration-150 ${isCurrentUser ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center align-middle">
                        {getRankBadge(index + 1)}
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
                      <td className={`py-3.5 px-4 text-center align-middle transition-colors duration-150 ${rankingMetric === 'conversionRate' ? 'bg-muted/10' : ''}`}>
                        <span className="text-sm font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                          {v.conversionRate}%
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-center align-middle transition-colors duration-150 ${rankingMetric === 'salesCount' ? 'bg-muted/10' : ''}`}>
                        <span className="text-sm font-bold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                          {v.salesCount || 0}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right align-middle text-sm font-bold text-emerald-600 transition-colors duration-150 ${rankingMetric === 'salesValue' ? 'bg-muted/10' : ''}`}>
                        {v.salesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedVendedores.map((v: any, index: number) => {
            const isCurrentUser = user?.id === v.userId;
            const metaMensalPercent = v.monthlyGoal > 0 ? (v.salesValue / v.monthlyGoal) * 100 : 0;
            
            const periodContactsTarget = (v.contactsTarget || 10) * numDays;
            const contatosPercent = periodContactsTarget > 0 ? (v.interactionsCount / periodContactsTarget) * 100 : 0;
            
            const ticketMedio = v.salesCount > 0 ? v.salesValue / v.salesCount : 0;
            
            return (
              <div
                key={v.id}
                className={`relative bg-card border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                  isCurrentUser 
                    ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.01]' 
                    : 'border-border/50'
                }`}
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                {/* Position Medal / Badge */}
                <div className="absolute top-4 right-4">
                  {getRankBadge(index + 1)}
                </div>
                
                {/* Header info */}
                <div className="flex items-start gap-3 mb-5 pr-8">
                  <div className="bg-muted w-10 h-10 rounded-full flex items-center justify-center font-bold text-foreground text-sm uppercase">
                    {v.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm leading-none">{v.name}</h3>
                      {isCurrentUser && (
                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{v.email || 'Sem e-mail'}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/30">
                      {v.branch?.name || <span className="italic">Sem Filial</span>}
                    </span>
                  </div>
                </div>

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* Vendas */}
                  <div className={`p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3 transition-colors ${rankingMetric === 'salesCount' ? 'bg-amber-500/[0.03] border-amber-500/20' : ''}`}>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground leading-none">{v.salesCount || 0}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Vendas</p>
                    </div>
                  </div>

                  {/* Faturado */}
                  <div className={`p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3 transition-colors ${rankingMetric === 'salesValue' ? 'bg-emerald-500/[0.03] border-emerald-500/20' : ''}`}>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-emerald-600 leading-none">
                        {v.salesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Faturado</p>
                    </div>
                  </div>

                  {/* Conversão */}
                  <div className={`p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3 transition-colors ${rankingMetric === 'conversionRate' ? 'bg-blue-500/[0.03] border-blue-500/20' : ''}`}>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground leading-none">{v.conversionRate}%</p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Conversão</p>
                    </div>
                  </div>

                  {/* Ticket Médio */}
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none">
                        {ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Tkt. Médio</p>
                    </div>
                  </div>

                  {/* Contatos */}
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground leading-none">{v.interactionsCount || 0}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Contatos</p>
                    </div>
                  </div>

                  {/* Leads (Adicionados / Vinculados) */}
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/20 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                      <Users2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-none">
                        {v.leadsCreatedCount || 0} / {v.leadsLinkedCount || 0}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">Adic/Vinc</p>
                    </div>
                  </div>
                </div>

                {/* Double Goals Progress */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  {/* Faturamento vs Meta Mensal */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-medium">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Meta Mensal:
                      </span>
                      <span className="font-semibold text-foreground">
                        {v.salesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} / {v.monthlyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(metaMensalPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 w-8 text-right">
                        {metaMensalPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Contatos vs Meta do Período */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-medium">
                      <span className="text-muted-foreground">
                        Meta Contatos:
                      </span>
                      <span className="font-semibold text-foreground">
                        {v.interactionsCount} de {periodContactsTarget}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.min(contatosPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 w-8 text-right">
                        {contatosPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
