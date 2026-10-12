// The row of four stat cards at the top of the results: an icon in a tinted circle, a big number, a small caption.
import { IconClock, IconRocket, IconSend, IconUser } from "./Icons";

type Stat = { label: string; value: number; of?: number; caption: string; icon: React.ReactNode; tone: "green" | "terracotta" };

export default function StatCards(props: { launches: number; closing: number; named: number; contacted: number }) {
  const stats: Stat[] = [
    { label: "Launches", value: props.launches, caption: "in the last 7 days", icon: <IconRocket />, tone: "green" },
    { label: "Closing soon", value: props.closing, caption: "day 5 or later", icon: <IconClock />, tone: props.closing > 0 ? "terracotta" : "green" },
    { label: "Founder named", value: props.named, of: props.launches, caption: "others are hidden by ProductHunt", icon: <IconUser />, tone: "green" },
    { label: "Contacted", value: props.contacted, caption: "contacted or replied", icon: <IconSend />, tone: "green" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => {
        const hot = s.tone === "terracotta";
        return (
          <div key={s.label} className={`rounded-3xl border p-4 ${hot ? "border-urgent-line bg-urgent-soft" : "border-line bg-surface"}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${hot ? "bg-surface text-urgent" : "bg-accent-soft text-accent-strong"}`}>
              {s.icon}
            </span>
            <dt className={`mt-3 text-sm ${hot ? "text-urgent" : "text-muted"}`}>{s.label}</dt>
            <dd className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight">
              {s.value}
              {s.of !== undefined && <span className="text-base font-normal text-muted"> of {s.of}</span>}
            </dd>
            <p className="mt-1 text-xs text-muted">{s.caption}</p>
          </div>
        );
      })}
    </dl>
  );
}
