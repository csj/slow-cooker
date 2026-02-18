import type { GameState } from '../state/gameState';
import { advanceOneTurn } from './advance';

export function commitUntilIntervention(state: GameState): void {
  while (true) {
    advanceOneTurn(state);

    const anyChefHasActions = state.chefs.some((c) => c.actionQueue.length > 0);
    const newOrderRevealed = state.orders.some((o) => o.revealTurn === state.currentTurn);

    if (!anyChefHasActions || newOrderRevealed) {
      state.lastCommittedTurn = state.currentTurn;
      break;
    }
  }
}
