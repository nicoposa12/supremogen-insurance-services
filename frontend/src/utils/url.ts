/**
 * Resolves a file path to its full URL in production or local development.
 */
export const getFileUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('pub-') || path.includes('.r2.dev')) return `https://${path}`;
  
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${cleanPath}`;
};

/**
 * Resolves a secure attachment download URL with auth token.
 */
export const getDownloadUrl = (attachmentId: number | string, token?: string | null): string => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBase}/api/v1/attachments/${attachmentId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};
