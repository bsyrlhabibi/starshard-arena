// render.js — everything the player sees, drawn on one canvas.
//
// The look is neon-on-deep-space: a near-black indigo void, a faint
// perspective grid, parallax stars, and every actor drawn as a glowing
// geometric sigil in one fixed palette (cyan ship, gold shards, and one
// hue per Hollow kind). This file only reads state; entities.js owns
// the truth of where things are.

import { ARENA, ENEMY_KINDS } from './entities.js';

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
  boss: '#ff4747',
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

function drawBackground(ctx, stars, elapsed) {
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

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

  for (const star of stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(elapsed * (1 + star.depth) + star.x);
    ctx.globalAlpha = 0.35 + 0.5 * star.depth * twinkle;
    ctx.fillStyle = COLORS.star;
    ctx.fillRect(star.x, star.y, star.size, star.size);
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

const ENEMY_SIDES = { chaser: 4, dart: 3, splitter: 6, mini: 4, weaver: 5, boss: 8 };

// Every Hollow kind is drawn as a sigil with a face: a dark heart and a
// single bright eye that stares along its heading, so the swarm reads
// as creatures hunting you, not as confetti. Each kind adds one
// signature detail on top of that shared anatomy.
export function drawEnemy(ctx, enemy, elapsed) {
  const color = COLORS[enemy.kind];
  const r = enemy.radius;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

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

  text(ctx, `WAVE ${wave}`, ARENA.width / 2, 26, 20, COLORS.text, 'center', 800);
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
  drawBackground(ctx, state.stars, state.elapsed);
  for (const shard of state.shards) drawShard(ctx, shard, state.elapsed);
  for (const bullet of state.bullets) drawBullet(ctx, bullet);
  for (const orb of state.orbs ?? []) drawOrb(ctx, orb, state.elapsed);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.elapsed);
  for (const particle of state.particles) drawParticle(ctx, particle);
  if (state.player !== null && state.screen === 'play') drawPlayer(ctx, state.player, state.elapsed);
}
