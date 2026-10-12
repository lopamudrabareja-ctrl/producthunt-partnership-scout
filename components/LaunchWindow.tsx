// The design's signature element: seven segments = the 7-day outreach window.
// Segments fill as days pass; from day 5 the filled ones turn amber and the label says how many days are left.
import { WINDOW_DAYS } from "@/lib/config";
import { filledSegments, windowLabel } from "@/lib/format";

export default function LaunchWindow({ daysSinceLaunch, urgent }: { daysSinceLaunch: number; urgent: boolean }) {
  const filled = filledSegments(daysSinceLaunch);
  return (
    <div
      role="img"
      aria-label={`Day ${Math.min(daysSinceLaunch, WINDOW_DAYS)} of ${WINDOW_DAYS}. ${windowLabel(daysSinceLaunch)}`}
      className="w-36 shrink-0"
    >
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: WINDOW_DAYS }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < filled ? (urgent ? "bg-urgent" : "bg-accent") : "bg-line"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1.5 text-xs font-medium ${urgent ? "text-urgent" : "text-muted"}`}>
        Day {daysSinceLaunch} · {windowLabel(daysSinceLaunch)}
      </p>
    </div>
  );
}
