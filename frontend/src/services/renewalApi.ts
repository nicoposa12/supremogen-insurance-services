import axios from 'axios';
import type { Renewal, RenewalListParams } from '../types/ClaimsTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/renewals';

export async function getRenewals(params: RenewalListParams = {}): Promise<PaginatedResponse<Renewal>> {
  const { data } = await axios.get<PaginatedResponse<Renewal>>(BASE, { params });
  return data;
}

export async function getRenewal(id: number): Promise<SingleResponse<Renewal>> {
  const { data } = await axios.get<SingleResponse<Renewal>>(`${BASE}/${id}`);
  return data;
}

export async function processRenewal(
  id: number,
  payload: {
    new_effective_date: string;
    new_expiry_date: string;
    premium_adjustment?: number;
    notes?: string;
  }
): Promise<SingleResponse<Renewal>> {
  const { data } = await axios.post<SingleResponse<Renewal>>(`${BASE}/${id}/process`, payload);
  return data;
}

export async function cancelRenewal(id: number, notes?: string): Promise<SingleResponse<Renewal>> {
  const { data } = await axios.post<SingleResponse<Renewal>>(`${BASE}/${id}/cancel`, { notes });
  return data;
}
