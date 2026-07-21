import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'success' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const btnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
      : 'bg-[#4A0E17] hover:bg-[#3D0B12] focus:ring-[#4A0E17]';

  const iconBg =
    variant === 'danger'
      ? 'bg-red-100 text-red-600'
      : variant === 'warning'
      ? 'bg-amber-100 text-amber-600'
      : variant === 'success'
      ? 'bg-emerald-100 text-emerald-600'
      : 'bg-slate-100 text-[#4A0E17]';

  const Icon =
    variant === 'success'
      ? CheckCircle2
      : variant === 'primary'
      ? Info
      : AlertTriangle;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 cursor-pointer ${btnClass}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
