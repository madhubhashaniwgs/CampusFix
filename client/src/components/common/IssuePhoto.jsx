import { useState } from 'react';
import { ImageOff, Zap, Droplets, Monitor, Armchair, Wrench, Search } from 'lucide-react';

const CATEGORY_META = {
  electrical: {
    icon: Zap,
    label: 'Electrical',
    color: 'text-amber-700 bg-amber-100 border-amber-300',
    ring: 'ring-amber-400/30',
  },
  plumbing: {
    icon: Droplets,
    label: 'Plumbing',
    color: 'text-cyan-700 bg-cyan-100 border-cyan-300',
    ring: 'ring-cyan-400/30',
  },
  it: {
    icon: Monitor,
    label: 'IT & Tech',
    color: 'text-indigo-700 bg-indigo-100 border-indigo-300',
    ring: 'ring-indigo-400/30',
  },
  furniture: {
    icon: Armchair,
    label: 'Furniture',
    color: 'text-emerald-700 bg-emerald-100 border-emerald-300',
    ring: 'ring-emerald-400/30',
  },
  other: {
    icon: Wrench,
    label: 'Facility / General',
    color: 'text-purple-700 bg-purple-100 border-purple-300',
    ring: 'ring-purple-400/30',
  },
};

/**
 * Universal Issue Photo / Placeholder Component
 * Automatically falls back to high-res SVG placeholder if issue has no photo or fails to load.
 */
export default function IssuePhoto({
  src,
  alt = 'Facility issue photo',
  category = 'other',
  ticketId,
  variant = 'banner', // 'banner' | 'card' | 'thumbnail' | 'detail'
  className = '',
  onClick,
  showInspectHint = false,
}) {
  const [hasError, setHasError] = useState(false);
  const normalizedCat = (category || 'other').toLowerCase();
  const catInfo = CATEGORY_META[normalizedCat] || CATEGORY_META.other;
  const CategoryIcon = catInfo.icon;

  const hasValidPhoto = Boolean(src && !hasError);

  // 1. Compact Table Thumbnail (32px to 44px)
  if (variant === 'thumbnail') {
    if (hasValidPhoto) {
      return (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className={`w-9 h-9 rounded-lg object-cover border border-purple-200/80 shadow-xs flex-shrink-0 ${className}`}
        />
      );
    }
    return (
      <div
        className={`w-9 h-9 rounded-lg bg-purple-100/90 border border-purple-200/90 flex items-center justify-center text-purple-700 flex-shrink-0 relative overflow-hidden group ${className}`}
        title="No photo submitted"
      >
        <CategoryIcon className="w-4 h-4 opacity-80" />
      </div>
    );
  }

  // 2. Full Issue Details Page Photo Card
  if (variant === 'detail') {
    if (hasValidPhoto) {
      return (
        <div
          onClick={onClick}
          className={`relative rounded-2xl overflow-hidden border border-purple-200 bg-purple-950/20 group cursor-pointer ${className}`}
        >
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-56 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
            <Search className="w-4 h-4" /> Click to Zoom / Inspect
          </div>
        </div>
      );
    }

    // High quality placeholder for detail view
    return (
      <div
        className={`relative rounded-2xl overflow-hidden border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-purple-100/60 p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-3 ${className}`}
      >
        <div className="relative w-full max-w-[340px] aspect-[16/9] rounded-xl overflow-hidden border border-purple-200/70 shadow-sm">
          <img
            src="/placeholder-issue.svg"
            alt="No photo submitted"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
            <ImageOff className="w-3.5 h-3.5 text-purple-600" /> No Photo Attached
          </span>
          <p className="text-xs text-purple-900/70 mt-1.5 max-w-xs font-medium">
            This issue was submitted without a photo. Technicians can verify and inspect the
            location on site.
          </p>
        </div>
      </div>
    );
  }

  // 3. Grid Card Banner (default)
  if (hasValidPhoto) {
    return (
      <div
        className={`relative h-44 w-full bg-purple-950/20 overflow-hidden border-b border-purple-200/80 ${className}`}
      >
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/60 via-transparent to-black/20" />
      </div>
    );
  }

  // Fallback banner for grid cards when no photo was submitted
  return (
    <div
      className={`relative h-44 w-full bg-gradient-to-br from-purple-100/80 via-white to-purple-50 overflow-hidden border-b border-purple-200/80 flex items-center justify-center ${className}`}
    >
      <img
        src="/placeholder-issue.svg"
        alt="No photo submitted"
        className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-purple-950/50 via-transparent to-purple-950/10 pointer-events-none" />

      {/* Subtle indicator pill */}
      <div className="absolute bottom-3 right-3 bg-purple-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20 flex items-center gap-1 pointer-events-none">
        <ImageOff className="w-3 h-3 text-purple-300" />
        <span>No Photo</span>
      </div>
    </div>
  );
}
