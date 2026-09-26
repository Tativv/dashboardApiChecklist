'use client';
import { useEffect, useRef, useState } from 'react';
import { AuthUser } from '@/features/auth/store';
import { useChangePassword } from '@/features/auth/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useUser } from '@/features/users/hooks';
import { roleLabel } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { toApiError, fieldError } from '@/lib/api-error';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 480
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MeuPerfilModal({ user, loginAt, onClose }: { user: AuthUser; loginAt: string | null; onClose: () => void }) {
  const areasQuery = useAreas();
  const userQuery = useUser(user.id);
  const linkedAreaIds = userQuery.data?.areaIds ?? [];
  const linkedAreaNames = (areasQuery.data ?? []).filter((a) => linkedAreaIds.includes(a.id)).map((a) => a.name);

  return (
    <ModalShell title="Meu Perfil" subtitle="Informações da sua conta" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
        <span className="avatar" style={{ width: 64, height: 64, fontSize: 20 }}>
          {initials(user.name)}
        </span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{user.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {roleLabel(user.role)}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            E-mail
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{user.email}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Áreas vinculadas
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>
            {userQuery.isLoading
              ? 'Carregando…'
              : linkedAreaNames.length > 0
                ? linkedAreaNames.join(', ')
                : userQuery.isError
                  ? 'Não disponível'
                  : 'Nenhuma área vinculada'}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Último acesso
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{loginAt ? formatDateTime(loginAt) : 'Não disponível'}</div>
        </div>
      </div>
    </ModalShell>
  );
}

function AlterarSenhaModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const changePassword = useChangePassword();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('A nova senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha.');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <ModalShell title="Alterar Senha" subtitle="Defina uma nova senha de acesso" onClose={onClose}>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="field">
            <label>Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {fieldError(changePassword.error, 'CurrentPassword') && (
              <span className="field-error">{fieldError(changePassword.error, 'CurrentPassword')}</span>
            )}
          </div>
          <div className="field">
            <label>Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function UserMenu({ user, loginAt, onLogout }: { user: AuthUser; loginAt: string | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button type="button" className="user-menu-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="avatar">{initials(user.name)}</span>
        <span className="user-menu-info">
          <span className="user-menu-name">{user.name}</span>
          <span className="user-menu-role">{roleLabel(user.role)}</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              setShowProfile(true);
            }}
          >
            Meu Perfil
          </button>
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              setShowChangePassword(true);
            }}
          >
            Alterar Senha
          </button>
          <div className="user-menu-divider" />
          <button type="button" className="user-menu-item user-menu-item-danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      )}
      {showProfile && <MeuPerfilModal user={user} loginAt={loginAt} onClose={() => setShowProfile(false)} />}
      {showChangePassword && <AlterarSenhaModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
