import axios from 'axios';
import type { Policy, PolicyFormData, PolicyListParams } from '../types/SalesTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/policies';

export async function getPolicies(
  params: PolicyListParams = {}
): Promise<PaginatedResponse<Policy>> {
  const { data } = await axios.get<PaginatedResponse<Policy>>(BASE, { params });
  return data;
}

export async function getPolicy(id: number): Promise<SingleResponse<Policy>> {
  const { data } = await axios.get<SingleResponse<Policy>>(`${BASE}/${id}`);
  return data;
}

export async function issuePolicy(
  formData: PolicyFormData
): Promise<SingleResponse<Policy>> {
  const { data } = await axios.post<SingleResponse<Policy>>(BASE, formData);
  return data;
}

export async function cancelPolicy(
  id: number,
  cancellationReason: string
): Promise<SingleResponse<Policy>> {
  const { data } = await axios.post<SingleResponse<Policy>>(`${BASE}/${id}/cancel`, {
    cancellation_reason: cancellationReason,
  });
  return data;
}
