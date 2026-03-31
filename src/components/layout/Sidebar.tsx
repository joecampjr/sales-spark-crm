"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Target, BarChart3,
  Settings, FileText, MapPin, UserCheck, LogOut, ChevronLeft,
  Briefcase, Phone, Calendar, Award, Shield, ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navSections = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Leads', path: '/leads', icon: Target },
      { label: 'Contatos', path: '/contatos', icon: Phone },
      { label: 'Visitas', path: '/visitas', icon: Calendar },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Vendedores', path: '/vendedores', icon: UserCheck },
      { label: 'Filiais', path: '/filiais', icon: MapPin },
      { label: 'Usuários', path: '/usuarios', icon: Users },
      { label: 'Ranking', path: '/ranking', icon: Award },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Empresas', path: '/empresas', icon: Building2 },
      { label: 'Configurações', path: '/configuracoes', icon: Settings },
      { label: 'Auditoria', path: '/auditoria', icon: Shield },
      { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{ background: 'hsl(var(--sidebar-bg))' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>CRM Comercial</h1>
              <p className="text-[10px]" style={{ color: 'hsl(var(--sidebar-section))' }}>Inteligente</p>
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
        {navSections.map((section) => (
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
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary-foreground">
              {user?.nome?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>
                {user?.nome || 'Usuário'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'hsl(var(--sidebar-section))' }}>
                {user?.perfil === 'admin_empresa' ? 'Admin' : user?.perfil || 'Perfil'}
              </p>
            </div>
          )}
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
