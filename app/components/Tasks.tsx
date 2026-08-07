"use client";

import { useCallback, useEffect, useState } from "react";
import Panel from "./Panel";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  const refetch = useCallback(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data: { tasks: Task[] }) => setTasks(data.tasks))
      .catch((err) => console.error("Failed to load tasks:", err));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel("tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        refetch();
      })
      .subscribe((subStatus) => {
        if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          console.error("tasks realtime subscription failed:", subStatus);
        }
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [refetch]);

  const complete = useCallback((taskId: string) => {
    setTasks((prev) => (prev ? prev.filter((t) => t.id !== taskId) : prev));
    fetch(`/api/tasks/${taskId}`, { method: "POST" })
      .then((res) => res.json())
      .then((data: { tasks: Task[] }) => setTasks(data.tasks))
      .catch((err) => console.error("Failed to complete task:", err));
  }, []);

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
