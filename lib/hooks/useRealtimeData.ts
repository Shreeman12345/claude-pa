"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

interface UseRealtimeDataOptions<T> {
  table: string;
  /** postgres_changes filter, e.g. `log_date=eq.2026-08-07`. Omit to receive every row change on the table. */
  filter?: string;
  initialData: T;
  fetchData: () => Promise<T>;
  /**
   * Override how change notifications are received. Defaults to a direct
   * Supabase Realtime postgres_changes subscription on `table` (requires an
   * anon-SELECT policy on that table). Pass this for tables that
   * deliberately stay RLS deny-all with no anon exception -- e.g. a
   * server-side SSE proxy that subscribes via the service role and forwards
   * a "something changed" ping to the browser. Receives a callback to fire
   * on each change; must return a cleanup function.
   */
  subscribe?: (onChange: () => void) => () => void;
}

/**
 * Fetches initial data, keeps it in sync via a change subscription (any
 * change triggers a fresh fetchData() call rather than patching from the
 * payload -- simpler and always reconciles with server truth), and exposes
 * mutate() for optimistic-update-then-write interactions.
 *
 * React 18 StrictMode (dev only) mounts effects twice, which fires the
 * mount-time fetch twice -- the first is orphaned with no cleanup tied to
 * it. requestIdRef makes every refetch/mutate carry a sequence number and
 * only apply its result if it's still the most recently issued one, so a
 * late-arriving stale response can never stomp a newer optimistic update
 * regardless of resolution order.
 */
export function useRealtimeData<T>({ table, filter, initialData, fetchData, subscribe }: UseRealtimeDataOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const fetchRef = useRef(fetchData);
  fetchRef.current = fetchData;
  const requestIdRef = useRef(0);

  const refetch = useCallback(() => {
    const id = ++requestIdRef.current;
    fetchRef.current()
      .then((result) => {
        if (id !== requestIdRef.current) return; // superseded by a newer request; discard
        setData(result);
      })
      .catch((err) => console.error(`Failed to load ${table}:`, err));
  }, [table]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (subscribe) {
      return subscribe(() => refetch());
    }

    const channel = supabaseBrowser
      .channel(filter ? `${table}:${filter}` : table)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => refetch()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`${table} realtime subscription failed:`, status);
        }
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [table, filter, refetch, subscribe]);

  const mutate = useCallback((optimisticUpdate: (prev: T) => T, write: () => Promise<T>) => {
    const id = ++requestIdRef.current;
    let previous!: T;
    setData((prev) => {
      previous = prev;
      return optimisticUpdate(prev);
    });

    write()
      .then((result) => {
        if (id !== requestIdRef.current) return; // superseded; a newer op already took over
        setData(result);
      })
      .catch((err) => {
        console.error(`Failed to write ${table}:`, err);
        if (id === requestIdRef.current) setData(previous);
      });
  }, [table]);

  return { data, mutate, refetch };
}
