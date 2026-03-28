import { mockFiliais } from '@/data/mockData';
import { MapPin, Plus, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FiliaisPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filiais</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as filiais da empresa</p>
        </div>
        <Button size="sm" className="text-xs gradient-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Filial
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockFiliais.map((filial) => (
          <div key={filial.id} className="bg-card border border-border/50 rounded-xl p-6 hover:shadow-lg transition-all duration-200" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{filial.nome}</h3>
                <p className="text-xs text-muted-foreground">{filial.cidade}, {filial.estado}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{filial.vendedores}</p>
                  <p className="text-[10px] text-muted-foreground">Vendedores</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{filial.leads}</p>
                  <p className="text-[10px] text-muted-foreground">Leads</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
