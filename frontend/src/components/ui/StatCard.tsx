import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  iconColor?: string;
  iconBg?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel = 'vs last month',
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
}: StatCardProps) {
  const trendIsPositive = trend !== undefined && trend > 0;
  const trendIsNegative = trend !== undefined && trend < 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>

        <div
          className={`p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          {trendIsPositive && (
            <>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-emerald-600">+{trend}%</span>
            </>
          )}
          {trendIsNegative && (
            <>
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-600">{trend}%</span>
            </>
          )}
          {!trendIsPositive && !trendIsNegative && (
            <>
              <Minus className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-500">0%</span>
            </>
          )}
          <span className="text-slate-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
