import { useState } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, XCircle, Send, Sparkles } from 'lucide-react';
import { updateIssueStatus } from '../../services/issueService';
import { useToast } from '../../context/ToastContext';

const QUICK_NOTES = [
  'Inspected on site, maintenance initiated.',
  'Awaiting parts/replacement supplies.',
  'Work currently in progress with technician.',
  'Issue resolved and functionality verified.',
  'Temporary fix applied; final inspection scheduled.',
];

export default function QuickStatusModal({ isOpen, issue, onClose, onUpdated }) {
  const { success, error: toastError } = useToast();
  const [status, setStatus] = useState(issue?.status || 'in_progress');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !issue) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateIssueStatus(issue._id, status, note.trim());
      success(`Status updated to ${status.replace('_', ' ')} successfully!`);
      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'assigned', label: 'Assigned', desc: 'Technician dispatched', icon: Clock, color: 'text-sky-800 bg-sky-100 border-sky-300' },
    { value: 'in_progress', label: 'In Progress', desc: 'Active repair underway', icon: AlertCircle, color: 'text-purple-800 bg-purple-100 border-purple-300' },
    { value: 'resolved', label: 'Resolved', desc: 'Fix tested and complete', icon: CheckCircle2, color: 'text-emerald-800 bg-emerald-100 border-emerald-300' },
    { value: 'rejected', label: 'Rejected', desc: 'Duplicate or not actionable', icon: XCircle, color: 'text-rose-800 bg-rose-100 border-rose-300' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden text-purple-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-purple-50/80">
          <div>
            <span className="text-xs font-mono font-black text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
              {issue.ticketId}
            </span>
            <h3 className="text-base font-extrabold text-purple-950 mt-1">Update Issue Status</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Selection Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-900/70 mb-2">
              Select New Status
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-100/70 shadow-sm ring-2 ring-purple-500/30'
                        : 'border-purple-200 hover:border-purple-300 bg-purple-50/40'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border ${opt.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-950">{opt.label}</p>
                      <p className="text-[11px] text-purple-700/70">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Note Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-900/70">
                Resolution or Progress Note
              </label>
              <span className="text-[11px] text-purple-700 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick suggestions
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_NOTES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNote(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold border border-purple-200 transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide context or details about this update..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-purple-200 bg-purple-50/30 text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-purple-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/25 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>Updating...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Save & Update
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
