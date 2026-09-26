'use client';
import { useState } from 'react';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import { useCalls, useAssignCall, useStartCall, useFinishCall } from '@/features/calls/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useUsers } from '@/features/users/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { CallListItemDto, CallPriority, CallStatus } from '@/types/api';
import { priorityLabel, priorityClass, statusLabel, statusClass, CreateCallForm, CallCommentsModal, CallDetailModal } from './shared';
import { DiretoriaCalls } from './diretoria-calls';

function CallCard({
  call,
  currentUserId,
  canManage,
  assignableUsers,
  onView,
  onComments,
  onError
}: {
  call: CallListItemDto;
  currentUserId: string;
  canManage: boolean;
  assignableUsers: { id: string; name: string }[];
  onView: (id: string) => void;
  onComments: (call: CallListItemDto) => void;
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
    <div className="list-card">
      <div className="list-card-top">
        <span className="list-card-title">{call.subject}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={'status ' + priorityClass[call.priority]}>{priorityLabel[call.priority]}</span>
          <span className={'status ' + statusClass[call.status]}>{statusLabel[call.status]}</span>
        </div>
      </div>
      <div className="list-card-bottom">
        <div className="list-card-meta">
          <span>{call.areaName}</span>
          <span>·</span>
          <span>Aberto por {call.createdByUserName}</span>
          <span>·</span>
          {canManage ? (
            <SearchableSelect
              value={call.assignedUserId ?? ''}
              disabled={pending || call.status === 'Finished'}
              onChange={(v) => run(() => assignCall.mutateAsync({ id: call.id, userId: v || null }))}
              placeholder="Não designado"
              className="btn btn-secondary btn-sm"
              options={assignableUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
          ) : (
            <span>{call.assignedUserId ? (call.assignedUserName ?? 'Designado') : 'Não designado'}</span>
          )}
          {!canManage && !call.assignedUserId && (
            <button
              className="btn btn-secondary btn-sm"
              disabled={pending}
              onClick={() => run(() => assignCall.mutateAsync({ id: call.id, userId: currentUserId }))}
            >
              Assumir
            </button>
          )}
        </div>
        <div className="task-actions">
          <button type="button" className="icon-btn" title="Ver detalhes" onClick={() => onView(call.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button type="button" className="icon-btn" title="Comentários" onClick={() => onComments(call)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {call.commentCount > 0 && <span className="icon-badge">{call.commentCount}</span>}
          </button>
          {canOperate && call.status === 'Open' && call.assignedUserId && (
            <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => startCall.mutateAsync(call.id))}>
              Iniciar
            </button>
          )}
          {canOperate && call.status === 'InProgress' && (
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => finishCall.mutateAsync(call.id))}>
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StandardCalls() {
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
  const [commentsCall, setCommentsCall] = useState<CallListItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignableUsers = assignableUsersQuery.data ?? [];
  const list = calls.data ?? [];

  return (
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
        <SearchableSelect
          value={areaId}
          onChange={setAreaId}
          placeholder="Todas as áreas"
          className="btn btn-secondary"
          options={[{ value: '', label: 'Todas as áreas' }, ...(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))]}
        />
        <SearchableSelect
          value={status}
          onChange={(v) => setStatus(v as CallStatus | 'Todos')}
          className="btn btn-secondary"
          options={[
            { value: 'Todos', label: 'Todos os status' },
            { value: 'Open', label: 'Aberto' },
            { value: 'InProgress', label: 'Em andamento' },
            { value: 'Finished', label: 'Finalizado' }
          ]}
        />
        <SearchableSelect
          value={priority}
          onChange={(v) => setPriority(v as CallPriority | 'Todas')}
          className="btn btn-secondary"
          options={[
            { value: 'Todas', label: 'Todas as prioridades' },
            { value: 'Alta', label: 'Alta' },
            { value: 'Media', label: 'Média' },
            { value: 'Baixa', label: 'Baixa' }
          ]}
        />
      </div>

      <div className="card-list">
        {list.map((c) => (
          <CallCard
            key={c.id}
            call={c}
            currentUserId={user?.id ?? ''}
            canManage={canManage}
            assignableUsers={assignableUsers}
            onView={setViewingId}
            onComments={setCommentsCall}
            onError={setError}
          />
        ))}
        {calls.isLoading && <p className="muted">Carregando…</p>}
        {!calls.isLoading && list.length === 0 && <div className="card empty">Nenhum chamado encontrado.</div>}
      </div>

      {viewingId && <CallDetailModal id={viewingId} onClose={() => setViewingId(null)} />}
      {commentsCall && (
        <CallCommentsModal callId={commentsCall.id} subject={commentsCall.subject} onClose={() => setCommentsCall(null)} />
      )}
    </div>
  );
}

export default function CallsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <RequireRole roles={['Directoria', 'Supervisor', 'Colaborador', 'Gerencia']}>
      {user?.role === 'Directoria' ? <DiretoriaCalls /> : <StandardCalls />}
    </RequireRole>
  );
}
