import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { mockLeads } from '@/data/mockData';
import { LeadStatus, LEAD_STATUS_LABELS, PRIORITY_LABELS } from '@/types/crm';

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      lead.nome.toLowerCase().includes(search.toLowerCase()) ||
      lead.cidade?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockLeads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Importar CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar
          </Button>
          <Button size="sm" className="text-xs gradient-primary text-primary-foreground">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', 'novo', 'em_negociacao', 'contato_realizado', 'vendido', 'perdido'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s === 'todos' ? 'Todos' : LEAD_STATUS_LABELS[s as LeadStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['Nome', 'Cidade', 'Status', 'Prioridade', 'Vendedor', 'Valor Est.', 'Origem', 'Entrada', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="table-row-hover border-b border-border/30 last:border-0 cursor-pointer">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-foreground">{lead.nome.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{lead.nome}</p>
                        <p className="text-xs text-muted-foreground">{lead.telefone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{lead.cidade}/{lead.estado}</td>
                  <td className="py-3 px-4"><StatusBadge status={lead.status} /></td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      lead.prioridade === 'urgente' ? 'bg-destructive/10 text-destructive' :
                      lead.prioridade === 'alta' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {PRIORITY_LABELS[lead.prioridade]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {lead.vendedor || <span className="text-destructive text-xs">Sem responsável</span>}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">
                    {lead.valor_estimado ? `R$ ${(lead.valor_estimado / 1000).toFixed(0)}k` : '-'}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{lead.origem}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{lead.data_entrada}</td>
                  <td className="py-3 px-4">
                    <button className="p-1 rounded hover:bg-muted">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

