/**
 * Claims & Renewals TypeScript interfaces.
 */

// ─── Claim ────────────────────────────────────

export interface Claim {
  id: number;
  claim_number: string;
  policy_id: number;
  customer_id: number;
  filed_by: number | { id: number; name: string; email?: string };
  assigned_to: number | { id: number; name: string; email?: string } | null;
  status: 'filed' | 'under_investigation' | 'approved' | 'denied' | 'settled' | 'closed';
  incident_date: string;
  incident_description: string;
  claim_amount: number;
  approved_amount: number | null;
  settlement_amount: number | null;
  adjuster_remarks: string | null;
  settlement_date: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    customer_code: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  policy?: {
    id: number;
    policy_number: string;
    insurance_product?: { id: number; name: string };
  };
}

// ─── Renewal ──────────────────────────────────

export interface Renewal {
  id: number;
  renewal_number: string;
  policy_id: number;
  customer_id: number;
  new_policy_id: number | null;
  processed_by: number | { id: number; name: string } | null;
  status: 'pending' | 'renewed' | 'expired' | 'cancelled';
  original_expiry_date: string;
  new_effective_date: string | null;
  new_expiry_date: string | null;
  premium_adjustment: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    customer_code: string;
    first_name: string;
    last_name: string;
  };
  policy?: {
    id: number;
    policy_number: string;
    total_premium: number;
    expiry_date: string;
    insurance_product?: { id: number; name: string };
  };
  new_policy?: { id: number; policy_number: string } | null;
}

// ─── List Params ──────────────────────────────

export interface ClaimListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface RenewalListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface ClaimFormData {
  policy_id: number;
  customer_id: number;
  incident_date: string;
  incident_description: string;
  claim_amount: number;
}

// ─── Claim Notification ──────────────────────────

export interface ClaimNotification {
  id: number;
  reference_number: string;
  assured_name: string;
  contact_number: string | null;
  email_address: string | null;
  insurance_provider: string;
  plate_number: string | null;
  policy_number: string;
  inception_date: string | null;
  accident_date: string;
  nature_of_claims: string;
  notes: string | null;
  submitted_by: number | { id: number; name: string; email?: string };
  status: 'pending' | 'acknowledged' | 'returned';
  acknowledged_by: number | { id: number; name: string; email?: string } | null;
  acknowledged_at: string | null;
  attachments?: any[];
  created_at: string;
  updated_at: string;
}

export interface ClaimNotificationFormData {
  assured_name: string;
  contact_number: string;
  email_address: string;
  insurance_provider: string;
  plate_number: string;
  policy_number: string;
  inception_date: string;
  accident_date: string;
  nature_of_claims: string;
  notes: string;
}

export interface ClaimNotificationListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}
