'use client';
import { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { UserRole } from '@/types/api';

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="page">
        <div className="card empty">No tienes permisos para ver esta sección.</div>
      </div>
    );
  }
  return <>{children}</>;
}
