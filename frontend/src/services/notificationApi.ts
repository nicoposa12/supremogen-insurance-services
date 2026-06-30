import axios from 'axios';
import type { SystemNotification } from '../types/NotificationTypes';
import type { SingleResponse } from '../types/CustomerTypes';

const BASE = '/api/v1/notifications';

export async function getNotifications(): Promise<SingleResponse<SystemNotification[]>> {
  const { data } = await axios.get<SingleResponse<SystemNotification[]>>(BASE);
  return data;
}

export async function markNotificationAsRead(id: number): Promise<SingleResponse<SystemNotification>> {
  const { data } = await axios.post<SingleResponse<SystemNotification>>(`${BASE}/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead(): Promise<SingleResponse<null>> {
  const { data } = await axios.post<SingleResponse<null>>(`${BASE}/read-all`);
  return data;
}
