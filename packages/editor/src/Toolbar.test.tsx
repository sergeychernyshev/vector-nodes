// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  it('renders the product name and node count', () => {
    const { container } = render(<Toolbar nodeCount={3} />);
    expect(container.textContent).toContain('Vector Nodes');
    expect(container.querySelector('[data-testid="node-count"]')?.textContent).toBe('3 nodes');
  });
});
