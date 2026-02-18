import type { Direction } from '../state/types';

export type GameAction =
  | { type: 'QUEUE_MOVE'; dir: Direction }
  | { type: 'UNWIND' }
  | { type: 'SWITCH_CHEF' }
  | { type: 'COMMIT' }
  | { type: 'COMMIT_UP_TO'; frameIndex: number }
  | { type: 'ADVANCE_TURN' };

export const queueMove = (dir: Direction): GameAction => ({ type: 'QUEUE_MOVE', dir });
export const unwind = (): GameAction => ({ type: 'UNWIND' });
export const switchChef = (): GameAction => ({ type: 'SWITCH_CHEF' });
export const commit = (): GameAction => ({ type: 'COMMIT' });
export const commitUpTo = (frameIndex: number): GameAction => ({ type: 'COMMIT_UP_TO', frameIndex });
