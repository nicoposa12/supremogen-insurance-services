import { useState, useRef, useEffect } from 'react';
import { FileText, ChevronDown, Eye } from 'lucide-react';

interface BankAttachmentCellProps {
  customerAttachments?: any[];
  quotationAttachments?: any[];
  onViewAttachment: (attachment: any, allAttachments?: any[]) => void;
}

export default function BankAttachmentCell({
  customerAttachments = [],
  quotationAttachments = [],
  onViewAttachment,
}: BankAttachmentCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract all bank attachments
  const customerBankDocs = customerAttachments.filter((d: any) => d?.document_type === 'bank') || [];
  const quotationBankDocs = quotationAttachments.filter((d: any) => d?.document_type === 'bank') || [];

  // Deduplicate by ID
  const bankMap = new Map();
  [...customerBankDocs, ...quotationBankDocs].forEach((doc: any) => {
    if (doc?.id) bankMap.set(doc.id, doc);
  });
  const bankDocs = Array.from(bankMap.values());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (bankDocs.length === 0) {
    return <span className="text-slate-350">—</span>;
  }

  // Single Bank Attachment
  if (bankDocs.length === 1) {
    const singleDoc = bankDocs[0];
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onViewAttachment(singleDoc, bankDocs);
        }}
        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200/80 transition-all cursor-pointer inline-flex items-center shadow-2xs hover:shadow-xs"
        title={`View ${singleDoc.file_name}`}
      >
        <FileText className="h-4 w-4" />
      </button>
    );
  }

  // Multiple Bank Attachments -> Render ONE ICON ONLY with badge & popup menu
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs hover:shadow-xs bg-emerald-50/50"
        title={`${bankDocs.length} Bank Attachments Uploaded (Click to view)`}
      >
        <FileText className="h-4 w-4" />
        <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full leading-none min-w-[16px] text-center shadow-xs">
          {bankDocs.length}
        </span>
        <ChevronDown className={`h-3 w-3 text-emerald-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white shadow-xl border border-slate-200/80 py-2 z-50 animate-fade-in text-left divide-y divide-slate-100"
        >
          <div className="px-3 py-2 bg-slate-50/80 rounded-t-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bank Attachments ({bankDocs.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onViewAttachment(bankDocs[0], bankDocs);
              }}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-0.5"
            >
              <Eye className="h-3 w-3" /> View All
            </button>
          </div>
          <div className="py-1 max-h-48 overflow-y-auto">
            {bankDocs.map((doc: any, idx: number) => (
              <button
                key={doc.id || idx}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onViewAttachment(doc, bankDocs);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50/60 transition flex items-center gap-2 group cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="truncate flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 truncate group-hover:text-emerald-900">
                    Bank Attachment {idx + 1}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{doc.file_name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
