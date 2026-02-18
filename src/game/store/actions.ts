import type { Direction } from '../state/types';
import type { AnimatingKind } from './types';
import { getTargetTickForChef } from './selectors';

export type GameAction =
  | { type: 'QUEUE_MOVE'; dir: Direction }
  | { type: 'UNWIND' }
  | { type: 'SWITCH_CHEF' }
  | { type: 'COMMIT' }
  | { type: 'SET_DISPLAY_TICK'; frameIndex: number }
  | { type: 'COMMIT_FINISH'; frameIndex: number }
  | { type: 'SWITCH_CHEF_FINISH'; targetTick: number }
  | { type: 'ADVANCE_TURN' }
  | { type: 'ANIMATION_START'; kind: AnimatingKind; frameIndex: number }
  | { type: 'ANIMATION_STEP'; frameIndex: number }
  | { type: 'ANIMATION_END' };

export const queueMove = (dir: Direction): GameAction => ({ type: 'QUEUE_MOVE', dir });
export const unwind = (): GameAction => ({ type: 'UNWIND' });
export const switchChef = (): GameAction => ({ type: 'SWITCH_CHEF' });
export const commit = (): GameAction => ({ type: 'COMMIT' });

const STEP_MS = 200;

type Thunk = (dispatch: (a: GameAction) => void, getState: () => import('./types').GameState) => void;

export function startCommitAnimation(): Thunk {
  return (dispatch, getState) => {
    const state = getState();
    if (state.animating) return;
    const committed = state.committedFrameIndex;
    const stackLen = state.frameStack.length;

    // Zap to last committed frame if not there
    if (state.displayTick !== committed) {
      dispatch({ type: 'SET_DISPLAY_TICK', frameIndex: committed });
    }

    // Nothing to animate
    if (committed >= stackLen - 1) return;

    const startFrame = committed + 1;
    dispatch({ type: 'ANIMATION_START', kind: 'commit', frameIndex: startFrame });

    let i = startFrame;
    const step = () => {
      const s = getState();
      if (s.animating !== 'commit') return;
      dispatch({ type: 'ANIMATION_STEP', frameIndex: i });
      const frame = s.frameStack[i]!;
      const hasNewInfo = frame.orders.some((o) => o.revealTurn === frame.currentTurn);
      const atEnd = i === stackLen - 1;
      if (hasNewInfo || atEnd) {
        dispatch({ type: 'ANIMATION_END' });
        dispatch({ type: 'COMMIT_FINISH', frameIndex: i });
        return;
      }
      i++;
      setTimeout(step, STEP_MS);
    };
    setTimeout(step, STEP_MS);
  };
}

export function startSwitchChefAnimation(): Thunk {
  return (dispatch, getState) => {
    const state = getState();
    if (state.animating) return;
    const numChefs = state.frameStack[0]!.chefs.length;
    const nextChef = (state.activeChefIndex + 1) % numChefs;
    const current = state.frameStack.length - 1;
    const target = getTargetTickForChef(state, nextChef);
    dispatch(switchChef());
    if (state.frameStack.length <= 1 || current === target) {
      if (current !== target) {
        dispatch({ type: 'SWITCH_CHEF_FINISH', targetTick: target });
      }
      return;
    }
    let i = current;
    const step = () => {
      const s = getState();
      if (s.animating !== 'switch_chef') return;
      i = i < target ? i + 1 : i - 1;
      dispatch({ type: 'ANIMATION_STEP', frameIndex: i });
      if (i === target) {
        dispatch({ type: 'ANIMATION_END' });
        dispatch({ type: 'SWITCH_CHEF_FINISH', targetTick: target });
        return;
      }
      setTimeout(step, STEP_MS);
    };
    dispatch({ type: 'ANIMATION_START', kind: 'switch_chef', frameIndex: i });
    setTimeout(step, STEP_MS);
  };
}
