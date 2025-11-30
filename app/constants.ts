import type { CSSProperties } from 'react';

export const BOARD = {
  CELL_SIZE: 64,
  BASE_CELLS: 9,
  get FIXED_SIZE() {
    return this.CELL_SIZE * this.BASE_CELLS;
  },
} as const;

////////////////////
// Colors/Visuals //
////////////////////
export const COLORS = {
  ICE: '#299ADCB3',
  ROCK: '#434d5dff',
  WALL: '#30353dff',
  GOAL: '#10b981',
  START: '#6366f1',
  PLAYER_BG: 'rgba(250, 204, 21, 0.95)',
  PLAYER_TEXT: '#020617',

  BG: '#020617',
  TEXT: '#e5e7eb',
  MUTED: '#9ca3af',
  ACCENT: '#a5b4fc',
  BORDER: '#4b5563',

  CARD_BG_GRADIENT: (bg: string) =>
    `radial-gradient(circle at top, rgba(56,189,248,0.2), ${bg})`,
  CARD_BORDER: 'rgba(30,64,175,0.8)',
  CARD_SHADOW: '0 18px 35px rgba(15,23,42,0.8)',

  OVERLAY_BG: 'rgba(15,23,42,0.65)',
  OVERLAY_TEXT: '#f9fafb',
  OVERLAY_TEXT_SHADOW:
    '0 4px 10px rgba(0,0,0,0.7), 0 0 20px rgba(56,189,248,0.9)',
  OVERLAY_TEXT_SECONDARY: '#e5e7eb',
  OVERLAY_TEXT_SECONDARY_SHADOW:
    '0 2px 6px rgba(0,0,0,0.6)',

  ERROR: '#f87171',
} as const;


////////////////
// Difficulty //
////////////////
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export const DIFFICULTIES: Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'extreme',
];

/////////////
// Spinner //
/////////////

export const SPINNER_STYLE: CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: '50%',
  border: `2px solid ${COLORS.BORDER}`,
  borderTopColor: COLORS.TEXT,
  animation: 'spin 0.8s linear infinite',
};
