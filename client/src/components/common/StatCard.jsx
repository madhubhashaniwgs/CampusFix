import { ArrowUpRight } from 'lucide-react';

const colorStyles = {
  purple: {
    bg: 'from-purple-500/12 via-purple-500/5 to-transparent',
    border: 'border-purple-300 hover:border-purple-500',
    iconBg:
      'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white shadow-md shadow-purple-600/25',
    text: 'text-purple-800',
  },
  amber: {
    bg: 'from-amber-500/12 via-amber-500/5 to-transparent',
    border: 'border-amber-300 hover:border-amber-500',
    iconBg:
      'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-md shadow-amber-600/25',
    text: 'text-amber-800',
  },
  sky: {
    bg: 'from-sky-500/12 via-sky-500/5 to-transparent',
    border: 'border-sky-300 hover:border-sky-500',
    iconBg: 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/25',
    text: 'text-sky-800',
  },
  indigo: {
    bg: 'from-indigo-500/12 via-indigo-500/5 to-transparent',
    border: 'border-indigo-300 hover:border-indigo-500',
    iconBg:
      'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25',
    text: 'text-indigo-800',
  },
  emerald: {
    bg: 'from-emerald-500/12 via-emerald-500/5 to-transparent',
    border: 'border-emerald-300 hover:border-emerald-500',
    iconBg:
      'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25',
    text: 'text-emerald-800',
  },
  rose: {
    bg: 'from-rose-500/12 via-rose-500/5 to-transparent',
    border: 'border-rose-300 hover:border-rose-500',
    iconBg: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25',
    text: 'text-rose-800',
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'purple',
  subtitle,
  onClick,
  active = false,
}) {
  const styles = colorStyles[color] || colorStyles.purple;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl purple-card p-5 border ${styles.border} transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      } ${active ? 'ring-2 ring-purple-600 border-transparent shadow-lg shadow-purple-600/20' : ''}`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.bg} opacity-50 transition-opacity group-hover:opacity-100 pointer-events-none`}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-900/70 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-purple-950 tracking-tight">{value}</h3>
            {subtitle && (
              <span className="text-xs font-semibold text-purple-700/80">{subtitle}</span>
            )}
          </div>
        </div>

        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${styles.iconBg}`}
        >
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>

      {onClick && (
        <div className="relative mt-3 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-900 transition-colors">
          <span>Click to explore</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      )}
    </div>
  );
}
