const configuredApi = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) throw new Error('La ruta de API debe comenzar con /.');
  return configuredApi + path;
}

