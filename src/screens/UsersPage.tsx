"use client";

import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Shield, Mail, Building2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { maskPhone, maskCpf } from '@/lib/utils';
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
import { useAuth } from '@/contexts/AuthContext';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Perfil e CPF states
  const [newRole, setNewRole] = useState('VENDEDOR');
  const [editRole, setEditRole] = useState('VENDEDOR');
  const [newCpf, setNewCpf] = useState('');
  const [editCpf, setEditCpf] = useState('');

  // Queries
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      return res.json();
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar usuário');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsNewModalOpen(false);
      toast.success('Usuário cadastrado com sucesso!');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/users/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao atualizar usuário');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setEditingUser(null);
      toast.success('Usuário atualizado!');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteDialogOpen(false);
      toast.success('Usuário removido.');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const role = fd.get('role') as string;
    const data: any = {
      name: fd.get('name'),
      email: fd.get('email'),
      role,
      branchId: fd.get('branchId') || null,
      cpf: fd.get('cpf') || null,
    };

    const password = fd.get('password');
    if (password) data.password = password;

    if (role === 'VENDEDOR') {
      data.phone = fd.get('phone') || null;
      data.region = fd.get('region') || 'São Paulo - Capital';
      data.monthlyGoal = Number(fd.get('monthlyGoal')) || 0;
      data.commissionRate = Number(fd.get('commissionRate')) || 0;
      data.contactsTarget = Number(fd.get('contactsTarget')) || 10;
    }

    if (isEdit && editingUser) {
      updateMutation.mutate({ ...data, id: editingUser.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredUsers = users.filter((u: any) => 
    (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-destructive hover:bg-destructive">Administrador</Badge>;
      case 'SUPERVISOR': return <Badge className="bg-warning hover:bg-warning">Supervisor</Badge>;
      case 'GERENTE': return <Badge className="bg-info hover:bg-info text-white">Gerente</Badge>;
      default: return <Badge variant="secondary">Vendedor</Badge>;
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2 max-w-md">Esta página é exclusiva para administradores do sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Administre as contas e permissões do sistema</p>
        </div>
        <Dialog open={isNewModalOpen} onOpenChange={(open) => {
          setIsNewModalOpen(open);
          if (open) {
            setNewRole('VENDEDOR');
            setNewCpf('');
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Criar Nova Conta</DialogTitle></DialogHeader>
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Completo</Label>
                  <Input name="name" required placeholder="Ex: Ana Souza" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>E-mail (Login)</Label>
                  <Input name="email" type="email" required placeholder="ana@empresa.com" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>CPF</Label>
                  <Input 
                    name="cpf" 
                    required 
                    placeholder="000.000.000-00" 
                    value={newCpf}
                    onChange={(e) => setNewCpf(maskCpf(e.target.value))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Senha Temporária</Label>
                  <Input name="password" type="password" required placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <select 
                    name="role" 
                    value={newRole} 
                    onChange={(e) => setNewRole(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Filial (Opcional)</Label>
                  <select name="branchId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Nenhuma</option>
                    {Array.isArray(branches) && branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                {newRole === 'VENDEDOR' && (
                  <>
                    <Separator className="col-span-2 my-2" />
                    <div className="space-y-2 col-span-2">
                      <p className="text-xs font-semibold text-primary">Dados do Vendedor</p>
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp / Celular</Label>
                      <Input 
                        name="phone" 
                        required 
                        placeholder="(11) 99999-9999" 
                        onChange={(e) => e.target.value = maskPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Região de Atuação</Label>
                      <Input name="region" required placeholder="Ex: São Paulo - Sul" />
                    </div>
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
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                {['Usuário', 'Perfil', 'Filial', 'Criação', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">Carregando usuários...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              ) : filteredUsers.map((u: any) => (
                <tr key={u.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {u.branch?.name || <span className="text-[10px] italic">Sede / Geral</span>}
                  </td>
                  <td className="py-3 px-4 text-[10px] text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { 
                          setEditingUser(u); 
                          setEditRole(u.role);
                          setEditCpf(u.cpf ? maskCpf(u.cpf) : '');
                          setIsEditModalOpen(true); 
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { setUserToDelete(u); setIsDeleteDialogOpen(true); }}>
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editingUser && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Completo</Label>
                  <Input name="name" defaultValue={editingUser.name} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>E-mail</Label>
                  <Input name="email" type="email" defaultValue={editingUser.email} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>CPF</Label>
                  <Input 
                    name="cpf" 
                    required 
                    placeholder="000.000.000-00" 
                    value={editCpf}
                    onChange={(e) => setEditCpf(maskCpf(e.target.value))}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Nova Senha (Deixe em branco para manter)</Label>
                  <Input name="password" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <select 
                    name="role" 
                    value={editRole} 
                    onChange={(e) => setEditRole(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Filial</Label>
                  <select name="branchId" defaultValue={editingUser.branchId || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Nenhuma</option>
                    {Array.isArray(branches) && branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                {editRole === 'VENDEDOR' && (
                  <>
                    <Separator className="col-span-2 my-2" />
                    <div className="space-y-2 col-span-2">
                      <p className="text-xs font-semibold text-primary">Dados do Vendedor</p>
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp / Celular</Label>
                      <Input 
                        name="phone" 
                        required 
                        defaultValue={editingUser.seller?.phone ? maskPhone(editingUser.seller.phone) : ''}
                        onChange={(e) => e.target.value = maskPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Região de Atuação</Label>
                      <Input name="region" required defaultValue={editingUser.seller?.region || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Mensal (R$)</Label>
                      <Input name="monthlyGoal" type="number" defaultValue={editingUser.seller?.monthlyGoal || 0} />
                    </div>
                    <div className="space-y-2">
                      <Label>Comissão (%)</Label>
                      <Input name="commissionRate" type="number" step="0.1" defaultValue={editingUser.seller?.commissionRate || 0} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Meta de Contatos Diários</Label>
                      <Input name="contactsTarget" type="number" defaultValue={editingUser.seller?.contactsTarget || 10} />
                    </div>
                  </>
                )}
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
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <span className="font-bold text-foreground">{userToDelete?.name}</span>? 
              O acesso será revogado imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={() => deleteMutation.mutate(userToDelete?.id)}>
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
