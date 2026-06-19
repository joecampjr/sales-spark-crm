"use client";

import { PropsWithChildren, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNavigation } from "./BottomNavigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: PropsWithChildren) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]")}>
        <Topbar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <BottomNavigation />
    </div>
  );
}

