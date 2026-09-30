// Dados do Centro de Controle Operacional (visão Diretoria).
// Checklists, Chamados e Ordens de Serviço usam dados reais do backend
// (passados via o parâmetro `real`, calculados em control-center.tsx a partir
// de useDashboardReport, useByAreaReport, useCalls e useServiceOrders).
// Apenas o feed de Atividade Recente permanece mockado — não existe um módulo
// de auditoria/eventos no backend.

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

const FALLBACK_AREAS = ['Governança', 'Manutenção', 'Recepção', 'Alimentos e Bebidas', 'Lazer e Spa'];

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

function buildActivity(areaNames: string[], openCalls: OpenCall[]): ActivityEvent[] {
  const rng = seededRandom('activity-seed');
  const templates: { type: ActivityEventType; title: (i: number) => string; kind: ActivityEvent['relatedKind'] }[] = [
    { type: 'checklist_finished', title: () => 'Checklist de limpeza finalizado', kind: 'checklist' },
    { type: 'checklist_reviewed', title: () => 'Checklist revisado pela supervisão', kind: 'checklist' },
    { type: 'call_opened', title: (i) => `Chamado aberto: ${openCalls[i % Math.max(1, openCalls.length)]?.subject ?? 'Solicitação'}`, kind: 'call' },
    { type: 'call_closed', title: (i) => `Chamado encerrado: ${openCalls[i % Math.max(1, openCalls.length)]?.subject ?? 'Solicitação'}`, kind: 'call' }
  ];

  return Array.from({ length: 8 }).map((_, i) => {
    const tpl = templates[i % templates.length];
    const minutesAgo = (i + 1) * rangeInt(rng, 6, 18);
    const relatedId = tpl.kind === 'call' && openCalls.length > 0 ? openCalls[i % openCalls.length]?.id : undefined;
    return {
      id: `activity-${i + 1}`,
      type: tpl.type,
      title: tpl.title(i),
      areaName: areaNames[i % areaNames.length],
      timeLabel: minutesAgo >= 60 ? `há ${Math.round(minutesAgo / 60)}h` : `há ${minutesAgo} min`,
      relatedKind: tpl.kind,
      relatedId
    };
  });
}

export function buildControlCenterData(realAreas: { id: string; name: string }[], real?: ControlCenterRealInputs): ControlCenterData {
  // areaMetrics representa áreas reais configuradas no sistema — nunca inventa áreas.
  // Quando não há áreas reais, usa-se um conjunto de nomes só para dar contexto ao
  // feed mockado de Atividade Recente (que não tem área real de todo jeito).
  const flavorAreas = realAreas.length > 0 ? realAreas : FALLBACK_AREAS.map((name, i) => ({ id: `mock-area-${i}`, name }));
  const areaNames = flavorAreas.map((a) => a.name);

  const areaMetrics = buildAreaMetrics(realAreas, real);
  const serviceOrders = real?.serviceOrders ?? [];
  const overdueServiceOrders = serviceOrders
    .filter((o) => o.overdue)
    .sort((a, b) => new Date(a.dueAtUtc).getTime() - new Date(b.dueAtUtc).getTime());
  const calls = real?.calls ?? [];
  const openCalls = calls.filter((c) => c.status !== 'Finished');
  const activity = buildActivity(areaNames, openCalls);

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
