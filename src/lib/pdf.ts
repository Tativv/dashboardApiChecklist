import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { taskExecutionStatusLabel } from '@/components/ui/status-badge';
import { formatDate, formatDuration, formatTime } from '@/lib/format';
import { AreaDto, ByAreaReportItemDto, ByDateReportItemDto, ChecklistInstanceDetailDto, ChecklistInstanceListItemDto, UserDto } from '@/types/api';

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, 40, 58);
  doc.setTextColor(0);
}

export function generateByDateReportPdf(rows: ByDateReportItemDto[], fromDate: string, toDate: string) {
  const doc = new jsPDF();
  addHeader(doc, 'Relatório por Data', `Período: ${formatDate(fromDate)} a ${formatDate(toDate)}`);

  autoTable(doc, {
    startY: 75,
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
    styles: { fontSize: 9 },
    headStyles: { fillColor: [51, 65, 85] }
  });

  doc.save(`relatorio-por-data_${fromDate}_a_${toDate}.pdf`);
}

export function generateByAreaReportPdf(rows: ByAreaReportItemDto[], fromDate: string, toDate: string) {
  const doc = new jsPDF();
  addHeader(doc, 'Relatório por Área', `Período: ${formatDate(fromDate)} a ${formatDate(toDate)}`);

  autoTable(doc, {
    startY: 75,
    head: [['Área', 'Total', 'Concluído', 'Revisado', 'Duração méd.']],
    body: rows.map((r) => [r.areaName, String(r.total), String(r.completed), String(r.reviewed), formatDuration(r.averageDurationSeconds)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [51, 65, 85] }
  });

  doc.save(`relatorio-por-area_${fromDate}_a_${toDate}.pdf`);
}

function addInstanceTable(doc: jsPDF, startY: number, title: string, statusLabel: string, detail: ChecklistInstanceDetailDto, users: UserDto[]): number {
  const userName = (id?: string | null) => (id ? users.find((u) => u.id === id)?.name ?? '—' : '—');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, startY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Status: ${statusLabel}`, 40, startY + 13);
  doc.setTextColor(0);

  const sortedTasks = [...detail.taskExecutions].sort((a, b) => a.order - b.order);

  autoTable(doc, {
    startY: startY + 20,
    head: [['Item de Conferência', 'Horário Execução', 'Responsável', 'Status', 'Visto Coordenador', 'Observações']],
    body: sortedTasks.map((t) => [
      t.taskName,
      t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Durante o turno',
      userName(t.executedByUserId ?? t.assignedUserId),
      taskExecutionStatusLabel[t.status],
      userName(t.approvedByUserId),
      t.comment ?? ''
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85] },
    columnStyles: { 0: { cellWidth: 90 }, 5: { cellWidth: 'auto' } },
    margin: { left: 40, right: 40 }
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
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

  const doc = new jsPDF();
  addHeader(doc, 'Resumo Diário Operacional', `Data: ${formatDate(date)}${areaFilterLabel ? `  |  Área: ${areaFilterLabel}` : ''}`);

  let cursorY = 80;
  let firstArea = true;
  const pageHeight = doc.internal.pageSize.height;

  for (const areaId of sortedAreaIds) {
    if (!firstArea) {
      doc.addPage();
      cursorY = 40;
    }
    firstArea = false;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(areaName(areaId), 40, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 20;

    const byTemplate = byArea.get(areaId)!;
    const sortedTemplateNames = [...byTemplate.keys()].sort((a, b) => a.localeCompare(b));

    for (const templateName of sortedTemplateNames) {
      for (const item of byTemplate.get(templateName)!) {
        const detail = details.get(item.id);
        if (!detail) continue;

        if (cursorY > pageHeight - 120) {
          doc.addPage();
          cursorY = 40;
        }

        cursorY = addInstanceTable(doc, cursorY, `${templateName} — ${item.assetName}`, item.status, detail, users);
      }
    }
  }

  doc.save(`resumo-diario-completo_${date}${areaFilterLabel ? '_' + areaFilterLabel.replace(/\s+/g, '-') : ''}.pdf`);
}
