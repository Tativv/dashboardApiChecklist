'use client';
import { Fragment, use, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import {
  useInstance,
  useFinishInstance,
  useReopenInstance,
  useStartTask,
  useCompleteTask,
  useReviewTask,
  useRestartTask,
  useAssignTask,
  useDeleteInstance,
  useUploadEvidence,
  useTaskComments,
  useAddTaskComment
} from '@/features/checklist-instances/hooks';
import { useUsers } from '@/features/users/hooks';
import { StatusBadge, TaskExecutionStatusBadge, isOverdue } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EvidenceThumb } from '@/components/ui/evidence-thumb';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDate, formatDateTime, formatDuration, formatTime } from '@/lib/format';
import { ChecklistTaskExecutionDto } from '@/types/api';

interface UploadedEvidence {
  id: string;
  fileName: string;
}

function TaskCommentsModal({
  instanceId,
  taskExecutionId,
  taskName,
  onClose
}: {
  instanceId: string;
  taskExecutionId: string;
  taskName: string;
  onClose: () => void;
}) {
  const commentsQuery = useTaskComments(instanceId, taskExecutionId);
  const addComment = useAddTaskComment();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const comments = commentsQuery.data ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    try {
      await addComment.mutateAsync({ instanceId, taskExecutionId, text: text.trim() });
      setText('');
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          Comentários
        </h2>
        <p className="card-sub">{taskName}</p>
        <ErrorBanner message={error} />
        {commentsQuery.isLoading && <p className="muted">Carregando…</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
          {comments.map((c) => (
            <div key={c.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                <b>{c.authorName}</b>
                <span className="muted">{formatDateTime(c.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{c.text}</p>
            </div>
          ))}
          {!commentsQuery.isLoading && comments.length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>
              Nenhum comentário ainda.
            </p>
          )}
        </div>
        <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário…"
            maxLength={2000}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
            <button className="btn btn-primary" disabled={addComment.isPending || !text.trim()}>
              {addComment.isPending ? 'Enviando…' : 'Comentar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = isSupervisorOrAbove(user?.role);
  const instanceQuery = useInstance(id);
  const finishMutation = useFinishInstance();
  const reopenMutation = useReopenInstance();
  const startTaskMutation = useStartTask();
  const completeTaskMutation = useCompleteTask();
  const reviewTaskMutation = useReviewTask();
  const restartTaskMutation = useRestartTask();
  const assignTaskMutation = useAssignTask();
  const deleteInstanceMutation = useDeleteInstance();
  const uploadEvidenceMutation = useUploadEvidence();
  const assignableUsersQuery = useUsers({ active: true }, canManage);
  const [error, setError] = useState<string | null>(null);
  const [uploadedByTask, setUploadedByTask] = useState<Record<string, UploadedEvidence[]>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [commentsModalTask, setCommentsModalTask] = useState<ChecklistTaskExecutionDto | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const instance = instanceQuery.data;
  const assignableUsers = assignableUsersQuery.data ?? [];
  const assignableUserNameById = new Map(assignableUsers.map((c) => [c.id, c.name]));

  const taskGroups = useMemo(() => {
    if (!instance) return [];
    const map = new Map<string, ChecklistTaskExecutionDto[]>();
    for (const t of instance.taskExecutions) {
      const arr = map.get(t.taskId);
      if (arr) arr.push(t);
      else map.set(t.taskId, [t]);
    }
    const byTime = (a: ChecklistTaskExecutionDto, b: ChecklistTaskExecutionDto) => {
      if (!a.scheduledForUtc && !b.scheduledForUtc) return 0;
      if (!a.scheduledForUtc) return 1;
      if (!b.scheduledForUtc) return -1;
      return a.scheduledForUtc.localeCompare(b.scheduledForUtc);
    };
    const groups = Array.from(map.entries()).map(([taskId, items]) => ({
      taskId,
      taskName: items[0].taskName,
      items: [...items].sort(byTime)
    }));
    groups.sort((a, b) => byTime(a.items[0], b.items[0]));
    return groups;
  }, [instance]);

  if (instanceQuery.isLoading) {
    return (
      <div className="page">
        <p className="muted">Carregando…</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="page">
        <ErrorBanner message="Checklist não encontrado." />
        <Link href="/checklists">Voltar para checklists</Link>
      </div>
    );
  }

  function canCompleteTask(t: ChecklistTaskExecutionDto): boolean {
    return canManage || t.assignedUserId === user?.id;
  }

  function toggleGroup(taskId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function onDelete() {
    if (!window.confirm(`Excluir o checklist "${instance?.templateName}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    try {
      await deleteInstanceMutation.mutateAsync(id);
      router.push('/checklists');
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function runAction(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function onStartTask(taskExecutionId: string) {
    await runAction(() => startTaskMutation.mutateAsync({ instanceId: id, taskExecutionId }));
  }

  async function onCompleteTask(taskExecutionId: string) {
    await runAction(() => completeTaskMutation.mutateAsync({ instanceId: id, taskExecutionId, input: {} }));
  }

  async function onReviewTask(taskExecutionId: string) {
    await runAction(() => reviewTaskMutation.mutateAsync({ instanceId: id, taskExecutionId }));
  }

  async function onRestartTask(taskExecutionId: string) {
    if (!window.confirm('Reiniciar esta tarefa? O horário de início, término e a duração registrados serão apagados.')) return;
    await runAction(() => restartTaskMutation.mutateAsync({ instanceId: id, taskExecutionId }));
  }

  async function onAssignTask(taskExecutionId: string, userId: string) {
    await runAction(() =>
      assignTaskMutation.mutateAsync({ instanceId: id, taskExecutionId, userId: userId || null })
    );
  }

  async function onUpload(taskExecutionId: string, file: File) {
    setError(null);
    try {
      const res = await uploadEvidenceMutation.mutateAsync({ instanceId: id, taskExecutionId, file });
      setUploadedByTask((prev) => ({
        ...prev,
        [taskExecutionId]: [...(prev[taskExecutionId] ?? []), { id: res.id, fileName: res.fileName }]
      }));
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  const allTasksDone = instance.taskExecutions.every((t) => t.status === 'Completed' || t.status === 'Reviewed');
  const reviewedCount = instance.taskExecutions.filter((t) => t.status === 'Reviewed').length;

  function renderTaskRow(t: ChecklistTaskExecutionDto, indent: boolean) {
    return (
      <tr key={t.id} className={t.status === 'Completed' || t.status === 'Reviewed' ? 'task-row completed' : 'task-row'}>
        <td style={indent ? { paddingLeft: 28, color: 'var(--muted)' } : undefined}>{indent ? '↳' : t.taskName}</td>
        <td className="muted">{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua'}</td>
        <td>
          {canManage && (instance!.status === 'Pending' || instance!.status === 'InProgress') ? (
            <SearchableSelect
              className="btn btn-secondary btn-sm"
              value={t.assignedUserId ?? ''}
              disabled={assignTaskMutation.isPending}
              onChange={(v) => onAssignTask(t.id, v)}
              placeholder="Não designado"
              options={assignableUsers.map((c) => ({ value: c.id, label: c.name }))}
            />
          ) : (
            <span className="muted">
              {t.assignedUserId
                ? (assignableUserNameById.get(t.assignedUserId) ?? (t.assignedUserId === user?.id ? 'Você' : 'Designada'))
                : 'Não designado'}
            </span>
          )}
        </td>
        <td className="muted">{t.estimatedDurationMinutes ? `${t.estimatedDurationMinutes} min` : '—'}</td>
        <td>
          <TaskExecutionStatusBadge status={t.status} />
        </td>
        <td>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCommentsModalTask(t)}>
            Comentários{t.commentCount > 0 ? ` (${t.commentCount})` : ''}
          </button>
        </td>
        <td>
          <div className="evidence-list">
            {(uploadedByTask[t.id] ?? []).map((ev) => (
              <EvidenceThumb key={ev.id} evidenceId={ev.id} fileName={ev.fileName} />
            ))}
            {t.evidenceCount > (uploadedByTask[t.id]?.length ?? 0) && (
              <span className="muted" style={{ fontSize: 11 }}>
                +{t.evidenceCount - (uploadedByTask[t.id]?.length ?? 0)} arquivo(s) anteriores
              </span>
            )}
            <input
              ref={(el) => {
                fileInputs.current[t.id] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(t.id, file);
                e.target.value = '';
              }}
            />
            {t.status === 'InProgress' && (
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => fileInputs.current[t.id]?.click()}
                disabled={uploadEvidenceMutation.isPending}
              >
                + Foto
              </button>
            )}
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {t.status === 'Pending' && (
              <button
                className="btn btn-secondary btn-sm"
                disabled={!canCompleteTask(t) || startTaskMutation.isPending}
                title={!canCompleteTask(t) ? 'Somente o colaborador designado ou um supervisor podem iniciar esta tarefa' : ''}
                onClick={() => onStartTask(t.id)}
              >
                Iniciar
              </button>
            )}
            {t.status === 'InProgress' && (
              <button
                className="btn btn-primary btn-sm"
                disabled={!canCompleteTask(t) || completeTaskMutation.isPending}
                title={!canCompleteTask(t) ? 'Somente o colaborador designado ou um supervisor podem concluir esta tarefa' : ''}
                onClick={() => onCompleteTask(t.id)}
              >
                Concluir
              </button>
            )}
            {t.status === 'Completed' && canManage && (
              <button
                className="btn btn-primary btn-sm"
                disabled={reviewTaskMutation.isPending}
                onClick={() => onReviewTask(t.id)}
              >
                Revisar
              </button>
            )}
            {(t.status === 'Completed' || t.status === 'Reviewed') && canManage && (
              <button
                className="btn btn-secondary btn-sm"
                disabled={restartTaskMutation.isPending}
                title="Reabre a tarefa, apagando horário de início, término e duração"
                onClick={() => onRestartTask(t.id)}
              >
                Reiniciar
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <Link href="/checklists" className="muted" style={{ fontSize: 13 }}>
            ← Voltar para checklists
          </Link>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            {instance.templateName}
          </h1>
          <p className="page-subtitle">
            {instance.assetName} · {formatDate(instance.date)}
          </p>
        </div>
        <StatusBadge status={instance.status} overdue={isOverdue(instance.status, instance.date)} />
      </div>

      <ErrorBanner message={error} />

      <div className="card detail-meta">
        <div>
          <span className="kpi-label">Início</span>
          <div>{formatDateTime(instance.startedAt)}</div>
        </div>
        <div>
          <span className="kpi-label">Fim</span>
          <div>{formatDateTime(instance.completedAt)}</div>
        </div>
        <div>
          <span className="kpi-label">Duração</span>
          <div>{formatDuration(instance.durationSeconds)}</div>
        </div>
        <div>
          <span className="kpi-label">Revisadas</span>
          <div>
            {reviewedCount}/{instance.taskExecutions.length}
          </div>
        </div>
      </div>

      {instance.status === 'Pending' && (
        <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
          Designe um responsável para uma tarefa para que este checklist entre em andamento.
        </p>
      )}

      <div className="toolbar" style={{ marginTop: 20 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {instance.taskExecutions.filter((t) => t.status === 'Completed' || t.status === 'Reviewed').length}/
          {instance.taskExecutions.length} tarefas concluídas
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          {instance.status === 'InProgress' && canManage && (
            <button
              className="btn btn-primary"
              disabled={!allTasksDone || finishMutation.isPending}
              title={!allTasksDone ? 'Conclua todas as tarefas antes de finalizar' : ''}
              onClick={() => runAction(() => finishMutation.mutateAsync(id))}
            >
              Finalizar
            </button>
          )}
          {(instance.status === 'InProgress' || instance.status === 'Completed') && canManage && (
            <button
              className="btn btn-secondary"
              disabled={reopenMutation.isPending}
              onClick={() => runAction(() => reopenMutation.mutateAsync({ id }))}
            >
              Reabrir
            </button>
          )}
          {canManage && (
            <button className="btn btn-secondary" disabled={deleteInstanceMutation.isPending} onClick={onDelete}>
              Excluir
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table task-table">
          <thead>
            <tr>
              <th>Tarefa</th>
              <th>Horário</th>
              <th>Designado a</th>
              <th>Duração est.</th>
              <th>Status</th>
              <th>Comentários</th>
              <th>Evidência</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {taskGroups.map((group) =>
              group.items.length === 1 ? (
                renderTaskRow(group.items[0], false)
              ) : (
                <Fragment key={group.taskId}>
                  <tr className="task-group-header">
                    <td colSpan={8}>
                      <button type="button" className="task-group-toggle" onClick={() => toggleGroup(group.taskId)}>
                        <span>{collapsedGroups.has(group.taskId) ? '▸' : '▾'}</span>
                        <b>{group.taskName}</b>
                        <span className="badge">{group.items.length} horários</span>
                      </button>
                    </td>
                  </tr>
                  {!collapsedGroups.has(group.taskId) && group.items.map((t) => renderTaskRow(t, true))}
                </Fragment>
              )
            )}
          </tbody>
        </table>
      </div>

      {commentsModalTask && (
        <TaskCommentsModal
          instanceId={id}
          taskExecutionId={commentsModalTask.id}
          taskName={commentsModalTask.taskName}
          onClose={() => setCommentsModalTask(null)}
        />
      )}
    </div>
  );
}
