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
      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 focus:ring-rose-500/20 active:scale-[0.98] shadow-lg shadow-rose-600/10'
      : variant === 'warning'
      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:ring-amber-500/20 active:scale-[0.98] shadow-lg shadow-amber-500/10'
      : variant === 'success'
      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:ring-emerald-500/20 active:scale-[0.98] shadow-lg shadow-emerald-500/10'
      : 'bg-gradient-to-r from-[#4A0E17] to-[#7A1C2E] hover:from-[#3D0B12] hover:to-[#5E1220] focus:ring-[#4A0E17]/20 active:scale-[0.98] shadow-lg shadow-[#4A0E17]/10';

  const iconColorClass =
    variant === 'danger'
      ? 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 border border-rose-200/50'
      : variant === 'warning'
      ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 border border-amber-200/50'
      : variant === 'success'
      ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 border border-emerald-200/50'
      : 'bg-gradient-to-br from-[#4A0E17]/5 to-[#4A0E17]/10 text-[#4A0E17] border border-[#4A0E17]/10';

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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-fade-in cursor-pointer"
        onClick={onCancel}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 md:p-8 overflow-hidden animate-scale-up z-10 cursor-default">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content Layout */}
        <div className="flex flex-col items-center text-center mt-3">
          {/* Centered Circular Icon */}
          <div className={`p-4 rounded-full flex items-center justify-center shrink-0 mb-5 shadow-inner ${iconColorClass}`}>
            <Icon className="h-8 w-8" />
          </div>

          {/* Title & Message */}
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${btnClass}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
