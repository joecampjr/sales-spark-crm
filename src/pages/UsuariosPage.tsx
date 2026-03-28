import { mockVendedores } from '@/data/mockData';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UsuariosPage() {
  const mockUsers = [
    { id: '1', nome: 'Carlos Silva', email: 'carlos@empresa.com', perfil: 'Admin', filial: 'São Paulo Centro', ativo: true, ultimoAcesso: '2024-03-15' },
    { id: '2', nome: 'Maria Santos', email: 'maria@empresa.com', perfil: 'Vendedor', filial: 'São Paulo Centro', ativo: true, ultimoAcesso: '2024-03-16' },
    { id: '3', nome: 'Pedro Lima', email: 'pedro@empresa.com', perfil: 'Vendedor', filial: 'Rio Centro', ativo: true, ultimoAcesso: '2024-03-16' },
    { id: '4', nome: 'Ana Souza', email: 'ana@empresa.com', perfil: 'Supervisor', filial: 'BH Savassi', ativo: true, ultimoAcesso: '2024-03-14' },
    { id: '5', nome: 'Lucas Oliveira', email: 'lucas@empresa.com', perfil: 'Vendedor', filial: 'BH Savassi', ativo: false, ultimoAcesso: '2024-03-10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">{mockUsers.length} usuários cadastrados</p>
        </div>
        <Button size="sm" className="text-xs gradient-primary text-primary-foreground">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              {['Usuário', 'Perfil', 'Filial', 'Status', 'Último Acesso'].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id} className="table-row-hover border-b border-border/30 last:border-0">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-foreground">{user.nome.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.nome}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{user.perfil}</span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{user.filial}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {user.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{user.ultimoAcesso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
