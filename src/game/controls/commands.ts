import type { GameState } from '../state/gameState';
import type { Action, Direction } from '../state/types';
import { commitUntilIntervention } from '../sim/commit';

export function queueMove(state: GameState, dir: Direction): void {
  const chef = state.chefs[state.activeChefIndex];
  chef.actionQueue.push({ type: 'Move', dir });
}

export function queuePickUp(state: GameState, dir: Direction): void {
  const chef = state.chefs[state.activeChefIndex];
  chef.actionQueue.push({ type: 'PickUp', dir });
}

export function queueDrop(state: GameState, dir: Direction): void {
  const chef = state.chefs[state.activeChefIndex];
  chef.actionQueue.push({ type: 'Drop', dir });
}

export function queueDo(state: GameState, dir: Direction): void {
  const chef = state.chefs[state.activeChefIndex];
  chef.actionQueue.push({ type: 'Do', dir });
}

export function unwind(state: GameState): void {
  const chef = state.chefs[state.activeChefIndex];
  if (chef.actionQueue.length > 0) {
    chef.actionQueue.pop();
  }
}

export function switchChef(state: GameState): void {
  state.activeChefIndex = (state.activeChefIndex + 1) % state.chefs.length;
}

export function commit(state: GameState): void {
  const anyHasActions = state.chefs.some((c) => c.actionQueue.length > 0);
  if (anyHasActions) {
    commitUntilIntervention(state);
  }
}
