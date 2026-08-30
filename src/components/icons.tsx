import type { SVGProps } from "react";

const base = {
  width: 17, height: 17, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

type P = SVGProps<SVGSVGElement>;

export const IconNewChat = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconChat = (p: P) => (
  <svg {...base} {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" /></svg>
);
export const IconImage = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
);
export const IconPdf = (p: P) => (
  <svg {...base} {...p}><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M9 13h6M9 17h4" /></svg>
);
export const IconSearch = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const IconUsers = (p: P) => (
  <svg {...base} {...p}><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3.4" /><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.6a3.4 3.4 0 0 1 0 6.6" /></svg>
);
export const IconFile = (p: P) => (
  <svg {...base} {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5L12 6h6.5A1.5 1.5 0 0 1 20 7.5v11A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z" /></svg>
);
export const IconDoc = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
);
export const IconBolt = (p: P) => (
  <svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
);
export const IconPhone = (p: P) => (
  <svg {...base} {...p}><path d="M21 16.9v2.5a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6A19.6 19.6 0 0 1 1.2 3.7 2 2 0 0 1 3.2 1.5h2.5a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6.8 9.3a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
);
export const IconMegaphone = (p: P) => (
  <svg {...base} {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M17.5 9a3.5 3.5 0 0 1 0 6" /></svg>
);
export const IconSpark = (p: P) => (
  <svg {...base} {...p}><path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /><circle cx="12" cy="12" r="3.2" /></svg>
);
export const IconGauge = (p: P) => (
  <svg {...base} {...p}><path d="M12 14 8.5 9.5" /><path d="M20.5 15a9 9 0 1 0-17 0" /><circle cx="12" cy="14" r="1.4" /></svg>
);
export const IconChevron = (p: P) => (
  <svg {...base} width={14} height={14} {...p}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconHelp = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.3" /><path d="M12 17h.01" /></svg>
);
export const IconMic = (p: P) => (
  <svg {...base} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const IconArrowUp = (p: P) => (
  <svg {...base} strokeWidth={2.1} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} strokeWidth={1.9} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></svg>
);
export const IconCopy = (p: P) => (
  <svg {...base} width={14} height={14} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} width={14} height={14} strokeWidth={2.2} {...p}><path d="m4 12 5 5L20 6" /></svg>
);
export const IconLogo = (p: P) => (
  <svg width={26} height={26} viewBox="0 0 32 32" fill="none" {...p}>
    <rect width="32" height="32" rx="9" fill="#111827" />
    <path d="M10 12.5a5.5 5.5 0 0 1 5.5-5.5h1a5.5 5.5 0 0 1 5.5 5.5v.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M22 19.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 10 19.5V19" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="16" cy="16" r="2.4" fill="#fff" />
  </svg>
);

export const IconKey = (p: P) => (
  <svg {...base} {...p}><circle cx="7.5" cy="15.5" r="4" /><path d="m10.4 12.6 8.1-8.1 2.5 2.5-2 2 2 2-2.6 2.6-2-2-1.4 1.4" /></svg>
);
