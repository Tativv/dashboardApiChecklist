'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login } from '@/features/auth/api';
import { isSessionValid, useAuthStore } from '@/features/auth/store';
import { toApiError } from '@/lib/api-error';
import { ErrorBanner } from '@/components/ui/error-banner';

const schema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório').email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória')
});
type FormValues = z.infer<typeof schema>;

interface DemoAccount {
  role: string;
  email: string;
  password: string;
  description: string;
  icon: string;
}

// Credenciais espelham exatamente o DbSeeder do backend (Common/Persistence/Seed/DbSeeder.cs).
// Se o login com uma destas contas falhar com "credenciais inválidas", o mais provável é que o
// seed nunca tenha rodado no banco atual (ele só popula quando a tabela de usuários está vazia).
const demoAccounts: DemoAccount[] = [
  {
    role: 'Diretoria',
    email: 'directoria@hotelchecklist.local',
    password: 'Directoria123!',
    description: 'Visão executiva e relatórios completos',
    icon: 'M3 21h18M5 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17M15 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12M8 6h1M11 6h1M8 10h1M11 10h1M8 14h1M11 14h1'
  },
  {
    role: 'Gerência',
    email: 'gerencia@hotelchecklist.local',
    password: 'Gerencia123!',
    description: 'Gestão operacional e aprovações',
    icon: 'M20 7h-3V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zM9 5h6v2H9z'
  },
  {
    role: 'Supervisor',
    email: 'supervisor@hotelchecklist.local',
    password: 'Supervisor123!',
    description: 'Coordenação de equipes e áreas',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'
  },
  {
    role: 'Colaborador',
    email: 'colaborador@hotelchecklist.local',
    password: 'Colaborador123!',
    description: 'Execução das tarefas do dia a dia',
    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
  }
];

function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    if (isSessionValid()) router.replace('/dashboard');
  }, [router]);

  async function performLogin(email: string, password: string) {
    setServerError(null);
    const res = await login(email, password);
    setSession({
      token: res.token,
      expiresAtUtc: res.expiresAtUtc,
      user: { id: res.userId, name: res.name, email: res.email, role: res.role }
    });
    router.replace('/dashboard');
  }

  async function onSubmit(values: FormValues) {
    try {
      await performLogin(values.email, values.password);
    } catch (err) {
      setServerError(toApiError(err).message);
    }
  }

  async function onDemoClick(acc: DemoAccount) {
    setValue('email', acc.email, { shouldValidate: true });
    setValue('password', acc.password, { shouldValidate: true });
    setDemoLoading(acc.role);
    try {
      await performLogin(acc.email, acc.password);
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      <div className="login-shell">
        <div className="login-card">
          <div className="login-card-head">
            <span className="login-hotel-tag">
              <svg viewBox="0 0 40 40" width="18" height="18" aria-hidden="true">
                <defs>
                  <linearGradient id="loginLogoGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#5e87ff" />
                    <stop offset="100%" stopColor="#2947c9" />
                  </linearGradient>
                </defs>
                <circle cx="20" cy="20" r="19" fill="url(#loginLogoGrad)" />
                <path d="M8 27 L16 13 L21 21 L25 15 L32 27 Z" fill="#eef2ff" opacity="0.95" />
                <circle cx="27" cy="11" r="3.2" fill="#fff" />
              </svg>
              Vale Suíço Resort
            </span>
            <h1 className="login-welcome">Bem-vindo de volta</h1>
            <p className="login-subtitle">Entre para gerenciar as operações do hotel.</p>
          </div>

          <ErrorBanner message={serverError} />

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="login-field">
              <div className="login-input-group">
                <span className="login-input-icon">
                  <Icon path="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" />
                </span>
                <input type="email" autoComplete="email" placeholder="seu@email.com" className="login-input" {...register('email')} />
              </div>
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </div>
            <div className="login-field">
              <div className="login-input-group">
                <span className="login-input-icon">
                  <Icon path="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4" />
                </span>
                <input type="password" autoComplete="current-password" placeholder="Senha" className="login-input" {...register('password')} />
              </div>
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </div>

            <button className="login-submit-btn" disabled={isSubmitting || !!demoLoading}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
              {!isSubmitting && <Icon path="M5 12h14M12 5l7 7-7 7" size={15} />}
            </button>
          </form>

          <div className="login-demo-divider">
            <span>Contas de demonstração</span>
          </div>
          <div className="login-demo-grid">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                className="login-demo-card"
                onClick={() => onDemoClick(acc)}
                disabled={isSubmitting || !!demoLoading}
              >
                <span className="login-demo-icon">
                  <Icon path={acc.icon} size={15} />
                </span>
                <span className="login-demo-text">
                  <span className="login-demo-role">{demoLoading === acc.role ? 'Entrando…' : acc.role}</span>
                  <span className="login-demo-desc">{acc.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
