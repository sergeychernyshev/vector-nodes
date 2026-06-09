// @vitest-environment jsdom
import { emptyGeometry } from '@vector-nodes/runtime';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PreviewPane } from './PreviewPane';

afterEach(cleanup);

describe('PreviewPane', () => {
  it('shows the geometry summary counts', () => {
    const geometry = {
      ...emptyGeometry(),
      points: [
        [0, 0, 0],
        [1, 0, 0],
      ] as [number, number, number][],
    };
    const { getByTestId } = render(<PreviewPane result={{ geometry }} />);
    expect(getByTestId('preview-points').textContent).toBe('2');
    expect(getByTestId('preview-curves').textContent).toBe('0');
    expect(getByTestId('preview-meshes').textContent).toBe('0');
  });

  it('shows an error message when evaluation failed', () => {
    const { getByRole } = render(<PreviewPane result={{ error: 'boom' }} />);
    expect(getByRole('alert').textContent).toBe('boom');
  });
});
