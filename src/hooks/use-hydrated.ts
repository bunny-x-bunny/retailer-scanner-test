"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the prerendered page and while it hydrates, true once React runs in the browser — which
 * is when the page starts listening to the scanner. Before that, keys go nowhere.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
