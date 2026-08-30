"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SKILLS, SKILL_GROUPS, GROUP_META, type SkillGroup } from "@/lib/skills";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { IconSearch } from "@/components/icons";

export default function SkillsPage() {
  const router = useRouter();
  const [group, setGroup] = useState<SkillGroup | "All">("All");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILLS.filter((s) => {
      const inGroup = group === "All" || s.group === group;
      const inQuery = !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.group.toLowerCase().includes(q);
      return inGroup && inQuery;
    });
  }, [group, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof SKILLS>();
    for (const s of list) {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    }
    return Array.from(map.entries());
  }, [list]);

  function open(href: string, prompt?: string) {
    if (prompt) router.push(`${href}?q=${encodeURIComponent(prompt)}`);
    else router.push(href);
  }

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Skills"
        subtitle="Everything the agent can do, grouped by discipline — click any card to run it"
        actions={<Badge tone="blue">{SKILLS.length} capabilities</Badge>}
      />

      <div className="cx-scroll flex-1 overflow-y-auto px-5 py-6 lg:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Capabilities" value={SKILLS.length} />
            <Stat label="Disciplines" value={SKILL_GROUPS.length} />
            <Stat label="Countries covered" value={15} hint="visa and work permit rules" />
            <Stat label="Export formats" value="PDF · DOCX · DOC · CSV · JSON" />
          </div>

          {/* Search + filters */}
          <div className="cx-card flex flex-wrap items-center gap-3 p-4">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2">
              <IconSearch width={16} height={16} className="shrink-0 text-gray-400" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a capability…"
                className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-gray-400"
              />
              {query && <button className="text-[12px] text-gray-400 hover:text-gray-800" onClick={() => setQuery("")}>Clear</button>}
            </div>
            <span className="text-[12px] text-gray-500">{list.length} shown</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => setGroup("All")} className={`cx-chip ${group === "All" ? "cx-chip-on" : ""}`}>
              All
            </motion.button>
            {SKILL_GROUPS.map((g) => (
              <motion.button key={g} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setGroup(g)} className={`cx-chip ${group === g ? "cx-chip-on" : ""}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: GROUP_META[g].accent }} />
                {g}
              </motion.button>
            ))}
          </div>

          {/* Grouped grid */}
          <AnimatePresence mode="popLayout">
            {grouped.map(([g, items]) => {
              const meta = GROUP_META[g as SkillGroup];
              return (
                <motion.section
                  key={g} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  <div className="flex items-baseline gap-3 border-l-[3px] pl-3" style={{ borderColor: meta?.accent ?? "#111827" }}>
                    <h2 className="cx-display text-[15px] font-semibold">{g}</h2>
                    <p className="hidden text-[12.5px] text-gray-500 sm:block">{meta?.blurb}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((s, i) => (
                      <motion.button
                        key={s.key}
                        layout
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.26 }}
                        whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}
                        onClick={() => open(s.href, s.prompt)}
                        className="cx-card group relative overflow-hidden p-5 text-left transition-shadow hover:shadow-[0_10px_28px_rgba(17,24,39,.09)]"
                      >
                        <span className="absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ background: meta?.accent ?? "#111827" }} />
                        <div className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl text-[15px]"
                          style={{ background: `${meta?.accent ?? "#111827"}12`, color: meta?.accent ?? "#111827" }}>
                          {s.icon}
                        </div>
                        <div className="text-[14px] font-medium text-[#111827]">{s.name}</div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">{s.desc}</p>
                        <div className="mt-3 text-[11.5px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ color: meta?.accent ?? "#111827" }}>
                          Run this →
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>

          {list.length === 0 && (
            <div className="cx-card px-6 py-12 text-center text-[13.5px] text-gray-500">
              No capability matches “{query}”. Try a broader term such as “pdf”, “design” or “plan”.
            </div>
          )}

          <div className="cx-card p-5 text-[12.5px] leading-relaxed text-gray-500">
            Every capability follows the same working rules: facts, assumptions and recommendations stay separate,
            nothing is invented, assumptions are labelled, and the deliverable arrives before the explanation.
          </div>
        </div>
      </div>

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}
