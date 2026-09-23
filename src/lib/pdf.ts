import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { taskExecutionStatusLabel } from '@/components/ui/status-badge';
import { formatDate, formatDuration, formatTime } from '@/lib/format';
import { ByAreaReportItemDto, ByDateReportItemDto, ChecklistInstanceDetailDto, UserDto } from '@/types/api';

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

export function generateDailySummaryPdf(instance: ChecklistInstanceDetailDto, users: UserDto[]) {
  const userName = (id?: string | null) => (id ? users.find((u) => u.id === id)?.name ?? '—' : '—');

  const doc = new jsPDF();
  addHeader(
    doc,
    instance.templateName,
    `Ativo: ${instance.assetName}  |  Data: ${formatDate(instance.date)}  |  Status: ${instance.status}`
  );

  const sortedTasks = [...instance.taskExecutions].sort((a, b) => a.order - b.order);

  autoTable(doc, {
    startY: 75,
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
    columnStyles: { 0: { cellWidth: 90 }, 5: { cellWidth: 'auto' } }
  });

  doc.save(`resumo-diario_${instance.assetName}_${instance.date}.pdf`);
}
