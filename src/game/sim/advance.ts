import type { GameState, StationState } from '../state/gameState';
import type { Action, Direction, CarriedItem } from '../state/types';
import { TILE_SIZE } from '../state/world';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function getTile(state: GameState, x: number, y: number) {
  return state.grid[y]?.[x];
}

function isWalkable(state: GameState, x: number, y: number): boolean {
  const tile = getTile(state, x, y);
  if (!tile) return false;
  return tile.type === 'floor' || tile.type === 'table';
}

function applyMove(state: GameState, chefIndex: number): void {
  const chef = state.chefs[chefIndex];
  const action = chef.actionQueue[0];
  if (action?.type !== 'Move') return;
  const nx = chef.x + DX[action.dir];
  const ny = chef.y + DY[action.dir];
  if (isWalkable(state, nx, ny)) {
    chef.x = nx;
    chef.y = ny;
    chef.facing = action.dir;
  }
  chef.actionQueue.shift();
}

function advanceMicrowave(state: GameState): void {
  const m = state.stationStates.microwave;
  if (m.contents && m.contents.type === 'plate_slice' && !m.contents.heated) {
    m.heatProgress++;
    if (m.heatProgress >= m.heatTime) {
      m.contents = { ...m.contents, heated: true };
    }
  }
}

export function advanceOneTurn(state: GameState): void {
  state.currentTurn++;

  // Advance passive state (microwave)
  advanceMicrowave(state);

  // Apply one action per chef
  for (let i = 0; i < state.chefs.length; i++) {
    const chef = state.chefs[i];
    const action = chef.actionQueue[0];
    if (!action) continue;

    if (action.type === 'Move') {
      applyMove(state, i);
    } else if (action.type === 'PickUp' || action.type === 'Drop' || action.type === 'Do') {
      applyInteraction(state, i, action);
    }
  }
}

function applyInteraction(state: GameState, chefIndex: number, action: Action): void {
  if (action.type === 'Move') return;
  const chef = state.chefs[chefIndex];
  const dx = chef.x + DX[action.dir];
  const dy = chef.y + DY[action.dir];
  const tile = getTile(state, dx, dy);
  if (!tile) {
    chef.actionQueue.shift();
    return;
  }

  const ss = state.stationStates;
  const key = action.type === 'Do' ? 'Do' : action.type === 'PickUp' ? 'E' : 'E';

  // Simplified interaction logic for prototype
  if (tile.type === 'sink') {
    if (chef.carried.type === 'nothing' && ss.sink.cleanCount > 0) {
      chef.carried = { type: 'clean_plate' };
      ss.sink.cleanCount--;
    } else if (chef.carried.type === 'dirty_plates') {
      ss.sink.dirtyCount += chef.carried.count;
      chef.carried = { type: 'nothing' };
    } else if (action.type === 'Do' && ss.sink.dirtyCount > 0) {
      ss.sink.dirtyCount--;
      ss.sink.cleanCount++;
    }
  } else if (tile.type === 'cake_box' && tile.stationId && tile.cakeFlavour) {
    if (chef.carried.type === 'clean_plate') {
      chef.carried = { type: 'plate_slice', flavour: tile.cakeFlavour, heated: false };
    }
  } else if (tile.type === 'microwave') {
    if (chef.carried.type === 'plate_slice' && !chef.carried.heated && ss.microwave.contents === null) {
      ss.microwave.contents = chef.carried;
      chef.carried = { type: 'nothing' };
    } else if (chef.carried.type === 'nothing' && ss.microwave.contents && ss.microwave.contents.type === 'plate_slice' && ss.microwave.contents.heated) {
      chef.carried = ss.microwave.contents;
      ss.microwave.contents = null;
      ss.microwave.heatProgress = 0;
    }
  } else if (tile.type === 'delivery_window') {
    if (chef.carried.type === 'plate_slice' && chef.carried.heated) {
      ss.delivery.dirtyCount++;
      chef.carried = { type: 'nothing' };
    } else if (chef.carried.type === 'nothing' && ss.delivery.dirtyCount > 0) {
      chef.carried = { type: 'dirty_plates', count: ss.delivery.dirtyCount };
      ss.delivery.dirtyCount = 0;
    }
  } else if (tile.type === 'table' && tile.stationId) {
    const tableItem = ss.tables.get(tile.stationId);
    if (chef.carried.type !== 'nothing' && tableItem === null) {
      ss.tables.set(tile.stationId, chef.carried);
      chef.carried = { type: 'nothing' };
    } else if (chef.carried.type === 'nothing' && tableItem) {
      chef.carried = tableItem;
      ss.tables.set(tile.stationId, null);
    }
  }

  chef.facing = action.dir;
  chef.actionQueue.shift();
}
