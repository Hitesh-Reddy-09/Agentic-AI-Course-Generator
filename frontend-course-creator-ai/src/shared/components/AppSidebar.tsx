import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BookOpen, PlayCircle,
  MessageSquare, BarChart3, Award, Home, Menu, X, LogOut
} from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/shared/lib/store';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/create', label: 'Create Course', icon: BookOpen },
  { to: '/lesson', label: 'Lessons', icon: PlayCircle },
  { to: '/tutor', label: 'Tutor Chat', icon: MessageSquare },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/exam', label: 'Exam & Cert', icon: Award },
];

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const userName = useAppStore((s) => s.userName);
  const userEmail = useAppStore((s) => s.userEmail);
  const logout = useAppStore((s) => s.logout);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-card border border-border shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <span className="text-lg font-bold font-display text-foreground tracking-tight">
            Aura Learning
          </span>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">AI Course Generator</p>
          {userName && (
            <div className="mt-3 space-y-2">
              <div className="rounded-md bg-muted px-2 py-1.5">
                <p className="text-xs font-medium text-foreground truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                type="button"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
