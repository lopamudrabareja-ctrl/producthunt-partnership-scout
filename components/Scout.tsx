"use client";
// The whole page: category chips -> "Find partners" -> ranked cards with loading / empty / error states.
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_CATEGORY_IDS, CATEGORIES, type CategoryId } from "@/lib/config";
import { toCsv } from "@/lib/csv";
import type { Status } from "@/lib/status";
import { timeAgo } from "@/lib/format";
import type { ResultRow as Row, ScoutResponse } from "@/lib/types";
import ProductCard from "./ProductCard";

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

  // On first load: ?run=1 starts a live search (handy for demos). Otherwise show the latest saved results,
  // which the daily cron run keeps fresh, so Kavya sees data straight away without waiting.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("run") === "1") {
      void run(false);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/scout?categories=${ALL_CATEGORY_IDS.join(",")}&saved=1`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json && showResponse(json as ScoutResponse))
      .catch(() => {}); // no saved results yet (or offline): stay on the idle screen
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: CategoryId) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  // Show a response: store it and seed the editable message boxes (keeping any edits Kavya already made).
  function showResponse(resp: ScoutResponse) {
    setData(resp);
    setMessages((cur) => {
      const next = { ...cur };
      for (const r of resp.results) if (r.ai && next[r.id] === undefined) next[r.id] = r.ai.message;
      return next;
    });
    setPhase("done");
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
      showResponse(json as ScoutResponse);
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
    seconds < 4 ? "Fetching this week's launches from ProductHunt" : "Writing outreach drafts with Gemini";

  const all = data?.results ?? [];
  const urgentCount = all.filter((r) => r.urgent).length;
  const namedCount = all.filter((r) => r.founder).length;
  const otherWarnings = (data?.warnings ?? []).filter(
    (w) => !w.startsWith("AI drafts unavailable") && !w.startsWith("ProductHunt is unreachable")
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Top bar */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white" aria-hidden>
              PS
            </span>
            <span className="font-semibold tracking-tight">Partnership Scout</span>
          </div>
          <span className="hidden text-sm text-muted sm:block">Live ProductHunt data · last 7 days</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ProductHunt Partnership Scout</h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">
          New tools from the last 7 days, ranked by upvotes and maker replies, each with a draft message. You review,
          edit and send. Nothing is ever sent for you.
        </p>

        {/* Controls */}
        <section aria-label="Choose categories" className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="text-sm font-medium">Categories to search</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_CATEGORY_IDS.map((id) => {
              const on = selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(id)}
                  className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                    on
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-line bg-surface text-muted hover:border-faint hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      on ? "bg-accent text-white" : "border border-faint"
                    }`}
                    aria-hidden
                  >
                    {on ? "✓" : ""}
                  </span>
                  {CATEGORIES[id].label}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => run(false)}
              disabled={phase === "loading" || selected.length === 0}
              className="h-11 rounded-xl bg-accent px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "loading" ? "Searching…" : "Find partners"}
            </button>
            {selected.length === 0 && <span className="text-sm text-urgent">Pick at least one category.</span>}
          </div>
        </section>

        {/* Loading: skeleton cards, so the layout is already there while Gemini writes */}
        {phase === "loading" && (
          <section aria-label="Loading results" className="mt-8">
            <div role="status" className="mb-4 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
              <p className="text-sm font-medium text-accent-strong">
                {loadingStep}… {seconds}s
              </p>
              <p className="ml-auto hidden text-sm text-muted sm:block">A fresh search takes 10 to 25 seconds</p>
            </div>
            <div className="space-y-4" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-6">
                  <div className="h-5 w-1/3 rounded bg-wash" />
                  <div className="mt-3 h-4 w-2/3 rounded bg-wash" />
                  <div className="mt-6 h-px bg-line" />
                  <div className="mt-4 h-4 w-1/2 rounded bg-wash" />
                  <div className="mt-4 h-16 rounded-xl bg-wash" />
                </div>
              ))}
            </div>
          </section>
        )}

        {phase === "error" && (
          <div role="alert" className="mt-8 rounded-2xl border border-danger/30 bg-danger-soft p-5">
            <p className="font-semibold text-danger">Could not load launches</p>
            <p className="mt-1 text-sm text-danger/90">{error}</p>
            <button
              type="button"
              onClick={() => run(false)}
              className="mt-3 h-10 rounded-lg border border-danger/40 bg-surface px-4 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              Try again
            </button>
          </div>
        )}

        {phase === "idle" && (
          <div className="mt-10 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="text-lg font-semibold">Ready when you are</p>
            <p className="mx-auto mt-2 max-w-md text-muted">
              Choose your categories and click <strong className="text-ink">Find partners</strong> to see this week&apos;s
              launches, ranked.
            </p>
          </div>
        )}

        {phase === "done" && data && (
          <section aria-label="Results" className="mt-8">
            {data.source === "stale" && (
              <div role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                <strong>ProductHunt is unreachable.</strong> Showing the last saved results from {timeAgo(data.generatedAt, new Date())}.
                Days since launch may be out of date.
              </div>
            )}
            {data.aiStatus === "failed" && (
              <div role="alert" className="mb-4 rounded-xl border border-urgent-line bg-urgent-soft px-4 py-3 text-sm text-urgent">
                <strong>AI drafts are unavailable right now.</strong> The ranked list is still correct. Click Find partners again in a
                minute to get messages.
              </div>
            )}
            {otherWarnings.map((w) => (
              <p key={w} className="mb-3 rounded-xl border border-urgent-line bg-urgent-soft px-4 py-2.5 text-sm text-urgent">
                {w}
              </p>
            ))}
            {notice && (
              <p role="alert" className="mb-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
                {notice}
              </p>
            )}

            {/* At a glance */}
            <dl className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
                <dt className="text-xs text-muted">Launches</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{data.count}</dd>
              </div>
              <div className={`rounded-2xl border px-4 py-3.5 ${urgentCount > 0 ? "border-urgent-line bg-urgent-soft" : "border-line bg-surface"}`}>
                <dt className={`text-xs ${urgentCount > 0 ? "text-urgent" : "text-muted"}`}>Closing soon (day 5+)</dt>
                <dd className={`mt-1 text-2xl font-semibold tabular-nums ${urgentCount > 0 ? "text-urgent" : ""}`}>{urgentCount}</dd>
              </div>
              <div className="rounded-2xl border border-line bg-surface px-4 py-3.5">
                <dt className="text-xs text-muted">Founder named</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {namedCount}
                  <span className="text-base font-normal text-muted"> of {data.count}</span>
                </dd>
              </div>
            </dl>

            {/* Toolbar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {data.source === "live" ? "Fetched just now" : `Saved result from ${timeAgo(data.generatedAt, new Date())}`}
                {data.source !== "stale" && (
                  <>
                    {" · "}
                    <button type="button" onClick={() => run(true)} className="font-medium text-accent hover:underline">
                      Refresh from ProductHunt
                    </button>
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={urgentOnly}
                    onChange={(e) => setUrgentOnly(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  Closing soon only
                </label>
                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={rows.length === 0}
                  className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-wash disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* The list */}
            {data.count === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
                <p className="font-semibold">No launches found</p>
                <p className="mt-1 text-sm text-muted">Nothing in these categories from the last 7 days. Try adding more categories.</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
                <p className="font-semibold">Nothing is closing soon</p>
                <p className="mt-1 text-sm text-muted">No launch in this list is on day 5 or later. Untick &quot;Closing soon only&quot; to see all of them.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {rows.map((r, i) => (
                  <ProductCard
                    key={r.id}
                    row={r}
                    index={i}
                    message={messages[r.id] ?? r.ai?.message ?? ""}
                    onMessageChange={(id, text) => setMessages((m) => ({ ...m, [id]: text }))}
                    onStatusChange={changeStatus}
                  />
                ))}
              </div>
            )}

            <p className="mt-6 text-xs leading-relaxed text-muted">
              Ranking: 60% upvotes + 40% maker replies + a small freshness bonus. Founder names come from public ProductHunt profiles; when a
              maker hides theirs we show a link instead of guessing.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
