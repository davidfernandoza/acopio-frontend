const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export function resolveMediaUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) {
    return '';
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith('/')) {
    return `${apiBaseUrl}${pathOrUrl}`;
  }
  return `${apiBaseUrl}/${pathOrUrl}`;
}

export function buildInitialsAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'A'
  )}&background=1f6f5b&color=fff&size=256&bold=true`;
}
