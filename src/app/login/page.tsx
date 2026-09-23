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

const demoAccounts: { role: string; email: string; password: string }[] = [
  { role: 'Diretoria', email: 'directoria@hotelchecklist.local', password: 'Directoria123!' },
  { role: 'Gerência', email: 'gerencia@hotelchecklist.local', password: 'Gerencia123!' },
  { role: 'Supervisor', email: 'supervisor@hotelchecklist.local', password: 'Supervisor123!' },
  { role: 'Colaborador', email: 'colaborador@hotelchecklist.local', password: 'Colaborador123!' }
];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    if (isSessionValid()) router.replace('/dashboard');
  }, [router]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const res = await login(values.email, values.password);
      setSession({
        token: res.token,
        expiresAtUtc: res.expiresAtUtc,
        user: { id: res.userId, name: res.name, email: res.email, role: res.role }
      });
      router.replace('/dashboard');
    } catch (err) {
      setServerError(toApiError(err).message);
    }
  }

  function fillDemoAccount(email: string, password: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="brand" style={{ color: '#172033', padding: 0, marginBottom: 8 }}>
          <span className="brand-mark">✓</span>HotelOps
        </div>
        <p className="page-subtitle" style={{ margin: '0 0 24px' }}>
          Entre para gerenciar as operações do hotel.
        </p>
        <ErrorBanner message={serverError} />
        <div className="field">
          <label>E-mail</label>
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Senha</label>
          <input type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 22 }} disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
        <div style={{ marginTop: 20 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Contas de demonstração — clique para preencher:
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fillDemoAccount(acc.email, acc.password)}
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
