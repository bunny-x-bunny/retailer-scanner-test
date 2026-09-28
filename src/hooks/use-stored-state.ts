"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Values kept here as well as in `localStorage`, so the page keeps working in a private window or
 * with storage blocked — it only forgets on reload.
 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, raw: string) {
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Blocked or full: the in-memory copy still holds it for this visit.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * State that survives a reload.
 *
 * The static export is prerendered with no storage, so the server snapshot is always `initial`, and
 * the stored value takes over as the page hydrates. `initial` must be stable — a module constant —
 * or every render would produce a new value.
 */
export function useStoredState<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => parse(raw, initial), [raw, initial]);

  const set = useCallback((next: T | ((previous: T) => T)) => {
    const previous = parse(read(key), initial);
    const resolved = typeof next === "function" ? (next as (p: T) => T)(previous) : next;
    write(key, JSON.stringify(resolved));
  }, [key, initial]);

  return [value, set] as const;
}
