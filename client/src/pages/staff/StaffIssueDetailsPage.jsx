import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  UserRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import CategoryBadge from '../../components/common/CategoryBadge';
import ImageModal from '../../components/common/ImageModal';
import IssuePhoto from '../../components/common/IssuePhoto';
import { getIssueById, updateIssueStatus } from '../../services/issueService';
import { useToast } from '../../context/ToastContext';
import { useRealtimeRefresh } from '../../hooks/useRealtime';

const STATUS_STEPS = [
  { key: 'reported', label: 'Reported' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const QUICK_NOTES = [
  'Inspected on site, maintenance initiated.',
  'Awaiting parts/replacement supplies.',
  'Work currently in progress with technician.',
  'Issue resolved and functionality verified.',
];

export default function StaffIssueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getIssueById(id);
      setIssue(res.data);
      setSelectedStatus(res.data?.status || 'in_progress');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load issue details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  useRealtimeRefresh(
    ['issue:created', 'issue:assigned', 'issue:status_changed', 'issue:updated'],
    fetchIssue
  );

  const handleStatusUpdate = async (statusToSet = selectedStatus) => {
    try {
      setUpdating(true);
      await updateIssueStatus(id, statusToSet, note.trim());
      success(`Status updated to ${statusToSet.replace('_', ' ')} successfully!`);
      setNote('');
      await fetchIssue();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update issue status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyTicket = async () => {
    if (!issue?.ticketId) return;
    try {
      await navigator.clipboard.writeText(issue.ticketId);
      setCopied(true);
      success('Ticket ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError('Could not copy to clipboard.');
    }
  };

  const getStepStatus = (stepKey) => {
    if (!issue) return 'upcoming';
    const order = ['reported', 'assigned', 'in_progress', 'resolved'];
    const currentIdx = order.indexOf(issue.status);
    const stepIdx = order.indexOf(stepKey);

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <AppLayout activeNav="issues">
      <ImageModal
        isOpen={photoModalOpen}
        src={issue?.photo}
        title={`${issue?.ticketId || 'Issue'} - Photo Inspection`}
        onClose={() => setPhotoModalOpen(false)}
      />

      {/* Navigation Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold text-purple-700/80 mb-6">
        <button
          onClick={() => navigate('/staff/issues')}
          className="hover:text-purple-950 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Assigned Issues
        </button>
        <span>/</span>
        <span className="font-mono text-purple-900 font-black">{issue?.ticketId || 'Details'}</span>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-purple-900/70 font-semibold">Loading ticket details...</p>
        </div>
      ) : error || !issue ? (
        <div className="purple-card rounded-3xl border border-rose-200 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-purple-950 mb-1">Issue Not Found</h2>
          <p className="text-sm text-purple-900/70 mb-4">
            {error || 'This work order could not be found.'}
          </p>
          <button
            onClick={() => navigate('/staff/issues')}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold rounded-xl transition-colors"
          >
            Back to Assigned Issues
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="purple-card rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-purple-100">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleCopyTicket}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 border border-purple-300 font-mono text-xs font-black text-purple-900 transition-colors group"
                    title="Copy Ticket ID"
                  >
                    <span>{issue.ticketId}</span>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-purple-500 group-hover:text-purple-800" />
                    )}
                  </button>

                  <CategoryBadge category={issue.category} />
                  <PriorityBadge priority={issue.priority} />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">
                  {issue.title}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={issue.status} size="lg" />
              </div>
            </div>

            {/* Visual 4-Step Progress */}
            <div className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATUS_STEPS.map((step, idx) => {
                  const state = getStepStatus(step.key);
                  const isDone = state === 'completed';
                  const isCurrent = state === 'current';

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : isCurrent
                              ? 'bg-purple-700 text-white ring-4 ring-purple-200 shadow-md shadow-purple-600/25 animate-pulse'
                              : 'bg-purple-100/70 text-purple-400 border border-purple-200'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span>{idx + 1}</span>}
                      </div>
                      <p
                        className={`text-xs font-black ${isCurrent ? 'text-purple-900' : isDone ? 'text-purple-950' : 'text-purple-400'}`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Action Section: Status Controller & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Status Update Controls & Notes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Technician Action Panel */}
              <div className="purple-card rounded-3xl p-6 sm:p-7 border border-purple-300">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-700" />
                    <h3 className="text-base font-black text-purple-950">
                      Update Work Order Status
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                    Live Action
                  </span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {[
                    { id: 'assigned', label: 'Assigned', desc: 'Acknowledged' },
                    { id: 'in_progress', label: 'In Progress', desc: 'Active repair' },
                    { id: 'resolved', label: 'Resolved', desc: 'Finished & tested' },
                  ].map((s) => {
                    const isSelected = selectedStatus === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStatus(s.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-100/90 ring-2 ring-purple-600/20 shadow-xs'
                            : 'border-purple-200 hover:border-purple-300 bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-purple-950">{s.label}</span>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-purple-700" />}
                        </div>
                        <p className="text-[11px] text-purple-700/80 font-medium">{s.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Quick note presets */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="font-bold text-purple-950">
                      Add Maintenance Note (Optional)
                    </span>
                    <span className="text-purple-700 font-semibold">Quick presets:</span>
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
                    placeholder="Describe what was repaired, replacement parts used, or testing performed..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-purple-200 bg-white/90 text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400 resize-none font-medium"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleStatusUpdate(selectedStatus)}
                    disabled={updating}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {updating ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Apply Status Update
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Description Card */}
              <div className="purple-card rounded-3xl p-6 sm:p-7">
                <h3 className="text-sm font-black uppercase tracking-wider text-purple-950 mb-3">
                  Reported Issue Description
                </h3>
                <p className="text-sm text-purple-950 whitespace-pre-wrap leading-relaxed font-medium">
                  {issue.description}
                </p>
              </div>

              {/* Audit / Status History */}
              <div className="purple-card rounded-3xl p-6 sm:p-7">
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare className="w-4 h-4 text-purple-700" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-purple-950">
                    Activity & Audit Log
                  </h3>
                </div>

                <div className="relative border-l-2 border-purple-200 ml-4 space-y-6 pl-6">
                  <div className="relative">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-purple-700 shadow-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-950">Issue Reported</span>
                        <span className="text-[11px] text-purple-700">
                          {new Date(issue.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-purple-800/80 font-medium mt-0.5">
                        Reported by {issue.reportedBy?.fullName || 'Student'}
                      </p>
                    </div>
                  </div>

                  {issue.statusHistory?.map((hist, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={hist.status} size="sm" />
                          <span className="text-[11px] text-purple-700">
                            {new Date(hist.updatedAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {hist.note && (
                          <div className="mt-2 p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-950 font-medium">
                            <span className="font-bold text-purple-900">Note: </span>
                            {hist.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Location & Reporter Meta */}
            <div className="space-y-6">
              {/* Attached Photo Card (with Placeholder fallback) */}
              <div className="purple-card rounded-3xl p-6 overflow-hidden">
                <h3 className="text-sm font-extrabold text-purple-950 mb-3 flex items-center justify-between">
                  <span>Attached Photo</span>
                  {issue.photo && (
                    <button
                      onClick={() => setPhotoModalOpen(true)}
                      className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Inspect
                    </button>
                  )}
                </h3>
                <IssuePhoto
                  src={issue.photo}
                  alt={issue.title}
                  category={issue.category}
                  variant="detail"
                  onClick={() => issue.photo && setPhotoModalOpen(true)}
                />
              </div>

              <div className="purple-card rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-purple-950 pb-2 border-b border-purple-100">
                  Location & Contact Details
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-purple-700/80 block mb-1 font-bold">Campus Location</span>
                    <div className="flex items-center gap-2 font-black text-purple-950">
                      <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>{issue.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100">
                    <span className="text-purple-700/80 block mb-1 font-bold">Reported By</span>
                    <div className="flex items-center gap-2 font-black text-purple-950">
                      <UserRound className="w-4 h-4 text-purple-700 flex-shrink-0" />
                      <span>{issue.reportedBy?.fullName || 'Student'}</span>
                    </div>
                    {issue.reportedBy?.email && (
                      <span className="text-[11px] text-purple-700 pl-6 block font-medium">
                        {issue.reportedBy.email}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-purple-100">
                    <span className="text-purple-700/80 block mb-1 font-bold">Reported On</span>
                    <div className="flex items-center gap-2 font-black text-purple-950">
                      <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span>
                        {new Date(issue.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
