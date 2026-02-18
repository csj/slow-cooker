/**
 * Table-driven tests: holding X, moving onto Y → expected(chef, equipment) is true.
 */
import { describe, it, expect } from 'vitest';
import { gameReducer } from './reducer';
import { getCurrentFrame } from './selectors';
import { createTestState, TABLE_IDS, MICROWAVE_IDS } from './createTestState';
import * as actions from './actions';
import type { CarriedItem } from '../state/types';
import type { Frame } from './types';

type Tile = 'sink_take' | 'sink_wash' | 'cake_box' | 'microwave' | 'delivery' | 'table';

// Map: row 0 V..M..T, row 1 T.@M@.T, row 2 T..S..T, row 3 C.TW..D
const TILE_POS: Record<Tile, { x: number; y: number; dir: number }> = {
  sink_take: { x: 3, y: 1, dir: 2 },
  sink_wash: { x: 3, y: 2, dir: 2 },
  cake_box: { x: 1, y: 0, dir: 3 },
  microwave: { x: 2, y: 0, dir: 1 },
  delivery: { x: 6, y: 2, dir: 2 },
  table: { x: 1, y: 1, dir: 3 }
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
    expected: (h, eq) => h.type === 'nothing' && eq.microwaves[MICROWAVE_IDS.first]?.contents?.type === 'plate' },
  { holding: { type: 'nothing' }, moving_onto: 'microwave', setup: { microwaves: { [MICROWAVE_IDS.first]: { contents: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } }, heatProgress: 4 } } },
    expected: (h, eq) => h.type === 'plate' && eq.microwaves[MICROWAVE_IDS.first]?.contents === null },
  { holding: { type: 'plate', contents: null }, moving_onto: 'microwave', setup: { microwaves: { [MICROWAVE_IDS.first]: { contents: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } } } } },
    expected: (h, eq) => h.type === 'plate' && h.contents === null && eq.microwaves[MICROWAVE_IDS.first]?.contents !== null },
  { holding: { type: 'nothing' }, moving_onto: 'microwave', setup: { microwaves: { [MICROWAVE_IDS.first]: { contents: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: false } } }, heatProgress: 2 } } },
    expected: (h, eq) => h.type === 'nothing' && eq.microwaves[MICROWAVE_IDS.first]?.contents?.type === 'plate' && !(eq.microwaves[MICROWAVE_IDS.first]!.contents as { contents: { slice: { heated: boolean } } }).contents.slice.heated },
  { holding: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } }, moving_onto: 'microwave',
    expected: (h, eq) => h.type === 'plate' && h.contents?.slice?.heated && eq.microwaves[MICROWAVE_IDS.first]?.contents === null },
  { holding: { type: 'plate', contents: { slice: { flavour: 'chocolate', heated: true } } }, moving_onto: 'delivery',
    expected: (h, eq) => h.type === 'nothing' && eq.delivery.dirtyCount === 1 },
  { holding: { type: 'nothing' }, moving_onto: 'delivery', setup: { delivery: { dirtyCount: 3 } },
    expected: (h, eq) => h.type === 'dirty_plates' && h.count === 3 && eq.delivery.dirtyCount === 0 },
  { holding: { type: 'clean_plates', count: 3 }, moving_onto: 'table', setup: { tables: { [TABLE_IDS.second]: null } },
    expected: (h, eq) => h.type === 'clean_plates' && h.count === 2 && eq.tables[TABLE_IDS.second]?.type === 'plate' && (eq.tables[TABLE_IDS.second] as { contents: unknown })?.contents === null },
  { holding: { type: 'plate', contents: null }, moving_onto: 'table', setup: { tables: { [TABLE_IDS.second]: null } },
    expected: (h, eq) => h.type === 'nothing' && eq.tables[TABLE_IDS.second]?.type === 'plate' && (eq.tables[TABLE_IDS.second] as { contents: unknown })?.contents === null },
  { holding: { type: 'nothing' }, moving_onto: 'table', setup: { tables: { [TABLE_IDS.second]: { type: 'plate', contents: { slice: { flavour: 'vanilla', heated: true } } } } },
    expected: (h, eq) => h.type === 'plate' && eq.tables[TABLE_IDS.second] === null },
];

describe('hold X, move onto Y → expected(h, eq)', () => {
  cases.forEach((c, i) => {
    it(`case ${i + 1}: hold ${JSON.stringify(c.holding)}, onto ${c.moving_onto}`, () => {
      const { holding, equipment } = run(c.holding, c.moving_onto, c.setup);
      expect(c.expected(holding, equipment)).toBe(true);
    });
  });
});
