// screens.js — the full-screen states around the fighting: title,
// the Forge's upgrade choice, pause, and the game-over results.
//
// Each screen is drawn over the frozen arena so the player always sees
// where they were. Buttons are plain rectangles with hover states, and
// this module owns their geometry so main.js can route clicks by name.

import { ARENA } from './entities.js';
import { COLORS } from './palette.js';

const TAU = Math.PI * 2;

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight ?? 600} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 6, 18, ${alpha})`;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
}

function buttonRect(id, x, y, w, h) {
  return { id, x, y, w, h };
}

function drawButton(ctx, rect, label, mouse, accent) {
  const hover = mouse.x >= rect.x && mouse.x <= rect.x + rect.w && mouse.y >= rect.y && mouse.y <= rect.y + rect.h;
  ctx.fillStyle = hover ? accent : 'rgba(20, 28, 64, 0.92)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = hover ? 18 : 6;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 19, hover ? '#070a1c' : COLORS.text, 'center', 800);
  return rect;
}

export function drawTitle(ctx, state) {
  veil(ctx, 0.35);
  const cx = ARENA.width / 2;

  ctx.shadowColor = COLORS.ship;
  ctx.shadowBlur = 34;
  text(ctx, 'STARSHARD', cx, 150, 84, COLORS.ship, 'center', 900);
  ctx.shadowBlur = 18;
  text(ctx, 'A R E N A', cx, 208, 30, COLORS.shard, 'center', 800);
  ctx.shadowBlur = 0;

  text(ctx, 'The Hollow come in waves: Stalkers, Lances, Broods, Wraiths,', cx, 254, 17, COLORS.text);
  text(ctx, 'Bulwarks and Stingers — and every fifth wave, the Dreadnought.', cx, 278, 17, COLORS.text);
  text(ctx, 'Kills drop skill Cores — fly over them to steal Hollow powers mid-fight.', cx, 302, 17, COLORS.text);
  text(ctx, 'Chain a ×8 combo to charge STARFALL. Spend shards at the Forge. Survive.', cx, 326, 17, COLORS.text);

  const start = drawButton(ctx, buttonRect('start', cx - 130, 352, 260, 56), '▶  PLAY', state.mouse, COLORS.ship);

  // The difficulty sigils: one choice, made before the dark arrives.
  // Nightmare pays double score for a faster, tougher swarm.
  const diffs = [
    { id: 'diff-cadet', label: 'CADET', key: 'cadet' },
    { id: 'diff-standard', label: 'STANDARD', key: 'standard' },
    { id: 'diff-nightmare', label: 'NIGHTMARE ×2', key: 'nightmare' },
  ];
  const rects = [start];
  diffs.forEach((d, i) => {
    const rect = buttonRect(d.id, cx - 198 + i * 136, 420, 124, 30);
    const selected = (state.difficulty?.id ?? 'standard') === d.key;
    ctx.fillStyle = selected ? COLORS.shard : 'rgba(20, 28, 64, 0.92)';
    ctx.strokeStyle = COLORS.shard;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.stroke();
    text(ctx, d.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 12, selected ? '#070a1c' : COLORS.dim, 'center', 800);
    rects.push(rect);
  });

  text(ctx, 'WASD / ARROWS — move        MOUSE — aim        HOLD CLICK / SPACE — fire', cx, 466, 14, COLORS.dim);
  text(ctx, 'SHIFT — dash (its wake burns)        E — Starfall        P — pause        M — sound', cx, 488, 14, COLORS.dim);
  if (state.best > 0) text(ctx, `BEST SCORE  ${state.best.toLocaleString('en-US')}`, cx, 512, 15, COLORS.shard, 'center', 800);
  const rec = state.record;
  if (rec && rec.runs > 0) {
    text(ctx, `PILOT RECORD — ${rec.runs} SORTIES · ${rec.kills.toLocaleString('en-US')} HOLLOW FELLED · ${rec.elites} NAMED ELITES DOWN · DEEPEST WAVE ${rec.bestWave}`, cx, 532, 12.5, COLORS.dim, 'center', 700);
  }
  return rects;
}

export function drawUpgrade(ctx, state) {
  veil(ctx, 0.62);
  const cx = ARENA.width / 2;
  text(ctx, `WAVE ${state.wave} CLEARED`, cx, 100, 34, COLORS.text, 'center', 900);
  text(ctx, 'THE FORGE — EVERY UPGRADE IS BOUGHT WITH SHARDS', cx, 136, 16, COLORS.shard, 'center', 700);
  text(ctx, `YOUR SHARDS  ◆ ${state.shardBank}`, cx, 164, 17, COLORS.text, 'center', 800);

  const rects = [];
  const cardW = 264;
  const cardH = 196;
  const gap = 24;
  const totalW = cardW * state.choices.length + gap * (state.choices.length - 1);
  let x = cx - totalW / 2;
  const y = 192;

  state.choices.forEach((choice, i) => {
    const rect = buttonRect(`upgrade-${i}`, x, y, cardW, cardH);
    const afford = state.shardBank >= choice.cost;
    const hover = afford && state.mouse.x >= x && state.mouse.x <= x + cardW && state.mouse.y >= y && state.mouse.y <= y + cardH;
    ctx.fillStyle = hover ? 'rgba(28, 40, 92, 0.97)' : 'rgba(14, 20, 48, 0.95)';
    ctx.strokeStyle = afford ? COLORS.shard : 'rgba(139, 150, 201, 0.4)';
    ctx.lineWidth = hover ? 3 : 2;
    ctx.shadowColor = COLORS.shard;
    ctx.shadowBlur = hover ? 20 : 7;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    const nameColor = afford ? COLORS.shard : COLORS.dim;
    text(ctx, `${i + 1}`, x + cardW / 2, y + 28, 15, COLORS.dim, 'center', 800);
    text(ctx, choice.name.toUpperCase(), x + cardW / 2, y + 60, 21, nameColor, 'center', 900);
    text(ctx, `◆ ${choice.cost} SHARDS`, x + cardW / 2, y + 88, 15, afford ? COLORS.shard : COLORS.heart, 'center', 800);
    wrapText(ctx, choice.blurb, x + cardW / 2, y + 122, cardW - 36, 15, afford ? COLORS.text : COLORS.dim);
    text(ctx, afford ? 'CLICK OR PRESS ' + (i + 1) : 'NOT ENOUGH SHARDS', x + cardW / 2, y + cardH - 22, 12, COLORS.dim, 'center', 700);
    rects.push(rect);
    x += cardW + gap;
  });

  const skip = drawButton(ctx, buttonRect('skip-forge', cx - 150, 420, 300, 46), 'BANK SHARDS ▸ NEXT WAVE', state.mouse, COLORS.ship);
  rects.push(skip);
  return rects;
}

function wrapText(ctx, value, cx, y, maxWidth, size, color) {
  ctx.font = `600 ${size}px 'Segoe UI', system-ui, sans-serif`;
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line === '' ? word : line + ' ' + word;
    if (ctx.measureText(trial).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line !== '') lines.push(line);
  lines.forEach((l, i) => text(ctx, l, cx, y + i * (size + 5), size, color));
}

export function drawGameOver(ctx, state) {
  veil(ctx, 0.66);
  const cx = ARENA.width / 2;
  ctx.shadowColor = COLORS.heart;
  ctx.shadowBlur = 26;
  text(ctx, 'THE SWARM PREVAILS', cx, 138, 46, COLORS.heart, 'center', 900);
  ctx.shadowBlur = 0;

  text(ctx, 'FINAL SCORE', cx, 208, 15, COLORS.dim, 'center', 700);
  text(ctx, state.score.toLocaleString('en-US'), cx, 244, 52, COLORS.text, 'center', 900);
  text(ctx, `reached wave ${state.wave}   ·   shards ◆ ${state.shardsCollected}   ·   cores stolen ${state.coresCollected ?? 0}   ·   best combo ×${state.bestCombo}`, cx, 292, 17, COLORS.text);
  if (state.score >= state.best && state.score > 0) {
    text(ctx, '★ NEW BEST SCORE ★', cx, 326, 18, COLORS.shard, 'center', 800);
  } else {
    text(ctx, `best score ${state.best.toLocaleString('en-US')}`, cx, 326, 16, COLORS.dim);
  }

  const rec = state.record;
  if (rec && rec.runs > 0) {
    text(ctx, `PILOT RECORD — ${rec.runs} SORTIES · ${rec.kills.toLocaleString('en-US')} HOLLOW FELLED · ${rec.elites} NAMED ELITES DOWN · ${rec.cores} CORES STOLEN · DEEPEST WAVE ${rec.bestWave}`, cx, 352, 13.5, COLORS.shard, 'center', 700);
  }

  const again = drawButton(ctx, buttonRect('restart', cx - 140, 380, 280, 56), '↻  PLAY AGAIN (R)', state.mouse, COLORS.ship);
  text(ctx, 'every run builds a different blaster — but the pilot record remembers everything', cx, 470, 14, COLORS.dim);
  return [again];
}

export function drawPause(ctx, state) {
  veil(ctx, 0.6);
  const cx = ARENA.width / 2;
  text(ctx, 'PAUSED', cx, 218, 44, COLORS.text, 'center', 900);
  text(ctx, `wave ${state.wave}   ·   score ${state.score.toLocaleString('en-US')}`, cx, 268, 17, COLORS.dim);
  const resume = drawButton(ctx, buttonRect('resume', cx - 120, 308, 240, 52), 'RESUME (P)', state.mouse, COLORS.ship);
  return [resume];
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export { TAU };
