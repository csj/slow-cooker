import type { Direction, CakeFlavour, CarriedItem } from '../state/types';
import type { QueuedAction } from '../state/types';
import type { WorldTile } from '../state/world';

/** One complete world state - no action queues (always empty in a frame) */
export type Frame = {
  grid: WorldTile[][];
  stationStates: {
    sink: { dirtyCount: number; cleanCount: number };
    cakeBoxes: Record<string, CakeFlavour>;
    microwave: {
      contents: CarriedItem | null;
      heatProgress: number;
      heatTime: number;
    };
    tables: Record<string, CarriedItem | null>;
    delivery: { dirtyCount: number };
  };
  chefs: Array<{
    id: number;
    x: number;
    y: number;
    facing: Direction;
    actionQueue: Array<{ type: string; dir: Direction }>;
    carried: CarriedItem;
  }>;
  lastCommittedTurn: number;
  currentTurn: number;
  orders: Array<{ id: string; revealTurn: number; requirements: string }>;
};

export type GameState = {
  /** Stack of complete world frames. Top = current planning state. */
  frameStack: Frame[];
  /** Sequence of queued actions (for display). Parallel to frameStack growth. */
  actionSequence: QueuedAction[];
  activeChefIndex: number;
};
