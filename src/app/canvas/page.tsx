"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, CopyButton, Empty, PageHeader, Stat } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { keyHeaders } from "@/lib/keys";
import { IconArrowUp } from "@/components/icons";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface Node { id: string; text: string; x: number; y: number; width: number; height: number; color?: string }
interface Edge { id: string; fromNode: string; toNode: string }
interface Result { kind: string; topic: string; canvas: { nodes: Node[]; edges: Edge[] }; nodeCount: number; edgeCount: number; filename: string }

const KINDS = [
  { key: "mindmap", label: "Mind map", hint: "Radial exploration of a topic" },
  { key: "flowchart", label: "Flowchart", hint: "Sequential process with conditions" },
  { key: "project", label: "Project plan", hint: "Phases from define to review" },
  { key: "decision", label: "Decision tree", hint: "Options, criteria and trade-offs" },
];

const PRESETS = [
  "Client onboarding process",
  "Launch plan for a new service",
  "Choose between hiring and outsourcing",
  "Knowledge map of visa operations",
];

const NODE_COLORS: Record<string, string> = {
  "1": "#b91c1c", "2": "#c2410c", "3": "#b45309", "4": "#15803d", "5": "#0f766e", "6": "#4338ca",
};

export default function CanvasPage() {
  const { push } = useToast();
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("mindmap");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  function asDocument(r: Result): PreviewDoc {
    const byId = new Map(r.canvas.nodes.map((n) => [n.id, n]));
    const children = new Map<string, string[]>();
    for (const e of r.canvas.edges) {
      if (!children.has(e.fromNode)) children.set(e.fromNode, []);
      children.get(e.fromNode)!.push(e.toNode);
    }
    const seen = new Set<string>();
    const lines: string[] = [`# ${r.topic}`, "", `Structure: ${r.kind} · ${r.nodeCount} nodes · ${r.edgeCount} connections`, ""];
    const walk = (id: string, depth: number) => {
      if (seen.has(id)) return;
      seen.add(id);
      const n = byId.get(id);
      if (!n) return;
      const label = n.text.replace(/^#+\s*/, "");
      lines.push(depth === 0 ? `## ${label}` : `${"  ".repeat(depth - 1)}- ${label}`);
      for (const c of children.get(id) ?? []) walk(c, depth + 1);
    };
    const roots = r.canvas.nodes.filter((n) => !r.canvas.edges.some((e) => e.toNode === n.id));
    for (const root of roots) walk(root.id, 0);
    for (const n of r.canvas.nodes) if (!seen.has(n.id)) walk(n.id, 1);
    return { title: r.topic, body: lines.join("\n") };
  }

  async function build(t?: string) {
    const value = (t ?? topic).trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const j = await fetch("/api/canvas", {
        method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ topic: value, kind }),
      }).then((r) => r.json());
      if (!j.ok) { push(j.error ?? "Could not build the canvas.", "error"); return; }
      setResult(j);
      setTopic("");
      push(`Canvas ready — ${j.nodeCount} nodes, ${j.edgeCount} edges.`, "success");
    } catch { push("Request failed.", "error"); }
    finally { setBusy(false); }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.canvas, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = result.filename;
    a.click();
    push("JSON Canvas downloaded — open it in Obsidian.", "success");
  }

  // Viewport for the SVG preview
  const nodes = result?.canvas.nodes ?? [];
  const minX = Math.min(...nodes.map((n) => n.x), 0) - 60;
  const minY = Math.min(...nodes.map((n) => n.y), 0) - 60;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width), 400) + 60;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height), 300) + 60;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="JSON Canvas"
        subtitle="Mind maps, flowcharts, project plans and decision trees — portable and Obsidian-compatible"
        actions={result && <Badge tone="blue">{result.nodeCount} nodes · {result.edgeCount} edges</Badge>}
      />

      <div className="cx-scroll flex-1 overflow-y-auto px-5 py-6 lg:px-6">
        <div className="mx-auto max-w-[900px] space-y-5">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <motion.button key={k.key} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setKind(k.key)} className={`cx-chip ${kind === k.key ? "cx-chip-on" : ""}`} title={k.hint}>
                {k.label}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-[24px] border border-gray-300 bg-white px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void build(); }}
              placeholder="What should the canvas map out?"
              className="flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-gray-400"
            />
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => void build()} disabled={busy || !topic.trim()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-30">
              {busy ? <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" /> : <IconArrowUp width={16} height={16} />}
            </motion.button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <motion.button key={p} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="cx-chip" onClick={() => void build(p)}>
                {p}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key={result.topic + result.kind}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }} className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Structure" value={KINDS.find((k) => k.key === result.kind)?.label ?? result.kind} />
                  <Stat label="Nodes" value={result.nodeCount} />
                  <Stat label="Connections" value={result.edgeCount} />
                </div>

                <div className="cx-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-5 py-3">
                    <span className="truncate text-[14px] font-semibold">{result.topic}</span>
                    <span className="flex gap-2">
                      <CopyButton text={JSON.stringify(result.canvas, null, 2)} label="Copy JSON" />
                      <button className="cx-btn px-3 py-1 text-[12px]" onClick={() => setPreview(asDocument(result))}>Preview &amp; export</button>
                      <button className="cx-btn cx-btn-dark px-3 py-1 text-[12px]" onClick={download}>Download .canvas</button>
                    </span>
                  </div>
                  <div className="cx-scroll overflow-auto bg-[#f8f9fc] p-4">
                    <svg
                      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
                      className="h-[420px] w-full"
                      role="img" aria-label={`${result.kind} preview`}
                    >
                      {result.canvas.edges.map((e) => {
                        const a = byId.get(e.fromNode); const b = byId.get(e.toNode);
                        if (!a || !b) return null;
                        const x1 = a.x + a.width / 2, y1 = a.y + a.height / 2;
                        const x2 = b.x + b.width / 2, y2 = b.y + b.height / 2;
                        return <path key={e.id} d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
                          stroke="#c9cfdb" strokeWidth="3" fill="none" />;
                      })}
                      {nodes.map((n, i) => {
                        const stroke = NODE_COLORS[n.color ?? "6"] ?? "#4338ca";
                        const label = n.text.replace(/^#+\s*/, "");
                        return (
                          <g key={n.id}>
                            <rect x={n.x} y={n.y} width={n.width} height={n.height} rx="18"
                              fill="#ffffff" stroke={stroke} strokeWidth="3" />
                            <foreignObject x={n.x + 18} y={n.y + 14} width={n.width - 36} height={n.height - 24}>
                              <div
                                {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
                                style={{
                                  font: `${i === 0 ? 600 : 500} 22px Inter, system-ui, sans-serif`,
                                  color: "#111827", lineHeight: 1.35, overflow: "hidden",
                                }}
                              >
                                {label}
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="cx-card p-5 text-[12.5px] leading-relaxed text-gray-500">
                  The downloaded <code>.canvas</code> file follows the open JSON Canvas spec — drop it into an
                  Obsidian vault or any compatible editor and the layout, colours and connections are preserved.
                </div>
              </motion.div>
            ) : (
              <Empty>Pick a structure and describe the topic — the canvas renders here and exports as JSON.</Empty>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}
