// Dados do Centro de Controle Operacional (visão Diretoria).
// Checklists e Chamados usam dados reais do backend (passados via o parâmetro
// `real`, calculados em control-center.tsx a partir de useDashboardReport,
// useByAreaReport e useCalls). Apenas Ordens de Serviço permanece mockado —
// esse módulo não existe de fato no backend (confirmado em auditoria do
// repositório apiChecklist: nenhuma entidade, migração ou endpoint relacionado).

export type SectorStatus = 'Normal' | 'Atencao' | 'Critico';
export type MockPriority = 'Baixa' | 'Media' | 'Alta';
export type CallStatusValue = 'Open' | 'InProgress' | 'Finished';

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

export interface ServiceOrderHistoryEntry {
  date: string;
  event: string;
}

export interface ServiceOrder {
  id: string;
  description: string;
  assetName: string;
  areaName: string;
  daysOverdue: number;
  responsibleName: string;
  priority: MockPriority;
  lastExecutionLabel: string;
  nextExecutionLabel: string;
  overdueReason: string;
  history: ServiceOrderHistoryEntry[];
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

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

function rangeInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function deriveStatus(complianceRate: number, openCalls: number, overdueServiceOrders: number): SectorStatus {
  if (complianceRate < 70 || overdueServiceOrders >= 3 || openCalls >= 4) return 'Critico';
  if (complianceRate < 90 || overdueServiceOrders >= 1 || openCalls >= 2) return 'Atencao';
  return 'Normal';
}

const ASSET_NAMES = [
  'Ar-condicionado — Quarto 204',
  'Bomba piscina principal',
  'Elevador social 2',
  'Caldeira spa',
  'Gerador de emergência',
  'Frigobar — Quarto 118',
  'Portão automático garagem',
  'Sistema de irrigação jardim',
  'Câmera CFTV — Recepção',
  'Exaustor cozinha principal'
];

const SERVICE_ORDER_DESCRIPTIONS = [
  'Manutenção preventiva de climatização',
  'Reparo de vazamento hidráulico',
  'Revisão elétrica programada',
  'Substituição de filtro de ar',
  'Calibração de equipamento',
  'Inspeção de segurança contra incêndio',
  'Lubrificação de peças móveis',
  'Atualização de firmware do sistema',
  'Pintura e reparo estrutural',
  'Teste de gerador de emergência'
];

const RESPONSIBLE_NAMES = ['Carlos Mendes', 'Fernanda Lima', 'Ricardo Souza', 'Patrícia Alves', 'João Pedro', 'Marina Santos'];

const OVERDUE_REASONS = [
  'Aguardando peça de reposição do fornecedor.',
  'Equipe de manutenção alocada em urgência prioritária.',
  'Acesso ao setor bloqueado por evento no local.',
  'Aguardando aprovação orçamentária.',
  'Reagendado a pedido do hóspede.'
];

function buildAreaMetrics(areas: { id: string; name: string }[], real?: ControlCenterRealInputs): AreaMetrics[] {
  const calls = real?.calls ?? [];
  const statsByArea = new Map((real?.areaChecklistStats ?? []).map((s) => [s.areaId, s]));

  return areas.map(({ id, name }) => {
    const rng = seededRandom(id);
    const stat = statsByArea.get(id);
    const complianceRate = stat ? stat.complianceRate : rangeInt(rng, 58, 100);
    const pendingChecklists = stat ? stat.pendingChecklists : rangeInt(rng, 0, 7);
    const openCalls = real?.calls ? calls.filter((c) => c.areaId === id && c.status !== 'Finished').length : rangeInt(rng, 0, 5);
    const overdueServiceOrders = rangeInt(rng, 0, 4);
    const totalServiceOrders = overdueServiceOrders + rangeInt(rng, 2, 9);

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

function buildServiceOrders(areaNames: string[]): ServiceOrder[] {
  const rng = seededRandom('service-orders-seed');
  return Array.from({ length: 9 }).map((_, i) => {
    const daysOverdue = rangeInt(rng, 1, 12);
    const lastExecDaysAgo = daysOverdue + rangeInt(rng, 20, 40);
    return {
      id: `so-${i + 1}`,
      description: SERVICE_ORDER_DESCRIPTIONS[i % SERVICE_ORDER_DESCRIPTIONS.length],
      assetName: ASSET_NAMES[i % ASSET_NAMES.length],
      areaName: areaNames[i % areaNames.length],
      daysOverdue,
      responsibleName: pick(rng, RESPONSIBLE_NAMES),
      priority: pick(rng, ['Alta', 'Media', 'Baixa'] as const),
      lastExecutionLabel: `há ${lastExecDaysAgo} dias`,
      nextExecutionLabel: `atrasada há ${daysOverdue} dias`,
      overdueReason: pick(rng, OVERDUE_REASONS),
      history: [
        { date: `há ${lastExecDaysAgo} dias`, event: 'Execução concluída dentro do prazo.' },
        { date: `há ${lastExecDaysAgo + 32} dias`, event: 'Ordem de serviço criada a partir do plano preventivo.' },
        { date: `há ${Math.max(1, lastExecDaysAgo - 15)} dias`, event: 'Reagendamento solicitado pela equipe de manutenção.' }
      ]
    };
  });
}

function buildActivity(areaNames: string[], serviceOrders: ServiceOrder[], openCalls: OpenCall[]): ActivityEvent[] {
  const rng = seededRandom('activity-seed');
  const templates: { type: ActivityEventType; title: (i: number) => string; kind: ActivityEvent['relatedKind'] }[] = [
    { type: 'checklist_finished', title: () => 'Checklist de limpeza finalizado', kind: 'checklist' },
    { type: 'checklist_reviewed', title: () => 'Checklist revisado pela supervisão', kind: 'checklist' },
    { type: 'service_order_started', title: (i) => `Ordem de serviço iniciada: ${serviceOrders[i % serviceOrders.length]?.description ?? 'Manutenção'}`, kind: 'serviceOrder' },
    { type: 'service_order_finished', title: (i) => `Ordem de serviço concluída: ${serviceOrders[i % serviceOrders.length]?.description ?? 'Manutenção'}`, kind: 'serviceOrder' },
    { type: 'call_opened', title: (i) => `Chamado aberto: ${openCalls[i % Math.max(1, openCalls.length)]?.subject ?? 'Solicitação'}`, kind: 'call' },
    { type: 'call_closed', title: (i) => `Chamado encerrado: ${openCalls[i % Math.max(1, openCalls.length)]?.subject ?? 'Solicitação'}`, kind: 'call' }
  ];

  return Array.from({ length: 12 }).map((_, i) => {
    const tpl = templates[i % templates.length];
    const minutesAgo = (i + 1) * rangeInt(rng, 6, 18);
    const relatedId =
      tpl.kind === 'serviceOrder'
        ? serviceOrders[i % serviceOrders.length]?.id
        : tpl.kind === 'call' && openCalls.length > 0
          ? openCalls[i % openCalls.length]?.id
          : undefined;
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
  // Quando não há áreas reais, usa-se um conjunto de nomes só para dar contexto aos
  // dados mockados de Ordens de Serviço/Atividade (que não têm área real de todo jeito).
  const flavorAreas = realAreas.length > 0 ? realAreas : FALLBACK_AREAS.map((name, i) => ({ id: `mock-area-${i}`, name }));
  const areaNames = flavorAreas.map((a) => a.name);

  const areaMetrics = buildAreaMetrics(realAreas, real);
  const serviceOrders = buildServiceOrders(areaNames);
  const overdueServiceOrders = [...serviceOrders].sort((a, b) => b.daysOverdue - a.daysOverdue);
  const calls = real?.calls ?? [];
  const openCalls = calls.filter((c) => c.status !== 'Finished');
  const activity = buildActivity(areaNames, serviceOrders, openCalls);

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
      open: serviceOrders.length,
      inProgress: rangeInt(seededRandom('so-inprogress'), 2, 6),
      completedThisWeek: rangeInt(seededRandom('so-completed'), 8, 22),
      overdue: overdueServiceOrders.filter((o) => o.daysOverdue > 0).length,
      avgResolutionHours: rangeInt(seededRandom('so-avg'), 6, 30)
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
