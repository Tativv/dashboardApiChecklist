'use client';
import { useState } from 'react';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import {
  useCalls,
  useCall,
  useCreateCall,
  useAssignCall,
  useStartCall,
  useFinishCall,
  useCallComments,
  useAddCallComment
} from '@/features/calls/hooks';
import { fetchCallCommentFileBlobUrl } from '@/features/calls/api';
import { useAreas } from '@/features/areas/hooks';
import { useUsers } from '@/features/users/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CommentsTimelineModal } from '@/components/ui/comments-timeline-modal';
import { toApiError } from '@/lib/api-error';
import { formatDateTime, formatDuration } from '@/lib/format';
import { CallListItemDto, CallPriority, CallStatus } from '@/types/api';

const priorityLabel: Record<CallPriority, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta' };
const priorityClass: Record<CallPriority, string> = { Baixa: 'ready', Media: 'progress', Alta: 'overdue' };
const statusLabel: Record<CallStatus, string> = { Open: 'Aberto', InProgress: 'Em andamento', Finished: 'Finalizado' };
const statusClass: Record<CallStatus, string> = { Open: 'pending', InProgress: 'progress', Finished: 'approved' };

const SYSTEM_CALL_COMMENT_TEXTS = new Set(['Chamado iniciado.', 'Chamado concluído.', 'Chamado desdesignado.']);

function isSystemCallComment(text?: string | null): boolean {
  if (!text) return false;
  return SYSTEM_CALL_COMMENT_TEXTS.has(text) || text.startsWith('Chamado designado a ');
}

function CallCommentsModal({ callId, subject, onClose }: { callId: string; subject: string; onClose: () => void }) {
  const commentsQuery = useCallComments(callId);
  const addComment = useAddCallComment();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: { text: string | null; file: File | null }) {
    setError(null);
    try {
      await addComment.mutateAsync({ callId, text: input.text, file: input.file });
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <CommentsTimelineModal
      subtitle={subject}
      comments={commentsQuery.data ?? []}
      isLoading={commentsQuery.isLoading}
      canAddComment
      isSubmitting={addComment.isPending}
      submitError={error}
      isSystemComment={isSystemCallComment}
      fetchFileUrl={fetchCallCommentFileBlobUrl}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}

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
            <SearchableSelect
              value={areaId}
              onChange={setAreaId}
              placeholder="Selecione a área"
              options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div className="field">
            <label>Prioridade</label>
            <SearchableSelect
              value={priority}
              onChange={(v) => setPriority(v as CallPriority)}
              options={[
                { value: 'Baixa', label: 'Baixa' },
                { value: 'Media', label: 'Média' },
                { value: 'Alta', label: 'Alta' }
              ]}
            />
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{c ? c.subject : 'Chamado'}</h2>
          <p>Detalhes do chamado</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {call.isLoading && <p className="muted">Carregando…</p>}
          {!call.isLoading && !c && <p className="muted">Chamado não encontrado.</p>}
          {c && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <span className={'status ' + priorityClass[c.priority]}>{priorityLabel[c.priority]}</span>
                <span className={'status ' + statusClass[c.status]}>{statusLabel[c.status]}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
  const [commentsCall, setCommentsCall] = useState<CallListItemDto | null>(null);
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
    </RequireRole>
  );
}
