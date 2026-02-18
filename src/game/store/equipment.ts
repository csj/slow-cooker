import type { CarriedItem, Food } from '../state/types';

const SLICE_HEAT_TIME: Record<'vanilla' | 'chocolate', number> = { vanilla: 3, chocolate: 5 };

function firstFood(contents: Food[]): Food | undefined {
  return contents[0];
}

function isPlateHeated(contents: Food[]): boolean {
  const f = firstFood(contents);
  return !!f && 'heated' in f && f.heated;
}

export type Equipment =
  | { type: 'sink_take'; sink: { dirtyCount: number; cleanCount: number } }
  | { type: 'sink_wash'; sink: { dirtyCount: number; cleanCount: number } }
  | { type: 'cake_box'; flavour: 'vanilla' | 'chocolate' }
  | {
      type: 'microwave';
      contents: CarriedItem | null;
      heatProgress: number;
      heatTime: number; // from the food inside, not intrinsic
    }
  | { type: 'delivery'; dirtyCount: number }
  | { type: 'table'; contents: CarriedItem | null };

/** Pure: given chef carried state and equipment being interacted with, returns new carried and equipment. */
export function applyEquipmentInteraction(
  chef: { carried: CarriedItem },
  equipment: Equipment
): { carried: CarriedItem; equipment: Equipment } {
  const carried = JSON.parse(JSON.stringify(chef.carried)) as CarriedItem;
  const eq = JSON.parse(JSON.stringify(equipment)) as Equipment;

  if (eq.type === 'sink_take' && eq.sink.cleanCount > 0) {
    const current =
      carried.type === 'clean_plates'
        ? carried.count
        : carried.type === 'plate' && carried.contents === null
          ? 1
          : carried.type === 'nothing'
            ? 0
            : -1;
    if (current >= 0) {
      const take = eq.sink.cleanCount;
      eq.sink.cleanCount = 0;
      const total = current + take;
      return {
        carried: total === 1 ? { type: 'plate', contents: [] } : { type: 'clean_plates', count: total },
        equipment: eq
      };
    }
  } else if (eq.type === 'sink_wash') {
    if (carried.type === 'dirty_plates') {
      eq.sink.dirtyCount += carried.count;
      return { carried: { type: 'nothing' }, equipment: eq };
    }
    if (carried.type === 'nothing' && eq.sink.dirtyCount > 0) {
      eq.sink.dirtyCount--;
      eq.sink.cleanCount++;
      return { carried: { type: 'nothing' }, equipment: eq };
    }
  } else if (eq.type === 'cake_box') {
    if (
      (carried.type === 'plate' && carried.contents.length === 0) ||
      (carried.type === 'clean_plates' && carried.count === 1)
    ) {
      const heatTime = SLICE_HEAT_TIME[eq.flavour];
      return {
        carried: {
          type: 'plate',
          contents: [{ type: 'slice', flavour: eq.flavour, heated: false, heatTime }]
        },
        equipment: eq
      };
    }
  } else if (eq.type === 'microwave') {
    const food = carried.type === 'plate' ? firstFood(carried.contents) : undefined;
    if (
      carried.type === 'plate' &&
      food &&
      'heated' in food &&
      !food.heated &&
      eq.contents === null
    ) {
      eq.contents = carried;
      eq.heatTime = (food as { heatTime: number }).heatTime;
      return { carried: { type: 'nothing' }, equipment: eq };
    }
    if (
      carried.type === 'nothing' &&
      eq.contents?.type === 'plate' &&
      isPlateHeated(eq.contents.contents)
    ) {
      const plate = eq.contents;
      eq.contents = null;
      eq.heatProgress = 0;
      eq.heatTime = 0;
      return { carried: plate, equipment: eq };
    }
  } else if (eq.type === 'delivery') {
    if (carried.type === 'plate' && isPlateHeated(carried.contents)) {
      eq.dirtyCount++;
      return { carried: { type: 'nothing' }, equipment: eq };
    }
    if (carried.type === 'nothing' && eq.dirtyCount > 0) {
      const count = eq.dirtyCount;
      eq.dirtyCount = 0;
      return { carried: { type: 'dirty_plates', count }, equipment: eq };
    }
  } else if (eq.type === 'table') {
    if (carried.type !== 'nothing' && eq.contents === null) {
      if (carried.type === 'clean_plates') {
        if (carried.count > 1) {
          eq.contents = { type: 'plate', contents: [] };
          return { carried: { type: 'clean_plates', count: carried.count - 1 }, equipment: eq };
        }
        eq.contents = { type: 'plate', contents: [] };
        return { carried: { type: 'nothing' }, equipment: eq };
      }
      eq.contents = carried;
      return { carried: { type: 'nothing' }, equipment: eq };
    }
    if (carried.type === 'nothing' && eq.contents) {
      const item = eq.contents;
      eq.contents = null;
      return { carried: item, equipment: eq };
    }
  }

  return { carried, equipment: eq };
}
