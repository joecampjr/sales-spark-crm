import { mockVendedores } from '@/data/mockData';
import { Trophy, TrendingUp, Target, Phone } from 'lucide-react';

export default function RankingPage() {
  const sorted = [...mockVendedores].sort((a, b) => b.vendas - a.vendas);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ranking de Vendedores</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe o desempenho da equipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sorted.map((v, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={v.id} className={`bg-card border rounded-xl p-6 transition-all duration-200 ${i === 0 ? 'border-warning/30 ring-1 ring-warning/20' : 'border-border/50'}`} style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{medals[i] || `#${i + 1}`}</span>
                <div>
                  <h3 className="font-semibold text-foreground">{v.nome}</h3>
                  <p className="text-xs text-muted-foreground">{v.filial}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{v.vendas}</p>
                    <p className="text-[10px] text-muted-foreground">Vendas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{v.taxaConversao}%</p>
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{v.leadsAtivos}</p>
                    <p className="text-[10px] text-muted-foreground">Leads Ativos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-info" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{v.contatosHoje}/{v.metaDiaria}</p>
                    <p className="text-[10px] text-muted-foreground">Contatos Hoje</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Meta mensal</span>
                  <span className="font-medium text-foreground">{((v.vendas / v.metaVendas) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-primary"
                    style={{ width: `${Math.min((v.vendas / v.metaVendas) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
