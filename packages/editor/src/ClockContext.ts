import { createContext, useContext } from 'react';

/**
 * The shared animation-clock transport, exposed to the global play/pause control
 * and to every Time node's on-card buttons (issue #138). All Time nodes read one
 * clock, so the global button and any node's button toggle the same playback.
 */
export interface ClockApi {
  /** Whether the clock is advancing. */
  playing: boolean;
  /** Current time in seconds. */
  time: number;
  /** Start/stop playback. */
  toggle: () => void;
  /** Reset time to zero. */
  reset: () => void;
  /** Whether the network contains any Time node (transport is meaningful). */
  hasTimers: boolean;
}

const EMPTY: ClockApi = {
  playing: false,
  time: 0,
  toggle: () => {},
  reset: () => {},
  hasTimers: false,
};

export const ClockContext = createContext<ClockApi>(EMPTY);

/** Access the shared animation clock (no-op default outside a provider). */
export function useClock(): ClockApi {
  return useContext(ClockContext);
}
