"use client";
// The whole page: category chips -> "Find partners" -> ranked table with loading / empty / error states.
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_CATEGORY_IDS, CATEGORIES, type CategoryId } from "@/lib/config";
import { toCsv } from "@/lib/csv";
import type { Status } from "@/lib/status";
import { timeAgo } from "@/lib/format";
import type { ResultRow as Row, ScoutResponse } from "@/lib/types";
import ResultRow from "./ResultRow";

type Phase = "idle" | "loading" | "done" | "error";

export default function Scout() {
  const [selected, setSelected] = useState<CategoryId[]>(ALL_CATEGORY_IDS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<ScoutResponse | null>(null);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({}); // Kavya's edits, keyed by product id
  const [notice, setNotice] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Elapsed-seconds counter while loading, so a 20 second wait never looks frozen.
  useEffect(() => {
    if (phase !== "loading") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Opening the page with ?run=1 starts the search straight away (handy for demos and bookmarks).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("run") === "1") void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: CategoryId) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  async function run(refresh: boolean) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSeconds(0);
    setPhase("loading");
    setError("");
    setNotice("");
    try {
      const qs = new URLSearchParams({ categories: selected.join(",") });
      if (refresh) qs.set("refresh", "1");
      const res = await fetch(`/api/scout?${qs}`, { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (HTTP ${res.status})`);
      const resp = json as ScoutResponse;
      setData(resp);
      // Seed the editable message box from each AI draft (keep edits Kavya already made).
      setMessages((cur) => {
        const next = { ...cur };
        for (const r of resp.results) if (r.ai && next[r.id] === undefined) next[r.id] = r.ai.message;
        return next;
      });
      setPhase("done");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }

  // Optimistic update: change the dropdown immediately, save in the background, undo if saving fails.
  async function changeStatus(id: string, status: Status) {
    const previous = data?.results.find((r) => r.id === id)?.status ?? "new";
    const apply = (s: Status) =>
      setData((d) => (d ? { ...d, results: d.results.map((r) => (r.id === id ? { ...r, status: s } : r)) } : d));
    apply(status);
    setNotice("");
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      apply(previous);
      setNotice("Could not save that status. Check the database connection and try again.");
    }
  }

  const rows: Row[] = useMemo(() => {
    const all = data?.results ?? [];
    return urgentOnly ? all.filter((r) => r.urgent) : all;
  }, [data, urgentOnly]);

  function downloadCsv() {
    // The BOM (﻿) makes Excel read the file as UTF-8 so names with accents are not garbled.
    const blob = new Blob(["﻿" + toCsv(rows, messages)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partnership-scout-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const loadingStep =
    seconds < 4 ? "Fetching launches from ProductHunt and ranking them" : "Writing outreach drafts with Gemini (the slow part)";

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ProductHunt Partnership Scout</h1>
        <p className="mt-2 max-w-3xl text-zinc-600 dark:text-zinc-400">
          Newly launched tools from the last 7 days, ranked by upvotes and how often the makers reply, with a draft
          message for each. You review, edit and send. Nothing is ever sent for you.
        </p>
      </header>

      <section aria-label="Choose categories" className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-medium">Categories</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_CATEGORY_IDS.map((id) => {
            const on = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                }`}
              >
                {CATEGORIES[id].label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={phase === "loading" || selected.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "loading" ? "Working…" : "Find partners"}
          </button>
          {selected.length === 0 && <span className="text-sm text-amber-700 dark:text-amber-300">Pick at least one category.</span>}
        </div>
      </section>

      {phase === "loading" && (
        <div role="status" className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden />
            <p className="font-medium">{loadingStep}… {seconds}s</p>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            A fresh run takes about 20 seconds. A repeat search within 10 minutes is instant.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/40">
          <p className="font-semibold text-red-800 dark:text-red-200">Could not load launches</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          <button type="button" onClick={() => run(false)} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40">
            Try again
          </button>
        </div>
      )}

      {phase === "idle" && (
        <p className="mt-10 text-center text-zinc-500">
          Pick your categories and click <strong>Find partners</strong> to see this week&apos;s launches.
        </p>
      )}

      {phase === "done" && data && (
        <section aria-label="Results" className="mt-6">
          {data.source === "stale" && (
            <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <strong>ProductHunt is unreachable.</strong> Showing the last saved results from {timeAgo(data.generatedAt, new Date())}. Days
              since launch may be out of date.
            </div>
          )}
          {data.aiStatus === "failed" && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <strong>AI drafts are unavailable right now.</strong> The ranked list below is still correct; click Find partners again in a minute to get messages.
            </div>
          )}
          {data.warnings
            .filter((w) => !w.startsWith("AI drafts unavailable") && !w.startsWith("ProductHunt is unreachable"))
            .map((w) => (
              <p key={w} className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {w}
              </p>
            ))}
          {notice && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{notice}</p>}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {data.count} launches ·{" "}
              {data.source === "live" ? "fetched just now" : `saved result from ${timeAgo(data.generatedAt, new Date())}`}
              {data.source !== "stale" && (
                <>
                  {" · "}
                  <button type="button" onClick={() => run(true)} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">
                    Refresh from ProductHunt
                  </button>
                </>
              )}
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} />
                Urgent only (day 5+)
              </label>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={rows.length === 0}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Export CSV
              </button>
            </div>
          </div>

          {data.count === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <p className="font-medium">No launches found</p>
              <p className="mt-1 text-sm text-zinc-500">Nothing in these categories from the last 7 days. Try adding more categories.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <p className="font-medium">No urgent launches</p>
              <p className="mt-1 text-sm text-zinc-500">Nothing in this list is on day 5 or later. Untick &quot;Urgent only&quot; to see everything.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Founder</th>
                    <th className="px-3 py-2">Upvotes</th>
                    <th className="px-3 py-2">Launched</th>
                    <th className="px-3 py-2">Outreach angle</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <ResultRow
                      key={r.id}
                      row={r}
                      message={messages[r.id] ?? r.ai?.message ?? ""}
                      onMessageChange={(id, text) => setMessages((m) => ({ ...m, [id]: text }))}
                      onStatusChange={changeStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            Ranking: 60% upvotes + 40% maker replies + a small freshness bonus. Founder names come from public ProductHunt profiles; when a
            maker hides theirs, we show a link instead of guessing.
          </p>
        </section>
      )}
    </main>
  );
}
