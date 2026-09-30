'use client';
import { useMemo, useState } from 'react';
import { useAuthStore, isSupervisorOrAbove, isManagerOrAbove } from '@/features/auth/store';
import {
  useServiceOrders,
  useAssignServiceOrder,
  useStartServiceOrder,
  useFinishServiceOrder,
  useDeleteServiceOrder
} from '@/features/service-orders/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useUsers } from '@/features/users/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { ErrorBanner } from '@/components/ui/error-banner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import { ServiceOrderListItemDto, ServiceOrderPriority, ServiceOrderStatus } from '@/types/api';
import {
  priorityLabel,
  priorityClass,
  statusLabel,
  statusClass,
  CreateServiceOrderForm,
  ServiceOrderCommentsModal,
  ServiceOrderDetailModal
} from './shared';

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
  critical: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z'
};

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type QuickFilter = 'all' | 'open' | 'inProgress' | 'overdue' | 'finished';

function matchesQuickFilter(o: ServiceOrderListItemDto, filter: QuickFilter): boolean {
  switch (filter) {
    case 'open':
      return o.status === 'Open';
    case 'inProgress':
      return o.status === 'InProgress';
    case 'overdue':
      return o.overdue;
    case 'finished':
      return o.status === 'Finished';
    default:
      return true;
  }
}

function ServiceOrderCard({
  order,
  currentUserId,
  canManage,
  canDelete,
  assignableUsers,
  onView,
  onComments,
  onError
}: {
  order: ServiceOrderListItemDto;
  currentUserId: string;
  canManage: boolean;
  canDelete: boolean;
  assignableUsers: { id: string; name: string }[];
  onView: (id: string) => void;
  onComments: (order: ServiceOrderListItemDto) => void;
  onError: (message: string) => void;
}) {
  const assignServiceOrder = useAssignServiceOrder();
  const startServiceOrder = useStartServiceOrder();
  const finishServiceOrder = useFinishServiceOrder();
  const deleteServiceOrder = useDeleteServiceOrder();
  const pending = assignServiceOrder.isPending || startServiceOrder.isPending || finishServiceOrder.isPending || deleteServiceOrder.isPending;

  async function run(action: () => Promise<unknown>) {
    onError('');
    try {
      await action();
    } catch (err) {
      onError(toApiError(err).message);
    }
  }

  function onDelete() {
    if (!window.confirm(`Excluir a ordem de serviço "${order.subject}"? Esta ação não pode ser desfeita.`)) return;
    run(() => deleteServiceOrder.mutateAsync(order.id));
  }

  return (
    <div className="dc-card" style={{ borderLeftColor: order.overdue ? '#c43c35' : '#64748b' }}>
      <div className="dc-card-col dc-card-col-info">
        <div className="dc-card-title">{order.subject}</div>
        <div className="dc-card-area-row">
          <span>{order.areaName}</span>
          <span className="dc-card-dot">&middot;</span>
          <span>{order.assetName}</span>
        </div>
      </div>

      <div className="dc-card-col dc-card-col-status">
        <div className="dc-card-badges">
          <span className={'status ' + priorityClass[order.priority]}>{priorityLabel[order.priority]}</span>
          <span className={'status ' + statusClass[order.status]}>{statusLabel[order.status]}</span>
          {order.overdue && <span className="status overdue">Atrasada</span>}
        </div>
        <div className="dc-card-elapsed">
          <Icon path={ICONS.open} size={13} /> Vencimento: {formatDateTime(order.dueAtUtc)}
        </div>
        {canManage ? (
          <SearchableSelect
            value={order.assignedUserId ?? ''}
            disabled={pending || order.status === 'Finished'}
            onChange={(v) => run(() => assignServiceOrder.mutateAsync({ id: order.id, userId: v || null }))}
            placeholder="Não designado"
            className="dc-card-responsible-select"
            options={assignableUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
        ) : (
          <div className="dc-card-responsible">{order.assignedUserId ? (order.assignedUserName ?? 'Designado') : 'Não designado'}</div>
        )}
      </div>

      <div className="dc-card-col dc-card-col-actions">
        <button type="button" className="icon-btn" title="Ver detalhes" onClick={() => onView(order.id)}>
          <EyeIcon />
        </button>
        <button type="button" className="icon-btn" title="Comentários" onClick={() => onComments(order)}>
          <Icon path={ICONS.chat} size={16} />
          {order.commentCount > 0 && <span className="icon-badge">{order.commentCount}</span>}
        </button>
        {canManage && order.status === 'Open' && (
          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => startServiceOrder.mutateAsync(order.id))}>
            Iniciar
          </button>
        )}
        {canManage && order.status === 'InProgress' && (
          <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => finishServiceOrder.mutateAsync(order.id))}>
            Concluir
          </button>
        )}
        {canDelete && (
          <button type="button" className="icon-btn" title="Excluir" disabled={pending} onClick={onDelete}>
            <Icon path={ICONS.trash} size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ServiceOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = isSupervisorOrAbove(user?.role);
  const canDelete = isManagerOrAbove(user?.role);
  const areas = useAreas();
  const assignableUsersQuery = useUsers({ active: true }, canManage);
  const [areaId, setAreaId] = useState('');
  const [status, setStatus] = useState<ServiceOrderStatus | 'Todos'>('Todos');
  const [priority, setPriority] = useState<ServiceOrderPriority | 'Todas'>('Todas');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const serviceOrders = useServiceOrders({ areaId: areaId || undefined, status, priority });
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [commentsOrder, setCommentsOrder] = useState<ServiceOrderListItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignableUsers = assignableUsersQuery.data ?? [];
  const list = serviceOrders.data ?? [];

  const open = list.filter((o) => o.status === 'Open').length;
  const inProgress = list.filter((o) => o.status === 'InProgress').length;
  const finished = list.filter((o) => o.status === 'Finished').length;
  const overdue = list.filter((o) => o.overdue).length;

  const areaOptions = useMemo(() => areas.data ?? [], [areas.data]);

  function toggleQuickFilter(filter: QuickFilter) {
    setQuickFilter((prev) => (prev === filter ? 'all' : filter));
  }

  const searchTerm = search.trim().toLowerCase();
  const filtered = list.filter((o) => {
    if (!matchesQuickFilter(o, quickFilter)) return false;
    if (!searchTerm) return true;
    return (
      o.subject.toLowerCase().includes(searchTerm) ||
      o.assetName.toLowerCase().includes(searchTerm) ||
      o.areaName.toLowerCase().includes(searchTerm) ||
      (o.assignedUserName ?? '').toLowerCase().includes(searchTerm)
    );
  });

  return (
    <RequireRole roles={['Directoria']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Ordens de Serviço</h1>
            <p className="page-subtitle">Situação operativa da manutenção do resort.</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + Criar ordem de serviço
            </button>
          )}
        </div>

        <ErrorBanner message={error} />
        {creating && <CreateServiceOrderForm onClose={() => setCreating(false)} />}

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
              <div className="dc-kpi-value">{open}</div>
              <div className="dc-kpi-label">Abertas</div>
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
              <div className="dc-kpi-value">{inProgress}</div>
              <div className="dc-kpi-label">Em Andamento</div>
            </div>
          </button>
          <button
            type="button"
            className={'dc-kpi-card' + (quickFilter === 'overdue' ? ' selected' : '')}
            style={{ background: 'rgba(196,60,53,.07)' }}
            onClick={() => toggleQuickFilter('overdue')}
          >
            <span className="dc-kpi-icon" style={{ background: '#ffebe9', color: '#c43c35' }}>
              <Icon path={ICONS.critical} />
            </span>
            <div>
              <div className="dc-kpi-value">{overdue}</div>
              <div className="dc-kpi-label">Atrasadas</div>
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
              <div className="dc-kpi-value">{finished}</div>
              <div className="dc-kpi-label">Finalizadas</div>
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
              options={[{ value: '', label: 'Todas as áreas' }, ...areaOptions.map((a) => ({ value: a.id, label: a.name }))]}
            />
            <SearchableSelect
              value={status}
              onChange={(v) => setStatus(v as ServiceOrderStatus | 'Todos')}
              className="btn btn-secondary"
              options={[
                { value: 'Todos', label: 'Todos os status' },
                { value: 'Open', label: 'Aberta' },
                { value: 'InProgress', label: 'Em andamento' },
                { value: 'Finished', label: 'Concluída' }
              ]}
            />
            <SearchableSelect
              value={priority}
              onChange={(v) => setPriority(v as ServiceOrderPriority | 'Todas')}
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
            placeholder="Buscar ordens de serviço…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card-list">
          {filtered.map((o) => (
            <ServiceOrderCard
              key={o.id}
              order={o}
              currentUserId={user?.id ?? ''}
              canManage={canManage}
              canDelete={canDelete}
              assignableUsers={assignableUsers}
              onView={setViewingId}
              onComments={setCommentsOrder}
              onError={setError}
            />
          ))}
          {serviceOrders.isLoading && <p className="muted">Carregando…</p>}
          {!serviceOrders.isLoading && filtered.length === 0 && <div className="card empty">Nenhuma ordem de serviço encontrada.</div>}
        </div>

        {viewingId && <ServiceOrderDetailModal id={viewingId} onClose={() => setViewingId(null)} />}
        {commentsOrder && (
          <ServiceOrderCommentsModal serviceOrderId={commentsOrder.id} subject={commentsOrder.subject} onClose={() => setCommentsOrder(null)} />
        )}
      </div>
    </RequireRole>
  );
}
