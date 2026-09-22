'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import { useInstances, useCreateInstance, useGenerateScheduled } from '@/features/checklist-instances/hooks';
import { useTemplates } from '@/features/templates/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useAreas } from '@/features/areas/hooks';
import { StatusBadge, isOverdue } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { toApiError } from '@/lib/api-error';
import { formatDate, formatDuration, todayIso } from '@/lib/format';
import { ChecklistStatus } from '@/types/api';

const statusOptions: (ChecklistStatus | 'Todos')[] = ['Todos', 'Pending', 'InProgress', 'Completed', 'Approved'];
const statusLabels: Record<string, string> = {
  Todos: 'Todos',
  Pending: 'Pendiente',
  InProgress: 'En progreso',
  Completed: 'Finalizado',
  Approved: 'Aprobado'
};

interface CreateForm {
  templateId: string;
  assetId: string;
  date: string;
}

function CreateInstancePanel({ onClose }: { onClose: () => void }) {
  const templates = useTemplates();
  const assets = useAssets();
  const createInstance = useCreateInstance();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<CreateForm>({
    defaultValues: { templateId: '', assetId: '', date: todayIso() }
  });

  async function onSubmit(values: CreateForm) {
    setError(null);
    if (!values.templateId || !values.assetId) {
      setError('Selecciona un template y un activo.');
      return;
    }
    try {
      await createInstance.mutateAsync(values);
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 className="card-title">Crear checklist manual</h2>
      <p className="card-sub">Genera una instancia desde un template para un activo.</p>
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-grid">
          <div className="field">
            <label>Template</label>
            <select {...register('templateId')} defaultValue="">
              <option value="" disabled>
                Selecciona un template
              </option>
              {(templates.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Activo</label>
            <select {...register('assetId')} defaultValue="">
              <option value="" disabled>
                Selecciona un activo
              </option>
              {(assets.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" {...register('date')} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={createInstance.isPending}>
            {createInstance.isPending ? 'Creando…' : 'Crear checklist'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChecklistsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = isSupervisorOrAbove(user?.role);
  const areas = useAreas();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<ChecklistStatus | 'Todos'>('Todos');
  const [areaId, setAreaId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const instances = useInstances({
    status,
    areaId: areaId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  });
  const generateScheduled = useGenerateScheduled();

  async function handleGenerateScheduled() {
    setGenMessage(null);
    try {
      const res = await generateScheduled.mutateAsync(todayIso());
      setGenMessage(`Generados ${res.created} checklists (${res.skipped} omitidos, ya existían).`);
    } catch (err) {
      setGenMessage(toApiError(err).message);
    }
  }

  const list = instances.data ?? [];

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Checklists</h1>
          <p className="page-subtitle">Gestiona las ejecuciones operativas del hotel.</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={handleGenerateScheduled} disabled={generateScheduled.isPending}>
              {generateScheduled.isPending ? 'Generando…' : 'Generar programados de hoy'}
            </button>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + Crear checklist
            </button>
          </div>
        )}
      </div>

      {genMessage && <ErrorBanner message={genMessage} />}
      {creating && <CreateInstancePanel onClose={() => setCreating(false)} />}

      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="btn btn-secondary" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
          <select className="btn btn-secondary" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Todas las áreas</option>
            {(areas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input type="date" className="btn btn-secondary" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" className="btn btn-secondary" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {list.length} resultados
        </span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Checklist</th>
              <th>Área / activo</th>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {instances.isLoading && (
              <tr>
                <td colSpan={6} className="muted">
                  Cargando…
                </td>
              </tr>
            )}
            {list.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.templateName}</b>
                </td>
                <td>{x.assetName}</td>
                <td>{formatDate(x.date)}</td>
                <td>{formatDuration(x.durationSeconds)}</td>
                <td>
                  <StatusBadge status={x.status} overdue={isOverdue(x.status, x.date)} />
                </td>
                <td className="actions">
                  <Link href={`/checklists/${x.id}`}>Ver</Link>
                </td>
              </tr>
            ))}
            {!instances.isLoading && list.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No hay checklists para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
