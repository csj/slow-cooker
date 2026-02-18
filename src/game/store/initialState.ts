import { createWorldGrid, getChefSpawnPositions } from '../state/world';
import type { GameState, Frame } from './types';

function createBaseFrame(): Frame {
  const grid = createWorldGrid();
  const cakeBoxes: Record<string, 'vanilla' | 'chocolate'> = {};
  const tables: Record<string, import('../state/types').CarriedItem | null> = {};

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      if (tile.stationId) {
        if (tile.type === 'cake_box' && tile.cakeFlavour) {
          cakeBoxes[tile.stationId] = tile.cakeFlavour;
        }
        if (tile.type === 'table') {
          tables[tile.stationId] = null;
        }
      }
    }
  }

  return {
    grid,
    stationStates: {
      sink: { dirtyCount: 0, cleanCount: 3 },
      cakeBoxes,
      microwave: { contents: null, heatProgress: 0, heatTime: 4 },
      tables,
      delivery: { dirtyCount: 0 }
    },
    chefs: getChefSpawnPositions().map(({ x, y }, id) => ({
      id,
      x,
      y,
      facing: 0 as const,
      actionQueue: [],
      carried: { type: 'nothing' as const }
    })),
    lastCommittedTurn: 0,
    currentTurn: 0,
    orders: []
  };
}

export function createInitialState(): GameState {
  return {
    frameStack: [createBaseFrame()],
    actionSequence: [],
    activeChefIndex: 0
  };
}
