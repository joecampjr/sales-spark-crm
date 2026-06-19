"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Target, BarChart3,
  Settings, FileText, MapPin, UserCheck, LogOut, ChevronLeft,
  Phone, Calendar, Award, Shield, ChevronDown, Zap, Coins
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const saasNavSections = [
  {
    label: 'Plataforma SaaS',
    items: [
      { label: 'Dashboard Global', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Empresas', path: '/empresas', icon: Building2 },
      { label: 'Usuários Globais', path: '/usuarios-globais', icon: Users },
      { label: 'Financeiro SaaS', path: '/financeiro-saas', icon: Coins },
      { label: 'Auditoria Global', path: '/auditoria', icon: Shield },
    ],
  }
];


const navSections = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE'] },
      { label: 'Leads', path: '/leads', icon: Target },
      { label: 'Contatos', path: '/contatos', icon: Phone },
      { label: 'Visitas', path: '/visitas', icon: Calendar },
      { label: 'Ações de Venda', path: '/acoes-venda', icon: Zap, roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE'] },
      { label: 'Ranking', path: '/ranking', icon: Award },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Vendedores', path: '/vendedores', icon: UserCheck, roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE'] },
      { label: 'Filiais', path: '/filiais', icon: MapPin, roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'] },
      { label: 'Usuários', path: '/usuarios', icon: Users, roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR'] },
    ],
    roles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'GERENTE']
  },
  {
    label: 'Administração',
    items: [
      { label: 'Empresas', path: '/empresas', icon: Building2 },
      { label: 'Configurações', path: '/configuracoes', icon: Settings },
      { label: 'Auditoria', path: '/auditoria', icon: Shield },
      { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    ],
    roles: ['SUPERADMIN']
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user, switchProfile } = useAuth();
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showProfilesMenu, setShowProfilesMenu] = useState(false);

  useEffect(() => {
    if (user) {
      fetch('/api/auth/profiles')
        .then(res => res.json())
        .then(data => {
          if (data && data.profiles) {
            setProfiles(data.profiles);
          }
        })
        .catch(e => console.error('Erro ao carregar perfis:', e));
    }
  }, [user]);

  const handleProfileSwitch = async (profileId: string) => {
    if (!user || profileId === user.id) return;
    await switchProfile(profileId);
  };

  const currentSections = user?.role === 'SUPERADMIN' ? saasNavSections : navSections;


  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex-col transition-all duration-300 ease-in-out hidden lg:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{ background: 'hsl(var(--sidebar-bg))' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
            <Image src="/logo.png?v=4" alt="Sales Spark Logo" width={36} height={36} className="object-contain" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>Sales Spark</h1>
              <p className="text-[10px]" style={{ color: 'hsl(var(--sidebar-section))' }}>CRM Inteligente</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'ml-auto p-1.5 rounded-md transition-colors',
            collapsed && 'hidden lg:block'
          )}
          style={{ color: 'hsl(var(--sidebar-section))' }}
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {currentSections.map((section) => {
          if ((section as any).roles && user && !(section as any).roles.includes(user.role)) return null;


          return (
            <div key={section.label}>
              {!collapsed && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3"
                  style={{ color: 'hsl(var(--sidebar-section))' }}
                >
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  if ((item as any).roles && user && !(item as any).roles.includes(user.role)) return null;

                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn('sidebar-item', isActive && 'active')}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t relative" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        {/* Menu Flutuante de Alternar Perfil */}
        {showProfilesMenu && profiles.length > 1 && (
          <div className="absolute bottom-16 left-3 right-3 bg-[#111] border border-white/[0.08] rounded-xl p-2.5 shadow-2xl z-50 space-y-1.5 animate-fade-in">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              Mudar Perfil (Visualização)
            </p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
              {profiles.map((p) => {
                const isCurrent = p.id === user?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProfileSwitch(p.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between group",
                      isCurrent 
                        ? "bg-primary/10 text-primary cursor-default" 
                        : "hover:bg-white/[0.04] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold truncate">{p.companyName}</p>
                      <p className="text-[9px] font-medium opacity-80 mt-0.5">
                        {p.role === 'SUPERADMIN' ? 'Super Admin' :
                         p.role === 'ADMIN' ? 'Administrador' : 
                         p.role === 'GERENTE' ? 'Gerente' :
                         p.role === 'SUPERVISOR' ? 'Supervisor' : 'Vendedor'}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <button
            onClick={() => profiles.length > 1 && setShowProfilesMenu(!showProfilesMenu)}
            className={cn(
              'flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg transition-colors p-1',
              profiles.length > 1 && 'hover:bg-white/[0.03] cursor-pointer'
            )}
            title={profiles.length > 1 ? "Mudar de Perfil" : undefined}
          >
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 relative">
              <span className="text-xs font-semibold text-primary-foreground">
                {user?.name?.charAt(0) || 'U'}
              </span>
              {/* Indicador de perfis múltiplos na foto */}
              {profiles.length > 1 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-fade-in flex items-center justify-between">
                <div className="min-w-0 pr-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'hsl(var(--sidebar-section))' }}>
                    {user?.role === 'SUPERADMIN' ? 'Super Admin' :
                     user?.role === 'ADMIN' ? 'Administrador' : 
                     user?.role === 'GERENTE' ? 'Gerente' :
                     user?.role === 'SUPERVISOR' ? 'Supervisor' : 'Vendedor'}
                  </p>
                </div>
                {profiles.length > 1 && (
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", showProfilesMenu && "rotate-180")} />
                )}
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-md transition-colors hover:bg-destructive/20"
              style={{ color: 'hsl(var(--sidebar-section))' }}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
