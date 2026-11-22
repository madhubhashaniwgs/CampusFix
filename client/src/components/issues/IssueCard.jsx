import { useState } from 'react';
import { MapPin, Calendar, UserRound, ArrowRight, Image as ImageIcon, ImageOff } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import CategoryBadge from '../common/CategoryBadge';

export default function IssueCard({ issue, onClick, onPhotoClick }) {
  const [imgError, setImgError] = useState(false);
  const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const hasPhoto = Boolean(issue.photo && !imgError);

  return (
    <div
      onClick={onClick}
      className="group relative purple-card rounded-2xl overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Top Banner / Image (with Placeholder when no photo submitted) */}
      <div className="relative h-32 w-full bg-purple-950/20 overflow-hidden border-b border-purple-200/80">
        {hasPhoto ? (
          <>
            <img
              src={issue.photo}
              alt={issue.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-950/60 via-transparent to-black/20" />
          </>
        ) : (
          <>
            <img
              src="/placeholder-issue.svg"
              alt="No photo submitted"
              className="w-full h-full object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-950/60 via-transparent to-purple-950/20" />
            
            {/* Subtle 'No Photo' tag on bottom right */}
            <div className="absolute bottom-3 right-3 bg-purple-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20 flex items-center gap-1 shadow-sm">
              <ImageOff className="w-3 h-3 text-purple-300" />
              <span>No Photo</span>
            </div>
          </>
        )}

        {/* Ticket ID badge on image */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-purple-900 font-mono text-xs font-black px-2.5 py-1 rounded-lg border border-purple-200 shadow-md">
          {issue.ticketId}
        </div>

        {/* Priority pill */}
        <div className="absolute top-3 right-3">
          <PriorityBadge priority={issue.priority} size="sm" />
        </div>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <CategoryBadge category={issue.category} size="sm" />
        </div>

        {/* Quick zoom button (for issues with photo) */}
        {hasPhoto && onPhotoClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPhotoClick(issue.photo, `${issue.ticketId} - ${issue.title}`);
            }}
            className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white hover:bg-black transition-all opacity-0 group-hover:opacity-100 border border-white/20"
            title="Inspect Photo"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-purple-950 group-hover:text-purple-700 transition-colors line-clamp-1 mb-1.5">
            {issue.title}
          </h4>
          <p className="text-xs text-purple-900/70 line-clamp-2 leading-relaxed">
            {issue.description}
          </p>
        </div>

        {/* Location & Metadata */}
        <div className="space-y-2 pt-2 border-t border-purple-100 text-xs text-purple-900/70">
          <div className="flex items-center gap-1.5 text-purple-950 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
            <span className="truncate">{issue.location}</span>
          </div>

          <div className="flex items-center justify-between text-purple-900/70">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>{formattedDate}</span>
            </div>

            {issue.assignedTo && (
              <div className="flex items-center gap-1 text-purple-900 bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded-md text-[11px] font-bold truncate max-w-[130px]">
                <UserRound className="w-3 h-3 text-purple-600 flex-shrink-0" />
                <span className="truncate">{issue.assignedTo.fullName || 'Staff'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-purple-100 flex items-center justify-between">
          <StatusBadge status={issue.status} size="sm" />

          <span className="text-xs font-bold text-purple-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Details
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
