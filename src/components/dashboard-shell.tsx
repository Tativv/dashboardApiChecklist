'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store';
import { UserRole } from '@/types/api';
import { UserMenu } from '@/components/user-menu';

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

const DIRETORIA_ICON_PATHS = {
  dashboard:
    'M3 21h18M5 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17M15 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12M8 6h1M11 6h1M8 10h1M11 10h1M8 14h1M11 14h1',
  checklist: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  phone:
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  reports: 'M3 3v18h18M8 17V10M13 17V6M18 17v-4',
  shieldCheck: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5zM9.5 12.5l2 2 3-4',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  pin: 'M12 21s7-7.09 7-12a7 7 0 0 0-14 0c0 4.91 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
} as const;

function NavIcon({ path, size = 17 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

type DiretoriaNavItem = { href: string; label: string; icon: string; openParam?: string };

const DIRETORIA_MAIN_NAV: DiretoriaNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DIRETORIA_ICON_PATHS.dashboard },
  { href: '/checklists', label: 'Checklist', icon: DIRETORIA_ICON_PATHS.checklist },
  { href: '/service-orders', label: 'Ordens de Serviço', icon: DIRETORIA_ICON_PATHS.wrench },
  { href: '/calls', label: 'Chamados', icon: DIRETORIA_ICON_PATHS.phone },
  { href: '/reports', label: 'Relatórios', icon: DIRETORIA_ICON_PATHS.reports }
];

const DIRETORIA_ADMIN_NAV: DiretoriaNavItem[] = [
  { href: '/areas', label: 'Áreas', icon: DIRETORIA_ICON_PATHS.pin },
  { href: '/assets', label: 'Ativos', icon: DIRETORIA_ICON_PATHS.box },
  { href: '/users', label: 'Usuários', icon: DIRETORIA_ICON_PATHS.users },
  { href: '/users?open=permissions', label: 'Permissões', icon: DIRETORIA_ICON_PATHS.shieldCheck, openParam: 'permissions' },
  { href: '/settings', label: 'Configurações', icon: DIRETORIA_ICON_PATHS.settings }
];

function isDiretoriaNavActive(item: DiretoriaNavItem, activeSection: string, openParam: string | null): boolean {
  const base = item.href.split('?')[0];
  if (base !== activeSection) return false;
  return item.openParam ? openParam === item.openParam : !openParam;
}

function DiretoriaNavLink({ item, activeSection, openParam }: { item: DiretoriaNavItem; activeSection: string; openParam: string | null }) {
  const isActive = isDiretoriaNavActive(item, activeSection, openParam);
  return (
    <Link href={item.href} className={'nav ' + (isActive ? 'active' : '')}>
      <span className="nav-icon">
        <NavIcon path={item.icon} />
      </span>
      {item.label}
    </Link>
  );
}

function DiretoriaNav({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const activeSection = '/' + (pathname.split('/')[1] ?? '');
  const openParam = searchParams.get('open');

  return (
    <>
      <div className="nav-label">CENTRO DE CONTROLE</div>
      {DIRETORIA_MAIN_NAV.map((item) => (
        <DiretoriaNavLink key={item.href} item={item} activeSection={activeSection} openParam={openParam} />
      ))}

      <div className="nav-divider" />
      <div className="nav-label">ADMINISTRAÇÃO</div>
      {DIRETORIA_ADMIN_NAV.map((item) => (
        <DiretoriaNavLink key={item.href} item={item} activeSection={activeSection} openParam={openParam} />
      ))}
    </>
  );
}

const DIRETORIA_CRUMB_OVERRIDES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/checklists': 'Checklist',
  '/service-orders': 'Ordens de Serviço',
  '/calls': 'Chamados',
  '/reports': 'Relatórios',
  '/areas': 'Administração · Áreas',
  '/assets': 'Administração · Ativos',
  '/users': 'Administração · Usuários',
  '/settings': 'Configurações'
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loginAt = useAuthStore((s) => s.loginAt);
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
        {role === 'Directoria' ? (
          <DiretoriaNav pathname={pathname} />
        ) : (
          <>
            <div className="nav-label">OPERAÇÕES</div>
            {nav
              .filter((n) => access[n[0]].includes(role))
              .map((n) => (
                <Link key={n[0]} href={n[0]} className={'nav ' + (activeSection === n[0] ? 'active' : '')}>
                  <span className="nav-icon">{n[1]}</span>
                  {n[2]}
                </Link>
              ))}
          </>
        )}
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
              Vale Suíço Resort /{' '}
              <strong>
                {(role === 'Directoria' ? DIRETORIA_CRUMB_OVERRIDES[activeSection] : undefined) ??
                  nav.find((n) => n[0] === activeSection)?.[2] ??
                  ''}
              </strong>
            </div>
          </div>
          <div className="top-actions">
            {user && (
              <UserMenu
                user={user}
                loginAt={loginAt}
                onLogout={() => {
                  logout();
                  router.push('/login');
                }}
              />
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
