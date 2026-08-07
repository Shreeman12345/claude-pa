"use client";

import { useCallback, useEffect, useState } from "react";
import Panel from "./Panel";
import { HABITS, Habit, HABIT_LABEL } from "@/lib/habits/constants";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const CATEGORY: Record<Habit, string> = {
  Gym: "BODY",
  Diet: "BODY",
  HairSkin: "ROUTINE",
  MealPrep: "ROUTINE",
  Journaling: "MIND",
};

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

type Status = Record<Habit, boolean>;

function emptyStatus(): Status {
  return Object.fromEntries(HABITS.map((h) => [h, false])) as Status;
}

export default function Habits() {
  const [status, setStatus] = useState<Status>(emptyStatus);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/habits")
      .then((res) => res.json())
      .then((data: { habits: { habit: Habit; done: boolean }[] }) => {
        if (cancelled) return;
        setStatus(Object.fromEntries(data.habits.map((h) => [h.habit, h.done])) as Status);
      })
      .catch((err) => console.error("Failed to load habits:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const logDate = todayKey();
    const channel = supabaseBrowser
      .channel(`habit_logs:${logDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_logs", filter: `log_date=eq.${logDate}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { habit: Habit; done: boolean } | undefined;
          if (!row) return;
          setStatus((prev) => ({ ...prev, [row.habit]: row.done }));
        }
      )
      .subscribe((subStatus) => {
        if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          console.error("habit_logs realtime subscription failed:", subStatus);
        }
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  const toggle = useCallback((habit: Habit) => {
    setStatus((prev) => ({ ...prev, [habit]: !prev[habit] }));
    fetch(`/api/habits/${habit}`, { method: "POST" }).catch((err) => {
      console.error("Failed to toggle habit:", err);
      setStatus((prev) => ({ ...prev, [habit]: !prev[habit] }));
    });
  }, []);

  const doneCount = HABITS.filter((h) => status[h]).length;
  const percent = Math.round((doneCount / HABITS.length) * 100);

  return (
    <Panel
      label="04 // HABITS"
      headerRight={
        <span className="pill pill--warning">
          {doneCount}/{HABITS.length} · {percent}%
        </span>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          className="mono"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2px solid var(--border-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "var(--text-primary)",
            flexShrink: 0,
          }}
        >
          {doneCount}
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
            DAILY SCORE · RESETS 00:00
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
            Start with one.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginTop: 16,
        }}
      >
        {HABITS.map((h) => {
          const done = status[h];
          return (
            <div
              key={h}
              onClick={() => toggle(h)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(h);
                }
              }}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-inner)",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 4,
                    border: done ? "1px solid var(--accent-border)" : "1px solid var(--border-strong)",
                    background: done ? "var(--accent)" : "transparent",
                  }}
                />
                <span
                  className="mono"
                  style={{ fontSize: 10, color: done ? "var(--accent)" : "var(--text-tertiary)" }}
                >
                  {done ? "DONE" : ""}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{HABIT_LABEL[h]}</span>
              <span className="label">{CATEGORY[h]}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
