import { Scene } from 'phaser';
import { store } from '../store';
import * as actions from '../store/actions';
import { getDisplayFrame } from '../store/selectors';
import { TILE_SIZE } from '../state/world';
import type { Direction } from '../state/types';

export class GameScene extends Scene {
  private unsubscribe!: () => void;

  constructor() {
    super('GameScene');
  }

  create() {
    this.unsubscribe = store.subscribe(() => this.render(store.getState()));
    this.render(store.getState());
    this.setupInput();
  }

  private setupInput() {
    const keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,TAB,BACKSPACE,SPACE') as Phaser.Types.Input.Keyboard.CursorKeys & {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
      TAB: Phaser.Input.Keyboard.Key;
      BACKSPACE: Phaser.Input.Keyboard.Key;
      SPACE: Phaser.Input.Keyboard.Key;
    };

    keys.W?.on('down', () => this.dispatchDir(0));
    keys.S?.on('down', () => this.dispatchDir(2));
    keys.A?.on('down', () => this.dispatchDir(3));
    keys.D?.on('down', () => this.dispatchDir(1));

    keys.UP?.on('down', () => this.dispatchDir(0));
    keys.DOWN?.on('down', () => this.dispatchDir(2));
    keys.LEFT?.on('down', () => this.dispatchDir(3));
    keys.RIGHT?.on('down', () => this.dispatchDir(1));

    keys.TAB?.on('down', () => store.dispatch(actions.startSwitchChefAnimation()));
    keys.BACKSPACE?.on('down', () => store.dispatch(actions.unwind()));
    keys.SPACE?.on('down', () => store.dispatch(actions.startCommitAnimation()));
  }

  private dispatchDir(dir: Direction) {
    store.dispatch(actions.queueMove(dir));
  }

  private render(state: ReturnType<typeof store.getState>) {
    this.children.removeAll(true);
    const frame = getDisplayFrame(state);

    const ox = 64;
    const oy = 64;

    for (let y = 0; y < frame.grid.length; y++) {
      for (let x = 0; x < frame.grid[y].length; x++) {
        const tile = frame.grid[y][x];
        const px = ox + x * TILE_SIZE;
        const py = oy + y * TILE_SIZE;

        const bg = tile.type === 'wall' ? 0x1a1a2e : 0x3d5a4c;
        this.add.rectangle(px, py, TILE_SIZE - 2, TILE_SIZE - 2, bg).setOrigin(0);

        if (tile.type !== 'floor' && tile.type !== 'wall') {
          const label = this.tileLabel(tile);
          const stateLabel = this.equipmentStateLabel(tile, frame);
          this.add.text(px + TILE_SIZE / 2, py + TILE_SIZE / 2 - 6, label, {
            fontSize: '18px',
            color: '#eee'
          }).setOrigin(0.5);
          if (stateLabel) {
            this.add.text(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 10, stateLabel, {
              fontSize: '11px',
              color: '#aaa'
            }).setOrigin(0.5);
          }
        }
      }
    }

    for (const chef of frame.chefs) {
      const px = ox + chef.x * TILE_SIZE + TILE_SIZE / 2;
      const py = oy + chef.y * TILE_SIZE + TILE_SIZE / 2;
      const active = frame.chefs.indexOf(chef) === state.activeChefIndex;
      this.add.circle(px, py, TILE_SIZE / 3, active ? 0xff6b6b : 0x4ecdc4);
      this.add.text(px, py + TILE_SIZE / 4, String(chef.id + 1), {
        fontSize: '14px',
        color: '#fff'
      }).setOrigin(0.5);
      this.add.text(px, py - 20, this.carriedLabel(chef.carried), {
        fontSize: '12px',
        color: '#fff'
      }).setOrigin(0.5);
    }

    this.add.text(16, 16, `Turn: ${frame.currentTurn} | Committed: ${frame.lastCommittedTurn}`, {
      fontSize: '16px',
      color: '#fff'
    });
  }

  private tileLabel(tile: { type: string; cakeFlavour?: 'vanilla' | 'chocolate' }): string {
    if (tile.type === 'cake_box') return tile.cakeFlavour === 'vanilla' ? 'V' : 'C';
    const map: Record<string, string> = {
      sink_take: 'S',
      sink_wash: 'W',
      microwave: 'M',
      delivery_window: 'D',
      table: 'T'
    };
    return map[tile.type] ?? '?';
  }

  private equipmentStateLabel(
    tile: { type: string; stationId?: string },
    frame: { stationStates: import('../store/types').Frame['stationStates'] }
  ): string {
    const ss = frame.stationStates;
    if (tile.type === 'sink_take') return ss.sink.cleanCount > 0 ? `${ss.sink.cleanCount}` : '';
    if (tile.type === 'sink_wash') return ss.sink.dirtyCount > 0 ? `${ss.sink.dirtyCount}` : '';
    if (tile.type === 'microwave' && tile.stationId) {
      const m = ss.microwaves[tile.stationId];
      if (!m) return '';
      const c = m.contents;
      if (!c) return '';
      if (c.type === 'plate' && c.contents?.slice) {
        if (c.contents.slice.heated) return '✓';
        return `${m.heatProgress}/${m.heatTime}`;
      }
      return '';
    }
    if (tile.type === 'delivery_window') return ss.delivery.dirtyCount > 0 ? `${ss.delivery.dirtyCount}` : '';
    if (tile.type === 'table' && tile.stationId) {
      const item = ss.tables[tile.stationId];
      if (!item) return '';
      if (item.type === 'plate') return item.contents?.slice ? `${item.contents.slice.flavour[0]}${item.contents.slice.heated ? '+' : ''}` : '1';
      if (item.type === 'clean_plates') return `${item.count}`;
      return '';
    }
    return '';
  }

  private carriedLabel(c: import('../state/types').CarriedItem): string {
    if (c.type === 'nothing') return '';
    if (c.type === 'clean_plates') return `plate x${c.count}`;
    if (c.type === 'plate') return c.contents?.slice ? `${c.contents.slice.flavour[0]}${c.contents.slice.heated ? '+' : ''}` : 'plate';
    if (c.type === 'dirty_plates') return `dirty x${c.count}`;
    return '?';
  }

  destroy() {
    this.unsubscribe?.();
    super.destroy();
  }
}
