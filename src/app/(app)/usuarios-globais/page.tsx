"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Search, Plus, MoreHorizontal, Pencil, Trash2, 
  Shield, Mail, Building2, UserCircle, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function UsuariosGlobaisPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // States para formulários
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // Queries
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['global-users'],
    queryFn: async () => {
      const res = await fetch('/api/saas/users');
      if (!res.ok) throw new Error('Falha ao carregar usuários globais');
      return res.json();
    }
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['global-branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches'); // Opcional, carrega todas as filiais
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/saas/users', {
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
      queryClient.invalidateQueries({ queryKey: ['global-users'] });
      setIsNewModalOpen(false);
      setSelectedCompanyId('');
      toast.success('Usuário criado com sucesso na plataforma!');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/saas/users/${updatedData.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['global-users'] });
      setIsEditModalOpen(false);
      setEditingUser(null);
      setSelectedCompanyId('');
      toast.success('Usuário atualizado com sucesso!');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/saas/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-users'] });
      setIsDeleteDialogOpen(false);
      toast.success('Usuário removido da plataforma permanentemente.');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const data: any = {
      name: fd.get('name'),
      email: fd.get('email'),
      role: fd.get('role'),
      companyId: fd.get('companyId') || null,
      branchId: fd.get('branchId') || null,
    };

    const password = fd.get('password');
    if (password) data.password = password;

    if (isEdit && editingUser) {
      updateMutation.mutate({ ...data, id: editingUser.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredUsers = users.filter((u: any) => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN': return <Badge className="bg-primary hover:bg-primary text-white">Super Admin</Badge>;
      case 'ADMIN': return <Badge className="bg-destructive hover:bg-destructive">Administrador</Badge>;
      case 'SUPERVISOR': return <Badge className="bg-warning hover:bg-warning text-foreground">Supervisor</Badge>;
      case 'GERENTE': return <Badge className="bg-info hover:bg-info text-white">Gerente</Badge>;
      default: return <Badge variant="secondary">Vendedor</Badge>;
    }
  };

  // Filtrar filiais da empresa selecionada para o formulário
  const formBranches = branches.filter((b: any) => b.companyId === selectedCompanyId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Usuários Globais (Plataforma)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie, edite ou exclua qualquer usuário do ecossistema SaaS.</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedCompanyId('');
            setIsNewModalOpen(true);
          }}
          className="bg-primary text-white hover:bg-primary/95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Usuário Global
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-10"
          />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Filial</th>
                <th className="px-6 py-4">Cadastro</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando contas de usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado na plataforma.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    {/* Usuário */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Empresa */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{u.company?.name || <span className="text-xs text-primary font-bold">CoBusiness (Super Admin)</span>}</span>
                      </div>
                    </td>

                    {/* Perfil */}
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>

                    {/* Filial */}
                    <td className="px-6 py-4 text-muted-foreground">
                      {u.branch?.name || <span className="text-xs italic text-muted-foreground/60">Sede / Geral</span>}
                    </td>

                    {/* Cadastro */}
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingUser(u);
                            setSelectedCompanyId(u.companyId || '');
                            setIsEditModalOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            disabled={u.id === currentUser?.id}
                            className="text-destructive focus:bg-destructive/10" 
                            onClick={() => {
                              setUserToDelete(u);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Novo Usuário */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Cadastrar Novo Usuário Global
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="newName">Nome Completo <span className="text-destructive">*</span></Label>
                <Input id="newName" name="name" required placeholder="Ex: Lucas Mendes" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="newEmail">E-mail (Login) <span className="text-destructive">*</span></Label>
                <Input id="newEmail" name="email" type="email" required placeholder="lucas@empresa.com" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="newPassword">Senha Provisória <span className="text-destructive">*</span></Label>
                <Input id="newPassword" name="password" type="password" required placeholder="Min. 6 caracteres" minLength={6} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newRole">Perfil de Acesso <span className="text-destructive">*</span></Label>
                <select id="newRole" name="role" defaultValue="VENDEDOR" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERADMIN">Super Admin (CoBusiness)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newCompany">Empresa Vinculada</Label>
                <select 
                  id="newCompany" 
                  name="companyId" 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Nenhuma (Super Admin Master)</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="newBranch">Filial Vinculada (Opcional)</Label>
                <select 
                  id="newBranch" 
                  name="branchId" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedCompanyId}
                >
                  <option value="">Nenhuma / Sede Geral</option>
                  {formBranches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button type="submit" disabled={createMutation.isPending} className="bg-primary text-white hover:bg-primary/95">
                {createMutation.isPending ? 'Criando...' : 'Cadastrar Usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal - Editar Usuário */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Usuário Global
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editName">Nome Completo</Label>
                  <Input id="editName" name="name" defaultValue={editingUser.name} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editEmail">E-mail</Label>
                  <Input id="editEmail" name="email" type="email" defaultValue={editingUser.email} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editPassword">Nova Senha (deixe em branco para manter)</Label>
                  <Input id="editPassword" name="password" type="password" placeholder="••••••••" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRole">Perfil</Label>
                  <select id="editRole" name="role" defaultValue={editingUser.role} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="SUPERADMIN">Super Admin (CoBusiness)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editCompany">Empresa Vinculada</Label>
                  <select 
                    id="editCompany" 
                    name="companyId" 
                    value={selectedCompanyId} 
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Nenhuma (Super Admin Master)</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editBranch">Filial Vinculada</Label>
                  <select 
                    id="editBranch" 
                    name="branchId" 
                    defaultValue={editingUser.branchId || ''} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!selectedCompanyId}
                  >
                    <option value="">Nenhuma / Sede Geral</option>
                    {formBranches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border mt-6">
                <Button type="submit" disabled={updateMutation.isPending} className="bg-primary text-white hover:bg-primary/95">
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog - Confirmação Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Excluir Usuário Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente <strong className="text-foreground">&quot;{userToDelete?.name}&quot;</strong> da plataforma. 
              Esta ação revogará todo e qualquer acesso imediatamente.
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90 text-white" 
              onClick={() => deleteMutation.mutate(userToDelete?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
