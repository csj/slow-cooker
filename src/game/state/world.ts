import type { TileType, CakeFlavour } from './types';

export type StationId = string;

export type WorldTile = {
  type: TileType;
  stationId?: StationId;
  cakeFlavour?: CakeFlavour;
};

// 6x3: row 0 = SWVMCD, row 1 = floor, row 2 = tables + chef
const MAP_ASCII = [
  'V..M..T',
  'T.@S@.T',
  'T.TW..T',
  'C..M..D'
];

export const TILE_SIZE = 48;
export const GRID_W = 6;
export const GRID_H = 3;

const CHAR_TO_TILE: Record<string, TileType> = {
  '.': 'floor',
  '@': 'floor',
  '#': 'wall',
  'S': 'sink_take',
  'W': 'sink_wash',
  'V': 'cake_box',
  'M': 'microwave',
  'C': 'cake_box',
  'D': 'delivery_window',
  'T': 'table',
  ' ': 'floor'
};

export function createWorldGrid(): WorldTile[][] {
  const grid: WorldTile[][] = [];
  let stationIndex = 0;
  for (let y = 0; y < MAP_ASCII.length; y++) {
    const row: WorldTile[] = [];
    const line = MAP_ASCII[y];
    for (let x = 0; x < line.length; x++) {
      const ch = line[x] ?? '.';
      const type = CHAR_TO_TILE[ch] ?? 'floor';
      const stationId = (type !== 'floor' && type !== 'wall') ? `st${stationIndex++}` : undefined;
      const cakeFlavour = ch === 'V' ? 'vanilla' : ch === 'C' ? 'chocolate' : undefined;
      row.push({ type, stationId, cakeFlavour });
    }
    grid.push(row);
  }
  return grid;
}

/** Scan the map for @ and return chef spawn positions (row-major order). */
export function getChefSpawnPositions(): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let y = 0; y < MAP_ASCII.length; y++) {
    const row = MAP_ASCII[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '@') positions.push({ x, y });
    }
  }
  return positions;
}

export function getStationFlavour(grid: WorldTile[][], x: number, y: number): CakeFlavour | null {
  const ch = MAP_ASCII[y]?.[x];
  if (ch === 'V') return 'vanilla';
  if (ch === 'C') return 'chocolate';
  return null;
}
