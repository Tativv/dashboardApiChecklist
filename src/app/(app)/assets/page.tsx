'use client';
import { useState } from 'react';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/features/assets/hooks';
import { useAreas } from '@/features/areas/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RequireRole } from '@/components/ui/require-role';
import { toApiError } from '@/lib/api-error';
import { AssetDto } from '@/types/api';

function AssetForm({ initial, onClose }: { initial?: AssetDto; onClose: () => void }) {
  const areas = useAreas();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? '');
  const [areaId, setAreaId] = useState(initial?.areaId ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const pending = createAsset.isPending || updateAsset.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!areaId) {
      setError('Selecciona un área.');
      return;
    }
    try {
      if (initial) {
        await updateAsset.mutateAsync({ id: initial.id, input: { name, type, areaId, active } });
      } else {
        await createAsset.mutateAsync({ name, type, areaId });
      }
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 className="card-title">{initial ? 'Editar activo' : 'Crear activo'}</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <input value={type} onChange={(e) => setType(e.target.value)} required maxLength={100} placeholder="Habitación, Equipo, Zona común…" />
          </div>
          <div className="field">
            <label>Área</label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="" disabled>
                Selecciona un área
              </option>
              {(areas.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {initial && (
            <div className="field">
              <label>Estado</label>
              <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
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

export default function AssetsPage() {
  const areas = useAreas();
  const [areaFilter, setAreaFilter] = useState('');
  const assets = useAssets({ areaId: areaFilter || undefined });
  const deleteAsset = useDeleteAsset();
  const [editing, setEditing] = useState<AssetDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const areaName = (id: string) => areas.data?.find((a) => a.id === id)?.name ?? '—';

  async function onDelete(asset: AssetDto) {
    if (!window.confirm(`¿Eliminar el activo "${asset.name}"?`)) return;
    setError(null);
    try {
      await deleteAsset.mutateAsync(asset.id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <RequireRole roles={['Directoria', 'Supervisor', 'Gerencia']}>
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Activos</h1>
          <p className="page-subtitle">Configuración operacional del hotel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Crear activo
        </button>
      </div>

      <ErrorBanner message={error} />
      {editing && <AssetForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}

      <div className="toolbar">
        <select className="btn btn-secondary" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="">Todas las áreas</option>
          {(areas.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(assets.data ?? []).map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.type}</td>
                <td>{areaName(a.areaId)}</td>
                <td>
                  <span className={'status ' + (a.active ? 'approved' : 'overdue')}>
                    {a.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="actions">
                  <button onClick={() => setEditing(a)}>Editar</button>
                  <button onClick={() => onDelete(a)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {assets.isLoading && (
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
