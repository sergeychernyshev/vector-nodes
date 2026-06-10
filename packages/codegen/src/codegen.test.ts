import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import {
  generate,
  generatedPackageJson,
  lit,
  RUNTIME_RANGE,
  sanitize,
  tsTypeOf,
} from './codegen.js';
import { mainThreadWrapper, workerClient, workerModule } from './wrappers.js';

const registry = createBasicRegistry();

describe('helpers', () => {
  it('maps socket types to idiomatic TS types', () => {
    expect(tsTypeOf('Float')).toBe('number');
    expect(tsTypeOf('Vector')).toBe('[number, number, number]');
    expect(tsTypeOf('Geometry')).toBe('Geometry');
  });

  it('serializes baked values to source', () => {
    expect(lit(3)).toBe('3');
    expect(lit([1, 0, 0])).toBe('[1, 0, 0]');
    expect(lit('circle')).toBe('"circle"');
    expect(lit(true)).toBe('true');
  });

  it('sanitizes identifiers', () => {
    expect(sanitize('my graph')).toBe('my_graph');
    expect(sanitize('2d')).toBe('_2d');
  });
});

describe('generate', () => {
  const graph = createGraph({
    metadata: { name: 'circle' },
    nodes: [
      { id: 'pc', type: 'PointCircle', params: { radius: 2, count: 8 } },
      { id: 'out', type: 'OutputGeometry' },
    ],
    links: [{ from: ['pc', 'geometry'], to: ['out', 'geometry'] }],
  });

  it('emits a default-export named TS function returning Geometry', () => {
    const mod = generate(graph, registry);
    expect(mod.name).toBe('circle');
    expect(mod.ts).toContain('export default function circle(): Geometry {');
    expect(mod.ts).toContain("from '@vector-nodes/runtime'");
    expect(mod.ts).toContain('circlePoints(2, 8)');
    expect(mod.uses).toContain('circlePoints');
  });

  it('emits a JS target with no type annotations', () => {
    const mod = generate(graph, registry);
    expect(mod.js).toContain('export default function circle() {');
    expect(mod.js).not.toContain(': Geometry');
    expect(mod.js).not.toContain('type Geometry');
  });

  it('pins the runtime dependency and can emit a package.json', () => {
    const mod = generate(graph, registry);
    expect(mod.runtimeDependency).toEqual({ '@vector-nodes/runtime': RUNTIME_RANGE });
    const pkg = JSON.parse(generatedPackageJson(mod));
    expect(pkg.name).toBe('circle');
    expect(pkg.dependencies['@vector-nodes/runtime']).toBe(RUNTIME_RANGE);
  });

  it('derives typed arguments from network parameters', () => {
    const parameterized = createGraph({
      metadata: { name: 'shifted' },
      parameters: [{ id: 'shift', type: 'Vector', default: [0, 0, 0] }],
      nodes: [
        { id: 'pc', type: 'PointCircle' },
        { id: 'p', type: 'ParameterVector', params: { name: 'shift' } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['p', 'value'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const mod = generate(parameterized, registry);
    expect(mod.ts).toContain(
      'export default function shifted(shift: [number, number, number]): Geometry {',
    );
    expect(mod.params).toEqual([{ name: 'shift', tsType: '[number, number, number]' }]);
  });
});

describe('wrappers', () => {
  it('main-thread wrapper re-exports the default', () => {
    expect(mainThreadWrapper('./circle.generated.js')).toContain(
      "export { default } from './circle.generated.js'",
    );
  });

  it('worker module answers messages with the function result', () => {
    expect(workerModule('./circle.generated.js')).toContain('self.onmessage');
    expect(workerModule('./circle.generated.js')).toContain('fn(...args)');
  });

  it('worker client exposes an async same-name function', () => {
    const client = workerClient('circle', './circle.worker.js');
    expect(client).toContain('export default function circle(...args) {');
    expect(client).toContain('new Worker(new URL');
    expect(client).toContain('return new Promise');
  });
});
