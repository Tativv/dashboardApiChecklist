'use client';
import { useState } from 'react';
import {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useApplyTemplateToAssets
} from '@/features/templates/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useUsers } from '@/features/users/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RequireRole } from '@/components/ui/require-role';
import { recurrenceLabel } from '@/components/ui/status-badge';
import { toApiError } from '@/lib/api-error';
import { todayIso } from '@/lib/format';
import { ChecklistTaskInput, ChecklistTemplateListItemDto, RecurrenceType } from '@/types/api';

const recurrences: RecurrenceType[] = ['Daily', 'Weekly', 'Monthly', 'Custom'];

interface FormState {
  name: string;
  description: string;
  areaId: string;
  recurrenceType: RecurrenceType;
  estimatedDurationMinutes: number;
  tasks: ChecklistTaskInput[];
}

function TemplateForm({ templateId, onClose }: { templateId?: string; onClose: () => void }) {
  const areas = useAreas();
  const existing = useTemplate(templateId);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    existing.data
      ? {
          name: existing.data.name,
          description: existing.data.description ?? '',
          areaId: existing.data.areaId,
          recurrenceType: existing.data.recurrenceType,
          estimatedDurationMinutes: existing.data.estimatedDurationMinutes,
          tasks: existing.data.tasks.map((t) => ({ name: t.name, order: t.order }))
        }
      : { name: '', description: '', areaId: '', recurrenceType: 'Daily', estimatedDurationMinutes: 15, tasks: [] }
  );

  if (templateId && existing.isLoading) {
    return <div className="panel">Cargando template…</div>;
  }

  const pending = createTemplate.isPending || updateTemplate.isPending;

  function updateTask(index: number, name: string) {
    setForm((f) => ({ ...f, tasks: f.tasks.map((t, i) => (i === index ? { ...t, name } : t)) }));
  }

  function addTask() {
    setForm((f) => ({ ...f, tasks: [...f.tasks, { name: '', order: f.tasks.length + 1 }] }));
  }

  function removeTask(index: number) {
    setForm((f) => ({
      ...f,
      tasks: f.tasks.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i + 1 }))
    }));
  }

  function moveTask(index: number, dir: -1 | 1) {
    setForm((f) => {
      const tasks = [...f.tasks];
      const target = index + dir;
      if (target < 0 || target >= tasks.length) return f;
      [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
      return { ...f, tasks: tasks.map((t, i) => ({ ...t, order: i + 1 })) };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.areaId) {
      setError('Selecciona un área.');
      return;
    }
    if (form.tasks.length === 0 || form.tasks.some((t) => !t.name.trim())) {
      setError('Agrega al menos una tarea y completa su nombre.');
      return;
    }
    const input = {
      name: form.name,
      description: form.description || null,
      areaId: form.areaId,
      recurrenceType: form.recurrenceType,
      estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
      tasks: form.tasks
    };
    try {
      if (templateId) {
        await updateTemplate.mutateAsync({ id: templateId, input });
      } else {
        await createTemplate.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20, maxWidth: 780 }}>
      <h2 className="card-title">{templateId ? 'Editar template' : 'Crear template'}</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nombre</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={200} />
          </div>
          <div className="field">
            <label>Área</label>
            <select value={form.areaId} onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}>
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
          <div className="field">
            <label>Recurrencia</label>
            <select
              value={form.recurrenceType}
              onChange={(e) => setForm((f) => ({ ...f, recurrenceType: e.target.value as RecurrenceType }))}
            >
              {recurrences.map((r) => (
                <option key={r} value={r}>
                  {recurrenceLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Duración estimada (min)</label>
            <input
              type="number"
              min={1}
              value={form.estimatedDurationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, estimatedDurationMinutes: Number(e.target.value) }))}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Descripción</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={1000}
            />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tareas</label>
          {form.tasks.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <span className="muted" style={{ width: 20 }}>
                {i + 1}.
              </span>
              <input style={{ flex: 1 }} value={t.name} onChange={(e) => updateTask(i, e.target.value)} placeholder="Nombre de la tarea" />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveTask(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveTask(i, 1)} disabled={i === form.tasks.length - 1}>
                ↓
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeTask(i)}>
                Quitar
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addTask}>
            + Agregar tarea
          </button>
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

function ApplyToAssetsPanel({ template, onClose }: { template: ChecklistTemplateListItemDto; onClose: () => void }) {
  const assets = useAssets({ areaId: template.areaId, active: true });
  const users = useUsers({ active: true });
  const applyMutation = useApplyTemplateToAssets();
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(todayIso());
  const [assignedUserId, setAssignedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (selected.length === 0) {
      setError('Selecciona al menos un activo.');
      return;
    }
    try {
      const res = await applyMutation.mutateAsync({
        id: template.id,
        input: { assetIds: selected, date, assignedUserId: assignedUserId || null }
      });
      setResult({ created: res.created, skipped: res.skipped });
      setSelected([]);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20, maxWidth: 620 }}>
      <h2 className="card-title">Aplicar &quot;{template.name}&quot; a activos</h2>
      <p className="card-sub">Crea una instancia de checklist por cada activo seleccionado.</p>
      <ErrorBanner message={error} />
      {result && (
        <div className="error-banner success">
          Creados: {result.created} · Omitidos (ya existían): {result.skipped}
        </div>
      )}
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Asignar a (opcional)</label>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
              <option value="">Sin asignar</option>
              {(users.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Activos del área</label>
          <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 8 }}>
            {(assets.data ?? []).map((a) => (
              <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                {a.name}
              </label>
            ))}
            {assets.data && assets.data.length === 0 && <p className="muted">No hay activos activos en esta área.</p>}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="btn btn-primary" disabled={applyMutation.isPending}>
            {applyMutation.isPending ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TemplatesPage() {
  const areas = useAreas();
  const templates = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [applying, setApplying] = useState<ChecklistTemplateListItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const areaName = (id: string) => areas.data?.find((a) => a.id === id)?.name ?? '—';

  async function onDelete(t: ChecklistTemplateListItemDto) {
    if (!window.confirm(`¿Eliminar el template "${t.name}"?`)) return;
    setError(null);
    try {
      await deleteTemplate.mutateAsync(t.id);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <RequireRole roles={['Admin', 'Supervisor', 'Manager']}>
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Configuración operacional del hotel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Crear template
        </button>
      </div>

      <ErrorBanner message={error} />
      {editing && <TemplateForm templateId={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {applying && <ApplyToAssetsPanel template={applying} onClose={() => setApplying(null)} />}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Área</th>
              <th>Recurrencia</th>
              <th>Tareas</th>
              <th>Duración</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(templates.data ?? []).map((t) => (
              <tr key={t.id}>
                <td>
                  <b>{t.name}</b>
                </td>
                <td>{areaName(t.areaId)}</td>
                <td>{recurrenceLabel(t.recurrenceType)}</td>
                <td>{t.taskCount} tareas</td>
                <td>{t.estimatedDurationMinutes} min</td>
                <td className="actions">
                  <button onClick={() => setEditing(t.id)}>Editar</button>
                  <button onClick={() => setApplying(t)}>Aplicar a activos</button>
                  <button onClick={() => onDelete(t)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {templates.isLoading && (
              <tr>
                <td colSpan={6} className="muted">
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
