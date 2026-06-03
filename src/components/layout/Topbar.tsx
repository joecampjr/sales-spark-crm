"use client";

import { useState, useEffect } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Queries
  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const res = await fetch('/api/visits');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000 // atualiza a cada 30s
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && user.role === 'VENDEDOR',
    refetchInterval: 30000
  });

  const isVendedor = user?.role === 'VENDEDOR';
  const isAdminOrSupervisor = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'GERENTE';

  const notifications: any[] = [];

  if (user) {
    if (isAdminOrSupervisor) {
      // Solicitações de visita pendentes de autorização
      const pendingVisits = visits.filter((v: any) => v.status === 'aguardando_autorizacao');
      pendingVisits.forEach((v: any) => {
        notifications.push({
          id: `pending-visit-${v.id}`,
          title: 'Solicitação de Visita',
          description: `O vendedor ${v.seller?.name || ''} solicitou visita para o lead ${v.lead?.name || ''}.`,
          time: new Date(v.createdAt).toLocaleDateString('pt-BR'),
          type: 'visit_pending',
          link: '/visitas'
        });
      });
    }

    if (isVendedor) {
      // Visitas autorizadas ou recusadas
      const myVisits = visits.filter((v: any) => ['autorizada', 'recusada'].includes(v.status));
      myVisits.forEach((v: any) => {
        const isAuthorized = v.status === 'autorizada';
        notifications.push({
          id: `my-visit-${v.id}-${v.status}`,
          title: isAuthorized ? 'Visita Autorizada' : 'Visita Recusada',
          description: `Sua solicitação de visita para o lead ${v.lead?.name || ''} foi ${v.status === 'autorizada' ? 'autorizada' : 'recusada'}.`,
          time: new Date(v.updatedAt || v.createdAt).toLocaleDateString('pt-BR'),
          type: isAuthorized ? 'visit_authorized' : 'visit_refused',
          link: '/visitas'
        });
      });

      // Leads sem responsável/vendedor na filial
      const unassignedLeads = leads.filter((l: any) => l.sellerId === null);
      unassignedLeads.forEach((l: any) => {
        notifications.push({
          id: `unassigned-lead-${l.id}`,
          title: 'Lead Sem Responsável',
          description: `O lead ${l.name} está disponível na filial para vinculação.`,
          time: new Date(l.createdAt).toLocaleDateString('pt-BR'),
          type: 'unassigned_lead',
          link: '/leads'
        });
      });

      // Aniversariantes do dia entre os contatos vinculados
      const today = new Date();
      const currentDay = String(today.getDate()).padStart(2, '0');
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDdMm = `${currentDay}/${currentMonth}`;

      const birthdayLeads = leads.filter((l: any) => l.sellerId !== null && l.birthday === todayDdMm);
      birthdayLeads.forEach((l: any) => {
        notifications.push({
          id: `birthday-${l.id}-${todayDdMm}`,
          title: `Aniversário: ${l.name} 🎉`,
          description: `Hoje é aniversário do cliente ${l.name}! Dê os parabéns.`,
          time: todayDdMm,
          type: 'birthday',
          link: '/contatos'
        });
      });
    }
  }

  // Solicita permissão para notificações push nativas do navegador
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Monitora aniversários e dispara Push + Toast uma vez ao dia por cliente
  useEffect(() => {
    if (leads.length > 0 && isVendedor) {
      const today = new Date();
      const currentDay = String(today.getDate()).padStart(2, '0');
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDdMm = `${currentDay}/${currentMonth}`;

      const birthdayLeads = leads.filter(
        (l: any) => l.sellerId !== null && l.birthday === todayDdMm
      );

      birthdayLeads.forEach((lead: any) => {
        const storageKey = `notified-birthday-${lead.id}-${todayDdMm}`;
        if (!localStorage.getItem(storageKey)) {
          // 1. Toast visual no CRM
          toast.info(`Hoje é aniversário do cliente ${lead.name}! 🥳`, {
            duration: 10000,
          });

          // 2. Push notification nativa
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`Aniversário de Cliente 🎉`, {
                body: `Hoje é aniversário do seu cliente ${lead.name}. Lembre-se de enviar os parabéns!`,
                icon: '/favicon.ico'
              });
            } catch (err) {
              console.error('Falha ao disparar push notification:', err);
            }
          }

          localStorage.setItem(storageKey, 'true');
        }
      });
    }
  }, [leads, isVendedor]);

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-md hover:bg-muted">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
        {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads, contatos..."
            className="w-72 pl-9 bg-muted/50 border-transparent focus:border-primary/30 h-9 text-sm"
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors focus:outline-none"
            title="Notificações"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 animate-fade-in flex flex-col">
              <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
                <span className="font-semibold text-sm text-foreground">Notificações</span>
                {notifications.length > 0 && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {notifications.length} nova(s)
                  </span>
                )}
              </div>
              <div className="divide-y divide-border/30">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <a 
                      key={n.id} 
                      href={n.link}
                      onClick={() => setIsOpen(false)}
                      className="p-4 flex flex-col gap-1 hover:bg-muted/40 transition-colors block text-left"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-xs text-foreground leading-tight">{n.title}</span>
                        <span className="text-[9px] text-muted-foreground font-medium shrink-0 ml-2">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal mt-1">{n.description}</p>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
