"use client";

import { useState, type ReactNode } from "react";
import { IconCheck, IconCopy } from "@/components/icons";

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 pl-14 lg:px-6 lg:pl-6">
        <div>
          <h1 className="cx-display text-[19px] font-semibold text-[#111827]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="cx-card px-4 py-4">
      <div className="text-[11.5px] text-[var(--color-muted)]">{label}</div>
      <div className="cx-display mt-1 text-[22px] font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-[11.5px] text-[var(--color-faint)]">{hint}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  neutral: "bg-[#f3f4f6] text-[#374151]",
  green: "bg-[#ecfdf3] text-[#15803d]",
  amber: "bg-[#fffbeb] text-[#b45309]",
  red: "bg-[#fef2f2] text-[#b91c1c]",
  blue: "bg-[#eff6ff] text-[#1d4ed8]",
  purple: "bg-[#f5f3ff] text-[#6d28d9]",
};

export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-medium ${TONES[tone] ?? TONES.neutral}`}>
      {children}
    </span>
  );
}

export function Progress({ value, tone = "#111827" }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f4f6]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: tone }} />
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="cx-btn px-3 py-1 text-[12px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch { /* clipboard blocked */ }
      }}
    >
      {done ? <><IconCheck /> Copied</> : <><IconCopy /> {label}</>}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="cx-card px-6 py-12 text-center text-[13.5px] text-gray-500">{children}</div>;
}

export function Markdown({ text }: { text: string }) {
  return <div className="cx-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />;
}

export function mdToHtml(src: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])_(?!\s)(.+?)_(?=[\s).,!?]|$)/g, "$1<em>$2</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  const lines = src.split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let table = false;

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const closeTable = () => { if (table) { out.push("</table>"); table = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      if (!table) { out.push("<table>"); table = true; }
      out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`);
      continue;
    }
    closeTable();

    if (/^\s*[-*]\s+/.test(line)) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*[০-৯\d]+[.)]\s+/.test(line)) {
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(line.replace(/^\s*[০-৯\d]+[.)]\s+/, ""))}</li>`);
      continue;
    }
    closeList();

    if (/^###\s+/.test(line)) out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`);
    else if (/^##\s+/.test(line)) out.push(`<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`);
    else if (/^#\s+/.test(line)) out.push(`<h1>${inline(line.replace(/^#\s+/, ""))}</h1>`);
    else if (/^>\s?/.test(line)) out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
    else if (line.trim() === "") out.push("");
    else out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeTable();
  return out.join("\n");
}
