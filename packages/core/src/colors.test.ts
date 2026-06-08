import { describe, expect, it } from 'vitest';

import { SOCKET_COLORS, socketColor } from './colors';
import { SOCKET_TYPES } from './socket-types';

describe('SOCKET_COLORS', () => {
  it('maps every socket type to its canonical Blender hex', () => {
    expect(SOCKET_COLORS).toEqual({
      Float: '#A1A1A1',
      Integer: '#108526',
      Boolean: '#CCA6D6',
      Vector: '#6363C7',
      Color: '#C7C729',
      String: '#70B3FF',
      Geometry: '#00D6A3',
      Matrix: '#ED9E5C',
    });
  });

  it('defines a color for every socket type', () => {
    for (const type of SOCKET_TYPES) {
      expect(SOCKET_COLORS[type]).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('uses unique colors per type', () => {
    const colors = Object.values(SOCKET_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('socketColor', () => {
  it('returns the canonical color for a type', () => {
    expect(socketColor('Vector')).toBe('#6363C7');
    expect(socketColor('Geometry')).toBe('#00D6A3');
  });
});
