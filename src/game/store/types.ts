import type { Direction, CakeFlavour, CarriedItem } from '../state/types';
import type { QueuedAction } from '../state/types';
import type { WorldTile } from '../state/world';

/** One complete world state - no action queues (always empty in a frame) */
export type Frame = {
  grid: WorldTile[][];
  stationStates: {
    sink: { dirtyCount: number; cleanCount: number };
    cakeBoxes: Record<string, CakeFlavour>;
    microwaves: Record<string, {
      contents: CarriedItem | null;
      heatProgress: number;
      heatTime: number;
    }>;
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

export type AnimatingKind = 'commit' | 'switch_chef';

export type GameState = {
  /** Committed base frame. frameStack[committedFrameIndex] = baseFrame. */
  baseFrame: Frame;
  /** Per-chef queues. Indices match frames. Persist for full game. */
  chefQueues: QueuedAction[][];
  /** Full history. frameStack[t]=state after t ticks. */
  frameStack: Frame[];
  /** Last committed frame index. UNWIND cannot go past this. */
  committedFrameIndex: number;
  activeChefIndex: number;
  displayTick: number;
  /** During animation. null = use displayTick. */
  displayTickOverride: number | null;
  animating: AnimatingKind | null;
};
