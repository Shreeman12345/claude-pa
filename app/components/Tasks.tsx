"use client";

import Panel from "./Panel";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";

interface Task {
  id: string;
  title: string;
  urgency: "today" | "week" | "month" | "someday";
  createdAt: string;
}

const URGENCY_PILL: Record<Task["urgency"], string> = {
  today: "pill pill--danger",
  week: "pill pill--warning",
  month: "pill",
  someday: "pill",
};

function daysAgo(iso: string): number {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

async function fetchTasks(): Promise<Task[] | null> {
  const res = await fetch("/api/tasks");
  const data: { tasks: Task[] } = await res.json();
  return data.tasks;
}

async function postComplete(taskId: string): Promise<Task[] | null> {
  const res = await fetch(`/api/tasks/${taskId}`, { method: "POST" });
  const data: { tasks: Task[] } = await res.json();
  return data.tasks;
}

export default function Tasks() {
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

  const count = tasks?.length ?? 0;

  return (
    <Panel
      label="02 // STATUS"
      title="Active Tasks"
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pill">{count} ACTIVE</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            VIEW ALL
          </span>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {tasks === null ? null : tasks.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
            No active tasks.
          </div>
        ) : (
          tasks.map((t, i) => (
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
                borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{t.title}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                  CAPTURED · {daysAgo(t.createdAt)}D AGO
                </div>
              </div>
              <span className={URGENCY_PILL[t.urgency]}>{t.urgency.toUpperCase()}</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
