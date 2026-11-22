import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  X,
  Zap,
  Droplets,
  Monitor,
  Armchair,
  Wrench,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MapPin,
  ShieldCheck,
  Eye,
} from 'lucide-react';

import AppLayout from '../../components/layouts/AppLayout';
import ImageModal from '../../components/common/ImageModal';
import { createIssue } from '../../services/issueService';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = [
  {
    id: 'electrical',
    label: 'Electrical',
    desc: 'Lighting, sockets, power, fans',
    icon: Zap,
    color: 'text-amber-900 bg-amber-100/90 border-amber-300',
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    desc: 'Leaks, faucets, drainage, restroom',
    icon: Droplets,
    color: 'text-cyan-900 bg-cyan-100/90 border-cyan-300',
  },
  {
    id: 'it',
    label: 'IT & Equipment',
    desc: 'Projectors, Wi-Fi, lab PCs, AV',
    icon: Monitor,
    color: 'text-indigo-900 bg-indigo-100/90 border-indigo-300',
  },
  {
    id: 'furniture',
    label: 'Furniture',
    desc: 'Desks, chairs, whiteboards, doors',
    icon: Armchair,
    color: 'text-emerald-900 bg-emerald-100/90 border-emerald-300',
  },
  {
    id: 'other',
    label: 'General / Facility',
    desc: 'HVAC, windows, locks, paint',
    icon: Wrench,
    color: 'text-purple-900 bg-purple-100/90 border-purple-300',
  },
];

const PRIORITIES = [
  {
    id: 'low',
    label: 'Low',
    desc: 'Minor cosmetic or non-blocking issues',
    color: 'border-purple-200 hover:border-purple-300',
  },
  {
    id: 'medium',
    label: 'Medium',
    desc: 'Standard maintenance needed soon',
    color: 'border-purple-300 hover:border-purple-400',
  },
  {
    id: 'high',
    label: 'High',
    desc: 'Impacting classes or room function',
    color: 'border-orange-300 hover:border-orange-400',
  },
  {
    id: 'urgent',
    label: 'Urgent',
    desc: 'Safety hazard or total breakdown',
    color: 'border-rose-300 hover:border-rose-400',
    isUrgent: true,
  },
];

const QUICK_LOCATIONS = [
  'Library 2nd Floor',
  'Engineering Block B - 102',
  'Science Lab 204',
  'Hostel Wing A',
  'Central Cafeteria',
  'Main Auditorium',
  'Computer Center Lab 3',
];

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electrical',
    location: '',
    priority: 'medium',
  });

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoInfo, setPhotoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError('Please choose a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

        setPhoto(dataUrl);
        setPhotoPreview(dataUrl);
        setPhotoInfo({
          name: file.name,
          dimensions: `${canvas.width} x ${canvas.height} px`,
          size: `${Math.round((dataUrl.length * 0.75) / 1024)} KB`,
        });
        success('Photo attached & optimized successfully!');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
    setPhotoInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toastError('Please enter an issue title.');
      return;
    }

    if (!formData.location.trim()) {
      toastError('Please enter the location of the issue.');
      return;
    }

    if (!formData.description.trim()) {
      toastError('Please describe the issue.');
      return;
    }

    try {
      setLoading(true);
      const res = await createIssue({ ...formData, photo });
      success(`Ticket ${res.data?.ticketId || ''} created successfully!`, 'Issue Reported');
      navigate('/student/my-issues', { replace: true });
    } catch (err) {
      toastError(
        err.response?.data?.message ||
          'Unable to submit your issue. Please check all fields and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout activeNav="report">
      <ImageModal
        isOpen={previewModalOpen}
        src={photoPreview}
        title="Photo Preview"
        onClose={() => setPreviewModalOpen(false)}
      />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            Report a Campus Issue
          </h1>
          <p className="text-sm text-purple-900/70 mt-1">
            Provide details below so our facility staff can quickly diagnose and fix the problem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="purple-card rounded-3xl p-6 sm:p-8 space-y-7">
            {/* 1. Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="title"
                  className="text-xs font-black uppercase tracking-wider text-purple-950"
                >
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-purple-700 font-mono font-bold">
                  {formData.title.length}/120
                </span>
              </div>
              <input
                id="title"
                name="title"
                type="text"
                maxLength={120}
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Water leak under sink in Science Lab 204"
                className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-white/95 text-sm font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
              />
            </div>

            {/* 2. Category Selection Cards */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-2.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, category: cat.id }))}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-100/90 ring-2 ring-purple-600/20 shadow-xs'
                          : 'border-purple-200 hover:border-purple-300 bg-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className={`p-2 rounded-xl border ${cat.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-purple-700" />}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-purple-950">{cat.label}</p>
                        <p className="text-[10px] text-purple-800/80 line-clamp-1 mt-0.5">
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Location with Quick Preset Chips */}
            <div>
              <label
                htmlFor="location"
                className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-2"
              >
                Location on Campus <span className="text-rose-500">*</span>
              </label>
              <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="location"
                  name="location"
                  type="text"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Building name, floor, room number or outdoor landmark"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-purple-200 bg-white/95 text-sm font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400"
                />
              </div>

              {/* Quick suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-purple-700 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" /> Suggestions:
                </span>
                {QUICK_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, location: loc }))}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-100/80 hover:bg-purple-200 text-purple-900 border border-purple-200 transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Priority Selection */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-purple-950 mb-2.5">
                Urgency & Priority <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRIORITIES.map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, priority: p.id }))}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? p.isUrgent
                            ? 'border-rose-500 bg-rose-100/80 ring-2 ring-rose-500/20'
                            : 'border-purple-600 bg-purple-100/90 ring-2 ring-purple-600/20'
                          : `${p.color} bg-white/80`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-black uppercase tracking-wider ${
                            p.isUrgent ? 'text-rose-800 flex items-center gap-1' : 'text-purple-950'
                          }`}
                        >
                          {p.isUrgent && <Flame className="w-3 h-3 text-rose-600" />}
                          {p.label}
                        </span>
                        {isSelected && (
                          <div
                            className={`w-2 h-2 rounded-full ${p.isUrgent ? 'bg-rose-600' : 'bg-purple-700'}`}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-purple-800/80 font-medium leading-tight">
                        {p.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {formData.priority === 'urgent' && (
                <div className="mt-2.5 p-3 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-950 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Urgent Priority Selected:</strong> This will be flagged immediately to
                    facility dispatch. Please use only for safety hazards, sparking wires, major
                    water leaks, or active security risks.
                  </div>
                </div>
              )}
            </div>

            {/* 5. Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="description"
                  className="text-xs font-black uppercase tracking-wider text-purple-950"
                >
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-purple-700 font-mono font-bold">
                  {formData.description.length}/2000
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={2000}
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe what is broken, what symptoms you see, and any relevant steps to find the equipment..."
                className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-white/95 text-sm font-medium text-purple-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none transition-all placeholder:text-purple-400 resize-y"
              />
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-purple-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/student/dashboard')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-purple-800 hover:bg-purple-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-purple-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>Submitting Ticket...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Maintenance Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Photo Upload & Information Guide */}
        <div className="space-y-6">
          {/* Photo Upload Card */}
          <div className="purple-card rounded-3xl p-6">
            <h3 className="text-sm font-extrabold text-purple-950 mb-1 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-purple-700" />
              Attach Photo Evidence
            </h3>
            <p className="text-xs text-purple-900/70 mb-4 leading-relaxed">
              Photos help technicians diagnose issues and bring the right replacement parts on the
              first visit.
            </p>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-purple-200 bg-purple-950/20 group">
                <img src={photoPreview} alt="Issue preview" className="w-full h-52 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="p-2 rounded-xl bg-white text-purple-950 hover:bg-purple-50 text-xs font-bold shadow-md flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold shadow-md flex items-center gap-1 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

                {photoInfo && (
                  <div className="p-3 bg-purple-50 border-t border-purple-200 text-[11px] text-purple-900 flex items-center justify-between font-medium">
                    <span className="truncate max-w-[150px]">{photoInfo.name}</span>
                    <span className="font-mono text-purple-600 font-bold">{photoInfo.size}</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-300 hover:border-purple-600 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-purple-50/50 hover:bg-purple-100/50 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-purple-950 mb-1">
                  Click or drag photo here
                </p>
                <p className="text-[11px] text-purple-700/70 font-medium">
                  PNG, JPG, WebP &bull; Auto-optimized for instant upload
                </p>
              </div>
            )}
          </div>

          {/* Issue Resolution Process Card */}
          <div className="purple-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>CampusFix Ticket Workflow</span>
            </div>

            <ol className="relative border-l-2 border-purple-200 ml-2 space-y-4 text-xs text-purple-900/80 font-medium">
              <li className="ml-4">
                <span className="absolute -left-[9px] mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-purple-700" />
                <strong className="text-purple-950 block font-bold">1. Ticket Created</strong>
                Assigned a unique tracking ID instantly.
              </li>
              <li className="ml-4">
                <span className="absolute -left-[9px] mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-purple-300" />
                <strong className="text-purple-950 block font-bold">2. Staff Assignment</strong>
                Routed to the specialist team on duty.
              </li>
              <li className="ml-4">
                <span className="absolute -left-[9px] mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-purple-300" />
                <strong className="text-purple-950 block font-bold">3. Repair In Progress</strong>
                Technician arrives on site to fix the issue.
              </li>
              <li className="ml-4">
                <span className="absolute -left-[9px] mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-purple-300" />
                <strong className="text-purple-950 block font-bold">4. Resolved & Logged</strong>
                Confirmation and status recorded in your history.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
