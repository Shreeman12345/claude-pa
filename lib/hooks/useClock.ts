"use client";

import { useEffect, useState } from "react";
import { hhmm } from "@/lib/schedule/datetime";

const UPDATE_INTERVAL_MS = 30_000;

/** Live-updating 24hr HH:MM clock. Browser-only -- no network, no database. */
export function useClock(): string {
  const [time, setTime] = useState(() => hhmm(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(hhmm(new Date())), UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return time;
}
