import { Flame, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

const priorityConfig = {
  urgent: {
    label: 'Urgent',
    bg: 'bg-rose-100 text-rose-900 border-rose-300 shadow-xs shadow-rose-500/15',
    icon: Flame,
    iconColor: 'text-rose-600 animate-bounce',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-100 text-orange-950 border-orange-300',
    icon: ArrowUp,
    iconColor: 'text-orange-600',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-purple-100 text-purple-900 border-purple-300',
    icon: ArrowRight,
    iconColor: 'text-purple-600',
  },
  low: {
    label: 'Low',
    bg: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: ArrowDown,
    iconColor: 'text-slate-500',
  },
};

export default function PriorityBadge({ priority, size = 'md' }) {
  const key = (priority || 'medium').toLowerCase();
  const config = priorityConfig[key] || priorityConfig.medium;
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider border rounded-md ${config.bg} ${
        isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <Icon className={`${isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${config.iconColor}`} />
      <span>{config.label}</span>
    </span>
  );
}
