/**
 * Accounting & Payments TypeScript interfaces.
 */

// ─── Invoice ──────────────────────────────────

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

import type { Customer } from './CustomerTypes';

export interface Invoice {
  id: number;
  invoice_number: string;
  policy_id: number | null;
  customer_id: number;
  created_by: number | { id: number; name: string; email?: string };
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  policy?: { id: number; policy_number: string; status?: string } | null;
  items?: InvoiceItem[];
  payments?: Payment[];
}

// ─── Payment ──────────────────────────────────

export type PaymentMethod = 
  | 'jt' | 'jrs' | 'cod' | 'walk_in' | 'bank_transfer_pbcom' | 'bank_transfer_security_bank' | 'post_dated_checks' | 'split_payment';

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id: number;
  received_by: number | { id: number; name: string; email?: string };
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  status: 'completed' | 'refunded' | 'voided';
  created_at: string;
  updated_at: string;
  invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
    balance: number;
    customer?: {
      id: number;
      customer_code: string;
      first_name: string;
      last_name: string;
    };
  };
  attachments?: any[];
}

// ─── List / Form Params ───────────────────────

export interface InvoiceListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface PaymentListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  method?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface InvoiceFormData {
  customer_id: number;
  policy_id?: number;
  due_date: string;
  tax_amount?: number;
  notes?: string;
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

export interface PaymentFormData {
  invoice_id: number;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  proof?: File;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  jt: 'J&T',
  jrs: 'JRS',
  cod: 'COD',
  walk_in: 'WALK IN',
  bank_transfer_pbcom: 'BANK TRANSFER PBCOM',
  bank_transfer_security_bank: 'BANK TRANSFER SECURITY BANK',
  post_dated_checks: 'POST DATED CHECKS',
  split_payment: 'SPLIT PAYMENT (HALF CASH/HALF BANK TRANSFER)',
};
