export type Coord = [number, number];

export interface Point {
  col: number;
  row: number;
}

export const toPoint = ([col, row]: Coord): Point => ({ col, row });

export interface BoardConfig {
  rows: number;
  cols: number;
  start: Point;
  end: Point;
  rocks: Point[];
  grid: string[];
}
