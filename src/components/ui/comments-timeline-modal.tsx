'use client';
import { useRef, useState } from 'react';
import { CommentFileThumb } from './comment-file-thumb';
import { ErrorBanner } from './error-banner';
import { formatDateTime } from '@/lib/format';

export interface TimelineCommentItem {
  id: string;
  authorName: string;
  createdAt: string;
  text?: string | null;
  fileName?: string | null;
  contentType?: string | null;
}

export function CommentsTimelineModal({
  title = 'Comentários',
  subtitle,
  comments,
  isLoading,
  canAddComment,
  isSubmitting,
  submitError,
  isSystemComment,
  fetchFileUrl,
  onSubmit,
  onClose,
  lockedMessage = 'Não é possível adicionar novos comentários.'
}: {
  title?: string;
  subtitle: string;
  comments: TimelineCommentItem[];
  isLoading: boolean;
  canAddComment: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  isSystemComment: (text?: string | null) => boolean;
  fetchFileUrl: (commentId: string) => Promise<string>;
  onSubmit: (input: { text: string | null; file: File | null }) => Promise<void>;
  onClose: () => void;
  lockedMessage?: string;
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ordered = [...comments].reverse();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    await onSubmit({ text: text.trim() || null, file });
    setText('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <p>{subtitle}</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <ErrorBanner message={submitError} />
          {isLoading && <p className="muted">Carregando…</p>}
          {!isLoading && ordered.length > 0 && (
            <div className="timeline">
              {ordered.map((c) => {
                const event = isSystemComment(c.text);
                return (
                  <div key={c.id} className={'timeline-item' + (event ? ' event' : ' comment')}>
                    <span className="timeline-dot" />
                    <div className="timeline-text">{event ? c.text : c.text ? `"${c.text}"` : 'Anexou um arquivo.'}</div>
                    <div className="timeline-meta">
                      <b>{c.authorName}</b>
                      <span>·</span>
                      <span>{formatDateTime(c.createdAt)}</span>
                    </div>
                    {c.fileName && (
                      <div className="timeline-file">
                        <CommentFileThumb commentId={c.id} fileName={c.fileName} fetchUrl={fetchFileUrl} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!isLoading && ordered.length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>
              Nenhum comentário ainda.
            </p>
          )}
        </div>

        <div className="modal-footer">
          {canAddComment ? (
            <form onSubmit={handleSubmit}>
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
                <button className="btn btn-primary" disabled={isSubmitting || (!text.trim() && !file)}>
                  {isSubmitting ? 'Enviando…' : 'Comentar'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                {lockedMessage}
              </p>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
