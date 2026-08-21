import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Download, AlertCircle, FileText } from 'lucide-react';

export default function AttachmentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAttachment = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/api/v1/attachments/${id}/download`, {
          responseType: 'blob',
        });
        if (!active) return;
        const type = res.headers['content-type'] || res.data.type || 'application/octet-stream';
        const disposition = res.headers['content-disposition'] || '';
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const name = match ? match[1] : `attachment-${id}`;

        const url = window.URL.createObjectURL(res.data);
        setBlobUrl(url);
        setMimeType(type);
        setFileName(name);
      } catch (err: any) {
        if (!active) return;
        setError(err.response?.data?.message || 'Failed to load document or file not found.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAttachment();
    return () => {
      active = false;
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm text-slate-300 font-medium">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-100">Unable to View Document</h2>
          <p className="text-sm text-slate-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5 text-slate-200 text-sm font-semibold truncate">
          <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="truncate">{fileName}</span>
        </div>
        {blobUrl && (
          <a
            href={blobUrl}
            download={fileName}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </a>
        )}
      </div>

      {/* Content Viewer */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isImage && blobUrl && (
          <div className="flex items-center justify-center w-full h-full max-h-[88vh]">
            <img src={blobUrl} alt={fileName} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-800" />
          </div>
        )}
        {isPdf && blobUrl && (
          <iframe src={blobUrl} title={fileName} className="w-full h-[88vh] rounded-xl border border-slate-800 bg-white shadow-2xl" />
        )}
        {!isImage && !isPdf && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
            <FileText className="h-16 w-16 text-slate-500 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-200">{fileName}</p>
            <p className="text-sm text-slate-400 mt-1 mb-5">This file format cannot be previewed directly in the browser.</p>
            {blobUrl && (
              <a
                href={blobUrl}
                download={fileName}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition"
              >
                <Download className="h-4 w-4" />
                <span>Download File</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
