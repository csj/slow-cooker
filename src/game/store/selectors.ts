import type { GameState, Frame } from './types';

export function getCurrentFrame(state: GameState): Frame {
  return state.frameStack[state.frameStack.length - 1]!;
}

/** Target tick when switching to chef = last frame with no planned action. Chef with no actions → 0. */
export function getTargetTickForChef(state: GameState, chefIndex: number): number {
  const q = state.chefQueues[chefIndex];
  if (!q || q.length === 0) return 0;
  return q.length;
}

/** The frame to display (during animation) or current. */
export function getDisplayFrame(state: GameState): Frame {
  const tick = state.displayTickOverride ?? state.displayTick;
  return state.frameStack[Math.min(tick, state.frameStack.length - 1)]!;
}
