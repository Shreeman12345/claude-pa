"use client";

import { useClock } from "@/lib/hooks/useClock";

export default function LiveClock() {
  const time = useClock();
  return <>{time}</>;
}
