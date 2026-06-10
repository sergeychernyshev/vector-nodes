import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertValidGraph, createBasicRegistry, parseVnodes } from '@vector-nodes/core';
import { BASIC_OPERATORS, evaluateGraph } from '@vector-nodes/engine';
import * as runtime from '@vector-nodes/runtime';
import { describe, expect, it } from 'vitest';

import { generate } from './codegen.js';

const examplesDir = fileURLToPath(new URL('../../../examples', import.meta.url));
const files = readdirSync(examplesDir).filter((f) => f.endsWith('.vnodes'));
const registry = createBasicRegistry();
const rt = runtime as unknown as Record<string, unknown>;

describe('example networks', () => {
  it('there is at least one example', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files)('%s', (file) => {
    const graph = parseVnodes(readFileSync(`${examplesDir}/${file}`, 'utf8'));

    it('is a valid graph', () => {
      expect(() => assertValidGraph(graph, registry)).not.toThrow();
    });

    it('compiled output equals interpreter output', () => {
      const args = graph.parameters.map((p) => p.default);
      const params = Object.fromEntries(graph.parameters.map((p) => [p.id, p.default]));
      const mod = generate(graph, registry);
      const fn = new Function(...mod.uses, ...mod.params.map((p) => p.name), mod.body) as (
        ...a: unknown[]
      ) => unknown;
      const compiled = fn(...mod.uses.map((u) => rt[u]), ...args);
      const interpreted = evaluateGraph(graph, registry, BASIC_OPERATORS, params).output.geometry;
      expect(compiled).toEqual(interpreted);
    });
  });
});
