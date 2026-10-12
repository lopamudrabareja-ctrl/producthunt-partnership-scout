"use client";
// Pill-shaped top navigation: the logo, two tabs (the real views of the app), and an avatar.
import { IconBoard, IconList } from "./Icons";

export type View = "scout" | "pipeline";

export default function AppNav({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tab = (id: View, label: string, icon: React.ReactNode) => {
    const on = view === id;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => onChange(id)}
        className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
          on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <header className="flex items-center justify-between gap-3 rounded-full border border-line bg-surface px-3 py-2 shadow-[0_1px_2px_rgba(29,42,35,0.04)]">
      <div className="flex items-center gap-2.5 pl-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white" aria-hidden>
          PS
        </span>
        <span className="hidden font-semibold tracking-tight sm:block">Partnership Scout</span>
      </div>
      <nav aria-label="Views" role="tablist" className="flex gap-1 rounded-full bg-wash p-1">
        {tab("scout", "Scout", <IconList />)}
        {tab("pipeline", "Pipeline", <IconBoard />)}
      </nav>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong" title="Kavya">
        K
      </span>
    </header>
  );
}
