import { describe, expect, it } from 'vitest';

import { gcd, lcm, masterTickFps, PREVIEW_MAX_FPS } from './clock';

describe('gcd / lcm', () => {
  it('computes gcd', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(7, 1)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
  });

  it('computes lcm, with 0 absorbing', () => {
    expect(lcm(2, 3)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(0, 5)).toBe(0);
  });
});

describe('masterTickFps (issue #138)', () => {
  it('is the LCM of the node fps so every frame boundary lands on a tick', () => {
    // The issue's example: 1, 2, and 3 fps tick together at 6 fps.
    expect(masterTickFps([1, 2, 3])).toBe(6);
    expect(masterTickFps([30, 60])).toBe(60);
    // LCM(24, 60) = 120, clamped to the display ceiling.
    expect(masterTickFps([24, 60])).toBe(PREVIEW_MAX_FPS);
  });

  it('returns 0 when there are no timers, so the clock stays idle', () => {
    expect(masterTickFps([])).toBe(0);
    expect(masterTickFps([0, 0])).toBe(0); // non-positive fps ignored
  });

  it('rounds fractional fps and ignores non-positive values', () => {
    expect(masterTickFps([1.4, 2.6])).toBe(lcm(1, 3)); // → 1 and 3
    expect(masterTickFps([-5, 2])).toBe(2);
  });

  it('caps the rate at the display refresh ceiling', () => {
    // 7 and 11 are coprime → LCM 77, clamped to the ceiling.
    expect(masterTickFps([7, 11])).toBe(PREVIEW_MAX_FPS);
  });
});
