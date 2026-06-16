import { describe, expect, it } from 'vitest';

import { createGraph, type Graph } from './graph';
import type { NodeDefinition } from './node-definition';
import { NodeRegistry } from './registry';
import {
  assertValidGraph,
  GraphValidationError,
  validateGraph,
  type GraphValidationCode,
} from './validate-graph';

const DEFS: NodeDefinition[] = [
  {
    type: 'Circle',
    inputs: [],
    outputs: [{ name: 'curve', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'Number',
    inputs: [],
    outputs: [{ name: 'value', type: 'Float' }],
    params: [],
  },
  {
    type: 'Translate',
    inputs: [
      { name: 'geometry', type: 'Geometry' },
      { name: 'offset', type: 'Vector' },
    ],
    outputs: [{ name: 'geometry', type: 'Geometry' }],
    params: [],
  },
  {
    type: 'Points',
    inputs: [],
    outputs: [{ name: 'positions', type: 'Vector', isArray: true }],
    params: [],
  },
  {
    type: 'OutputGeometry',
    inputs: [{ name: 'geometry', type: 'Geometry' }],
    outputs: [],
    params: [],
  },
];

function registry(): NodeRegistry {
  return new NodeRegistry(DEFS);
}

function codes(graph: Graph): GraphValidationCode[] {
  return validateGraph(graph, registry()).issues.map((i) => i.code);
}

describe('validateGraph — valid graphs', () => {
  it('accepts a well-formed graph', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['c', 'curve'], to: ['out', 'geometry'] }],
    });
    expect(validateGraph(graph, registry())).toEqual({ valid: true, issues: [] });
  });
});

describe('validateGraph — single-output rule', () => {
  it('flags a missing output node', () => {
    const graph = createGraph({ nodes: [{ id: 'c', type: 'Circle' }] });
    expect(codes(graph)).toContain('missing-output');
  });

  it('flags multiple output nodes', () => {
    const graph = createGraph({
      nodes: [
        { id: 'o1', type: 'OutputGeometry' },
        { id: 'o2', type: 'OutputGeometry' },
      ],
    });
    expect(codes(graph)).toContain('multiple-outputs');
  });
});

describe('validateGraph — structural issues', () => {
  it('flags duplicate node ids', () => {
    const graph = createGraph({
      nodes: [
        { id: 'dup', type: 'Circle' },
        { id: 'dup', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
    });
    expect(codes(graph)).toContain('duplicate-node-id');
  });

  it('flags unknown node types', () => {
    const graph = createGraph({
      nodes: [
        { id: 'x', type: 'Nonexistent' },
        { id: 'out', type: 'OutputGeometry' },
      ],
    });
    expect(codes(graph)).toContain('unknown-node-type');
  });

  it('flags a link to a missing node', () => {
    const graph = createGraph({
      nodes: [{ id: 'out', type: 'OutputGeometry' }],
      links: [{ from: ['ghost', 'curve'], to: ['out', 'geometry'] }],
    });
    expect(codes(graph)).toContain('dangling-link-node');
  });

  it('flags a link to a missing socket', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['c', 'nope'], to: ['out', 'geometry'] }],
    });
    expect(codes(graph)).toContain('dangling-link-socket');
  });

  it('flags two links into the same input', () => {
    const graph = createGraph({
      nodes: [
        { id: 'a', type: 'Circle' },
        { id: 'b', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['a', 'curve'], to: ['out', 'geometry'] },
        { from: ['b', 'curve'], to: ['out', 'geometry'] },
      ],
    });
    expect(codes(graph)).toContain('duplicate-input-link');
  });
});

describe('validateGraph — type compatibility', () => {
  it('flags incompatible socket types', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle' }, // Geometry output
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['c', 'curve'], to: ['t', 'offset'] }, // Geometry → Vector
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(codes(graph)).toContain('type-mismatch');
  });

  it('flags a scalar feeding a Vector — the broadcast is no longer implicit', () => {
    const graph = createGraph({
      nodes: [
        { id: 'n', type: 'Number' }, // Float output
        { id: 't', type: 'Translate' },
        { id: 'c', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['c', 'curve'], to: ['t', 'geometry'] },
        { from: ['n', 'value'], to: ['t', 'offset'] }, // Float → Vector
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(codes(graph)).toContain('type-mismatch');
  });

  it('flags a field connected to a single value', () => {
    const graph = createGraph({
      nodes: [
        { id: 'p', type: 'Points' }, // Vector field output
        { id: 't', type: 'Translate' },
        { id: 'c', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['c', 'curve'], to: ['t', 'geometry'] },
        { from: ['p', 'positions'], to: ['t', 'offset'] }, // field → single
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(codes(graph)).toContain('field-mismatch');
  });
});

describe('validateGraph — cycles', () => {
  it('detects a dependency cycle', () => {
    const graph = createGraph({
      nodes: [
        { id: 'a', type: 'Translate' },
        { id: 'b', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['a', 'geometry'], to: ['b', 'geometry'] },
        { from: ['b', 'geometry'], to: ['a', 'geometry'] },
        { from: ['b', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const result = validateGraph(graph, registry());
    expect(result.issues.some((i) => i.code === 'cycle')).toBe(true);
  });

  it('detects a self-loop', () => {
    const graph = createGraph({
      nodes: [
        { id: 'a', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['a', 'geometry'], to: ['a', 'geometry'] },
        { from: ['a', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    expect(codes(graph)).toContain('cycle');
  });
});

describe('assertValidGraph', () => {
  it('does not throw for a valid graph', () => {
    const graph = createGraph({
      nodes: [
        { id: 'c', type: 'Circle' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['c', 'curve'], to: ['out', 'geometry'] }],
    });
    expect(() => assertValidGraph(graph, registry())).not.toThrow();
  });

  it('throws GraphValidationError carrying issues', () => {
    const graph = createGraph({ nodes: [{ id: 'c', type: 'Circle' }] });
    let error: unknown;
    try {
      assertValidGraph(graph, registry());
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(GraphValidationError);
    expect((error as GraphValidationError).issues.length).toBeGreaterThan(0);
  });
});
