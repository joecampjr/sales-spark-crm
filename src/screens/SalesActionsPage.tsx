import { useState } from 'react';
import { Search, Zap, MapPin, Calendar, Users, Target, FileText, CheckCircle2, XCircle, Clock, MoreHorizontal, ShieldCheck, ShieldAlert, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
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
import { Badge } from '@/components/ui/badge';

export default function SalesActionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Permissions
  const canCreate = user?.role === 'ADMIN' || user?.role === 'GERENTE';
  const canAuthorize = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  // Queries
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['sales-actions'],
    queryFn: async () => (await fetch('/api/sales-actions')).json()
  });

  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: async () => (await fetch('/api/sellers')).json() });
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: async () => (await fetch('/api/leads')).json() });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/sales-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-actions'] });
      setIsNewModalOpen(false);
      toast.success('Ação de venda enviada para autorização!');
    }
  });

  const authorizeMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'authorize' | 'reject' }) => {
      const res = await fetch(`/api/sales-actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, authorizedById: user?.id })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-actions'] });
      toast.success('Status da ação atualizado!');
    }
  });

  const reportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const res = await fetch(`/api/sales-actions/${selectedAction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_report', ...reportData })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-actions'] });
      setIsReportModalOpen(false);
      toast.success('Relatório enviado com sucesso!');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Pegar múltiplos valores dos selects (simplificado para demo)
    const selectedStaff = Array.from(e.currentTarget.querySelectorAll('input[name="staffIds"]:checked')).map((el: any) => el.value);
    const selectedLeads = Array.from(e.currentTarget.querySelectorAll('input[name="leadIds"]:checked')).map((el: any) => el.value);

    createMutation.mutate({
      title: fd.get('title'),
      region: fd.get('region'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate'),
      salesTarget: Number(fd.get('salesTarget')),
      observations: fd.get('observations'),
      staffCount: selectedStaff.length,
      staffIds: selectedStaff,
      leadIds: selectedLeads,
      createdById: user?.id
    });
  };

  const handleReportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const leadResults = selectedAction.targetLeads.map((tl: any) => ({
      leadId: tl.leadId,
      result: fd.get(`result-${tl.leadId}`),
      feedback: fd.get(`feedback-${tl.leadId}`)
    }));

    reportMutation.mutate({
      reportContent: fd.get('reportContent'),
      reportResult: fd.get('reportResult'),
      leadResults
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aguardando_autorizacao': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1"><ShieldAlert className="w-3 h-3" /> Aguardando Autorização</Badge>;
      case 'autorizada': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1"><ShieldCheck className="w-3 h-3" /> Autorizada</Badge>;
      case 'concluida': return <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle2 className="w-3 h-3" /> Concluída</Badge>;
      case 'recusada': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><XCircle className="w-3 h-3" /> Recusada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isWithin48h = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = now.getTime() - end.getTime();
    return diff > 0 && diff < (48 * 60 * 60 * 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ações de Venda</h1>
          <p className="text-muted-foreground text-sm mt-1">Planejamento e relatórios de operações em campo</p>
        </div>
        {canCreate && (
          <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Ação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Planejar Nova Ação de Venda</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Título da Ação</Label>
                    <Input name="title" required placeholder="Ex: Operação Bairro Centro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Região/Cidade</Label>
                    <Input name="region" required placeholder="Bairro ou Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta de Vendas (R$)</Label>
                    <Input name="salesTarget" type="number" required placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input name="startDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input name="endDate" type="date" required />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold">Equipe (Vendedores)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1 border rounded-md p-3 max-h-[120px] overflow-y-auto">
                      {Array.isArray(sellers) ? sellers.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <input type="checkbox" name="staffIds" value={s.id} id={`s-${s.id}`} className="w-4 h-4" />
                          <label htmlFor={`s-${s.id}`} className="text-xs truncate">{s.name}</label>
                        </div>
                      )) : <p className="text-xs text-muted-foreground">Nenhum vendedor encontrado</p>}
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold">Leads Alvo</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1 border rounded-md p-3 max-h-[120px] overflow-y-auto">
                      {Array.isArray(leads) ? leads.map((l: any) => (
                        <div key={l.id} className="flex items-center gap-2">
                          <input type="checkbox" name="leadIds" value={l.id} id={`l-${l.id}`} className="w-4 h-4" />
                          <label htmlFor={`l-${l.id}`} className="text-xs truncate">{l.name}</label>
                        </div>
                      )) : <p className="text-xs text-muted-foreground">Nenhum lead encontrado</p>}
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Observações e Intenção</Label>
                    <Textarea name="observations" placeholder="Descreva a estratégia da ação..." />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Enviando...' : 'Enviar para Autorização'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Actions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground italic">
          Carregando ações de venda...
        </div>
      ) : !Array.isArray(actions) || actions.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground italic">
          Nenhuma ação de venda registrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {actions.map((action: any) => (
          <div key={action.id} className="bg-card border border-border/50 rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-foreground text-lg leading-tight">{action.title}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                  <MapPin className="w-3 h-3" /> {action.region}
                </div>
              </div>
              {getStatusBadge(action.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/30">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Período</p>
                <p className="text-xs font-medium">{new Date(action.startDate).toLocaleDateString()} - {new Date(action.endDate).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Meta</p>
                <p className="text-xs font-bold text-primary">R$ {action.salesTarget.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Equipe</p>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{action.staffCount} pessoas</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Leads</p>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{action.targetLeads?.length || 0} alvos</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                {canAuthorize && action.status === 'aguardando_autorizacao' && (
                  <>
                    <Button 
                      size="sm" 
                      className="h-8 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => authorizeMutation.mutate({ id: action.id, action: 'authorize' })}
                    >
                      Autorizar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-[10px] border-destructive text-destructive"
                      onClick={() => authorizeMutation.mutate({ id: action.id, action: 'reject' })}
                    >
                      Recusar
                    </Button>
                  </>
                )}

                {action.status === 'autorizada' && isWithin48h(action.endDate) && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 text-[10px] border-primary text-primary"
                    onClick={() => { setSelectedAction(action); setIsReportModalOpen(true); }}
                  >
                    <FileText className="w-3 h-3 mr-1.5" /> Preencher Relatório
                  </Button>
                )}
                
                {action.status === 'concluida' && (
                  <Badge className="bg-success/20 text-success border-0 text-[10px]">Relatório Enviado</Badge>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                  {canCreate && action.status === 'aguardando_autorizacao' && <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Relatório Final da Ação: {selectedAction?.title}</DialogTitle></DialogHeader>
          {selectedAction && (
            <form onSubmit={handleReportSubmit} className="space-y-6 mt-4">
              <div className="space-y-4 border-b pb-6">
                <div className="space-y-2">
                  <Label>Resumo Geral do Resultado</Label>
                  <select name="reportResult" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="Sucesso">Sucesso - Meta Atingida</option>
                    <option value="Parcial">Parcial - Meta não atingida</option>
                    <option value="Fracasso">Fracasso - Resultados insatisfatórios</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Ocorrências e Detalhes da Ação</Label>
                  <Textarea name="reportContent" required placeholder="Como foi o dia? Tiveram imprevistos? Qual a percepção do bairro?" rows={4} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Resultados por Lead Alvo</h4>
                <div className="space-y-4">
                  {selectedAction.targetLeads.map((tl: any) => (
                    <div key={tl.id} className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold">{tl.lead?.name}</p>
                        <select name={`result-${tl.leadId}`} required className="h-8 text-xs rounded-md border px-2">
                          <option value="Vendido">Vendido</option>
                          <option value="Interessado">Interessado</option>
                          <option value="Sem Interesse">Sem Interesse</option>
                          <option value="Ninguém no Local">Ninguém no Local</option>
                        </select>
                      </div>
                      <Input name={`feedback-${tl.leadId}`} placeholder="Feedback específico deste lead..." className="text-xs h-8" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={reportMutation.isPending} className="gradient-primary">
                  <Send className="w-4 h-4 mr-2" /> {reportMutation.isPending ? 'Enviando...' : 'Finalizar e Enviar Relatório'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
