import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/types/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  token: string | null;
  expiresAtUtc: string | null;
  user: AuthUser | null;
  setSession: (session: { token: string; expiresAtUtc: string; user: AuthUser }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      expiresAtUtc: null,
      user: null,
      setSession: ({ token, expiresAtUtc, user }) => set({ token, expiresAtUtc, user }),
      logout: () => set({ token: null, expiresAtUtc: null, user: null })
    }),
    {
      name: 'hotelops-auth',
      partialize: (state) => ({ token: state.token, expiresAtUtc: state.expiresAtUtc, user: state.user })
    }
  )
);

export function isSessionValid(): boolean {
  const { token, expiresAtUtc } = useAuthStore.getState();
  if (!token || !expiresAtUtc) return false;
  return new Date(expiresAtUtc).getTime() > Date.now();
}

export function isSupervisorOrAbove(role: UserRole | undefined): boolean {
  return role === 'Directoria' || role === 'Gerencia' || role === 'Supervisor';
}

export function isExactlySupervisor(role: UserRole | undefined): boolean {
  return role === 'Supervisor';
}

export function isManagerOrAbove(role: UserRole | undefined): boolean {
  return role === 'Directoria' || role === 'Gerencia';
}

const roleRank: Record<UserRole, number> = { Colaborador: 0, Supervisor: 1, Gerencia: 2, Directoria: 3 };

export function outranksOrEquals(actingRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!actingRole) return false;
  return roleRank[actingRole] >= roleRank[requiredRole];
}
