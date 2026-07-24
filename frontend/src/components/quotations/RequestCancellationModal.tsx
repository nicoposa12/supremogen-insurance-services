import React, { useState } from 'react';
import { X, FileText, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import type { Quotation } from '../../types/SalesTypes';
import { requestQuotationCancellation } from '../../services/quotationApi';
import { useToast } from '../ui/Toast';

interface RequestCancellationModalProps {
  quotation: Quotation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestCancellationModal: React.FC<RequestCancellationModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  if (!isOpen) return null;

  const firstItem = quotation.items?.[0];
  const cov = firstItem?.coverage_details || {};
  const cust = quotation.customer;

  const todayStr = new Date().toISOString().split('T')[0];
  const [writingDate, setWritingDate] = useState<string>(todayStr);

  const clientName = cust
    ? [cust.first_name, cust.middle_name, cust.last_name].filter(Boolean).join(' ')
    : '—';
  const policyNumber = cust?.policy_no || (quotation as any).policy?.policy_number || quotation.policy_number || '—';
  const plateNumber = cov.plate_no || cov.plate_number || cust?.plate_no || '—';
  const provider = cov.insurance_provider || cov.provider || cust?.insurance_provider || 'ALPHA';
  const initialInception = cust?.inception_date ? String(cust.inception_date).split('T')[0] : '';
  const [inceptionDate, setInceptionDate] = useState<string>(initialInception);

  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a reason for cancellation.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('writing_date', writingDate);
      formData.append('inception', inceptionDate);
      formData.append('cancellation_reason', reason.trim());
      if (attachment) {
        formData.append('attachment', attachment);
      }

      await requestQuotationCancellation(quotation.id, formData);
      showToast('Policy cancellation request submitted successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit cancellation request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-700 rounded-2xl border border-red-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">REQUEST FOR CANCELLATION</h2>
              <p className="text-xs text-slate-500 font-medium">Submit policy cancellation request to underwriter for approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Details Grid */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Writing Date</label>
                <input
                  type="date"
                  value={writingDate}
                  onChange={(e) => setWritingDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client Name</label>
                <div className="px-3 py-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl font-bold text-slate-800 truncate">
                  {clientName}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Policy Number</label>
                <div className="px-3 py-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl font-mono font-bold text-slate-800">
                  {policyNumber}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Plate Number</label>
                <div className="px-3 py-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl font-mono font-bold text-slate-800">
                  {plateNumber}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Provider</label>
                <div className="px-3 py-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl font-bold text-slate-800 uppercase">
                  {provider}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inception</label>
                <input
                  type="date"
                  value={inceptionDate}
                  onChange={(e) => setInceptionDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20"
                />
              </div>
            </div>
          </div>

          {/* Reason of Cancellation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason of Cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear justification or reason for cancelling this policy request..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#4A0E17]/20 focus:border-[#4A0E17] transition"
            />
          </div>

          {/* Upload Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Upload Attachment <span className="text-slate-400 font-normal">(Cancellation letter / supporting document)</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 hover:border-[#4A0E17] bg-slate-50/50 hover:bg-slate-50 rounded-2xl cursor-pointer transition text-xs font-semibold text-slate-600">
                <Upload className="h-4 w-4 text-slate-400" />
                <span>{attachment ? attachment.name : 'Choose file to upload...'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {attachment && (
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
