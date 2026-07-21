/**
 * Customer-related TypeScript interfaces and Zod schemas.
 */

import type { Attachment } from '../services/attachmentApi';

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
  attachments?: Attachment[];
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

  // Revised fields
  request_type?: string | null;
  activity?: string | null;
  quotation_used?: string | null;
  usage?: string | null;
  chassis_no?: string | null;
  engine_no?: string | null;
  color?: string | null;
  ownership?: string | null;
  own_damage_coverage?: number | string;
  bi_coverage?: number | string;
  pd_coverage?: number | string;
  payment_terms?: string | number | null;
  agent_markup?: number | string;
  sub_agent_markup?: number | string;
  sub_agent_name?: string | null;
  freebie?: number | string;
  receiver_name?: string | null;
  delivery_address?: string | null;
  landmark?: string | null;
  backup_phone?: string | null;
  fb_link?: string | null;
  used_rate_type?: string | null;
  used_rate?: string | null;
  duplicate_plates?: { id: number; customer_code: string; first_name: string; last_name: string }[];
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
  pending_claims_trend?: number;
  monthly_revenue: number;
  revenue_trend: number;
  premium?: {
    daily: { value: number; trend: number };
    weekly: { value: number; trend: number };
    monthly: { value: number; trend: number };
    yearly: { value: number; trend: number };
  };
  customers?: {
    daily: { value: number; trend: number };
    weekly: { value: number; trend: number };
    monthly: { value: number; trend: number };
    yearly: { value: number; trend: number };
  };
  policies?: {
    daily: { value: number; trend: number };
    weekly: { value: number; trend: number };
    monthly: { value: number; trend: number };
    yearly: { value: number; trend: number };
  };
  acknowledged_claims?: number;
  returned_claims?: number;
  total_claims?: number;
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
    daily_overview: { short: string; customers: number; revenue: number }[];
    weekly_overview: { short: string; customers: number; revenue: number }[];
    monthly_overview: MonthlyOverview[];
    yearly_overview: { short: string; customers: number; revenue: number }[];
    customer_types: ChartSlice[];
    customer_statuses: ChartSlice[] | {
      daily: ChartSlice[];
      weekly: ChartSlice[];
      monthly: ChartSlice[];
      yearly: ChartSlice[];
    };
    claims_by_provider?: ChartSlice[];
    claims_by_status?: ChartSlice[];
  };
  recent_customers: Customer[];
  recent_claims?: any[];
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
  start_date?: string;
  end_date?: string;
  no_paginate?: boolean;
}

export interface CustomerFormData {
  full_name?: string;
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

  // Revised fields
  request_type?: string;
  activity?: string;
  quotation_used?: string;
  usage?: string;
  chassis_no?: string;
  engine_no?: string;
  color?: string;
  ownership?: string;
  own_damage_coverage?: number | string;
  bi_coverage?: number | string;
  pd_coverage?: number | string;
  payment_terms?: string | number;
  agent_markup?: number | string;
  sub_agent_markup?: number | string;
  sub_agent_name?: string;
  freebie?: number | string;
  receiver_name?: string;
  delivery_address?: string;
  landmark?: string;
  backup_phone?: string;
  fb_link?: string;
  used_rate_type?: string;
  used_rate?: string;
}
