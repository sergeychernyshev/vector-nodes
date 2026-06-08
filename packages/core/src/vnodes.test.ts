import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createGraph } from './graph';
import {
  assertValidVnodes,
  isValidVnodes,
  parseVnodes,
  serializeVnodes,
  validateVnodes,
  VnodesValidationError,
} from './vnodes';

const exampleText = readFileSync(
  fileURLToPath(new URL('./__fixtures__/spiral.vnodes', import.meta.url)),
  'utf8',
);

describe('parse/serialize round-trip', () => {
  it('round-trips the example file losslessly', () => {
    const graph = parseVnodes(exampleText);
    const reparsed = parseVnodes(serializeVnodes(graph));
    expect(reparsed).toEqual(graph);
  });

  it('round-trips a graph built in code', () => {
    const graph = createGraph({
      metadata: { name: 'Built' },
      nodes: [
        { id: 'a', type: 'Circle', params: { radius: 2 } },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [{ from: ['a', 'curve'], to: ['out', 'geometry'] }],
    });
    expect(parseVnodes(serializeVnodes(graph))).toEqual(graph);
  });

  it('serializes pretty JSON with a trailing newline', () => {
    const text = serializeVnodes(createGraph());
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "format": "vector-nodes"');
  });
});

describe('validation', () => {
  it('accepts the example document', () => {
    const value: unknown = JSON.parse(exampleText);
    expect(validateVnodes(value)).toEqual([]);
    expect(isValidVnodes(value)).toBe(true);
  });

  it('rejects a wrong format discriminator with a message', () => {
    const issues = validateVnodes({
      format: 'nope',
      version: '1.0',
      nodes: [],
      links: [],
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.path === '/format')).toBe(true);
  });

  it('rejects a missing required top-level field', () => {
    const issues = validateVnodes({
      format: 'vector-nodes',
      version: '1.0',
      nodes: [],
    });
    expect(issues.some((i) => i.keyword === 'required')).toBe(true);
  });

  it('rejects an unknown socket type in a parameter', () => {
    const issues = validateVnodes({
      format: 'vector-nodes',
      version: '1.0',
      parameters: [{ id: 'x', type: 'Quaternion' }],
      nodes: [],
      links: [],
    });
    expect(issues.some((i) => i.keyword === 'enum')).toBe(true);
  });

  it('rejects additional properties on a node', () => {
    const issues = validateVnodes({
      format: 'vector-nodes',
      version: '1.0',
      nodes: [{ id: 'n1', type: 'Circle', bogus: true }],
      links: [],
    });
    expect(issues.some((i) => i.keyword === 'additionalProperties')).toBe(true);
  });

  it('rejects a malformed version string', () => {
    const issues = validateVnodes({
      format: 'vector-nodes',
      version: 'one',
      nodes: [],
      links: [],
    });
    expect(issues.some((i) => i.path === '/version')).toBe(true);
  });
});

describe('parseVnodes / assertValidVnodes errors', () => {
  it('throws SyntaxError on malformed JSON', () => {
    expect(() => parseVnodes('{ not json')).toThrow(SyntaxError);
  });

  it('throws VnodesValidationError with issues on schema violations', () => {
    let error: unknown;
    try {
      parseVnodes('{"format":"nope","version":"1.0","nodes":[],"links":[]}');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(VnodesValidationError);
    expect((error as VnodesValidationError).issues.length).toBeGreaterThan(0);
    expect((error as VnodesValidationError).message).toContain('Invalid .vnodes');
  });

  it('assertValidVnodes narrows a valid value', () => {
    const value: unknown = JSON.parse(exampleText);
    expect(() => assertValidVnodes(value)).not.toThrow();
  });
});
