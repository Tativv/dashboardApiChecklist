'use client';
import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, isSupervisorOrAbove, isManagerOrAbove } from '@/features/auth/store';
import {
  useInstance,
  useStartInstance,
  useFinishInstance,
  useApproveInstance,
  useReopenInstance,
  useCompleteTask,
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
  const canManageInstances = isManagerOrAbove(user?.role);
  const instanceQuery = useInstance(id);
  const startMutation = useStartInstance();
  const finishMutation = useFinishInstance();
  const approveMutation = useApproveInstance();
  const reopenMutation = useReopenInstance();
  const completeTaskMutation = useCompleteTask();
  const assignTaskMutation = useAssignTask();
  const deleteInstanceMutation = useDeleteInstance();
  const uploadEvidenceMutation = useUploadEvidence();
  const collaboratorsQuery = useUsers({ role: 'Colaborador', active: true }, canManage);
  const [error, setError] = useState<string | null>(null);
  const [uploadedByTask, setUploadedByTask] = useState<Record<string, UploadedEvidence[]>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const instance = instanceQuery.data;
  const collaborators = collaboratorsQuery.data ?? [];
  const collaboratorNameById = new Map(collaborators.map((c) => [c.id, c.name]));

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

  const hasAssignedTaskHere = instance.taskExecutions.some((t) => t.assignedUserId === user?.id);
  const canActOnAssignment = canManage || hasAssignedTaskHere;

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

  async function onToggleTask(taskExecutionId: string, completed: boolean) {
    await runAction(() =>
      completeTaskMutation.mutateAsync({ instanceId: id, taskExecutionId, input: { completed } })
    );
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

  const allTasksCompleted = instance.taskExecutions.every((t) => t.status === 'Completed');

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
          <span className="kpi-label">Revisado</span>
          <div>{formatDateTime(instance.taskExecutions.find((t) => t.approvedAt)?.approvedAt)}</div>
        </div>
      </div>

      {instance.status === 'Pending' && (
        <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
          Designe um responsável para cada tarefa para que este checklist seja aprovado e possa ser iniciado.
        </p>
      )}

      <div className="toolbar" style={{ marginTop: 20 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {instance.taskExecutions.filter((t) => t.status === 'Completed').length}/{instance.taskExecutions.length} tarefas concluídas
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          {instance.status === 'Approved' && (
            <button
              className="btn btn-primary"
              disabled={!canActOnAssignment || startMutation.isPending}
              title={!canActOnAssignment ? 'Somente um colaborador com uma tarefa designada aqui ou um supervisor podem iniciar' : ''}
              onClick={() => runAction(() => startMutation.mutateAsync(id))}
            >
              Iniciar
            </button>
          )}
          {instance.status === 'InProgress' && (
            <button
              className="btn btn-primary"
              disabled={!canActOnAssignment || !allTasksCompleted || finishMutation.isPending}
              title={
                !allTasksCompleted
                  ? 'Conclua todas as tarefas antes de finalizar'
                  : !canActOnAssignment
                    ? 'Somente um colaborador com uma tarefa designada aqui ou um supervisor podem finalizar'
                    : ''
              }
              onClick={() => runAction(() => finishMutation.mutateAsync(id))}
            >
              Finalizar
            </button>
          )}
          {instance.status === 'Completed' && canManage && (
            <button
              className="btn btn-primary"
              disabled={approveMutation.isPending}
              onClick={() => runAction(() => approveMutation.mutateAsync(id))}
            >
              Revisar
            </button>
          )}
          {(instance.status === 'Completed' || instance.status === 'Reviewed') && canManage && (
            <button
              className="btn btn-secondary"
              disabled={reopenMutation.isPending}
              onClick={() => runAction(() => reopenMutation.mutateAsync({ id }))}
            >
              Reabrir
            </button>
          )}
          {canManageInstances && (
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
              <th></th>
              <th>Tarefa</th>
              <th>Horário</th>
              <th>Designado a</th>
              <th>Status</th>
              <th>Comentário</th>
              <th>Evidência</th>
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
              <tr key={t.id} className={t.status === 'Completed' ? 'task-row completed' : 'task-row'}>
                <td>
                  <input
                    type="checkbox"
                    checked={t.status === 'Completed'}
                    disabled={instance.status !== 'InProgress' || !canCompleteTask(t) || completeTaskMutation.isPending}
                    title={!canCompleteTask(t) ? 'Somente o colaborador designado ou um supervisor podem concluir esta tarefa' : ''}
                    onChange={(e) => onToggleTask(t.id, e.target.checked)}
                  />
                </td>
                <td>{t.taskName}</td>
                <td className="muted">{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua'}</td>
                <td>
                  {canManage &&
                  (instance.status === 'Pending' || instance.status === 'Approved' || instance.status === 'InProgress') ? (
                    <select
                      className="btn btn-secondary btn-sm"
                      value={t.assignedUserId ?? ''}
                      disabled={assignTaskMutation.isPending}
                      onChange={(e) => onAssignTask(t.id, e.target.value)}
                    >
                      <option value="">Não designado</option>
                      {collaborators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">
                      {t.assignedUserId
                        ? (collaboratorNameById.get(t.assignedUserId) ??
                            (t.assignedUserId === user?.id ? 'Você' : 'Designada'))
                        : 'Não designado'}
                    </span>
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
                    {instance.status === 'InProgress' && (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
