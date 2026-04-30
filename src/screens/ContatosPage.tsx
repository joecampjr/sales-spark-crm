import { useState } from 'react';
import { Search, Phone, MessageSquare, Mail, UserPlus, Filter, MoreHorizontal, Calendar, Trash2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

export default function ContatosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingContato, setEditingContato] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contatoToDelete, setContatoToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Queries
  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ['interactions'],
    queryFn: async () => {
      const res = await fetch('/api/interactions');
      if (!res.ok) throw new Error('Falha ao carregar contatos');
      return res.json();
    }
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      return res.json();
    }
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const res = await fetch('/api/sellers');
      return res.json();
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('Erro ao criar contato');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      setIsNewModalOpen(false);
      toast.success('Contato registrado/agendado com sucesso!');
    },
    onError: () => toast.error('Falha ao registrar contato.')
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/interactions/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Erro ao atualizar contato');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      setIsEditModalOpen(false);
      setEditingContato(null);
      toast.success('Contato atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/interactions/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      setIsDeleteDialogOpen(false);
      toast.success('Registro removido.');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      leadId: fd.get('leadId'),
      sellerId: fd.get('sellerId'),
      type: fd.get('type'),
      result: fd.get('result'),
      notes: fd.get('notes'),
      scheduledFor: fd.get('scheduledFor') || null,
    };

    if (isEdit && editingContato) {
      updateMutation.mutate({ ...data, id: editingContato.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'ligacao': return <Phone className="w-4 h-4 text-blue-500" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'email': return <Mail className="w-4 h-4 text-orange-500" />;
      default: return <UserPlus className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredContatos = contatos.filter((c: any) => 
    c.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.seller?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos e Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de interações e retornos</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Registrar Contato
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Registrar Nova Interação</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <select name="leadId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <option value="">Selecione...</option>
                      {leads.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendedor</Label>
                    <select name="sellerId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <option value="">Selecione...</option>
                      {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meio de Contato</Label>
                    <select name="type" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <option value="ligacao">Ligação</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">E-mail</option>
                      <option value="visita">Visita</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resultado</Label>
                    <Input name="result" required placeholder="Ex: Interessado" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Agendar Retorno (Opcional)</Label>
                    <Input name="scheduledFor" type="datetime-local" className="bg-background" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Observações</Label>
                    <Input name="notes" placeholder="Detalhes da conversa..." />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Salvando...' : 'Salvar Registro'}
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
            placeholder="Buscar por lead ou vendedor..."
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
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Canal</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Vendedor</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Resultado</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Data</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Próximo Contato</th>
                <th className="w-10 py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando interações...</td></tr>
              ) : filteredContatos.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
              ) : filteredContatos.map((contato: any) => (
                <tr key={contato.id} className="table-row-hover">
                  <td className="py-4 px-6 font-medium">{contato.lead?.name}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted/50">{getIcon(contato.type)}</div>
                      <span className="text-xs capitalize">{contato.type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">{contato.seller?.name}</td>
                  <td className="py-4 px-6 text-sm">{contato.result}</td>
                  <td className="py-4 px-6 text-xs">
                    {new Date(contato.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-4 px-6">
                    {contato.scheduledFor ? (
                      <span className="flex items-center gap-1.5 text-xs text-warning font-medium">
                        <Calendar className="w-3 h-3" />
                        {new Date(contato.scheduledFor).toLocaleString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Não agendado</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingContato(contato);
                          setIsEditModalOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => {
                          setContatoToDelete(contato);
                          setIsDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          {editingContato && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Meio de Contato</Label>
                  <select name="type" defaultValue={editingContato.type} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="ligacao">Ligação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="visita">Visita</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Resultado</Label>
                  <Input name="result" defaultValue={editingContato.result} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Agendar Retorno</Label>
                  <Input name="scheduledFor" type="datetime-local" defaultValue={editingContato.scheduledFor ? new Date(editingContato.scheduledFor).toISOString().slice(0, 16) : ''} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Observações</Label>
                  <Input name="notes" defaultValue={editingContato.notes || ''} />
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
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá permanentemente este contato do histórico do lead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={() => deleteMutation.mutate(contatoToDelete?.id)}>
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
