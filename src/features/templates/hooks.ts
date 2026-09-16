import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEY = ['templates'];

export function useTemplates(areaId?: string) {
  return useQuery({ queryKey: [...KEY, areaId ?? 'all'], queryFn: () => api.listTemplates(areaId) });
}

export function useTemplate(id?: string) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => api.getTemplate(id as string), enabled: !!id });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.TemplateInput }) => api.updateTemplate(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useApplyTemplateToAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: api.ApplyToAssetsInput }) =>
      api.applyTemplateToAssets(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist-instances'] })
  });
}
