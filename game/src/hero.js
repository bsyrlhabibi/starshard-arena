// hero.js — the kid himself: a chibi pilot standing tall in the 3/4
// view, blaster rig tracking the true aim, and the dash ghosts he
// leaves hanging in the air behind him.

import { COLORS } from './palette.js';
import { TAU, glow, noGlow, rr } from './gfx.js';

// One cannon of the kid's blaster rig: a chunky neon gun, drawn at a
// grip offset, with a muzzle star on the frames right after it fires.
function drawBlaster(ctx, gx, gy, flash) {
  ctx.save();
  ctx.translate(gx, gy);
  ctx.fillStyle = '#232c52';
  rr(ctx, -2, -4.5, 24, 9, 3);
  ctx.fill();
  glow(ctx, COLORS.ship, 9);
  ctx.fillStyle = COLORS.ship;
  ctx.fillRect(4, -1.8, 10, 3.6);
  noGlow(ctx);
  ctx.fillStyle = '#39406e';
  rr(ctx, 18, -3, 8, 6, 2);
  ctx.fill();
  ctx.fillStyle = COLORS.shard;
  ctx.fillRect(-4, -2.5, 3, 5);
  if (flash) {
    glow(ctx, COLORS.shard, 14);
    ctx.fillStyle = COLORS.shard;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + 0.4;
      ctx.beginPath();
      ctx.moveTo(27, 0);
      ctx.lineTo(27 + Math.cos(a - 0.32) * 6, Math.sin(a - 0.32) * 6);
      ctx.lineTo(27 + Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(27 + Math.cos(a + 0.32) * 6, Math.sin(a + 0.32) * 6);
      ctx.closePath();
      ctx.fill();
    }
    noGlow(ctx);
  }
  ctx.restore();
}

// The hero, standing up now: a kid in the 3/4 view of the design
// template — full body, spiky cyan hair, red headband, yellow jacket,
// teal backpack, and a blaster rig that still tracks the true aim
// angle even while his body faces left or right. He runs with a real
// stride, bobs when idle, blinks, and his boots leave the ground shadow
// behind. The blaster(s) reuse drawBlaster, one per Forge cannon.
export function drawPlayer(ctx, player, elapsed) {
  const blink = player.invulnerableTime > 0 && Math.floor(elapsed * 18) % 2 === 0;
  if (blink) return;
  const speed = Math.hypot(player.vx, player.vy);
  const moving = speed > 30;
  const runPhase = elapsed * (moving ? 12 : 2.2);
  const stride = Math.sin(runPhase);
  const bob = moving ? -Math.abs(Math.sin(runPhase)) * 3 : Math.sin(elapsed * 2) * 0.9;
  const facing = Math.cos(player.angle) >= 0 ? 1 : -1;
  const recoil = player.fireCooldown > 0 ? Math.min(4, player.fireCooldown * 30) : 0;
  const justFired = player.fireCooldown > player.stats.fireInterval * 0.55;

  ctx.save();
  ctx.translate(player.x, player.y + 17);
  // Ground shadow: the cheapest depth cue there is.
  ctx.fillStyle = 'rgba(2, 3, 10, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 21, 6.5, 0, 0, TAU);
  ctx.fill();

  ctx.translate(0, bob);
  ctx.save();
  ctx.scale(facing, 1);
  // Legs mid-stride, navy pants and bright shoes.
  ctx.strokeStyle = '#2b3a67';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const footX = stride * (moving ? 9 : 0) * side - 2;
    const footY = -2 - (moving && stride * side > 0 ? 3 : 0);
    ctx.beginPath();
    ctx.moveTo(side * 3.5, -27);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.fillStyle = '#e8fffa';
    rr(ctx, footX - 5, footY - 3.5, 11, 6, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.ship;
    ctx.fillRect(footX + 1, footY - 3.5, 4, 6);
  }
  // Shorts.
  ctx.fillStyle = '#2e4a8f';
  rr(ctx, -8.5, -36, 17, 10, 3);
  ctx.fill();
  // Backpack, riding behind the jacket.
  ctx.fillStyle = '#0f7d8c';
  rr(ctx, -18, -58, 9, 21, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.ship;
  ctx.fillRect(-16.5, -50, 5.5, 4);
  // The yellow jacket, shaded like the template: lit top, deep hem.
  const jacket = ctx.createLinearGradient(0, -62, 0, -34);
  jacket.addColorStop(0, '#ffd94d');
  jacket.addColorStop(1, '#dd8f12');
  ctx.fillStyle = jacket;
  rr(ctx, -11.5, -62, 23, 28, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 50, 0, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(2, -60);
  ctx.lineTo(2, -37);
  ctx.stroke();
  // Arms reaching forward to the grips.
  ctx.strokeStyle = '#e8a914';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(4, -54);
  ctx.lineTo(15, -45);
  ctx.moveTo(3, -42);
  ctx.lineTo(14, -40);
  ctx.stroke();

  // The head: big, spiky, headbanded, grinning at the fight.
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath();
  ctx.arc(2, -74, 13.5, 0, TAU);
  ctx.fill();
  glow(ctx, '#37c8ff', 8);
  ctx.fillStyle = '#37c8ff';
  for (const a of [-2.5, -1.95, -1.4, -0.85, -0.35]) {
    const bx = 2 + Math.cos(a) * 9.5;
    const by = -74 + Math.sin(a) * 9.5;
    const tx = 2 + Math.cos(a) * 23;
    const ty = -74 + Math.sin(a) * 23;
    const px = Math.cos(a + Math.PI / 2) * 4.6;
    const py = Math.sin(a + Math.PI / 2) * 4.6;
    ctx.beginPath();
    ctx.moveTo(bx + px, by + py);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx - px, by - py);
    ctx.closePath();
    ctx.fill();
  }
  noGlow(ctx);
  // Headband tails streaming behind, then the band itself.
  ctx.fillStyle = '#ff4757';
  const wave = Math.sin(elapsed * 6) * 2.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-9, -78 + side * 3);
    ctx.lineTo(-21, -76 + side * 6 + wave * side);
    ctx.lineTo(-9, -71 + side * 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#ff4757';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.arc(2, -74, 12.2, -1.9, 0.6);
  ctx.stroke();
  // Face in 3/4: both eyes on the aim side, a grin under them.
  const blinking = elapsed % 3.7 < 0.11;
  ctx.fillStyle = '#20203a';
  for (const ex of [7.5, 13]) {
    if (blinking) {
      ctx.fillRect(ex - 1.8, -75.5, 3.6, 1.5);
    } else {
      ctx.beginPath();
      ctx.ellipse(ex, -74.5, 1.8, 2.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 0.7, -75.4, 0.75, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#20203a';
    }
  }
  ctx.strokeStyle = '#a34d2e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(9.5, -68.5, 3.2, 0.3, 1.9);
  ctx.stroke();
  ctx.restore();

  // The blaster rig tracks the true aim, whatever the body is doing.
  const guns = player.stats.cannons >= 3 ? [-8, 0, 8] : player.stats.cannons === 2 ? [-5.5, 5.5] : [0];
  for (const off of guns) {
    ctx.save();
    ctx.translate(facing * 12, -46 + bob);
    ctx.rotate(player.angle);
    ctx.translate(-recoil, off);
    drawBlaster(ctx, 0, 0, justFired);
    ctx.restore();
  }
  ctx.restore();

  if (player.shield > 0) {
    // The Aegis bubble: a soap-film dome of light around the whole
    // kid, filled faintly so it reads as a bubble, not just a ring.
    ctx.fillStyle = 'rgba(122, 184, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y - 22, 36, 46, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = COLORS.shield;
    ctx.globalAlpha = 0.6 + 0.25 * Math.sin(elapsed * 4);
    ctx.lineWidth = 2;
    glow(ctx, COLORS.shield, 12);
    ctx.beginPath();
    ctx.ellipse(player.x, player.y - 22, 36, 46, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    noGlow(ctx);
  }
}

// ---------------------------------------------------------------------
// The Hollow, standing up: the 3/4 creature pass. Every kind is drawn
// as an upright or hovering character on a ground shadow — anatomy
// first (teeth, sacs, cloaks, plates, wings, tentacles), shaded with
// gradients and highlights so bodies have volume, and animated the way
// it fights: mouths chew, noses light before a lunge, stingers charge,
// mouths open before they spit. Painters draw in a frame translated to
// the enemy's position; +y is the ground at its feet.
// ---------------------------------------------------------------------

// A dropped skill Core: a bright diamond in its kind's colour, its
// letter worn on its face and its name written under it, bobbing and
// blinking as its thirteen seconds run out. It should read at a glance
// across a screenshot: this kill left power behind.
// A dash ghost: the kid's upright outline left hanging where the dash
// carried him, fading in a third of a second. Speed you can see.
export function drawGhost(ctx, ghost) {
  ctx.save();
  ctx.translate(ghost.x, ghost.y + 17);
  ctx.scale(Math.cos(ghost.angle) >= 0 ? 1 : -1, 1);
  ctx.globalAlpha = Math.max(0, ghost.life / ghost.maxLife) * 0.4;
  ctx.strokeStyle = COLORS.ship;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(2, -74, 12, 0, TAU);
  ctx.stroke();
  rr(ctx, -11, -62, 22, 28, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, -46);
  ctx.lineTo(30, -46);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}
