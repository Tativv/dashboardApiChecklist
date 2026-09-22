'use client';
import { useState } from 'react';
import { useAreas, useCreateArea, useUpdateArea, useDeleteArea } from '@/features/areas/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RequireRole } from '@/components/ui/require-role';
import { toApiError } from '@/lib/api-error';
import { AreaDto } from '@/types/api';

function AreaForm({
  initial,
  onClose
}: {
  initial?: AreaDto;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const pending = createArea.isPending || updateArea.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (initial) {
        await updateArea.mutateAsync({ id: initial.id, input: { name } });
      } else {
        await createArea.mutateAsync({ name });
      }
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 className="card-title">{initial ? 'Editar área' : 'Crear área'}</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
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

export default function AreasPage() {
  const areas = useAreas();
  const deleteArea = useDeleteArea();
  const [editing, setEditing] = useState<AreaDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(area: AreaDto) {
    if (!window.confirm(`¿Eliminar el área "${area.name}"?`)) return;
    setError(null);
    try {
      await deleteArea.mutateAsync(area.id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <RequireRole roles={['Directoria', 'Supervisor', 'Gerencia']}>
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Áreas</h1>
          <p className="page-subtitle">Configuración operacional del hotel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Crear área
        </button>
      </div>

      <ErrorBanner message={error} />
      {editing && (
        <AreaForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(areas.data ?? []).map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td className="actions">
                  <button onClick={() => setEditing(a)}>Editar</button>
                  <button onClick={() => onDelete(a)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {areas.isLoading && (
              <tr>
                <td colSpan={2} className="muted">
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
