'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuthStore, isManagerOrAbove, isExactlySupervisor } from '@/features/auth/store';
import { useInstances, useCreateInstance, useGenerateScheduled, useDeleteInstance } from '@/features/checklist-instances/hooks';
import { useTemplates } from '@/features/templates/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useAreas } from '@/features/areas/hooks';
import { StatusBadge, isOverdue } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { toApiError } from '@/lib/api-error';
import { formatDate, formatDuration, todayIso } from '@/lib/format';
import { ChecklistStatus } from '@/types/api';

const statusOptions: (ChecklistStatus | 'Todos')[] = ['Todos', 'Pending', 'Approved', 'InProgress', 'Completed', 'Reviewed'];
const statusLabels: Record<string, string> = {
  Todos: 'Todos',
  Pending: 'Pendente',
  Approved: 'Aprovado',
  InProgress: 'Em andamento',
  Completed: 'Concluído',
  Reviewed: 'Revisado'
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
      setError('Selecione um template e um ativo.');
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
      <h2 className="card-title">Criar checklist manual</h2>
      <p className="card-sub">Gera uma instância a partir de um template para um ativo.</p>
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-grid">
          <div className="field">
            <label>Template</label>
            <select {...register('templateId')} defaultValue="">
              <option value="" disabled>
                Selecione um template
              </option>
              {(templates.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Ativo</label>
            <select {...register('assetId')} defaultValue="">
              <option value="" disabled>
                Selecione um ativo
              </option>
              {(assets.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input type="date" {...register('date')} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={createInstance.isPending}>
            {createInstance.isPending ? 'Criando…' : 'Criar checklist'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChecklistsPage() {
  const user = useAuthStore((s) => s.user);
  const canManageInstances = isManagerOrAbove(user?.role);
  const isSupervisor = isExactlySupervisor(user?.role);
  const areas = useAreas();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<ChecklistStatus | 'Todos'>('Todos');
  const [areaId, setAreaId] = useState('');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const instances = useInstances({
    status,
    areaId: areaId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  });
  const generateScheduled = useGenerateScheduled();
  const deleteInstance = useDeleteInstance();

  async function handleGenerateScheduled() {
    setGenMessage(null);
    try {
      const res = await generateScheduled.mutateAsync(todayIso());
      setGenMessage(`${res.created} checklists gerados (${res.skipped} ignorados, já existiam).`);
    } catch (err) {
      setGenMessage(toApiError(err).message);
    }
  }

  async function handleDelete(id: string, templateName: string) {
    if (!window.confirm(`Excluir o checklist "${templateName}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    try {
      await deleteInstance.mutateAsync(id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  const list = instances.data ?? [];

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Checklists</h1>
          <p className="page-subtitle">Gerencie as execuções operacionais do hotel.</p>
        </div>
        {canManageInstances && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={handleGenerateScheduled} disabled={generateScheduled.isPending}>
              {generateScheduled.isPending ? 'Gerando…' : 'Gerar programados de hoje'}
            </button>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + Criar checklist
            </button>
          </div>
        )}
      </div>

      {genMessage && <ErrorBanner message={genMessage} />}
      <ErrorBanner message={error} />
      {creating && <CreateInstancePanel onClose={() => setCreating(false)} />}

      {isSupervisor && !instances.isLoading && list.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 12 }}>
          Se a lista continuar vazia mesmo ajustando os filtros, pode ser que você ainda não tenha
          nenhuma área designada — fale com a Gerência ou a Diretoria para que te associem a uma área.
        </p>
      )}

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
            <option value="">Todas as áreas</option>
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
              <th>Área / ativo</th>
              <th>Data</th>
              <th>Duração</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {instances.isLoading && (
              <tr>
                <td colSpan={6} className="muted">
                  Carregando…
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
                  {canManageInstances && (
                    <button onClick={() => handleDelete(x.id, x.templateName)} disabled={deleteInstance.isPending}>
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!instances.isLoading && list.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum checklist encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
