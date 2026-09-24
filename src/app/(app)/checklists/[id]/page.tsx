'use client';
import { use, useMemo, useRef, useState } from 'react';
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
  useTaskComments,
  useAddTaskComment
} from '@/features/checklist-instances/hooks';
import { useUsers } from '@/features/users/hooks';
import { StatusBadge, TaskExecutionStatusBadge, isOverdue } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { CommentFileThumb } from '@/components/ui/comment-file-thumb';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDate, formatDateTime, formatDuration, formatTime } from '@/lib/format';
import { ChecklistTaskExecutionDto } from '@/types/api';

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function TaskDetailModal({
  task,
  assignedUserName,
  onClose
}: {
  task: ChecklistTaskExecutionDto;
  assignedUserName: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.taskName}</h2>
          <p>Detalhes da tarefa</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <DetailField label="Status" value={<TaskExecutionStatusBadge status={task.status} />} />
            <DetailField label="Horário" value={task.scheduledForUtc ? formatTime(task.scheduledForUtc) : 'Contínua'} />
            <DetailField
              label="Duração estimada"
              value={task.estimatedDurationMinutes ? `${task.estimatedDurationMinutes} min` : '—'}
            />
            <DetailField label="Designado a" value={assignedUserName} />
            <DetailField label="Início" value={task.startedAt ? formatDateTime(task.startedAt) : '—'} />
            <DetailField label="Término" value={task.completedAt ? formatDateTime(task.completedAt) : '—'} />
            <DetailField label="Duração" value={formatDuration(task.durationSeconds)} />
            <DetailField label="Comentários registrados" value={String(task.commentCount)} />
          </div>
          {task.comment && (
            <div style={{ marginTop: 18 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Comentário
              </div>
              <p style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{task.comment}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SYSTEM_COMMENT_TEXTS = new Set(['Tarefa iniciada.', 'Tarefa concluída.', 'Tarefa revisada.', 'Tarefa reiniciada.', 'Tarefa desdesignada.']);

function isSystemComment(text?: string | null): boolean {
  if (!text) return false;
  return SYSTEM_COMMENT_TEXTS.has(text) || text.startsWith('Tarefa designada a ');
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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const comments = [...(commentsQuery.data ?? [])].reverse();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setError(null);
    try {
      await addComment.mutateAsync({ instanceId, taskExecutionId, text: text.trim() || null, file });
      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Comentários</h2>
          <p>{taskName}</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <ErrorBanner message={error} />
          {commentsQuery.isLoading && <p className="muted">Carregando…</p>}
          {!commentsQuery.isLoading && comments.length > 0 && (
            <div className="timeline">
              {comments.map((c) => {
                const event = isSystemComment(c.text);
                return (
                  <div key={c.id} className={'timeline-item' + (event ? ' event' : ' comment')}>
                    <span className="timeline-dot" />
                    <div className="timeline-text">
                      {event ? c.text : c.text ? `"${c.text}"` : 'Anexou um arquivo.'}
                    </div>
                    <div className="timeline-meta">
                      <b>{c.authorName}</b>
                      <span>·</span>
                      <span>{formatDateTime(c.createdAt)}</span>
                    </div>
                    {c.fileName && (
                      <div className="timeline-file">
                        <CommentFileThumb commentId={c.id} fileName={c.fileName} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!commentsQuery.isLoading && comments.length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>
              Nenhum comentário ainda.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <form onSubmit={onSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva um comentário…"
              maxLength={2000}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                {file ? 'Trocar arquivo' : '+ Anexar arquivo'}
              </button>
              {file && (
                <span className="muted" style={{ fontSize: 12 }}>
                  {file.name}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    remover
                  </button>
                </span>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Fechar
              </button>
              <button className="btn btn-primary" disabled={addComment.isPending || (!text.trim() && !file)}>
                {addComment.isPending ? 'Enviando…' : 'Comentar'}
              </button>
            </div>
          </form>
        </div>
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
  const assignableUsersQuery = useUsers({ active: true }, canManage);
  const [error, setError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [commentsModalTask, setCommentsModalTask] = useState<ChecklistTaskExecutionDto | null>(null);
  const [detailTask, setDetailTask] = useState<ChecklistTaskExecutionDto | null>(null);

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

  function canViewComments(t: ChecklistTaskExecutionDto): boolean {
    return canManage || (t.assignedUserId === user?.id && t.status !== 'Reviewed');
  }

  function assignedUserName(t: ChecklistTaskExecutionDto): string {
    if (!t.assignedUserId) return 'Não designado';
    return assignableUserNameById.get(t.assignedUserId) ?? (t.assignedUserId === user?.id ? 'Você' : 'Designada');
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

  const allTasksDone = instance.taskExecutions.every((t) => t.status === 'Completed' || t.status === 'Reviewed');
  const reviewedCount = instance.taskExecutions.filter((t) => t.status === 'Reviewed').length;

  function renderTaskCard(t: ChecklistTaskExecutionDto, nested: boolean) {
    const done = t.status === 'Completed' || t.status === 'Reviewed';
    const canEditAssignment =
      canManage && (instance!.status === 'Pending' || instance!.status === 'InProgress') && t.status !== 'Reviewed';

    return (
      <div key={t.id} className={'task-card' + (nested ? ' task-card-nested' : '') + (done ? ' completed' : '')}>
        <div className="task-card-top">
          <span className={'task-card-title' + (nested ? ' muted' : '')}>
            {nested ? (t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua') : t.taskName}
          </span>
          <TaskExecutionStatusBadge status={t.status} />
        </div>
        <div className="task-card-bottom">
          <div className="task-card-meta">
            {!nested && <span>{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua'}</span>}
            {!nested && <span>·</span>}
            {canEditAssignment ? (
              <SearchableSelect
                className="btn btn-secondary btn-sm"
                value={t.assignedUserId ?? ''}
                disabled={assignTaskMutation.isPending}
                onChange={(v) => onAssignTask(t.id, v)}
                placeholder="Não designado"
                options={assignableUsers.map((c) => ({ value: c.id, label: c.name }))}
              />
            ) : (
              <span>{assignedUserName(t)}</span>
            )}
          </div>
          <div className="task-actions">
            <button type="button" className="icon-btn" title="Ver detalhes" onClick={() => setDetailTask(t)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={!canViewComments(t)}
              title={
                !canViewComments(t)
                  ? 'Somente o colaborador designado (enquanto a tarefa não estiver revisada) ou um supervisor podem ver os comentários'
                  : 'Comentários'
              }
              onClick={() => setCommentsModalTask(t)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {t.commentCount > 0 && <span className="icon-badge">{t.commentCount}</span>}
            </button>
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
            {done && canManage && (
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
        </div>
      </div>
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

      <div className="task-list" style={{ marginTop: 12 }}>
        {taskGroups.map((group) =>
          group.items.length === 1 ? (
            renderTaskCard(group.items[0], false)
          ) : (
            <div key={group.taskId} className="task-card-group">
              <button type="button" className="task-card-group-header" onClick={() => toggleGroup(group.taskId)}>
                <span className="caret">{collapsedGroups.has(group.taskId) ? '▸' : '▾'}</span>
                <b>{group.taskName}</b>
                <span className="badge">{group.items.length} horários</span>
              </button>
              {!collapsedGroups.has(group.taskId) && (
                <div className="task-card-group-body">
                  {group.items.map((t) => renderTaskCard(t, true))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {commentsModalTask && (
        <TaskCommentsModal
          instanceId={id}
          taskExecutionId={commentsModalTask.id}
          taskName={commentsModalTask.taskName}
          onClose={() => setCommentsModalTask(null)}
        />
      )}

      {detailTask && (
        <TaskDetailModal task={detailTask} assignedUserName={assignedUserName(detailTask)} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}
