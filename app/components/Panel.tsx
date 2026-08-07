import { ReactNode } from "react";

export default function Panel({
  label,
  title,
  headerRight,
  children,
}: {
  label?: string;
  title?: ReactNode;
  headerRight?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-panel)",
        backdropFilter: `blur(var(--blur-glass))`,
        WebkitBackdropFilter: `blur(var(--blur-glass))`,
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minWidth: 0,
        isolation: "isolate",
        contain: "paint",
      }}
    >
      {(label || title || headerRight) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
            {label && <span className="label">{label}</span>}
            {title && (
              <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{title}</span>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
