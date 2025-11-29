'use client';

import { useCallback, useEffect, useState, CSSProperties } from 'react';
import { LEVELS } from './levels';
import { Coord, Point, BoardConfig } from './types';

type Direction = 'up' | 'down' | 'left' | 'right';
type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const CELL_SIZE = 64;               // virtual cell size used for logic/layout
const BASE_BOARD_CELLS = 9;         // easy board is 9x9
const FIXED_BOARD_SIZE = CELL_SIZE * BASE_BOARD_CELLS; // px: fixed visual size

// Colors
const ICE_COLOR = '#299ADCB3';
const ROCK_COLOR = '#434d5dff';
const WALL_COLOR = '#30353dff';

const isRock = (config: BoardConfig, col: number, row: number): boolean =>
  config.rocks.some((p) => p.col === col && p.row === row);

const inBounds = (config: BoardConfig, col: number, row: number): boolean =>
  col >= 0 && row >= 0 && col < config.cols && row < config.rows;

const isWall = (config: BoardConfig, col: number, row: number): boolean => {
  const { rows, cols, start, end } = config;

  const isEdge = row === 0 || col === 0 || row === rows - 1 || col === cols - 1;

  const isStart = col === start.col && row === start.row;
  const isEnd = col === end.col && row === end.row;

  return isEdge && !isStart && !isEnd;
};

function slide(config: BoardConfig, from: Point, dir: Direction): Point {
  const delta: Record<Direction, Coord> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };

  let { col, row } = from;
  const [delta_col, delta_row] = delta[dir];

  while (true) {
    const new_col = col + delta_col;
    const new_row = row + delta_row;

    if (!inBounds(config, new_col, new_row)) break;
    if (isRock(config, new_col, new_row)) break;
    if (isWall(config, new_col, new_row)) break;

    col = new_col;
    row = new_row;
  }

  return { col, row };
}

export default function Page() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const level = LEVELS[difficulty];

  const [player, setPlayer] = useState<Point>({
    col: level.start.col,
    row: level.start.row,
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [won, setWon] = useState(false);
  const [wins, setWins] = useState(0); // games won counter
  const [animDuration, setAnimDuration] = useState(0.25); // seconds

  const reset = useCallback(() => {
    const current = LEVELS[difficulty];
    setPlayer({ col: current.start.col, row: current.start.row });
    setWon(false);
  }, [difficulty]);

  const handleDifficultyChange = (d: Difficulty) => {
    const newLevel = LEVELS[d];
    setDifficulty(d);
    setPlayer({ col: newLevel.start.col, row: newLevel.start.row });
    setWon(false);
  };

  const move = useCallback(
    (dir: Direction) => {
      const currentLevel = LEVELS[difficulty];
      if (isAnimating || won) return;

      const target = slide(currentLevel, player, dir);

      if (target.row === player.row && target.col === player.col) return;

      const dx = Math.abs(target.col - player.col);
      const dy = Math.abs(target.row - player.row);
      const steps = dx + dy;

      const BASE_TIME = 0.09;
      const SIZE_FACTOR = Math.max(level.rows, level.cols) / 9;
      const TIME_PER_TILE = BASE_TIME / SIZE_FACTOR;
      const durationSec = Math.max(steps, 1) * TIME_PER_TILE;

      setAnimDuration(durationSec);
      setIsAnimating(true);
      setPlayer(target);

      window.setTimeout(() => {
        setIsAnimating(false);
        if (
          target.col === currentLevel.end.col &&
          target.row === currentLevel.end.row
        ) {
          setWon(true);
          setWins((prev) => prev + 1);
        }
      }, durationSec * 1000);
    },
    [player, isAnimating, won, difficulty]
  );

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        move('up');
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        move('down');
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        move('left');
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        move('right');
      } else if (key === ' ') {
        e.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, reset]);

  // ----- BOARD SIZING / SCALING -----
  const longestSide = Math.max(level.rows, level.cols);
  const scale = FIXED_BOARD_SIZE / (longestSide * CELL_SIZE);

  const boardStyle: CSSProperties = {
    position: 'relative',
    width: level.cols * CELL_SIZE,
    height: level.rows * CELL_SIZE,
    display: 'grid',
    gridTemplateColumns: `repeat(${level.cols}, ${CELL_SIZE}px)`,
    gridTemplateRows: `repeat(${level.rows}, ${CELL_SIZE}px)`,
    boxSizing: 'border-box',
  };

  const cellStyle: CSSProperties = {
    width: CELL_SIZE,
    height: CELL_SIZE,
    boxSizing: 'border-box',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    position: 'relative',
  };

  const playerStyle: CSSProperties = {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    transform: `translate3d(${player.col * CELL_SIZE}px, ${player.row * CELL_SIZE
      }px, 0)`,
    transition: `transform ${animDuration}s ease-out`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    fontSize: 28,
    backgroundColor: 'rgba(250, 204, 21, 0.95)',
    color: '#020617',
    pointerEvents: 'none',
  };

  const gap = 2;

  const obstacleStyle: CSSProperties = {
    width: CELL_SIZE - gap,
    height: CELL_SIZE - gap,
    borderRadius: 10,
  };

  const rockInnerStyle: CSSProperties = {
    ...obstacleStyle,
    backgroundColor: ROCK_COLOR,
  };

  const wallInnerStyle: CSSProperties = {
    ...obstacleStyle,
    backgroundColor: WALL_COLOR,
  };

  const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Ice Sliding Game</h1>
        <p
          style={{
            fontSize: 14,
            maxWidth: 450,
            textAlign: 'center',
            color: '#9ca3af',
          }}
        >
          Use the arrow keys (or WASD) to move. Press Space to restart.
        </p>

        {/* Difficulty buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 4,
          }}
        >
          {difficultyOrder.map((d) => {
            const selected = d === difficulty;
            return (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: selected
                    ? '1px solid #a5b4fc'
                    : '1px solid #4b5563',
                  background: selected ? '#111827' : '#020617',
                  color: selected ? '#e5e7eb' : '#9ca3af',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 14,
            marginBottom: 8,
            color: '#a5b4fc',
          }}
        >
          Games won: <strong>{wins}</strong>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background:
              'radial-gradient(circle at top, rgba(56,189,248,0.2), #020617)',
            boxShadow: '0 18px 35px rgba(15,23,42,0.8)',
            border: '1px solid rgba(30,64,175,0.8)',
          }}
        >
          {/* Fixed-size board container */}
          <div
            style={{
              width: FIXED_BOARD_SIZE,
              height: FIXED_BOARD_SIZE,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Scaled board */}
            <div
              style={{
                ...boardStyle,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {Array.from({ length: level.rows * level.cols }).map((_, idx) => {
                const row = Math.floor(idx / level.cols);
                const col = idx % level.cols;

                const isStart =
                  col === level.start.col && row === level.start.row;
                const isEnd = col === level.end.col && row === level.end.row;
                const rock = isRock(level, col, row);
                const wall = isWall(level, col, row);

                let bg = ICE_COLOR; // default: ice
                if (isEnd) bg = '#10b981'; // goal
                if (isStart) bg = '#6366f1'; // start

                return (
                  <div
                    key={`${row}-${col}`}
                    style={{
                      ...cellStyle,
                      backgroundColor: bg,
                    }}
                  >
                    {wall && <div style={wallInnerStyle} />}
                    {rock && <div style={rockInnerStyle} />}
                    {isEnd && !rock && !wall && 'End'}
                    {isStart && !rock && !wall && 'Start'}
                  </div>
                );
              })}

              {/* Player */}
              <div style={playerStyle}></div>
            </div>

            {/* YOU WON overlay */}
            {won && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(15,23,42,0.65)',
                  pointerEvents: 'none',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: '#f9fafb',
                    textShadow:
                      '0 4px 10px rgba(0,0,0,0.7), 0 0 20px rgba(56,189,248,0.9)',
                  }}
                >
                  You Won!
                </span>

                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: '#e5e7eb',
                    opacity: 0.9,
                    textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  }}
                >
                  Press Space to play again
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
