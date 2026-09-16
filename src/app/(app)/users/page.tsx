'use client';
import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser } from '@/features/users/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RequireRole } from '@/components/ui/require-role';
import { roleLabel } from '@/components/ui/status-badge';
import { toApiError } from '@/lib/api-error';
import { UserDto, UserRole } from '@/types/api';

const roles: UserRole[] = ['Admin', 'Supervisor', 'Operator', 'Manager'];

function UserForm({ initial, onClose }: { initial?: UserDto; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'Operator');
  const [error, setError] = useState<string | null>(null);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const pending = createUser.isPending || updateUser.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (initial) {
        await updateUser.mutateAsync({ id: initial.id, input: { name, role } });
      } else {
        await createUser.mutateAsync({ name, email, password, role });
      }
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 className="card-title">{initial ? 'Editar usuario' : 'Crear usuario'}</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          </div>
          <div className="field">
            <label>Correo</label>
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
              <label>Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
          )}
          <div className="field">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function UsersPage() {
  const users = useUsers();
  const deactivateUser = useDeactivateUser();
  const [editing, setEditing] = useState<UserDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDeactivate(user: UserDto) {
    if (!window.confirm(`¿Desactivar a ${user.name}?`)) return;
    setError(null);
    try {
      await deactivateUser.mutateAsync(user.id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <RequireRole roles={['Admin']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Usuarios</h1>
            <p className="page-subtitle">Administra el acceso del equipo al sistema.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Crear usuario
          </button>
        </div>

        <ErrorBanner message={error} />
        {editing && <UserForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td>
                    <span className={'status ' + (u.active ? 'approved' : 'overdue')}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button onClick={() => setEditing(u)}>Editar</button>
                    {u.active && <button onClick={() => onDeactivate(u)}>Desactivar</button>}
                  </td>
                </tr>
              ))}
              {users.isLoading && (
                <tr>
                  <td colSpan={5} className="muted">
                    Cargando…
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
