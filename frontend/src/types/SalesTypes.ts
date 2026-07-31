import type { Customer } from './CustomerTypes';
import type { Attachment } from '../services/attachmentApi';

// ─── Insurance Product ────────────────────────

export interface InsuranceProduct {
  id: number;
  name: string;
  code: string;
  category: string;
  description: string | null;
  base_premium_rate: number;
}

// ─── Quotation ────────────────────────────────

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  insurance_product_id: number;
  description: string;
  sum_insured: number;
  premium_rate: number;
  premium_amount: number;
  coverage_details?: Record<string, any> | null;
  insurance_product?: InsuranceProduct;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  policy_number?: string | null;
  ir_number: string | null;
  or_number: string | null;
  trip_number: string | null;
  customer_id: number;
  prepared_by: number | { id: number; name: string; email?: string };
  reviewed_by: number | { id: number; name: string; email?: string } | null;
  status: 'draft' | 'submitted' | 'resubmitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'cancellation_requested' | 'cancelled';
  is_remitted?: boolean;
  valid_until: string | null;
  total_premium: number;
  notes: string | null;
  reviewer_remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  cancellation_reason?: string | null;
  cancellation_details?: Record<string, any> | null;
  cancellation_requested_by?: number | { id: number; name: string; email?: string } | null;
  cancellation_requested_at?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: QuotationItem[];
  policy?: Policy & { invoice?: any };
  attachments?: Attachment[];
}

// ─── Policy ───────────────────────────────────

export interface PolicyCoverage {
  id?: number;
  policy_id?: number;
  coverage_name: string;
  coverage_description: string | null;
  sum_insured: number;
  premium_amount: number;
  deductible: number;
}

export interface Policy {
  id: number;
  policy_number: string;
  quotation_id: number | null;
  customer_id: number;
  insurance_product_id: number;
  issued_by: number | { id: number; name: string; email?: string };
  status: 'active' | 'expired' | 'cancelled' | 'lapsed';
  effective_date: string;
  expiry_date: string;
  total_premium: number;
  sum_insured: number;
  terms_and_conditions: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  quotation?: { id: number; quotation_number: string; status: string } | null;
  insurance_product?: InsuranceProduct;
  coverages?: PolicyCoverage[];
}

// ─── List / Form Params ───────────────────────

export interface QuotationListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  start_date?: string;
  end_date?: string;
  creator_role?: string;
}

export interface PolicyListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface QuotationFormData {
  customer_id: number;
  valid_until?: string;
  notes?: string;
  items: Omit<QuotationItem, 'id' | 'quotation_id' | 'insurance_product'>[];
}

export interface PolicyFormData {
  policy_number?: string;
  quotation_id?: number;
  customer_id: number;
  insurance_product_id: number;
  effective_date: string;
  expiry_date: string;
  total_premium: number;
  sum_insured: number;
  terms_and_conditions?: string;
  coverages?: Omit<PolicyCoverage, 'id' | 'policy_id'>[];
}
