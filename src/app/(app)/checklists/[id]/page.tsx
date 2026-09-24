'use client';
import { use, useRef, useState } from 'react';
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
  useAssignTask,
  useDeleteInstance,
  useUploadEvidence
} from '@/features/checklist-instances/hooks';
import { useUsers } from '@/features/users/hooks';
import { StatusBadge, TaskExecutionStatusBadge, isOverdue } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EvidenceThumb } from '@/components/ui/evidence-thumb';
import { toApiError } from '@/lib/api-error';
import { formatDate, formatDateTime, formatDuration, formatTime } from '@/lib/format';
import { ChecklistTaskExecutionDto } from '@/types/api';

interface UploadedEvidence {
  id: string;
  fileName: string;
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
  const assignTaskMutation = useAssignTask();
  const deleteInstanceMutation = useDeleteInstance();
  const uploadEvidenceMutation = useUploadEvidence();
  const assignableUsersQuery = useUsers({ active: true }, canManage);
  const [error, setError] = useState<string | null>(null);
  const [uploadedByTask, setUploadedByTask] = useState<Record<string, UploadedEvidence[]>>({});
  const [durationByTask, setDurationByTask] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const instance = instanceQuery.data;
  const assignableUsers = assignableUsersQuery.data ?? [];
  const assignableUserNameById = new Map(assignableUsers.map((c) => [c.id, c.name]));

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

  async function onAssignTask(taskExecutionId: string, userId: string, estimatedDurationMinutes?: number | null) {
    await runAction(() =>
      assignTaskMutation.mutateAsync({
        instanceId: id,
        taskExecutionId,
        userId: userId || null,
        estimatedDurationMinutes
      })
    );
  }

  function onDurationCommit(t: ChecklistTaskExecutionDto) {
    const raw = durationByTask[t.id];
    if (raw === undefined) return;
    const parsed = raw === '' ? null : Number(raw);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    if (parsed === (t.estimatedDurationMinutes ?? null)) return;
    onAssignTask(t.id, t.assignedUserId ?? '', parsed);
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
              <th>Comentário</th>
              <th>Evidência</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...instance.taskExecutions]
              .sort((a, b) => {
                if (!a.scheduledForUtc && !b.scheduledForUtc) return 0;
                if (!a.scheduledForUtc) return 1;
                if (!b.scheduledForUtc) return -1;
                return a.scheduledForUtc.localeCompare(b.scheduledForUtc);
              })
              .map((t) => (
              <tr key={t.id} className={t.status === 'Completed' || t.status === 'Reviewed' ? 'task-row completed' : 'task-row'}>
                <td>{t.taskName}</td>
                <td className="muted">{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua'}</td>
                <td>
                  {canManage && (instance.status === 'Pending' || instance.status === 'InProgress') ? (
                    <select
                      className="btn btn-secondary btn-sm"
                      value={t.assignedUserId ?? ''}
                      disabled={assignTaskMutation.isPending}
                      onChange={(e) => onAssignTask(t.id, e.target.value, t.estimatedDurationMinutes)}
                    >
                      <option value="">Não designado</option>
                      {assignableUsers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">
                      {t.assignedUserId
                        ? (assignableUserNameById.get(t.assignedUserId) ??
                            (t.assignedUserId === user?.id ? 'Você' : 'Designada'))
                        : 'Não designado'}
                    </span>
                  )}
                </td>
                <td>
                  {canManage && (instance.status === 'Pending' || instance.status === 'InProgress') ? (
                    <input
                      type="number"
                      min={0}
                      className="btn btn-secondary btn-sm"
                      style={{ width: 70 }}
                      placeholder="min"
                      value={durationByTask[t.id] ?? (t.estimatedDurationMinutes ?? '')}
                      onChange={(e) => setDurationByTask((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      onBlur={() => onDurationCommit(t)}
                    />
                  ) : (
                    <span className="muted">{t.estimatedDurationMinutes ? `${t.estimatedDurationMinutes} min` : '—'}</span>
                  )}
                </td>
                <td>
                  <TaskExecutionStatusBadge status={t.status} />
                </td>
                <td className="muted">{t.comment || '—'}</td>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
