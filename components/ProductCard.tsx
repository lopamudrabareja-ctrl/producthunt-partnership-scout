"use client";
// One launch as a card: who and what at the top, the numbers, the partnership angle, then the human step
// (status + review the message). Replaces the old 7-column table row.
import { useState } from "react";
import { AI_TOP_N, CATEGORIES, type CategoryId } from "@/lib/config";
import { STATUSES, type Status } from "@/lib/status";
import type { ResultRow } from "@/lib/types";
import LaunchWindow from "./LaunchWindow";

const STATUS_STYLE: Record<Status, { label: string; dot: string; box: string }> = {
  new: { label: "New", dot: "bg-faint", box: "border-line bg-surface text-ink" },
  contacted: { label: "Contacted", dot: "bg-accent", box: "border-accent/30 bg-accent-soft text-accent-strong" },
  replied: { label: "Replied", dot: "bg-ok", box: "border-ok/30 bg-ok-soft text-ok" },
  skip: { label: "Skip", dot: "bg-faint", box: "border-line bg-wash text-muted" },
};

function ArrowUp() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
    </svg>
  );
}
function Chat() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
    </svg>
  );
}

type Props = {
  row: ResultRow;
  index: number;
  message: string; // current (possibly edited) message, kept in the parent so CSV export matches
  onMessageChange: (id: string, text: string) => void;
  onStatusChange: (id: string, status: Status) => void;
};

export default function ProductCard({ row, index, message, onMessageChange, onStatusChange }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const skipped = row.status === "skip";
  const topPick = row.rank <= 3;
  const st = STATUS_STYLE[row.status];

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked: select the text so Cmd+C still works.
      const box = document.getElementById(`msg-${row.id}`) as HTMLTextAreaElement | null;
      box?.focus();
      box?.select();
    }
  }

  const categories = row.categories
    .filter((c): c is CategoryId => c in CATEGORIES)
    .map((c) => CATEGORIES[c].label);

  return (
    <article
      className={`rise rounded-2xl border bg-surface p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(24,24,27,0.18)] sm:p-6 ${
        row.urgent ? "border-urgent-line" : "border-line"
      } ${skipped ? "opacity-60" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {/* Header: rank, name, one-liner, and the launch window */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="w-8 shrink-0 text-2xl font-semibold tabular-nums leading-none text-faint">{row.rank}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold leading-snug tracking-tight">
                <a href={row.productHuntUrl} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                  {row.name}
                </a>
              </h2>
              {topPick && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-strong">
                  Top pick
                </span>
              )}
            </div>
            <p className="mt-1 max-w-prose text-[15px] leading-relaxed text-muted">{row.ai?.oneLiner ?? row.tagline}</p>
            {categories.length > 0 && <p className="mt-2 text-xs text-muted">{categories.join(" · ")}</p>}
          </div>
        </div>
        <LaunchWindow daysSinceLaunch={row.daysSinceLaunch} urgent={row.urgent} />
      </div>

      {/* Facts: numbers and founder */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
        <div className="flex items-center gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 font-semibold" title="Upvotes on ProductHunt">
            <ArrowUp />
            {row.votes}
            <span className="font-normal text-muted">upvotes</span>
          </span>
          <span className="flex items-center gap-1.5 font-semibold" title="Replies from the makers">
            <Chat />
            {row.makerReplies}
            <span className="font-normal text-muted">maker replies</span>
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          {row.founder ? (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong" aria-hidden>
                {row.founder.name.trim()[0]?.toUpperCase()}
              </span>
              <span className="min-w-0">
                {row.founder.profileUrl ? (
                  <a href={row.founder.profileUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-accent hover:underline">
                    {row.founder.name}
                  </a>
                ) : (
                  <span className="font-medium">{row.founder.name}</span>
                )}
                {row.founder.headline && <span className="ml-2 text-muted">{row.founder.headline}</span>}
              </span>
            </>
          ) : (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-faint text-xs text-muted" aria-hidden>
                ?
              </span>
              <span className="text-muted">
                Founder not public ·{" "}
                <a href={row.productHuntUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                  see ProductHunt page
                </a>
              </span>
            </>
          )}
        </div>
      </div>

      {/* The partnership angle */}
      <div className="mt-4 rounded-xl bg-wash px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Partnership angle</p>
        {row.ai ? (
          <p className="mt-1 text-[15px] leading-relaxed">{row.ai.angle}</p>
        ) : row.rank <= AI_TOP_N ? (
          <p className="mt-1 text-[15px] text-urgent">Draft unavailable right now. Click Find partners again to retry.</p>
        ) : (
          <p className="mt-1 text-[15px] text-muted">Only the top {AI_TOP_N} products get an AI draft.</p>
        )}
      </div>

      {/* The human step: status, and review the message */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={`status-${row.id}`} className="text-sm text-muted">
            Status
          </label>
          <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 ${st.box}`}>
            <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden />
            <select
              id={`status-${row.id}`}
              value={row.status}
              onChange={(e) => onStatusChange(row.id, e.target.value as Status)}
              className="h-9 cursor-pointer bg-transparent pr-1 text-sm font-medium focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_STYLE[s].label}
                </option>
              ))}
            </select>
          </span>
        </div>

        {row.ai && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={`panel-${row.id}`}
            className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            {open ? "Hide message" : "Review message"}
          </button>
        )}
      </div>

      {open && row.ai && (
        <div id={`panel-${row.id}`} className="mt-4 border-t border-line pt-4">
          <label htmlFor={`msg-${row.id}`} className="block text-sm font-medium">
            Draft for {row.name}
            <span className="ml-2 font-normal text-muted">Edit it, then copy and send it yourself.</span>
          </label>
          <textarea
            id={`msg-${row.id}`}
            value={message}
            onChange={(e) => onMessageChange(row.id, e.target.value)}
            rows={9}
            className="mt-2 w-full resize-y rounded-xl border border-line bg-surface p-4 text-[15px] leading-relaxed focus:border-accent"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copy}
              className="h-10 rounded-lg border border-accent bg-surface px-4 text-sm font-semibold text-accent-strong transition-colors hover:bg-accent-soft"
            >
              {copied ? "Copied" : "Copy message"}
            </button>
            <span aria-live="polite" className="text-sm text-muted">
              {copied ? "Paste it into LinkedIn, X or email." : "Nothing is ever sent automatically."}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
