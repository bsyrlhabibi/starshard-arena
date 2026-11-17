// props.js — everything in the arena that is neither hero nor
// Hollow: bullets, orbs, shards, dropped skill Cores on their light
// pedestals, missiles, rifts, dash wakes, shockwaves and floaters.

import { COLORS } from './palette.js';
import { TAU, glow, noGlow, polygon, text } from './gfx.js';

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
  // The pedestal: a pool of the Core's own light on the floor and a
  // faint column rising from it, so dropped power sits on a plinth
  // and reads across the arena, the way the template stages it.
  ctx.save();
  ctx.globalAlpha = fade * (0.6 + 0.16 * Math.sin(pickup.bobPhase * 1.4));
  const pool = ctx.createRadialGradient(pickup.x, pickup.y + 13, 2, pickup.x, pickup.y + 13, 31);
  pool.addColorStop(0, def.color + '66');
  pool.addColorStop(1, def.color + '00');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(pickup.x, pickup.y + 13, 31, 10.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = def.color;
  ctx.globalAlpha = fade * 0.10;
  ctx.fillRect(pickup.x - 7, pickup.y - 15 + bob, 14, 27);
  ctx.restore();
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

// The Lance Beam: while a stolen Lance Core burns, the blaster stops
// throwing bolts and pours one continuous bar of light instead. Three
// passes — a wide coloured wash, a hot mid-band, a white core — with
// a double-frequency flicker and a bloom where the light lands.
export function drawBeam(ctx, beam, elapsed) {
  const flicker = 0.82 + 0.18 * Math.sin(elapsed * 47) * Math.sin(elapsed * 31 + 1.3);
  const x2 = beam.x + Math.cos(beam.angle) * beam.length;
  const y2 = beam.y + Math.sin(beam.angle) * beam.length;
  ctx.save();
  ctx.lineCap = 'round';
  glow(ctx, '#ffe066', 22);
  ctx.strokeStyle = 'rgba(255, 176, 92, 0.30)';
  ctx.lineWidth = 15 * flicker;
  ctx.beginPath();
  ctx.moveTo(beam.x, beam.y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 224, 102, 0.78)';
  ctx.lineWidth = 6.5 * flicker;
  ctx.beginPath();
  ctx.moveTo(beam.x, beam.y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  noGlow(ctx);
  ctx.strokeStyle = '#fffbe8';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(beam.x, beam.y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  glow(ctx, '#ffe066', 18);
  ctx.fillStyle = 'rgba(255, 240, 190, 0.9)';
  ctx.beginPath();
  ctx.arc(x2, y2, 5.5 * flicker, 0, TAU);
  ctx.fill();
  noGlow(ctx);
  ctx.restore();
}
