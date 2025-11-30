'use client';

import type { CSSProperties } from 'react';
import type { BoardConfig, Point } from './types';
import { isRock, isWall } from './boardLogic';
import { BOARD, COLORS } from './constants';

interface BoardProps {
  level: BoardConfig | null;
  loading: boolean;
  player: Point;
  animDuration: number;
  won: boolean;
}

export function Board({
  level,
  loading,
  player,
  animDuration,
  won,
}: BoardProps) {
  const longestSide = level
    ? Math.max(level.rows, level.cols)
    : BOARD.BASE_CELLS;
  const scale = BOARD.FIXED_SIZE / (longestSide * BOARD.CELL_SIZE);

  const boardStyle: CSSProperties = {
    position: 'relative',
    width: (level?.cols ?? BOARD.BASE_CELLS) * BOARD.CELL_SIZE,
    height: (level?.rows ?? BOARD.BASE_CELLS) * BOARD.CELL_SIZE,
    display: 'grid',
    gridTemplateColumns: `repeat(${level?.cols ?? BOARD.BASE_CELLS
      }, ${BOARD.CELL_SIZE}px)`,
    gridTemplateRows: `repeat(${level?.rows ?? BOARD.BASE_CELLS
      }, ${BOARD.CELL_SIZE}px)`,
    boxSizing: 'border-box',
  };

  const cellStyle: CSSProperties = {
    width: BOARD.CELL_SIZE,
    height: BOARD.CELL_SIZE,
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
    width: BOARD.CELL_SIZE,
    height: BOARD.CELL_SIZE,
    transform: `translate3d(${player.col * BOARD.CELL_SIZE}px, ${player.row * BOARD.CELL_SIZE
      }px, 0)`,
    transition: `transform ${animDuration}s ease-out`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    fontSize: 28,
    backgroundColor: COLORS.PLAYER_BG,
    color: COLORS.PLAYER_TEXT,
    pointerEvents: 'none',
  };

  const gap = 2;

  const obstacleStyle: CSSProperties = {
    width: BOARD.CELL_SIZE - gap,
    height: BOARD.CELL_SIZE - gap,
    borderRadius: 10,
  };

  const rockInnerStyle: CSSProperties = {
    ...obstacleStyle,
    backgroundColor: COLORS.ROCK,
  };

  const wallInnerStyle: CSSProperties = {
    ...obstacleStyle,
    backgroundColor: COLORS.WALL,
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: COLORS.CARD_BG_GRADIENT(COLORS.BG),
        boxShadow: COLORS.CARD_SHADOW,
        border: `1px solid ${COLORS.CARD_BORDER}`,
      }}
    >
      {/* Fixed-size board container */}
      <div
        style={{
          width: BOARD.FIXED_SIZE,
          height: BOARD.FIXED_SIZE,
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

                  let bg: string = COLORS.ICE;
                  if (isEnd) bg = COLORS.GOAL;
                  if (isStart) bg = COLORS.START;

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
                  background: COLORS.OVERLAY_BG,
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
                    color: COLORS.OVERLAY_TEXT,
                    textShadow: COLORS.OVERLAY_TEXT_SHADOW,
                  }}
                >
                  You Won!
                </span>

                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: COLORS.OVERLAY_TEXT_SECONDARY,
                    opacity: 0.9,
                    textShadow: COLORS.OVERLAY_TEXT_SECONDARY_SHADOW,
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
  );
}
