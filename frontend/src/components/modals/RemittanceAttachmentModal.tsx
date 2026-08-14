import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Upload, FileText, Download, Eye, Trash2,
  CheckCircle2, Loader2, File, Image as ImageIcon,
  Send, ArrowDownUp,
} from 'lucide-react';
import {
  getAttachments,
  uploadAttachment,
  downloadAttachment,
  getAttachmentPreview,
  deleteAttachment,
  type Attachment,
} from '../../services/attachmentApi';
import { toggleQuotationRemittance } from '../../services/quotationApi';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';

interface RemittanceAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: number;
  quotationRef: string;
  customerName?: string | null;
  isRemitted: boolean;
  onStatusChanged?: () => void;
}

export default function RemittanceAttachmentModal({
  isOpen,
  onClose,
  quotationId,
  quotationRef,
  customerName,
  isRemitted,
  onStatusChanged,
}: RemittanceAttachmentModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles = [] } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAccountingOrAdmin = roles.some(
    (r) =>
      r === 'Accounting Officer' ||
      r === 'Team Support Operation' ||
      r === 'Accounting' ||
      r === 'Admin' ||
      r === 'Super Admin'
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewMime, setPreviewMime] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unremitConfirm, setUnremitConfirm] = useState(false);

  // Fetch attachments for this quotation
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['attachments', 'quotation', quotationId, 'remittance'],
    queryFn: () => getAttachments('quotation', quotationId),
    enabled: isOpen && Boolean(quotationId),
  });

  const attachments: Attachment[] = response?.data ?? [];
  const remittanceAttachments = attachments.filter(
    (att) =>
      att.document_type === 'remittance_proof' ||
      att.document_type?.toLowerCase().includes('remittance')
  );

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) {
      showToast('Please select at least one file to upload.', 'error');
      return;
    }
    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        await uploadAttachment('quotation', quotationId, file, 'remittance_proof');
      }
      showToast(`${selectedFiles.length} remittance attachment(s) uploaded successfully!`, 'success');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to upload remittance attachment.',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleMarkRemitted = async () => {
    setIsToggling(true);
    try {
      // Upload any pending files first
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          await uploadAttachment('quotation', quotationId, file, 'remittance_proof');
        }
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      // Toggle remittance status
      const res = await toggleQuotationRemittance(quotationId);
      showToast(res.message || 'Remittance status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      refetch();
      if (onStatusChanged) onStatusChanged();
      onClose();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to update remittance status.',
        'error'
      );
    } finally {
      setIsToggling(false);
    }
  };

  const handleUnremit = async () => {
    setIsToggling(true);
    try {
      const res = await toggleQuotationRemittance(quotationId);
      showToast(res.message || 'Remittance status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      refetch();
      if (onStatusChanged) onStatusChanged();
      onClose();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to update remittance status.',
        'error'
      );
    } finally {
      setIsToggling(false);
      setUnremitConfirm(false);
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      await downloadAttachment(att.id, att.file_name);
      showToast(`Downloading ${att.file_name}...`, 'success');
    } catch {
      showToast('Failed to download file.', 'error');
    }
  };

  const handlePreview = async (att: Attachment) => {
    try {
      setPreviewingId(att.id);
      const blob = await getAttachmentPreview(att.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFileName(att.file_name);
      setPreviewMime(att.mime_type);
    } catch {
      showToast('Failed to load file preview.', 'error');
    } finally {
      setPreviewingId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFileName('');
    setPreviewMime('');
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;
    setIsDeleting(true);
    try {
      await deleteAttachment(deleteConfirmId);
      showToast('Attachment deleted successfully.', 'success');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } catch {
      showToast('Failed to delete attachment.', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${
          isRemitted
            ? 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900'
            : 'bg-gradient-to-r from-[#3A0A12] via-[#4A0E17] to-[#6A1624]'
        } text-white`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <ArrowDownUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Remittance Proof
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                  isRemitted
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}>
                  {isRemitted ? '● Remitted' : '○ Unremitted'}
                </span>
              </div>
              <p className="text-xs text-rose-100/90 font-medium mt-0.5">
                Ref: <span className="font-bold text-white">{quotationRef}</span>
                {customerName && <span> • {customerName}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Alert Banner if already remitted */}
          {isRemitted && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-xs">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-emerald-950">Status: Remitted to Provider</p>
                <p className="text-emerald-700/90 font-medium text-[11px] mt-0.5">
                  This policy is marked as remitted. You can upload additional receipts or proof files anytime below.
                </p>
              </div>
            </div>
          )}

          {/* Upload Box (Only for Accounting/Admin) */}
          {isAccountingOrAdmin ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#4A0E17]" /> {isRemitted ? 'Upload Additional Remittance Proof' : 'Upload Remittance Proof'}
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Max file size: 10MB (PDF, PNG, JPG, DOCX)
                </span>
              </div>

              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  selectedFiles.length > 0
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-[#4A0E17] hover:bg-slate-100/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                  multiple
                />

                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs"
                      >
                        <div className="flex items-center gap-3 text-left overflow-hidden">
                          <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(f.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedFile(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <p
                      className="text-[11px] text-emerald-700 font-semibold mt-2 cursor-pointer hover:underline"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      + Add more files
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-rose-50 text-[#4A0E17] rounded-full flex items-center justify-center mx-auto">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      Click to browse or drag & drop remittance proof
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Bank transfer receipts, deposit slips, payment confirmations (multiple files allowed)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Action buttons */}
              {selectedFiles.length > 0 && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUploadAll}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isUploading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Uploading ({selectedFiles.length})...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-xs">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-blue-950">View-Only Mode</p>
                <p className="text-blue-700/90 font-medium mt-0.5">
                  Only Accounting Officers can upload remittance attachments and change the status.
                </p>
              </div>
            </div>
          )}

          {/* Uploaded Remittance Attachments List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Remittance Attachments ({remittanceAttachments.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" />
              </div>
            ) : remittanceAttachments.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <Send className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  No remittance proof attachments uploaded yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Upload bank transfer receipts or deposit slips above.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {remittanceAttachments.map((att) => {
                  const isImage = att.mime_type?.startsWith('image/');
                  const isPdf = att.mime_type === 'application/pdf';

                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-xs transition"
                    >
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        <div className={`p-2.5 rounded-xl shrink-0 ${isImage ? 'bg-purple-50 text-purple-600' : isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          {isImage ? (
                            <ImageIcon className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {att.file_name}
                            </p>
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-md shrink-0">
                              Remittance Proof
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{formatFileSize(att.file_size)}</span>
                            <span>•</span>
                            <span>
                              Uploaded by: {att.uploaded_by_relation?.name || 'Accounting'}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(att.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => handlePreview(att)}
                          disabled={previewingId === att.id}
                          className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                          title="Preview File"
                        >
                          {previewingId === att.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownload(att)}
                          className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                          title="Download File"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {isAccountingOrAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(att.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Delete Attachment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          {isAccountingOrAdmin && (
            <div className="flex items-center gap-2">
              {isRemitted ? (
                <>
                  {selectedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUploadAll}
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {isUploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4" /> Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}</>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setUnremitConfirm(true)}
                    disabled={isToggling}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {isToggling ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><ArrowDownUp className="h-4 w-4" /> Mark as Unremitted</>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkRemitted}
                  disabled={isToggling || isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isToggling ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> {selectedFiles.length > 0 ? `Upload & Mark Remitted` : 'Confirm & Mark Remitted'}</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={deleteConfirmId !== null}
          title="Delete Attachment"
          message={(() => {
            const target = remittanceAttachments.find((a) => a.id === deleteConfirmId);
            return target
              ? `Are you sure you want to delete "${target.file_name}"? This action cannot be undone.`
              : 'Are you sure you want to delete this remittance attachment? This action cannot be undone.';
          })()}
          confirmLabel="Delete"
          variant="danger"
          loading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />

        {/* Unremit Confirmation */}
        <ConfirmModal
          open={unremitConfirm}
          title="Mark as Unremitted"
          message={`Are you sure you want to mark ${quotationRef} as Unremitted? The Claims Officer will also be notified of this change.`}
          confirmLabel="Confirm Unremit"
          variant="danger"
          loading={isToggling}
          onConfirm={handleUnremit}
          onCancel={() => setUnremitConfirm(false)}
        />

        {/* Inline Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
                <span className="text-xs font-bold truncate pr-4">{previewFileName}</span>
                <button
                  onClick={closePreview}
                  className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-grow p-4 bg-slate-100 overflow-auto flex items-center justify-center min-h-[400px]">
                {previewMime.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={previewFileName}
                    className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md"
                  />
                ) : previewMime === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={previewFileName}
                    className="w-full h-[75vh] rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-16 w-16 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">
                      Inline preview not available for this file type.
                    </p>
                    <a
                      href={previewUrl}
                      download={previewFileName}
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#4A0E17] text-white text-xs font-bold rounded-xl"
                    >
                      <Download className="h-4 w-4" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
