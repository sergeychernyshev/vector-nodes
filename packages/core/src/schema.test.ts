import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { VNODES_SCHEMA } from './schema';

// Resolve docs/vnodes.schema.json from this file: src -> core -> packages -> repo root.
const docsSchemaPath = fileURLToPath(new URL('../../../docs/vnodes.schema.json', import.meta.url));

describe('VNODES_SCHEMA', () => {
  it('stays in sync with the canonical docs/vnodes.schema.json', () => {
    const docsSchema = JSON.parse(readFileSync(docsSchemaPath, 'utf8'));
    expect(JSON.parse(JSON.stringify(VNODES_SCHEMA))).toEqual(docsSchema);
  });
});
