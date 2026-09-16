import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import { DateRange } from './api';

export function useDashboardReport(range: DateRange = {}, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'dashboard', range],
    queryFn: () => api.getDashboardReport(range),
    enabled
  });
}

export function useByDateReport(range: DateRange = {}, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'by-date', range],
    queryFn: () => api.getByDateReport(range),
    enabled
  });
}

export function useByAreaReport(range: DateRange = {}, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'by-area', range],
    queryFn: () => api.getByAreaReport(range),
    enabled
  });
}
