import Panel from "./Panel";
import type { CalendarWeek } from "@/lib/dashboard/calendarWeek";

export default function Calendar({ week }: { week: CalendarWeek }) {
  return (
    <Panel
      label="05 // CALENDAR"
      headerRight={
        <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {week.monthLabel}
        </span>
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        {week.days.map((d) => (
          <div
            key={d.dateKey}
            style={{
              textAlign: "center",
              padding: "6px 10px",
              borderRadius: "var(--radius-inner)",
              background: d.active ? "var(--bg-2)" : "transparent",
              border: d.active ? "1px solid var(--border-strong)" : "1px solid transparent",
            }}
          >
            <div className="label">{d.day}</div>
            <div
              className="mono"
              style={{
                fontSize: 13,
                marginTop: 2,
                color: d.active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {d.date}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {week.loadError ? (
          <div style={{ fontSize: 12, color: "var(--warning)", padding: "10px 0" }}>
            Couldn&apos;t load the schedule — try again shortly.
          </div>
        ) : week.blocks.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
            Nothing scheduled this week.
          </div>
        ) : (
          week.blocks.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "10px 0",
                borderBottom: i < week.blocks.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--text-tertiary)", width: 100, flexShrink: 0 }}
                >
                  {b.time}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{b.title}</div>
                  {b.subtitle && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                      {b.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <span className="pill">{b.tag}</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
