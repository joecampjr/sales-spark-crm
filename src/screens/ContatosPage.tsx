import { useState } from 'react';
import { Search, Phone, MessageSquare, Mail, UserPlus, Filter, MoreHorizontal, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Mock de interações (Contatos) já que ainda não temos API específica
const mockContatos = [
  { id: '1', leadName: 'João Pereira', vendedor: 'Maria Santos', tipo: 'ligacao', resultado: 'Interessado', data: '2024-03-20T14:30:00Z', obs: 'Solicitou proposta por e-mail.' },
  { id: '2', leadName: 'Ana Costa', vendedor: 'Pedro Lima', tipo: 'whatsapp', resultado: 'Em negociação', data: '2024-03-20T11:15:00Z', obs: 'Enviou catálogo de produtos.' },
  { id: '3', leadName: 'Roberto Alves', vendedor: 'Lucas Oliveira', tipo: 'email', resultado: 'Sem resposta', data: '2024-03-19T16:45:00Z', obs: 'Primeiro contato enviado.' },
  { id: '4', leadName: 'Fernanda Lima', vendedor: 'Maria Santos', tipo: 'ligacao', resultado: 'Visita agendada', data: '2024-03-19T09:00:00Z', obs: 'Agendado para próxima terça.' },
  { id: '5', leadName: 'Marcelo Souza', vendedor: 'Pedro Lima', tipo: 'whatsapp', resultado: 'Venda fechada', data: '2024-03-18T15:20:00Z', obs: 'Contrato assinado via Zap.' },
];

const getIcon = (tipo: string) => {
  switch (tipo) {
    case 'ligacao': return <Phone className="w-4 h-4 text-blue-500" />;
    case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-500" />;
    case 'email': return <Mail className="w-4 h-4 text-orange-500" />;
    default: return <UserPlus className="w-4 h-4 text-gray-500" />;
  }
};

export default function ContatosPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Contatos</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe as últimas interações com seus leads</p>
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground">
          <Calendar className="w-3.5 h-3.5 mr-1.5" /> Agendar Retorno
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead ou vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-10 text-sm"
          />
        </div>
        <Button variant="outline" className="h-10">
          <Filter className="w-4 h-4 mr-2" /> Filtros Avançados
        </Button>
      </div>

      {/* Contacts List/Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedor</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data/Hora</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</th>
                <th className="w-10 py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {mockContatos.map((contato) => (
                <tr key={contato.id} className="table-row-hover">
                  <td className="py-4 px-6">
                    <p className="text-sm font-semibold text-foreground">{contato.leadName}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted/50">
                        {getIcon(contato.tipo)}
                      </div>
                      <span className="text-xs capitalize text-muted-foreground">{contato.tipo}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{contato.vendedor.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-foreground">{contato.vendedor}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {contato.resultado}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {new Date(contato.data).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(contato.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 max-w-xs">
                    <p className="text-xs text-muted-foreground truncate" title={contato.obs}>
                      {contato.obs}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar Registro</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
