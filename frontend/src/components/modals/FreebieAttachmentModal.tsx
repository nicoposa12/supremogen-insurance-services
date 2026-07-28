import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Upload, FileText, Gift, Download, Eye, Trash2,
  CheckCircle2, XCircle, Loader2, File, Image as ImageIcon
} from 'lucide-react';
import {
  getAttachments,
  uploadAttachment,
  downloadAttachment,
  getAttachmentPreview,
  deleteAttachment,
  type Attachment
} from '../../services/attachmentApi';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';

interface FreebieAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachableType: 'quotation' | 'policy' | 'invoice' | 'customer' | 'payment';
  attachableId: number;
  title: string;
  customerName?: string | null;
  freebieInfo?: string | number;
  isCancelled?: boolean;
  onAttachmentUploaded?: () => void;
}

export default function FreebieAttachmentModal({
  isOpen,
  onClose,
  attachableType,
  attachableId,
  title,
  customerName,
  freebieInfo,
  isCancelled = false,
  onAttachmentUploaded,
}: FreebieAttachmentModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles = [] } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAccountingOrAdmin = roles.some(
    (r) => r === 'Accounting Officer' || r === 'Accounting' || r === 'Admin' || r === 'Super Admin'
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docLabel, setDocLabel] = useState<string>('Freebie Delivery Proof');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [previewMime, setPreviewMime] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch attachments for this record
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['attachments', attachableType, attachableId],
    queryFn: () => getAttachments(attachableType, attachableId),
    enabled: isOpen && Boolean(attachableId),
  });

  const attachments: Attachment[] = response?.data ?? [];
  const freebieAttachments = attachments.filter(
    (att) =>
      att.document_type === 'freebie_proof' ||
      att.document_type?.toLowerCase().includes('freebie') ||
      att.file_name.toLowerCase().includes('freebie')
  );
  const otherAttachments = attachments.filter(
    (att) => !freebieAttachments.includes(att)
  );

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (isCancelled) {
      showToast('Cannot upload freebie delivery proof for a cancelled policy or quotation.', 'error');
      return;
    }

    if (!selectedFile) {
      showToast('Please select a file to upload.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      await uploadAttachment(
        attachableType,
        attachableId,
        selectedFile,
        'freebie_proof'
      );
      showToast('Freebie delivery attachment uploaded successfully!', 'success');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (onAttachmentUploaded) onAttachmentUploaded();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to upload freebie attachment.',
        'error'
      );
    } finally {
      setIsUploading(false);
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
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFileName('');
    setPreviewMime('');
  };

  const handleDeleteRequest = (attId: number) => {
    setDeleteConfirmId(attId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;
    setIsDeleting(true);
    try {
      await deleteAttachment(deleteConfirmId);
      showToast('Attachment deleted successfully.', 'success');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (onAttachmentUploaded) onAttachmentUploaded();
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

  const hasFreebieInfo = Boolean(
    freebieInfo !== undefined &&
    freebieInfo !== null &&
    freebieInfo !== 0 &&
    freebieInfo !== '0' &&
    freebieInfo !== '₱0.00' &&
    freebieInfo !== '₱0' &&
    freebieInfo !== ''
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#3A0A12] via-[#4A0E17] to-[#6A1624] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Gift className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  {isAccountingOrAdmin ? 'Freebie Delivery Attachment' : 'Freebie Delivery Proof'}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                  isAccountingOrAdmin
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                }`}>
                  {isAccountingOrAdmin ? 'Fully Paid' : 'View Only (Collection)'}
                </span>
              </div>
              <p className="text-xs text-rose-100/90 font-medium mt-0.5">
                Record Ref: <span className="font-bold text-white">{title}</span>
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
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Freebie Amount Summary Banner (Only rendered if details exist > 0) */}
          {hasFreebieInfo && (
            <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs">
              <div className="flex items-center gap-2.5 text-amber-900 font-semibold">
                <Gift className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Freebie Entitlement / Cashback Details:
                </span>
              </div>
              <span className="font-bold font-mono text-xs text-amber-950 bg-amber-200/70 px-3 py-1 rounded-xl">
                {typeof freebieInfo === 'number'
                  ? `₱${freebieInfo.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : freebieInfo}
              </span>
            </div>
          )}

          {/* Cancelled Alert Banner */}
          {isCancelled && (
            <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold shadow-xs">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Policy / Quotation is CANCELLED</p>
                <p className="text-[11px] text-rose-600 font-normal mt-0.5">Uploading new freebie delivery attachments is disabled for cancelled accounts.</p>
              </div>
            </div>
          )}

          {/* Upload Box (Accounting / Admin Only - Disabled if cancelled) */}
          {isAccountingOrAdmin && !isCancelled ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#4A0E17]" /> Upload Proof of Delivered Freebie
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
                  selectedFile
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
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                    <div className="flex items-center gap-3 text-left">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-rose-50 text-[#4A0E17] rounded-full flex items-center justify-center mx-auto">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      Click to browse or drag & drop freebie delivery proof
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Delivery receipts, signed forms, photos of delivered items
                    </p>
                  </div>
                )}
              </div>

              {/* Document Label & Submit */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <input
                  type="text"
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                  placeholder="Description / Document Label (e.g. Freebie Receipt)"
                  className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20"
                />
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#4A0E17] hover:bg-[#380A12] text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Upload Attachment
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-xs">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-blue-950">Collection View-Only Mode</p>
                <p className="text-blue-700/90 font-medium mt-0.5">
                  As a Collection Officer, you can view, preview, and download freebie delivery attachments uploaded by Accounting.
                </p>
              </div>
            </div>
          )}

          {/* Uploaded Freebie Attachments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Uploaded Freebie Attachments ({freebieAttachments.length})
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" />
              </div>
            ) : freebieAttachments.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <Gift className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  No freebie delivery attachments uploaded yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Accounting officers can upload delivery receipts or photos above.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {freebieAttachments.map((att) => {
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
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 rounded-md shrink-0">
                              Freebie Proof
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

                      {/* Action buttons */}
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
                            onClick={() => handleDeleteRequest(att.id)}
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

          {/* Other Record Attachments (if any) */}
          {otherAttachments.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <details className="group">
                <summary className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 transition py-1 flex items-center justify-between">
                  <span>Other Attachments for this Record ({otherAttachments.length})</span>
                  <span className="text-[10px] font-normal text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 space-y-2">
                  {otherAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <File className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{att.file_name}</span>
                        {att.document_type && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-slate-200 text-slate-600 rounded">
                            {att.document_type}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(att)}
                        className="p-1 text-slate-500 hover:text-slate-800 transition"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={deleteConfirmId !== null}
          title="Delete Attachment"
          message={(() => {
            const target = freebieAttachments.find((a) => a.id === deleteConfirmId);
            return target
              ? `Are you sure you want to delete "${target.file_name}"? This action cannot be undone.`
              : 'Are you sure you want to delete this freebie attachment? This action cannot be undone.';
          })()}
          confirmLabel="Delete"
          variant="danger"
          loading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
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
