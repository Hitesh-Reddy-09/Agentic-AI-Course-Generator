import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 pt-20 lg:pt-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
