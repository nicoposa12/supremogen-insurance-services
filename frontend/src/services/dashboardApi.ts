/**
 * Dashboard API service layer.
 */

import axios from 'axios';
import type { DashboardData, SingleResponse } from '../types/CustomerTypes';

/**
 * Fetch dashboard statistics and chart data.
 */
export async function getDashboardData(): Promise<SingleResponse<DashboardData>> {
  const { data } = await axios.get<SingleResponse<DashboardData>>('/api/v1/dashboard');
  return data;
}
