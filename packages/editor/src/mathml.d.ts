import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * MathML intrinsic elements for the Math & Trig formula preview (issue #163).
 * `@types/react` does not yet declare these, so we add the handful we render.
 */
type MathMLProps = DetailedHTMLProps<HTMLAttributes<MathMLElement>, MathMLElement>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLProps;
      mrow: MathMLProps;
      mi: MathMLProps;
      mn: MathMLProps;
      mo: MathMLProps;
      msup: MathMLProps;
    }
  }
}
