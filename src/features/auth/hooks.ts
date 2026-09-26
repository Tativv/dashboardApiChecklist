import { useMutation } from '@tanstack/react-query';
import * as api from './api';

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => api.changePassword(input)
  });
}
