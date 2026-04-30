import { useState } from 'react';
import { Search, UserPlus, MoreHorizontal, Pencil, Trash2, MapPin, Target, BarChart3, TrendingUp, Users } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function SellersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Queries
  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const res = await fetch('/api/sellers');
      if (!res.ok) throw new Error('Falha ao carregar vendedores');
      return res.json();
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('Erro ao criar vendedor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      setIsNewModalOpen(false);
      toast.success('Vendedor cadastrado com sucesso!');
    },
    onError: () => toast.error('Falha ao cadastrar vendedor.')
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/sellers/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Erro ao atualizar vendedor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      setIsEditModalOpen(false);
      setEditingSeller(null);
      toast.success('Vendedor atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/sellers/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      setIsDeleteDialogOpen(false);
      toast.success('Vendedor removido.');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name'),
      region: fd.get('region'),
      monthlyGoal: Number(fd.get('monthlyGoal')),
      contactsTarget: Number(fd.get('contactsTarget')),
    };

    if (isEdit && editingSeller) {
      updateMutation.mutate({ ...data, id: editingSeller.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredSellers = Array.isArray(sellers) ? sellers.filter((s: any) => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.region?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipe de Vendas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de vendedores e metas de desempenho</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Vendedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>Cadastrar Novo Vendedor</DialogTitle></DialogHeader>
              <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome Completo</Label>
                    <Input name="name" required placeholder="Ex: João Silva" />
                  </div>
                  <div className="space-y-2">
                    <Label>Região de Atuação</Label>
                    <Input name="region" required placeholder="Ex: Sudeste" />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Mensal (R$)</Label>
                    <Input name="monthlyGoal" type="number" defaultValue={50000} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Contatos Diários</Label>
                    <Input name="contactsTarget" type="number" defaultValue={10} />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Cadastrando...' : 'Salvar Vendedor'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Equipe</p>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredSellers.length}</p>
          <p className="text-[10px] text-muted-foreground italic">Vendedores ativos</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Média de Conversão</p>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {filteredSellers.length > 0 
              ? (filteredSellers.reduce((acc: any, s: any) => acc + s.conversionRate, 0) / filteredSellers.length).toFixed(1)
              : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground italic">Média global</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Meta Total</p>
            <Target className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            R$ {filteredSellers.reduce((acc: any, s: any) => acc + s.monthlyGoal, 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground italic">Somatória de metas</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Leads</p>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {filteredSellers.reduce((acc: any, s: any) => acc + (s._count?.leads || 0), 0)}
          </p>
          <p className="text-[10px] text-muted-foreground italic">Distribuídos na equipe</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou região..."
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
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Vendedor</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Região</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase text-center">Vendas</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase text-center">Conversão</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase text-center">Leads</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase">Meta Mensal</th>
                <th className="w-10 py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground italic">Carregando equipe...</td></tr>
              ) : filteredSellers.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground italic">Nenhum vendedor encontrado.</td></tr>
              ) : filteredSellers.map((seller: any) => (
                <tr key={seller.id} className="table-row-hover">
                  <td className="py-4 px-6 font-medium">{seller.name}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {seller.region}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Badge variant="outline" className="font-bold">{seller.salesCount}</Badge>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold">{seller.conversionRate}%</span>
                      <div className="w-16 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${seller.conversionRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center text-sm font-medium">
                    {seller._count?.leads || 0}
                  </td>
                  <td className="py-4 px-6 text-sm font-bold text-foreground">
                    R$ {seller.monthlyGoal.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingSeller(seller);
                          setIsEditModalOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar Meta/Região
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => {
                          setSellerToDelete(seller);
                          setIsDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Remover Vendedor
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
          <DialogHeader><DialogTitle>Editar Vendedor</DialogTitle></DialogHeader>
          {editingSeller && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Completo</Label>
                  <Input name="name" defaultValue={editingSeller.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Input name="region" defaultValue={editingSeller.region} required />
                </div>
                <div className="space-y-2">
                  <Label>Meta Mensal (R$)</Label>
                  <Input name="monthlyGoal" type="number" defaultValue={editingSeller.monthlyGoal} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Meta Contatos Diários</Label>
                  <Input name="contactsTarget" type="number" defaultValue={editingSeller.contactsTarget} />
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
            <AlertDialogTitle>Remover vendedor da equipe?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados históricos vinculados a este vendedor serão mantidos, mas ele não aparecerá mais na lista ativa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={() => deleteMutation.mutate(sellerToDelete?.id)}>
              Confirmar Remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
