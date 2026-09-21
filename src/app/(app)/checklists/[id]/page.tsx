'use client';
import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import {
  useInstance,
  useStartInstance,
  useFinishInstance,
  useApproveInstance,
  useReopenInstance,
  useCompleteTask,
  useUploadEvidence
} from '@/features/checklist-instances/hooks';
import { StatusBadge, TaskExecutionStatusBadge, isOverdue } from '@/components/ui/status-badge';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EvidenceThumb } from '@/components/ui/evidence-thumb';
import { toApiError } from '@/lib/api-error';
import { formatDate, formatDateTime, formatDuration, formatTime } from '@/lib/format';

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
  const startMutation = useStartInstance();
  const finishMutation = useFinishInstance();
  const approveMutation = useApproveInstance();
  const reopenMutation = useReopenInstance();
  const completeTaskMutation = useCompleteTask();
  const uploadEvidenceMutation = useUploadEvidence();
  const [error, setError] = useState<string | null>(null);
  const [uploadedByTask, setUploadedByTask] = useState<Record<string, UploadedEvidence[]>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const instance = instanceQuery.data;

  if (instanceQuery.isLoading) {
    return (
      <div className="page">
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="page">
        <ErrorBanner message="No se encontró el checklist." />
        <Link href="/checklists">Volver a checklists</Link>
      </div>
    );
  }

  const canActOnAssignment =
    !instance.assignedUserId || instance.assignedUserId === user?.id || canManage;

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
            ← Volver a checklists
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
          <span className="kpi-label">Inicio</span>
          <div>{formatDateTime(instance.startedAt)}</div>
        </div>
        <div>
          <span className="kpi-label">Fin</span>
          <div>{formatDateTime(instance.completedAt)}</div>
        </div>
        <div>
          <span className="kpi-label">Duración</span>
          <div>{formatDuration(instance.durationSeconds)}</div>
        </div>
        <div>
          <span className="kpi-label">Aprobado</span>
          <div>{formatDateTime(instance.approvedAt)}</div>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 20 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {instance.taskExecutions.filter((t) => t.status === 'Completed').length}/{instance.taskExecutions.length} tareas completadas
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          {instance.status === 'Pending' && (
            <button
              className="btn btn-primary"
              disabled={!canActOnAssignment || startMutation.isPending}
              title={!canActOnAssignment ? 'Solo el usuario asignado o un supervisor pueden iniciar' : ''}
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
                  ? 'Completa todas las tareas antes de finalizar'
                  : !canActOnAssignment
                    ? 'Solo el usuario asignado o un supervisor pueden finalizar'
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
              Aprobar
            </button>
          )}
          {(instance.status === 'Completed' || instance.status === 'Approved') && canManage && (
            <button
              className="btn btn-secondary"
              disabled={reopenMutation.isPending}
              onClick={() => runAction(() => reopenMutation.mutateAsync({ id }))}
            >
              Reabrir
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table task-table">
          <thead>
            <tr>
              <th></th>
              <th>Tarea</th>
              <th>Horario</th>
              <th>Estado</th>
              <th>Comentario</th>
              <th>Evidencia</th>
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
                    disabled={instance.status !== 'InProgress' || completeTaskMutation.isPending}
                    onChange={(e) => onToggleTask(t.id, e.target.checked)}
                  />
                </td>
                <td>{t.taskName}</td>
                <td className="muted">{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Continua'}</td>
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
                        +{t.evidenceCount - (uploadedByTask[t.id]?.length ?? 0)} archivo(s) previos
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
