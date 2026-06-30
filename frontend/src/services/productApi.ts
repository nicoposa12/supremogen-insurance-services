import axios from 'axios';
import type { InsuranceProduct } from '../types/SalesTypes';
import type { SingleResponse } from '../types/CustomerTypes';

/**
 * Fetch all active insurance products.
 */
export async function getInsuranceProducts(): Promise<{ success: boolean; data: InsuranceProduct[] }> {
  const { data } = await axios.get('/api/v1/insurance-products');
  return data;
}
