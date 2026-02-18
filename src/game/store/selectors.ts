import type { GameState, Frame } from './types';

export function getCurrentFrame(state: GameState): Frame {
  return state.frameStack[state.frameStack.length - 1]!;
}
