// Small inline icons (no icon library needed). All decorative: they are hidden from screen readers.
type P = { className?: string };
const base = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconRocket = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M4 16l3-1 8-8c1-1 1-4 1-4s-3 0-4 1L4 12l-1 3zM7 15l-2-2M12 8l.01 0" /></svg>
);
export const IconClock = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg>
);
export const IconUser = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><circle cx="10" cy="7" r="3" /><path d="M4 16c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5" /></svg>
);
export const IconSend = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M17 3L9 11M17 3l-5 14-3-6-6-3 14-5z" /></svg>
);
export const IconList = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}><path d="M6 5h10M6 10h10M6 15h10M3 5h.01M3 10h.01M3 15h.01" /></svg>
);
export const IconBoard = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}><rect x="3" y="3" width="4.5" height="14" rx="1.2" /><rect x="9" y="3" width="4.5" height="9" rx="1.2" /><rect x="15" y="3" width="2" height="6" rx="1" /></svg>
);
export const IconCalendar = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" /></svg>
);
