import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/shared/providers';

export const metadata: Metadata = { title: 'HotelOps · Checklists', description: 'Operaciones hoteleras en tiempo real' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><Providers>{children}</Providers></body></html>;
}
