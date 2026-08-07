"use client";

import { useState, CSSProperties } from "react";
import Panel from "./Panel";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";
import { TIMEZONE, dayKey, localParts, timeLabel, weekBounds, fromLocalParts } from "@/lib/schedule/datetime";

type Kind = "class" | "event" | "reminder" | "deadline";
type Recurrence = "daily" | "weekly" | "monthly" | "yearly";

interface ScheduleItem {
  id: string;
  kind: Kind;
  title: string;
  location: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  recurrence: Recurrence | null;
  recurrence_days: string | null;
  subject: string | null;
  remind_before_days: number | null;
}

const KIND_OPTIONS: Kind[] = ["class", "event", "reminder", "deadline"];
const RECURRENCE_OPTIONS: Array<Recurrence | "none"> = ["none", "daily", "weekly", "monthly", "yearly"];

const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchWeek(): Promise<ScheduleItem[]> {
  const res = await fetch("/api/schedule");
  const data: { items: ScheduleItem[] } = await res.json();
  return data.items;
}

async function postCreate(payload: Record<string, unknown>): Promise<ScheduleItem[]> {
  const res = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: { items: ScheduleItem[] } = await res.json();
  return data.items;
}

function buildDayStrip() {
  const { monday } = weekBounds();
  const todayKey = dayKey(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * DAY_MS);
    const key = dayKey(d);
    days.push({
      day: new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "short" }).format(d).toUpperCase(),
      date: String(localParts(d).day).padStart(2, "0"),
      dateKey: key,
      active: key === todayKey,
    });
  }
  return days;
}

function monthLabel(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, month: "long", year: "numeric" })
    .format(new Date())
    .toUpperCase();
}

const fieldStyle: CSSProperties = {
  width: "100%",
  background: "var(--bg-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-inner)",
  padding: "8px 10px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

export default function Calendar() {
  const { data: items, mutate } = useRealtimeData<ScheduleItem[]>({
    table: "schedule_items",
    initialData: [],
    fetchData: fetchWeek,
  });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("event");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | "none">("none");
  const [recurrenceDays, setRecurrenceDays] = useState("");

  const days = buildDayStrip();

  const resetForm = () => {
    setTitle("");
    setKind("event");
    setDate("");
    setTime("");
    setLocation("");
    setNotes("");
    setRecurrence("none");
    setRecurrenceDays("");
  };

  const submit = () => {
    if (!title.trim() || !date) return;

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time ? time.split(":").map(Number) : [0, 0];
    const startsAt = fromLocalParts({
      year,
      month: month - 1,
      day,
      hour,
      minute,
      second: 0,
    }).toISOString();

    const payload: Record<string, unknown> = {
      kind,
      title: title.trim(),
      starts_at: startsAt,
      location: location.trim() || null,
      notes: notes.trim() || null,
      recurrence: recurrence === "none" ? null : recurrence,
      recurrence_days: recurrence === "weekly" && recurrenceDays.trim() ? recurrenceDays.trim() : null,
    };

    mutate((prev) => prev, () => postCreate(payload));
    setShowForm(false);
    resetForm();
  };

  return (
    <Panel
      label="05 // CALENDAR"
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="pill pill--accent"
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm ? "CLOSE" : "+ NEW"}
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {monthLabel()}
          </span>
        </div>
      }
    >
      {showForm && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            marginBottom: 14,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-inner)",
          }}
        >
          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              TITLE
            </div>
            <input
              style={fieldStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Physics lab"
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 4 }}>
                KIND
              </div>
              <select style={fieldStyle} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 4 }}>
                DATE
              </div>
              <input
                type="date"
                style={fieldStyle}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 4 }}>
                TIME
              </div>
              <input
                type="time"
                style={fieldStyle}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              LOCATION
            </div>
            <input
              style={fieldStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="optional"
            />
          </div>

          <div>
            <div className="label" style={{ marginBottom: 4 }}>
              NOTES
            </div>
            <textarea
              style={{ ...fieldStyle, resize: "vertical", minHeight: 40 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional"
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 4 }}>
                RECURRENCE
              </div>
              <select
                style={fieldStyle}
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence | "none")}
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {recurrence === "weekly" && (
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 4 }}>
                  DAYS
                </div>
                <input
                  style={fieldStyle}
                  value={recurrenceDays}
                  onChange={(e) => setRecurrenceDays(e.target.value)}
                  placeholder="mon,wed,fri"
                />
              </div>
            )}
          </div>

          <span
            className="pill pill--accent"
            style={{
              border: "none",
              cursor: "pointer",
              alignSelf: "flex-start",
              marginTop: 4,
              opacity: title.trim() && date ? 1 : 0.4,
              pointerEvents: title.trim() && date ? "auto" : "none",
            }}
            onClick={submit}
          >
            → CREATE
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        {days.map((d) => (
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
        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
            Nothing scheduled this week.
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "10px 0",
                borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--text-tertiary)", width: 100, flexShrink: 0 }}
                >
                  {item.ends_at
                    ? `${timeLabel(new Date(item.starts_at))} — ${timeLabel(new Date(item.ends_at))}`
                    : timeLabel(new Date(item.starts_at))}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{item.title}</div>
                  {(item.location || item.notes) && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                      {item.location ?? item.notes}
                    </div>
                  )}
                </div>
              </div>
              <span className="pill">{item.kind.toUpperCase()}</span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
