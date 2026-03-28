import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={cn('transition-all duration-300', sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]')}>
        <Topbar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
