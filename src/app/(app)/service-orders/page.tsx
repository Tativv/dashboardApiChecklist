'use client';
import { useMemo, useState } from 'react';
import { useAreas } from '@/features/areas/hooks';
import { buildControlCenterData, ServiceOrder, MockPriority } from '@/features/control-center/mock';
import { RequireRole } from '@/components/ui/require-role';
import { SearchableSelect } from '@/components/ui/searchable-select';

const PRIORITY_LABEL: Record<MockPriority, string> = { Baixa: 'Baixa', Media: 'Média', Alta: 'Alta' };
const PRIORITY_CLASS: Record<MockPriority, string> = { Baixa: 'ready', Media: 'progress', Alta: 'overdue' };

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

const ICONS = {
  open: 'M12 8v4l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  inProgress: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.64M21 3v6h-6',
  finished: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  critical: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01'
};

function ModalShell({
  title,
  subtitle,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
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

function ServiceOrderDetailModal({ order, onClose }: { order: ServiceOrder; onClose: () => void }) {
  return (
    <ModalShell title={order.description} subtitle={`${order.assetName} · ${order.areaName}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <span className={'status ' + PRIORITY_CLASS[order.priority]}>{PRIORITY_LABEL[order.priority]}</span>
        <span className="status overdue">Atrasada há {order.daysOverdue}d</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Responsável
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{order.responsibleName}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Última execução
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{order.lastExecutionLabel}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Próxima execução
          </div>
          <div style={{ fontSize: 14, marginTop: 2, color: '#c43c35', fontWeight: 600 }}>{order.nextExecutionLabel}</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Motivo do atraso
        </div>
        <p style={{ fontSize: 14, marginTop: 4 }}>{order.overdueReason}</p>
      </div>
      <div style={{ marginTop: 18 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
          Histórico
        </div>
        <div className="timeline">
          {order.history.map((h, i) => (
            <div className="timeline-item event" key={i}>
              <span className="timeline-dot" />
              <div className="timeline-text">{h.event}</div>
              <div className="timeline-meta">
                <span>{h.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
        Dados de demonstração — o módulo de Ordens de Serviço ainda não está integrado ao backend.
      </p>
    </ModalShell>
  );
}

type QuickFilter = 'all' | 'alta' | 'media' | 'baixa' | 'critical';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'alta', label: 'Alta' },
  { key: 'media', label: 'Média' },
  { key: 'baixa', label: 'Baixa' },
  { key: 'critical', label: 'Muito atrasadas' }
];

function matchesQuickFilter(o: ServiceOrder, filter: QuickFilter): boolean {
  switch (filter) {
    case 'alta':
      return o.priority === 'Alta';
    case 'media':
      return o.priority === 'Media';
    case 'baixa':
      return o.priority === 'Baixa';
    case 'critical':
      return o.daysOverdue >= 7;
    default:
      return true;
  }
}

function ServiceOrderCard({ order, onView }: { order: ServiceOrder; onView: (order: ServiceOrder) => void }) {
  return (
    <div className="dc-card" style={{ borderLeftColor: '#c43c35' }}>
      <div className="dc-card-col dc-card-col-info">
        <div className="dc-card-title">{order.description}</div>
        <div className="dc-card-area-row">
          <span>{order.areaName}</span>
          <span className="dc-card-dot">&middot;</span>
          <span>{order.assetName}</span>
        </div>
        <p className="dc-card-desc">{order.overdueReason}</p>
      </div>

      <div className="dc-card-col dc-card-col-status">
        <div className="dc-card-badges">
          <span className={'status ' + PRIORITY_CLASS[order.priority]}>{PRIORITY_LABEL[order.priority]}</span>
          <span className="status overdue">Atrasada</span>
        </div>
        <div className="dc-card-elapsed">
          <Icon path={ICONS.open} size={13} /> Atrasada há {order.daysOverdue} dia{order.daysOverdue === 1 ? '' : 's'}
        </div>
        <div className="dc-card-responsible">{order.responsibleName}</div>
      </div>

      <div className="dc-card-col dc-card-col-actions">
        <button type="button" className="icon-btn" title="Ver detalhes" onClick={() => onView(order)}>
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}

export default function ServiceOrdersPage() {
  const areasQuery = useAreas();
  const data = useMemo(() => buildControlCenterData(areasQuery.data ?? []), [areasQuery.data]);
  const orders = data.serviceOrders;

  const [areaName, setAreaName] = useState('');
  const [priority, setPriority] = useState<MockPriority | 'Todas'>('Todas');
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [viewingOrder, setViewingOrder] = useState<ServiceOrder | null>(null);

  const areaOptions = useMemo(() => Array.from(new Set(orders.map((o) => o.areaName))).sort((a, b) => a.localeCompare(b)), [orders]);

  const baseFiltered = orders.filter((o) => {
    if (areaName && o.areaName !== areaName) return false;
    if (priority !== 'Todas' && o.priority !== priority) return false;
    return true;
  });

  const quickFilterCounts: Record<QuickFilter, number> = {
    all: baseFiltered.length,
    alta: baseFiltered.filter((o) => o.priority === 'Alta').length,
    media: baseFiltered.filter((o) => o.priority === 'Media').length,
    baixa: baseFiltered.filter((o) => o.priority === 'Baixa').length,
    critical: baseFiltered.filter((o) => o.daysOverdue >= 7).length
  };

  const searchTerm = search.trim().toLowerCase();
  const filtered = baseFiltered.filter((o) => {
    if (!matchesQuickFilter(o, quickFilter)) return false;
    if (!searchTerm) return true;
    return (
      o.description.toLowerCase().includes(searchTerm) ||
      o.assetName.toLowerCase().includes(searchTerm) ||
      o.areaName.toLowerCase().includes(searchTerm) ||
      o.responsibleName.toLowerCase().includes(searchTerm)
    );
  });

  const { open, inProgress, overdue, completedThisWeek } = data.serviceOrdersSummary;

  return (
    <RequireRole roles={['Directoria']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Ordens de Serviço</h1>
            <p className="page-subtitle">Situação operativa da manutenção do resort.</p>
          </div>
        </div>

        <p className="muted" style={{ fontSize: 12.5, marginTop: -14, marginBottom: 20 }}>
          Módulo de demonstração — os dados são simulados até que o backend tenha um módulo próprio de Ordens de
          Serviço.
        </p>

        <div className="dc-kpi-grid">
          <div className="dc-kpi-card" style={{ background: 'rgba(154,103,0,.07)' }}>
            <span className="dc-kpi-icon" style={{ background: '#fff4d6', color: '#9a6700' }}>
              <Icon path={ICONS.open} />
            </span>
            <div>
              <div className="dc-kpi-value">{open}</div>
              <div className="dc-kpi-label">Abertas</div>
            </div>
          </div>
          <div className="dc-kpi-card" style={{ background: 'rgba(55,102,245,.07)' }}>
            <span className="dc-kpi-icon" style={{ background: '#e9efff', color: '#3766f5' }}>
              <Icon path={ICONS.inProgress} />
            </span>
            <div>
              <div className="dc-kpi-value">{inProgress}</div>
              <div className="dc-kpi-label">Em Andamento</div>
            </div>
          </div>
          <div className="dc-kpi-card" style={{ background: 'rgba(22,121,78,.07)' }}>
            <span className="dc-kpi-icon" style={{ background: '#def7ec', color: '#16794e' }}>
              <Icon path={ICONS.finished} />
            </span>
            <div>
              <div className="dc-kpi-value">{completedThisWeek}</div>
              <div className="dc-kpi-label">Concluídas na semana</div>
            </div>
          </div>
          <div className="dc-kpi-card" style={{ background: 'rgba(196,60,53,.07)' }}>
            <span className="dc-kpi-icon" style={{ background: '#ffebe9', color: '#c43c35' }}>
              <Icon path={ICONS.critical} />
            </span>
            <div>
              <div className="dc-kpi-value">{overdue}</div>
              <div className="dc-kpi-label">Atrasadas</div>
            </div>
          </div>
        </div>

        <div className="dc-filters-row">
          <div className="dc-filters-left">
            <SearchableSelect
              value={areaName}
              onChange={setAreaName}
              placeholder="Todas as áreas"
              className="btn btn-secondary"
              options={[{ value: '', label: 'Todas as áreas' }, ...areaOptions.map((a) => ({ value: a, label: a }))]}
            />
            <SearchableSelect
              value={priority}
              onChange={(v) => setPriority(v as MockPriority | 'Todas')}
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
          {filtered.map((o) => (
            <ServiceOrderCard key={o.id} order={o} onView={setViewingOrder} />
          ))}
          {filtered.length === 0 && <div className="card empty">Nenhuma ordem de serviço encontrada.</div>}
        </div>

        {viewingOrder && <ServiceOrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />}
      </div>
    </RequireRole>
  );
}
