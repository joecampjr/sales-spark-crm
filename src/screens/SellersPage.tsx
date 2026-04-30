import { useState } from 'react';
import { Search, UserPlus, MoreHorizontal, Pencil, Trash2, MapPin, Target, BarChart3, TrendingUp, Users, Phone, Mail, Wallet, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SellersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao criar vendedor');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      setIsNewModalOpen(false);
      toast.success('Vendedor cadastrado com sucesso!');
    },
    onError: (error: any) => toast.error(error.message)
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
      toast.success('Perfil atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/sellers/${id}`, { method: 'DELETE' }),
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
      email: fd.get('email'),
      phone: fd.get('phone'),
      region: fd.get('region'),
      monthlyGoal: Number(fd.get('monthlyGoal')),
      contactsTarget: Number(fd.get('contactsTarget')),
      commissionRate: Number(fd.get('commissionRate')),
      status: fd.get('status'),
    };

    if (isEdit && editingSeller) {
      updateMutation.mutate({ ...data, id: editingSeller.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': return <Badge className="bg-success/10 text-success border-success/20 capitalize">{status}</Badge>;
      case 'ferias': return <Badge className="bg-warning/10 text-warning border-warning/20 capitalize">{status}</Badge>;
      case 'inativo': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 capitalize">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSellers = Array.isArray(sellers) ? sellers.filter((s: any) => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.region?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Talentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Administre sua força de vendas e comissionamento</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Novo Vendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>Contratar Novo Vendedor</DialogTitle></DialogHeader>
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Completo</Label>
                  <Input name="name" required placeholder="João Silva" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Corporativo (Opcional)</Label>
                  <Input name="email" type="email" placeholder="joao@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp/Celular</Label>
                  <Input name="phone" required placeholder="Ex: 11999998888 (Só números)" />
                  <p className="text-[10px] text-muted-foreground italic">DDD + 8 ou 9 dígitos</p>
                </div>
                <div className="space-y-2">
                  <Label>Região de Atuação</Label>
                  <Input name="region" required placeholder="Ex: São Paulo - ZS" />
                </div>
                <div className="space-y-2">
                  <Label>Status Inicial</Label>
                  <select name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <Separator className="col-span-2 my-2" />
                <div className="space-y-2">
                  <Label>Meta Mensal (R$)</Label>
                  <Input name="monthlyGoal" type="number" defaultValue={50000} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão (%)</Label>
                  <Input name="commissionRate" type="number" step="0.1" defaultValue={5} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Meta de Contatos Diários</Label>
                  <Input name="contactsTarget" type="number" defaultValue={10} />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Processando...' : 'Salvar Contratação'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sellers List Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/30 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, região ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border h-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase">Vendedor</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase text-center">Status</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase text-center">Contatos/Dia</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase text-center">Comissão</th>
                <th className="text-left py-4 px-6 text-xs font-bold text-muted-foreground uppercase">Meta Mensal</th>
                <th className="w-10 py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground italic">Carregando equipe de vendas...</td></tr>
              ) : filteredSellers.map((seller: any) => (
                <tr key={seller.id} className="table-row-hover group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                        {seller.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer" onClick={() => { setSelectedSeller(seller); setIsSheetOpen(true); }}>
                          {seller.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {seller.region}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">{getStatusBadge(seller.status)}</td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold">{seller.contactsToday} / {seller.contactsTarget}</span>
                      <div className="w-20 h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (seller.contactsToday / seller.contactsTarget) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Badge variant="outline" className="text-blue-500 border-blue-500/20">{seller.commissionRate}%</Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">R$ {seller.monthlyGoal.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">Faturamento Previsto</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedSeller(seller); setIsSheetOpen(true); }}>
                          <ExternalLink className="w-4 h-4 mr-2" /> Perfil Completo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingSeller(seller); setIsEditModalOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar Dados
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { setSellerToDelete(seller); setIsDeleteDialogOpen(true); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Remover
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

      {/* Seller Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Perfil do Vendedor</SheetTitle>
          </SheetHeader>
          {selectedSeller && (
            <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg ring-4 ring-background">
                  {selectedSeller.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedSeller.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedSeller.region}</p>
                </div>
                {getStatusBadge(selectedSeller.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Vendas Totais</p>
                  <p className="text-lg font-bold">{selectedSeller.salesCount}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Conversão</p>
                  <p className="text-lg font-bold text-success">{selectedSeller.conversionRate}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2"><Phone className="w-4 h-4" /> Informações de Contato</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> E-mail</span>
                    <span className="font-medium">{selectedSeller.email || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> WhatsApp</span>
                    <span className="font-medium">{selectedSeller.phone || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-success" /> Comissionamento e Metas</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de Comissão</span>
                    <Badge className="bg-success/20 text-success border-0">{selectedSeller.commissionRate}%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Meta Mensal de Faturamento</span>
                    <span className="font-bold">R$ {selectedSeller.monthlyGoal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full" onClick={() => { setIsSheetOpen(false); setEditingSeller(selectedSeller); setIsEditModalOpen(true); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar Perfil Completo
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Editar Perfil do Vendedor</DialogTitle></DialogHeader>
          {editingSeller && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Completo</Label>
                  <Input name="name" defaultValue={editingSeller.name} required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input name="email" type="email" defaultValue={editingSeller.email || ''} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input name="phone" defaultValue={editingSeller.phone || ''} />
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Input name="region" defaultValue={editingSeller.region} required />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select name="status" defaultValue={editingSeller.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="ativo">Ativo</option>
                    <option value="ferias">Em Férias</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <Separator className="col-span-2 my-2" />
                <div className="space-y-2">
                  <Label>Meta Mensal (R$)</Label>
                  <Input name="monthlyGoal" type="number" defaultValue={editingSeller.monthlyGoal} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão (%)</Label>
                  <Input name="commissionRate" type="number" step="0.1" defaultValue={editingSeller.commissionRate} />
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
            <AlertDialogTitle>Remover vendedor definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. O histórico de vendas e leads será mantido para auditoria, mas o acesso do vendedor será revogado.</AlertDialogDescription>
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
