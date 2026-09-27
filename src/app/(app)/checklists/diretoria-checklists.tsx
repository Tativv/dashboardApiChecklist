'use client';
import { useEffect, useRef, useState } from 'react';
import { useAreas } from '@/features/areas/hooks';
import { useAuthStore } from '@/features/auth/store';
import { useTemplates, useTemplate, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/features/templates/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ScheduleEditor, emptySchedule } from '@/components/ui/schedule-editor';
import { roleLabel } from '@/components/ui/status-badge';
import { toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import {
  ChecklistTaskInput,
  ChecklistTemplateDto,
  ChecklistTemplateListItemDto,
  ScheduleFrequencyType,
  ScheduleInput,
  TaskExecutionMode
} from '@/types/api';

const FREQUENCY_LABEL: Record<ScheduleFrequencyType, string> = { Daily: 'Diária', Weekly: 'Semanal', Monthly: 'Mensal' };

function frequencySummary(t?: ChecklistTemplateDto): string {
  if (!t) return '…';
  if (t.executionMode === 'Continuous') return 'Contínuo';
  if (t.schedules.length === 0) return '—';
  const types = Array.from(new Set(t.schedules.map((s) => s.frequencyType)));
  return types.map((f) => FREQUENCY_LABEL[f]).join(' / ');
}

const HISTORY_KEY = 'hotelops-checklist-template-history';

interface TemplateHistoryEntry {
  id: string;
  templateId: string;
  action: string;
  authorName: string;
  atIso: string;
}

function loadAllHistory(): TemplateHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as TemplateHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function appendHistory(entry: Omit<TemplateHistoryEntry, 'id'>) {
  try {
    const all = loadAllHistory();
    all.push({ ...entry, id: `h-${Date.now()}-${Math.round(Math.random() * 1000)}` });
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(-500)));
  } catch {
    // ignora falha de armazenamento local (modo privado, quota, etc.)
  }
}

function historyForTemplate(templateId: string): TemplateHistoryEntry[] {
  return loadAllHistory()
    .filter((h) => h.templateId === templateId)
    .sort((a, b) => (a.atIso < b.atIso ? 1 : -1));
}

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface FormState {
  name: string;
  description: string;
  areaId: string;
  executionMode: TaskExecutionMode;
  schedules: ScheduleInput[];
  tasks: ChecklistTaskInput[];
}

function emptyTask(order: number): ChecklistTaskInput {
  return { name: '', description: '', order, estimatedDurationMinutes: null, executionMode: 'Scheduled', schedules: [emptySchedule(0)] };
}

function toFormState(t: ChecklistTemplateDto): FormState {
  return {
    name: t.name,
    description: t.description ?? '',
    areaId: t.areaId,
    executionMode: t.executionMode,
    schedules: t.schedules.map((s) => ({ ...s })),
    tasks: t.tasks.map((task) => ({
      name: task.name,
      description: task.description ?? '',
      order: task.order,
      estimatedDurationMinutes: task.estimatedDurationMinutes ?? null,
      executionMode: task.executionMode,
      schedules: task.schedules.map((s) => ({ ...s }))
    }))
  };
}

const PANEL_TABS = ['Informações', 'Tarefas', 'Histórico'] as const;
type PanelTab = (typeof PANEL_TABS)[number];

function TemplateSidePanel({
  templateId,
  areaOptions,
  onClose
}: {
  templateId?: string;
  areaOptions: { value: string; label: string }[];
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [currentId, setCurrentId] = useState(templateId);
  const detail = useTemplate(currentId);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [tab, setTab] = useState<PanelTab>('Informações');
  const [form, setForm] = useState<FormState | null>(
    templateId ? null : { name: '', description: '', areaId: '', executionMode: 'Scheduled', schedules: [emptySchedule(0)], tasks: [] }
  );
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<TemplateHistoryEntry[]>(currentId ? historyForTemplate(currentId) : []);

  useEffect(() => {
    if (detail.data) setForm(toFormState(detail.data));
  }, [detail.data]);

  useEffect(() => {
    setHistory(currentId ? historyForTemplate(currentId) : []);
  }, [currentId]);

  const isCreating = !currentId;
  const pending = createTemplate.isPending || updateTemplate.isPending;

  function updateTask(index: number, patch: Partial<ChecklistTaskInput>) {
    setForm((f) => (f ? { ...f, tasks: f.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)) } : f));
  }

  function setTaskExecutionMode(index: number, mode: TaskExecutionMode) {
    updateTask(index, { executionMode: mode, schedules: mode === 'Scheduled' ? [emptySchedule(0)] : [] });
  }

  function addTask() {
    setForm((f) => (f ? { ...f, tasks: [...f.tasks, emptyTask(f.tasks.length + 1)] } : f));
  }

  function removeTask(index: number) {
    setForm((f) => (f ? { ...f, tasks: f.tasks.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i + 1 })) } : f));
  }

  function moveTask(index: number, dir: -1 | 1) {
    setForm((f) => {
      if (!f) return f;
      const tasks = [...f.tasks];
      const target = index + dir;
      if (target < 0 || target >= tasks.length) return f;
      [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
      return { ...f, tasks: tasks.map((t, i) => ({ ...t, order: i + 1 })) };
    });
  }

  function validate(f: FormState): string | null {
    if (!f.name.trim()) return 'Informe o nome do checklist.';
    if (!f.areaId) return 'Selecione a área.';
    if (f.executionMode === 'Scheduled') {
      if (f.schedules.length === 0) return 'Adicione pelo menos um horário de execução.';
      if (f.schedules.some((s) => s.frequencyType === 'Weekly' && !s.weekDay)) return 'Selecione o dia da semana em todos os horários semanais.';
      if (f.schedules.some((s) => s.frequencyType === 'Monthly' && !s.dayOfMonth)) return 'Informe o dia do mês em todos os horários mensais.';
    }
    if (f.tasks.length === 0 || f.tasks.some((t) => !t.name.trim())) return 'Adicione pelo menos uma tarefa e preencha o nome.';
    if (f.tasks.some((t) => t.executionMode === 'Scheduled' && t.schedules.length === 0)) return 'Toda tarefa agendada precisa de pelo menos um horário.';
    return null;
  }

  async function onSave() {
    if (!form) return;
    setError(null);
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    const input = {
      name: form.name,
      description: form.description || null,
      areaId: form.areaId,
      executionMode: form.executionMode,
      schedules: form.executionMode === 'Scheduled' ? form.schedules : [],
      tasks: form.tasks.map((t) => ({ ...t, description: t.description || null }))
    };
    try {
      if (isCreating) {
        const created = await createTemplate.mutateAsync(input);
        appendHistory({
          templateId: created.id,
          action: 'Checklist criado',
          authorName: user?.name ?? 'Usuário',
          atIso: new Date().toISOString()
        });
        onClose();
        return;
      }
      const result = await updateTemplate.mutateAsync({ id: currentId as string, input });
      appendHistory({
        templateId: result.id,
        action: 'Informações e tarefas atualizadas',
        authorName: user?.name ?? 'Usuário',
        atIso: new Date().toISOString()
      });
      if (result.versionedAsNewTemplate) {
        setInfoMessage('Como este checklist já tem execuções registradas, foi criada uma nova versão. O histórico existente não é afetado.');
        setCurrentId(result.id);
      } else {
        setInfoMessage('Alterações salvas.');
      }
      setHistory(historyForTemplate(result.id));
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function onDuplicate() {
    if (!detail.data) return;
    setError(null);
    try {
      const src = detail.data;
      const created = await createTemplate.mutateAsync({
        name: `${src.name} (cópia)`,
        description: src.description ?? null,
        areaId: src.areaId,
        executionMode: src.executionMode,
        schedules: src.schedules.map((s) => ({
          frequencyType: s.frequencyType,
          intervalValue: s.intervalValue,
          weekDay: s.weekDay ?? null,
          dayOfMonth: s.dayOfMonth ?? null,
          timeOfDay: s.timeOfDay,
          executionOrder: s.executionOrder
        })),
        tasks: src.tasks.map((t) => ({
          name: t.name,
          description: t.description ?? null,
          order: t.order,
          estimatedDurationMinutes: t.estimatedDurationMinutes ?? null,
          executionMode: t.executionMode,
          schedules: t.schedules.map((s) => ({
            frequencyType: s.frequencyType,
            intervalValue: s.intervalValue,
            weekDay: s.weekDay ?? null,
            dayOfMonth: s.dayOfMonth ?? null,
            timeOfDay: s.timeOfDay,
            executionOrder: s.executionOrder
          }))
        }))
      });
      appendHistory({
        templateId: created.id,
        action: `Duplicado a partir de "${src.name}"`,
        authorName: user?.name ?? 'Usuário',
        atIso: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  function onDeactivate() {
    setError(null);
    setInfoMessage('Desativar checklists ainda não está disponível — o backend não suporta esse estado para templates.');
  }

  async function onDelete() {
    if (!detail.data || !currentId) return;
    if (!window.confirm(`Excluir o checklist "${detail.data.name}"?`)) return;
    setError(null);
    try {
      await deleteTemplate.mutateAsync(currentId);
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  const loadingDetail = !isCreating && detail.isLoading && !form;

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{isCreating ? 'Novo checklist' : form?.name || 'Checklist'}</h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                {isCreating ? 'Defina as informações e as tarefas' : 'Administração da estrutura do checklist'}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} title="Fechar">
              ✕
            </button>
          </div>
          {!isCreating && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onDuplicate}>
                Duplicar
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onDeactivate}>
                Desativar
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onDelete}>
                Eliminar
              </button>
            </div>
          )}
        </div>

        {!isCreating && (
          <div className="side-panel-tabs">
            {PANEL_TABS.map((t) => (
              <button key={t} type="button" className={'cc-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="side-panel-body">
          <ErrorBanner message={error} />
          <ErrorBanner message={infoMessage} variant="success" />

          {loadingDetail && <p className="muted">Carregando…</p>}

          {form && (tab === 'Informações' || isCreating) && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label>Nome</label>
                <input value={form.name} onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })} maxLength={200} />
              </div>
              <div className="field">
                <label>Área</label>
                <SearchableSelect
                  value={form.areaId}
                  onChange={(v) => setForm((f) => f && { ...f, areaId: v })}
                  placeholder="Selecione a área"
                  options={areaOptions}
                />
              </div>
              <div className="field">
                <label>Descrição</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })}
                  maxLength={1000}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Frequência</label>
                <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="panelExecMode"
                      checked={form.executionMode === 'Scheduled'}
                      onChange={() =>
                        setForm((f) => f && { ...f, executionMode: 'Scheduled', schedules: f.schedules.length > 0 ? f.schedules : [emptySchedule(0)] })
                      }
                    />
                    Agendado (hora fixa)
                  </label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="panelExecMode"
                      checked={form.executionMode === 'Continuous'}
                      onChange={() => setForm((f) => f && { ...f, executionMode: 'Continuous', schedules: [] })}
                    />
                    Contínuo
                  </label>
                </div>
                {form.executionMode === 'Scheduled' && (
                  <ScheduleEditor schedules={form.schedules} onChange={(schedules) => setForm((f) => f && { ...f, schedules })} />
                )}
              </div>
            </div>
          )}

          {form && !isCreating && tab === 'Tarefas' && (
            <div>
              {form.tasks.map((t, i) => (
                <div key={i} className="panel" style={{ marginTop: i === 0 ? 0 : 10, background: '#fafbfc', padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="muted" style={{ width: 20 }}>
                      {i + 1}.
                    </span>
                    <div style={{ flex: 1, display: 'grid', gap: 6, minWidth: 160 }}>
                      <input value={t.name} onChange={(e) => updateTask(i, { name: e.target.value })} placeholder="Nome da tarefa" />
                      <input
                        value={t.description ?? ''}
                        onChange={(e) => updateTask(i, { description: e.target.value })}
                        placeholder="Descrição (opcional)"
                        style={{ fontSize: 12 }}
                      />
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={t.estimatedDurationMinutes ?? ''}
                      onChange={(e) => updateTask(i, { estimatedDurationMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="min"
                      title="Duração estimada (min)"
                      style={{ width: 64, fontSize: 12 }}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveTask(i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveTask(i, 1)} disabled={i === form.tasks.length - 1}>
                      ↓
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeTask(i)}>
                      Remover
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                      <input type="radio" name={`panelTaskMode-${i}`} checked={t.executionMode === 'Scheduled'} onChange={() => setTaskExecutionMode(i, 'Scheduled')} />
                      Agendada
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                      <input type="radio" name={`panelTaskMode-${i}`} checked={t.executionMode === 'Continuous'} onChange={() => setTaskExecutionMode(i, 'Continuous')} />
                      Contínua
                    </label>
                  </div>

                  {t.executionMode === 'Scheduled' && (
                    <ScheduleEditor schedules={t.schedules} onChange={(schedules) => updateTask(i, { schedules })} addLabel="+ Adicionar horário da tarefa" />
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addTask}>
                + Adicionar tarefa
              </button>
            </div>
          )}

          {!isCreating && tab === 'Histórico' && (
            <div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                Histórico de alterações feitas a partir desta tela. O backend ainda não guarda um histórico de
                alterações de checklists.
              </p>
              {history.length === 0 && <div className="card empty">Nenhuma alteração registrada ainda.</div>}
              <div className="timeline">
                {history.map((h) => (
                  <div className="timeline-item event" key={h.id}>
                    <span className="timeline-dot" />
                    <div className="timeline-text">{h.action}</div>
                    <div className="timeline-meta">
                      <b>{h.authorName}</b>
                      <span>·</span>
                      <span>{formatDateTime(h.atIso)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="side-panel-footer">
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={pending || !form}>
              {pending ? 'Salvando…' : isCreating ? 'Criar checklist' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateListCard({
  item,
  areaName,
  onOpen
}: {
  item: ChecklistTemplateListItemDto;
  areaName: string;
  onOpen: (id: string) => void;
}) {
  const detail = useTemplate(item.id);
  const freq = frequencySummary(detail.data);

  return (
    <div className="dc-card" style={{ borderLeftColor: '#3766f5', cursor: 'pointer' }} onClick={() => onOpen(item.id)}>
      <div className="dc-card-col dc-card-col-info">
        <div className="dc-card-title">{item.name}</div>
        <div className="dc-card-area-row">
          <span>{areaName}</span>
          <span className="dc-card-dot">&middot;</span>
          <span>
            {item.taskCount} tarefa{item.taskCount === 1 ? '' : 's'}
          </span>
        </div>
        <p className="dc-card-desc">
          {item.assetCount} ativo{item.assetCount === 1 ? '' : 's'} configurado{item.assetCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="dc-card-col dc-card-col-status">
        <div className="dc-card-badges">
          <span className="status progress">{freq}</span>
          <span className="badge">{roleLabel(item.createdByRole)}</span>
        </div>
      </div>

      <div className="dc-card-col dc-card-col-actions">
        <button type="button" className="icon-btn" title="Ver detalhes" onClick={(e) => { e.stopPropagation(); onOpen(item.id); }}>
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}

export function DiretoriaChecklists() {
  const areas = useAreas();
  const [areaId, setAreaId] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const templates = useTemplates(areaId || undefined);

  const areaOptions = (areas.data ?? []).map((a) => ({ value: a.id, label: a.name }));
  const areaName = (id: string) => areas.data?.find((a) => a.id === id)?.name ?? '—';

  const searchTerm = search.trim().toLowerCase();
  const list = (templates.data ?? []).filter((t) => !searchTerm || t.name.toLowerCase().includes(searchTerm));

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Checklists</h1>
          <p className="page-subtitle">Administre a estrutura dos checklists do hotel.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreatingNew(true)}>
          + Criar checklist
        </button>
      </div>

      <div className="dc-filters-row">
        <div className="dc-filters-left">
          <SearchableSelect
            value={areaId}
            onChange={setAreaId}
            placeholder="Todas as áreas"
            className="btn btn-secondary"
            options={[{ value: '', label: 'Todas as áreas' }, ...areaOptions]}
          />
        </div>
        <input
          type="search"
          className="search"
          placeholder="Buscar checklist…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card-list" style={{ marginTop: 16 }}>
        {list.map((t) => (
          <TemplateListCard key={t.id} item={t} areaName={areaName(t.areaId)} onOpen={setOpenId} />
        ))}
        {templates.isLoading && <p className="muted">Carregando…</p>}
        {!templates.isLoading && list.length === 0 && <div className="card empty">Nenhum checklist encontrado.</div>}
      </div>

      {openId && <TemplateSidePanel templateId={openId} areaOptions={areaOptions} onClose={() => setOpenId(null)} />}
      {creatingNew && <TemplateSidePanel areaOptions={areaOptions} onClose={() => setCreatingNew(false)} />}
    </div>
  );
}
