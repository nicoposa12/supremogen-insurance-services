import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Image, File, Download, Trash2, 
  UploadCloud, Loader2, FileSpreadsheet, Paperclip 
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { 
  getAttachments, uploadAttachment, 
  downloadAttachment, deleteAttachment 
} from '../../services/attachmentApi';
import type { Attachment } from '../../services/attachmentApi';

interface AttachmentPanelProps {
  type: 'customer' | 'quotation' | 'policy' | 'invoice' | 'claim';
  id: number;
  readOnly?: boolean;
}

export default function AttachmentPanel({ type, id, readOnly = false }: AttachmentPanelProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { roles } = useAuth();
  
  // Administrators are always read-only
  const isAdmin = roles.includes('Administrator');
  const isWritable = !readOnly && !isAdmin;

  const [isUploading, setIsUploading] = useState(false);

  // Fetch attachments
  const { data: response, isLoading } = useQuery({
    queryKey: ['attachments', type, id],
    queryFn: () => getAttachments(type, id),
    enabled: !!id,
  });

  const attachments = response?.data ?? [];

  // Upload mutation
  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadAttachment(type, id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', type, id] });
      showToast('File uploaded successfully.');
      setIsUploading(false);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to upload file.', 'error');
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', type, id] });
      showToast('File deleted.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message ?? 'Failed to delete file.', 'error');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size exceeds the 10MB limit.', 'error');
        return;
      }
      setIsUploading(true);
      uploadMut.mutate(file);
    }
  };

  const handleDownload = async (att: Attachment) => {
    try {
      await downloadAttachment(att.id, att.file_name);
      showToast('Download started.');
    } catch (err) {
      showToast('Failed to download file.', 'error');
    }
  };

  // Helper to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-6 w-6 text-emerald-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    if (
      mimeType.includes('sheet') || 
      mimeType.includes('excel') || 
      mimeType.includes('csv')
    ) {
      return <FileSpreadsheet className="h-6 w-6 text-teal-600" />;
    }
    return <File className="h-6 w-6 text-blue-500" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#4A0E17]/5 rounded-xl text-[#4A0E17]">
            <Paperclip className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Attachments & Documents</h3>
            <p className="text-xs text-slate-500">Photos, receipts, policies, or other documents</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File List */}
        <div className="lg:col-span-2 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#4A0E17]" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center px-4">
              <Paperclip className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No attachments uploaded yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Upload images, PDFs, or documents for this record</p>
            </div>
          ) : (
            attachments.map((att) => (
              <div 
                key={att.id} 
                className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/75 hover:border-slate-200 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(att.mime_type)}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate" title={att.file_name}>
                      {att.file_name}
                    </p>
                    <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span>{formatBytes(att.file_size)}</span>
                      <span>•</span>
                      <span>By {att.uploaded_by_relation?.name ?? 'System'}</span>
                      <span>•</span>
                      <span>{new Date(att.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 ml-3">
                  <button 
                    onClick={() => handleDownload(att)}
                    className="p-2 rounded-lg text-slate-400 hover:text-[#4A0E17] hover:bg-[#4A0E17]/5 transition cursor-pointer"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {isWritable && (
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this attachment?')) {
                          deleteMut.mutate(att.id);
                        }
                      }}
                      disabled={deleteMut.isPending}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete"
                    >
                      {deleteMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Area */}
        <div className="flex flex-col justify-center">
          {isWritable ? (
            <label className={`flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-[#4A0E17]/5 hover:border-[#4A0E17]/30 transition group text-center relative ${
              isUploading ? 'pointer-events-none opacity-60' : ''
            }`}>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileChange} 
                disabled={isUploading} 
              />
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17] mb-2.5" />
                  <p className="text-xs font-semibold text-slate-600">Uploading file...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Please wait</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-slate-400 group-hover:text-[#4A0E17] transition mb-2.5" />
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-[#4A0E17] transition">
                    Upload a File
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[150px] mx-auto leading-normal">
                    Images, PDFs, or documents up to 10MB
                  </p>
                </>
              )}
            </label>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
              <Paperclip className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-500">View Only Mode</p>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-[180px]">
                You can download files, but upload and delete actions are restricted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
