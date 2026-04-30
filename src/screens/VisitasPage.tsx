import { useState } from 'react';
import { Search, MapPin, Calendar, MoreHorizontal, Pencil, Trash2, Plus, Clock, CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function VisitasPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Perfil permissions
  const canAuthorize = user?.perfil === 'admin' || user?.perfil === 'supervisor';

  // Queries
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const res = await fetch('/api/visits');
      if (!res.ok) throw new Error('Falha ao carregar visitas');
      return res.json();
    }
  });

  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: async () => (await fetch('/api/leads')).json() });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: async () => (await fetch('/api/sellers')).json() });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('Erro ao agendar visita');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setIsNewModalOpen(false);
      toast.success('Visita solicitada/agendada com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/visits/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setIsEditModalOpen(false);
      setEditingVisit(null);
      toast.success('Visita atualizada!');
    }
  });

  const authorizeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'autorizada' | 'recusada' }) => {
      const res = await fetch(`/api/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          authorizedById: user?.id 
        })
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success(variables.status === 'autorizada' ? 'Visita autorizada!' : 'Visita recusada.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/visits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setIsDeleteDialogOpen(false);
      toast.success('Visita removida.');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      leadId: fd.get('leadId'),
      sellerId: fd.get('sellerId'),
      address: fd.get('address'),
      visitDate: fd.get('visitDate'),
      status: fd.get('status'),
      notes: fd.get('notes'),
    };

    if (isEdit && editingVisit) {
      updateMutation.mutate({ ...data, id: editingVisit.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aguardando_autorizacao': return <span className="bg-warning/10 text-warning px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Pendente Autorização</span>;
      case 'autorizada': return <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Autorizada</span>;
      case 'realizada': return <span className="bg-success/10 text-success px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Realizada</span>;
      case 'recusada': return <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Recusada</span>;
      case 'cancelada': return <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelada</span>;
      default: return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> {status}</span>;
    }
  };

  const filteredVisits = visits.filter((v: any) => 
    v.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitas Técnicas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de solicitações e autorizações de saída</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Solicitar Visita
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Nova Solicitação de Visita</DialogTitle></DialogHeader>
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead</Label>
                  <select name="leadId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Vendedor/Técnico</Label>
                  <select name="sellerId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Endereço Completo</Label>
                  <Input name="address" required placeholder="Rua, Número, Bairro, Cidade" />
                </div>
                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input name="visitDate" type="datetime-local" required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Status Inicial</Label>
                  <select name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="aguardando_autorizacao">Aguardando Autorização</option>
                    {canAuthorize && (
                      <>
                        <option value="autorizada">Autorizada</option>
                        <option value="realizada">Realizada</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Observações/Motivo</Label>
                  <Input name="notes" placeholder="Descreva o motivo da visita..." />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Enviar Solicitação' : 'Enviar Solicitação'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-10 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Lead</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Endereço</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Técnico</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Data/Hora</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Carregando cronograma...</td></tr>
              ) : filteredVisits.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma visita encontrada.</td></tr>
              ) : filteredVisits.map((visit: any) => (
                <tr key={visit.id} className="table-row-hover">
                  <td className="py-4 px-6 font-medium">{visit.lead?.name}</td>
                  <td className="py-4 px-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{visit.address}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">{visit.seller?.name}</td>
                  <td className="py-4 px-6 text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold">{new Date(visit.visitDate).toLocaleDateString('pt-BR')}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(visit.visitDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {getStatusBadge(visit.status)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {canAuthorize && visit.status === 'aguardando_autorizacao' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] border-primary text-primary hover:bg-primary/5"
                            onClick={() => authorizeMutation.mutate({ id: visit.id, status: 'autorizada' })}
                          >
                            Autorizar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] border-destructive text-destructive hover:bg-destructive/5"
                            onClick={() => authorizeMutation.mutate({ id: visit.id, status: 'recusada' })}
                          >
                            Recusar
                          </Button>
                        </>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingVisit(visit); setIsEditModalOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setVisitToDelete(visit); setIsDeleteDialogOpen(true); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Editar Visita</DialogTitle></DialogHeader>
          {editingVisit && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Endereço Completo</Label>
                  <Input name="address" defaultValue={editingVisit.address} required />
                </div>
                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input name="visitDate" type="datetime-local" defaultValue={new Date(editingVisit.visitDate).toISOString().slice(0, 16)} required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select name="status" defaultValue={editingVisit.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="aguardando_autorizacao">Aguardando Autorização</option>
                    <option value="autorizada">Autorizada</option>
                    <option value="realizada">Realizada</option>
                    <option value="recusada">Recusada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Observações</Label>
                  <Input name="notes" defaultValue={editingVisit.notes || ''} />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir visita?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá permanentemente este agendamento do sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={() => deleteMutation.mutate(visitToDelete?.id)}>
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
