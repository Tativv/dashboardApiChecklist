'use client';
import { useEffect, useState } from 'react';
import {
  useServiceOrder,
  useServiceOrderComments,
  useAddServiceOrderComment,
  useCreateServiceOrder,
  useUpdateServiceOrder,
  useDeleteServiceOrder
} from '@/features/service-orders/hooks';
import { fetchServiceOrderCommentFileBlobUrl } from '@/features/service-orders/api';
import { useAreas } from '@/features/areas/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useAuthStore, isSupervisorOrAbove, isManagerOrAbove } from '@/features/auth/store';
import { CommentsTimelineModal } from '@/components/ui/comments-timeline-modal';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDateTime, formatDuration } from '@/lib/format';
import { DetailField } from '../calls/shared';
import { ServiceOrderPriority, ServiceOrderStatus } from '@/types/api';

export const priorityLabel: Record<ServiceOrderPriority, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta' };
export const priorityClass: Record<ServiceOrderPriority, string> = { Baixa: 'ready', Media: 'progress', Alta: 'overdue' };
export const statusLabel: Record<ServiceOrderStatus, string> = { Open: 'Aberta', InProgress: 'Em andamento', Finished: 'Concluída' };
export const statusClass: Record<ServiceOrderStatus, string> = { Open: 'pending', InProgress: 'progress', Finished: 'approved' };

const SYSTEM_SERVICE_ORDER_COMMENT_TEXTS = new Set(['Ordem de serviço iniciada.', 'Ordem de serviço concluída.', 'Ordem de serviço desdesignada.']);

export function isSystemServiceOrderComment(text?: string | null): boolean {
  if (!text) return false;
  return SYSTEM_SERVICE_ORDER_COMMENT_TEXTS.has(text) || text.startsWith('Ordem de serviço designada a ');
}

// A prioridade não se mostra mais no formulário (a pedido do usuário), mas o backend
// ainda a exige como campo obrigatório em POST /service-orders/ — enquanto isso não
// muda no backend, se manda este valor fixo por baixo dos panos.
const DEFAULT_PRIORITY: ServiceOrderPriority = 'Media';

interface ServiceOrderFormState {
  areaId: string;
  assetId: string;
  subject: string;
  description: string;
  dueAtUtc: string;
}

function emptyServiceOrderForm(): ServiceOrderFormState {
  return { areaId: '', assetId: '', subject: '', description: '', dueAtUtc: '' };
}

function ServiceOrderFormFields({ form, setForm }: { form: ServiceOrderFormState; setForm: (f: ServiceOrderFormState) => void }) {
  const areas = useAreas();
  const assetsQuery = useAssets({ areaId: form.areaId || undefined, active: true });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="field">
        <label>Setor</label>
        <SearchableSelect
          value={form.areaId}
          onChange={(v) => setForm({ ...form, areaId: v, assetId: '' })}
          placeholder="Selecione o setor"
          options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
        />
      </div>
      <div className="field">
        <label>Ativo</label>
        <SearchableSelect
          value={form.assetId}
          onChange={(v) => setForm({ ...form, assetId: v })}
          placeholder={form.areaId ? 'Selecione o ativo' : 'Selecione o setor primeiro'}
          options={(assetsQuery.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
        />
      </div>
      <div className="field">
        <label>Vencimento</label>
        <input type="date" value={form.dueAtUtc} onChange={(e) => setForm({ ...form, dueAtUtc: e.target.value })} required />
      </div>
      <div className="field">
        <label>Nome da Ordem de Serviço</label>
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={200} />
      </div>
      <div className="field">
        <label>Descrição</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={2000}
          rows={4}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </div>
  );
}

export function CreateServiceOrderForm({ onClose }: { onClose: () => void }) {
  const createServiceOrder = useCreateServiceOrder();
  const [form, setForm] = useState<ServiceOrderFormState>(emptyServiceOrderForm());
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.areaId) return setError('Selecione o setor.');
    if (!form.assetId) return setError('Selecione o ativo.');
    if (!form.dueAtUtc) return setError('Selecione a data de vencimento.');
    try {
      await createServiceOrder.mutateAsync({
        areaId: form.areaId,
        assetId: form.assetId,
        subject: form.subject,
        description: form.description || null,
        priority: DEFAULT_PRIORITY,
        dueAtUtc: new Date(`${form.dueAtUtc}T23:59:59`).toISOString()
      });
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Nova ordem de serviço</h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                Defina o setor, o ativo, o vencimento e o nome
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} title="Fechar">
              ✕
            </button>
          </div>
        </div>

        <div className="side-panel-body">
          <ErrorBanner message={error} />
          <form id="create-service-order-form" onSubmit={onSubmit}>
            <ServiceOrderFormFields form={form} setForm={setForm} />
          </form>
        </div>

        <div className="side-panel-footer">
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" form="create-service-order-form" className="btn btn-primary" disabled={createServiceOrder.isPending}>
              {createServiceOrder.isPending ? 'Criando…' : 'Criar ordem de serviço'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServiceOrderCommentsModal({ serviceOrderId, subject, onClose }: { serviceOrderId: string; subject: string; onClose: () => void }) {
  const commentsQuery = useServiceOrderComments(serviceOrderId);
  const addComment = useAddServiceOrderComment();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: { text: string | null; file: File | null }) {
    setError(null);
    try {
      await addComment.mutateAsync({ serviceOrderId, text: input.text, file: input.file });
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
      isSystemComment={isSystemServiceOrderComment}
      fetchFileUrl={fetchServiceOrderCommentFileBlobUrl}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}

export function ServiceOrderDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const canManage = isSupervisorOrAbove(user?.role);
  const canDelete = isManagerOrAbove(user?.role);

  const serviceOrder = useServiceOrder(id);
  const o = serviceOrder.data;
  const updateServiceOrder = useUpdateServiceOrder();
  const deleteServiceOrder = useDeleteServiceOrder();
  const createServiceOrder = useCreateServiceOrder();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ServiceOrderFormState>(emptyServiceOrderForm());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (o) {
      setForm({
        areaId: o.areaId,
        assetId: o.assetId,
        subject: o.subject,
        description: o.description ?? '',
        dueAtUtc: o.dueAtUtc.slice(0, 10)
      });
    }
  }, [o]);

  function startEditing() {
    setError(null);
    setEditing(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!o) return;
    setError(null);
    if (!form.areaId) return setError('Selecione o setor.');
    if (!form.assetId) return setError('Selecione o ativo.');
    if (!form.dueAtUtc) return setError('Selecione a data de vencimento.');
    try {
      await updateServiceOrder.mutateAsync({
        id: o.id,
        input: {
          areaId: form.areaId,
          assetId: form.assetId,
          subject: form.subject,
          description: form.description || null,
          priority: o.priority,
          dueAtUtc: new Date(`${form.dueAtUtc}T23:59:59`).toISOString()
        }
      });
      setEditing(false);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function onDuplicate() {
    if (!o) return;
    setError(null);
    try {
      await createServiceOrder.mutateAsync({
        areaId: o.areaId,
        assetId: o.assetId,
        subject: `${o.subject} (cópia)`,
        description: o.description ?? null,
        priority: o.priority,
        dueAtUtc: o.dueAtUtc
      });
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function onDelete() {
    if (!o) return;
    if (!window.confirm(`Excluir a ordem de serviço "${o.subject}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    try {
      await deleteServiceOrder.mutateAsync(o.id);
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  const pending = updateServiceOrder.isPending || createServiceOrder.isPending || deleteServiceOrder.isPending;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Editar ordem de serviço' : o ? o.subject : 'Ordem de serviço'}</h2>
          <p>{o ? `${o.assetName} · ${o.areaName}` : 'Detalhes da ordem de serviço'}</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <ErrorBanner message={error} />
          {serviceOrder.isLoading && <p className="muted">Carregando…</p>}
          {!serviceOrder.isLoading && !o && <p className="muted">Ordem de serviço não encontrada.</p>}

          {o && editing && (
            <form id="edit-service-order-form" onSubmit={onSave}>
              <ServiceOrderFormFields form={form} setForm={setForm} />
            </form>
          )}

          {o && !editing && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <span className={'status ' + priorityClass[o.priority]}>{priorityLabel[o.priority]}</span>
                <span className={'status ' + statusClass[o.status]}>{statusLabel[o.status]}</span>
                {o.overdue && <span className="status overdue">Atrasada</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <DetailField label="Setor" value={o.areaName} />
                <DetailField label="Ativo" value={o.assetName} />
                <DetailField label="Designado a" value={o.assignedUserName ?? 'Não designado'} />
                <DetailField label="Criado por" value={o.createdByUserName} />
                <DetailField label="Vencimento" value={formatDateTime(o.dueAtUtc)} />
                <DetailField label="Criada em" value={formatDateTime(o.createdAtUtc)} />
                <DetailField label="Iniciada em" value={o.startedAt ? formatDateTime(o.startedAt) : '—'} />
                <DetailField
                  label="Concluída em"
                  value={o.completedAt ? `${formatDateTime(o.completedAt)} (${formatDuration(o.durationSeconds)})` : '—'}
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  Descrição
                </div>
                <p style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{o.description || 'Sem descrição.'}</p>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <div className="form-actions" style={{ marginTop: 0, justifyContent: 'space-between' }}>
            {o && !editing && (
              <div style={{ display: 'flex', gap: 8 }}>
                {canManage && (
                  <button type="button" className="btn btn-secondary" onClick={startEditing}>
                    Editar
                  </button>
                )}
                {canManage && (
                  <button type="button" className="btn btn-secondary" onClick={onDuplicate} disabled={pending}>
                    Duplicar
                  </button>
                )}
                {canDelete && (
                  <button type="button" className="btn btn-secondary" onClick={onDelete} disabled={pending}>
                    Excluir
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {editing ? (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={pending}>
                    Cancelar
                  </button>
                  <button type="submit" form="edit-service-order-form" className="btn btn-primary" disabled={pending}>
                    {updateServiceOrder.isPending ? 'Salvando…' : 'Salvar'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
