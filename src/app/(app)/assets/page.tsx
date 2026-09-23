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
      setError('Selecione uma área.');
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
      <h2 className="card-title">{initial ? 'Editar ativo' : 'Criar ativo'}</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <input value={type} onChange={(e) => setType(e.target.value)} required maxLength={100} placeholder="Quarto, Equipamento, Área comum…" />
          </div>
          <div className="field">
            <label>Área</label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="" disabled>
                Selecione uma área
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
              <label>Status</label>
              <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          )}
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

export default function AssetsPage() {
  const areas = useAreas();
  const [areaFilter, setAreaFilter] = useState('');
  const assets = useAssets({ areaId: areaFilter || undefined });
  const deleteAsset = useDeleteAsset();
  const [editing, setEditing] = useState<AssetDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const areaName = (id: string) => areas.data?.find((a) => a.id === id)?.name ?? '—';

  async function onDelete(asset: AssetDto) {
    if (!window.confirm(`Excluir o ativo "${asset.name}"?`)) return;
    setError(null);
    try {
      await deleteAsset.mutateAsync(asset.id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <RequireRole roles={['Directoria', 'Gerencia']}>
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Ativos</h1>
          <p className="page-subtitle">Configuração operacional do hotel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Criar ativo
        </button>
      </div>

      <ErrorBanner message={error} />
      {editing && <AssetForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}

      <div className="toolbar">
        <select className="btn btn-secondary" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="">Todas as áreas</option>
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
              <th>Nome</th>
              <th>Tipo</th>
              <th>Área</th>
              <th>Status</th>
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
                    {a.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="actions">
                  <button onClick={() => setEditing(a)}>Editar</button>
                  <button onClick={() => onDelete(a)}>Excluir</button>
                </td>
              </tr>
            ))}
            {assets.isLoading && (
              <tr>
                <td colSpan={5} className="muted">
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
