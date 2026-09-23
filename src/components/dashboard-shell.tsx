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
  '/templates': ['Directoria', 'Gerencia'],
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
          <span className="brand-mark">✓</span>HotelOps
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
              Hotel Aurora / <strong>{nav.find((n) => n[0] === activeSection)?.[2] ?? ''}</strong>
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
