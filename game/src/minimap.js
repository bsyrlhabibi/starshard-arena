// minimap.js — the radar: a circular scope in the bottom-right of the
// cockpit, sweeping as it watches. Every Hollow is a blip in its own
// colour, elites ringed in gold, the Dreadnought a fat red warning,
// dropped Cores as diamonds — and the kid a bright point at the heart
// of it, so a glance answers "where is everything?" mid-fight.

import { ARENA } from './entities.js';
import { COLORS } from './palette.js';
import { TAU } from './gfx.js';

export function drawMinimap(ctx, state) {
  const cx = ARENA.width - 72;
  const cy = ARENA.height - 72;
  const R = 54;
  const player = state.player;

  ctx.save();
  // The scope's body: dark glass, a tech rim, two range rings.
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = 'rgba(6, 10, 28, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.62, 0, TAU);
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.3, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx, cy - R);
  ctx.lineTo(cx, cy + R);
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.10)';
  ctx.stroke();

  // The sweep: a bright wedge turning on the elapsed clock, with a
  // fading tail, so the scope feels alive and watched.
  const sweep = (state.elapsed * 0.9) % TAU;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R - 2, sweep - 0.5, sweep);
  ctx.closePath();
  ctx.fillStyle = 'rgba(63, 242, 224, 0.10)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(63, 242, 224, 0.5)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * (R - 2), cy + Math.sin(sweep) * (R - 2));
  ctx.stroke();

  // Blips, clipped to the glass.
  ctx.beginPath();
  ctx.arc(cx, cy, R - 2, 0, TAU);
  ctx.clip();
  const plot = (x, y) => {
    let nx = (x / ARENA.width) * 2 - 1;
    let ny = (y / ARENA.height) * 2 - 1;
    const len = Math.hypot(nx, ny);
    if (len > 0.96) {
      nx = (nx / len) * 0.96;
      ny = (ny / len) * 0.96;
    }
    return [cx + nx * (R - 4), cy + ny * (R - 4)];
  };
  for (const pickup of state.pickups ?? []) {
    const [x, y] = plot(pickup.x, pickup.y);
    ctx.fillStyle = COLORS.shard;
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x + 3, y);
    ctx.lineTo(x, y + 3);
    ctx.lineTo(x - 3, y);
    ctx.closePath();
    ctx.fill();
  }
  for (const enemy of state.enemies ?? []) {
    const [x, y] = plot(enemy.x, enemy.y);
    const big = enemy.kind === 'boss';
    ctx.fillStyle = COLORS[enemy.kind] ?? COLORS.chaser;
    ctx.beginPath();
    ctx.arc(x, y, big ? 5 : 2.6, 0, TAU);
    ctx.fill();
    if (enemy.elite || big) {
      ctx.strokeStyle = enemy.elite ? COLORS.elite : COLORS.boss;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, big ? 7.5 : 4.6, 0, TAU);
      ctx.stroke();
    }
  }
  if (player !== null && player !== undefined) {
    const [x, y] = plot(player.x, player.y);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = COLORS.ship;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, 5.4, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(160, 200, 255, 0.75)';
  ctx.font = "700 9px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R A D A R', cx, cy + R + 10);
}
