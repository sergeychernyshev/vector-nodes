import { createBasicRegistry, createGraph, socketColor } from '@vector-nodes/core';
import { describe, expect, it } from 'vitest';

import {
  canAddNode,
  createFlowNode,
  filterPalette,
  graphToFlowEdges,
  graphToFlowNodes,
  hasOutputNode,
  paletteItems,
  resolveAddableDef,
  socketClassName,
  socketsOf,
  socketStyle,
  VNODE_TYPE,
} from './flow';

const registry = createBasicRegistry();

const graph = createGraph({
  nodes: [
    { id: 'pa', type: 'PointCircle', position: [10, 20] },
    { id: 'out', type: 'OutputGeometry' },
  ],
  links: [{ from: ['pa', 'geometry'], to: ['out', 'geometry'] }],
});

describe('graphToFlowNodes', () => {
  it('maps id, type, position, label, and sockets', () => {
    const [pa, out] = graphToFlowNodes(graph, registry);
    expect(pa).toMatchObject({
      id: 'pa',
      type: VNODE_TYPE,
      position: { x: 10, y: 20 },
      data: { label: 'Point Circle', nodeType: 'PointCircle' },
    });
    // PointCircle exposes a geometry output and a field "points" output.
    expect(pa!.data.outputs).toEqual([
      { name: 'geometry', type: 'Geometry', isArray: false },
      { name: 'points', type: 'Vector', isArray: true },
    ]);
    expect(out!.data.inputs).toEqual([{ name: 'geometry', type: 'Geometry', isArray: false }]);
  });

  it('carries input socket defaults and per-instance input defaults (issue #23)', () => {
    const [t] = graphToFlowNodes(
      createGraph({
        nodes: [{ id: 't', type: 'Translate', inputDefaults: { offset: [9, 0, 0] } }],
      }),
      registry,
    );
    // Definition default surfaces on the socket…
    expect(t!.data.inputs.find((s) => s.name === 'offset')?.default).toEqual([0, 0, 0]);
    // …and the per-instance override is carried in data.inputDefaults.
    expect(t!.data.inputDefaults).toEqual({ offset: [9, 0, 0] });
  });
});

describe('socketsOf', () => {
  it('defaults isArray to false and preserves field flags', () => {
    const def = registry.require('PointCircle');
    const { outputs } = socketsOf(def);
    expect(outputs.find((s) => s.name === 'points')?.isArray).toBe(true);
    expect(outputs.find((s) => s.name === 'geometry')?.isArray).toBe(false);
  });
});

describe('socket styling', () => {
  it('colors a socket by its Blender type color', () => {
    expect(socketStyle({ name: 'g', type: 'Geometry', isArray: false })).toEqual({
      background: socketColor('Geometry'),
    });
  });

  it('marks field sockets with a modifier class', () => {
    expect(socketClassName({ name: 'p', type: 'Vector', isArray: false })).toBe('vnode__handle');
    expect(socketClassName({ name: 'p', type: 'Vector', isArray: true })).toBe(
      'vnode__handle vnode__handle--field',
    );
  });
});

describe('graphToFlowEdges', () => {
  it('maps endpoints to source/target with socket handles', () => {
    expect(graphToFlowEdges(graph)).toEqual([
      {
        id: 'e0',
        source: 'pa',
        sourceHandle: 'geometry',
        target: 'out',
        targetHandle: 'geometry',
      },
    ]);
  });
});

describe('createFlowNode', () => {
  it('builds a node with default params and sockets', () => {
    const node = createFlowNode(registry.require('Translate'), { x: 5, y: 6 }, 'n1');
    expect(node).toMatchObject({
      id: 'n1',
      type: VNODE_TYPE,
      position: { x: 5, y: 6 },
      data: { nodeType: 'Translate', label: 'Translate' },
    });
    expect(node.data.inputs.map((s) => s.name)).toEqual(['geometry', 'offset']);
  });
});

describe('single-output rule', () => {
  const withOutput = graphToFlowNodes(
    createGraph({ nodes: [{ id: 'out', type: 'OutputGeometry' }] }),
    registry,
  );
  const withoutOutput = graphToFlowNodes(
    createGraph({ nodes: [{ id: 'pa', type: 'PointCircle' }] }),
    registry,
  );

  it('detects an existing output node', () => {
    expect(hasOutputNode(withOutput)).toBe(true);
    expect(hasOutputNode(withoutOutput)).toBe(false);
  });

  it('blocks adding a second OutputGeometry with a reason', () => {
    const res = canAddNode('OutputGeometry', withOutput);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/only be one/i);
  });

  it('allows the first OutputGeometry and other nodes', () => {
    expect(canAddNode('OutputGeometry', withoutOutput).ok).toBe(true);
    expect(canAddNode('PointCircle', withOutput).ok).toBe(true);
  });
});

describe('resolveAddableDef', () => {
  it('returns a registry definition with no meta to add', () => {
    const { def, metaToAdd } = resolveAddableDef('Translate', registry, {});
    expect(def?.type).toBe('Translate');
    expect(metaToAdd).toBeUndefined();
  });

  it('resolves a library-only meta-node and reports the entry to register', () => {
    const library = {
      Group: { interface: { inputs: [], outputs: [] }, nodes: [], links: [] },
    };
    const { def, metaToAdd } = resolveAddableDef('Meta:Group', registry, library);
    expect(def?.type).toBe('Meta:Group');
    expect(metaToAdd).toEqual(['Group', library.Group]);
  });

  it('returns nothing for an unknown type', () => {
    expect(resolveAddableDef('Nope', registry, {})).toEqual({});
  });
});

describe('palette', () => {
  it('lists every definition, sorted by category then label', () => {
    const items = paletteItems(registry);
    expect(items.length).toBe(registry.size);
    const categories = items.map((i) => i.category);
    expect([...categories]).toEqual([...categories].sort());
  });

  it('filters by label, type, or category (case-insensitive)', () => {
    const items = paletteItems(registry);
    expect(filterPalette(items, 'bezier').map((i) => i.type)).toEqual(['BezierCurve']);
    expect(filterPalette(items, 'GEOMETRY').length).toBeGreaterThan(0);
    expect(filterPalette(items, '')).toHaveLength(items.length);
    expect(filterPalette(items, 'zzz-nope')).toHaveLength(0);
  });
});
