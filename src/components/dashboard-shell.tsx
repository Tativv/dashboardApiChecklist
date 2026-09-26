'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store';
import { UserRole } from '@/types/api';
import { roleLabel } from '@/components/ui/status-badge';

const nav: [string, string, string][] = [
  ['/dashboard', '▦', 'Resumo'],
  ['/checklists', '☑', 'Checklists'],
  ['/my-tasks', '✓', 'Minhas tarefas'],
  ['/calls', '☎', 'Chamados'],
  ['/templates', '▤', 'Templates'],
  ['/areas', '⌖', 'Áreas'],
  ['/assets', '▧', 'Ativos'],
  ['/reports', '◷', 'Relatórios'],
  ['/users', '◉', 'Usuários'],
  ['/settings', '⚙', 'Configurações']
];

const access: Record<string, UserRole[]> = {
  '/users': ['Directoria'],
  '/settings': ['Directoria', 'Supervisor', 'Colaborador', 'Gerencia'],
  '/templates': ['Directoria', 'Gerencia', 'Supervisor'],
  '/areas': ['Directoria', 'Gerencia'],
  '/assets': ['Directoria', 'Gerencia'],
  '/reports': ['Directoria', 'Supervisor', 'Gerencia'],
  '/dashboard': ['Directoria', 'Supervisor', 'Colaborador', 'Gerencia'],
  '/checklists': ['Directoria', 'Supervisor', 'Colaborador', 'Gerencia'],
  '/my-tasks': ['Directoria', 'Supervisor', 'Colaborador', 'Gerencia'],
  '/calls': ['Directoria', 'Supervisor', 'Colaborador', 'Gerencia']
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const role = user?.role ?? 'Colaborador';
  const activeSection = '/' + (pathname.split('/')[1] ?? '');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="shell">
      <div className={'sidebar-overlay ' + (menuOpen ? 'open' : '')} onClick={() => setMenuOpen(false)} />
      <aside className={'sidebar ' + (menuOpen ? 'open' : '')}>
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="30" height="30">
              <defs>
                <linearGradient id="brandLogoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5e87ff" />
                  <stop offset="100%" stopColor="#2947c9" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="19" fill="url(#brandLogoGrad)" />
              <path d="M8 27 L16 13 L21 21 L25 15 L32 27 Z" fill="#eef2ff" opacity="0.95" />
              <circle cx="27" cy="11" r="3.2" fill="#fff" />
            </svg>
          </span>
          <span className="brand-name">
            Vale Suíço
            <small>Resort</small>
          </span>
        </div>
        <div className="nav-label">OPERAÇÕES</div>
        {nav
          .filter((n) => access[n[0]].includes(role))
          .map((n) => (
            <Link key={n[0]} href={n[0]} className={'nav ' + (activeSection === n[0] ? 'active' : '')}>
              <span className="nav-icon">{n[1]}</span>
              {n[2]}
            </Link>
          ))}
        <div className="nav-label">SESSÃO</div>
        <button
          className="nav"
          onClick={() => {
            logout();
            router.push('/login');
          }}
        >
          <span className="nav-icon">⎋</span>
          Sair
        </button>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="top-actions">
            <button
              className="menu-toggle"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>
            <div className="crumb">
              Vale Suíço Resort / <strong>{nav.find((n) => n[0] === activeSection)?.[2] ?? ''}</strong>
            </div>
          </div>
          <div className="top-actions">
            <span className="muted" style={{ fontSize: 13 }}>
              {user ? roleLabel(user.role) : ''}
            </span>
            <span className="avatar">{user ? initials(user.name) : ''}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
