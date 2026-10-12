"use client";
// One product in the ranked table: the main row, plus an expandable row where Kavya reviews and edits the message.
import { useState } from "react";
import { AI_TOP_N } from "@/lib/config";
import { STATUSES, type Status } from "@/lib/status";
import type { ResultRow as Row } from "@/lib/types";

const STATUS_STYLE: Record<Status, string> = {
  new: "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
  contacted: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  replied: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  skip: "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400",
};

type Props = {
  row: Row;
  message: string; // current (possibly edited) message text, kept in the parent so CSV export matches
  onMessageChange: (id: string, text: string) => void;
  onStatusChange: (id: string, status: Status) => void;
};

export default function ResultRow({ row, message, onMessageChange, onStatusChange }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dimmed = row.status === "skip";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (insecure page or permissions): select the text so Cmd+C works.
      document.getElementById(`msg-${row.id}`)?.focus();
      (document.getElementById(`msg-${row.id}`) as HTMLTextAreaElement | null)?.select();
    }
  }

  return (
    <>
      <tr className={`align-top border-t border-zinc-200 dark:border-zinc-800 ${dimmed ? "opacity-50" : ""}`}>
        <td className="px-3 py-4 text-sm font-semibold tabular-nums text-zinc-500">{row.rank}</td>

        <td className="px-3 py-4 min-w-56">
          <a href={row.productHuntUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
            {row.name}
          </a>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{row.ai?.oneLiner ?? row.tagline}</p>
        </td>

        <td className="px-3 py-4 min-w-40 text-sm">
          {row.founder ? (
            <>
              {row.founder.profileUrl ? (
                <a href={row.founder.profileUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {row.founder.name}
                </a>
              ) : (
                <span className="font-medium">{row.founder.name}</span>
              )}
              {row.founder.headline && <p className="mt-0.5 text-xs text-zinc-500">{row.founder.headline}</p>}
            </>
          ) : (
            <a href={row.productHuntUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:underline">
              Not public: see ProductHunt page
            </a>
          )}
        </td>

        <td className="px-3 py-4 text-sm tabular-nums">
          <span className="font-semibold">{row.votes}</span>
          <p className="text-xs text-zinc-500">{row.makerReplies} maker replies</p>
        </td>

        <td className="px-3 py-4 text-sm whitespace-nowrap">
          <span className="tabular-nums">Day {row.daysSinceLaunch}</span>
          {row.urgent && (
            <span
              title="Launched 5 or more days ago: the 7-day outreach window is closing"
              className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              Urgent
            </span>
          )}
        </td>

        <td className="px-3 py-4 min-w-64 max-w-80 text-sm">
          {row.ai ? (
            row.ai.angle
          ) : row.rank <= AI_TOP_N ? (
            <span className="text-amber-700 dark:text-amber-300">Draft unavailable: click Find partners again</span>
          ) : (
            <span className="text-zinc-400">No draft (only the top {AI_TOP_N} get one)</span>
          )}
        </td>

        <td className="px-3 py-4 whitespace-nowrap">
          <label className="sr-only" htmlFor={`status-${row.id}`}>Outreach status for {row.name}</label>
          <select
            id={`status-${row.id}`}
            value={row.status}
            onChange={(e) => onStatusChange(row.id, e.target.value as Status)}
            className={`rounded-md border px-2 py-1 text-sm ${STATUS_STYLE[row.status]}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          {row.ai && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-2 block text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
            >
              {open ? "Hide message" : "Review message"}
            </button>
          )}
        </td>
      </tr>

      {open && row.ai && (
        <tr className="bg-zinc-50 dark:bg-zinc-900/50">
          <td />
          <td colSpan={6} className="px-3 pb-5 pt-1">
            <label htmlFor={`msg-${row.id}`} className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Draft for {row.name}: edit it, then copy and send it yourself
            </label>
            <textarea
              id={`msg-${row.id}`}
              value={message}
              onChange={(e) => onMessageChange(row.id, e.target.value)}
              rows={9}
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white p-3 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {copied ? "Copied" : "Copy message"}
              </button>
              <span aria-live="polite" className="text-xs text-zinc-500">
                {copied ? "Paste it into LinkedIn, X or email." : "Nothing is sent automatically."}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
