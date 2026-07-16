interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  blacklisted: {
    label: 'Blacklisted',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-stone-100 text-stone-600 ring-stone-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  lapsed: {
    label: 'Lapsed',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
  sent: {
    label: 'Sent',
    className: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  voided: {
    label: 'Voided',
    className: 'bg-stone-100 text-stone-600 ring-stone-500/20',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  },
  filed: {
    label: 'Filed',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  under_investigation: {
    label: 'Investigating',
    className: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  },
  denied: {
    label: 'Denied',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  settled: {
    label: 'Settled',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  closed: {
    label: 'Closed',
    className: 'bg-stone-100 text-stone-600 ring-stone-500/20',
  },
  renewed: {
    label: 'Renewed',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  acknowledged: {
    label: 'Acknowledged',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  returned: {
    label: 'Returned',
    className: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  },
  resubmitted: {
    label: 'Resubmitted',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  },
};

const defaultConfig = {
  label: 'Unknown',
  className: 'bg-slate-50 text-slate-700 ring-slate-600/20',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { ...defaultConfig, label: status };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset capitalize ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
