import { mockEmpresas } from '@/data/mockData';
import { Building2, Plus, MoreHorizontal, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmpresasPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as empresas da plataforma</p>
        </div>
        <Button size="sm" className="text-xs gradient-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Empresa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockEmpresas.map((empresa) => (
          <div
            key={empresa.id}
            className="bg-card border border-border/50 rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> {empresa.status === 'ativa' ? 'Ativa' : 'Inativa'}
                </span>
                <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground">{empresa.nome_fantasia}</h3>
            <p className="text-xs text-muted-foreground mt-1">{empresa.cnpj}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
              <div>
                <p className="text-lg font-bold text-foreground">{empresa.usuarios}</p>
                <p className="text-[10px] text-muted-foreground">Usuários</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{empresa.leads_mes}</p>
                <p className="text-[10px] text-muted-foreground">Leads/mês</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{empresa.plano}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

