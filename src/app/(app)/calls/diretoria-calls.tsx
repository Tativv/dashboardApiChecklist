'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCalls, useCall, useAssignCall, useStartCall, useFinishCall, useConvertCallToServiceOrder } from '@/features/calls/hooks';
import { useServiceOrders } from '@/features/service-orders/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useUsers } from '@/features/users/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { CallListItemDto, CallPriority, CallStatus, ServiceOrderListItemDto } from '@/types/api';
import { priorityLabel, priorityClass, statusLabel, statusClass, CreateCallForm, CallCommentsModal, CallDetailModal } from './shared';
import { ServiceOrderDetailModal } from '../service-orders/shared';

const PRIORITY_BAR_COLOR: Record<CallPriority, string> = { Baixa: '#5b3fd6', Media: '#315bd6', Alta: '#c43c35' };

function elapsedShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'poucos segundos';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days === 1 ? '' : 's'}`;
}

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DotsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

const ICONS = {
  open: 'M12 8v4l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  inProgress: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.64M21 3v6h-6',
  finished: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  critical: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'
};

function ConvertToServiceOrderModal({ call, onClose, onConverted }: { call: CallListItemDto; onClose: () => void; onConverted: () => void }) {
  const assetsQuery = useAssets({ areaId: call.areaId, active: true });
  const convert = useConvertCallToServiceOrder();
  const [assetId, setAssetId] = useState('');
  const [dueAtUtc, setDueAtUtc] = useState('');
  const [priority, setPriority] = useState<CallPriority | ''>('');
  const [subject, setSubject] = useState(call.subject);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!assetId) return setError('Selecione o ativo afetado.');
    if (!dueAtUtc) return setError('Selecione a data de vencimento.');
    try {
      await convert.mutateAsync({
        callId: call.id,
        input: {
          assetId,
          dueAtUtc: new Date(`${dueAtUtc}T23:59:59`).toISOString(),
          priority: priority || null,
          subject: subject !== call.subject ? subject : null
        }
      });
      onConverted();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Converter em Ordem de Serviço</h2>
          <p>Cria uma ordem de serviço vinculada a este chamado</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <ErrorBanner message={error} />
          <form onSubmit={onSubmit}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label>Ativo afetado</label>
                <SearchableSelect
                  value={assetId}
                  onChange={setAssetId}
                  placeholder="Selecione o ativo"
                  options={(assetsQuery.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
              <div className="field">
                <label>Vencimento</label>
                <input type="date" value={dueAtUtc} onChange={(e) => setDueAtUtc(e.target.value)} required />
              </div>
              <div className="field">
                <label>Prioridade (opcional — herda a do chamado se vazio)</label>
                <SearchableSelect
                  value={priority}
                  onChange={(v) => setPriority(v as CallPriority | '')}
                  placeholder={`Herdar do chamado (${priorityLabel[call.priority]})`}
                  options={[
                    { value: '', label: `Herdar do chamado (${priorityLabel[call.priority]})` },
                    { value: 'Baixa', label: 'Baixa' },
                    { value: 'Media', label: 'Média' },
                    { value: 'Alta', label: 'Alta' }
                  ]}
                />
              </div>
              <div className="field">
                <label>Assunto</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={convert.isPending}>
                {convert.isPending ? 'Convertendo…' : 'Converter em Ordem de Serviço'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DiretoriaCallCard({
  call,
  link,
  assignableUsers,
  onView,
  onComments,
  onConvert,
  onViewLink,
  onError
}: {
  call: CallListItemDto;
  link?: ServiceOrderListItemDto;
  assignableUsers: { id: string; name: string }[];
  onView: (id: string) => void;
  onComments: (call: CallListItemDto) => void;
  onConvert: (call: CallListItemDto) => void;
  onViewLink: (serviceOrderId: string) => void;
  onError: (message: string) => void;
}) {
  const assignCall = useAssignCall();
  const startCall = useStartCall();
  const finishCall = useFinishCall();
  const detail = useCall(call.id);
  const pending = assignCall.isPending || startCall.isPending || finishCall.isPending;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  async function run(action: () => Promise<unknown>) {
    onError('');
    try {
      await action();
    } catch (err) {
      onError(toApiError(err).message);
    }
  }

  const accentColor = PRIORITY_BAR_COLOR[call.priority];
  const statusBadge = link
    ? { label: 'Convertido em OS', className: 'status ready' }
    : { label: statusLabel[call.status], className: 'status ' + statusClass[call.status] };
  const description = detail.data?.description?.trim();
  const canStart = call.status === 'Open' && !!call.assignedUserId;
  const canFinish = call.status === 'InProgress';

  return (
    <div className="dc-card" style={{ borderLeftColor: accentColor }}>
      <div className="dc-card-col dc-card-col-info">
        <div className="dc-card-title">{call.subject}</div>
        <div className="dc-card-area-row">
          <span>{call.areaName}</span>
          <span className="dc-card-dot">&middot;</span>
          <span>{call.createdByUserName}</span>
        </div>
        <p className="dc-card-desc">{description || (detail.isLoading ? '' : 'Sem descrição.')}</p>
      </div>

      <div className="dc-card-col dc-card-col-status">
        <div className="dc-card-badges">
          <span className={'status ' + priorityClass[call.priority]}>{priorityLabel[call.priority]}</span>
          <span className={statusBadge.className}>{statusBadge.label}</span>
        </div>
        <div className="dc-card-elapsed">
          <Icon path={ICONS.open} size={13} /> Aberto há {elapsedShort(call.createdAtUtc)}
        </div>
        <div className="dc-card-responsible">
          <SearchableSelect
            value={call.assignedUserId ?? ''}
            disabled={pending || call.status === 'Finished'}
            onChange={(v) => run(() => assignCall.mutateAsync({ id: call.id, userId: v || null }))}
            placeholder="Não designado"
            className="dc-card-responsible-select"
            options={assignableUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>
      </div>

      <div className="dc-card-col dc-card-col-actions">
        <button type="button" className="icon-btn" title="Ver detalhes" onClick={() => onView(call.id)}>
          <EyeIcon />
        </button>
        <button type="button" className="icon-btn" title="Comentários" onClick={() => onComments(call)}>
          <Icon path={ICONS.chat} size={16} />
          {call.commentCount > 0 && <span className="icon-badge">{call.commentCount}</span>}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => (link ? onViewLink(link.id) : onConvert(call))}
          disabled={!link && call.status === 'Finished'}
        >
          <Icon path={ICONS.wrench} size={13} /> {link ? 'Ver OS' : 'Converter em OS'}
        </button>
        <div className="dc-card-menu" ref={menuRef}>
          <button type="button" className="icon-btn" title="Mais ações" onClick={() => setMenuOpen((v) => !v)}>
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="dc-card-menu-dropdown">
              {canStart && (
                <button
                  type="button"
                  className="dc-card-menu-item"
                  disabled={pending}
                  onClick={() => {
                    setMenuOpen(false);
                    run(() => startCall.mutateAsync(call.id));
                  }}
                >
                  Iniciar
                </button>
              )}
              {canFinish && (
                <button
                  type="button"
                  className="dc-card-menu-item"
                  disabled={pending}
                  onClick={() => {
                    setMenuOpen(false);
                    run(() => finishCall.mutateAsync(call.id));
                  }}
                >
                  Finalizar Chamado
                </button>
              )}
              {!canStart && !canFinish && <span className="dc-card-menu-empty">Nenhuma ação disponível</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DiretoriaCalls() {
  const areas = useAreas();
  const assignableUsersQuery = useUsers({ active: true });
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState<CallStatus | 'Todos'>('Todos');
  const [priority, setPriority] = useState<CallPriority | 'Todas'>('Todas');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'open' | 'inProgress' | 'converted' | 'finished'>('all');
  const calls = useCalls({ areaId: areaId || undefined, status, priority });
  const serviceOrdersQuery = useServiceOrders({});
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [commentsCall, setCommentsCall] = useState<CallListItemDto | null>(null);
  const [convertingCall, setConvertingCall] = useState<CallListItemDto | null>(null);
  const [viewingServiceOrderId, setViewingServiceOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const links = useMemo(() => {
    const map = new Map<string, ServiceOrderListItemDto>();
    for (const o of serviceOrdersQuery.data ?? []) {
      if (o.callId) map.set(o.callId, o);
    }
    return map;
  }, [serviceOrdersQuery.data]);

  const assignableUsers = assignableUsersQuery.data ?? [];
  const list = calls.data ?? [];

  const abertos = list.filter((c) => c.status === 'Open').length;
  const emAndamento = list.filter((c) => c.status === 'InProgress').length;
  const convertidos = list.filter((c) => links.has(c.id)).length;
  const finalizados = list.filter((c) => c.status === 'Finished').length;

  function toggleQuickFilter(filter: typeof quickFilter) {
    setQuickFilter((prev) => (prev === filter ? 'all' : filter));
  }

  const searchTerm = search.trim().toLowerCase();
  const filtered = list.filter((c) => {
    if (quickFilter === 'open' && c.status !== 'Open') return false;
    if (quickFilter === 'inProgress' && c.status !== 'InProgress') return false;
    if (quickFilter === 'converted' && !links.has(c.id)) return false;
    if (quickFilter === 'finished' && c.status !== 'Finished') return false;
    if (!searchTerm) return true;
    return (
      c.subject.toLowerCase().includes(searchTerm) ||
      c.areaName.toLowerCase().includes(searchTerm) ||
      (c.assignedUserName ?? '').toLowerCase().includes(searchTerm) ||
      c.createdByUserName.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Chamados</h1>
          <p className="page-subtitle">Situação operativa dos chamados do resort em tempo real.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + Abrir chamado
        </button>
      </div>

      <ErrorBanner message={error} />
      {creating && <CreateCallForm onClose={() => setCreating(false)} />}

      <div className="dc-kpi-grid">
        <button
          type="button"
          className={'dc-kpi-card' + (quickFilter === 'open' ? ' selected' : '')}
          style={{ background: 'rgba(154,103,0,.07)' }}
          onClick={() => toggleQuickFilter('open')}
        >
          <span className="dc-kpi-icon" style={{ background: '#fff4d6', color: '#9a6700' }}>
            <Icon path={ICONS.open} />
          </span>
          <div>
            <div className="dc-kpi-value">{abertos}</div>
            <div className="dc-kpi-label">Abertos</div>
          </div>
        </button>
        <button
          type="button"
          className={'dc-kpi-card' + (quickFilter === 'inProgress' ? ' selected' : '')}
          style={{ background: 'rgba(55,102,245,.07)' }}
          onClick={() => toggleQuickFilter('inProgress')}
        >
          <span className="dc-kpi-icon" style={{ background: '#e9efff', color: '#3766f5' }}>
            <Icon path={ICONS.inProgress} />
          </span>
          <div>
            <div className="dc-kpi-value">{emAndamento}</div>
            <div className="dc-kpi-label">Em Andamento</div>
          </div>
        </button>
        <button
          type="button"
          className={'dc-kpi-card' + (quickFilter === 'converted' ? ' selected' : '')}
          style={{ background: 'rgba(124,58,237,.07)' }}
          onClick={() => toggleQuickFilter('converted')}
        >
          <span className="dc-kpi-icon" style={{ background: '#f0ecff', color: '#7c3aed' }}>
            <Icon path={ICONS.wrench} />
          </span>
          <div>
            <div className="dc-kpi-value">{convertidos}</div>
            <div className="dc-kpi-label">Convertidos em OS</div>
          </div>
        </button>
        <button
          type="button"
          className={'dc-kpi-card' + (quickFilter === 'finished' ? ' selected' : '')}
          style={{ background: 'rgba(22,121,78,.07)' }}
          onClick={() => toggleQuickFilter('finished')}
        >
          <span className="dc-kpi-icon" style={{ background: '#def7ec', color: '#16794e' }}>
            <Icon path={ICONS.finished} />
          </span>
          <div>
            <div className="dc-kpi-value">{finalizados}</div>
            <div className="dc-kpi-label">Finalizados</div>
          </div>
        </button>
      </div>

      <div className="dc-filters-row">
        <div className="dc-filters-left">
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
        <input
          type="search"
          className="search"
          placeholder="Buscar chamados…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card-list">
        {filtered.map((c) => (
          <DiretoriaCallCard
            key={c.id}
            call={c}
            link={links.get(c.id)}
            assignableUsers={assignableUsers}
            onView={setViewingId}
            onComments={setCommentsCall}
            onConvert={setConvertingCall}
            onViewLink={setViewingServiceOrderId}
            onError={setError}
          />
        ))}
        {calls.isLoading && <p className="muted">Carregando…</p>}
        {!calls.isLoading && filtered.length === 0 && <div className="card empty">Nenhum chamado encontrado.</div>}
      </div>

      {viewingId && <CallDetailModal id={viewingId} onClose={() => setViewingId(null)} />}
      {commentsCall && (
        <CallCommentsModal callId={commentsCall.id} subject={commentsCall.subject} onClose={() => setCommentsCall(null)} />
      )}
      {convertingCall && (
        <ConvertToServiceOrderModal
          call={convertingCall}
          onClose={() => setConvertingCall(null)}
          onConverted={() => setConvertingCall(null)}
        />
      )}
      {viewingServiceOrderId && <ServiceOrderDetailModal id={viewingServiceOrderId} onClose={() => setViewingServiceOrderId(null)} />}
    </div>
  );
}
