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
  email: z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
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

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="brand" style={{ color: '#172033', padding: 0, marginBottom: 8 }}>
          <span className="brand-mark">✓</span>HotelOps
        </div>
        <p className="page-subtitle" style={{ margin: '0 0 24px' }}>
          Inicia sesión para gestionar las operaciones del hotel.
        </p>
        <ErrorBanner message={serverError} />
        <div className="field">
          <label>Correo electrónico</label>
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Contraseña</label>
          <input type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 22 }} disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
          Demo: admin@hotelchecklist.local / Admin123!<br />
          supervisor@hotelchecklist.local / Supervisor123!
        </p>
      </form>
    </div>
  );
}
