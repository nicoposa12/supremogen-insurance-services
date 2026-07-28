import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

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
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Auto-focus the cancel button for accessibility
    confirmRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel, loading]);

  if (!open) return null;

  const config = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-500',
      btn: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600/30',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-500',
      btn: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600/30',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-500',
      btn: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600/30',
    },
    primary: {
      icon: Info,
      iconBg: 'bg-[#4A0E17]/5',
      iconText: 'text-[#4A0E17]',
      btn: 'bg-[#4A0E17] hover:bg-[#3A0A12] focus-visible:ring-[#4A0E17]/30',
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => !loading && onCancel()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 animate-scale-up">
        {/* Content */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-2.5 rounded-xl shrink-0 ${config.iconBg}`}>
              <Icon className={`h-5 w-5 ${config.iconText}`} />
            </div>

            {/* Text */}
            <div className="min-w-0 pt-0.5">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 px-6 py-4 bg-slate-50/80 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 transition disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-[13px] font-medium text-white rounded-lg focus-visible:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 ${config.btn}`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
