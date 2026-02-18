import type { Chef, CarriedItem, CakeFlavour } from './types';
import { createWorldGrid, type WorldTile } from './world';

export type StationState = {
  sink: { dirtyCount: number; cleanCount: number };
  cakeBoxes: Map<string, CakeFlavour>; // stationId -> flavour
  microwave: {
    contents: CarriedItem | null;
    heatProgress: number;
    heatTime: number;
  };
  tables: Map<string, CarriedItem | null>; // stationId -> item
  delivery: { dirtyCount: number };
};

export function createGameState() {
  const grid = createWorldGrid();
  const stationStates: StationState = {
    sink: { dirtyCount: 0, cleanCount: 5 },
    cakeBoxes: new Map(),
    microwave: { contents: null, heatProgress: 0, heatTime: 4 },
    tables: new Map(),
    delivery: { dirtyCount: 0 }
  };

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      if (tile.stationId) {
        if (tile.type === 'cake_box' && tile.cakeFlavour) {
          stationStates.cakeBoxes.set(tile.stationId, tile.cakeFlavour);
        }
        if (tile.type === 'table') {
          stationStates.tables.set(tile.stationId, null);
        }
      }
    }
  }

  const chef: Chef = {
    id: 0,
    x: 5,
    y: 4,
    facing: 0,
    actionQueue: [],
    carried: { type: 'nothing' }
  };

  return {
    grid,
    stationStates,
    chefs: [chef],
    lastCommittedTurn: 0,
    currentTurn: 0,
    activeChefIndex: 0,
    orders: [] as { id: string; revealTurn: number; requirements: string }[]
  };
}

export type GameState = ReturnType<typeof createGameState>;
