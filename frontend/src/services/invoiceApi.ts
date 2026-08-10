import axios from 'axios';
import type { Invoice, InvoiceFormData, InvoiceListParams } from '../types/AccountingTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/invoices';

export async function getInvoices(params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> {
  const { data } = await axios.get<PaginatedResponse<Invoice>>(BASE, { params });
  return data;
}

export async function getInvoice(id: number): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.get<SingleResponse<Invoice>>(`${BASE}/${id}`);
  return data;
}

export async function createInvoice(formData: InvoiceFormData): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.post<SingleResponse<Invoice>>(BASE, formData);
  return data;
}

export async function updateInvoice(id: number, formData: InvoiceFormData): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.put<SingleResponse<Invoice>>(`${BASE}/${id}`, formData);
  return data;
}

export async function deleteInvoice(id: number): Promise<SingleResponse<null>> {
  const { data } = await axios.delete<SingleResponse<null>>(`${BASE}/${id}`);
  return data;
}

export async function sendInvoice(id: number): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.post<SingleResponse<Invoice>>(`${BASE}/${id}/send`);
  return data;
}

export async function cancelInvoice(id: number): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.post<SingleResponse<Invoice>>(`${BASE}/${id}/cancel`);
  return data;
}

export async function sendInvoiceReminder(id: number): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.post<SingleResponse<Invoice>>(`${BASE}/${id}/send-reminder`);
  return data;
}

export async function notifyDstWarning(id: number): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.post<SingleResponse<Invoice>>(`${BASE}/${id}/notify-dst-warning`);
  return data;
}

export async function sendCancellationNotice(id: number): Promise<SingleResponse<Invoice>> {
  const { data } = await axios.post<SingleResponse<Invoice>>(`${BASE}/${id}/notify-cancellation-notice`);
  return data;
}

export async function updateSubagentCommission(id: number, payload: any): Promise<SingleResponse<any>> {
  const { data } = await axios.put<SingleResponse<any>>(`${BASE}/${id}/subagent-commission`, payload);
  return data;
}
