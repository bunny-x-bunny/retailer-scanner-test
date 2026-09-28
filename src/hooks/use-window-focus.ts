"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
  };
}

/**
 * Whether key presses reach this page. A scanner types into whatever window has focus, so this is
 * the first thing to check when a scan «does nothing».
 */
export function useWindowFocus() {
  return useSyncExternalStore(subscribe, () => document.hasFocus(), () => true);
}
