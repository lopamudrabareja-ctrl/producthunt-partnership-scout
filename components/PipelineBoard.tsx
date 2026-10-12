"use client";
// The pipeline as a board: one column per status. Moving a product = changing its status (saved to the database).
import { STATUSES, type Status } from "@/lib/status";
import { windowLabel } from "@/lib/format";
import type { ResultRow } from "@/lib/types";

const COLUMN: Record<Status, { label: string; hint: string; bar: string; dot: string }> = {
  new: { label: "New", hint: "Not contacted yet", bar: "bg-faint", dot: "bg-faint" },
  contacted: { label: "Contacted", hint: "Message sent", bar: "bg-accent", dot: "bg-accent" },
  replied: { label: "Replied", hint: "They answered", bar: "bg-ok", dot: "bg-ok" },
  skip: { label: "Skip", hint: "Not a fit", bar: "bg-line", dot: "bg-line" },
};

export default function PipelineBoard({ rows, onStatusChange }: { rows: ResultRow[]; onStatusChange: (id: string, s: Status) => void }) {
  const by = (s: Status) => rows.filter((r) => r.status === s);
  const total = rows.length || 1;

  return (
    <section aria-label="Pipeline board">
      {/* How the 20 launches are split across the pipeline */}
      <div className="rounded-3xl border border-line bg-surface p-5">
        <p className="text-sm font-medium">Where your launches stand</p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-wash" role="img" aria-label={STATUSES.map((s) => `${COLUMN[s].label} ${by(s).length}`).join(", ")}>
          {STATUSES.map((s) => (
            <span key={s} className={COLUMN[s].bar} style={{ width: `${(by(s).length / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {STATUSES.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${COLUMN[s].dot}`} aria-hidden />
              {COLUMN[s].label} <strong className="font-semibold tabular-nums text-ink">{by(s).length}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {STATUSES.map((s) => (
          <div key={s} className="min-w-[17rem] flex-1 snap-start rounded-3xl bg-wash/70 p-3 lg:min-w-0">
            <div className="flex items-baseline justify-between px-2 pb-2 pt-1">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${COLUMN[s].dot}`} aria-hidden />
                {COLUMN[s].label}
              </h3>
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">{by(s).length}</span>
            </div>
            <div className="space-y-2.5">
              {by(s).length === 0 && <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">{COLUMN[s].hint}</p>}
              {by(s).map((r) => (
                <article key={r.id} className="rounded-2xl border border-line bg-surface p-3.5 shadow-[0_1px_2px_rgba(29,42,35,0.04)]">
                  <h4 className="font-semibold leading-snug">
                    <a href={r.productHuntUrl} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                      {r.name}
                    </a>
                  </h4>
                  <p className="mt-1 text-sm text-muted">{r.founder ? r.founder.name : "Founder not public"}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${r.urgent ? "bg-urgent-soft text-urgent" : "bg-accent-soft text-accent-strong"}`}>{windowLabel(r.daysSinceLaunch)}</span>
                    <span className="tabular-nums text-muted">{r.votes} upvotes</span>
                  </div>
                  <label className="sr-only" htmlFor={`pipe-${r.id}`}>
                    Stage for {r.name}
                  </label>
                  <select
                    id={`pipe-${r.id}`}
                    value={r.status}
                    onChange={(e) => onStatusChange(r.id, e.target.value as Status)}
                    className="mt-3 h-9 w-full cursor-pointer rounded-lg border border-line bg-wash px-2 text-sm"
                  >
                    {STATUSES.map((o) => (
                      <option key={o} value={o}>
                        {COLUMN[o].label}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
