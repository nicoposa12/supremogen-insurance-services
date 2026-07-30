import axios from 'axios';

const BASE = '/api/v1/audit-logs';

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  description: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface AuditLogParams {
  page?: number;
  per_page?: number;
  action?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export async function getAuditLogs(params?: AuditLogParams): Promise<AuditLogResponse> {
  const { data } = await axios.get<AuditLogResponse>(BASE, { params });
  return data;
}
