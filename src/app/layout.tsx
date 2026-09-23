import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/shared/providers';

export const metadata: Metadata = { title: 'HotelOps · Checklists', description: 'Operações hoteleiras em tempo real' };
export const dynamic = 'force-dynamic';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><Providers>{children}</Providers></body></html>;
}
