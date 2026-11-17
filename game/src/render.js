// render.js — everything the player sees, drawn on one canvas.
//
// The look is neon-on-deep-space: a near-black indigo void, a faint
// perspective grid, parallax stars, and every actor drawn as a glowing
// geometric sigil in one fixed palette (cyan ship, gold shards, and one
// hue per Hollow kind). This file only reads state; entities.js owns
// the truth of where things are.

import { ARENA, ENEMY_KINDS, PICKUP_KINDS } from './entities.js';

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

const TAU = Math.PI * 2;

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
      phase: rng.range(0, TAU),
    });
  }
  return blobs;
}

function drawBackground(ctx, state) {
  const { stars, nebula, elapsed } = state;
  const px = state.player !== null ? state.player.x : ARENA.width / 2;
  const py = state.player !== null ? state.player.y : ARENA.height / 2;
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  for (const blob of nebula ?? []) {
    const ox = (px - ARENA.width / 2) * -0.03 + Math.sin(elapsed * 0.05 + blob.phase) * 9;
    const oy = (py - ARENA.height / 2) * -0.03 + Math.cos(elapsed * 0.04 + blob.phase) * 9;
    const grad = ctx.createRadialGradient(blob.x + ox, blob.y + oy, 0, blob.x + ox, blob.y + oy, blob.r);
    grad.addColorStop(0, blob.color + '55');
    grad.addColorStop(1, blob.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(blob.x + ox - blob.r, blob.y + oy - blob.r, blob.r * 2, blob.r * 2);
  }

  // Perspective grid: verticals and horizontals breathing very slowly.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const spacing = 60;
  const drift = (elapsed * 6) % spacing;
  ctx.beginPath();
  for (let x = -spacing + drift; x < ARENA.width + spacing; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
  }
  for (let y = -spacing + drift; y < ARENA.height + spacing; y += spacing) {
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
}

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowBlur = 0;
}

function polygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TAU;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawPlayer(ctx, player, elapsed) {
  const blink = player.invulnerableTime > 0 && Math.floor(elapsed * 18) % 2 === 0;
  if (blink) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  // Engine flame, longer while dashing.
  const flame = player.dashTime > 0 ? 26 : 13 + Math.sin(elapsed * 31) * 3;
  glow(ctx, '#ff9f43', 14);
  ctx.fillStyle = '#ffb35c';
  ctx.beginPath();
  ctx.moveTo(-player.radius - 2, 5);
  ctx.lineTo(-player.radius - flame, 0);
  ctx.lineTo(-player.radius - 2, -5);
  ctx.closePath();
  ctx.fill();

  // The shard-ship: a swept dart hull with two wing blades, a bright
  // spine and a cockpit eye, so it reads as a craft and not a triangle.
  glow(ctx, COLORS.ship, 18);
  ctx.fillStyle = COLORS.ship;
  ctx.beginPath();
  ctx.moveTo(player.radius + 7, 0); // nose
  ctx.lineTo(-player.radius + 3, 5);
  ctx.lineTo(-player.radius - 6, player.radius + 4); // port wing tip
  ctx.lineTo(-player.radius - 2, 3);
  ctx.lineTo(-player.radius - 2, -3);
  ctx.lineTo(-player.radius - 6, -player.radius - 4); // starboard wing tip
  ctx.lineTo(-player.radius + 3, -5);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);
  // Spine stripe from tail to nose.
  ctx.strokeStyle = 'rgba(7, 10, 28, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-player.radius + 2, 0);
  ctx.lineTo(player.radius + 3, 0);
  ctx.stroke();
  // Cockpit eye.
  ctx.fillStyle = COLORS.shipCore;
  glow(ctx, COLORS.shipCore, 10);
  ctx.beginPath();
  ctx.arc(2, 0, 4.2, 0, TAU);
  ctx.fill();
  noGlow(ctx);
  ctx.restore();

  if (player.shield > 0) {
    ctx.strokeStyle = COLORS.shield;
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(elapsed * 4);
    ctx.lineWidth = 2;
    glow(ctx, COLORS.shield, 12);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 9, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    noGlow(ctx);
  }
}

const ENEMY_SIDES = { chaser: 4, dart: 3, splitter: 6, mini: 4, weaver: 5, bulwark: 6, stinger: 3, boss: 8 };

// Every Hollow kind is drawn as a sigil with a face: a dark heart and a
// single bright eye that stares along its heading, so the swarm reads
// as creatures hunting you, not as confetti. Each kind adds one
// signature detail on top of that shared anatomy.
export function drawEnemy(ctx, enemy, elapsed) {
  const color = COLORS[enemy.kind];
  const r = enemy.radius;
  // Warp-in: for its first third of a second a Hollow is a collapsing
  // ring and a ghost of itself — visible, beautiful, and not yet real.
  if ((enemy.spawnIn ?? 0) > 0) {
    const t = enemy.spawnIn / 0.35;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = t * 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r + 26 * t, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.save();
  if ((enemy.spawnIn ?? 0) > 0) ctx.globalAlpha = 1 - (enemy.spawnIn / 0.35) * 0.55;
  ctx.translate(enemy.x, enemy.y);

  // A motion streak behind anything quick, so speed is visible.
  if (enemy.kind === 'dart' || enemy.kind === 'stinger' || enemy.kind === 'mini') {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(enemy.angle) * r * 0.6, -Math.sin(enemy.angle) * r * 0.6);
    ctx.lineTo(-Math.cos(enemy.angle) * r * 2.1, -Math.sin(enemy.angle) * r * 2.1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Signature detail behind the hull: the Brood's segmented shell ring,
  // the Wraith's two orbiting wisps, the Dreadnought's siege ring.
  if (enemy.kind === 'splitter' || enemy.kind === 'boss') {
    const segments = enemy.kind === 'boss' ? 8 : 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = enemy.kind === 'boss' ? 4 : 3;
    glow(ctx, color, 12);
    for (let i = 0; i < segments; i += 1) {
      const a0 = elapsed * 0.7 + (i / segments) * TAU + 0.12;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, a0, a0 + (TAU / segments) * 0.55);
      ctx.stroke();
    }
    noGlow(ctx);
  }
  if (enemy.kind === 'weaver') {
    glow(ctx, color, 10);
    ctx.fillStyle = color;
    for (let i = 0; i < 2; i += 1) {
      const a = elapsed * 2.6 + i * Math.PI + enemy.wobblePhase;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8), 3, 0, TAU);
      ctx.fill();
    }
    noGlow(ctx);
  }
  // The Bulwark's armor: four plates that counter-rotate against the hull.
  if (enemy.kind === 'bulwark') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    glow(ctx, color, 8);
    for (let i = 0; i < 4; i += 1) {
      const a = -elapsed * 0.8 + (i / 4) * TAU;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, a, a + 0.9);
      ctx.stroke();
    }
    noGlow(ctx);
  }
  // The Stinger's barb: a tail spike trailing its heading.
  if (enemy.kind === 'stinger') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    glow(ctx, color, 10);
    ctx.beginPath();
    ctx.moveTo(-Math.cos(enemy.angle) * r * 0.5, -Math.sin(enemy.angle) * r * 0.5);
    ctx.lineTo(-Math.cos(enemy.angle) * (r + 10), -Math.sin(enemy.angle) * (r + 10));
    ctx.stroke();
    noGlow(ctx);
  }

  const spin = enemy.kind === 'splitter' || enemy.kind === 'boss' ? elapsed * 0.9 : enemy.angle;
  ctx.save();
  ctx.rotate(spin + Math.PI / 4);
  glow(ctx, color, 16);
  ctx.fillStyle = enemy.flashTime > 0 ? '#ffffff' : color;
  polygon(ctx, 0, 0, r, ENEMY_SIDES[enemy.kind], 0);
  ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = 'rgba(7, 10, 28, 0.85)';
  polygon(ctx, 0, 0, r * 0.52, ENEMY_SIDES[enemy.kind], 0.4);
  ctx.fill();
  ctx.restore();

  // The eye: a bright pupil riding toward the heading, in a dark socket.
  const look = enemy.kind === 'splitter' || enemy.kind === 'boss' ? elapsed * 0.9 : enemy.angle;
  const ex = Math.cos(look) * r * 0.22;
  const ey = Math.sin(look) * r * 0.22;
  ctx.fillStyle = COLORS.eye;
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.3, 0, TAU);
  ctx.fill();
  glow(ctx, '#ffffff', 8);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex + Math.cos(look) * r * 0.1, ey + Math.sin(look) * r * 0.1, Math.max(1.6, r * 0.13), 0, TAU);
  ctx.fill();
  noGlow(ctx);
  ctx.restore();

  // An elite wears a broken gold ring; a Hollow that has been eating
  // shards wears them — gold pips studded around its hull, one per meal.
  if (enemy.elite) {
    ctx.strokeStyle = COLORS.elite;
    ctx.lineWidth = 2.5;
    glow(ctx, COLORS.elite, 12);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r + 11, elapsed * 1.3, elapsed * 1.3 + TAU * 0.72);
    ctx.stroke();
    noGlow(ctx);
  }
  if (enemy.growth > 0) {
    ctx.fillStyle = COLORS.shard;
    for (let i = 0; i < Math.min(6, enemy.growth); i += 1) {
      const a = (i / Math.min(6, enemy.growth)) * TAU + elapsed * 0.8;
      ctx.beginPath();
      ctx.arc(enemy.x + Math.cos(a) * (r + 4), enemy.y + Math.sin(a) * (r + 4), 2.4, 0, TAU);
      ctx.fill();
    }
  }

  if (enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    const h = enemy.kind === 'boss' ? 6 : 3;
    ctx.fillStyle = 'rgba(230, 235, 255, 0.25)';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 12, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), h);
  }
}

export function drawOrb(ctx, orb, elapsed) {
  const color = COLORS[orb.from] ?? COLORS.weaver;
  const pulse = 1 + Math.sin(elapsed * 12 + orb.x) * 0.18;
  glow(ctx, color, 16);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius * pulse, 0, TAU);
  ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius * 0.38, 0, TAU);
  ctx.fill();
}

export function drawBullet(ctx, bullet) {
  glow(ctx, COLORS.bullet, 10);
  ctx.strokeStyle = COLORS.bullet;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bullet.x - Math.cos(bullet.angle) * 9, bullet.y - Math.sin(bullet.angle) * 9);
  ctx.lineTo(bullet.x, bullet.y);
  ctx.stroke();
  noGlow(ctx);
}

export function drawShard(ctx, shard, elapsed) {
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.spin);
  const fade = shard.life < 2 ? (Math.floor(elapsed * 10) % 2 === 0 ? 0.35 : 1) : 1;
  ctx.globalAlpha = fade;
  glow(ctx, COLORS.shard, 13);
  ctx.fillStyle = COLORS.shard;
  polygon(ctx, 0, 0, shard.radius, 4, 0);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  noGlow(ctx);
}

export function drawParticle(ctx, particle) {
  ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
  ctx.fillStyle = particle.color;
  ctx.fillRect(particle.x - particle.radius / 2, particle.y - particle.radius / 2, particle.radius, particle.radius);
  ctx.globalAlpha = 1;
}

// A dropped skill Core: a bright diamond in its kind's colour, its
// letter worn on its face and its name written under it, bobbing and
// blinking as its thirteen seconds run out. It should read at a glance
// across a screenshot: this kill left power behind.
// A dash ghost: the ship's hull outline left hanging where the dash
// carried it, fading in a third of a second. Speed you can see.
export function drawGhost(ctx, ghost) {
  ctx.save();
  ctx.translate(ghost.x, ghost.y);
  ctx.rotate(ghost.angle);
  ctx.globalAlpha = Math.max(0, ghost.life / ghost.maxLife) * 0.4;
  ctx.strokeStyle = COLORS.ship;
  ctx.lineWidth = 1.6;
  const r = 13;
  ctx.beginPath();
  ctx.moveTo(r + 7, 0);
  ctx.lineTo(-r + 3, 5);
  ctx.lineTo(-r - 6, r + 4);
  ctx.lineTo(-r - 2, 3);
  ctx.lineTo(-r - 2, -3);
  ctx.lineTo(-r - 6, -r - 4);
  ctx.lineTo(-r + 3, -5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// The ship's trail ribbon: its last positions joined in a tapering
// line, so every turn draws a brushstroke across the dark.
export function drawTrail(ctx, trail) {
  if (trail.length < 3) return;
  for (let i = 1; i < trail.length; i += 1) {
    const t = i / trail.length;
    ctx.strokeStyle = COLORS.ship;
    ctx.globalAlpha = t * 0.35;
    ctx.lineWidth = 1 + t * 3.4;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// A shockwave ring: the visible edge of something big breaking.
export function drawShockwave(ctx, wave) {
  const t = wave.r / wave.maxR;
  ctx.globalAlpha = Math.max(0, 1 - t) * 0.7;
  ctx.strokeStyle = wave.color;
  ctx.lineWidth = 3.5 * (1 - t) + 0.5;
  glow(ctx, wave.color, 14);
  ctx.beginPath();
  ctx.arc(wave.x, wave.y, wave.r, 0, TAU);
  ctx.stroke();
  noGlow(ctx);
  ctx.globalAlpha = 1;
}

export function drawPickup(ctx, pickup, def, elapsed) {
  const bob = Math.sin(pickup.bobPhase) * 3;
  const fade = pickup.life < 2.5 ? (Math.floor(elapsed * 9) % 2 === 0 ? 0.3 : 1) : 1;
  ctx.save();
  ctx.translate(pickup.x, pickup.y + bob);
  ctx.globalAlpha = fade;
  glow(ctx, def.color, 18);
  ctx.fillStyle = def.color;
  polygon(ctx, 0, 0, pickup.radius, 4, Math.PI / 4);
  ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = COLORS.eye;
  polygon(ctx, 0, 0, pickup.radius * 0.62, 4, Math.PI / 4);
  ctx.fill();
  text(ctx, def.letter, 0, 1, 13, def.color, 'center', 900);
  ctx.restore();
  ctx.globalAlpha = 1;
  text(ctx, def.name, pickup.x, pickup.y + bob + 24, 10, def.color, 'center', 800);
}

export function drawMissile(ctx, missile) {
  ctx.save();
  ctx.translate(missile.x, missile.y);
  ctx.rotate(missile.angle);
  ctx.strokeStyle = COLORS.missile;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-20, 0);
  ctx.stroke();
  ctx.globalAlpha = 1;
  glow(ctx, COLORS.missile, 12);
  ctx.fillStyle = COLORS.missile;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-6, -4);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);
  ctx.restore();
}

// A gravity rift: violet spiral arms winding into a dark heart. It
// fades in and out with its life so its arrival is a warning, not a jump.
export function drawRift(ctx, rift, elapsed) {
  const fade = Math.min(1, rift.life / 1.2, (rift.maxLife - rift.life) / 1.2 + 0.15);
  ctx.save();
  ctx.translate(rift.x, rift.y);
  ctx.globalAlpha = Math.max(0, fade) * 0.9;
  ctx.strokeStyle = COLORS.rift;
  glow(ctx, COLORS.rift, 16);
  for (let arm = 0; arm < 3; arm += 1) {
    ctx.beginPath();
    for (let i = 0; i <= 22; i += 1) {
      const t = i / 22;
      const a = rift.spin + arm * (TAU / 3) + t * 2.4;
      const rr = rift.radius * (1 - t * 0.82);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  noGlow(ctx);
  ctx.fillStyle = '#05030f';
  ctx.beginPath();
  ctx.arc(0, 0, 13 + Math.sin(elapsed * 5) * 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.rift;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawWake(ctx, wake) {
  ctx.globalAlpha = Math.max(0, wake.life / wake.maxLife) * 0.35;
  ctx.fillStyle = COLORS.ship;
  ctx.beginPath();
  ctx.arc(wake.x, wake.y, wake.radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Floating words: score popups, pickup names, warnings. They rise and
// fade on their own clocks; main.js spawns them where things happen.
export function drawFloater(ctx, floater) {
  const t = 1 - floater.life / floater.maxLife;
  ctx.globalAlpha = Math.max(0, 1 - t * t);
  text(ctx, floater.text, floater.x, floater.y - t * 34, floater.size, floater.color, 'center', 800);
  ctx.globalAlpha = 1;
}

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight ?? 600} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function drawHud(ctx, state) {
  const { player, score, wave, combo, comboTime, shards } = state;

  // Hull hearts, top-left.
  for (let i = 0; i < player.maxHp; i += 1) {
    const x = 26 + i * 26;
    ctx.fillStyle = i < player.hp ? COLORS.heart : 'rgba(255, 93, 122, 0.22)';
    glow(ctx, COLORS.heart, i < player.hp ? 9 : 0);
    polygon(ctx, x, 26, 9, 3, -Math.PI / 2);
    ctx.fill();
  }
  noGlow(ctx);
  if (player.shield > 0) text(ctx, `SHIELD ${player.shield}`, 24, 52, 12, COLORS.shield, 'left', 700);

  // Active stolen skills, as chips under the hearts with their seconds.
  (state.effects ?? []).forEach((effect, i) => {
    const y = 76 + i * 24;
    ctx.fillStyle = 'rgba(14, 20, 48, 0.8)';
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(18, y - 10, 168, 20, 6);
    ctx.fill();
    ctx.stroke();
    text(ctx, `${effect.label}  ${Math.ceil(effect.seconds)}s`, 26, y + 1, 12, effect.color, 'left', 800);
  });

  text(ctx, `WAVE ${wave}`, ARENA.width / 2, 26, 20, COLORS.text, 'center', 800);

  // The Dreadnought gets a bar of its own, wide as the sky it darkens.
  if (state.boss) {
    const w = 340;
    const x = ARENA.width / 2 - w / 2;
    text(ctx, state.boss.enraged ? 'THE DREADNOUGHT — ENRAGED' : 'THE DREADNOUGHT', ARENA.width / 2, 48, 12, COLORS.boss, 'center', 800);
    ctx.fillStyle = 'rgba(255, 71, 71, 0.22)';
    ctx.fillRect(x, 58, w, 7);
    ctx.fillStyle = COLORS.boss;
    glow(ctx, COLORS.boss, 10);
    ctx.fillRect(x, 58, w * Math.max(0, state.boss.hp / state.boss.maxHp), 7);
    noGlow(ctx);
  }
  text(ctx, `SCORE ${score.toLocaleString('en-US')}`, ARENA.width - 24, 24, 20, COLORS.text, 'right', 800);
  text(ctx, `◆ ${shards} SHARDS`, ARENA.width - 24, 50, 13, COLORS.shard, 'right', 700);

  // Combo meter under the score: the multiplier and its draining bar.
  if (combo > 1) {
    text(ctx, `COMBO ×${combo}`, ARENA.width - 24, 76, 15, COLORS.shard, 'right', 800);
    ctx.fillStyle = 'rgba(255, 217, 77, 0.25)';
    ctx.fillRect(ARENA.width - 24 - 110, 88, 110, 4);
    ctx.fillStyle = COLORS.shard;
    ctx.fillRect(ARENA.width - 24 - 110, 88, 110 * Math.max(0, comboTime), 4);
  }

  // Dash readiness, bottom-left.
  const ready = player.dashCooldown <= 0;
  text(ctx, ready ? 'DASH READY (SHIFT)' : 'DASH …', 24, ARENA.height - 22, 12, ready ? COLORS.ship : COLORS.dim, 'left', 700);

  // Starfall: charged by a maxed combo, loosed with E. When it is ready
  // it pulses at the bottom centre where the eye already rests.
  if (state.starfallReady) {
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 130);
    ctx.globalAlpha = pulse;
    glow(ctx, COLORS.shard, 16);
    text(ctx, '★ STARFALL READY — PRESS E ★', ARENA.width / 2, ARENA.height - 24, 16, COLORS.shard, 'center', 900);
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

export function drawWorld(ctx, state) {
  drawBackground(ctx, state);
  for (const rift of state.rifts ?? []) drawRift(ctx, rift, state.elapsed);
  for (const wave of state.shockwaves ?? []) drawShockwave(ctx, wave);
  for (const wake of state.wakes ?? []) drawWake(ctx, wake);
  drawTrail(ctx, state.trail ?? []);
  for (const ghost of state.ghosts ?? []) drawGhost(ctx, ghost);
  for (const shard of state.shards) drawShard(ctx, shard, state.elapsed);
  for (const pickup of state.pickups ?? []) drawPickup(ctx, pickup, PICKUP_KINDS[pickup.pickupKind], state.elapsed);
  for (const bullet of state.bullets) drawBullet(ctx, bullet);
  for (const missile of state.missiles ?? []) drawMissile(ctx, missile);
  for (const orb of state.orbs ?? []) drawOrb(ctx, orb, state.elapsed);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.elapsed);
  for (const particle of state.particles) drawParticle(ctx, particle);
  for (const floater of state.floaters ?? []) drawFloater(ctx, floater);
  if (state.player !== null && state.screen === 'play') drawPlayer(ctx, state.player, state.elapsed);

  // A soft vignette keeps the eye in the arena; at one hull it breathes
  // red, because the ship is about to become a memory.
  const grad = ctx.createRadialGradient(ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.42, ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.86);
  grad.addColorStop(0, 'rgba(2, 3, 10, 0)');
  grad.addColorStop(1, 'rgba(2, 3, 10, 0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  if (state.screen === 'play' && state.player !== null && state.player.hp === 1) {
    ctx.strokeStyle = `rgba(255, 60, 90, ${0.25 + 0.2 * Math.sin(state.elapsed * 5)})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(2, 2, ARENA.width - 4, ARENA.height - 4);
  }
  // The white blink of a nova or a Starfall, fading on its own clock.
  if ((state.flash ?? 0) > 0) {
    ctx.fillStyle = `rgba(240, 246, 255, ${Math.min(0.55, state.flash)})`;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }
  // Cinematic bars while a Dreadnought announces itself.
  if ((state.letterbox ?? 0) > 0) {
    const h = 34 * Math.min(1, state.letterbox / 0.4 + 0.3);
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, ARENA.width, h);
    ctx.fillRect(0, ARENA.height - h, ARENA.width, h);
  }
}
