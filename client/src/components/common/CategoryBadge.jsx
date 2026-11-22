import { Zap, Droplets, Monitor, Armchair, Wrench } from 'lucide-react';

const categoryConfig = {
  electrical: {
    label: 'Electrical',
    icon: Zap,
    color: 'text-amber-900 bg-amber-100/90 border-amber-300',
  },
  plumbing: {
    label: 'Plumbing',
    icon: Droplets,
    color: 'text-cyan-900 bg-cyan-100/90 border-cyan-300',
  },
  it: {
    label: 'IT & Tech',
    icon: Monitor,
    color: 'text-indigo-900 bg-indigo-100/90 border-indigo-300',
  },
  furniture: {
    label: 'Furniture',
    icon: Armchair,
    color: 'text-emerald-900 bg-emerald-100/90 border-emerald-300',
  },
  other: {
    label: 'General / Facility',
    icon: Wrench,
    color: 'text-purple-900 bg-purple-100/90 border-purple-300',
  },
};

export default function CategoryBadge({ category, size = 'md' }) {
  const key = (category || 'other').toLowerCase();
  const config = categoryConfig[key] || categoryConfig.other;
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold border rounded-lg ${config.color} ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm'
      }`}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
