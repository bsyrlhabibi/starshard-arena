// render.js — the conductor: one pass over the world state, painting
// backdrop, props, actors back-to-front by ground line, then the
// atmosphere (vignette, flashes, cinematic bars). Each layer's own
// painters live in their own module; this file only keeps the order.

import { ARENA, PICKUP_KINDS } from './entities.js';
import { drawBackground } from './backdrop.js';
import { drawGhost, drawPlayer } from './hero.js';
import { drawEnemy } from './hollow.js';
import { drawBeam, drawBullet, drawFloater, drawMissile, drawOrb, drawParticle, drawPickup, drawRift, drawShard, drawShockwave, drawTrail, drawWake } from './props.js';

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
  // Actors are painted back-to-front by ground line, so a creature
  // lower on the floor stands in front of one higher up: the 3/4 depth
  // the whole look depends on.
  const actors = [];
  for (const enemy of state.enemies) actors.push({ y: enemy.y, draw: () => drawEnemy(ctx, enemy, state.elapsed) });
  if (state.player !== null && state.screen === 'play') actors.push({ y: state.player.y, draw: () => drawPlayer(ctx, state.player, state.elapsed) });
  actors.sort((a, b) => a.y - b.y);
  for (const actor of actors) actor.draw();
  // The beam pours over the bodies it is burning through.
  if (state.beam) drawBeam(ctx, state.beam, state.elapsed);
  for (const particle of state.particles) drawParticle(ctx, particle);
  for (const floater of state.floaters ?? []) drawFloater(ctx, floater);

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
