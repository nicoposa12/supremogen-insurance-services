/**
 * Customer-related TypeScript interfaces and Zod schemas.
 */

// ─── API Interfaces ───────────────────────────

export interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  suffix: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  customer_type: 'individual' | 'corporate';
  company_name: string | null;
  tin: string | null;
  status: 'active' | 'inactive' | 'blacklisted';
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  documents?: CustomerDocument[];
  created_by_user?: { id: number; name: string; email: string };

  // Transaction fields
  record_no?: string;
  plate_no?: string | null;
  unit?: string | null;
  mortgage?: string | null;
  agent?: string | null;
  insurance_provider?: string | null;
  policy_status?: string;
  policy_no?: string | null;
  
  // Financial details
  assured_value?: number | string;
  gross_premium?: number | string;
  policy_premium?: number | string;
  discount?: number | string;
  bi_pd?: number | string;
  pa?: number | string;
  aog?: number | string;
  policy_rate?: number | string;
  discount_rate?: number | string;

  // Dates
  writing_date?: string | null;
  date_issued?: string | null;
  inception_date?: string | null;
  expiry_date?: string | null;
  delivery_date?: string | null;
  date_delivered?: string | null;
}

export interface CustomerDocument {
  id: number;
  customer_id: number;
  document_type: 'valid_id' | 'document' | 'photo';
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ───────────────────────

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Dashboard Types ──────────────────────────

export interface DashboardStats {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  customer_trend: number;
  active_policies: number;
  policies_trend: number;
  pending_claims: number;
  claims_trend: number;
  monthly_revenue: number;
  revenue_trend: number;
}

export interface MonthlyOverview {
  month: string;
  short: string;
  customers: number;
  policies: number;
  revenue: number;
}

export interface ChartSlice {
  name: string;
  value: number;
}

export interface DashboardData {
  stats: DashboardStats;
  charts: {
    monthly_overview: MonthlyOverview[];
    customer_types: ChartSlice[];
    customer_statuses: ChartSlice[];
  };
  recent_customers: Customer[];
}

// ─── Form / Query Types ───────────────────────

export interface CustomerListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  type?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface CustomerFormData {
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  date_of_birth?: string;
  gender?: string;
  email: string;
  phone?: string;
  mobile?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  customer_type: 'individual' | 'corporate';
  company_name?: string;
  tin?: string;
  status?: 'active' | 'inactive' | 'blacklisted';
  notes?: string;

  // Transaction fields
  record_no?: string;
  plate_no?: string;
  unit?: string;
  mortgage?: string;
  agent?: string;
  insurance_provider?: string;
  policy_status?: string;
  policy_no?: string;
  
  // Financial details
  assured_value?: number | string;
  gross_premium?: number | string;
  policy_premium?: number | string;
  discount?: number | string;
  bi_pd?: number | string;
  pa?: number | string;
  aog?: number | string;
  policy_rate?: number | string;
  discount_rate?: number | string;

  // Dates
  writing_date?: string;
  date_issued?: string;
  inception_date?: string;
  expiry_date?: string;
  delivery_date?: string;
  date_delivered?: string;
}
