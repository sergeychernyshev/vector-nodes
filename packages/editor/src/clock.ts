import { useCallback, useEffect, useState } from 'react';

/**
 * Practical ceiling for preview re-evaluation. The browser drives
 * `requestAnimationFrame` at the display refresh (~60Hz), so ticking faster than
 * this is impossible regardless of the computed master rate.
 */
export const PREVIEW_MAX_FPS = 60;

/** Greatest common divisor (Euclid), on non-negative integers. */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Least common multiple; `0` if either operand is `0`. */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

/**
 * The master tick rate (frames/sec) for a network's Time-node fps values: the
 * LCM of the (rounded, positive) fps so every node's frame boundary lands on a
 * tick — e.g. nodes at 1, 2, and 3 fps tick together at 6 fps — capped at
 * {@link PREVIEW_MAX_FPS}. Returns `0` when there are no timers, so the clock
 * stays idle (issue #138).
 */
export function masterTickFps(fpsValues: readonly number[]): number {
  const fps = fpsValues.map((f) => Math.round(f)).filter((f) => f > 0);
  if (fps.length === 0) return 0;
  const combined = fps.reduce((acc, f) => lcm(acc, f), 1);
  return Math.min(combined, PREVIEW_MAX_FPS);
}

/** A shared animation clock for driving Time nodes in the preview. */
export interface AnimationClock {
  /** Whether the clock is advancing. */
  playing: boolean;
  /** Current time in seconds. */
  time: number;
  /** Start/stop the clock. */
  toggle: () => void;
  /** Reset time to zero (without changing play state). */
  reset: () => void;
}

/**
 * A shared animation clock that advances `time` (seconds) in real time while
 * playing, committing in whole `1 / tickFps` steps so the preview re-evaluates
 * no more often than the network's Time nodes require (issue #138). When
 * `tickFps` is `0` (no Time nodes) the clock never advances.
 */
export function useAnimationClock(tickFps: number): AnimationClock {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!playing || tickFps <= 0 || typeof requestAnimationFrame === 'undefined') return;
    const step = 1 / tickFps;
    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += (now - prev) / 1000;
      prev = now;
      // Commit whole steps only, so `time` is quantized to the master tick rate.
      if (acc >= step) {
        const steps = Math.floor(acc / step);
        acc -= steps * step;
        setTime((t) => t + steps * step);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, tickFps]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const reset = useCallback(() => setTime(0), []);

  return { playing, time, toggle, reset };
}
