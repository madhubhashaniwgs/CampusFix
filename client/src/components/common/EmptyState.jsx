import { SearchX, PlusCircle, RefreshCw } from 'lucide-react';

export default function EmptyState({
  icon: Icon = SearchX,
  title = 'No issues found',
  description = 'No results match your current search or filter criteria.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center purple-card rounded-3xl border border-purple-200 max-w-xl mx-auto my-8 animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 mb-4 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-purple-950 mb-1">{title}</h3>
      <p className="text-sm text-purple-900/70 max-w-sm mb-6 leading-relaxed">{description}</p>

      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            {actionLabel}
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-100/80 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
