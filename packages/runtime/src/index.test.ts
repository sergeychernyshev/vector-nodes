import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index';

describe('@vector-nodes/runtime', () => {
  it('exposes its package name', () => {
    expect(PACKAGE_NAME).toBe('@vector-nodes/runtime');
  });
});
