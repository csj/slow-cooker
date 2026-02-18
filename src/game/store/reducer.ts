import type { GameState, Frame, AnimatingKind } from './types';
import type { GameAction } from './actions';
import type { Direction } from '../state/types';
import { applyEquipmentInteraction, type Equipment } from './equipment';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

type FrameLike = Pick<Frame, 'grid' | 'stationStates' | 'chefs' | 'orders'>;

function getTile(state: FrameLike, x: number, y: number) {
  return state.grid[y]?.[x];
}

const EQUIPMENT_TYPES = ['sink_take', 'sink_wash', 'cake_box', 'microwave', 'delivery_window', 'table'] as const;

function isWalkable(state: FrameLike, x: number, y: number): boolean {
  const tile = getTile(state, x, y);
  if (!tile) return false;
  return tile.type === 'floor';
}

function isEquipment(type: string): boolean {
  return (EQUIPMENT_TYPES as readonly string[]).includes(type);
}

function advanceOneTurn(state: FrameLike): Frame {
  const next = JSON.parse(JSON.stringify(state)) as Frame;

  for (let i = 0; i < next.chefs.length; i++) {
    const chef = next.chefs[i];
    const action = chef.actionQueue[0];
    if (!action || action.type !== 'Move') continue;

    const nx = chef.x + DX[action.dir];
    const ny = chef.y + DY[action.dir];
    const targetTile = getTile(next, nx, ny);

    if (!targetTile) {
      chef.actionQueue.shift();
      continue;
    }

    chef.facing = action.dir;

    if (isWalkable(next, nx, ny)) {
      chef.x = nx;
      chef.y = ny;
    } else if (isEquipment(targetTile.type)) {
      const equipment = buildEquipment(next, targetTile);
      if (equipment) {
        const { carried, equipment: eqOut } = applyEquipmentInteraction(chef, equipment);
        chef.carried = carried;
        writeEquipment(next, targetTile, eqOut);
      }
    }
    chef.actionQueue.shift();
  }

  for (const m of Object.values(next.stationStates.microwaves)) {
    const plate = m.contents?.type === 'plate' ? m.contents : null;
    const food = plate?.contents[0];
    if (food && 'heated' in food && !food.heated) {
      m.heatProgress++;
      if (m.heatProgress >= m.heatTime) {
        const heated = { ...food, heated: true };
        m.contents = {
          ...plate!,
          contents: [heated, ...plate!.contents.slice(1)]
        };
      }
    }
  }

  return next;
}

type TileLike = { type: string; stationId?: string; cakeFlavour?: 'vanilla' | 'chocolate' };

function buildEquipment(state: FrameLike, tile: TileLike): Equipment | null {
  const ss = state.stationStates;
  switch (tile.type) {
    case 'sink_take':
      return { type: 'sink_take', sink: { ...ss.sink } };
    case 'sink_wash':
      return { type: 'sink_wash', sink: { ...ss.sink } };
    case 'cake_box':
      return tile.cakeFlavour ? { type: 'cake_box', flavour: tile.cakeFlavour } : null;
    case 'microwave': {
      const sid = tile.stationId ?? null;
      if (!sid) return null;
      const m = ss.microwaves[sid];
      if (!m) return null;
      const food = m.contents?.type === 'plate' ? m.contents.contents[0] : undefined;
      const heatTime = food && 'heatTime' in food ? (food as { heatTime: number }).heatTime : 0;
      return { type: 'microwave', contents: m.contents, heatProgress: m.heatProgress, heatTime };
    }
    case 'delivery_window':
      return { type: 'delivery', dirtyCount: ss.delivery.dirtyCount };
    case 'table': {
      const sid = tile.stationId ?? null;
      if (!sid) return null;
      return { type: 'table', contents: ss.tables[sid] ?? null };
    }
    default:
      return null;
  }
}

function writeEquipment(state: FrameLike, tile: TileLike, equipment: Equipment): void {
  const ss = state.stationStates;
  switch (equipment.type) {
    case 'sink_take':
    case 'sink_wash':
      ss.sink.dirtyCount = equipment.sink.dirtyCount;
      ss.sink.cleanCount = equipment.sink.cleanCount;
      break;
    case 'microwave': {
      const sid = tile.stationId ?? null;
      if (sid && ss.microwaves[sid]) {
        ss.microwaves[sid]!.contents = equipment.contents;
        ss.microwaves[sid]!.heatProgress = equipment.heatProgress;
        ss.microwaves[sid]!.heatTime = equipment.heatTime;
      }
      break;
    }
    case 'delivery':
      ss.delivery.dirtyCount = equipment.dirtyCount;
      break;
    case 'table': {
      const sid = tile.stationId ?? null;
      if (sid !== null) ss.tables[sid] = equipment.contents;
      break;
    }
  }
}

/** Apply one tick: each chef's tickIndex-th action, in chef order. */
function simulateOneTick(
  frame: Frame,
  chefQueues: { type: string; dir: number }[][],
  tickIndex: number
): Frame {
  const withActions = JSON.parse(JSON.stringify(frame)) as Frame;
  for (let i = 0; i < withActions.chefs.length; i++) {
    const action = chefQueues[i]?.[tickIndex];
    withActions.chefs[i]!.actionQueue = action ? [action] : [];
  }
  return advanceOneTurn(withActions);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const numChefs = state.baseFrame.chefs.length;
  const topFrame = state.frameStack[state.frameStack.length - 1]!;

  switch (action.type) {
    case 'QUEUE_MOVE': {
      const tick = state.displayTick;
      const qa = { type: 'Move' as const, dir: action.dir };
      const queues = state.chefQueues.map((q, i) =>
        i === state.activeChefIndex ? [...q.slice(0, tick), qa] : q
      );
      const prevFrame = state.frameStack[tick] ?? topFrame;
      const nextFrame = simulateOneTick(prevFrame, queues, tick);
      const newStack = state.frameStack.slice(0, tick + 1);
      newStack.push(nextFrame);
      return {
        ...state,
        chefQueues: queues,
        frameStack: newStack,
        displayTick: tick + 1
      };
    }
    case 'UNWIND': {
      const tick = state.displayTick - 1;
      if (tick < state.committedFrameIndex) return state;
      if (state.frameStack.length <= tick + 1) return state;
      const queues = state.chefQueues.map((q, i) =>
        i === state.activeChefIndex ? q.slice(0, -1) : q
      );
      return {
        ...state,
        chefQueues: queues,
        frameStack: state.frameStack.slice(0, -1),
        displayTick: tick
      };
    }
    case 'SWITCH_CHEF':
      return {
        ...state,
        activeChefIndex: (state.activeChefIndex + 1) % numChefs
      };
    case 'COMMIT':
      return state;
    case 'SET_DISPLAY_TICK':
      return { ...state, displayTick: action.frameIndex };
    case 'COMMIT_FINISH': {
      const idx = Math.min(action.frameIndex, state.frameStack.length - 1);
      if (idx < 0) return state;
      const frame = state.frameStack[idx]!;
      return {
        ...state,
        baseFrame: { ...frame },
        committedFrameIndex: idx,
        displayTick: idx,
        displayTickOverride: null,
        animating: null
      };
    }
    case 'SWITCH_CHEF_FINISH':
      return {
        ...state,
        frameStack: state.frameStack.slice(0, action.targetTick + 1),
        displayTick: action.targetTick,
        displayTickOverride: null,
        animating: null
      };
    case 'ADVANCE_TURN':
      return state;
    case 'ANIMATION_STEP':
      return { ...state, displayTickOverride: action.frameIndex };
    case 'ANIMATION_END':
      return { ...state, displayTickOverride: null, animating: null };
    case 'ANIMATION_START':
      return { ...state, displayTickOverride: action.frameIndex, animating: action.kind };
    default:
      return state;
  }
}
