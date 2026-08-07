const NAV_ITEMS = ["HOME", "TASKS", "FINANCE", "STUDY"];

export const TOPNAV_HEIGHT = 44;

export default function TopNav() {
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
          {NAV_ITEMS.map((item, i) => (
            <span
              key={item}
              style={{
                color: i === 0 ? "var(--text-primary)" : "var(--text-tertiary)",
                textTransform: "uppercase",
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
        <span style={{ color: "var(--text-primary)" }}>15:38</span>
      </div>
    </div>
  );
}
