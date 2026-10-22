"use client";

import { Flag } from "lucide-react";

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  onReport: () => void;
  reported: boolean;
  label: string;
}

export function ReportSheet({ open, onClose, onReport, reported, label }: ReportSheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border p-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onReport}
          disabled={reported}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <Flag className="w-4 h-4" />
          {reported ? "Reported" : `Report ${label}`}
        </button>
        <button
          onClick={onClose}
          className="w-full px-4 py-3.5 text-sm text-center text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
