"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";

const ApiSettings = dynamic(() => import("@/components/ApiSettings"), { ssr: false });
import { loadKeys } from "@/lib/keys";
import {
  IconNewChat, IconChat, IconImage, IconPdf, IconSearch, IconUsers, IconFile, IconDoc,
  IconBolt, IconPhone, IconMegaphone, IconSpark, IconGauge, IconChevron, IconHelp, IconLogo, IconKey,
} from "@/components/icons";

const PRIMARY = [
  { href: "/", label: "New chat", Icon: IconNewChat, exact: true },
  { href: "/chat", label: "AI Chat", Icon: IconChat },
  { href: "/images", label: "Images", Icon: IconImage },
  { href: "/pdf", label: "PDF Space", Icon: IconPdf },
  { href: "/search", label: "AI Search", Icon: IconSearch },
];

const WORKSPACE = [
  { href: "/palette", label: "Colour Palette", Icon: IconSpark },
  { href: "/canvas", label: "JSON Canvas", Icon: IconBolt },
  { href: "/clients", label: "Clients", Icon: IconUsers },
  { href: "/applications", label: "Applications", Icon: IconFile },
  { href: "/documents", label: "Documents", Icon: IconDoc },
  { href: "/automation", label: "Automation", Icon: IconBolt },
  { href: "/comms", label: "Communication", Icon: IconPhone },
  { href: "/social", label: "Social", Icon: IconMegaphone },
  { href: "/skills", label: "Skills", Icon: IconDoc },
  { href: "/system", label: "System", Icon: IconGauge },
];

interface Recent { id: number; title: string; updatedAt: string }

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(true);
  const [wsOpen, setWsOpen] = useState(true);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [apiOpen, setApiOpen] = useState(false);
  const [keyCount, setKeyCount] = useState(0);

  useEffect(() => {
    const sync = () => setKeyCount(Object.values(loadKeys()).filter((v) => v.trim()).length);
    sync();
    window.addEventListener("keys-updated", sync);
    window.addEventListener("open-api-settings", () => setApiOpen(true));
    return () => window.removeEventListener("keys-updated", sync);
  }, []);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((j) => setRecents(j.conversations ?? []))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen bg-[var(--color-canvas)]">
      {/* ───── Sidebar ───── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[var(--color-line)] bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 px-4 py-4">
          <IconLogo />
          <span className="text-[15.5px] font-bold tracking-tight text-[#111827]">VisaMOTion</span>
        </Link>

        <div className="cx-scroll flex-1 overflow-y-auto px-3 pb-2">
          {/* Primary nav */}
          <nav className="space-y-0.5">
            {PRIMARY.map(({ href, label, Icon, exact }) => (
              <Link key={href} href={href} className={`cx-nav ${isActive(href, exact) ? "cx-nav-on" : ""}`}>
                <Icon className="shrink-0 text-[#4b5563]" />
                {label}
              </Link>
            ))}
            <button onClick={() => setApiOpen(true)} className="cx-nav w-full text-left">
              <IconKey className="shrink-0 text-[#4b5563]" />
              <span className="flex-1">API Settings</span>
              {keyCount > 0 && (
                <span className="rounded-full bg-[#ecfdf3] px-1.5 py-[1px] text-[10.5px] font-medium text-[#15803d]">
                  {keyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Recents */}
          <div className="mt-5">
            <button
              onClick={() => setRecentsOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
            >
              Recents
              <IconChevron className={`transition-transform ${recentsOpen ? "" : "-rotate-90"}`} />
            </button>
            {recentsOpen && (
              <div className="mt-1 space-y-0.5">
                {recents.length === 0 ? (
                  <p className="px-2.5 py-2 text-sm leading-relaxed text-gray-500">
                    Start a conversation to see your history
                  </p>
                ) : (
                  recents.slice(0, 8).map((c, i) => (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => router.push(`/chat?c=${c.id}`)}
                      className="cx-nav w-full truncate text-left"
                      title={c.title}
                    >
                      <span className="block truncate text-[13px] text-[#374151]">{c.title}</span>
                    </motion.button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Workspace */}
          <div className="mt-5">
            <button
              onClick={() => setWsOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
            >
              Workspace
              <IconChevron className={`transition-transform ${wsOpen ? "" : "-rotate-90"}`} />
            </button>
            {wsOpen && (
              <nav className="mt-1 space-y-0.5">
                {WORKSPACE.map(({ href, label, Icon }) => (
                  <Link key={href} href={href} className={`cx-nav ${isActive(href) ? "cx-nav-on" : ""}`}>
                    <Icon className="shrink-0 text-[#4b5563]" />
                    {label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Bottom utility */}
        <div className="border-t border-[var(--color-line)] px-3 py-3">
          <Link href="/comms" className="cx-nav">
            <IconPhone className="shrink-0 text-[#4b5563]" />
            <span className="flex flex-col leading-tight">
              <span>Contact Us</span>
              <span className="text-[11px] font-normal text-[#16a34a]">Usually replies in &lt;1 min</span>
            </span>
          </Link>
          <Link href="/skills" className="cx-nav">
            <IconHelp className="shrink-0 text-[#4b5563]" />
            Help &amp; FAQ
          </Link>
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <ApiSettings open={apiOpen} onClose={() => setApiOpen(false)} />

      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="fixed left-3 top-3 z-30 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-[14px] shadow-sm lg:hidden"
      >
        ☰
      </button>

      <div className="min-w-0 flex-1 lg:ml-[260px]">{children}</div>
    </div>
  );
}
