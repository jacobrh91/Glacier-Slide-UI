'use client';

import { useCallback, useEffect, useRef, useState, CSSProperties } from 'react';
import { Coord, Point, BoardConfig, toPoint } from './types';

type Direction = 'up' | 'down' | 'left' | 'right';
type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const CELL_SIZE = 64;               // virtual cell size used for logic/layout
const BASE_BOARD_CELLS = 9;         // easy board is 9x9
const FIXED_BOARD_SIZE = CELL_SIZE * BASE_BOARD_CELLS; // px: fixed visual size

// ---------------------------------------------------------------------------
// Colors & visual constants
// ---------------------------------------------------------------------------

// Board tiles
const ICE_COLOR = '#299ADCB3';
const ROCK_COLOR = '#434d5dff';
const WALL_COLOR = '#30353dff';
const GOAL_COLOR = '#10b981';
const START_COLOR = '#6366f1';

// Page / text
const COLOR_BG = '#020617';
const COLOR_TEXT = '#e5e7eb';
const COLOR_MUTED = '#9ca3af';
const COLOR_ACCENT = '#a5b4fc';
const COLOR_BORDER_DEFAULT = '#4b5563';

// Cards / containers
const COLOR_CARD_BG_GRADIENT = `radial-gradient(circle at top, rgba(56,189,248,0.2), ${COLOR_BG})`;
const COLOR_CARD_BORDER = 'rgba(30,64,175,0.8)';
const COLOR_CARD_SHADOW = '0 18px 35px rgba(15,23,42,0.8)';

// Overlay (win screen)
const COLOR_OVERLAY_BG = 'rgba(15,23,42,0.65)';
const COLOR_OVERLAY_TEXT = '#f9fafb';
const COLOR_OVERLAY_TEXT_SHADOW =
  '0 4px 10px rgba(0,0,0,0.7), 0 0 20px rgba(56,189,248,0.9)';
const COLOR_OVERLAY_TEXT_SECONDARY = '#e5e7eb';
const COLOR_OVERLAY_TEXT_SECONDARY_SHADOW = '0 2px 6px rgba(0,0,0,0.6)';

// Player
const COLOR_PLAYER_BG = 'rgba(250, 204, 21, 0.95)';
const COLOR_PLAYER_TEXT = COLOR_BG;

// Status / error
const COLOR_ERROR = '#f87171';

// Spinner
const COLOR_SPINNER_BORDER = COLOR_BORDER_DEFAULT;
const COLOR_SPINNER_BORDER_TOP = COLOR_TEXT;

// ---------------------------------------------------------------------------
// Game helpers
// ---------------------------------------------------------------------------

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

  const [level, setLevel] = useState<BoardConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [player, setPlayer] = useState<Point>({ col: 0, row: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [won, setWon] = useState(false);
  const [wins, setWins] = useState(0); // games won counter
  const [animDuration, setAnimDuration] = useState(0.25); // seconds

  // Tracks the most recent in-flight request. Only that request may update state.
  const lastRequestId = useRef(0);

  // Fetch a level from the backend
  const fetchLevel = useCallback(
    async (d: Difficulty) => {
      const currentRequestId = ++lastRequestId.current;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`http://localhost:7878/board?difficulty=${d}`);
        if (!res.ok) {
          throw new Error(
            `Failed to load level: ${res.status} ${res.statusText}`
          );
        }

        const data = (await res.json()) as {
          board: {
            rows: number;
            cols: number;
            start: [number, number];
            end: [number, number];
            rocks: [number, number][];
            grid: string[];
          };
          request_id: number;
        };

        // If another request was started after this one, ignore this result.
        if (currentRequestId !== lastRequestId.current) {
          return;
        }

        const board: BoardConfig = {
          rows: data.board.rows,
          cols: data.board.cols,
          start: toPoint(data.board.start),
          end: toPoint(data.board.end),
          rocks: data.board.rocks.map(toPoint),
          grid: data.board.grid,
          request_id: data.request_id,
        };

        setLevel(board);
        setPlayer({ col: board.start.col, row: board.start.row });
        setWon(false);
      } catch (e) {
        if (currentRequestId !== lastRequestId.current) {
          // Stale error: ignore
          return;
        }

        console.error(e);
        setError(
          e instanceof Error ? e.message : 'Unknown error loading level'
        );
        setLevel(null);
      } finally {
        if (currentRequestId === lastRequestId.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Initial load only
  useEffect(() => {
    fetchLevel('easy');
  }, [fetchLevel]);

  const reset = useCallback(() => {
    // If the player has already won, "play again" should fetch a new level
    if (won) {
      fetchLevel(difficulty);
      return;
    }

    // Otherwise just reset the player position on the current level
    if (!level) return;
    setPlayer({ col: level.start.col, row: level.start.row });
    setWon(false);
  }, [won, level, difficulty, fetchLevel]);

  const handleDifficultyChange = (d: Difficulty) => {
    // While a level is being generated, ignore clicks on the same difficulty
    if (loading && d === difficulty) {
      return;
    }

    setDifficulty(d);
    fetchLevel(d);
  };

  const move = useCallback(
    (dir: Direction) => {
      if (!level) return;
      if (isAnimating || won) return;

      const currentLevel = level;
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
    [player, isAnimating, won, level]
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
  const longestSide = level ? Math.max(level.rows, level.cols) : BASE_BOARD_CELLS;
  const scale = FIXED_BOARD_SIZE / (longestSide * CELL_SIZE);

  const boardStyle: CSSProperties = {
    position: 'relative',
    width: (level?.cols ?? BASE_BOARD_CELLS) * CELL_SIZE,
    height: (level?.rows ?? BASE_BOARD_CELLS) * CELL_SIZE,
    display: 'grid',
    gridTemplateColumns: `repeat(${level?.cols ?? BASE_BOARD_CELLS}, ${CELL_SIZE}px)`,
    gridTemplateRows: `repeat(${level?.rows ?? BASE_BOARD_CELLS}, ${CELL_SIZE}px)`,
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
    transform: `translate3d(${player.col * CELL_SIZE}px, ${player.row * CELL_SIZE}px, 0)`,
    transition: `transform ${animDuration}s ease-out`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    fontSize: 28,
    backgroundColor: COLOR_PLAYER_BG,
    color: COLOR_PLAYER_TEXT,
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

  const spinnerStyle: CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: `2px solid ${COLOR_SPINNER_BORDER}`,
    borderTopColor: COLOR_SPINNER_BORDER_TOP,
    animation: 'spin 0.8s linear infinite',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLOR_BG,
        color: COLOR_TEXT,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

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
            color: COLOR_MUTED,
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
            const isBusy = loading && selected;

            return (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: selected
                    ? `1px solid ${COLOR_ACCENT}`
                    : `1px solid ${COLOR_BORDER_DEFAULT}`,
                  background: selected ? '#111827' : COLOR_BG,
                  color: selected ? COLOR_TEXT : COLOR_MUTED,
                  fontSize: 13,
                  cursor: isBusy ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isBusy ? 0.7 : 1,
                  pointerEvents: isBusy ? 'none' : 'auto',
                }}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
                {loading && selected && <span style={spinnerStyle} />}
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 14,
            marginBottom: 8,
            color: COLOR_ACCENT,
          }}
        >
          Games won: <strong>{wins}</strong>
        </div>

        {error && (
          <div
            style={{
              color: COLOR_ERROR,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        {loading && !level && (
          <div
            style={{
              fontSize: 14,
              marginBottom: 8,
              color: COLOR_MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={spinnerStyle} />
            Loading level...
          </div>
        )}

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: COLOR_CARD_BG_GRADIENT,
            boxShadow: COLOR_CARD_SHADOW,
            border: `1px solid ${COLOR_CARD_BORDER}`,
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
            {level && (
              <>
                {/* Scaled board */}
                <div
                  style={{
                    ...boardStyle,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    opacity: loading ? 0.5 : 1,
                    transition: 'opacity 0.2s ease-out',
                  }}
                >
                  {Array.from({ length: level.rows * level.cols }).map(
                    (_, idx) => {
                      const row = Math.floor(idx / level.cols);
                      const col = idx % level.cols;

                      const isStart =
                        col === level.start.col && row === level.start.row;
                      const isEnd =
                        col === level.end.col && row === level.end.row;
                      const rock = isRock(level, col, row);
                      const wall = isWall(level, col, row);

                      let bg = ICE_COLOR; // default: ice
                      if (isEnd) bg = GOAL_COLOR; // goal
                      if (isStart) bg = START_COLOR; // start

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
                    }
                  )}

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
                      background: COLOR_OVERLAY_BG,
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
                        color: COLOR_OVERLAY_TEXT,
                        textShadow: COLOR_OVERLAY_TEXT_SHADOW,
                      }}
                    >
                      You Won!
                    </span>

                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: COLOR_OVERLAY_TEXT_SECONDARY,
                        opacity: 0.9,
                        textShadow: COLOR_OVERLAY_TEXT_SECONDARY_SHADOW,
                      }}
                    >
                      Press Space to play again
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
