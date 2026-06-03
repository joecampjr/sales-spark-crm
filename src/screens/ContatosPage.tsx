import { useState } from 'react';
import { Search, Phone, MessageSquare, Mail, UserPlus, Filter, MoreHorizontal, Calendar, Trash2, Pencil, RotateCcw, AlertCircle, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { LEAD_STATUS_LABELS, LeadStatus } from '@/types/crm';
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

export default function ContatosPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ativos' | 'finalizados'>('ativos');
  
  // Modals state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // States for automatic status mapping in update form
  const [formResult, setFormResult] = useState('Interessado');
  const [formStatus, setFormStatus] = useState('em_negociacao');
  const [formPaymentMode, setFormPaymentMode] = useState('a_vista');

  // Queries
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Falha ao carregar leads');
      return res.json();
    }
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const res = await fetch('/api/sellers');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: mySeller = null } = useQuery({
    queryKey: ['mySeller', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/sellers/me');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user
  });

  const isVendedor = user?.role === 'VENDEDOR';
  const userSeller = mySeller;

  // Filtra apenas leads atribuídos (com algum vendedor responsável)
  // Como a própria API de Leads já filtra por filial e visibilidade correta, apenas filtramos por sellerId !== null
  const assignedLeads = Array.isArray(leads) 
    ? leads.filter((l: any) => l.sellerId !== null)
    : [];

  const activeLeads = assignedLeads.filter((l: any) => 
    !['vendido', 'perdido', 'contato_nao_atualizado'].includes(l.status)
  );

  const finalizedLeads = assignedLeads.filter((l: any) => 
    ['vendido', 'perdido', 'contato_nao_atualizado'].includes(l.status)
  );

  const displayedLeads = activeTab === 'ativos' ? activeLeads : finalizedLeads;

  const filteredLeads = displayedLeads.filter((l: any) => 
    (l.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (l.seller?.name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  // Mutações
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, estimatedValue, paymentMode, downPayment, saleType }: { leadId: string; status: string; estimatedValue?: number; paymentMode?: string; downPayment?: number; saleType?: string }) => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, estimatedValue, paymentMode, downPayment, saleType })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao atualizar lead');
      }
      return res.json();
    }
  });

  const createInteractionMutation = useMutation({
    mutationFn: async (interactionData: any) => {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interactionData)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao criar interação');
      }
      return res.json();
    }
  });

  // Manipulador de mudança de resultado da conversa no modal (auto-seleção inteligente de status)
  const handleResultChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const resultVal = e.target.value;
    setFormResult(resultVal);

    // Mapeamento Inteligente
    if (resultVal === 'Vendido / Sucesso') {
      setFormStatus('vendido');
    } else if (['Muito caro', 'Não gostou da qualidade', 'Não tinha o produto desejado', 'Comprou do concorrente', 'Não respondeu', 'Não atendeu'].includes(resultVal)) {
      setFormStatus('perdido');
    } else if (resultVal === 'Contato não atualizado') {
      setFormStatus('contato_nao_atualizado');
    } else {
      setFormStatus('em_negociacao');
    }
  };

  const handleOpenUpdateModal = (lead: any) => {
    setSelectedLead(lead);
    
    // Inicializa valores padrão
    const lastInteraction = lead.interactions?.[0];
    const initialResult = lastInteraction?.result || 'Interessado';
    setFormResult(initialResult);
    setFormStatus(lead.status || 'em_negociacao');
    setFormPaymentMode(lead.paymentMode || 'a_vista');
    setIsUpdateModalOpen(true);
  };

  const handleUpdateResultSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLead) return;

    const fd = new FormData(e.currentTarget);
    const sellerIdToUse = selectedLead.sellerId || (isVendedor && userSeller ? userSeller.id : null);
    
    if (!sellerIdToUse) {
      toast.error('Vendedor responsável não encontrado para este lead.');
      return;
    }

    const notes = fd.get('notes') as string;
    const scheduledFor = fd.get('scheduledFor') as string;
    const type = fd.get('type') as string;
    const estimatedValueInput = fd.get('estimatedValue');
    const estimatedValue = estimatedValueInput ? Number(estimatedValueInput) : undefined;
    const paymentMode = fd.get('paymentMode') as string || undefined;
    const downPaymentInput = fd.get('downPayment');
    const downPayment = downPaymentInput !== null && downPaymentInput !== undefined && downPaymentInput !== '' ? Number(downPaymentInput) : undefined;
    const saleType = fd.get('saleType') as string || undefined;

    try {
      // 1. Cria a nova interação
      await createInteractionMutation.mutateAsync({
        leadId: selectedLead.id,
        sellerId: sellerIdToUse,
        type,
        result: formResult,
        notes: notes || undefined,
        scheduledFor: scheduledFor || undefined
      });

      // 2. Atualiza o status do Lead
      await updateLeadStatusMutation.mutateAsync({
        leadId: selectedLead.id,
        status: formStatus,
        estimatedValue,
        paymentMode,
        downPayment,
        saleType
      });

      // 3. Atualiza queries e notifica
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsUpdateModalOpen(false);
      toast.success('Resultado do contato atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar a atualização do contato.');
    }
  };

  // Reativação do Lead
  const handleReativarLead = async (lead: any) => {
    const sellerIdToUse = lead.sellerId || (isVendedor && userSeller ? userSeller.id : null);
    
    if (!sellerIdToUse) {
      toast.error('Nenhum vendedor associado a este lead.');
      return;
    }

    try {
      // 1. Cria interação do sistema registrando a reativação sem perder dados
      await createInteractionMutation.mutateAsync({
        leadId: lead.id,
        sellerId: sellerIdToUse,
        type: 'sistema',
        result: 'Reativado',
        notes: 'Lead reativado pelo vendedor para nova tentativa de venda.',
        scheduledFor: null
      });

      // 2. Muda o status do lead na base de dados para em_negociacao
      await updateLeadStatusMutation.mutateAsync({
        leadId: lead.id,
        status: 'em_negociacao'
      });

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead reativado com sucesso para nova tentativa de venda!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao reativar o lead.');
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'ligacao': return <Phone className="w-3.5 h-3.5 text-blue-500 animate-pulse" />;
      case 'whatsapp': return <MessageSquare className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />;
      case 'email': return <Mail className="w-3.5 h-3.5 text-amber-500 animate-pulse" />;
      case 'sistema': return <RotateCcw className="w-3.5 h-3.5 text-slate-500" />;
      default: return <UserPlus className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contatos e Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de interações, resultados de conversa e retornos agendados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 gap-2">
        <button
          onClick={() => setActiveTab('ativos')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 relative -mb-[2px] ${
            activeTab === 'ativos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Contatos Ativos ({activeLeads.length})
        </button>
        <button
          onClick={() => setActiveTab('finalizados')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 relative -mb-[2px] ${
            activeTab === 'finalizados'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Histórico Finalizado ({finalizedLeads.length})
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead ou vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-10 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canal</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedor</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado Atual</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Última Ação</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximo Contato</th>
                <th className="w-24 py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoadingLeads ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando leads vinculados...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum lead encontrado nesta aba.</td></tr>
              ) : filteredLeads.map((lead: any) => {
                const lastInteraction = lead.interactions?.[0];
                
                return (
                  <tr key={lead.id} className="table-row-hover">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted/60">
                          {getIcon(lastInteraction?.type || 'novo')}
                        </div>
                        <span className="text-xs font-medium capitalize">
                          {lastInteraction?.type === 'sistema' ? 'Reativado' : (lastInteraction?.type || 'Nenhum')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground">{lead.seller?.name || '-'}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusBadge status={lead.status} />
                        {['perdido', 'vendido'].includes(lead.status) && lastInteraction?.result && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase leading-none tracking-wider select-none ${
                            lead.status === 'perdido'
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-success/10 text-success border-success/20'
                          }`}>
                            {lastInteraction.result}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-muted-foreground">
                      {lastInteraction 
                        ? new Date(lastInteraction.createdAt).toLocaleString('pt-BR')
                        : new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('pt-BR')
                      }
                    </td>
                    <td className="py-4 px-6">
                      {lastInteraction?.scheduledFor ? (
                        <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full w-fit">
                          <Calendar className="w-3 h-3" />
                          {new Date(lastInteraction.scheduledFor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic font-normal">Não agendado</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {activeTab === 'ativos' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs font-semibold hover:bg-muted border-border/50 text-foreground"
                          onClick={() => handleOpenUpdateModal(lead)}
                        >
                          <Pencil className="w-3 h-3 mr-1.5" /> Atualizar
                        </Button>
                      ) : (
                        ['vendido', 'perdido'].includes(lead.status) && (
                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => handleReativarLead(lead)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1.5" /> Reativar
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Result Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Atualizar Resultado do Contato</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleUpdateResultSubmit} className="space-y-4 mt-4 animate-fade-in">
              <div className="bg-muted/40 p-3 rounded-lg flex items-start gap-2.5 text-sm border border-border/30 mb-2">
                <AlertCircle className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Lead: </span>
                  <span className="text-muted-foreground">{selectedLead.name}</span>
                  <span className="mx-2 text-border">|</span>
                  <span className="font-semibold text-foreground">Status Atual: </span>
                  <span className="text-muted-foreground capitalize">{LEAD_STATUS_LABELS[selectedLead.status as LeadStatus] || selectedLead.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="font-semibold text-sm">Meio de Contato</Label>
                  <select 
                    id="type"
                    name="type" 
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ligacao">Ligação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="visita">Visita</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="result" className="font-semibold text-sm">Resultado da Conversa</Label>
                  <select 
                    id="result"
                    name="result" 
                    value={formResult}
                    onChange={handleResultChange}
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Interessado">Interessado</option>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Vendido / Sucesso">Vendido / Sucesso</option>
                    <option value="Agendou visita">Agendou visita</option>
                    <option value="Solicitou orçamento">Solicitou orçamento</option>
                    <option value="Muito caro">Muito caro</option>
                    <option value="Não gostou da qualidade">Não gostou da qualidade</option>
                    <option value="Não tinha o produto desejado">Não tinha o produto desejado</option>
                    <option value="Comprou do concorrente">Comprou do concorrente</option>
                    <option value="Não respondeu">Não respondeu</option>
                    <option value="Não atendeu">Não atendeu</option>
                    <option value="Contato não atualizado">Contato não atualizado</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="status" className="font-semibold text-sm">Novo Status do Lead (Salvo no Cadastro)</Label>
                  <select 
                    id="status"
                    name="status" 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    required 
                    className="flex h-10 w-full rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_negociacao">Em Negociação</option>
                    <option value="contato_realizado">Contato Realizado</option>
                    <option value="vendido">Vendido (Fecha espaço limite)</option>
                    <option value="perdido">Perdido (Fecha espaço limite)</option>
                    <option value="contato_nao_atualizado">Contato Não Atualizado (Fecha espaço limite)</option>
                  </select>
                </div>

                {formStatus === 'vendido' && (
                  <>
                    <div className="space-y-2 col-span-2 animate-fade-in">
                      <Label htmlFor="estimatedValue" className="font-semibold text-sm">Valor da Venda (R$) <span className="text-destructive">*</span></Label>
                      <Input 
                        id="estimatedValue"
                        name="estimatedValue" 
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="Ex: 1500.50"
                        className="bg-background border-primary/40 focus:border-primary font-medium"
                        defaultValue={selectedLead.estimatedValue || ''}
                      />
                    </div>

                    <div className="space-y-2 col-span-1 animate-fade-in">
                      <Label htmlFor="paymentMode" className="font-semibold text-sm">Modo de Pagamento <span className="text-destructive">*</span></Label>
                      <select 
                        id="paymentMode"
                        name="paymentMode" 
                        value={formPaymentMode}
                        onChange={(e) => setFormPaymentMode(e.target.value)}
                        required 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="a_vista">À vista</option>
                        <option value="carne">Carnê</option>
                        <option value="cartao">Cartão</option>
                        <option value="pix">Pix</option>
                      </select>
                    </div>

                    <div className="space-y-2 col-span-1 animate-fade-in">
                      <Label htmlFor="saleType" className="font-semibold text-sm">Tipo de Venda <span className="text-destructive">*</span></Label>
                      <select 
                        id="saleType"
                        name="saleType" 
                        required 
                        defaultValue={selectedLead.saleType || 'interna'}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="interna">Interna</option>
                        <option value="externa">Externa</option>
                      </select>
                    </div>

                    {formPaymentMode === 'carne' && (
                      <div className="space-y-2 col-span-2 animate-fade-in">
                        <Label htmlFor="downPayment" className="font-semibold text-sm">Valor da Entrada (R$) <span className="text-destructive">*</span></Label>
                        <Input 
                          id="downPayment"
                          name="downPayment" 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="Ex: 500.00 (Digite 0 se não houver)"
                          className="bg-background border-primary/40 focus:border-primary font-medium"
                          defaultValue={selectedLead.downPayment || 0}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="scheduledFor" className="font-semibold text-sm">Agendar Retorno (Próximo Contato - Opcional)</Label>
                  <Input 
                    id="scheduledFor"
                    name="scheduledFor" 
                    type="datetime-local" 
                    className="bg-background" 
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes" className="font-semibold text-sm">Relato do Contato / Observações</Label>
                  <Input 
                    id="notes"
                    name="notes" 
                    placeholder="Ex: Cliente gostou dos preços e quer que ligue na próxima segunda-feira às 10h..." 
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                  disabled={createInteractionMutation.isPending || updateLeadStatusMutation.isPending}
                >
                  {createInteractionMutation.isPending ? 'Salvando...' : 'Confirmar e Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
