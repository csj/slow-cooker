import type { Direction } from '../state/types';
import type { AnimatingKind } from './types';

export type GameAction =
  | { type: 'QUEUE_MOVE'; dir: Direction }
  | { type: 'UNWIND' }
  | { type: 'SWITCH_CHEF' }
  | { type: 'COMMIT' }
  | { type: 'COMMIT_UP_TO'; frameIndex: number }
  | { type: 'ADVANCE_TURN' }
  | { type: 'ANIMATION_START'; kind: AnimatingKind; frameIndex: number }
  | { type: 'ANIMATION_STEP'; frameIndex: number }
  | { type: 'ANIMATION_END' };

export const queueMove = (dir: Direction): GameAction => ({ type: 'QUEUE_MOVE', dir });
export const unwind = (): GameAction => ({ type: 'UNWIND' });
export const switchChef = (): GameAction => ({ type: 'SWITCH_CHEF' });
export const commit = (): GameAction => ({ type: 'COMMIT' });
export const commitUpTo = (frameIndex: number): GameAction => ({ type: 'COMMIT_UP_TO', frameIndex });

const STEP_MS = 200;

type Thunk = (dispatch: (a: GameAction) => void, getState: () => import('./types').GameState) => void;

export function startCommitAnimation(): Thunk {
  return (dispatch, getState) => {
    const state = getState();
    if (state.animating) return;
    if (state.frameStack.length <= 1) {
      dispatch(commit());
      return;
    }
    dispatch({ type: 'ANIMATION_START', kind: 'commit', frameIndex: 0 });
    const stackLen = state.frameStack.length;
    let i = 0;
    const step = () => {
      const s = getState();
      if (s.animating !== 'commit') return;
      i++;
      const frame = s.frameStack[i]!;
      const hasNewInfo = frame.orders.some((o) => o.revealTurn === frame.currentTurn);
      dispatch({ type: 'ANIMATION_STEP', frameIndex: i });
      if (hasNewInfo || i === stackLen - 1) {
        dispatch({ type: 'ANIMATION_END' });
        dispatch(commitUpTo(i));
        return;
      }
      setTimeout(step, STEP_MS);
    };
    setTimeout(step, STEP_MS);
  };
}

export function startSwitchChefAnimation(): Thunk {
  return (dispatch, getState) => {
    const state = getState();
    if (state.animating) return;
    dispatch(switchChef());
    if (state.frameStack.length <= 1) return;
    dispatch({ type: 'ANIMATION_START', kind: 'switch_chef', frameIndex: 0 });
    const stackLen = state.frameStack.length;
    let i = 0;
    const step = () => {
      const s = getState();
      if (s.animating !== 'switch_chef') return;
      i++;
      if (i >= stackLen) {
        dispatch({ type: 'ANIMATION_END' });
        return;
      }
      dispatch({ type: 'ANIMATION_STEP', frameIndex: i });
      setTimeout(step, STEP_MS);
    };
    setTimeout(step, STEP_MS);
  };
}
