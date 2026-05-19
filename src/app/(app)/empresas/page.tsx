"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Search, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function EmpresasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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
                  <strong className="text-foreground">{company._count.users}</strong> Usuários
                </div>
                <div>
                  <strong className="text-foreground">{company._count.leads}</strong> Leads
                </div>
              </div>
            </div>

            <Button 
              variant={company.status === 'ACTIVE' ? 'outline' : 'default'} 
              className={company.status === 'ACTIVE' ? 'border-destructive text-destructive hover:bg-destructive hover:text-white' : ''}
              onClick={() => toggleStatusMutation.mutate({ 
                id: company.id, 
                status: company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' 
              })}
              disabled={toggleStatusMutation.isPending}
            >
              {company.status === 'ACTIVE' ? (
                <><PowerOff className="w-4 h-4 mr-2" /> Suspender Acesso</>
              ) : (
                <><Power className="w-4 h-4 mr-2" /> Reativar Acesso</>
              )}
            </Button>
          </div>
        ))}
        {filteredCompanies.length === 0 && !isLoading && (
          <p className="text-muted-foreground col-span-full">Nenhuma empresa encontrada.</p>
        )}
      </div>
    </div>
  );
}
