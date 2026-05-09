import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { ViewId } from '@/hooks/useViewNavigation';

export function DashboardShell({ activeView, onNavigate, children }: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
