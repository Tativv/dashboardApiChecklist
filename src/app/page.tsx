'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSessionValid } from '@/features/auth/store';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isSessionValid() ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
