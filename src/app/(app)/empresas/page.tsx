"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Search, Power, PowerOff, Plus, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

export default function EmpresasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // State do Modal de Nova Empresa
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // State do Modal de Confirmação de Exclusão
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<any>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Falha ao carregar empresas');
      return res.json();
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Erro ao atualizar status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Status da empresa atualizado com sucesso!');
    },
    onError: () => toast.error('Falha ao atualizar status.')
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar empresa');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(data.message || 'Empresa e administrador criados com sucesso!');
      setIsOpen(false);
      // Limpa os campos
      setCompanyName('');
      setCompanyCnpj('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao criar empresa.');
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir empresa');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(data.message || 'Empresa e todos os seus dados foram excluídos com sucesso!');
      setIsDeleteOpen(false);
      setCompanyToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao excluir empresa.');
    }
  });

  const handleCnpjChange = (value: string) => {
    const clean = value.replace(/\D/g, "");
    let formatted = clean;
    if (clean.length > 2) formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
    if (clean.length > 5) formatted = `${formatted.slice(0, 6)}.${clean.slice(5)}`;
    if (clean.length > 8) formatted = `${formatted.slice(0, 10)}/${clean.slice(8)}`;
    if (clean.length > 12) formatted = `${formatted.slice(0, 15)}-${clean.slice(12, 14)}`;
    setCompanyCnpj(formatted.slice(0, 18));
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName || !companyCnpj || !adminName || !adminEmail || !adminPassword) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    createCompanyMutation.mutate({
      name: companyName,
      cnpj: companyCnpj,
      adminName,
      adminEmail,
      adminPassword
    });
  };

  const handleDeleteConfirm = () => {
    if (companyToDelete) {
      deleteCompanyMutation.mutate(companyToDelete.id);
    }
  };

  const filteredCompanies = companies.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.cnpj.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Gestão de Empresas (Tenants)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as assinaturas e acessos dos seus clientes.</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)} 
          className="w-full sm:w-auto bg-primary text-white hover:bg-primary/95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Empresa
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando empresas...</p>
        ) : filteredCompanies.map((company: any) => (
          <div key={company.id} className="bg-card rounded-xl border border-border/50 p-5 flex flex-col justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{company.name}</h3>
                  <p className="text-xs text-muted-foreground">CNPJ: {company.cnpj}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  company.status === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {company.status === 'ACTIVE' ? 'Ativa' : 'Suspensa'}
                </span>
              </div>
              
              <div className="flex gap-4 text-sm text-muted-foreground mb-6">
                <div>
                  <strong className="text-foreground">{company._count?.users || 0}</strong> Usuários
                </div>
                <div>
                  <strong className="text-foreground">{company._count?.leads || 0}</strong> Leads
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              {company.status === 'ACTIVE' ? (
                <Button 
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-white w-full"
                  onClick={() => toggleStatusMutation.mutate({ 
                    id: company.id, 
                    status: 'SUSPENDED' 
                  })}
                  disabled={toggleStatusMutation.isPending}
                >
                  <PowerOff className="w-4 h-4 mr-2" /> Suspender Acesso
                </Button>
              ) : (
                <>
                  <Button 
                    variant="default"
                    className="w-full"
                    onClick={() => toggleStatusMutation.mutate({ 
                      id: company.id, 
                      status: 'ACTIVE' 
                    })}
                    disabled={toggleStatusMutation.isPending}
                  >
                    <Power className="w-4 h-4 mr-2" /> Reativar Acesso
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-white w-full"
                    onClick={() => {
                      setCompanyToDelete(company);
                      setIsDeleteOpen(true);
                    }}
                    disabled={toggleStatusMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir Empresa
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {filteredCompanies.length === 0 && !isLoading && (
          <p className="text-muted-foreground col-span-full">Nenhuma empresa encontrada.</p>
        )}
      </div>

      {/* Modal / Dialog de Criação de Empresa */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cadastrar Nova Empresa (Tenant)
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da empresa e as credenciais do administrador inicial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCompanySubmit} className="space-y-6 py-2">
            {/* Seção Empresa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados da Empresa</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Nome da Empresa <span className="text-destructive">*</span></Label>
                <Input
                  id="companyName"
                  placeholder="Ex: Minha Empresa LTDA"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyCnpj">CNPJ <span className="text-destructive">*</span></Label>
                <Input
                  id="companyCnpj"
                  placeholder="00.000.000/0001-00"
                  value={companyCnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Seção Administrador */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administrador Inicial</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminName">Nome Completo <span className="text-destructive">*</span></Label>
                <Input
                  id="adminName"
                  placeholder="Ex: João Silva"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminEmail">E-mail de Login <span className="text-destructive">*</span></Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="Ex: admin@empresa.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminPassword">Senha de Acesso <span className="text-destructive">*</span></Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createCompanyMutation.isPending}
                className="bg-primary hover:bg-primary/95 text-white"
              >
                {createCompanyMutation.isPending ? 'Cadastrando...' : 'Criar Empresa & Admin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="border border-destructive/20 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir Empresa Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-2">
              Esta ação é **irreversível**. A exclusão da empresa <strong className="text-foreground">"{companyToDelete?.name}"</strong> removerá definitivamente:
              
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                <li>Todas as filiais vinculadas;</li>
                <li>Todos os usuários e administradores da empresa;</li>
                <li>Todos os vendedores, metas e comissões;</li>
                <li>Todos os leads, histórico de contatos e interações;</li>
                <li>Todas as visitas agendadas e ações de vendas ativas.</li>
              </ul>
              
              <p className="mt-4 font-semibold text-destructive">Tem certeza absoluta de que deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCompanyMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteCompanyMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-white border-none"
            >
              {deleteCompanyMutation.isPending ? 'Excluindo...' : 'Sim, Excluir Tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
