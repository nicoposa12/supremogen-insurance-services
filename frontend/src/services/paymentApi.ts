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
  const { data } = await axios.post<SingleResponse<Payment>>(BASE, formData);
  return data;
}

export async function voidPayment(id: number): Promise<SingleResponse<Payment>> {
  const { data } = await axios.post<SingleResponse<Payment>>(`${BASE}/${id}/void`);
  return data;
}

export async function updatePayment(id: number, formData: PaymentFormData): Promise<SingleResponse<Payment>> {
  const { data } = await axios.put<SingleResponse<Payment>>(`${BASE}/${id}`, formData);
  return data;
}
