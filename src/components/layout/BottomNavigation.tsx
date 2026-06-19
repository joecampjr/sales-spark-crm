"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Target, Phone, Award, Calendar, Zap,
  Users, UserCheck, MapPin, Building2, Settings, Shield,
  BarChart3, LogOut, Menu, X, ChevronDown, Coins
} from "lucide-react";

export function BottomNavigation() {
  const pathname = usePathname();
  const { logout, user, switchProfile } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showProfilesMenu, setShowProfilesMenu] = useState(false);

  useEffect(() => {
    if (user) {
      fetch("/api/auth/profiles")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.profiles) {
            setProfiles(data.profiles);
          }
        })
        .catch((e) => console.error("Erro ao carregar perfis:", e));
    }
  }, [user]);

  // Fecha o menu "Mais" ao mudar de página
  useEffect(() => {
    setShowMoreMenu(false);
    setShowProfilesMenu(false);
  }, [pathname]);

  if (!user) return null;

  const handleProfileSwitch = async (profileId: string) => {
    if (profileId === user.id) return;
    await switchProfile(profileId);
  };

  const isSuperAdmin = user.role === "SUPERADMIN";

  // Abas principais que aparecem na barra inferior móvel (máximo de 4 + 1 botão "Mais")
  const primaryTabs = isSuperAdmin
    ? [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Empresas", path: "/empresas", icon: Building2 },
        { label: "Usuários", path: "/usuarios-globais", icon: Users },
        { label: "Financeiro", path: "/financeiro-saas", icon: Coins },
      ]
    : user.role === "VENDEDOR"
    ? [
        { label: "Leads", path: "/leads", icon: Target },
        { label: "Contatos", path: "/contatos", icon: Phone },
        { label: "Visitas", path: "/visitas", icon: Calendar },
        { label: "Ranking", path: "/ranking", icon: Award },
      ]
    : [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Leads", path: "/leads", icon: Target },
        { label: "Contatos", path: "/contatos", icon: Phone },
        { label: "Ranking", path: "/ranking", icon: Award },
      ];

  // Links adicionais que aparecem no menu "Mais"
  const secondaryItems = isSuperAdmin
    ? [{ label: "Auditoria Global", path: "/auditoria", icon: Shield }]
    : [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["SUPERVISOR", "GERENTE", "ADMIN"] },
        { label: "Visitas", path: "/visitas", icon: Calendar, roles: ["SUPERVISOR", "GERENTE", "ADMIN"] },
        { label: "Ações de Venda", path: "/acoes-venda", icon: Zap, roles: ["SUPERVISOR", "GERENTE", "ADMIN"] },
        { label: "Vendedores", path: "/vendedores", icon: UserCheck, roles: ["SUPERVISOR", "GERENTE", "ADMIN"] },
        { label: "Filiais", path: "/filiais", icon: MapPin, roles: ["SUPERVISOR", "ADMIN"] },
        { label: "Usuários", path: "/usuarios", icon: Users, roles: ["SUPERVISOR", "ADMIN"] },
        { label: "Empresas", path: "/empresas", icon: Building2, roles: ["ADMIN"] },
        { label: "Configurações", path: "/configuracoes", icon: Settings, roles: ["ADMIN"] },
        { label: "Auditoria", path: "/auditoria", icon: Shield, roles: ["ADMIN"] },
        { label: "Relatórios", path: "/relatorios", icon: BarChart3, roles: ["ADMIN"] },
      ].filter((item) => !item.roles || item.roles.includes(user.role) && !primaryTabs.some(pt => pt.path === item.path));

  return (
    <>
      {/* Barra de Navegação Inferior Fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-t border-slate-900/60 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] lg:hidden safe-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 active:scale-95 transition-all duration-200"
              >
                <div className={cn(
                  "p-1 rounded-xl transition-all duration-300 relative",
                  isActive ? "text-cyan-400" : "hover:text-slate-200"
                )}>
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.span 
                      layoutId="activeIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-medium mt-1 transition-colors duration-300",
                  isActive ? "text-cyan-400 font-semibold" : "text-slate-500"
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* Botão Mais (Menu Lateral Mobile) */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 active:scale-95 transition-all duration-200"
          >
            <div className={cn(
              "p-1 rounded-xl transition-all duration-300",
              showMoreMenu ? "text-cyan-400" : "hover:text-slate-200"
            )}>
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-medium mt-1 text-slate-500">Mais</span>
          </button>
        </div>
      </div>

      {/* Drawer / Menu de Mais Opções */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            {/* Backdrop com desfoque */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Menu deslizante (Drawer) */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-slate-950 border-t border-slate-800/80 rounded-t-3xl z-50 overflow-y-auto lg:hidden pb-safe-bottom shadow-2xl flex flex-col"
            >
              {/* Header do Drawer */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Menu Principal</h3>
                  <p className="text-[10px] text-slate-500">Mais opções e ferramentas</p>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo do Drawer */}
              <div className="flex-1 px-6 py-4 space-y-6">
                {/* Perfil e Alternância de Contas */}
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 relative">
                  <button
                    onClick={() => profiles.length > 1 && setShowProfilesMenu(!showProfilesMenu)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-950">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                        <p className="text-[9px] text-slate-500">
                          {user.role === "SUPERADMIN" ? "Super Admin" :
                           user.role === "ADMIN" ? "Administrador" : 
                           user.role === "GERENTE" ? "Gerente" :
                           user.role === "SUPERVISOR" ? "Supervisor" : "Vendedor"}
                        </p>
                      </div>
                    </div>
                    {profiles.length > 1 && (
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showProfilesMenu && "rotate-180")} />
                    )}
                  </button>

                  {/* Submenu de Perfis */}
                  <AnimatePresence>
                    {showProfilesMenu && profiles.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 border-t border-slate-900 pt-3 space-y-1.5 overflow-hidden"
                      >
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">
                          Alterar Conta
                        </p>
                        {profiles.map((p) => {
                          const isCurrent = p.id === user.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleProfileSwitch(p.id)}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors",
                                isCurrent 
                                  ? "bg-cyan-500/10 text-cyan-400 font-semibold" 
                                  : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              <div className="truncate pr-2">
                                <p className="truncate font-medium">{p.companyName}</p>
                                <p className="text-[8px] opacity-70">
                                  {p.role === "SUPERADMIN" ? "Super Admin" :
                                   p.role === "ADMIN" ? "Administrador" : 
                                   p.role === "GERENTE" ? "Gerente" :
                                   p.role === "SUPERVISOR" ? "Supervisor" : "Vendedor"}
                                </p>
                              </div>
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Grid de Ferramentas e Recursos */}
                {secondaryItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      Ferramentas
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {secondaryItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200",
                              isActive
                                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 font-semibold"
                                : "bg-slate-900/20 border-slate-900 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200"
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-xs truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Botão de Logout */}
                <div className="border-t border-slate-900 pt-4 pb-2">
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold text-xs transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
