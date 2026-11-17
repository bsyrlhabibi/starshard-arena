// hud.js — the cockpit layer: framed hearts and shield, the wave and
// sector readout, the boss bar, the circular Starfall gauge, the
// combo arc, effect chips, the radar minimap, and wave banners.

import { ARENA } from './entities.js';
import { COLORS } from './palette.js';
import { TAU, glow, noGlow, rr, text } from './gfx.js';
import { drawMinimap } from './minimap.js';


// A heart with a real silhouette — two lobes and a point — because a
// triangle reads as a warning sign, not a life.
function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(x - s * 1.25, y - s * 0.1, x - s * 0.62, y - s * 1.05, x, y - s * 0.38);
  ctx.bezierCurveTo(x + s * 0.62, y - s * 1.05, x + s * 1.25, y - s * 0.1, x, y + s * 0.85);
  ctx.closePath();
}

// The tech frame: a thin double rule around the whole arena with
// bracketed corners — the cockpit glass the whole HUD is printed on.
function techFrame(ctx, accent) {
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(7.5, 7.5, ARENA.width - 15, ARENA.height - 15);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  const L = 22;
  const m = 4;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [ARENA.width - m, m, -1, 1], [m, ARENA.height - m, 1, -1], [ARENA.width - m, ARENA.height - m, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * L, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * L);
    ctx.stroke();
  }
}

export function drawHud(ctx, state) {
  const { player, score, wave, combo, shards } = state;
  const elapsed = state.elapsed ?? 0;
  const sector = state.sector ?? { name: '', accent: COLORS.ship };
  techFrame(ctx, sector.accent);

  // Hull hearts in their framed panel, top-left; the shield rides as
  // a circular badge at the panel's end, the way the template wears it.
  const panelW = 34 + player.maxHp * 27 + (player.shield > 0 ? 34 : 0);
  ctx.fillStyle = 'rgba(8, 12, 32, 0.66)';
  rr(ctx, 14, 12, panelW, 34, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 93, 122, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let i = 0; i < player.maxHp; i += 1) {
    const x = 32 + i * 27;
    ctx.fillStyle = i < player.hp ? COLORS.heart : 'rgba(255, 93, 122, 0.18)';
    glow(ctx, COLORS.heart, i < player.hp ? 9 : 0);
    heart(ctx, x, 30, 9);
    ctx.fill();
  }
  noGlow(ctx);
  if (player.shield > 0) {
    const bx = 32 + player.maxHp * 27 + 8;
    ctx.strokeStyle = COLORS.shield;
    ctx.lineWidth = 1.8;
    glow(ctx, COLORS.shield, 8);
    ctx.beginPath();
    ctx.arc(bx, 29, 12, 0, TAU);
    ctx.stroke();
    noGlow(ctx);
    text(ctx, `${player.shield}`, bx, 30, 13, COLORS.shield, 'center', 900);
  }

  // Active stolen skills, as chips under the hearts with their seconds.
  (state.effects ?? []).forEach((effect, i) => {
    const y = 66 + i * 24;
    ctx.fillStyle = 'rgba(14, 20, 48, 0.8)';
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 1.5;
    rr(ctx, 14, y - 10, 172, 20, 6);
    ctx.fill();
    ctx.stroke();
    text(ctx, `${effect.label}  ${Math.ceil(effect.seconds)}s`, 22, y + 1, 12, effect.color, 'left', 800);
  });

  // Wave and sector, top-centre, with the hostiles-left progress rule.
  text(ctx, `WAVE ${wave}`, ARENA.width / 2, 26, 20, COLORS.text, 'center', 800);
  if (sector.name) text(ctx, `◈ ${sector.name} ◈`, ARENA.width / 2, 47, 11, sector.accent, 'center', 700);
  if (state.waveTotal > 0) {
    const w = 190;
    const x = ARENA.width / 2 - w / 2;
    const left = Math.max(0, state.hostiles ?? 0);
    ctx.fillStyle = 'rgba(230, 235, 255, 0.16)';
    ctx.fillRect(x, 58, w, 3.5);
    ctx.fillStyle = sector.accent;
    ctx.fillRect(x, 58, w * Math.max(0, 1 - left / state.waveTotal), 3.5);
    text(ctx, left > 0 ? `${left} HOSTILE${left === 1 ? '' : 'S'} LEFT` : 'SECTOR CLEARING…', ARENA.width / 2, 70, 9.5, COLORS.dim, 'center', 700);
  }

  // The Dreadnought gets a bar of its own, wide as the sky it darkens.
  if (state.boss) {
    const w = 340;
    const x = ARENA.width / 2 - w / 2;
    text(ctx, state.boss.enraged ? 'THE DREADNOUGHT — ENRAGED' : 'THE DREADNOUGHT', ARENA.width / 2, 88, 12, COLORS.boss, 'center', 800);
    ctx.fillStyle = 'rgba(255, 71, 71, 0.22)';
    ctx.fillRect(x, 98, w, 7);
    ctx.fillStyle = COLORS.boss;
    glow(ctx, COLORS.boss, 10);
    ctx.fillRect(x, 98, w * Math.max(0, state.boss.hp / state.boss.maxHp), 7);
    noGlow(ctx);
  }

  // Score and shard bank, top-right.
  text(ctx, `SCORE ${score.toLocaleString('en-US')}`, ARENA.width - 20, 25, 20, COLORS.text, 'right', 800);
  text(ctx, `◆ ${shards} SHARDS BANKED`, ARENA.width - 20, 49, 12.5, COLORS.shard, 'right', 700);

  // The Starfall gauge: a circular dial under the score that fills as
  // the combo climbs to ×8, then burns gold and begs for the E key.
  const gx = ARENA.width - 52;
  const gy = 102;
  const gr = 27;
  const charge = state.starfallReady ? 1 : Math.min(1, combo / 8);
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, TAU);
  ctx.fillStyle = 'rgba(8, 12, 32, 0.66)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 77, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (charge > 0) {
    ctx.beginPath();
    ctx.arc(gx, gy, gr - 4.5, -Math.PI / 2, -Math.PI / 2 + charge * TAU);
    ctx.strokeStyle = COLORS.shard;
    ctx.lineWidth = 4;
    glow(ctx, COLORS.shard, state.starfallReady ? 16 + 6 * Math.sin(elapsed * 6) : 8);
    ctx.stroke();
    noGlow(ctx);
  }
  text(ctx, '⚡', gx, gy + 1, 17, state.starfallReady ? COLORS.shard : COLORS.dim, 'center', 900);
  text(ctx, state.starfallReady ? 'STARFALL · E' : 'STARFALL', gx, gy + gr + 11, 9.5, state.starfallReady ? COLORS.shard : COLORS.dim, 'center', 800);

  // The combo arc, bottom-left: a semicircular dial draining with the
  // combo timer, the multiplier at its heart, and a row of stars that
  // fill toward the ×8 that charges the Starfall.
  const ax = 92;
  const ay = ARENA.height - 52;
  ctx.beginPath();
  ctx.arc(ax, ay, 46, Math.PI, TAU);
  ctx.strokeStyle = 'rgba(230, 235, 255, 0.18)';
  ctx.lineWidth = 5;
  ctx.stroke();
  if (combo > 0) {
    ctx.beginPath();
    ctx.arc(ax, ay, 46, Math.PI, Math.PI + Math.PI * Math.max(0, Math.min(1, state.comboTime ?? 0)));
    ctx.strokeStyle = COLORS.shard;
    glow(ctx, COLORS.shard, 9);
    ctx.stroke();
    noGlow(ctx);
  }
  text(ctx, combo > 1 ? `×${Math.min(8, combo)}` : '×1', ax, ay - 12, 21, combo > 1 ? COLORS.shard : COLORS.dim, 'center', 900);
  text(ctx, 'COMBO', ax, ay + 4, 9, COLORS.dim, 'center', 700);
  for (let i = 0; i < 8; i += 1) {
    const sx = ax - 35 + i * 10;
    text(ctx, '★', sx, ay + 17, 9, i < Math.min(8, combo) ? COLORS.shard : 'rgba(230,235,255,0.22)', 'center', 900);
  }
  const dashReady = player.dashCooldown <= 0;
  text(ctx, dashReady ? 'DASH READY · SHIFT' : 'DASH CHARGING…', 20, ARENA.height - 14, 10.5, dashReady ? COLORS.ship : COLORS.dim, 'left', 700);

  // The radar, bottom-right: every Hollow a blip, watched by a sweep.
  drawMinimap(ctx, state);

  // Starfall ready still shouts from the bottom centre, where the eye
  // already rests when the fight is hottest.
  if (state.starfallReady) {
    const pulse = 0.7 + 0.3 * Math.sin(elapsed * 7);
    ctx.globalAlpha = pulse;
    glow(ctx, COLORS.shard, 16);
    text(ctx, '★ STARFALL READY — PRESS E ★', ARENA.width / 2, ARENA.height - 20, 16, COLORS.shard, 'center', 900);
    noGlow(ctx);
    ctx.globalAlpha = 1;
  }
}

export function drawBanner(ctx, banner, elapsed) {
  if (banner === null) return;
  const alpha = Math.min(1, banner.time / 0.4, (banner.duration - banner.time) / 0.4 + 0.2);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  glow(ctx, COLORS.ship, 22);
  text(ctx, banner.title, ARENA.width / 2, ARENA.height * 0.32, 44, COLORS.text, 'center', 900);
  noGlow(ctx);
  if (banner.subtitle !== '') text(ctx, banner.subtitle, ARENA.width / 2, ARENA.height * 0.32 + 40, 17, COLORS.dim, 'center', 600);
  ctx.globalAlpha = 1;
  void elapsed;
}
