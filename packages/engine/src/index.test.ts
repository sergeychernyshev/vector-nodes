import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index';

describe('@vector-nodes/engine', () => {
  it('exposes its package name', () => {
    expect(PACKAGE_NAME).toBe('@vector-nodes/engine');
  });
});
