"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const REASONS = ["Inappropriate text", "Offensive content", "Spam", "Other"];

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  contentType: "post" | "comment" | "user";
  contentId: string;
}

export function ReportSheet({ open, onClose, currentUserId, contentType, contentId }: ReportSheetProps) {
  const [status, setStatus] = useState<"loading" | "fresh" | "already" | "submitted">("loading");
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus("loading");
    setReason(null);
    const supabase = createClient();
    supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", currentUserId)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .maybeSingle()
      .then(({ data }) => setStatus(data ? "already" : "fresh"));
  }, [open, currentUserId, contentType, contentId]);

  async function submit() {
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("reports").upsert(
      {
        reporter_id: currentUserId,
        content_type: contentType,
        content_id: contentId,
        reason: contentType === "user" ? "Reported from profile" : reason,
      },
      { onConflict: "reporter_id,content_type,content_id" }
    );
    setSubmitting(false);
    setStatus("submitted");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "loading" && (
          <div className="py-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {(status === "already" || status === "submitted") && (
          <>
            <div className="flex items-center gap-2 font-semibold">
              <Flag className="w-4 h-4" />
              {status === "submitted" ? "Report submitted" : `You've reported this ${contentType}`}
            </div>
            <p className="text-sm text-muted-foreground">We&apos;ll look into it.</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              Close
            </button>
          </>
        )}

        {status === "fresh" && contentType === "user" && (
          <>
            <h2 className="font-bold">Report this user?</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll review this report and take action if it violates our Terms of Service.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Reporting…" : "Report"}
              </button>
            </div>
          </>
        )}

        {status === "fresh" && contentType !== "user" && (
          <>
            <h2 className="font-bold">Report this {contentType}</h2>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors cursor-pointer has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !reason}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
