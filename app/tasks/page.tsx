"use client";

import Shell from "../components/Shell";
import Panel from "../components/Panel";
import TopNav from "../components/TopNav";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";

type Urgency = "today" | "week" | "month" | "someday";

interface Task {
  id: string;
  title: string;
  urgency: Urgency;
  createdAt: string;
}

const URGENCY_ORDER: Urgency[] = ["today", "week", "month", "someday"];
const URGENCY_LABELS: Record<Urgency, string> = {
  today: "TODAY",
  week: "THIS WEEK",
  month: "THIS MONTH",
  someday: "SOMEDAY",
};
const URGENCY_PILL: Record<Urgency, string> = {
  today: "pill pill--danger",
  week: "pill pill--warning",
  month: "pill",
  someday: "pill",
};

// Large enough to never actually truncate a real task list -- getActiveTasks
// slices to whatever's passed, so this is how the dedicated page asks for
// "all of them" through the same route the compact Home panel uses (which
// omits ?limit and gets the default 5).
const ALL_TASKS_LIMIT = 500;

function daysAgo(iso: string): number {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

async function fetchTasks(): Promise<Task[] | null> {
  const res = await fetch(`/api/tasks?limit=${ALL_TASKS_LIMIT}`);
  const data: { tasks: Task[] } = await res.json();
  return data.tasks;
}

async function postComplete(taskId: string): Promise<Task[] | null> {
  const res = await fetch(`/api/tasks/${taskId}?limit=${ALL_TASKS_LIMIT}`, { method: "POST" });
  const data: { tasks: Task[] } = await res.json();
  return data.tasks;
}

export default function TasksPage() {
  const { data: tasks, mutate } = useRealtimeData<Task[] | null>({
    table: "tasks",
    initialData: null,
    fetchData: fetchTasks,
  });

  const complete = (taskId: string) => {
    mutate(
      (prev) => (prev ?? []).filter((t) => t.id !== taskId),
      () => postComplete(taskId)
    );
  };

  const grouped: Record<Urgency, Task[]> = { today: [], week: [], month: [], someday: [] };
  for (const t of tasks ?? []) {
    grouped[t.urgency].push(t);
  }

  const total = tasks?.length ?? 0;

  return (
    <>
      <TopNav />
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Panel
            label="TASKS // OVERVIEW"
            headerRight={<span className="pill pill--accent">{total} ACTIVE</span>}
          >
            <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
              {URGENCY_ORDER.map((u) => (
                <div key={u}>
                  <div className="label">{URGENCY_LABELS[u]}</div>
                  <div className="mono" style={{ fontSize: 24, color: "var(--text-primary)", marginTop: 4 }}>
                    {grouped[u].length}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {URGENCY_ORDER.map((urgency) => {
            const items = grouped[urgency];
            return (
              <Panel key={urgency} label={`TASKS // ${URGENCY_LABELS[urgency]}`}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {tasks === null ? null : items.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
                      Nothing here.
                    </div>
                  ) : (
                    items.map((t, i) => (
                      <div
                        key={t.id}
                        onClick={() => complete(t.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            complete(t.id);
                          }
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "10px 0",
                          borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{t.title}</div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                            CAPTURED · {daysAgo(t.createdAt)}D AGO
                          </div>
                        </div>
                        <span className={URGENCY_PILL[urgency]}>{urgency.toUpperCase()}</span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </Shell>
    </>
  );
}
