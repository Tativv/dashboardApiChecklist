'use client';
import { useState } from 'react';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import { useCalls, useCall, useCreateCall, useAssignCall, useStartCall, useFinishCall } from '@/features/calls/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useUsers } from '@/features/users/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { ErrorBanner } from '@/components/ui/error-banner';
import { toApiError } from '@/lib/api-error';
import { formatDateTime, formatDuration } from '@/lib/format';
import { CallListItemDto, CallPriority, CallStatus } from '@/types/api';

const priorityLabel: Record<CallPriority, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta' };
const priorityClass: Record<CallPriority, string> = { Baixa: 'ready', Media: 'progress', Alta: 'overdue' };
const statusLabel: Record<CallStatus, string> = { Open: 'Aberto', InProgress: 'Em andamento', Finished: 'Finalizado' };
const statusClass: Record<CallStatus, string> = { Open: 'pending', InProgress: 'progress', Finished: 'approved' };

function CreateCallForm({ onClose }: { onClose: () => void }) {
  const areas = useAreas();
  const createCall = useCreateCall();
  const [areaId, setAreaId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CallPriority>('Media');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!areaId) {
      setError('Selecione a área destino.');
      return;
    }
    try {
      await createCall.mutateAsync({ areaId, subject, description: description || null, priority });
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 20, maxWidth: 620 }}>
      <h2 className="card-title">Abrir chamado</h2>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Área destino</label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="" disabled>
                Selecione a área
              </option>
              {(areas.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as CallPriority)}>
              <option value="Baixa">Baixa</option>
              <option value="Media">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Assunto</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={createCall.isPending}>
            {createCall.isPending ? 'Abrindo…' : 'Abrir chamado'}
          </button>
        </div>
      </form>
    </div>
  );
}

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

function CallDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const call = useCall(id);
  const c = call.data;

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
        style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {call.isLoading && <p className="muted">Carregando…</p>}
        {!call.isLoading && !c && <p className="muted">Chamado não encontrado.</p>}
        {c && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                {c.subject}
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={'status ' + priorityClass[c.priority]}>{priorityLabel[c.priority]}</span>
                <span className={'status ' + statusClass[c.status]}>{statusLabel[c.status]}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
              <DetailField label="Área" value={c.areaName} />
              <DetailField label="Designado a" value={c.assignedUserName ?? 'Não designado'} />
              <DetailField label="Aberto por" value={c.createdByUserName} />
              <DetailField label="Aberto em" value={formatDateTime(c.createdAtUtc)} />
              <DetailField label="Iniciado em" value={c.startedAt ? formatDateTime(c.startedAt) : '—'} />
              <DetailField
                label="Concluído em"
                value={c.completedAt ? `${formatDateTime(c.completedAt)} (${formatDuration(c.durationSeconds)})` : '—'}
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Descrição
              </div>
              <p style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.description || 'Sem descrição.'}</p>
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function CallRow({ call, currentUserId, canManage, assignableUsers, onView, onError }: {
  call: CallListItemDto;
  currentUserId: string;
  canManage: boolean;
  assignableUsers: { id: string; name: string }[];
  onView: (id: string) => void;
  onError: (message: string) => void;
}) {
  const assignCall = useAssignCall();
  const startCall = useStartCall();
  const finishCall = useFinishCall();
  const isMine = call.assignedUserId === currentUserId;
  const canOperate = isMine || canManage;
  const pending = assignCall.isPending || startCall.isPending || finishCall.isPending;

  async function run(action: () => Promise<unknown>) {
    onError('');
    try {
      await action();
    } catch (err) {
      onError(toApiError(err).message);
    }
  }

  return (
    <tr>
      <td>
        <span className={'status ' + priorityClass[call.priority]}>{priorityLabel[call.priority]}</span>
      </td>
      <td>{call.subject}</td>
      <td className="muted">{call.areaName}</td>
      <td>
        <span className={'status ' + statusClass[call.status]}>{statusLabel[call.status]}</span>
      </td>
      <td className="muted">{call.createdByUserName}</td>
      <td>
        {canManage ? (
          <select
            value={call.assignedUserId ?? ''}
            disabled={pending || call.status === 'Finished'}
            onChange={(e) => run(() => assignCall.mutateAsync({ id: call.id, userId: e.target.value || null }))}
          >
            <option value="">Não designado</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="muted">
            {call.assignedUserId ? (call.assignedUserName ?? 'Designado') : 'Não designado'}
          </span>
        )}
        {!canManage && !call.assignedUserId && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 8 }}
            disabled={pending}
            onClick={() => run(() => assignCall.mutateAsync({ id: call.id, userId: currentUserId }))}
          >
            Assumir
          </button>
        )}
      </td>
      <td className="actions">
        <button onClick={() => onView(call.id)}>Ver</button>
        {canOperate && call.status === 'Open' && call.assignedUserId && (
          <button disabled={pending} onClick={() => run(() => startCall.mutateAsync(call.id))}>
            Iniciar
          </button>
        )}
        {canOperate && call.status === 'InProgress' && (
          <button disabled={pending} onClick={() => run(() => finishCall.mutateAsync(call.id))}>
            Concluir
          </button>
        )}
      </td>
    </tr>
  );
}

export default function CallsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = isSupervisorOrAbove(user?.role);
  const areas = useAreas();
  const assignableUsersQuery = useUsers({ active: true }, canManage);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState<CallStatus | 'Todos'>('Todos');
  const [priority, setPriority] = useState<CallPriority | 'Todas'>('Todas');
  const calls = useCalls({ areaId: areaId || undefined, status, priority });
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignableUsers = assignableUsersQuery.data ?? [];
  const list = calls.data ?? [];

  return (
    <RequireRole roles={['Directoria', 'Supervisor', 'Colaborador', 'Gerencia']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Chamados</h1>
            <p className="page-subtitle">Aberturas e atendimentos de solicitações por área.</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + Abrir chamado
            </button>
          )}
        </div>

        <ErrorBanner message={error} />
        {creating && <CreateCallForm onClose={() => setCreating(false)} />}

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Todas as áreas</option>
            {(areas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as CallStatus | 'Todos')}>
            <option value="Todos">Todos os status</option>
            <option value="Open">Aberto</option>
            <option value="InProgress">Em andamento</option>
            <option value="Finished">Finalizado</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as CallPriority | 'Todas')}>
            <option value="Todas">Todas as prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Prioridade</th>
                <th>Assunto</th>
                <th>Área</th>
                <th>Status</th>
                <th>Aberto por</th>
                <th>Designado a</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <CallRow
                  key={c.id}
                  call={c}
                  currentUserId={user?.id ?? ''}
                  canManage={canManage}
                  assignableUsers={assignableUsers}
                  onView={setViewingId}
                  onError={setError}
                />
              ))}
              {calls.isLoading && (
                <tr>
                  <td colSpan={7} className="muted">
                    Carregando…
                  </td>
                </tr>
              )}
              {!calls.isLoading && list.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Nenhum chamado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {viewingId && <CallDetailModal id={viewingId} onClose={() => setViewingId(null)} />}
      </div>
    </RequireRole>
  );
}
