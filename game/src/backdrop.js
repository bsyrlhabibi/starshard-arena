// backdrop.js — the void behind the fight: parallax stars, drifting
// nebula weather tinted by the current sector, and the arena floor.

import { ARENA } from './entities.js';
import { COLORS, SECTORS } from './palette.js';
import { TAU } from './gfx.js';

export function makeStarfield(rng) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: rng.next() * ARENA.width,
      y: rng.next() * ARENA.height,
      depth: rng.range(0.25, 1),
      size: rng.range(0.6, 1.9),
    });
  }
  return stars;
}

// The nebula: a handful of huge, faint colour clouds that drift a few
// pixels against the ship's movement, so the void has weather in it
// and flying feels like travelling, not sliding over a table.
const NEBULA_HUES = ['#232a6e', '#3a1f6e', '#0f4d5c', '#4d1440', '#1c2f6e'];

export function makeNebula(rng) {
  const blobs = [];
  for (let i = 0; i < 6; i += 1) {
    blobs.push({
      x: rng.next() * ARENA.width,
      y: rng.next() * ARENA.height,
      r: rng.range(150, 300),
      color: NEBULA_HUES[i % NEBULA_HUES.length],
      hue: i,
      phase: rng.range(0, TAU),
    });
  }
  return blobs;
}

export function drawBackground(ctx, state) {
  const { stars, nebula, elapsed } = state;
  const sector = SECTORS[state.sectorIndex ?? 0] ?? SECTORS[0];
  const px = state.player !== null ? state.player.x : ARENA.width / 2;
  const py = state.player !== null ? state.player.y : ARENA.height / 2;
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  for (const blob of nebula ?? []) {
    const ox = (px - ARENA.width / 2) * -0.03 + Math.sin(elapsed * 0.05 + blob.phase) * 9;
    const oy = (py - ARENA.height / 2) * -0.03 + Math.cos(elapsed * 0.04 + blob.phase) * 9;
    const tint = sector.nebula[blob.hue % sector.nebula.length] ?? blob.color;
    const grad = ctx.createRadialGradient(blob.x + ox, blob.y + oy, 0, blob.x + ox, blob.y + oy, blob.r);
    grad.addColorStop(0, tint + '5e');
    grad.addColorStop(1, blob.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(blob.x + ox - blob.r, blob.y + oy - blob.r, blob.r * 2, blob.r * 2);
  }

  // The perspective floor: the template's ground, ruled lines
  // converging on a vanishing point high in the frame, cross-lines
  // crowding as they climb toward it. The fight still moves on flat
  // coordinates — the floor is paint — but the eye reads depth.
  ctx.strokeStyle = sector.grid;
  ctx.lineWidth = 1;
  const vx = ARENA.width / 2;
  const vy = 92;
  const spacing = 60;
  const drift = (elapsed * 6) % spacing;
  ctx.beginPath();
  for (let x = -spacing * 2 + drift; x < ARENA.width + spacing * 2; x += spacing) {
    ctx.moveTo(x, ARENA.height);
    ctx.lineTo(vx + (x - vx) * 0.30, vy);
  }
  for (let i = 0; i <= 11; i += 1) {
    const t = i / 11;
    const y = vy + (ARENA.height - vy) * Math.pow(t, 1.72);
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
  }
  ctx.stroke();

  // Stars slide a hair against the ship, far layers least: parallax.
  for (const star of stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(elapsed * (1 + star.depth) + star.x);
    ctx.globalAlpha = 0.35 + 0.5 * star.depth * twinkle;
    ctx.fillStyle = COLORS.star;
    const sx = star.x + (px - ARENA.width / 2) * -0.02 * star.depth;
    const sy = star.y + (py - ARENA.height / 2) * -0.02 * star.depth;
    ctx.fillRect(sx, sy, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  // The painted depth of the template: a horizon glow high in the
  // frame, a sheen pooling on the floor, and dust drifting through.
  const horizon = ctx.createRadialGradient(ARENA.width / 2, 40, 40, ARENA.width / 2, 40, 460);
  horizon.addColorStop(0, sector.horizon);
  horizon.addColorStop(0.5, 'rgba(120, 70, 220, 0.07)');
  horizon.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  const sheen = ctx.createRadialGradient(ARENA.width / 2, ARENA.height * 0.78, 30, ARENA.width / 2, ARENA.height * 0.78, 430);
  sheen.addColorStop(0, 'rgba(88, 72, 190, 0.13)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.fillStyle = 'rgba(190, 205, 255, 0.10)';
  for (let i = 0; i < 14; i += 1) {
    const star = stars[(i * 9) % stars.length];
    if (!star) continue;
    const dx = star.x + Math.sin(elapsed * 0.22 + i * 1.7) * 16;
    const dy = star.y + Math.cos(elapsed * 0.17 + i * 2.3) * 10;
    ctx.beginPath();
    ctx.arc(dx, dy, 1.6 + star.depth * 1.6, 0, TAU);
    ctx.fill();
  }
  // Shard-gold debris strewn on the floor: the glitter of old kills,
  // borrowed from the starfield's own positions so it never moves.
  ctx.fillStyle = 'rgba(255, 217, 77, 0.20)';
  for (let i = 0; i < stars.length; i += 7) {
    const star = stars[i];
    if (star.y < ARENA.height * 0.45) continue;
    const sx = star.x + (px - ARENA.width / 2) * -0.02 * star.depth;
    const sy = star.y + (py - ARENA.height / 2) * -0.02 * star.depth;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 2.6);
    ctx.lineTo(sx + 2.6, sy);
    ctx.lineTo(sx, sy + 2.6);
    ctx.lineTo(sx - 2.6, sy);
    ctx.closePath();
    ctx.fill();
  }
}
