/**
 * Builds a GameState for testing. Map: row 0 SWVMCD, row 1 floor, row 2 TTTT.@. Tables st6..st9.
 */
import { createWorldGrid, getChefSpawnPositions } from '../state/world';
import type { GameState, Frame } from './types';
import type { CarriedItem } from '../state/types';

export const TABLE_IDS = { first: 'st2', second: 'st3' } as const;
export const MICROWAVE_IDS = { first: 'st1', second: 'st4' } as const;

const defaultMicrowave = (): { contents: CarriedItem | null; heatProgress: number; heatTime: number } =>
  ({ contents: null, heatProgress: 0, heatTime: 4 });

export function createTestFrame(overrides: {
  chef?: { x: number; y: number; carried: CarriedItem };
  sink?: { dirtyCount: number; cleanCount: number };
  microwaves?: Partial<Record<string, { contents: CarriedItem | null; heatProgress?: number }>>;
  delivery?: { dirtyCount: number };
  tables?: Partial<Record<string, CarriedItem | null>>;
}): Frame {
  const grid = createWorldGrid();
  const cakeBoxes: Record<string, 'vanilla' | 'chocolate'> = {};
  const microwaves: Record<string, { contents: CarriedItem | null; heatProgress: number; heatTime: number }> = {};
  const tables: Record<string, CarriedItem | null> = {};

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      if (tile.stationId) {
        if (tile.type === 'cake_box' && tile.cakeFlavour) {
          cakeBoxes[tile.stationId] = tile.cakeFlavour;
        }
        if (tile.type === 'microwave') {
          const o = overrides.microwaves?.[tile.stationId];
          microwaves[tile.stationId] = {
            ...defaultMicrowave(),
            contents: o?.contents ?? null,
            heatProgress: o?.heatProgress ?? 0
          };
        }
        if (tile.type === 'table') {
          tables[tile.stationId] = null;
        }
      }
    }
  }

  const frame: Frame = {
    grid,
    stationStates: {
      sink: overrides.sink ?? { dirtyCount: 0, cleanCount: 3 },
      cakeBoxes,
      microwaves,
      tables: { ...tables, ...overrides.tables },
      delivery: overrides.delivery ?? { dirtyCount: 0 }
    },
    chefs: getChefSpawnPositions().map(({ x, y }, id) => ({
      id,
      x: id === 0 && overrides.chef?.x !== undefined ? overrides.chef.x : x,
      y: id === 0 && overrides.chef?.y !== undefined ? overrides.chef.y : y,
      facing: 0 as const,
      actionQueue: [],
      carried: id === 0 && overrides.chef?.carried ? overrides.chef.carried : { type: 'nothing' as const }
    })),
    lastCommittedTurn: 0,
    currentTurn: 0,
    orders: []
  };

  return frame;
}

export function createTestState(frameOverrides: Parameters<typeof createTestFrame>[0]): GameState {
  return {
    frameStack: [createTestFrame(frameOverrides)],
    actionSequence: [],
    activeChefIndex: 0,
    displayFrameIndex: null,
    animating: null
  };
}
