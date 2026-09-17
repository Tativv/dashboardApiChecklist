'use client';
import { useEffect, useState } from 'react';
import {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useConfigureTemplateAssets
} from '@/features/templates/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useAssets } from '@/features/assets/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { RequireRole } from '@/components/ui/require-role';
import { recurrenceLabel } from '@/components/ui/status-badge';
import { toApiError } from '@/lib/api-error';
import {
  ChecklistTaskInput,
  ChecklistTemplateListItemDto,
  CustomRecurrenceMode,
  DayOfWeekName,
  RecurrenceIntervalUnit,
  RecurrenceType
} from '@/types/api';

const recurrences: RecurrenceType[] = ['Daily', 'Weekly', 'Monthly', 'Custom'];

const intervalUnits: { value: RecurrenceIntervalUnit; label: string }[] = [
  { value: 'Days', label: 'Días' },
  { value: 'Weeks', label: 'Semanas' },
  { value: 'Months', label: 'Meses' }
];

const daysOfWeek: { value: DayOfWeekName; label: string }[] = [
  { value: 'Monday', label: 'Lun' },
  { value: 'Tuesday', label: 'Mar' },
  { value: 'Wednesday', label: 'Mié' },
  { value: 'Thursday', label: 'Jue' },
  { value: 'Friday', label: 'Vie' },
  { value: 'Saturday', label: 'Sáb' },
  { value: 'Sunday', label: 'Dom' }
];

interface FormState {
  name: string;
  description: string;
  areaId: string;
  recurrenceType: RecurrenceType;
  estimatedDurationMinutes: number;
  scheduledTime: string;
  customRecurrenceMode: CustomRecurrenceMode | '';
  recurrenceIntervalValue: string;
  recurrenceIntervalUnit: RecurrenceIntervalUnit | '';
  recurrenceDaysOfWeek: DayOfWeekName[];
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
          scheduledTime: existing.data.scheduledTime,
          customRecurrenceMode: existing.data.customRecurrenceMode ?? '',
          recurrenceIntervalValue: existing.data.recurrenceIntervalValue ? String(existing.data.recurrenceIntervalValue) : '',
          recurrenceIntervalUnit: existing.data.recurrenceIntervalUnit ?? '',
          recurrenceDaysOfWeek: existing.data.recurrenceDaysOfWeek,
          tasks: existing.data.tasks.map((t) => ({ name: t.name, description: t.description ?? '', order: t.order }))
        }
      : {
          name: '',
          description: '',
          areaId: '',
          recurrenceType: 'Daily',
          estimatedDurationMinutes: 15,
          scheduledTime: '08:00',
          customRecurrenceMode: '',
          recurrenceIntervalValue: '',
          recurrenceIntervalUnit: '',
          recurrenceDaysOfWeek: [],
          tasks: []
        }
  );

  if (templateId && existing.isLoading) {
    return <div className="panel">Cargando template…</div>;
  }

  const pending = createTemplate.isPending || updateTemplate.isPending;

  function updateTask(index: number, patch: Partial<ChecklistTaskInput>) {
    setForm((f) => ({ ...f, tasks: f.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }

  function addTask() {
    setForm((f) => ({ ...f, tasks: [...f.tasks, { name: '', description: '', order: f.tasks.length + 1 }] }));
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

  function toggleDayOfWeek(day: DayOfWeekName) {
    setForm((f) => ({
      ...f,
      recurrenceDaysOfWeek: f.recurrenceDaysOfWeek.includes(day)
        ? f.recurrenceDaysOfWeek.filter((d) => d !== day)
        : [...f.recurrenceDaysOfWeek, day]
    }));
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
    if (form.recurrenceType === 'Custom') {
      if (!form.customRecurrenceMode) {
        setError('Selecciona un modo de recurrencia personalizada.');
        return;
      }
      if (form.customRecurrenceMode === 'Interval' && (!form.recurrenceIntervalValue || Number(form.recurrenceIntervalValue) <= 0 || !form.recurrenceIntervalUnit)) {
        setError('Completa el intervalo (cantidad y unidad).');
        return;
      }
      if (form.customRecurrenceMode === 'DaysOfWeek' && form.recurrenceDaysOfWeek.length === 0) {
        setError('Selecciona al menos un día de la semana.');
        return;
      }
    }
    const input = {
      name: form.name,
      description: form.description || null,
      areaId: form.areaId,
      recurrenceType: form.recurrenceType,
      estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
      scheduledTime: form.scheduledTime,
      customRecurrenceMode: form.recurrenceType === 'Custom' ? (form.customRecurrenceMode || null) : null,
      recurrenceIntervalValue:
        form.recurrenceType === 'Custom' && form.customRecurrenceMode === 'Interval' ? Number(form.recurrenceIntervalValue) : null,
      recurrenceIntervalUnit:
        form.recurrenceType === 'Custom' && form.customRecurrenceMode === 'Interval' ? (form.recurrenceIntervalUnit || null) : null,
      recurrenceDaysOfWeek:
        form.recurrenceType === 'Custom' && form.customRecurrenceMode === 'DaysOfWeek' ? form.recurrenceDaysOfWeek : null,
      tasks: form.tasks.map((t) => ({ ...t, description: t.description || null }))
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
            <label>Hora programada</label>
            <input
              type="time"
              value={form.scheduledTime}
              onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
              required
            />
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

        {form.recurrenceType === 'Custom' && (
          <div className="panel" style={{ marginTop: 16, background: '#fafbfc' }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Recurrencia personalizada</label>
            <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="radio"
                  name="customMode"
                  checked={form.customRecurrenceMode === 'Interval'}
                  onChange={() => setForm((f) => ({ ...f, customRecurrenceMode: 'Interval' }))}
                />
                Intervalo
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="radio"
                  name="customMode"
                  checked={form.customRecurrenceMode === 'DaysOfWeek'}
                  onChange={() => setForm((f) => ({ ...f, customRecurrenceMode: 'DaysOfWeek' }))}
                />
                Días específicos
              </label>
            </div>

            {form.customRecurrenceMode === 'Interval' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  Cada
                </span>
                <input
                  type="number"
                  min={1}
                  style={{ width: 80 }}
                  value={form.recurrenceIntervalValue}
                  onChange={(e) => setForm((f) => ({ ...f, recurrenceIntervalValue: e.target.value }))}
                />
                <select
                  value={form.recurrenceIntervalUnit}
                  onChange={(e) => setForm((f) => ({ ...f, recurrenceIntervalUnit: e.target.value as RecurrenceIntervalUnit }))}
                >
                  <option value="" disabled>
                    Unidad
                  </option>
                  {intervalUnits.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.customRecurrenceMode === 'DaysOfWeek' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {daysOfWeek.map((d) => (
                  <label
                    key={d.value}
                    style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13, border: '1px solid #dfe3ea', borderRadius: 7, padding: '5px 10px' }}
                  >
                    <input
                      type="checkbox"
                      checked={form.recurrenceDaysOfWeek.includes(d.value)}
                      onChange={() => toggleDayOfWeek(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tareas</label>
          {form.tasks.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
              <span className="muted" style={{ width: 20, marginTop: 10 }}>
                {i + 1}.
              </span>
              <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                <input value={t.name} onChange={(e) => updateTask(i, { name: e.target.value })} placeholder="Nombre de la tarea" />
                <input
                  value={t.description ?? ''}
                  onChange={(e) => updateTask(i, { description: e.target.value })}
                  placeholder="Descripción (opcional)"
                  style={{ fontSize: 12 }}
                />
              </div>
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

function ConfigureAssetsPanel({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const template = useTemplate(templateId);
  const assets = useAssets({ areaId: template.data?.areaId, active: true });
  const configureMutation = useConfigureTemplateAssets();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template.data) setSelected(template.data.assetIds);
  }, [template.data]);

  const assetList = assets.data ?? [];
  const allSelected = assetList.length > 0 && assetList.every((a) => selected.includes(a.id));

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : assetList.map((a) => a.id));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await configureMutation.mutateAsync({ id: templateId, input: { assetIds: selected } });
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20, maxWidth: 620 }}>
      <h2 className="card-title">Configurar activos {template.data ? `de "${template.data.name}"` : ''}</h2>
      <p className="card-sub">Los activos asociados serán usados por la generación programada de checklists.</p>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        {template.isLoading || assets.isLoading ? (
          <p className="muted">Cargando activos…</p>
        ) : (
          <>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--line)' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={assetList.length === 0} />
              Seleccionar todos
            </label>
            <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 8 }}>
              {assetList.map((a) => (
                <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                  <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                  {a.name}
                </label>
              ))}
              {assetList.length === 0 && <p className="muted">No hay activos activos en esta área.</p>}
            </div>
          </>
        )}
        <p className="muted" style={{ fontSize: 13, fontWeight: 600, marginTop: 14 }}>
          {selected.length} activos seleccionados
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="btn btn-primary" disabled={configureMutation.isPending}>
            {configureMutation.isPending ? 'Guardando…' : 'Guardar'}
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
  const [configuringId, setConfiguringId] = useState<string | null>(null);
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
      {configuringId && <ConfigureAssetsPanel templateId={configuringId} onClose={() => setConfiguringId(null)} />}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Área</th>
              <th>Recurrencia</th>
              <th>Hora</th>
              <th>Tareas</th>
              <th>Activos</th>
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
                <td>{t.scheduledTime}</td>
                <td>{t.taskCount} tareas</td>
                <td>{t.assetCount} activos</td>
                <td>{t.estimatedDurationMinutes} min</td>
                <td className="actions">
                  <button onClick={() => setEditing(t.id)}>Editar</button>
                  <button onClick={() => setConfiguringId(t.id)}>Configurar activos</button>
                  <button onClick={() => onDelete(t)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {templates.isLoading && (
              <tr>
                <td colSpan={8} className="muted">
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
