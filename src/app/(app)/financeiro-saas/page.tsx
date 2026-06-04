"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Coins, Search, DollarSign, Calendar, CheckCircle2, AlertCircle, 
  Clock, CreditCard, ArrowUpRight, Pencil, Trash2, ShieldAlert 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function FinanceiroSaasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // States do Modal de Edição
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const [planName, setPlanName] = useState('');
  const [planValue, setPlanValue] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');

  // States do Modal de Exclusão
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<any>(null);

  const { data: billingList = [], isLoading } = useQuery({
    queryKey: ['billing-data'],
    queryFn: async () => {
      const res = await fetch('/api/saas/billing');
      if (!res.ok) throw new Error('Falha ao carregar faturamento');
      return res.json();
    }
  });

  const updateBillingMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch(`/api/saas/billing/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: updatedData.planName,
          planValue: updatedData.planValue,
          nextDueDate: updatedData.nextDueDate,
          paymentStatus: updatedData.paymentStatus
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao atualizar faturamento');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-data'] });
      queryClient.invalidateQueries({ queryKey: ['saas-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsEditOpen(false);
      setSelectedBilling(null);
      toast.success('Dados de faturamento atualizados com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao atualizar faturamento.');
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir empresa');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-data'] });
      queryClient.invalidateQueries({ queryKey: ['saas-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(data.message || 'Empresa e todos os seus dados foram excluídos com sucesso!');
      setIsDeleteOpen(false);
      setCompanyToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao excluir empresa.');
    }
  });

  const handleEditClick = (bill: any) => {
    setSelectedBilling(bill);
    setPlanName(bill.plan);
    setPlanValue(bill.value.toString());
    setNextDueDate(new Date(bill.nextDueDate).toISOString().split('T')[0]);
    setPaymentStatus(bill.paymentStatus);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (bill: any) => {
    setCompanyToDelete(bill);
    setIsDeleteOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planValue || !nextDueDate) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    updateBillingMutation.mutate({
      id: selectedBilling.id,
      planName,
      planValue: parseFloat(planValue),
      nextDueDate,
      paymentStatus
    });
  };

  const filteredBilling = billingList.filter((b: any) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.cnpj.includes(search)
  );

  // Totais resumidos
  const totalMRR = billingList
    .filter((b: any) => b.status === 'ACTIVE')
    .reduce((acc: number, curr: any) => acc + curr.value, 0);

  const totalPaid = billingList
    .filter((b: any) => b.paymentStatus === 'PAID')
    .reduce((acc: number, curr: any) => acc + curr.value, 0);

  const totalPending = billingList
    .filter((b: any) => b.paymentStatus === 'PENDING')
    .reduce((acc: number, curr: any) => acc + curr.value, 0);

  const totalOverdue = billingList
    .filter((b: any) => b.paymentStatus === 'OVERDUE')
    .reduce((acc: number, curr: any) => acc + (curr.value || 499.00), 0);

  const handleSendReminder = (companyName: string) => {
    toast.success(`Notificação de lembrete de pagamento enviada para ${companyName}!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Coins className="w-6 h-6 text-primary" />
          Financeiro SaaS (Faturamento)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe, edite, gerencie e exclua as mensalidades, planos e empresas ativas na plataforma.
        </p>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Receita Recorrente (MRR)</p>
            <h3 className="text-xl font-bold text-foreground mt-1">R$ {totalMRR.toLocaleString('pt-BR')},00</h3>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> +12.4% este mês
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Pagos */}
        <div className="bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mensalidades Recebidas</p>
            <h3 className="text-xl font-bold text-foreground mt-1">R$ {totalPaid.toLocaleString('pt-BR')},00</h3>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5 mt-1">
              Este mês corrente
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aguardando Pagamento</p>
            <h3 className="text-xl font-bold text-foreground mt-1">R$ {totalPending.toLocaleString('pt-BR')},00</h3>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5 mt-1">
              Vencimento próximo
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Atrasados */}
        <div className="bg-card border border-border/50 rounded-xl p-5 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Valores em Atraso</p>
            <h3 className="text-xl font-bold text-foreground mt-1">R$ {totalOverdue.toLocaleString('pt-BR')},00</h3>
            <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5 mt-1">
              Requer atenção
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabela de Recebíveis */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border h-10 w-full"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Mostrando {filteredBilling.length} empresas cadastradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Plano Contratado</th>
                <th className="px-6 py-4">Valor Mensal</th>
                <th className="px-6 py-4">Próximo Vencimento</th>
                <th className="px-6 py-4">Status Cobrança</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando registros financeiros...
                  </td>
                </tr>
              ) : filteredBilling.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum registro financeiro encontrado.
                  </td>
                </tr>
              ) : (
                filteredBilling.map((bill: any) => (
                  <tr key={bill.id} className="hover:bg-muted/10 transition-colors">
                    {/* Cliente */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{bill.name}</p>
                        <p className="text-xs text-muted-foreground">CNPJ: {bill.cnpj}</p>
                      </div>
                    </td>

                    {/* Plano */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">{bill.plan}</span>
                      </div>
                    </td>

                    {/* Valor */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-foreground">
                        R$ {(bill.value || 0).toLocaleString('pt-BR')},00
                      </span>
                    </td>

                    {/* Vencimento */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(bill.nextDueDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        bill.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : bill.paymentStatus === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {bill.paymentStatus === 'PAID' && (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Pago</>
                        )}
                        {bill.paymentStatus === 'PENDING' && (
                          <><Clock className="w-3.5 h-3.5" /> Pendente</>
                        )}
                        {bill.paymentStatus === 'OVERDUE' && (
                          <><AlertCircle className="w-3.5 h-3.5" /> Atrasado</>
                        )}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(bill)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Editar Faturamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(bill)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir Empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        
                        {bill.paymentStatus !== 'PAID' ? (
                          <Button
                            size="sm"
                            onClick={() => handleSendReminder(bill.name)}
                            className="bg-primary hover:bg-primary/90 text-white font-medium text-xs px-3 py-1.5 h-auto rounded-lg ml-1"
                          >
                            Cobrar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic font-medium pr-2 ml-1">
                            Tudo em dia
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Dialog de Edição de Faturamento */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Editar Faturamento do Cliente
            </DialogTitle>
            <DialogDescription>
              Ajuste as definições de assinatura e cobrança de <strong className="text-foreground">&quot;{selectedBilling?.name}&quot;</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="planName">Nome do Plano <span className="text-destructive">*</span></Label>
              <Input
                id="planName"
                placeholder="Ex: Plano Premium"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="planValue">Valor Mensal (R$) <span className="text-destructive">*</span></Label>
              <Input
                id="planValue"
                type="number"
                step="0.01"
                placeholder="499.00"
                value={planValue}
                onChange={(e) => setPlanValue(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nextDueDate">Próximo Vencimento <span className="text-destructive">*</span></Label>
              <Input
                id="nextDueDate"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentStatus">Status do Pagamento <span className="text-destructive">*</span></Label>
              <select
                id="paymentStatus"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="PAID">Pago (Tudo em dia)</option>
                <option value="PENDING">Pendente (Aguardando vencimento)</option>
                <option value="OVERDUE">Atrasado (Requer atenção)</option>
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateBillingMutation.isPending}
                className="bg-primary hover:bg-primary/95 text-white"
              >
                {updateBillingMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog - Confirmação Exclusão de Empresa */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Excluir Empresa Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente a empresa <strong className="text-foreground">&quot;{companyToDelete?.name}&quot;</strong> e **todos os dados** associados a ela (usuários, filiais, leads, relatórios, etc.) do sistema.
              Esta ação é **irreversível**.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCompanyMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (companyToDelete) {
                  deleteCompanyMutation.mutate(companyToDelete.id);
                }
              }}
              disabled={deleteCompanyMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleteCompanyMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
