// palette.js — the fixed colour language of the arena, plus the
// named sectors the fight rotates through: every few waves the void
// itself changes hue, name and weather, so a long run travels.

export const COLORS = {
  void: '#070a1c',
  grid: 'rgba(64, 84, 178, 0.16)',
  star: '#aebaff',
  ship: '#3ff2e0',
  shipCore: '#e8fffa',
  bullet: '#a8fff4',
  shard: '#ffd94d',
  heart: '#ff5d7a',
  shield: '#7ab8ff',
  text: '#e6ebff',
  dim: '#8b96c9',
  chaser: '#ff4d8d',
  dart: '#ff9f43',
  splitter: '#9dff57',
  mini: '#d2ff8a',
  weaver: '#b78bff',
  bulwark: '#e6ddc8',
  stinger: '#4dd8ff',
  boss: '#ff4747',
  elite: '#ffd700',
  rift: '#8b5cff',
  missile: '#c9a7ff',
  eye: '#0b0e24',
};

// The sectors: the arena is not one place but a route through the
// dark. Every three waves the fight crosses into the next sector —
// a new name on the banner, a new weather of nebula, a new light on
// the floor — and after the fourth it loops, deeper each time.
export const SECTORS = [
  { name: 'AZURE DRIFT', nebula: ['#232a6e', '#3a1f6e', '#0f4d5c', '#4d1440', '#1c2f6e', '#2a1a5e'], grid: 'rgba(64, 84, 178, 0.16)', horizon: 'rgba(64, 224, 255, 0.10)', accent: '#3ff2e0' },
  { name: 'VIOLET DEEP', nebula: ['#3a1160', '#571d7a', '#2a0f4d', '#6e1f5e', '#1f1440', '#4d1160'], grid: 'rgba(140, 84, 220, 0.15)', horizon: 'rgba(190, 110, 255, 0.11)', accent: '#b78bff' },
  { name: 'EMBER RIFT', nebula: ['#571f10', '#6e2a12', '#4d0f1c', '#7a3a10', '#40142a', '#5e2410'], grid: 'rgba(220, 120, 64, 0.14)', horizon: 'rgba(255, 150, 70, 0.11)', accent: '#ff9f43' },
  { name: 'VERDANT VOID', nebula: ['#0f4d33', '#14571f', '#0b3a4d', '#1c5e46', '#123f2a', '#0f5e3a'], grid: 'rgba(64, 200, 140, 0.14)', horizon: 'rgba(90, 255, 180, 0.10)', accent: '#7dff9a' },
];

export function sectorForWave(wave) {
  const index = Math.floor(Math.max(0, wave - 1) / 3) % SECTORS.length;
  return { index, ...SECTORS[index] };
}
