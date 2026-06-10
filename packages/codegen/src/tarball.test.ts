import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBasicRegistry, createGraph } from '@vector-nodes/core';
import { BASIC_OPERATORS, evaluateGraph } from '@vector-nodes/engine';
import { afterAll, describe, expect, it } from 'vitest';

import { generate, generatedPackageJson, RUNTIME_RANGE } from './codegen.js';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const registry = createBasicRegistry();
const npm = (args: string[], cwd: string) =>
  execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

let workDir: string | undefined;
afterAll(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe('packed-tarball conformance', () => {
  it('a generated module runs against the npm-packed runtime and matches the interpreter', () => {
    workDir = mkdtempSync(join(tmpdir(), 'vn-tarball-'));

    // 1. Pack @vector-nodes/runtime (prepack builds dist) into the temp dir.
    const packOut = npm(
      ['pack', '--workspace', '@vector-nodes/runtime', '--pack-destination', workDir, '--json'],
      repoRoot,
    );
    const tarball = join(workDir, (JSON.parse(packOut) as { filename: string }[])[0]!.filename);

    // 2. A clean ESM project that installs the tarball.
    writeFileSync(join(workDir, 'package.json'), '{ "type": "module", "private": true }\n');
    npm(['install', tarball, '--no-audit', '--no-fund'], workDir);

    // 3. Generate a module + its package.json and write them out.
    const graph = createGraph({
      metadata: { name: 'shape' },
      nodes: [
        { id: 'pc', type: 'PointCircle', params: { radius: 2, count: 8 } },
        { id: 'v', type: 'ConstVector', params: { value: [1, 2, 0] } },
        { id: 't', type: 'Translate' },
        { id: 'out', type: 'OutputGeometry' },
      ],
      links: [
        { from: ['pc', 'geometry'], to: ['t', 'geometry'] },
        { from: ['v', 'value'], to: ['t', 'offset'] },
        { from: ['t', 'geometry'], to: ['out', 'geometry'] },
      ],
    });
    const mod = generate(graph, registry);
    expect(mod.runtimeDependency).toEqual({ '@vector-nodes/runtime': RUNTIME_RANGE });
    writeFileSync(join(workDir, `${mod.name}.js`), mod.js);
    writeFileSync(join(workDir, `${mod.name}.package.json`), generatedPackageJson(mod));
    writeFileSync(
      join(workDir, 'run.mjs'),
      `import shape from './${mod.name}.js';\nprocess.stdout.write(JSON.stringify(shape()));\n`,
    );

    // 4. Run it under Node (resolving @vector-nodes/runtime from the installed tarball).
    const out = execFileSync('node', ['run.mjs'], { cwd: workDir, encoding: 'utf8' });
    const compiled = JSON.parse(out);
    const interpreted = evaluateGraph(graph, registry, BASIC_OPERATORS).output.geometry;
    expect(compiled).toEqual(interpreted);
  }, 120_000);
});
