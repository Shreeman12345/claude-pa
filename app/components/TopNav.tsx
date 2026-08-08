"use client";

import { useRouter, usePathname } from "next/navigation";
import LiveClock from "./LiveClock";

const NAV_ITEMS = ["HOME", "TASKS", "FINANCE", "STUDY"];

export const TOPNAV_HEIGHT = 44;

type NavTarget = { type: "route"; href: string } | { type: "anchor"; id: string };

// TASKS is an anchor, not a route -- there's no separate /tasks page, it
// scrolls to the Tasks panel on the home page. STUDY has no page yet.
const NAV_TARGETS: Record<string, NavTarget> = {
  HOME: { type: "route", href: "/" },
  TASKS: { type: "anchor", id: "tasks-panel" },
  FINANCE: { type: "route", href: "/finance" },
};

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (item: string) => {
    const target = NAV_TARGETS[item];
    if (!target) return;

    if (target.type === "route") {
      router.push(target.href);
      return;
    }

    // Anchor target only exists on "/" -- scroll if already there, otherwise
    // just navigate home (no cross-page auto-scroll, that's a bigger feature
    // than what was asked for here).
    if (pathname === "/") {
      document.getElementById(target.id)?.scrollIntoView({ behavior: "instant", block: "start" });
    } else {
      router.push("/");
    }
  };

  const isActive = (item: string) => {
    const target = NAV_TARGETS[item];
    return target?.type === "route" && pathname === target.href;
  };

  return (
    <div
      className="mono"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: TOPNAV_HEIGHT,
        padding: "0 var(--space-5)",
        borderBottom: "1px solid var(--border)",
        background: "rgba(5, 5, 5, 0.85)",
        backdropFilter: "blur(var(--blur-glass))",
        WebkitBackdropFilter: "blur(var(--blur-glass))",
        fontSize: 11,
        letterSpacing: "0.06em",
        transform: "translateZ(0)",
        willChange: "transform",
        isolation: "isolate",
        contain: "paint",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
        <span style={{ color: "var(--text-primary)" }}>
          CLAUDE PA <span style={{ color: "var(--text-tertiary)" }}>// V0.1</span>
        </span>
        <nav style={{ display: "flex", gap: "var(--space-5)" }}>
          {NAV_ITEMS.map((item) => (
            <span
              key={item}
              onClick={() => handleNavClick(item)}
              style={{
                color: isActive(item) ? "var(--text-primary)" : "var(--text-tertiary)",
                textTransform: "uppercase",
                cursor: NAV_TARGETS[item] ? "pointer" : "default",
              }}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", color: "var(--text-secondary)" }}>
        <span>
          TASKS <span style={{ color: "var(--accent)" }}>3/5</span>
        </span>
        <span>AUG 07, 2026</span>
        <span style={{ color: "var(--text-primary)" }}>
          <LiveClock />
        </span>
      </div>
    </div>
  );
}
