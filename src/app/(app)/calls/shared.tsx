'use client';
import { useState } from 'react';
import { useCall, useCallComments, useAddCallComment, useCreateCall } from '@/features/calls/hooks';
import { fetchCallCommentFileBlobUrl } from '@/features/calls/api';
import { useAreas } from '@/features/areas/hooks';
import { CommentsTimelineModal } from '@/components/ui/comments-timeline-modal';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDateTime, formatDuration } from '@/lib/format';
import { CallPriority, CallStatus } from '@/types/api';

export const priorityLabel: Record<CallPriority, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta' };
export const priorityClass: Record<CallPriority, string> = { Baixa: 'ready', Media: 'progress', Alta: 'overdue' };
export const statusLabel: Record<CallStatus, string> = { Open: 'Aberto', InProgress: 'Em andamento', Finished: 'Finalizado' };
export const statusClass: Record<CallStatus, string> = { Open: 'pending', InProgress: 'progress', Finished: 'approved' };

const SYSTEM_CALL_COMMENT_TEXTS = new Set(['Chamado iniciado.', 'Chamado concluído.', 'Chamado desdesignado.']);

export function isSystemCallComment(text?: string | null): boolean {
  if (!text) return false;
  return SYSTEM_CALL_COMMENT_TEXTS.has(text) || text.startsWith('Chamado designado a ');
}

export function CreateCallForm({ onClose }: { onClose: () => void }) {
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

export function CallCommentsModal({ callId, subject, onClose }: { callId: string; subject: string; onClose: () => void }) {
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

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function CallDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
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
