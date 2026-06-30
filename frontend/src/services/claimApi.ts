import axios from 'axios';
import type { Claim, ClaimFormData, ClaimListParams } from '../types/ClaimsTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/claims';

export async function getClaims(params: ClaimListParams = {}): Promise<PaginatedResponse<Claim>> {
  const { data } = await axios.get<PaginatedResponse<Claim>>(BASE, { params });
  return data;
}

export async function getClaim(id: number): Promise<SingleResponse<Claim>> {
  const { data } = await axios.get<SingleResponse<Claim>>(`${BASE}/${id}`);
  return data;
}

export async function fileClaim(formData: ClaimFormData): Promise<SingleResponse<Claim>> {
  const { data } = await axios.post<SingleResponse<Claim>>(BASE, formData);
  return data;
}

export async function updateClaim(id: number, formData: Partial<ClaimFormData>): Promise<SingleResponse<Claim>> {
  const { data } = await axios.put<SingleResponse<Claim>>(`${BASE}/${id}`, formData);
  return data;
}

export async function deleteClaim(id: number): Promise<SingleResponse<null>> {
  const { data } = await axios.delete<SingleResponse<null>>(`${BASE}/${id}`);
  return data;
}

export async function assignClaim(id: number, assignedTo: number): Promise<SingleResponse<Claim>> {
  const { data } = await axios.post<SingleResponse<Claim>>(`${BASE}/${id}/assign`, { assigned_to: assignedTo });
  return data;
}

export async function reviewClaim(
  id: number, action: 'approve' | 'deny', approvedAmount?: number, adjusterRemarks?: string
): Promise<SingleResponse<Claim>> {
  const { data } = await axios.post<SingleResponse<Claim>>(`${BASE}/${id}/review`, {
    action, approved_amount: approvedAmount, adjuster_remarks: adjusterRemarks,
  });
  return data;
}

export async function settleClaim(
  id: number, settlementAmount: number, settlementDate: string, adjusterRemarks?: string
): Promise<SingleResponse<Claim>> {
  const { data } = await axios.post<SingleResponse<Claim>>(`${BASE}/${id}/settle`, {
    settlement_amount: settlementAmount, settlement_date: settlementDate, adjuster_remarks: adjusterRemarks,
  });
  return data;
}
