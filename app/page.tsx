import Shell from "./components/Shell";
import Panel from "./components/Panel";
import TopNav from "./components/TopNav";
import Calendar from "./components/Calendar";
import Habits from "./components/Habits";
import Tasks from "./components/Tasks";
import LiveClock from "./components/LiveClock";
import { getCalendarWeek } from "@/lib/dashboard/calendarWeek";

const NET_WORTH_SPARK = [12, 18, 15, 22, 20, 28, 26, 34, 30, 38, 42, 40, 48];

const ACTIVITY = [
  { time: "09:12", text: "Task captured: finalize dashboard tokens" },
  { time: "10:04", text: "Expense logged: $12.40 — lunch" },
  { time: "11:47", text: "Journal entry saved" },
  { time: "13:20", text: "Task completed: review schema" },
];

export default async function Home() {
  const calendarWeek = await getCalendarWeek();

  return (
    <>
      <TopNav />
      <Shell>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px minmax(0, 1fr) 320px",
            gap: "var(--space-3)",
            alignItems: "start",
            minWidth: 0,
          }}
        >
          {/* left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", minWidth: 0 }}>
            <Panel
              label="01 // OPERATOR"
              headerRight={
                <span className="pill pill--accent">
                  <span className="dot" style={{ marginRight: 6 }} />
                  ONLINE
                </span>
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-inner)",
                    background: "linear-gradient(135deg, #3b4d66, #1a2230)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                    Shreeman Ippili
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    OPERATOR · REMOTE
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)" }}>
                <div>
                  <div className="label">FOCUS</div>
                  <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-secondary)", marginTop: 4 }}>
                    Finalize the dashboard token system
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="label">STREAK</div>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--accent)", marginTop: 2 }}>
                    7 DAYS
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              label="07 // FINANCE PULSE"
              headerRight={<span className="pill pill--accent">LIVE</span>}
            >
              <div className="label">NET WORTH</div>
              <div className="mono" style={{ fontSize: 28, color: "var(--text-primary)", marginTop: 4 }}>
                $128,450
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>
                ▲ +2.3% · 30D
              </div>

              <svg
                viewBox="0 0 260 50"
                preserveAspectRatio="none"
                style={{ width: "100%", height: 50, marginTop: 10, display: "block" }}
              >
                <polyline
                  points={NET_WORTH_SPARK.map((v, i) => {
                    const min = Math.min(...NET_WORTH_SPARK);
                    const max = Math.max(...NET_WORTH_SPARK);
                    const x = (i / (NET_WORTH_SPARK.length - 1)) * 260;
                    const y = 47 - ((v - min) / (max - min)) * 44;
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                />
              </svg>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <div>
                  <div className="label">DAILY</div>
                  <div className="mono" style={{ fontSize: 13, color: "var(--accent)", marginTop: 2 }}>
                    +$X.X%
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="label">MONTHLY</div>
                  <div className="mono" style={{ fontSize: 13, color: "var(--accent)", marginTop: 2 }}>
                    +$X.X%
                  </div>
                </div>
              </div>
            </Panel>

            <Tasks />
          </div>

          {/* center column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", minWidth: 0 }}>
            <Panel
              label="03 // SESSION"
              headerRight={
                <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  UTC+0
                </span>
              }
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 400,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    Good afternoon, <i>Shreeman</i>.
                  </h1>
                  <div className="label" style={{ marginTop: 8 }}>
                    FRIDAY, AUGUST 7
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="mono" style={{ fontSize: 26, color: "var(--accent)" }}>
                    <LiveClock />
                  </div>
                  <div className="label">LOCAL TIME</div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-inner)",
                  padding: "10px 12px",
                  background: "var(--bg-2)",
                }}
              >
                <span className="label" style={{ whiteSpace: "nowrap" }}>
                  TODAY I WILL
                </span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", flex: 1, minWidth: 0 }}>
                  Set today&apos;s one thing…
                </span>
                <span
                  className="pill pill--accent"
                  style={{ border: "none", cursor: "pointer" }}
                >
                  → CAPTURE
                </span>
              </div>
            </Panel>

            <Habits />

            <Calendar week={calendarWeek} />
          </div>

          {/* right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", minWidth: 0 }}>
            <Panel
              label="06 // FEED"
              title="Recent Activity"
              headerRight={<span className="pill pill--accent">LIVE</span>}
            >
              <div className="mono" style={{ fontSize: 30, color: "var(--text-primary)" }}>
                12 <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>captures today</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <div>
                  <div className="label">TASKS</div>
                  <div className="mono" style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 2 }}>
                    5
                  </div>
                </div>
                <div>
                  <div className="label">EXPENSES</div>
                  <div className="mono" style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 2 }}>
                    3
                  </div>
                </div>
                <div>
                  <div className="label">NOTES</div>
                  <div className="mono" style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 2 }}>
                    4
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-inner)",
                  padding: "10px 12px",
                  background: "var(--bg-2)",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", flex: 1, minWidth: 0 }}>
                  Log a capture — try &quot;spent $12 on lunch&quot;
                </span>
                <span className="pill pill--accent" style={{ border: "none", cursor: "pointer" }}>
                  +
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18 }}>
                <span className="dot" />
                <span className="label">TODAY · ROUTED VIA TELEGRAM</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
                {ACTIVITY.map((a, i) => (
                  <div
                    key={a.text}
                    style={{
                      padding: "8px 0",
                      borderBottom: i < ACTIVITY.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      {a.time}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 2 }}>{a.text}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    </>
  );
}
