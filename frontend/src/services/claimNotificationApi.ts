import axios from 'axios';
import type {
  ClaimNotification,
  ClaimNotificationFormData,
  ClaimNotificationListParams,
} from '../types/ClaimsTypes';
import type { PaginatedResponse, SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/claim-notifications';

export async function getClaimNotifications(
  params: ClaimNotificationListParams = {}
): Promise<PaginatedResponse<ClaimNotification>> {
  const { data } = await axios.get<PaginatedResponse<ClaimNotification>>(BASE, { params });
  return data;
}

export async function getClaimNotification(
  id: number
): Promise<SingleResponse<ClaimNotification>> {
  const { data } = await axios.get<SingleResponse<ClaimNotification>>(`${BASE}/${id}`);
  return data;
}

export async function createClaimNotification(
  formData: ClaimNotificationFormData
): Promise<SingleResponse<ClaimNotification>> {
  const { data } = await axios.post<SingleResponse<ClaimNotification>>(BASE, formData);
  return data;
}

export async function acknowledgeClaimNotification(
  id: number
): Promise<SingleResponse<ClaimNotification>> {
  const { data } = await axios.post<SingleResponse<ClaimNotification>>(
    `${BASE}/${id}/acknowledge`
  );
  return data;
}

export async function returnClaimNotification(
  id: number,
  reason?: string
): Promise<SingleResponse<ClaimNotification>> {
  const { data } = await axios.post<SingleResponse<ClaimNotification>>(
    `${BASE}/${id}/return`,
    { reason }
  );
  return data;
}

export async function updateClaimNotification(
  id: number,
  formData: ClaimNotificationFormData
): Promise<SingleResponse<ClaimNotification>> {
  const { data } = await axios.put<SingleResponse<ClaimNotification>>(`${BASE}/${id}`, formData);
  return data;
}

export async function sendEmailToInsuranceProvider(
  id: number,
  payload: { to: string[]; cc: string[] }
): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post<{ success: boolean; message: string }>(
    `${BASE}/${id}/send-email`,
    payload
  );
  return data;
}
