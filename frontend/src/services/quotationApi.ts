import axios from 'axios';
import type {
  Quotation,
  QuotationFormData,
  QuotationListParams,
} from '../types/SalesTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/quotations';

export async function getQuotations(
  params: QuotationListParams = {}
): Promise<PaginatedResponse<Quotation>> {
  const { data } = await axios.get<PaginatedResponse<Quotation>>(BASE, { params });
  return data;
}

export async function getQuotation(id: number): Promise<SingleResponse<Quotation>> {
  const { data } = await axios.get<SingleResponse<Quotation>>(`${BASE}/${id}`);
  return data;
}

export async function createQuotation(
  formData: QuotationFormData
): Promise<SingleResponse<Quotation>> {
  const { data } = await axios.post<SingleResponse<Quotation>>(BASE, formData);
  return data;
}

export async function updateQuotation(
  id: number,
  formData: QuotationFormData
): Promise<SingleResponse<Quotation>> {
  const { data } = await axios.put<SingleResponse<Quotation>>(`${BASE}/${id}`, formData);
  return data;
}

export async function deleteQuotation(id: number): Promise<SingleResponse<null>> {
  const { data } = await axios.delete<SingleResponse<null>>(`${BASE}/${id}`);
  return data;
}

export async function submitQuotation(id: number): Promise<SingleResponse<Quotation>> {
  const { data } = await axios.post<SingleResponse<Quotation>>(`${BASE}/${id}/submit`);
  return data;
}

export async function reviewQuotation(
  id: number,
  action: 'approve' | 'reject',
  reviewerRemarks?: string
): Promise<SingleResponse<Quotation>> {
  const { data } = await axios.post<SingleResponse<Quotation>>(`${BASE}/${id}/review`, {
    action,
    reviewer_remarks: reviewerRemarks,
  });
  return data;
}
