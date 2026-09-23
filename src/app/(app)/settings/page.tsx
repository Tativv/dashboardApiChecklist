'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store';
import { roleLabel } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const expiresAtUtc = useAuthStore((s) => s.expiresAtUtc);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="page">
      <h1 className="page-title">Configurações</h1>
      <p className="page-subtitle">Informações da sua conta e sessão.</p>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 className="card-title">Perfil</h2>
        <div className="detail-meta" style={{ marginTop: 12 }}>
          <div>
            <span className="kpi-label">Nome</span>
            <div>{user?.name}</div>
          </div>
          <div>
            <span className="kpi-label">E-mail</span>
            <div>{user?.email}</div>
          </div>
          <div>
            <span className="kpi-label">Perfil de acesso</span>
            <div>{user ? roleLabel(user.role) : ''}</div>
          </div>
          <div>
            <span className="kpi-label">Sessão expira em</span>
            <div>{formatDateTime(expiresAtUtc)}</div>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 22 }}
          onClick={() => {
            logout();
            router.push('/login');
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
