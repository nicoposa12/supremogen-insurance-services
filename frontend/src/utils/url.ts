/**
 * Resolves a file path to its full URL in production or local development.
 */
export const getFileUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBase}${path}`;
};

/**
 * Resolves a secure attachment download URL with auth token.
 */
export const getDownloadUrl = (attachmentId: number | string, token?: string | null): string => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBase}/api/v1/attachments/${attachmentId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};
