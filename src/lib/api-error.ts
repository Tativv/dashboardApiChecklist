import { AxiosError } from 'axios';

export class ApiError extends Error {
  status: number;
  errorType?: string;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, errorType?: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.fieldErrors = fieldErrors;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const axiosError = error as AxiosError<any>;
  if (axiosError?.isAxiosError) {
    const status = axiosError.response?.status ?? 0;
    const body = axiosError.response?.data;
    if (!axiosError.response) {
      return new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
    }
    if (body?.errors && typeof body.errors === 'object') {
      const fieldErrors: Record<string, string[]> = body.errors;
      const first = Object.values(fieldErrors)[0]?.[0];
      return new ApiError(first ?? body.title ?? 'Dados inválidos.', status, 'Validation', fieldErrors);
    }
    if (body?.detail || body?.title) {
      return new ApiError(body.detail ?? body.title, status, body.errorType);
    }
    if (status === 403) {
      return new ApiError('Você não tem permissão para realizar esta ação.', 403, 'Forbidden');
    }
    if (status === 401) {
      return new ApiError('Sua sessão expirou. Faça login novamente.', 401, 'Unauthorized');
    }
    return new ApiError('Ocorreu um erro inesperado.', status);
  }
  return new ApiError('Ocorreu um erro inesperado.', 0);
}

export function fieldError(err: unknown, pascalName: string): string | undefined {
  if (err instanceof ApiError && err.fieldErrors) {
    return err.fieldErrors[pascalName]?.[0];
  }
  return undefined;
}
