import { http } from '@/lib/http';
import { ByAreaReportItemDto, ByDateReportItemDto, DashboardReportDto } from '@/types/api';

export interface DateRange {
  fromDate?: string;
  toDate?: string;
  today?: string;
}

export async function getDashboardReport(range: DateRange = {}): Promise<DashboardReportDto> {
  const { data } = await http.get<DashboardReportDto>('/reports/dashboard', { params: range });
  return data;
}

export async function getByDateReport(range: DateRange = {}): Promise<ByDateReportItemDto[]> {
  const { data } = await http.get<ByDateReportItemDto[]>('/reports/by-date', { params: range });
  return data;
}

export async function getByAreaReport(range: DateRange = {}): Promise<ByAreaReportItemDto[]> {
  const { data } = await http.get<ByAreaReportItemDto[]>('/reports/by-area', { params: range });
  return data;
}
