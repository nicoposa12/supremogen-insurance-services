import axios from 'axios';

const BASE = '/api/v1/attachments';

export interface Attachment {
  id: number;
  attachable_type: string;
  attachable_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
  uploaded_by_relation?: {
    id: number;
    name: string;
  };
}

export interface AttachmentResponse {
  status: string;
  data: Attachment[];
}

export interface SingleAttachmentResponse {
  status: string;
  message: string;
  data: Attachment;
}

/**
 * List all attachments for a specific model instance.
 */
export async function getAttachments(
  attachableType: 'customer' | 'quotation' | 'policy' | 'invoice' | 'claim' | 'payment',
  attachableId: number
): Promise<AttachmentResponse> {
  const { data } = await axios.get<AttachmentResponse>(BASE, {
    params: { attachable_type: attachableType, attachable_id: attachableId },
  });
  return data;
}

/**
 * Upload a new file as an attachment.
 */
export async function uploadAttachment(
  attachableType: 'customer' | 'quotation' | 'policy' | 'invoice' | 'claim' | 'payment',
  attachableId: number,
  file: File,
  documentType?: string
): Promise<SingleAttachmentResponse> {
  const formData = new FormData();
  formData.append('attachable_type', attachableType);
  formData.append('attachable_id', String(attachableId));
  formData.append('file', file);
  if (documentType) {
    formData.append('document_type', documentType);
  }

  const { data } = await axios.post<SingleAttachmentResponse>(BASE, formData);
  return data;
}

/**
 * Securely download an attachment file.
 */
export async function downloadAttachment(id: number, fileName: string): Promise<void> {
  const { data } = await axios.get(`${BASE}/${id}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Fetch a blob for inline preview.
 */
export async function getAttachmentPreview(id: number): Promise<Blob> {
  const { data } = await axios.get(`${BASE}/${id}/preview`, {
    responseType: 'blob',
  });
  return data;
}

/**
 * Delete an attachment.
 */
export async function deleteAttachment(id: number): Promise<{ status: string; message: string }> {
  const { data } = await axios.delete<{ status: string; message: string }>(`${BASE}/${id}`);
  return data;
}
