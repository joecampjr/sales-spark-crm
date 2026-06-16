import { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, MoreHorizontal, Download, Upload, Pencil, Trash2,
  History, ClipboardList, Calendar, Phone, MessageSquare, MapPin, 
  RefreshCw, User, Clock, Building2, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { LeadStatus, LEAD_STATUS_LABELS, PRIORITY_LABELS } from '@/types/crm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { maskPhone, maskCpf } from '@/lib/utils';

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function LeadsPage() {
  const { user } = useAuth();
  const isVendedor = user?.role === 'VENDEDOR';
  const isGerente = user?.role === 'GERENTE';
  const canDelete = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const queryClient = useQueryClient();
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterCpf, setFilterCpf] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Bulk selection states
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CPF states
  const [newCpf, setNewCpf] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [newBirthday, setNewBirthday] = useState('');
  const [editBirthday, setEditBirthday] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  const maskBirthday = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
  };

  // Form status tracking states
  const [newStatus, setNewStatus] = useState('novo');
  const [editStatus, setEditStatus] = useState('novo');
  const [newPaymentMode, setNewPaymentMode] = useState('a_vista');
  const [editPaymentMode, setEditPaymentMode] = useState('a_vista');

  const downloadTemplate = () => {
    const headers = [
      'Nome', 'Telefone', 'CPF', 'Cidade', 'Estado', 'Status', 'Prioridade', 'Valor Estimado', 'Origem', 'Vendedor ID', 'Filial ID',
      'Aniversario', 'Media de dias de atraso', 'Rota', 'Data da última compra'
    ];
    const example = [
      'João Silva', '(11) 99999-9999', '12345678909', 'São Paulo', 'SP', 'novo', 'media', '15000', 'Site', '', '',
      '25/12', '', 'Rota Centro', '10/06/2026'
    ];
    const csvContent = "data:text/csv;charset=utf-8,\ufeff" 
      + headers.join(";") + "\n" 
      + example.join(";");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter, filterName, filterPhone, filterCpf, filterBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'todos') params.append('status', statusFilter);
      if (filterName) params.append('filterName', filterName);
      if (filterPhone) params.append('filterPhone', filterPhone);
      if (filterCpf) params.append('filterCpf', filterCpf);
      if (filterBranchId && filterBranchId !== 'todos') params.append('filterBranchId', filterBranchId);
      const res = await fetch(`/api/leads?${params.toString()}`);
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

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branches');
      if (!res.ok) return [];
      return res.json();
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

  const userSeller = mySeller;
  const assignableSellers = isVendedor
    ? (userSeller ? [userSeller] : [])
    : sellers;

  const userBranchId = isVendedor ? mySeller?.branchId : user?.branchId;
  const userBranch = branches.find((b: any) => b.id === userBranchId);
  const userBranchName = userBranch ? userBranch.name : 'Sede / Geral';

  useEffect(() => {
    if (user) {
      if (user.role === 'VENDEDOR' && mySeller) {
        setFilterBranchId(mySeller.branchId || 'sem_filial');
      } else if (user.role === 'GERENTE' && user.branchId) {
        setFilterBranchId(user.branchId || 'sem_filial');
      }
    }
  }, [user, mySeller]);

  const handleVincular = (leadId: string) => {
    if (!userSeller) {
      toast.error('Você não possui um perfil de vendedor associado.');
      return;
    }
    updateMutation.mutate({
      id: leadId,
      sellerId: userSeller.id,
    }, {
      onSuccess: () => {
        toast.success('Lead vinculado a você com sucesso!');
        window.location.href = '/contatos';
      }
    });
  };

  const createMutation = useMutation({
    mutationFn: async (newLead: any) => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao criar lead');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsModalOpen(false);
      toast.success('Lead criado com sucesso!');
    },
    onError: (error: any) => toast.error(error.message || 'Falha ao criar o lead.')
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedLead: any) => {
      const res = await fetch(`/api/leads/${updatedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao atualizar lead');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditModalOpen(false);
      setEditingLead(null);
      toast.success('Lead atualizado com sucesso!');
    },
    onError: (error: any) => toast.error(error.message || 'Falha ao atualizar o lead.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao deletar lead');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
      toast.success('Lead deletado com sucesso!');
    },
    onError: (error: any) => toast.error(error.message || 'Falha ao deletar o lead.')
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na exclusão em lote');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeadIds([]);
      setIsBulkDeleteDialogOpen(false);
      toast.success(data.message || 'Leads excluídos com sucesso!');
    },
    onError: (error: any) => toast.error(error.message || 'Falha ao excluir leads.')
  });

  const importMutation = useMutation({
    mutationFn: async (parsedData: any[]) => {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na importação');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(data.message || 'Leads importados!');
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao importar CSV.')
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processImportData = (rawData: any[]) => {
      const mapped = rawData.map((row: any) => {
        const getValue = (keys: string[]) => {
          const foundKey = Object.keys(row).find(k => {
            const cleanKey = k.replace(/^\ufeff/, '').toLowerCase().trim();
            return keys.map(x => x.toLowerCase().trim()).includes(cleanKey);
          });
          return foundKey ? String(row[foundKey]).trim() : '';
        };
        
        return {
          name: getValue(['Nome', 'name', 'nome', 'cliente', 'nome completo', 'nome_completo', 'nome do cliente']) || 'Sem Nome',
          phone: getValue(['Telefone', 'phone', 'telefone', 'celular', 'whatsapp', 'contato', 'tel']),
          city: getValue(['Cidade', 'city', 'cidade', 'municipio', 'localidade']),
          state: getValue(['Estado', 'state', 'estado', 'uf']),
          status: getValue(['Status', 'status']) || 'novo',
          priority: getValue(['Prioridade', 'priority', 'prioridade']) || 'media',
          estimatedValue: parseFloat(getValue(['Valor Estimado', 'estimatedValue', 'valor_estimado', 'valor', 'preco', 'preço', 'estimativa'])) || 0,
          source: getValue(['Origem', 'source', 'origem', 'canal', 'meio']) || 'CSV Import',
          cpf: getValue(['CPF', 'cpf', 'cnpj', 'cpf_cnpj', 'documento']),
          sellerId: getValue(['Vendedor ID', 'sellerId', 'vendedor_id', 'vendedor', 'responsavel']) || null,
          branchId: getValue(['Filial ID', 'branchId', 'filial_id', 'filial', 'unidade']) || null,
          paymentMode: getValue(['Modo de Pagamento', 'paymentMode', 'modo_pagamento']) || null,
          downPayment: getValue(['Valor da Entrada', 'downPayment', 'valor_entrada', 'entrada']) !== '' ? parseFloat(getValue(['Valor da Entrada', 'downPayment', 'valor_entrada', 'entrada'])) : null,
          saleType: getValue(['Tipo de Venda', 'saleType', 'tipo_venda']) || null,
          birthday: getValue(['Aniversário', 'birthday', 'aniversario', 'nascimento', 'data_nascimento']) || null,
          avgDelayDays: getValue(['Média de dias de atraso', 'avgDelayDays', 'media_atraso', 'dias_atraso']) !== '' ? parseInt(getValue(['Média de dias de atraso', 'avgDelayDays', 'media_atraso', 'dias_atraso'])) : null,
          route: getValue(['Rota', 'route', 'rota']) || null,
          lastPurchaseDate: getValue(['Data da última compra', 'lastPurchaseDate', 'data_ultima_compra', 'data_compra']) || null,
        };
      });

      // Filtra leads que vieram sem telefone
      const validLeads = mapped.filter(lead => lead.phone);

      setIsImportModalOpen(false);

      if (validLeads.length === 0) {
        toast.error('Nenhum lead com telefone válido encontrado no arquivo.');
        return;
      }

      toast(`Deseja importar ${validLeads.length} leads do arquivo selecionado?`, {
        action: {
          label: "Confirmar",
          onClick: () => {
            importMutation.mutate(validLeads);
          }
        },
        cancel: {
          label: "Cancelar",
          onClick: () => {
            toast.dismiss();
          }
        },
        duration: 10000,
      });
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\ufeff/, '').trim(),
      complete: (results) => {
        let data = results.data;
        if (data.length > 0) {
          const firstRow = data[0];
          const keys = Object.keys(firstRow);
          if (keys.length === 1 && keys[0].includes(';')) {
            // Re-parse com delimitador ponto e vírgula explicitamente
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              delimiter: ";",
              transformHeader: (header) => header.replace(/^\ufeff/, '').trim(),
              complete: (newResults) => {
                processImportData(newResults.data);
              }
            });
            return;
          }
        }
        processImportData(data);
      }
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get('name'),
      phone: fd.get('phone'),
      city: fd.get('city'),
      state: fd.get('state'),
      status: fd.get('status'),
      priority: fd.get('priority'),
      estimatedValue: Number(fd.get('estimatedValue')) || 0,
      paymentMode: fd.get('paymentMode') || null,
      downPayment: fd.get('downPayment') !== null && fd.get('downPayment') !== '' ? Number(fd.get('downPayment')) : null,
      saleType: fd.get('saleType') || null,
      source: fd.get('source'),
      cpf: fd.get('cpf') || null,
      branchId: fd.get('branchId') || null,
      sellerId: fd.get('sellerId') || null,
      birthday: fd.get('birthday') || null,
      avgDelayDays: fd.get('avgDelayDays') !== null && fd.get('avgDelayDays') !== '' ? Number(fd.get('avgDelayDays')) : null,
      route: fd.get('route') || null,
      lastPurchaseDate: fd.get('lastPurchaseDate') || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    const fd = new FormData(e.currentTarget);

    if (isVendedor) {
      const status = fd.get('status');
      const payload: any = {
        id: editingLead.id,
        status,
      };
      if (status === 'vendido') {
        payload.estimatedValue = Number(fd.get('estimatedValue')) || 0;
        payload.paymentMode = fd.get('paymentMode') || null;
        payload.downPayment = fd.get('downPayment') !== null && fd.get('downPayment') !== '' ? Number(fd.get('downPayment')) : null;
        payload.saleType = fd.get('saleType') || null;
      }
      updateMutation.mutate(payload);
      return;
    }

    updateMutation.mutate({
      id: editingLead.id,
      name: fd.get('name'),
      phone: fd.get('phone'),
      city: fd.get('city'),
      state: fd.get('state'),
      status: fd.get('status'),
      priority: fd.get('priority'),
      estimatedValue: Number(fd.get('estimatedValue')) || 0,
      paymentMode: fd.get('paymentMode') || null,
      downPayment: fd.get('downPayment') !== null && fd.get('downPayment') !== '' ? Number(fd.get('downPayment')) : null,
      saleType: fd.get('saleType') || null,
      source: fd.get('source'),
      cpf: fd.get('cpf') || null,
      branchId: fd.get('branchId') || null,
      sellerId: fd.get('sellerId') || null,
      birthday: fd.get('birthday') || null,
      avgDelayDays: fd.get('avgDelayDays') !== null && fd.get('avgDelayDays') !== '' ? Number(fd.get('avgDelayDays')) : null,
      route: fd.get('route') || null,
      lastPurchaseDate: fd.get('lastPurchaseDate') || null,
    });
  };

  const handleDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLeads = [...leads].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    let aValue: any = a[sortConfig.key];
    let bValue: any = b[sortConfig.key];

    if (sortConfig.key === 'branch') {
      aValue = a.branch?.name || '';
      bValue = b.branch?.name || '';
    } else if (sortConfig.key === 'seller') {
      aValue = a.seller?.name || '';
      bValue = b.seller?.name || '';
    } else if (sortConfig.key === 'priority') {
      const priorityOrder = { baixa: 1, media: 2, alta: 3, urgente: 4 };
      aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    } else if (sortConfig.key === 'status') {
      aValue = a.status || '';
      bValue = b.status || '';
    }

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortConfig.direction === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    }
  });

  const columns = [
    { label: 'Nome', key: 'name' },
    { label: 'Cidade', key: 'city' },
    { label: 'Filial', key: 'branch' },
    { label: 'Status', key: 'status' },
    { label: 'Prioridade', key: 'priority' },
    { label: 'Vendedor', key: 'seller' },
    { label: 'Valor Est.', key: 'estimatedValue' },
    { label: 'Origem', key: 'source' },
    { label: 'Entrada', key: 'createdAt' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          {!isVendedor && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setIsImportModalOpen(true)} disabled={importMutation.isPending}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> {importMutation.isPending ? 'Importando...' : 'Importar CSV'}
            </Button>
          )}
          {!isVendedor && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open('/api/leads/export', '_blank')}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar
            </Button>
          )}

          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (open) {
              setNewCpf('');
              setNewBirthday('');
              setNewStatus('novo');
              setNewPaymentMode('a_vista');
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs gradient-primary text-primary-foreground">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome <span className="text-destructive">*</span></Label>
                    <Input name="name" required placeholder="Ex: João Pereira" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone <span className="text-destructive">*</span></Label>
                    <Input 
                      name="phone" 
                      required 
                      placeholder="(DD) 99999-9999" 
                      onChange={(e) => e.target.value = maskPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input 
                      name="cpf" 
                      placeholder="000.000.000-00 (Opcional)" 
                      value={newCpf}
                      onChange={(e) => setNewCpf(maskCpf(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade <span className="text-destructive">*</span></Label>
                    <Input name="city" required placeholder="São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF) <span className="text-destructive">*</span></Label>
                    <Input name="state" required placeholder="SP" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select 
                      name="status" 
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="novo">Novo</option>
                      <option value="em_negociacao">Em Negociação</option>
                      <option value="contato_realizado">Contato Realizado</option>
                      <option value="aguardando_produto">Aguardando Produto Chegar</option>
                      <option value="vendido">Vendido</option>
                      <option value="perdido">Perdido</option>
                      <option value="contato_nao_atualizado">Contato Não Atualizado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <select name="priority" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {newStatus === 'vendido' ? (
                        <>Valor da Venda (R$) <span className="text-destructive">*</span></>
                      ) : (
                        'Valor Estimado'
                      )}
                    </Label>
                    <Input 
                      type="number" 
                      name="estimatedValue" 
                      min={newStatus === 'vendido' ? "0.01" : undefined}
                      step="0.01"
                      required={newStatus === 'vendido'}
                      placeholder={newStatus === 'vendido' ? "Ex: 1500.50" : "15000"} 
                    />
                  </div>
                  {newStatus === 'vendido' && (
                    <>
                      <div className="space-y-2">
                        <Label>Modo de Pagamento <span className="text-destructive">*</span></Label>
                        <select 
                          name="paymentMode" 
                          value={newPaymentMode}
                          onChange={(e) => setNewPaymentMode(e.target.value)}
                          required 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="a_vista">À vista</option>
                          <option value="carne">Carnê</option>
                          <option value="cartao">Cartão</option>
                          <option value="pix">Pix</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Venda <span className="text-destructive">*</span></Label>
                        <select 
                          name="saleType" 
                          required 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="interna">Interna</option>
                          <option value="externa">Externa</option>
                        </select>
                      </div>
                      {newPaymentMode === 'carne' && (
                        <div className="space-y-2 col-span-2">
                          <Label>Valor da Entrada (R$) <span className="text-destructive">*</span></Label>
                          <Input 
                            type="number" 
                            name="downPayment" 
                            min="0"
                            step="0.01"
                            required
                            placeholder="Ex: 500.00 (Digite 0 se não houver)" 
                          />
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <select name="source" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="Loja Física">Loja Física</option>
                      <option value="Visita Externa">Visita Externa</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Site">Site</option>
                      <option value="Redes Sociais">Redes Sociais</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendedor Responsável</Label>
                    {isVendedor ? (
                      <>
                        <select disabled className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                          <option value={userSeller?.id}>{userSeller?.name || 'Seu Nome'}</option>
                        </select>
                        <input type="hidden" name="sellerId" value={userSeller?.id || ''} />
                      </>
                    ) : (
                      <select name="sellerId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Nenhum (Sem responsável)</option>
                        {Array.isArray(assignableSellers) && assignableSellers.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {!isVendedor && (
                    <div className="space-y-2">
                      <Label>Filial</Label>
                      <select name="branchId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Nenhuma (Sede / Geral)</option>
                        {Array.isArray(branches) && branches.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Dia do Aniversário (DD/MM)</Label>
                    <Input 
                      name="birthday" 
                      placeholder="Ex: 25/12 (Opcional)" 
                      maxLength={5}
                      value={newBirthday}
                      onChange={(e) => setNewBirthday(maskBirthday(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Média de dias de atraso</Label>
                    <Input 
                      name="avgDelayDays" 
                      type="number" 
                      min="0"
                      placeholder="Ex: 5 (Opcional)" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rota</Label>
                    <Input 
                      name="route" 
                      placeholder="Ex: Rota Centro (Opcional)" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data da última compra</Label>
                    <Input 
                      name="lastPurchaseDate" 
                      type="date" 
                    />
                  </div>
                </div>
                <div className="flex w-full justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Salvando...' : 'Salvar Lead'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Main Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Busca geral por nome, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', 'novo', 'em_negociacao', 'contato_realizado', 'aguardando_produto', 'vendido', 'perdido', 'contato_nao_atualizado'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s === 'todos' ? 'Todos' : LEAD_STATUS_LABELS[s as LeadStatus] || s}
            </button>
          ))}
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
            onChange={(e) => setFilterPhone(maskPhone(e.target.value))}
            className="bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">CPF</Label>
          <Input
            placeholder="Filtrar por CPF"
            value={filterCpf}
            onChange={(e) => setFilterCpf(maskCpf(e.target.value))}
            className="bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Filial</Label>
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            disabled={isVendedor || isGerente}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVendedor || isGerente ? (
              <option value={userBranchId || 'sem_filial'}>
                {userBranchName}
              </option>
            ) : (
              <>
                <option value="todos">Todas as Filiais</option>
                <option value="sem_filial">Sem Filial (Sede / Geral)</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {canDelete && (
                  <th className="py-3 px-4 w-10">
                    <input 
                      type="checkbox"
                      checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeadIds(leads.map((l: any) => l.id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th 
                    key={col.key} 
                    onClick={() => requestSort(col.key)}
                    className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/40 select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {sortConfig?.key === col.key ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={canDelete ? 11 : 10} className="py-8 text-center text-muted-foreground">Carregando leads...</td></tr>
              ) : sortedLeads.length === 0 ? (
                <tr><td colSpan={canDelete ? 11 : 10} className="py-8 text-center text-muted-foreground">Nenhum lead encontrado.</td></tr>
              ) : sortedLeads.map((lead: any) => (
                <tr 
                  key={lead.id} 
                  className={`table-row-hover border-b border-border/30 last:border-0 cursor-pointer ${
                    selectedLeadIds.includes(lead.id) ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    setSelectedLeadForHistory(lead);
                    setIsHistoryOpen(true);
                  }}
                >
                  {canDelete && (
                    <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(prev => [...prev, lead.id]);
                          } else {
                            setSelectedLeadIds(prev => prev.filter(id => id !== lead.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-foreground">{lead.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
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
                            <span className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1 rounded flex items-center gap-1" title="Aniversário do cliente">
                              🎂 {lead.birthday}
                            </span>
                          )}
                          {lead.avgDelayDays !== null && lead.avgDelayDays !== undefined && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/10 px-1 rounded flex items-center gap-1" title="Média de dias de atraso">
                              ⏱️ {lead.avgDelayDays}d atraso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{lead.city}/{lead.state}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground font-medium">
                    {lead.branch?.name || <span className="text-muted-foreground/60 italic text-xs">Sede / Geral</span>}
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={lead.status} /></td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      lead.priority === 'urgente' ? 'bg-destructive/10 text-destructive' :
                      lead.priority === 'alta' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {PRIORITY_LABELS[lead.priority as keyof typeof PRIORITY_LABELS] || lead.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground font-medium">
                    {lead.seller?.name || (
                      <div className="flex items-center gap-2">
                        <span className="text-destructive text-xs">Sem responsável</span>
                        {isVendedor && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 px-2 text-[10px] border-primary text-primary hover:bg-primary/5 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVincular(lead.id);
                            }}
                          >
                            Vincular
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">
                    {lead.estimatedValue ? `R$ ${(lead.estimatedValue / 1000).toFixed(0)}k` : '-'}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{lead.source}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedLeadForHistory(lead);
                          setIsHistoryOpen(true);
                        }}>
                          <History className="w-4 h-4 mr-2" /> Ver Histórico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingLead(lead);
                          setEditCpf(lead.cpf ? maskCpf(lead.cpf) : '');
                          setEditBirthday(lead.birthday || '');
                          setEditStatus(lead.status || 'novo');
                          setEditPaymentMode(lead.paymentMode || 'a_vista');
                          setIsEditModalOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setLeadToDelete(lead);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Deletar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (open && editingLead) {
          setEditCpf(editingLead.cpf ? maskCpf(editingLead.cpf) : '');
          setEditBirthday(editingLead.birthday || '');
          setEditStatus(editingLead.status || 'novo');
          setEditPaymentMode(editingLead.paymentMode || 'a_vista');
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome <span className="text-destructive">*</span></Label>
                  <Input name="name" required defaultValue={editingLead.name} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone <span className="text-destructive">*</span></Label>
                    <Input 
                      name="phone" 
                      required 
                      defaultValue={editingLead.phone ? maskPhone(editingLead.phone) : ''}
                      placeholder="(DD) 99999-9999" 
                      onChange={(e) => e.target.value = maskPhone(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input 
                    name="cpf" 
                    placeholder="000.000.000-00 (Opcional)" 
                    value={editCpf}
                    onChange={(e) => setEditCpf(maskCpf(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade <span className="text-destructive">*</span></Label>
                  <Input name="city" required defaultValue={editingLead.city} />
                </div>
                <div className="space-y-2">
                  <Label>Estado (UF) <span className="text-destructive">*</span></Label>
                  <Input name="state" required defaultValue={editingLead.state} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select 
                    name="status" 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_negociacao">Em Negociação</option>
                    <option value="contato_realizado">Contato Realizado</option>
                    <option value="aguardando_produto">Aguardando Produto Chegar</option>
                    <option value="vendido">Vendido</option>
                    <option value="perdido">Perdido</option>
                    <option value="contato_nao_atualizado">Contato Não Atualizado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <select name="priority" defaultValue={editingLead.priority} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {editStatus === 'vendido' ? (
                      <>Valor da Venda (R$) <span className="text-destructive">*</span></>
                    ) : (
                      'Valor Estimado'
                    )}
                  </Label>
                  <Input 
                    type="number" 
                    name="estimatedValue" 
                    defaultValue={editingLead.estimatedValue} 
                    required={editStatus === 'vendido'}
                    min={editStatus === 'vendido' ? "0.01" : undefined}
                    step="0.01"
                    placeholder={editStatus === 'vendido' ? "Ex: 1500.50" : "15000"} 
                  />
                </div>
                {editStatus === 'vendido' && (
                  <>
                    <div className="space-y-2">
                      <Label>Modo de Pagamento <span className="text-destructive">*</span></Label>
                      <select 
                        name="paymentMode" 
                        value={editPaymentMode}
                        onChange={(e) => setEditPaymentMode(e.target.value)}
                        required 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="a_vista">À vista</option>
                        <option value="carne">Carnê</option>
                        <option value="cartao">Cartão</option>
                        <option value="pix">Pix</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Venda <span className="text-destructive">*</span></Label>
                      <select 
                        name="saleType" 
                        required 
                        defaultValue={editingLead.saleType || 'interna'}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="interna">Interna</option>
                        <option value="externa">Externa</option>
                      </select>
                    </div>
                    {editPaymentMode === 'carne' && (
                      <div className="space-y-2 col-span-2">
                        <Label>Valor da Entrada (R$) <span className="text-destructive">*</span></Label>
                        <Input 
                          type="number" 
                          name="downPayment" 
                          defaultValue={editingLead.downPayment || 0}
                          min="0"
                          step="0.01"
                          required
                          placeholder="Ex: 500.00 (Digite 0 se não houver)" 
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <select name="source" defaultValue={editingLead.source} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="Loja Física">Loja Física</option>
                    <option value="Visita Externa">Visita Externa</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site">Site</option>
                    <option value="Redes Sociais">Redes Sociais</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Vendedor Responsável <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                  <select name="sellerId" defaultValue={editingLead.sellerId || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Nenhum (Sem responsável)</option>
                    {Array.isArray(assignableSellers) && assignableSellers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {!isVendedor && (
                  <div className="space-y-2">
                    <Label>Filial</Label>
                    <select name="branchId" defaultValue={editingLead.branchId || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">Nenhuma (Sede / Geral)</option>
                      {Array.isArray(branches) && branches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Dia do Aniversário (DD/MM)</Label>
                  <Input 
                    name="birthday" 
                    placeholder="Ex: 25/12 (Opcional)" 
                    maxLength={5}
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(maskBirthday(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Média de dias de atraso</Label>
                  <Input 
                    name="avgDelayDays" 
                    type="number" 
                    min="0"
                    defaultValue={editingLead.avgDelayDays || ''} 
                    placeholder="Ex: 5 (Opcional)" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rota</Label>
                  <Input 
                    name="route" 
                    defaultValue={editingLead.route || ''} 
                    placeholder="Ex: Rota Centro (Opcional)" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data da última compra</Label>
                  <Input 
                    name="lastPurchaseDate" 
                    type="date" 
                    defaultValue={editingLead.lastPurchaseDate ? editingLead.lastPurchaseDate.substring(0, 10) : ''} 
                  />
                </div>
              </div>
              <div className="flex w-full justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o lead
              <span className="font-semibold text-foreground"> {leadToDelete?.name} </span>
              e todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir múltiplos leads?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente os
              <span className="font-semibold text-foreground"> {selectedLeadIds.length} </span>
              leads selecionados e todos os seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => bulkDeleteMutation.mutate(selectedLeadIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Bar for Bulk Delete */}
      {selectedLeadIds.length > 0 && canDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border/80 px-6 py-3 rounded-full shadow-lg flex items-center gap-6 z-50 animate-fade-in">
          <span className="text-sm font-medium text-foreground">
            {selectedLeadIds.length} lead(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 rounded-full text-xs"
              onClick={() => setSelectedLeadIds([])}
            >
              Limpar Seleção
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="h-8 rounded-full text-xs"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir Selecionados
            </Button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Leads via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              <p>Para importar leads corretamente, seu arquivo CSV deve conter os seguintes cabeçalhos exatos:</p>
              <ul className="list-disc list-inside mt-2 mb-4 space-y-1 font-medium text-foreground">
                <li>Nome</li>
                <li>Telefone</li>
                <li>CPF <span className="text-muted-foreground font-normal">(Apenas números, opcional)</span></li>
                <li>Cidade</li>
                <li>Estado</li>
                <li>Status <span className="text-muted-foreground font-normal">(novo, em_negociacao, contato_realizado, vendido, perdido, contato_nao_atualizado)</span></li>
                <li>Prioridade <span className="text-muted-foreground font-normal">(baixa, media, alta, urgente)</span></li>
                <li>Valor Estimado <span className="text-muted-foreground font-normal">(apenas números, opcional)</span></li>
                <li>Origem</li>
                <li>Vendedor ID <span className="text-muted-foreground font-normal">(ID ou nome do vendedor, opcional)</span></li>
                <li>Filial ID <span className="text-muted-foreground font-normal">(ID ou nome da filial, opcional)</span></li>
                <li>Aniversario <span className="text-muted-foreground font-normal">(formato DD/MM, opcional)</span></li>
                <li>Media de dias de atraso <span className="text-muted-foreground font-normal">(apenas números, opcional)</span></li>
                <li>Rota <span className="text-muted-foreground font-normal">(opcional)</span></li>
                <li>Data da última compra <span className="text-muted-foreground font-normal">(formato DD/MM/AAAA, opcional)</span></li>
              </ul>
              <p>Recomendamos baixar nossa planilha modelo para evitar erros de formatação.</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" /> Baixar Modelo
              </Button>
              <Button className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                <Upload className="w-4 h-4 mr-2" /> {importMutation.isPending ? 'Importando...' : 'Selecionar Arquivo'}
              </Button>
            </div>
          </div>
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
                        return <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />;
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
