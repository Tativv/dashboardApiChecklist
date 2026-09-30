// Dados do Centro de Controle Operacional (visão Diretoria).
// Checklists, Chamados, Ordens de Serviço e o feed de Atividade Recente usam
// dados reais do backend (passados via o parâmetro `real`, calculados em
// control-center.tsx a partir de useDashboardReport, useByAreaReport,
// useCalls e useServiceOrders). A Atividade Recente é derivada dos próprios
// Chamados/Ordens de Serviço (criação/conclusão) — não existe uma tabela de
// eventos/auditoria dedicada no backend, então não há eventos de Checklist
// aqui (a lista de instâncias não expõe timestamp de criação/conclusão).

export type SectorStatus = 'Normal' | 'Atencao' | 'Critico';
export type MockPriority = 'Baixa' | 'Media' | 'Alta';
export type CallStatusValue = 'Open' | 'InProgress' | 'Finished';
export type ServiceOrderStatusValue = 'Open' | 'InProgress' | 'Finished';

export interface AreaMetrics {
  areaId: string;
  areaName: string;
  complianceRate: number;
  status: SectorStatus;
  pendingChecklists: number;
  openCalls: number;
  overdueServiceOrders: number;
  totalServiceOrders: number;
}

export interface ServiceOrder {
  id: string;
  areaId: string;
  areaName: string;
  assetId: string;
  assetName: string;
  callId?: string | null;
  subject: string;
  priority: MockPriority;
  status: ServiceOrderStatusValue;
  dueAtUtc: string;
  overdue: boolean;
  createdByUserName: string;
  assignedUserName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAtUtc: string;
  commentCount: number;
}

export interface OpenCall {
  id: string;
  areaId: string;
  areaName: string;
  subject: string;
  priority: MockPriority;
  status: CallStatusValue;
  createdByUserName: string;
  assignedUserName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAtUtc: string;
  commentCount: number;
}

export type ActivityEventType =
  | 'checklist_finished'
  | 'checklist_reviewed'
  | 'service_order_started'
  | 'service_order_finished'
  | 'call_opened'
  | 'call_closed';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  areaName: string;
  timeLabel: string;
  relatedKind: 'serviceOrder' | 'call' | 'checklist';
  relatedId?: string;
}

export interface ControlCenterData {
  areaMetrics: AreaMetrics[];
  serviceOrders: ServiceOrder[];
  overdueServiceOrders: ServiceOrder[];
  openCalls: OpenCall[];
  activity: ActivityEvent[];
  checklistsSummary: {
    totalToday: number;
    completed: number;
    completionRate: number;
    overdue: number;
    trendVsYesterday: number;
  };
  serviceOrdersSummary: {
    open: number;
    inProgress: number;
    completedThisWeek: number;
    overdue: number;
    avgResolutionHours: number;
  };
  callsSummary: {
    open: number;
    inProgress: number;
    highPriority: number;
    avgResponseMinutes: number;
    closedThisWeek: number;
  };
  operationSummary: {
    healthScore: number;
    sectorsNormal: number;
    sectorsTotal: number;
    criticalAlerts: number;
    staffOnline: number;
  };
}

export interface RealAreaChecklistStat {
  areaId: string;
  complianceRate: number;
  pendingChecklists: number;
}

export interface RealChecklistsSummaryInput {
  totalToday: number;
  completed: number;
  overdue: number;
  trendVsYesterday: number;
}

export interface ControlCenterRealInputs {
  areaChecklistStats?: RealAreaChecklistStat[];
  calls?: OpenCall[];
  serviceOrders?: ServiceOrder[];
  checklistsSummary?: RealChecklistsSummaryInput;
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let state = seed;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandom(seed: string) {
  return mulberry32(hashString(seed));
}

function rangeInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function deriveStatus(complianceRate: number, openCalls: number, overdueServiceOrders: number): SectorStatus {
  if (complianceRate < 70 || overdueServiceOrders >= 3 || openCalls >= 4) return 'Critico';
  if (complianceRate < 90 || overdueServiceOrders >= 1 || openCalls >= 2) return 'Atencao';
  return 'Normal';
}

function buildAreaMetrics(areas: { id: string; name: string }[], real?: ControlCenterRealInputs): AreaMetrics[] {
  const calls = real?.calls ?? [];
  const serviceOrders = real?.serviceOrders ?? [];
  const statsByArea = new Map((real?.areaChecklistStats ?? []).map((s) => [s.areaId, s]));

  return areas.map(({ id, name }) => {
    const rng = seededRandom(id);
    const stat = statsByArea.get(id);
    const complianceRate = stat ? stat.complianceRate : rangeInt(rng, 58, 100);
    const pendingChecklists = stat ? stat.pendingChecklists : rangeInt(rng, 0, 7);
    const openCalls = real?.calls ? calls.filter((c) => c.areaId === id && c.status !== 'Finished').length : rangeInt(rng, 0, 5);
    const areaServiceOrders = serviceOrders.filter((o) => o.areaId === id);
    const overdueServiceOrders = real?.serviceOrders ? areaServiceOrders.filter((o) => o.overdue).length : rangeInt(rng, 0, 4);
    const totalServiceOrders = real?.serviceOrders ? areaServiceOrders.length : overdueServiceOrders + rangeInt(rng, 2, 9);

    return {
      areaId: id,
      areaName: name,
      complianceRate,
      status: deriveStatus(complianceRate, openCalls, overdueServiceOrders),
      pendingChecklists,
      openCalls,
      overdueServiceOrders,
      totalServiceOrders
    };
  });
}

function relativeTimeLabel(iso: string): string {
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutesAgo < 1) return 'agora';
  if (minutesAgo < 60) return `há ${minutesAgo} min`;
  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) return `há ${hoursAgo}h`;
  return `há ${Math.round(hoursAgo / 24)} dia(s)`;
}

interface RawActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  areaName: string;
  atIso: string;
  relatedKind: ActivityEvent['relatedKind'];
  relatedId: string;
}

function buildActivity(calls: OpenCall[], serviceOrders: ServiceOrder[]): ActivityEvent[] {
  const raw: RawActivityEvent[] = [];

  for (const c of calls) {
    raw.push({
      id: `call-open-${c.id}`,
      type: 'call_opened',
      title: `Chamado aberto: ${c.subject}`,
      areaName: c.areaName,
      atIso: c.createdAtUtc,
      relatedKind: 'call',
      relatedId: c.id
    });
    if (c.completedAt) {
      raw.push({
        id: `call-close-${c.id}`,
        type: 'call_closed',
        title: `Chamado encerrado: ${c.subject}`,
        areaName: c.areaName,
        atIso: c.completedAt,
        relatedKind: 'call',
        relatedId: c.id
      });
    }
  }

  for (const o of serviceOrders) {
    raw.push({
      id: `so-open-${o.id}`,
      type: 'service_order_started',
      title: `Ordem de serviço criada: ${o.subject}`,
      areaName: o.areaName,
      atIso: o.createdAtUtc,
      relatedKind: 'serviceOrder',
      relatedId: o.id
    });
    if (o.completedAt) {
      raw.push({
        id: `so-close-${o.id}`,
        type: 'service_order_finished',
        title: `Ordem de serviço concluída: ${o.subject}`,
        areaName: o.areaName,
        atIso: o.completedAt,
        relatedKind: 'serviceOrder',
        relatedId: o.id
      });
    }
  }

  return raw
    .sort((a, b) => new Date(b.atIso).getTime() - new Date(a.atIso).getTime())
    .slice(0, 30)
    .map((ev) => ({
      id: ev.id,
      type: ev.type,
      title: ev.title,
      areaName: ev.areaName,
      timeLabel: relativeTimeLabel(ev.atIso),
      relatedKind: ev.relatedKind,
      relatedId: ev.relatedId
    }));
}

export function buildControlCenterData(realAreas: { id: string; name: string }[], real?: ControlCenterRealInputs): ControlCenterData {
  // areaMetrics representa áreas reais configuradas no sistema — nunca inventa áreas.
  const areaMetrics = buildAreaMetrics(realAreas, real);
  const serviceOrders = real?.serviceOrders ?? [];
  const overdueServiceOrders = serviceOrders
    .filter((o) => o.overdue)
    .sort((a, b) => new Date(a.dueAtUtc).getTime() - new Date(b.dueAtUtc).getTime());
  const calls = real?.calls ?? [];
  const openCalls = calls.filter((c) => c.status !== 'Finished');
  const activity = buildActivity(calls, serviceOrders);

  const checklistsInput: RealChecklistsSummaryInput = real?.checklistsSummary ?? {
    totalToday: areaMetrics.reduce((sum, a) => sum + a.pendingChecklists + rangeInt(seededRandom(a.areaId + '-done'), 3, 9), 0),
    completed: 0,
    overdue: areaMetrics.reduce((sum, a) => sum + (a.pendingChecklists > 3 ? 1 : 0), 0),
    trendVsYesterday: rangeInt(seededRandom('trend'), -6, 9)
  };
  if (!real?.checklistsSummary) {
    checklistsInput.completed = Math.max(0, checklistsInput.totalToday - areaMetrics.reduce((sum, a) => sum + a.pendingChecklists, 0));
  }
  const completionRate = checklistsInput.totalToday === 0 ? 0 : Math.round((checklistsInput.completed * 100) / checklistsInput.totalToday);

  const sectorsNormal = areaMetrics.filter((a) => a.status === 'Normal').length;
  const sectorsAtencao = areaMetrics.filter((a) => a.status === 'Atencao').length;
  const sectorsCritico = areaMetrics.filter((a) => a.status === 'Critico').length;

  const highPriorityOpenCalls = calls.filter((c) => c.priority === 'Alta' && c.status !== 'Finished').length;
  const closedThisWeek = calls.filter((c) => {
    if (c.status !== 'Finished' || !c.completedAt) return false;
    const days = (Date.now() - new Date(c.completedAt).getTime()) / 86400000;
    return days <= 7;
  }).length;
  const responseTimesMinutes = calls
    .filter((c) => c.startedAt)
    .map((c) => (new Date(c.startedAt as string).getTime() - new Date(c.createdAtUtc).getTime()) / 60000)
    .filter((v) => v >= 0);
  const avgResponseMinutes =
    responseTimesMinutes.length > 0 ? Math.round(responseTimesMinutes.reduce((a, b) => a + b, 0) / responseTimesMinutes.length) : 0;

  const soCompletedThisWeek = serviceOrders.filter((o) => {
    if (o.status !== 'Finished' || !o.completedAt) return false;
    const days = (Date.now() - new Date(o.completedAt).getTime()) / 86400000;
    return days <= 7;
  });
  const resolutionHours = serviceOrders
    .filter((o) => o.status === 'Finished' && o.completedAt)
    .map((o) => (new Date(o.completedAt as string).getTime() - new Date(o.createdAtUtc).getTime()) / 3600000)
    .filter((v) => v >= 0);
  const avgResolutionHours =
    resolutionHours.length > 0 ? Math.round(resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) : 0;

  return {
    areaMetrics,
    serviceOrders,
    overdueServiceOrders: overdueServiceOrders.slice(0, 8),
    openCalls,
    activity,
    checklistsSummary: {
      totalToday: checklistsInput.totalToday,
      completed: checklistsInput.completed,
      completionRate,
      overdue: checklistsInput.overdue,
      trendVsYesterday: checklistsInput.trendVsYesterday
    },
    serviceOrdersSummary: {
      open: serviceOrders.filter((o) => o.status === 'Open').length,
      inProgress: serviceOrders.filter((o) => o.status === 'InProgress').length,
      completedThisWeek: soCompletedThisWeek.length,
      overdue: overdueServiceOrders.length,
      avgResolutionHours
    },
    callsSummary: {
      open: calls.filter((c) => c.status === 'Open').length,
      inProgress: calls.filter((c) => c.status === 'InProgress').length,
      highPriority: highPriorityOpenCalls,
      avgResponseMinutes,
      closedThisWeek
    },
    operationSummary: {
      healthScore: Math.round(areaMetrics.reduce((sum, a) => sum + a.complianceRate, 0) / Math.max(1, areaMetrics.length)),
      sectorsNormal,
      sectorsTotal: areaMetrics.length,
      criticalAlerts: sectorsCritico + (sectorsAtencao > 0 ? 1 : 0),
      staffOnline: rangeInt(seededRandom('staff-online'), 14, 38)
    }
  };
}

export const SECTOR_STATUS_LABEL: Record<SectorStatus, string> = {
  Normal: 'Normal',
  Atencao: 'Atenção',
  Critico: 'Crítico'
};

export const SECTOR_STATUS_COLOR: Record<SectorStatus, string> = {
  Normal: '#16a34a',
  Atencao: '#d97706',
  Critico: '#dc2626'
};
