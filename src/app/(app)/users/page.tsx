'use client';
import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser } from '@/features/users/hooks';
import { useAreas } from '@/features/areas/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RequireRole } from '@/components/ui/require-role';
import { roleLabel } from '@/components/ui/status-badge';
import { toApiError } from '@/lib/api-error';
import { AreaDto, UserDto, UserRole } from '@/types/api';

const roles: UserRole[] = ['Directoria', 'Supervisor', 'Colaborador', 'Gerencia'];

function UserForm({ initial, onClose }: { initial?: UserDto; onClose: () => void }) {
  const areas = useAreas();
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'Colaborador');
  const [areaIds, setAreaIds] = useState<string[]>(initial?.areaIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const pending = createUser.isPending || updateUser.isPending;

  function toggleArea(areaId: string) {
    setAreaIds((prev) => (prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (initial) {
        await updateUser.mutateAsync({ id: initial.id, input: { name, role, areaIds } });
      } else {
        await createUser.mutateAsync({ name, email, password, role, areaIds });
      }
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 className="card-title">{initial ? 'Editar usuário' : 'Criar usuário'}</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          </div>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!initial}
            />
          </div>
          {!initial && (
            <div className="field">
              <label>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
          )}
          <div className="field">
            <label>Perfil</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Áreas que cobre</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(areas.data ?? []).map((a: AreaDto) => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={areaIds.includes(a.id)}
                  onChange={() => toggleArea(a.id)}
                />
                {a.name}
              </label>
            ))}
            {(areas.data ?? []).length === 0 && <span className="muted">Nenhuma área configurada.</span>}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function UsersPage() {
  const users = useUsers();
  const areas = useAreas();
  const deactivateUser = useDeactivateUser();
  const areaNameById = new Map((areas.data ?? []).map((a) => [a.id, a.name]));
  const [editing, setEditing] = useState<UserDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDeactivate(user: UserDto) {
    if (!window.confirm(`Desativar ${user.name}?`)) return;
    setError(null);
    try {
      await deactivateUser.mutateAsync(user.id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <RequireRole roles={['Directoria']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Usuários</h1>
            <p className="page-subtitle">Gerencie o acesso da equipe ao sistema.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Criar usuário
          </button>
        </div>

        <ErrorBanner message={error} />
        {editing && <UserForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Áreas</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td className="muted">
                    {u.areaIds.length > 0
                      ? u.areaIds.map((id) => areaNameById.get(id) ?? id).join(', ')
                      : '—'}
                  </td>
                  <td>
                    <span className={'status ' + (u.active ? 'approved' : 'overdue')}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button onClick={() => setEditing(u)}>Editar</button>
                    {u.active && <button onClick={() => onDeactivate(u)}>Desativar</button>}
                  </td>
                </tr>
              ))}
              {users.isLoading && (
                <tr>
                  <td colSpan={6} className="muted">
                    Carregando…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequireRole>
  );
}
