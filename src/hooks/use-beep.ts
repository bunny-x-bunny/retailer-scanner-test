"use client";

import { useCallback, useRef } from "react";
import type { Verdict } from "@/lib/scanner/analyze";

/** Frequency and length of each tone: one high chirp, two middling ones, one low buzz. */
const TONES: Record<Verdict, [hz: number, seconds: number][]> = {
  pass: [[1320, 0.09]],
  warn: [[880, 0.08], [880, 0.08]],
  fail: [[196, 0.4]],
};

/**
 * The verdict, out loud. Whoever is scanning is looking at the scanner, not the screen.
 *
 * The audio context is created on first use, inside the key press that finished the scan — a user
 * gesture, which is what browsers require before a page may make a sound.
 */
export function useBeep() {
  const context = useRef<AudioContext | null>(null);

  return useCallback((verdict: Verdict) => {
    try {
      context.current ??= new AudioContext();
      const audio = context.current;
      let at = audio.currentTime;
      for (const [hz, seconds] of TONES[verdict]) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = hz;
        gain.gain.setValueAtTime(0.12, at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(at);
        oscillator.stop(at + seconds);
        at += seconds + 0.06;
      }
    } catch {
      // No audio: the screen still says it.
    }
  }, []);
}
