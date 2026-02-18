import type { GameState, Frame, AnimatingKind } from './types';
import type { GameAction } from './actions';
import type { Direction, CarriedItem } from '../state/types';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

type FrameLike = Pick<Frame, 'grid' | 'stationStates' | 'chefs' | 'currentTurn' | 'lastCommittedTurn' | 'orders'>;

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
  next.currentTurn += 1;

  for (const m of Object.values(next.stationStates.microwaves)) {
    if (m.contents?.type === 'plate' && m.contents.contents.slice && !m.contents.contents.slice.heated) {
      m.heatProgress++;
      if (m.heatProgress >= m.heatTime) {
        m.contents = {
          ...m.contents,
          contents: { slice: { ...m.contents.contents.slice, heated: true } }
        };
      }
    }
  }

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
      applyEquipmentInteraction(next, i, targetTile.type, targetTile.stationId ?? null, targetTile.cakeFlavour);
    }
    chef.actionQueue.shift();
  }

  return next;
}

function applyEquipmentInteraction(
  state: Frame,
  chefIndex: number,
  tileType: string,
  stationId: string | null,
  cakeFlavour?: 'vanilla' | 'chocolate'
): void {
  const chef = state.chefs[chefIndex];
  const ss = state.stationStates;

  if (tileType === 'sink_take' && ss.sink.cleanCount > 0) {
    const current = chef.carried.type === 'clean_plates' ? chef.carried.count
      : chef.carried.type === 'plate' && chef.carried.contents === null ? 1
      : chef.carried.type === 'nothing' ? 0 : -1;
    if (current >= 0) {
      const take = ss.sink.cleanCount;
      ss.sink.cleanCount = 0;
      const total = current + take;
      chef.carried = total === 1 ? { type: 'plate', contents: null } : { type: 'clean_plates', count: total };
    }
  } else if (tileType === 'sink_wash') {
    if (chef.carried.type === 'dirty_plates') {
      ss.sink.dirtyCount += chef.carried.count;
      chef.carried = { type: 'nothing' };
    } else if (chef.carried.type === 'nothing' && ss.sink.dirtyCount > 0) {
      ss.sink.dirtyCount--;
      ss.sink.cleanCount++;
    }
  } else if (tileType === 'cake_box' && cakeFlavour) {
    if ((chef.carried.type === 'plate' && chef.carried.contents === null) || (chef.carried.type === 'clean_plates' && chef.carried.count === 1)) {
      chef.carried = { type: 'plate', contents: { slice: { flavour: cakeFlavour, heated: false } } };
    }
  } else if (tileType === 'microwave' && stationId) {
    const m = ss.microwaves[stationId];
    if (m && chef.carried.type === 'plate' && chef.carried.contents?.slice && !chef.carried.contents.slice.heated && m.contents === null) {
      m.contents = chef.carried;
      chef.carried = { type: 'nothing' };
    } else if (m && chef.carried.type === 'nothing' && m.contents?.type === 'plate' && m.contents.contents.slice?.heated) {
      chef.carried = m.contents;
      m.contents = null;
      m.heatProgress = 0;
    }
  } else if (tileType === 'delivery_window') {
    if (chef.carried.type === 'plate' && chef.carried.contents.slice?.heated) {
      ss.delivery.dirtyCount++;
      chef.carried = { type: 'nothing' };
    } else if (chef.carried.type === 'nothing' && ss.delivery.dirtyCount > 0) {
      chef.carried = { type: 'dirty_plates', count: ss.delivery.dirtyCount };
      ss.delivery.dirtyCount = 0;
    }
  } else if (tileType === 'table' && stationId) {
    const tableItem = ss.tables[stationId] ?? null;
    if (chef.carried.type !== 'nothing' && tableItem === null) {
      if (chef.carried.type === 'clean_plates') {
        if (chef.carried.count > 1) {
          ss.tables[stationId] = { type: 'plate', contents: null };
          chef.carried = { type: 'clean_plates', count: chef.carried.count - 1 };
        } else {
          ss.tables[stationId] = { type: 'plate', contents: null };
          chef.carried = { type: 'nothing' };
        }
      } else {
        ss.tables[stationId] = chef.carried;
        chef.carried = { type: 'nothing' };
      }
    } else if (chef.carried.type === 'nothing' && tableItem) {
      chef.carried = tableItem;
      ss.tables[stationId] = null;
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
      const base = { ...frame, lastCommittedTurn: frame.currentTurn };
      return {
        ...state,
        baseFrame: base,
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
