/**
 * Table-driven tests: holding X, moving onto Y → expected(chef, equipment) is true.
 */
import { describe, it, expect } from 'vitest';
import { gameReducer } from './reducer';
import { getCurrentFrame } from './selectors';
import { createTestState, TABLE_IDS } from './createTestState';
import * as actions from './actions';
import type { CarriedItem } from '../state/types';
import type { Frame } from './types';

type Tile = 'sink_take' | 'sink_wash' | 'cake_box' | 'microwave' | 'delivery' | 'table';

// 6x3: row 0 SWVMCD, row 1 floor, row 2 .TT.@.
const TILE_POS: Record<Tile, { x: number; y: number; dir: number }> = {
  sink_take: { x: 0, y: 1, dir: 0 },
  sink_wash: { x: 1, y: 1, dir: 0 },
  cake_box: { x: 2, y: 1, dir: 0 },
  microwave: { x: 3, y: 1, dir: 0 },
  delivery: { x: 5, y: 1, dir: 0 },
  table: { x: 1, y: 1, dir: 2 }
};

export type EquipmentState = Frame['stationStates'];

function run(holding: CarriedItem, moving_onto: Tile, setup?: Partial<EquipmentState>): { holding: CarriedItem; equipment: EquipmentState } {
  const pos = TILE_POS[moving_onto];
  const state = createTestState({
    chef: { x: pos.x, y: pos.y, carried: holding },
    ...setup
  });
  const next = gameReducer(state, actions.queueMove(pos.dir));
  const frame = getCurrentFrame(next);
  return { holding: frame.chefs[0]!.carried, equipment: frame.stationStates };
}

type Case = {
  holding: CarriedItem;
  moving_onto: Tile;
  setup?: Partial<EquipmentState>;
  expected: (h: CarriedItem, eq: EquipmentState) => boolean;
};

const cases: Case[] = [
  { holding: { type: 'nothing' }, moving_onto: 'sink_take', setup: { sink: { dirtyCount: 0, cleanCount: 3 } },
    expected: (h, eq) => h.type === 'clean_plates' && h.count === 3 && eq.sink.cleanCount === 0 },
  { holding: { type: 'nothing' }, moving_onto: 'sink_take', setup: { sink: { dirtyCount: 2, cleanCount: 0 } },
    expected: (h, eq) => h.type === 'nothing' && eq.sink.cleanCount === 0 },
  { holding: { type: 'clean_plates', count: 2 }, moving_onto: 'sink_take', setup: { sink: { dirtyCount: 0, cleanCount: 3 } },
    expected: (h, eq) => h.type === 'clean_plates' && h.count === 5 && eq.sink.cleanCount === 0 },
  { holding: { type: 'dirty_plates', count: 4 }, moving_onto: 'sink_wash', setup: { sink: { dirtyCount: 1, cleanCount: 2 } },
    expected: (h, eq) => h.type === 'nothing' && eq.sink.dirtyCount === 5 },
  { holding: { type: 'nothing' }, moving_onto: 'sink_wash', setup: { sink: { dirtyCount: 3, cleanCount: 0 } },
    expected: (h, eq) => eq.sink.dirtyCount === 2 && eq.sink.cleanCount === 1 },
  { holding: { type: 'nothing' }, moving_onto: 'sink_wash', setup: { sink: { dirtyCount: 0, cleanCount: 5 } },
    expected: (h, eq) => eq.sink.dirtyCount === 0 && eq.sink.cleanCount === 5 },
  { holding: { type: 'clean_plates', count: 2 }, moving_onto: 'sink_wash', setup: { sink: { dirtyCount: 2, cleanCount: 1 } },
    expected: (h, eq) => h.type === 'clean_plates' && h.count === 2 },
  { holding: { type: 'plate', contents: null }, moving_onto: 'cake_box',
    expected: (h, eq) => h.type === 'plate' && h.contents?.slice?.flavour === 'vanilla' && !h.contents.slice.heated },
  { holding: { type: 'clean_plates', count: 3 }, moving_onto: 'cake_box',
    expected: (h, eq) => h.type === 'clean_plates' && h.count === 3 },
  { holding: { type: 'nothing' }, moving_onto: 'cake_box',
    expected: (h, eq) => h.type === 'nothing' },
  { holding: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: false } } }, moving_onto: 'microwave',
    expected: (h, eq) => h.type === 'nothing' && eq.microwave.contents?.type === 'plate' },
  { holding: { type: 'nothing' }, moving_onto: 'microwave', setup: { microwave: { contents: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } }, heatProgress: 4 } },
    expected: (h, eq) => h.type === 'plate' && eq.microwave.contents === null },
  { holding: { type: 'plate', contents: null }, moving_onto: 'microwave', setup: { microwave: { contents: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } } } },
    expected: (h, eq) => h.type === 'plate' && h.contents === null && eq.microwave.contents !== null },
  { holding: { type: 'nothing' }, moving_onto: 'microwave', setup: { microwave: { contents: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: false } } }, heatProgress: 2 } },
    expected: (h, eq) => h.type === 'nothing' && eq.microwave.contents?.type === 'plate' && !(eq.microwave.contents as { contents: { slice: { heated: boolean } } }).contents.slice.heated },
  { holding: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } }, moving_onto: 'microwave',
    expected: (h, eq) => h.type === 'plate' && h.contents?.slice?.heated && eq.microwave.contents === null },
  { holding: { type: 'plate', contents: { slice: { flavour: 'chocolate', heated: true } } }, moving_onto: 'delivery',
    expected: (h, eq) => h.type === 'nothing' && eq.delivery.dirtyCount === 1 },
  { holding: { type: 'nothing' }, moving_onto: 'delivery', setup: { delivery: { dirtyCount: 3 } },
    expected: (h, eq) => h.type === 'dirty_plates' && h.count === 3 && eq.delivery.dirtyCount === 0 },
  { holding: { type: 'clean_plates', count: 3 }, moving_onto: 'table', setup: { tables: { [TABLE_IDS.first]: null } },
    expected: (h, eq) => h.type === 'clean_plates' && h.count === 2 && eq.tables[TABLE_IDS.first]?.type === 'plate' && (eq.tables[TABLE_IDS.first] as { contents: unknown })?.contents === null },
  { holding: { type: 'plate', contents: null }, moving_onto: 'table', setup: { tables: { [TABLE_IDS.first]: null } },
    expected: (h, eq) => h.type === 'nothing' && eq.tables[TABLE_IDS.first]?.type === 'plate' && (eq.tables[TABLE_IDS.first] as { contents: unknown })?.contents === null },
  { holding: { type: 'nothing' }, moving_onto: 'table', setup: { tables: { [TABLE_IDS.first]: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } } } },
    expected: (h, eq) => h.type === 'plate' && eq.tables[TABLE_IDS.first] === null },
];

describe('COMMIT_UP_TO', () => {
  it('commits up to given frame index', () => {
    let state = createTestState({ chef: { x: 4, y: 2, carried: { type: 'nothing' } } });
    state = gameReducer(state, actions.queueMove(1));
    state = gameReducer(state, actions.queueMove(1));
    expect(state.frameStack.length).toBe(3);
    const targetFrame = state.frameStack[1]!;
    const after = gameReducer(state, actions.commitUpTo(1));
    expect(after.frameStack.length).toBe(1);
    expect(getCurrentFrame(after).currentTurn).toBe(targetFrame.currentTurn);
    expect(after.actionSequence).toEqual([]);
  });
});

describe('hold X, move onto Y → expected(h, eq)', () => {
  cases.forEach((c, i) => {
    it(`case ${i + 1}: hold ${JSON.stringify(c.holding)}, onto ${c.moving_onto}`, () => {
      const { holding, equipment } = run(c.holding, c.moving_onto, c.setup);
      expect(c.expected(holding, equipment)).toBe(true);
    });
  });
});
