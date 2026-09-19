"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/circle", label: "Circle" },
  { href: "/discover", label: "Discover" },
  { href: "/explore", label: "Explore" },
  { href: "/import", label: "Import" },
  { href: "/passport", label: "Passport" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-paper/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-[560px]">
        {TABS.map((tab) => {
          const active = path.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-3 font-display text-sm"
              >
                <span
                  className="h-[3px] w-6 rounded-full transition-colors"
                  style={{ background: active ? "var(--string)" : "transparent" }}
                />
                <span style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
