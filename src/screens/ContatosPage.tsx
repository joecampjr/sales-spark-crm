import { useState, useEffect } from 'react';
import { 
  Search, Phone, MessageSquare, Mail, UserPlus, Filter, MoreHorizontal, 
  Calendar, Trash2, Pencil, RotateCcw, AlertCircle, Plus, Check,
  History, ClipboardList, MapPin, RefreshCw, User, Clock, Building2
} from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function ContatosPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ativos' | 'finalizados'>('ativos');
  
  // Modals state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // States for automatic status mapping in update form
  const [formResult, setFormResult] = useState('Interessado');
  const [formStatus, setFormStatus] = useState('em_negociacao');
  const [formPaymentMode, setFormPaymentMode] = useState('a_vista');
  const [formProductType, setFormProductType] = useState('');

  // Filters state
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterProductType, setFilterProductType] = useState('todos');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, filterName, filterPhone, filterStatus, filterProductType]);

  // Queries
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Falha ao carregar leads');
      return res.json();
    }
  });

  const { data: historyInteractions = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['interactions', selectedLeadForHistory?.id],
    queryFn: async () => {
      if (!selectedLeadForHistory?.id) return [];
      const res = await fetch(`/api/interactions?leadId=${selectedLeadForHistory.id}`);
      if (!res.ok) throw new Error('Falha ao carregar histórico');
      return res.json();
    },
    enabled: !!selectedLeadForHistory?.id
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

  const showProductType = formResult === 'Aguardando produto chegar' || formResult === 'Não tinha o produto desejado';

  const filteredLeads = displayedLeads.filter((l: any) => {
    // 1. General search
    const matchesSearch = !search || 
      (l.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (l.seller?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (l.phone || '').includes(search.replace(/\D/g, ''));

    // 2. Filter by name
    const matchesName = !filterName || 
      (l.name?.toLowerCase() || '').includes(filterName.toLowerCase());

    // 3. Filter by phone
    const matchesPhone = !filterPhone || 
      (l.phone || '').replace(/\D/g, '').includes(filterPhone.replace(/\D/g, ''));

    // 4. Filter by status
    const matchesStatus = filterStatus === 'todos' || l.status === filterStatus;

    // 5. Filter by product type
    const matchesProductType = filterProductType === 'todos' || 
      l.productType === filterProductType || 
      (filterProductType === 'sem_produto' && !l.productType);

    return matchesSearch && matchesName && matchesPhone && matchesStatus && matchesProductType;
  });

  // Pagination calculation
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage);

  // Mutações
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, estimatedValue, paymentMode, downPayment, saleType, productType }: { leadId: string; status: string; estimatedValue?: number; paymentMode?: string; downPayment?: number; saleType?: string; productType?: string | null }) => {
      const payload: any = { status, estimatedValue, paymentMode, downPayment, saleType };
      if (productType !== undefined) {
        payload.productType = productType;
      }
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    } else if (resultVal === 'Aguardando produto chegar') {
      setFormStatus('aguardando_produto');
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
    setFormProductType(lead.productType || '');
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

    const showProductType = formResult === 'Aguardando produto chegar' || formResult === 'Não tinha o produto desejado';
    const productType = showProductType ? (fd.get('productType') as string) : null;

    try {
      // 1. Cria a nova interação
      await createInteractionMutation.mutateAsync({
        leadId: selectedLead.id,
        sellerId: sellerIdToUse,
        type,
        result: formResult,
        notes: notes || undefined,
        scheduledFor: scheduledFor || undefined,
        productType
      });

      // 2. Atualiza o status do Lead
      await updateLeadStatusMutation.mutateAsync({
        leadId: selectedLead.id,
        status: formStatus,
        estimatedValue,
        paymentMode,
        downPayment,
        saleType,
        productType: showProductType ? productType : undefined
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

  const getContactMethodLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'ligacao':
      case 'ligação':
        return 'Ligação';
      case 'whatsapp':
        return 'WhatsApp';
      case 'email':
      case 'e-mail':
        return 'E-mail';
      case 'visita':
        return 'Visita externa';
      case 'loja_fisica':
      case 'loja física':
        return 'Loja Física';
      case 'sistema':
        return 'Reativado';
      default:
        return type;
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'ligacao': return <Phone className="w-3.5 h-3.5 text-blue-500 animate-pulse" />;
      case 'whatsapp': return <MessageSquare className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />;
      case 'email': return <Mail className="w-3.5 h-3.5 text-amber-500 animate-pulse" />;
      case 'visita': return <MapPin className="w-3.5 h-3.5 text-amber-500 animate-pulse" />;
      case 'loja_fisica': return <Building2 className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />;
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

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card border border-border/40 p-4 rounded-xl shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Nome do Cliente</Label>
          <Input
            placeholder="Filtrar por nome"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Telefone</Label>
          <Input
            placeholder="Filtrar por telefone"
            value={filterPhone}
            onChange={(e) => setFilterPhone(e.target.value)}
            className="bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="todos">Todos os Status</option>
            <option value="aguardando_produto">Aguardando Produto Chegar</option>
            <option value="contato_nao_atualizado">Contato Não Atualizado</option>
            <option value="contato_realizado">Contato Realizado</option>
            <option value="em_negociacao">Em Negociação</option>
            <option value="novo">Novo</option>
            <option value="perdido">Perdido</option>
            <option value="vendido">Vendido</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Tipo de Produto</Label>
          <select
            value={filterProductType}
            onChange={(e) => setFilterProductType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="todos">Todos os Produtos</option>
            <option value="sem_produto">Sem Produto Especificado</option>
            <option value="acessórios">Acessórios</option>
            <option value="antena">Antena</option>
            <option value="armário">Armário</option>
            <option value="buffet">Buffet</option>
            <option value="cabeceira">Cabeceira</option>
            <option value="cadeira">Cadeira</option>
            <option value="cama">Cama</option>
            <option value="colchão">Colchão</option>
            <option value="eletrodoméstico">Eletrodoméstico</option>
            <option value="estofado">Estofado</option>
            <option value="guarda roupas">Guarda Roupas</option>
            <option value="home">Home</option>
            <option value="mesa">Mesa</option>
            <option value="outros">Outros</option>
            <option value="painel">Painel</option>
          </select>
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
              ) : paginatedLeads.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum lead encontrado nesta aba.</td></tr>
              ) : paginatedLeads.map((lead: any) => {
                const lastInteraction = lead.interactions?.[0];
                
                return (
                  <tr 
                    key={lead.id} 
                    className="table-row-hover cursor-pointer"
                    onClick={() => {
                      setSelectedLeadForHistory(lead);
                      setIsHistoryOpen(true);
                    }}
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{lead.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">{lead.phone}</span>
                          {lead.phone && (
                            <a 
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '').startsWith('55') || lead.phone.replace(/\D/g, '').length > 11 ? lead.phone.replace(/\D/g, '') : `55${lead.phone.replace(/\D/g, '')}`}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#25D366] hover:text-[#20ba5a] transition-colors p-0.5"
                              onClick={(e) => e.stopPropagation()}
                              title="Chamar no WhatsApp"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.birthday && (
                            <span className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1 leading-none" title="Aniversário do cliente">
                              🎂 {lead.birthday}
                            </span>
                          )}
                          {lead.avgDelayDays !== null && lead.avgDelayDays !== undefined && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 leading-none" title="Média de dias de atraso">
                              ⏱️ {lead.avgDelayDays}d atraso
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted/60">
                          {getIcon(lastInteraction?.type || 'novo')}
                        </div>
                        <span className="text-xs font-medium">
                          {lastInteraction ? getContactMethodLabel(lastInteraction.type) : 'Nenhum'}
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
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 border-border/50 text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadForHistory(lead);
                            setIsHistoryOpen(true);
                          }}
                          title="Ver Histórico"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        {activeTab === 'ativos' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs font-semibold hover:bg-muted border-border/50 text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenUpdateModal(lead);
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1.5" /> Atualizar
                          </Button>
                        ) : (
                          ['vendido', 'perdido'].includes(lead.status) && (
                            <Button 
                              size="sm" 
                              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReativarLead(lead);
                              }}
                            >
                              <RotateCcw className="w-3 h-3 mr-1.5" /> Reativar
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/50 bg-card/50">
          <p className="text-xs text-muted-foreground">
            Mostrando <span className="font-semibold text-foreground">{filteredLeads.length === 0 ? 0 : startIndex + 1}</span> a{' '}
            <span className="font-semibold text-foreground">
              {Math.min(startIndex + itemsPerPage, filteredLeads.length)}
            </span>{' '}
            de <span className="font-semibold text-foreground">{filteredLeads.length}</span> contatos
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNumber = idx + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNumber = currentPage + idx - 2;
                    if (currentPage + 2 > totalPages) {
                      pageNumber = totalPages - 4 + idx;
                    }
                  }
                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={currentPage === pageNumber ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs ${currentPage === pageNumber ? 'gradient-primary text-primary-foreground font-semibold' : ''}`}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próximo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Update Result Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                    <option value="email">E-mail</option>
                    <option value="ligacao">Ligação</option>
                    <option value="loja_fisica">Loja Física</option>
                    <option value="visita">Visita externa</option>
                    <option value="whatsapp">WhatsApp</option>
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
                    <option value="Aguardando produto chegar">Aguardando produto chegar</option>
                    <option value="Agendou visita">Agendou visita</option>
                    <option value="Comprou do concorrente">Comprou do concorrente</option>
                    <option value="Contato não atualizado">Contato não atualizado</option>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Interessado">Interessado</option>
                    <option value="Muito caro">Muito caro</option>
                    <option value="Não atendeu">Não atendeu</option>
                    <option value="Não gostou da qualidade">Não gostou da qualidade</option>
                    <option value="Não respondeu">Não respondeu</option>
                    <option value="Não tinha o produto desejado">Não tinha o produto desejado</option>
                    <option value="Outros">Outros</option>
                    <option value="Solicitou orçamento">Solicitou orçamento</option>
                    <option value="Vendido / Sucesso">Vendido / Sucesso</option>
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
                    <option value="aguardando_produto">Aguardando Produto Chegar (Não ocupa limite)</option>
                    <option value="contato_nao_atualizado">Contato Não Atualizado (Fecha espaço limite)</option>
                    <option value="contato_realizado">Contato Realizado</option>
                    <option value="em_negociacao">Em Negociação</option>
                    <option value="novo">Novo</option>
                    <option value="perdido">Perdido (Fecha espaço limite)</option>
                    <option value="vendido">Vendido (Fecha espaço limite)</option>
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

                {showProductType && (
                  <div className="space-y-2 col-span-2 animate-fade-in">
                    <Label htmlFor="productType" className="font-semibold text-sm">
                      Tipo de Produto desejado <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="productType"
                      name="productType"
                      value={formProductType}
                      onChange={(e) => setFormProductType(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecione o tipo de produto...</option>
                      <option value="acessórios">Acessórios</option>
                      <option value="antena">Antena</option>
                      <option value="armário">Armário</option>
                      <option value="buffet">Buffet</option>
                      <option value="cabeceira">Cabeceira</option>
                      <option value="cadeira">Cadeira</option>
                      <option value="cama">Cama</option>
                      <option value="colchão">Colchão</option>
                      <option value="eletrodoméstico">Eletrodoméstico</option>
                      <option value="estofado">Estofado</option>
                      <option value="guarda roupas">Guarda Roupas</option>
                      <option value="home">Home</option>
                      <option value="mesa">Mesa</option>
                      <option value="outros">Outros</option>
                      <option value="painel">Painel</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes" className="font-semibold text-sm">
                    Relato do Contato / Observações {showProductType && <span className="text-destructive">*</span>}
                  </Label>
                  <Input 
                    id="notes"
                    name="notes" 
                    placeholder={showProductType ? "Descreva os detalhes (Obrigatório)..." : "Ex: Cliente gostou dos preços e quer que ligue na próxima segunda-feira às 10h..."} 
                    required={showProductType}
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

      {/* Historico Sheet */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="sm:max-w-[500px] flex flex-col h-full bg-card border-l border-border animate-slide-in">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Histórico do Cliente
            </SheetTitle>
            {selectedLeadForHistory && (
              <div className="mt-2 text-left">
                <h3 className="font-semibold text-lg text-foreground leading-tight">{selectedLeadForHistory.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedLeadForHistory.phone}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={selectedLeadForHistory.status} />
                  {selectedLeadForHistory.city && (
                    <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      📍 {selectedLeadForHistory.city}/{selectedLeadForHistory.state}
                    </span>
                  )}
                </div>
                {(selectedLeadForHistory.route || selectedLeadForHistory.lastPurchaseDate) && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50 text-xs">
                    {selectedLeadForHistory.route && (
                      <div>
                        <span className="font-semibold text-muted-foreground">Rota: </span>
                        <span className="text-foreground font-medium">{selectedLeadForHistory.route}</span>
                      </div>
                    )}
                    {selectedLeadForHistory.lastPurchaseDate && (
                      <div>
                        <span className="font-semibold text-muted-foreground">Última compra: </span>
                        <span className="text-foreground font-medium">
                          {new Date(selectedLeadForHistory.lastPurchaseDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4 pr-3">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                <Clock className="w-8 h-8 animate-spin text-primary/40" />
                <p className="text-sm">Carregando histórico...</p>
              </div>
            ) : historyInteractions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
                <Clock className="w-10 h-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Sem interações</p>
                  <p className="text-xs max-w-xs mt-1">Este cliente ainda não possui nenhuma ação ou contato registrado no sistema.</p>
                </div>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                {historyInteractions.map((item: any) => {
                  const getHistoryIcon = (type: string) => {
                    switch (type.toLowerCase()) {
                      case 'ligação':
                      case 'ligacao':
                        return <Phone className="w-3.5 h-3.5 text-blue-500" />;
                      case 'whatsapp':
                        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
                      case 'visita':
                        return <MapPin className="w-3.5 h-3.5 text-amber-500" />;
                      case 'loja_fisica':
                      case 'loja física':
                        return <Building2 className="w-3.5 h-3.5 text-indigo-500" />;
                      case 'sistema':
                      case 'reativação':
                      case 'reativacao':
                        return <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />;
                      default:
                        return <User className="w-3.5 h-3.5 text-muted-foreground" />;
                    }
                  };

                  const getResultBadge = (result: string) => {
                    const r = result.toLowerCase();
                    if (r.includes('vendido') || r.includes('sucesso') || r.includes('comprou')) {
                      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] hover:bg-emerald-500/15">Vendido</Badge>;
                    }
                    if (r.includes('caro') || r.includes('perdido') || r.includes('sem interesse') || r.includes('recusada') || r.includes('cancelado')) {
                      return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] hover:bg-destructive/15">{result}</Badge>;
                    }
                    if (r.includes('agend') || r.includes('interessa')) {
                      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] hover:bg-blue-500/15">{result}</Badge>;
                    }
                    if (r.includes('aguardando') || r.includes('produto')) {
                      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] hover:bg-amber-500/15">{result}</Badge>;
                    }
                    return <Badge variant="outline" className="text-muted-foreground text-[10px]">{result}</Badge>;
                  };

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[23px] top-1.5 w-6 h-6 rounded-full bg-card border-2 border-border/80 flex items-center justify-center shadow-sm group-hover:border-primary/50 transition-colors z-10">
                        {getHistoryIcon(item.type)}
                      </div>

                      <div className="bg-muted/30 hover:bg-muted/50 border border-border/40 hover:border-border/80 p-4 rounded-xl space-y-2.5 transition-all shadow-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              {getContactMethodLabel(item.type)} {getResultBadge(item.result)}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="w-2.5 h-2.5" /> Registrado por {item.seller?.name || 'Sistema'}
                            </span>
                          </div>
                          <span className="text-[9px] font-medium text-muted-foreground shrink-0 bg-muted/60 px-1.5 py-0.5 rounded border border-border/20">
                            {new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        {item.notes && (
                          <div className="text-xs text-muted-foreground bg-card/60 p-2.5 rounded-lg border border-border/20 leading-relaxed font-normal italic">
                            &ldquo;{item.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
