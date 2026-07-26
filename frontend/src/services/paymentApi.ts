import axios from 'axios';
import type { Payment, PaymentFormData, PaymentListParams } from '../types/AccountingTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/payments';

export async function getPayments(params: PaymentListParams = {}): Promise<PaginatedResponse<Payment>> {
  const { data } = await axios.get<PaginatedResponse<Payment>>(BASE, { params });
  return data;
}

export async function getPayment(id: number): Promise<SingleResponse<Payment>> {
  const { data } = await axios.get<SingleResponse<Payment>>(`${BASE}/${id}`);
  return data;
}

export async function recordPayment(formData: PaymentFormData): Promise<SingleResponse<Payment>> {
  const data = new FormData();
  data.append('invoice_id', String(formData.invoice_id));
  data.append('amount', String(formData.amount));
  data.append('payment_method', formData.payment_method);
  data.append('payment_date', formData.payment_date);
  if (formData.reference_number) {
    data.append('reference_number', formData.reference_number);
  }
  if (formData.notes) {
    data.append('notes', formData.notes);
  }
  if (formData.proof) {
    data.append('proof', formData.proof);
  }

  const { data: responseData } = await axios.post<SingleResponse<Payment>>(BASE, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return responseData;
}

export async function voidPayment(id: number): Promise<SingleResponse<Payment>> {
  const { data } = await axios.post<SingleResponse<Payment>>(`${BASE}/${id}/void`);
  return data;
}

export async function updatePayment(id: number, formData: PaymentFormData): Promise<SingleResponse<Payment>> {
  const data = new FormData();
  data.append('_method', 'PUT'); // Method spoofing for Laravel PUT with multipart/form-data
  data.append('invoice_id', String(formData.invoice_id));
  data.append('amount', String(formData.amount));
  data.append('payment_method', formData.payment_method);
  data.append('payment_date', formData.payment_date);
  if (formData.reference_number) {
    data.append('reference_number', formData.reference_number);
  }
  if (formData.notes) {
    data.append('notes', formData.notes);
  }
  if (formData.proof) {
    data.append('proof', formData.proof);
  }

  const { data: responseData } = await axios.post<SingleResponse<Payment>>(`${BASE}/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return responseData;
}

export async function verifyPayment(
  id: number,
  status: 'verified' | 'rejected',
  notes?: string,
  specialAttachment?: File | null
): Promise<SingleResponse<Payment>> {
  if (specialAttachment) {
    const formData = new FormData();
    formData.append('status', status);
    if (notes) formData.append('notes', notes);
    formData.append('special_attachment', specialAttachment);

    const { data } = await axios.post<SingleResponse<Payment>>(`${BASE}/${id}/verify`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  const { data } = await axios.post<SingleResponse<Payment>>(`${BASE}/${id}/verify`, { status, notes });
  return data;
}
