import type { BoardConfig, Point, Coord } from './types';

/////////////////////////
// Tile classification //
/////////////////////////
export const isRock = (config: BoardConfig, col: number, row: number): boolean =>
  config.rocks.some((p) => p.col === col && p.row === row);

export const inBounds = (config: BoardConfig, col: number, row: number): boolean =>
  col >= 0 && row >= 0 && col < config.cols && row < config.rows;

export const isWall = (config: BoardConfig, col: number, row: number): boolean => {
  const { rows, start, end } = config;

  const isEdge = row === 0 || col === 0 || row === rows - 1 || col === config.cols - 1;

  const isStart = col === start.col && row === start.row;
  const isEnd = col === end.col && row === end.row;

  return isEdge && !isStart && !isEnd;
};

const isBlocked = (config: BoardConfig, col: number, row: number): boolean =>
  !inBounds(config, col, row) || isRock(config, col, row) || isWall(config, col, row);


//////////////
// Movement //
//////////////
export type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTION_DELTA: Record<Direction, Coord> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export function slide(config: BoardConfig, from: Point, dir: Direction): Point {
  const [dx, dy] = DIRECTION_DELTA[dir];
  let { col, row } = from;

  // Slide until the next tile would be blocked
  while (true) {
    const nextCol = col + dx;
    const nextRow = row + dy;

    if (isBlocked(config, nextCol, nextRow)) break;

    col = nextCol;
    row = nextRow;
  }

  return { col, row };
}
