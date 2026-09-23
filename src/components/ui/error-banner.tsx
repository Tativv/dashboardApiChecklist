export function ErrorBanner({ message, variant = 'error' }: { message?: string | null; variant?: 'error' | 'success' }) {
  if (!message) return null;
  return (
    <div className={'error-banner' + (variant === 'success' ? ' success' : '')} role="alert">
      {message}
    </div>
  );
}
