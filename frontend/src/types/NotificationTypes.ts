/**
 * Notification module TypeScript interfaces.
 */

export interface SystemNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read_at: string | null;
  created_at: string;
  updated_at: string;
}
