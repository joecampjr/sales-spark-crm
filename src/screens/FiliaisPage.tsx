"use client";

import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, MapPin, Phone, Mail, Building2, Users } from 'lucide-react';
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
import { maskPhone } from '@/lib/utils';

export default function FiliaisPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Queries
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) throw new Error('Falha ao carregar filiais');
      return res.json();
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('Erro ao criar filial');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsNewModalOpen(false);
      toast.success('Filial cadastrada com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/branches/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error('Erro ao atualizar filial');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsEditModalOpen(false);
      setEditingBranch(null);
      toast.success('Filial atualizada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/branches/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsDeleteDialogOpen(false);
      toast.success('Filial removida.');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name'),
      city: fd.get('city'),
      state: fd.get('state'),
      address: fd.get('address'),
      phone: fd.get('phone'),
      email: fd.get('email'),
    };

    if (isEdit && editingBranch) {
      updateMutation.mutate({ ...data, id: editingBranch.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredBranches = Array.isArray(branches) ? branches.filter((b: any) => 
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.city?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Filiais</h1>
          <p className="text-muted-foreground text-sm mt-1">Administre as unidades da sua rede</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Filial
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Cadastrar Nova Unidade</DialogTitle></DialogHeader>
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome da Unidade</Label>
                  <Input name="name" required placeholder="Ex: Filial Centro SP" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input name="city" required placeholder="São Paulo" />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input name="state" required placeholder="SP" maxLength={2} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Endereço Completo</Label>
                  <Input name="address" placeholder="Rua, Número, Bairro" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp/Telefone</Label>
                  <Input 
                    name="phone" 
                    placeholder="(11) 99999-9999" 
                    onChange={(e) => e.target.value = maskPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Contato</Label>
                  <Input name="email" type="email" placeholder="unidade@empresa.com" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Cadastrar Filial'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid of Branches */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">Carregando unidades...</div>
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">Nenhuma filial encontrada.</div>
        ) : filteredBranches.map((branch: any) => (
          <div key={branch.id} className="bg-card border border-border/50 rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditingBranch(branch); setIsEditModalOpen(true); }}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => { setBranchToDelete(branch); setIsDeleteDialogOpen(true); }}>
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground leading-tight">{branch.name}</h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 uppercase tracking-wider font-bold">
                  {branch.city} - {branch.state}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{branch.address || 'Endereço não informado'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{branch.phone ? maskPhone(branch.phone) : 'Sem telefone'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{branch.email || 'Sem e-mail'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Equipe ({branch._count?.sellers || 0})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {branch.sellers?.length > 0 ? (
                  branch.sellers.map((s: any) => (
                    <Badge key={s.id} variant="outline" className="text-[9px] font-normal py-0 px-1.5 bg-muted/30">
                      {s.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Nenhum vendedor vinculado</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Editar Unidade</DialogTitle></DialogHeader>
          {editingBranch && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome da Unidade</Label>
                  <Input name="name" defaultValue={editingBranch.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input name="city" defaultValue={editingBranch.city} required />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Input name="state" defaultValue={editingBranch.state} required maxLength={2} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Endereço Completo</Label>
                  <Input name="address" defaultValue={editingBranch.address || ''} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input 
                    name="phone" 
                    defaultValue={editingBranch.phone ? maskPhone(editingBranch.phone) : ''} 
                    onChange={(e) => e.target.value = maskPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input name="email" type="email" defaultValue={editingBranch.email || ''} />
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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta unidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados vinculados a esta filial serão afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={() => deleteMutation.mutate(branchToDelete?.id)}>
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
