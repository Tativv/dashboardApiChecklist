import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { statusLabel, taskExecutionStatusLabel } from '@/components/ui/status-badge';
import { formatDate, formatDuration, formatTime } from '@/lib/format';
import {
  AreaDto,
  ByAreaReportItemDto,
  ByDateReportItemDto,
  ChecklistInstanceDetailDto,
  ChecklistInstanceListItemDto,
  UserDto
} from '@/types/api';

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const COLOR = {
  primary: [30, 41, 59] as [number, number, number], // slate-800
  primarySoft: [51, 65, 85] as [number, number, number], // slate-700
  accent: [79, 70, 229] as [number, number, number], // indigo-600
  band: [241, 245, 249] as [number, number, number], // slate-100
  bandBorder: [203, 213, 225] as [number, number, number], // slate-300
  line: [226, 232, 240] as [number, number, number], // slate-200
  text: [15, 23, 42] as [number, number, number], // slate-900
  textMuted: [100, 116, 139] as [number, number, number], // slate-500
  white: [255, 255, 255] as [number, number, number],
  success: [21, 128, 61] as [number, number, number], // green-700
  successBg: [220, 252, 231] as [number, number, number], // green-100
  warning: [180, 83, 9] as [number, number, number], // amber-700
  warningBg: [254, 243, 199] as [number, number, number], // amber-100
  neutralBg: [226, 232, 240] as [number, number, number] // slate-200
};

interface DocContext {
  doc: jsPDF;
  cursorY: number;
}

function createDocument(title: string, subtitle: string): DocContext {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const cursorY = drawPageHeader(doc, title, subtitle);
  return { doc, cursorY };
}

function drawPageHeader(doc: jsPDF, title: string, subtitle: string): number {
  doc.setFillColor(...COLOR.primary);
  doc.rect(0, 0, PAGE.width, 86, 'F');

  doc.setTextColor(...COLOR.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('HOTELOPS · CHECKLISTS', MARGIN, 28);

  doc.setFontSize(18);
  doc.text(title, MARGIN, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, MARGIN, 70);

  doc.setTextColor(...COLOR.text);
  return 112;
}

function ensureSpace(ctx: DocContext, needed: number) {
  if (ctx.cursorY + needed > PAGE.height - 60) {
    ctx.doc.addPage();
    ctx.cursorY = MARGIN;
  }
}

function drawAreaBand(ctx: DocContext, areaName: string, count: number) {
  ensureSpace(ctx, 34);
  const { doc } = ctx;
  doc.setFillColor(...COLOR.primary);
  doc.rect(MARGIN, ctx.cursorY, CONTENT_WIDTH, 26, 'F');
  doc.setTextColor(...COLOR.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(areaName.toUpperCase(), MARGIN + 10, ctx.cursorY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`${count} checklist${count === 1 ? '' : 's'}`, MARGIN + CONTENT_WIDTH - 10, ctx.cursorY + 17, { align: 'right' });
  doc.setTextColor(...COLOR.text);
  ctx.cursorY += 26 + 12;
}

function drawTemplateHeader(ctx: DocContext, templateName: string) {
  ensureSpace(ctx, 22);
  const { doc } = ctx;
  doc.setDrawColor(...COLOR.accent);
  doc.setLineWidth(2.5);
  doc.line(MARGIN, ctx.cursorY, MARGIN, ctx.cursorY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...COLOR.primarySoft);
  doc.text(templateName, MARGIN + 10, ctx.cursorY + 11);
  doc.setTextColor(...COLOR.text);
  ctx.cursorY += 22;
}

function statusPillColor(status: string): { text: [number, number, number]; bg: [number, number, number] } {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'reviewed' || s === 'approved') return { text: COLOR.success, bg: COLOR.successBg };
  if (s === 'skipped') return { text: COLOR.textMuted, bg: COLOR.neutralBg };
  return { text: COLOR.warning, bg: COLOR.warningBg };
}

function drawStatusPill(doc: jsPDF, x: number, y: number, rawStatus: string, label = rawStatus) {
  const colors = statusPillColor(rawStatus);
  doc.setFontSize(8.5);
  const textWidth = doc.getTextWidth(label);
  const pillWidth = textWidth + 14;
  doc.setFillColor(...colors.bg);
  doc.roundedRect(x, y - 10, pillWidth, 15, 3, 3, 'F');
  doc.setTextColor(...colors.text);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x + 7, y);
  doc.setTextColor(...COLOR.text);
  doc.setFont('helvetica', 'normal');
  return pillWidth;
}

function finalizeDocument(doc: jsPDF, filename: string) {
  const pageCount = doc.getNumberOfPages();
  const generatedAt = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(...COLOR.line);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, PAGE.height - 42, PAGE.width - MARGIN, PAGE.height - 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.textMuted);
    doc.text(`Gerado em ${generatedAt}`, MARGIN, PAGE.height - 28);
    doc.text(`Página ${page} de ${pageCount}`, PAGE.width - MARGIN, PAGE.height - 28, { align: 'right' });
    doc.setTextColor(...COLOR.text);
  }

  doc.save(filename);
}

export function generateByDateReportPdf(rows: ByDateReportItemDto[], fromDate: string, toDate: string) {
  const ctx = createDocument('Relatório por Data', `Período: ${formatDate(fromDate)} a ${formatDate(toDate)}`);

  autoTable(ctx.doc, {
    startY: ctx.cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Data', 'Total', 'Pendente', 'Aprovado', 'Em andamento', 'Concluído', 'Revisado', 'Duração méd.']],
    body: rows.map((r) => [
      formatDate(r.date),
      String(r.total),
      String(r.pending),
      String(r.approved),
      String(r.inProgress),
      String(r.completed),
      String(r.reviewed),
      formatDuration(r.averageDurationSeconds)
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 7, textColor: COLOR.text, lineColor: COLOR.line, lineWidth: 0.5 },
    headStyles: { fillColor: COLOR.primary, textColor: COLOR.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLOR.band },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  finalizeDocument(ctx.doc, `relatorio-por-data_${fromDate}_a_${toDate}.pdf`);
}

export function generateByAreaReportPdf(rows: ByAreaReportItemDto[], fromDate: string, toDate: string) {
  const ctx = createDocument('Relatório por Área', `Período: ${formatDate(fromDate)} a ${formatDate(toDate)}`);

  autoTable(ctx.doc, {
    startY: ctx.cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Área', 'Total', 'Concluído', 'Revisado', 'Duração méd.']],
    body: rows.map((r) => [r.areaName, String(r.total), String(r.completed), String(r.reviewed), formatDuration(r.averageDurationSeconds)]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 7, textColor: COLOR.text, lineColor: COLOR.line, lineWidth: 0.5 },
    headStyles: { fillColor: COLOR.primary, textColor: COLOR.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLOR.band },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  finalizeDocument(ctx.doc, `relatorio-por-area_${fromDate}_a_${toDate}.pdf`);
}

function drawOverviewTable(ctx: DocContext, items: ChecklistInstanceListItemDto[], areaName: (id: string) => string) {
  autoTable(ctx.doc, {
    startY: ctx.cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Área', 'Template', 'Ativo', 'Status']],
    body: items.map((i) => [areaName(i.areaId), i.templateName, i.assetName, i.status]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 7, textColor: COLOR.text, lineColor: COLOR.line, lineWidth: 0.5 },
    headStyles: { fillColor: COLOR.primary, textColor: COLOR.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLOR.band },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = items[data.row.index]?.status;
        if (!raw) return;
        drawStatusPill(ctx.doc, data.cell.x + 6, data.cell.y + data.cell.height / 2 + 3, raw, statusLabel[raw] ?? raw);
      }
    }
  });
  ctx.cursorY = (ctx.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
}

function drawInstanceSection(ctx: DocContext, title: string, status: string, detail: ChecklistInstanceDetailDto, users: UserDto[]) {
  const userName = (id?: string | null) => (id ? users.find((u) => u.id === id)?.name ?? '—' : '—');

  ensureSpace(ctx, 40);
  const { doc } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR.text);
  doc.text(title, MARGIN + 10, ctx.cursorY + 10);
  const titleWidth = doc.getTextWidth(title);
  doc.setFont('helvetica', 'normal');
  drawStatusPill(doc, MARGIN + 10 + titleWidth + 12, ctx.cursorY + 10, status, statusLabel[status as keyof typeof statusLabel] ?? status);
  ctx.cursorY += 22;

  const sortedTasks = [...detail.taskExecutions].sort((a, b) => a.order - b.order);

  autoTable(doc, {
    startY: ctx.cursorY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Item de Conferência', 'Horário', 'Responsável', 'Status', 'Visto Coordenador', 'Observações']],
    body: sortedTasks.map((t) => [
      t.taskName,
      t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Turno',
      userName(t.executedByUserId ?? t.assignedUserId),
      taskExecutionStatusLabel[t.status],
      userName(t.approvedByUserId),
      t.comment ?? ''
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 6, textColor: COLOR.text, lineColor: COLOR.line, lineWidth: 0.5, overflow: 'linebreak' },
    headStyles: { fillColor: COLOR.primarySoft, textColor: COLOR.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: COLOR.band },
    columnStyles: {
      0: { cellWidth: 118, fontStyle: 'bold' },
      1: { cellWidth: 52 },
      2: { cellWidth: 78 },
      3: { cellWidth: 58 },
      4: { cellWidth: 78 },
      5: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const colors = statusPillColor(String(sortedTasks[data.row.index]?.status ?? ''));
        data.cell.styles.textColor = colors.text;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  ctx.cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
}

export function generateFullDailySummaryPdf(
  items: ChecklistInstanceListItemDto[],
  details: Map<string, ChecklistInstanceDetailDto>,
  areas: AreaDto[],
  users: UserDto[],
  date: string,
  areaFilterLabel?: string
) {
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—';

  const byArea = new Map<string, Map<string, ChecklistInstanceListItemDto[]>>();
  for (const item of items) {
    if (!byArea.has(item.areaId)) byArea.set(item.areaId, new Map());
    const byTemplate = byArea.get(item.areaId)!;
    if (!byTemplate.has(item.templateName)) byTemplate.set(item.templateName, []);
    byTemplate.get(item.templateName)!.push(item);
  }
  const sortedAreaIds = [...byArea.keys()].sort((a, b) => areaName(a).localeCompare(areaName(b)));

  const ctx = createDocument(
    'Resumo Diário Operacional',
    `Data: ${formatDate(date)}   ·   Área: ${areaFilterLabel ?? 'Todas'}   ·   ${items.length} checklist${items.length === 1 ? '' : 's'}`
  );

  // Página de visão geral
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(12);
  ctx.doc.text('Visão geral', MARGIN, ctx.cursorY);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.cursorY += 16;
  drawOverviewTable(ctx, items, areaName);

  for (const areaId of sortedAreaIds) {
    ctx.doc.addPage();
    ctx.cursorY = MARGIN;

    const byTemplate = byArea.get(areaId)!;
    const areaTotal = [...byTemplate.values()].reduce((sum, list) => sum + list.length, 0);
    drawAreaBand(ctx, areaName(areaId), areaTotal);

    const sortedTemplateNames = [...byTemplate.keys()].sort((a, b) => a.localeCompare(b));
    for (const templateName of sortedTemplateNames) {
      drawTemplateHeader(ctx, templateName);

      for (const item of byTemplate.get(templateName)!) {
        const detail = details.get(item.id);
        if (!detail) continue;
        drawInstanceSection(ctx, item.assetName, item.status, detail, users);
      }
    }
  }

  finalizeDocument(
    ctx.doc,
    `resumo-diario-completo_${date}${areaFilterLabel ? '_' + areaFilterLabel.replace(/\s+/g, '-') : ''}.pdf`
  );
}
