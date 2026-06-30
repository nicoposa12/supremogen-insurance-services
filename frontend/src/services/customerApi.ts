/**
 * Customer API service layer.
 * All customer-related HTTP requests go through here.
 */

import axios from 'axios';
import type {
  Customer,
  CustomerDocument,
  CustomerFormData,
  CustomerListParams,
  PaginatedResponse,
  SingleResponse,
} from '../types/CustomerTypes';

const BASE = '/api/v1/customers';

/**
 * Fetch paginated customer list with optional search, filter, sort.
 */
export async function getCustomers(
  params: CustomerListParams = {}
): Promise<PaginatedResponse<Customer>> {
  const { data } = await axios.get<PaginatedResponse<Customer>>(BASE, { params });
  return data;
}

/**
 * Fetch a single customer by ID (includes documents).
 */
export async function getCustomer(id: number): Promise<SingleResponse<Customer>> {
  const { data } = await axios.get<SingleResponse<Customer>>(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new customer.
 */
export async function createCustomer(
  formData: CustomerFormData
): Promise<SingleResponse<Customer>> {
  const { data } = await axios.post<SingleResponse<Customer>>(BASE, formData);
  return data;
}

/**
 * Update an existing customer.
 */
export async function updateCustomer(
  id: number,
  formData: CustomerFormData
): Promise<SingleResponse<Customer>> {
  const { data } = await axios.put<SingleResponse<Customer>>(`${BASE}/${id}`, formData);
  return data;
}

/**
 * Soft-delete a customer.
 */
export async function deleteCustomer(id: number): Promise<SingleResponse<null>> {
  const { data } = await axios.delete<SingleResponse<null>>(`${BASE}/${id}`);
  return data;
}

/**
 * Upload a document for a customer.
 */
export async function uploadCustomerDocument(
  customerId: number,
  file: File,
  documentType: string
): Promise<SingleResponse<CustomerDocument>> {
  const form = new FormData();
  form.append('file', file);
  form.append('document_type', documentType);

  const { data } = await axios.post<SingleResponse<CustomerDocument>>(
    `${BASE}/${customerId}/documents`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

/**
 * Delete a customer document.
 */
export async function deleteCustomerDocument(
  customerId: number,
  documentId: number
): Promise<SingleResponse<null>> {
  const { data } = await axios.delete<SingleResponse<null>>(
    `${BASE}/${customerId}/documents/${documentId}`
  );
  return data;
}
