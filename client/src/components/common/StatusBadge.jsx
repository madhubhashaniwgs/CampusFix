import { Clock, CheckCircle2, AlertCircle, UserCheck, XCircle } from 'lucide-react';

const statusConfig = {
  reported: {
    label: 'Reported',
    bg: 'bg-amber-100/80 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
    icon: AlertCircle,
  },
  assigned: {
    label: 'Assigned',
    bg: 'bg-sky-100/80 text-sky-900 border-sky-300',
    dot: 'bg-sky-500',
    icon: UserCheck,
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-purple-100 text-purple-950 border-purple-300 shadow-xs shadow-purple-500/10',
    dot: 'bg-purple-600 animate-ping',
    icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-100/80 text-emerald-950 border-emerald-300',
    dot: 'bg-emerald-600',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-100/80 text-rose-950 border-rose-300',
    dot: 'bg-rose-500',
    icon: XCircle,
  },
};

export default function StatusBadge({ status, size = 'md', showIcon = true }) {
  const config = statusConfig[status] || {
    label: status ? status.replace('_', ' ') : 'Unknown',
    bg: 'bg-purple-100/60 text-purple-900 border-purple-200',
    dot: 'bg-purple-400',
    icon: AlertCircle,
  };

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold border rounded-full transition-colors ${config.bg} ${
        isSm ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
