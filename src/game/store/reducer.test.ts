/**
 * Equipment interaction tests: hold X, interact with equipment Y → expected(chef, equipment).
 */
import { describe, it, expect } from 'vitest';
import { applyEquipmentInteraction, type Equipment } from './equipment';
import type { CarriedItem } from '../state/types';

type Case = {
  holding: CarriedItem;
  equipment: Equipment;
  expected: (carried: CarriedItem, equipment: Equipment) => boolean;
};

const cases: Case[] = [
  {
    holding: { type: 'nothing' },
    equipment: { type: 'sink_take', sink: { dirtyCount: 0, cleanCount: 3 } },
    expected: (c, e) => c.type === 'clean_plates' && c.count === 3 && e.type === 'sink_take' && e.sink.cleanCount === 0
  },
  {
    holding: { type: 'nothing' },
    equipment: { type: 'sink_take', sink: { dirtyCount: 2, cleanCount: 0 } },
    expected: (c, e) => c.type === 'nothing' && e.sink.cleanCount === 0
  },
  {
    holding: { type: 'clean_plates', count: 2 },
    equipment: { type: 'sink_take', sink: { dirtyCount: 0, cleanCount: 3 } },
    expected: (c, e) => c.type === 'clean_plates' && c.count === 5 && e.sink.cleanCount === 0
  },
  {
    holding: { type: 'dirty_plates', count: 4 },
    equipment: { type: 'sink_wash', sink: { dirtyCount: 1, cleanCount: 2 } },
    expected: (c, e) => c.type === 'nothing' && e.type === 'sink_wash' && e.sink.dirtyCount === 5
  },
  {
    holding: { type: 'nothing' },
    equipment: { type: 'sink_wash', sink: { dirtyCount: 3, cleanCount: 0 } },
    expected: (c, e) => e.sink.dirtyCount === 2 && e.sink.cleanCount === 1
  },
  {
    holding: { type: 'nothing' },
    equipment: { type: 'sink_wash', sink: { dirtyCount: 0, cleanCount: 5 } },
    expected: (c, e) => e.sink.dirtyCount === 0 && e.sink.cleanCount === 5
  },
  {
    holding: { type: 'clean_plates', count: 2 },
    equipment: { type: 'sink_wash', sink: { dirtyCount: 2, cleanCount: 1 } },
    expected: (c) => c.type === 'clean_plates' && c.count === 2
  },
  {
    holding: { type: 'plate', contents: [] },
    equipment: { type: 'cake_box', flavour: 'vanilla' },
    expected: (c) =>
      c.type === 'plate' &&
      c.contents[0]?.type === 'slice' &&
      c.contents[0].flavour === 'vanilla' &&
      !c.contents[0].heated &&
      c.contents[0].heatTime === 3
  },
  {
    holding: { type: 'clean_plates', count: 3 },
    equipment: { type: 'cake_box', flavour: 'vanilla' },
    expected: (c) => c.type === 'clean_plates' && c.count === 3
  },
  {
    holding: { type: 'nothing' },
    equipment: { type: 'cake_box', flavour: 'vanilla' },
    expected: (c) => c.type === 'nothing'
  },
  {
    holding: { type: 'plate', contents: [] },
    equipment: { type: 'cake_box', flavour: 'chocolate' },
    expected: (c) =>
      c.type === 'plate' &&
      c.contents[0]?.type === 'slice' &&
      c.contents[0].flavour === 'chocolate' &&
      c.contents[0].heatTime === 5
  },
  {
    holding: {
      type: 'plate',
      contents: [{ type: 'slice', flavour: 'vanilla', heated: false, heatTime: 3 }]
    },
    equipment: { type: 'cake_box', flavour: 'vanilla' },
    expected: (c) =>
      c.type === 'plate' && c.contents.length === 1 && c.contents[0]?.flavour === 'vanilla'
  },
  {
    holding: {
      type: 'plate',
      contents: [{ type: 'slice', flavour: 'vanilla', heated: false, heatTime: 3 }]
    },
    equipment: { type: 'cake_box', flavour: 'chocolate' },
    expected: (c) =>
      c.type === 'plate' && c.contents.length === 1 && c.contents[0]?.flavour === 'vanilla'
  },
  {
    holding: { type: 'plate', contents: [{ type: 'slice', flavour: 'vanilla', heated: false, heatTime: 3 }] },
    equipment: { type: 'microwave', contents: null, heatProgress: 0, heatTime: 0 },
    expected: (c, e) => c.type === 'nothing' && e.contents?.type === 'plate'
  },
  {
    holding: { type: 'nothing' },
    equipment: {
      type: 'microwave',
      contents: { type: 'plate', contents: [{ type: 'slice', flavour: 'vanilla', heated: true, heatTime: 3 }] },
      heatProgress: 3,
      heatTime: 3
    },
    expected: (c, e) => c.type === 'plate' && e.contents === null
  },
  {
    holding: { type: 'plate', contents: [] },
    equipment: {
      type: 'microwave',
      contents: { type: 'plate', contents: [{ type: 'slice', flavour: 'vanilla', heated: true, heatTime: 3 }] },
      heatProgress: 3,
      heatTime: 3
    },
    expected: (c, e) =>
      c.type === 'plate' && c.contents.length === 0 && e.contents !== null
  },
  {
    holding: { type: 'nothing' },
    equipment: {
      type: 'microwave',
      contents: { type: 'plate', contents: [{ type: 'slice', flavour: 'vanilla', heated: false, heatTime: 3 }] },
      heatProgress: 2,
      heatTime: 3
    },
    expected: (c, e) =>
      c.type === 'nothing' && e.contents?.type === 'plate' && !e.contents.contents[0]?.heated
  },
  {
    holding: { type: 'plate', contents: [{ type: 'slice', flavour: 'vanilla', heated: true, heatTime: 3 }] },
    equipment: { type: 'microwave', contents: null, heatProgress: 0, heatTime: 0 },
    expected: (c, e) => c.type === 'plate' && c.contents[0]?.heated && e.contents === null
  },
  {
    holding: { type: 'plate', contents: [{ type: 'slice', flavour: 'chocolate', heated: true, heatTime: 5 }] },
    equipment: { type: 'delivery', dirtyCount: 0 },
    expected: (c, e) => c.type === 'nothing' && e.dirtyCount === 1
  },
  {
    holding: { type: 'nothing' },
    equipment: { type: 'delivery', dirtyCount: 3 },
    expected: (c, e) => c.type === 'dirty_plates' && c.count === 3 && e.dirtyCount === 0
  },
  {
    holding: { type: 'clean_plates', count: 3 },
    equipment: { type: 'table', contents: null },
    expected: (c, e) =>
      c.type === 'clean_plates' &&
      c.count === 2 &&
      e.contents?.type === 'plate' &&
      e.contents.contents.length === 0
  },
  {
    holding: { type: 'plate', contents: [] },
    equipment: { type: 'table', contents: null },
    expected: (c, e) =>
      c.type === 'nothing' &&
      e.contents?.type === 'plate' &&
      e.contents.contents.length === 0
  },
  {
    holding: { type: 'nothing' },
    equipment: {
      type: 'table',
      contents: { type: 'plate', contents: [{ type: 'slice', flavour: 'vanilla', heated: true, heatTime: 3 }] }
    },
    expected: (c, e) => c.type === 'plate' && e.contents === null
  }
];

describe('applyEquipmentInteraction', () => {
  cases.forEach((c, i) => {
    it(`case ${i + 1}: hold ${JSON.stringify(c.holding)}, ${c.equipment.type}`, () => {
      const { carried, equipment } = applyEquipmentInteraction({ carried: c.holding }, c.equipment);
      expect(c.expected(carried, equipment)).toBe(true);
    });
  });
});
