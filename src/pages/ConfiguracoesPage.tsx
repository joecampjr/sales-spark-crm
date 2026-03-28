import { Settings, Bell, Shield, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações Comerciais</h1>
        <p className="text-muted-foreground text-sm mt-1">Defina as regras da operação</p>
      </div>

      <div className="space-y-4">
        {/* Meta de contatos */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Metas e Cadência</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Contatos mínimos/dia</label>
              <Input defaultValue="10" type="number" className="bg-muted/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Horas limite 1º contato</label>
              <Input defaultValue="4" type="number" className="bg-muted/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Dias alerta sem atualização</label>
              <Input defaultValue="5" type="number" className="bg-muted/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Dias alerta sem avanço</label>
              <Input defaultValue="7" type="number" className="bg-muted/50 h-9 text-sm" />
            </div>
          </div>
        </div>

        {/* Distribuição */}
        <div className="bg-card border border-border/50 rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-success" />
            </div>
            <h3 className="font-semibold text-foreground">Distribuição e Regras</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Distribuição automática ativa', defaultChecked: true },
              { label: 'Redistribuição automática ativa', defaultChecked: false },
              { label: 'Obrigar motivo de perda', defaultChecked: true },
              { label: 'Obrigar motivo de ganho', defaultChecked: false },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0 cursor-pointer">
                <span className="text-sm text-foreground">{item.label}</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${item.defaultChecked ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform ${item.defaultChecked ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button className="gradient-primary text-primary-foreground">Salvar Configurações</Button>
      </div>
    </div>
  );
}
