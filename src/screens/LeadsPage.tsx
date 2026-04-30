import { useState, useRef } from 'react';
import { Search, Plus, MoreHorizontal, Download, Upload, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { LeadStatus, LEAD_STATUS_LABELS, PRIORITY_LABELS } from '@/types/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'todos') params.append('status', statusFilter);
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar leads');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newLead: any) => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (!res.ok) throw new Error('Erro ao criar lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsModalOpen(false);
      toast.success('Lead criado com sucesso!');
    },
    onError: () => toast.error('Falha ao criar o lead.')
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedLead: any) => {
      const res = await fetch(`/api/leads/${updatedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead)
      });
      if (!res.ok) throw new Error('Erro ao atualizar lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditModalOpen(false);
      setEditingLead(null);
      toast.success('Lead atualizado com sucesso!');
    },
    onError: () => toast.error('Falha ao atualizar o lead.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Erro ao deletar lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
      toast.success('Lead deletado com sucesso!');
    },
    onError: () => toast.error('Falha ao deletar o lead.')
  });

  const importMutation = useMutation({
    mutationFn: async (parsedData: any[]) => {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      if (!res.ok) throw new Error('Erro na importação');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(data.message || 'Leads importados!');
    },
    onError: () => toast.error('Erro ao importar CSV.')
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: any) => ({
          name: row['Nome'] || row['name'] || 'Sem Nome',
          phone: row['Telefone'] || row['phone'] || String(Math.random()),
          city: row['Cidade'] || row['city'] || '',
          state: row['Estado'] || row['state'] || '',
          status: row['Status'] || row['status'] || 'novo',
          priority: row['Prioridade'] || row['priority'] || 'media',
          estimatedValue: parseFloat(row['Valor Estimado'] || row['estimatedValue']) || 0,
          source: row['Origem'] || row['source'] || 'CSV Import'
        }));
        importMutation.mutate(mapped);
      }
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get('name'),
      phone: fd.get('phone'),
      city: fd.get('city'),
      state: fd.get('state'),
      status: fd.get('status'),
      priority: fd.get('priority'),
      estimatedValue: Number(fd.get('estimatedValue')) || 0,
      source: fd.get('source')
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingLead.id,
      name: fd.get('name'),
      phone: fd.get('phone'),
      city: fd.get('city'),
      state: fd.get('state'),
      status: fd.get('status'),
      priority: fd.get('priority'),
      estimatedValue: Number(fd.get('estimatedValue')) || 0,
      source: fd.get('source')
    });
  };

  const handleDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> {importMutation.isPending ? 'Importando...' : 'Importar CSV'}
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open('/api/leads/export', '_blank')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar
          </Button>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gradient-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input name="name" required placeholder="Ex: João Pereira" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input 
                      name="phone" 
                      required 
                      placeholder="(DD) 99999-9999" 
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (v.length > 11) v = v.slice(0, 11);
                        if (v.length > 7) {
                          v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                        } else if (v.length > 2) {
                          v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                        } else if (v.length > 0) {
                          v = `(${v.slice(0, 2)}`;
                        }
                        e.target.value = v;
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input name="city" required placeholder="São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input name="state" required placeholder="SP" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="novo">Novo</option>
                      <option value="em_negociacao">Em Negociação</option>
                      <option value="contato_realizado">Contato Realizado</option>
                      <option value="vendido">Vendido</option>
                      <option value="perdido">Perdido</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <select name="priority" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Estimado</Label>
                    <Input type="number" name="estimatedValue" placeholder="15000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <select name="source" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="Loja Física">Loja Física</option>
                      <option value="Visita Externa">Visita Externa</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Site">Site</option>
                      <option value="Redes Sociais">Redes Sociais</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="flex w-full justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Salvando...' : 'Salvar Lead'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
              {s === 'todos' ? 'Todos' : LEAD_STATUS_LABELS[s as LeadStatus] || s}
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
              {isLoading ? (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Carregando leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Nenhum lead encontrado.</td></tr>
              ) : leads.map((lead: any) => (
                <tr key={lead.id} className="table-row-hover border-b border-border/30 last:border-0 cursor-pointer">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-foreground">{lead.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{lead.city}/{lead.state}</td>
                  <td className="py-3 px-4"><StatusBadge status={lead.status} /></td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      lead.priority === 'urgente' ? 'bg-destructive/10 text-destructive' :
                      lead.priority === 'alta' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {PRIORITY_LABELS[lead.priority as keyof typeof PRIORITY_LABELS] || lead.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {lead.seller?.name || <span className="text-destructive text-xs">Sem responsável</span>}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">
                    {lead.estimatedValue ? `R$ ${(lead.estimatedValue / 1000).toFixed(0)}k` : '-'}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{lead.source}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingLead(lead);
                          setIsEditModalOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setLeadToDelete(lead);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input name="name" required defaultValue={editingLead.name} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input 
                    name="phone" 
                    required 
                    defaultValue={editingLead.phone}
                    placeholder="(DD) 99999-9999" 
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length > 11) v = v.slice(0, 11);
                      if (v.length > 7) {
                        v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                      } else if (v.length > 2) {
                        v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                      } else if (v.length > 0) {
                        v = `(${v.slice(0, 2)}`;
                      }
                      e.target.value = v;
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input name="city" required defaultValue={editingLead.city} />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input name="state" required defaultValue={editingLead.state} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select name="status" defaultValue={editingLead.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="novo">Novo</option>
                    <option value="em_negociacao">Em Negociação</option>
                    <option value="contato_realizado">Contato Realizado</option>
                    <option value="vendido">Vendido</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <select name="priority" defaultValue={editingLead.priority} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Estimado</Label>
                  <Input type="number" name="estimatedValue" defaultValue={editingLead.estimatedValue} />
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <select name="source" defaultValue={editingLead.source} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="Loja Física">Loja Física</option>
                    <option value="Visita Externa">Visita Externa</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site">Site</option>
                    <option value="Redes Sociais">Redes Sociais</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
              <div className="flex w-full justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o lead
              <span className="font-semibold text-foreground"> {leadToDelete?.name} </span>
              e todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
