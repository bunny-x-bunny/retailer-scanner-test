"use client";

import { useEffect, useRef, useState } from "react";
import { BurstCollector, looksManual } from "@/lib/scanner/bursts";
import { type KeyStroke, strokeOf } from "@/lib/scanner/keys";

const NAVIGATION = new Set([
  "Tab", "Enter", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp",
  "PageDown", "Escape",
]);

const BROWSER_SHORTCUTS = new Set(["r", "p", "+", "-", "=", "0"]);

/**
 * Whether the browser may act on a key.
 *
 * Nothing a scanner types may — its Enter would press the focused button and a Ctrl+J suffix would
 * open the downloads. What is let through is what a person needs: function keys, reload, print and
 * zoom, and moving between the page's controls — but never while a scan is under way.
 */
function letThrough(e: KeyboardEvent, scanUnderWay: boolean): boolean {
  if (/^F\d{1,2}$/.test(e.key)) return true;
  if (scanUnderWay) return false;
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && BROWSER_SHORTCUTS.has(key)) return true;
  if (e.ctrlKey && e.shiftKey && (key === "i" || key === "r")) return true;
  const onControl = e.target instanceof HTMLElement
    && e.target.matches("button, input, summary, select, a[href], [role=slider], [role=switch]");
  return onControl && NAVIGATION.has(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey;
}

/**
 * Listens to every key press on the page and hands each finished scan to `onScan`.
 *
 * Returns whether a scan is being received right now. Listens in the capture phase, so no control
 * on the page sees a scanner's keys before this does.
 */
export function useScanCapture(onScan: (burst: KeyStroke[]) => void): boolean {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    const collector = new BurstCollector();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const deliver = (burst: KeyStroke[]) => {
      if (!looksManual(burst)) onScanRef.current(burst);
    };

    const schedule = () => {
      clearTimeout(timer);
      const due = collector.deadline();
      setReceiving(due !== null);
      if (due === null) return;
      timer = setTimeout(() => {
        const burst = collector.poll(performance.now());
        if (burst) deliver(burst);
        schedule();
      }, Math.max(0, due - performance.now()) + 5);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      if (!letThrough(e, collector.open)) e.preventDefault();
      const previous = collector.push(strokeOf(e));
      if (previous) deliver(previous);
      schedule();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      clearTimeout(timer);
    };
  }, []);

  return receiving;
}
