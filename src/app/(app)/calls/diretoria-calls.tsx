'use client';
import { useEffect, useState } from 'react';
import { useCalls, useCall, useAssignCall, useStartCall, useFinishCall } from '@/features/calls/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useUsers } from '@/features/users/hooks';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDateTime, todayIso } from '@/lib/format';
import { CallListItemDto, CallPriority, CallStatus } from '@/types/api';
import { priorityLabel, priorityClass, statusLabel, statusClass, CreateCallForm, CallCommentsModal, CallDetailModal } from './shared';

const STATUS_BAR_COLOR: Record<CallStatus, string> = { Open: '#64748b', InProgress: '#315bd6', Finished: '#16794e' };
const CONVERTED_BAR_COLOR = '#7c3aed';

const STORAGE_KEY = 'hotelops-call-service-order-links';

interface ServiceOrderLink {
  callId: string;
  serviceOrderId: string;
  description: string;
  areaName: string;
  responsibleName: string;
  priority: CallPriority;
  createdAtIso: string;
}

function loadLinks(): Record<string, ServiceOrderLink> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ServiceOrderLink>) : {};
  } catch {
    return {};
  }
}

function saveLinks(links: Record<string, ServiceOrderLink>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    // ignora falha de armazenamento local (modo privado, quota, etc.)
  }
}

function elapsedLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days === 1 ? '' : 's'}`;
}

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  open: 'M12 8v4l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  inProgress: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.64M21 3v6h-6',
  finished: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  critical: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01'
};

type QuickFilter = 'all' | 'open' | 'in-progress' | 'critical' | 'converted-os' | 'finished';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abertos' },
  { key: 'in-progress', label: 'Em Andamento' },
  { key: 'critical', label: 'Críticos' },
  { key: 'converted-os', label: 'Convertidos em OS' },
  { key: 'finished', label: 'Finalizados' }
];

function ConvertToServiceOrderModal({
  call,
  onClose,
  onConfirm
}: {
  call: CallListItemDto;
  onClose: () => void;
  onConfirm: (link: ServiceOrderLink) => void;
}) {
  const [description, setDescription] = useState(call.subject);
  const [responsibleName, setResponsibleName] = useState(call.assignedUserName ?? '');
  const [priority, setPriority] = useState<CallPriority>(call.priority);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm({
      callId: call.id,
      serviceOrderId: `so-call-${call.id}`,
      description,
      areaName: call.areaName,
      responsibleName: responsibleName || 'Não definido',
      priority,
      createdAtIso: new Date().toISOString()
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Converter em Ordem de Serviço</h2>
          <p>Cria um vínculo entre o chamado e uma ordem de serviço</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
            O módulo de Ordens de Serviço ainda não está integrado ao backend. Este recurso cria um vínculo de
            demonstração, armazenado apenas neste navegador, para representar a relação entre o chamado e a ordem de
            serviço.
          </p>
          <form onSubmit={onSubmit}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <label>Descrição da ordem de serviço</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={200} />
              </div>
              <div className="field">
                <label>Responsável</label>
                <input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} maxLength={120} />
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
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary">Converter em Ordem de Serviço</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ServiceOrderLinkModal({ link, onClose }: { link: ServiceOrderLink; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{link.description}</h2>
          <p>Ordem de serviço vinculada</p>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Área
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{link.areaName}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Responsável
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{link.responsibleName}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Prioridade
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{priorityLabel[link.priority]}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Criada em
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{formatDateTime(link.createdAtIso)}</div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
            Dados de demonstração — o módulo de Ordens de Serviço ainda não está integrado ao backend.
          </p>
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
  link?: ServiceOrderLink;
  assignableUsers: { id: string; name: string }[];
  onView: (id: string) => void;
  onComments: (call: CallListItemDto) => void;
  onConvert: (call: CallListItemDto) => void;
  onViewLink: (link: ServiceOrderLink) => void;
  onError: (message: string) => void;
}) {
  const assignCall = useAssignCall();
  const startCall = useStartCall();
  const finishCall = useFinishCall();
  const detail = useCall(call.id);
  const pending = assignCall.isPending || startCall.isPending || finishCall.isPending;

  async function run(action: () => Promise<unknown>) {
    onError('');
    try {
      await action();
    } catch (err) {
      onError(toApiError(err).message);
    }
  }

  const accentColor = link ? CONVERTED_BAR_COLOR : STATUS_BAR_COLOR[call.status];
  const statusBadge = link ? { label: 'Convertido em OS', className: 'status ready' } : { label: statusLabel[call.status], className: 'status ' + statusClass[call.status] };
  const description = detail.data?.description?.trim();

  return (
    <div className="dc-card" style={{ borderLeftColor: accentColor }}>
      <div className="dc-card-header">
        <div className="dc-card-heading">
          <div className="dc-card-title">{call.subject}</div>
          <div className="dc-card-area">{call.areaName}</div>
        </div>
        <div className="dc-card-badges">
          <span className={'status ' + priorityClass[call.priority]}>{priorityLabel[call.priority]}</span>
          <span className={statusBadge.className}>{statusBadge.label}</span>
        </div>
      </div>

      <div className="dc-card-info">
        <span>Aberto por {call.createdByUserName}</span>
        <span className="dc-card-dot">·</span>
        <span>{elapsedLabel(call.createdAtUtc)}</span>
      </div>

      <p className="dc-card-desc">{description || (detail.isLoading ? ' ' : 'Sem descrição.')}</p>

      <div className="dc-card-footer">
        <div className="dc-card-responsible">
          <span className="dc-card-meta-label">Responsável</span>
          <SearchableSelect
            value={call.assignedUserId ?? ''}
            disabled={pending || call.status === 'Finished'}
            onChange={(v) => run(() => assignCall.mutateAsync({ id: call.id, userId: v || null }))}
            placeholder="Não designado"
            className="dc-card-responsible-select"
            options={assignableUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>

        <div className="dc-card-actions">
          {call.status === 'Open' && call.assignedUserId && (
            <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => startCall.mutateAsync(call.id))}>
              Iniciar
            </button>
          )}
          {call.status === 'InProgress' && (
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => finishCall.mutateAsync(call.id))}>
              Finalizar Chamado
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onView(call.id)}>
            Ver Detalhes
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onComments(call)}>
            Comentários{call.commentCount > 0 ? ` (${call.commentCount})` : ''}
          </button>
          {!link && call.status !== 'Finished' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onConvert(call)}>
              Converter em OS
            </button>
          )}
          {link && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onViewLink(link)}>
              Ver OS
            </button>
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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const calls = useCalls({ areaId: areaId || undefined, status, priority });
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [commentsCall, setCommentsCall] = useState<CallListItemDto | null>(null);
  const [convertingCall, setConvertingCall] = useState<CallListItemDto | null>(null);
  const [viewingLink, setViewingLink] = useState<ServiceOrderLink | null>(null);
  const [links, setLinks] = useState<Record<string, ServiceOrderLink>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLinks(loadLinks());
  }, []);

  const assignableUsers = assignableUsersQuery.data ?? [];
  const list = calls.data ?? [];

  const abertos = list.filter((c) => c.status === 'Open').length;
  const emAndamento = list.filter((c) => c.status === 'InProgress').length;
  const today = todayIso();
  const finalizadosHoje = list.filter((c) => c.status === 'Finished' && c.completedAt?.slice(0, 10) === today).length;
  const criticos = list.filter((c) => c.priority === 'Alta' && c.status !== 'Finished').length;

  function matchesQuickFilter(c: CallListItemDto, filter: QuickFilter): boolean {
    switch (filter) {
      case 'open':
        return c.status === 'Open';
      case 'in-progress':
        return c.status === 'InProgress';
      case 'finished':
        return c.status === 'Finished';
      case 'critical':
        return c.priority === 'Alta' && c.status !== 'Finished';
      case 'converted-os':
        return !!links[c.id];
      default:
        return true;
    }
  }

  const quickFilterCounts: Record<QuickFilter, number> = {
    all: list.length,
    open: abertos,
    'in-progress': emAndamento,
    critical: criticos,
    'converted-os': list.filter((c) => !!links[c.id]).length,
    finished: list.filter((c) => c.status === 'Finished').length
  };

  const searchTerm = search.trim().toLowerCase();
  const filtered = list.filter((c) => {
    if (!matchesQuickFilter(c, quickFilter)) return false;
    if (!searchTerm) return true;
    return (
      c.subject.toLowerCase().includes(searchTerm) ||
      c.areaName.toLowerCase().includes(searchTerm) ||
      (c.assignedUserName ?? '').toLowerCase().includes(searchTerm) ||
      c.createdByUserName.toLowerCase().includes(searchTerm)
    );
  });

  function onConfirmConvert(link: ServiceOrderLink) {
    setLinks((prev) => {
      const next = { ...prev, [link.callId]: link };
      saveLinks(next);
      return next;
    });
    setConvertingCall(null);
  }

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
        <div className="dc-kpi-card" style={{ background: 'rgba(154,103,0,.07)' }}>
          <span className="dc-kpi-icon" style={{ background: '#fff4d6', color: '#9a6700' }}>
            <Icon path={ICONS.open} />
          </span>
          <div>
            <div className="dc-kpi-value">{abertos}</div>
            <div className="dc-kpi-label">Abertos</div>
          </div>
        </div>
        <div className="dc-kpi-card" style={{ background: 'rgba(55,102,245,.07)' }}>
          <span className="dc-kpi-icon" style={{ background: '#e9efff', color: '#3766f5' }}>
            <Icon path={ICONS.inProgress} />
          </span>
          <div>
            <div className="dc-kpi-value">{emAndamento}</div>
            <div className="dc-kpi-label">Em Andamento</div>
          </div>
        </div>
        <div className="dc-kpi-card" style={{ background: 'rgba(22,121,78,.07)' }}>
          <span className="dc-kpi-icon" style={{ background: '#def7ec', color: '#16794e' }}>
            <Icon path={ICONS.finished} />
          </span>
          <div>
            <div className="dc-kpi-value">{finalizadosHoje}</div>
            <div className="dc-kpi-label">Finalizados Hoje</div>
          </div>
        </div>
        <div className="dc-kpi-card" style={{ background: 'rgba(196,60,53,.07)' }}>
          <span className="dc-kpi-icon" style={{ background: '#ffebe9', color: '#c43c35' }}>
            <Icon path={ICONS.critical} />
          </span>
          <div>
            <div className="dc-kpi-value">{criticos}</div>
            <div className="dc-kpi-label">Críticos</div>
          </div>
        </div>
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

      <div className="dc-quick-filters">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'dc-quick-filter' + (quickFilter === f.key ? ' selected' : '')}
            onClick={() => setQuickFilter(f.key)}
          >
            <span>{f.label}</span>
            <span className="dc-quick-filter-count">{quickFilterCounts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="card-list">
        {filtered.map((c) => (
          <DiretoriaCallCard
            key={c.id}
            call={c}
            link={links[c.id]}
            assignableUsers={assignableUsers}
            onView={setViewingId}
            onComments={setCommentsCall}
            onConvert={setConvertingCall}
            onViewLink={setViewingLink}
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
        <ConvertToServiceOrderModal call={convertingCall} onClose={() => setConvertingCall(null)} onConfirm={onConfirmConvert} />
      )}
      {viewingLink && <ServiceOrderLinkModal link={viewingLink} onClose={() => setViewingLink(null)} />}
    </div>
  );
}
