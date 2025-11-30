'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Coord, Point, BoardConfig, toPoint } from './types';

import { slide, type Direction } from './boardLogic';
import { Board } from './Board';
import { COLORS, DIFFICULTIES, Difficulty, SPINNER_STYLE } from './constants';

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

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLORS.BG,
        color: COLORS.TEXT,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
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
            color: COLORS.MUTED,
          }}
        >
          Use the arrow keys (or WASD) to move. Press Space to restart.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 4,
          }}
        >
          {DIFFICULTIES.map((d) => {
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
                    ? `1px solid ${COLORS.ACCENT}`
                    : `1px solid ${COLORS.CARD_BORDER}`,
                  background: selected ? '#111827' : COLORS.BG,
                  color: selected ? COLORS.TEXT : COLORS.MUTED,
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
                {loading && selected && <span style={SPINNER_STYLE} />}
              </button>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 14,
            marginBottom: 8,
            color: COLORS.ACCENT,
          }}
        >
          Games won: <strong>{wins}</strong>
        </div>
        {error && (
          <div
            style={{
              color: COLORS.ERROR,
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
              color: COLORS.MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={SPINNER_STYLE} />
            Loading level...
          </div>
        )}
        <Board
          level={level}
          loading={loading}
          player={player}
          animDuration={animDuration}
          won={won}
        />
      </div>
    </main>
  );
}
