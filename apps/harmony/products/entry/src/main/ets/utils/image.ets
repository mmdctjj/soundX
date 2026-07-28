import { httpClient } from './HttpClient';

const PLACEHOLDER = 'https://picsum.photos/seed/placeholder/200/200';

export function getImageUrl(path?: string | null): string {
  if (!path) return PLACEHOLDER;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = httpClient.getBaseURL();
  const cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cleanBase}/${cleanPath.split('/').map(encodeURIComponent).join('/')}`;
}