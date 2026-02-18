import type { GameState, Frame } from './types';

export function getCurrentFrame(state: GameState): Frame {
  return state.frameStack[state.frameStack.length - 1]!;
}

/** The frame to display (during animation) or current frame. */
export function getDisplayFrame(state: GameState): Frame {
  if (state.displayFrameIndex != null && state.frameStack[state.displayFrameIndex]) {
    return state.frameStack[state.displayFrameIndex]!;
  }
  return getCurrentFrame(state);
}
