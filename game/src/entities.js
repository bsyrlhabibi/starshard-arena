// entities.js — the things that live in the arena and how they move.
//
// One factory per kind, one update per kind, and the collision passes
// that tie them together. Nothing here draws: render.js reads the same
// plain objects. Every entity is a plain record with x, y, vx, vy and a
// radius, which keeps the physics in this file honest and testable.

export const ARENA = { width: 960, height: 540 };

const TAU = Math.PI * 2;

export function createPlayer() {
  return {
    kind: 'player',
    x: ARENA.width / 2,
    y: ARENA.height / 2,
    vx: 0,
    vy: 0,
    radius: 21,
    angle: -Math.PI / 2,
    hp: 3,
    maxHp: 3,
    shield: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    dashTime: 0,
    invulnerableTime: 0,
    missileTimer: 0,
    // Upgradeable stats; upgrades.js mutates these between waves.
    stats: {
      speed: 265,
      fireInterval: 0.16,
      bulletDamage: 1,
      cannons: 1,
      magnetRadius: 74,
      dashRecharge: 1.6,
      pierce: 0,
      missileCount: 0,
    },
  };
}

export function createBullet(x, y, angle, damage, pierce = 0) {
  const speed = 640;
  return {
    kind: 'bullet',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 4,
    angle,
    damage,
    // How many extra Hollow the bolt flies through before it fades,
    // and the set of hulls it has already punched (so a piercing bolt
    // wounds each enemy once, not once per frame).
    pierce,
    hit: null,
    life: 0.9,
  };
}

// The Hollow kinds. Each entry is the whole personality of a kind: its
// name (the title screen introduces the cast by name), how tough, how
// quick, how it steers, what it is worth and what it drops. waves.js
// decides how many of each a wave sends; the Dreadnought is a boss that
// arrives alone every fifth wave.
export const ENEMY_KINDS = {
  chaser: { name: 'Stalker', hp: 3, speed: 104, radius: 23, score: 100, shards: 1, turn: 3.4 },
  dart: { name: 'Lance', hp: 2, speed: 162, radius: 18, score: 150, shards: 1, turn: 2.2 },
  splitter: { name: 'Brood', hp: 6, speed: 70, radius: 31, score: 200, shards: 2, turn: 2.6 },
  mini: { name: 'Mite', hp: 1, speed: 190, radius: 12, score: 50, shards: 0, turn: 4.6 },
  weaver: { name: 'Wraith', hp: 4, speed: 92, radius: 22, score: 250, shards: 2, turn: 3.0 },
  bulwark: { name: 'Bulwark', hp: 16, speed: 50, radius: 37, score: 400, shards: 4, turn: 1.6 },
  stinger: { name: 'Stinger', hp: 3, speed: 128, radius: 19, score: 300, shards: 2, turn: 3.8 },
  boss: { name: 'Dreadnought', hp: 70, speed: 42, radius: 66, score: 2500, shards: 14, turn: 1.1 },
};

export function createEnemy(kind, x, y, rng, hpScale, elite = false) {
  const base = ENEMY_KINDS[kind];
  const hp = Math.max(1, Math.round(base.hp * hpScale * (elite ? 3 : 1)));
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: base.radius * (elite ? 1.3 : 1),
    hp,
    maxHp: hp,
    angle: rng.range(0, TAU),
    wobblePhase: rng.range(0, TAU),
    lungeTime: rng.range(0.4, 1.4),
    // Wraiths, Stingers and the Dreadnought shoot plasma orbs on this
    // clock; the Dreadnought also sheds Mites on broodTime and charges
    // on chargeTime, and past half hull it enrages.
    shootTime: rng.range(1.2, 2.4),
    broodTime: 3.2,
    chargeTime: rng.range(3.5, 5),
    flashTime: 0,
    // An elite wears a gold ring, triples its hull and always drops a
    // skill Core. Any Hollow can also grow by eating dropped shards
    // before the ship collects them — growth counts what it has eaten.
    elite,
    growth: 0,
    enraged: false,
    score: base.score * (elite ? 3 : 1),
    shards: base.shards * (elite ? 3 : 1),
  };
}

/** A plasma orb: the only thing the Hollow fire back. Slow, bright, fair. */
export function createOrb(x, y, angle, from) {
  const speed = 175;
  return {
    kind: 'orb',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6,
    angle,
    from,
    life: 4.2,
  };
}

export function updateOrb(orb, dt) {
  orb.x += orb.vx * dt;
  orb.y += orb.vy * dt;
  orb.life -= dt;
  return orb.life > 0 && orb.x > -24 && orb.x < ARENA.width + 24 && orb.y > -24 && orb.y < ARENA.height + 24;
}

export function createShard(x, y, rng) {
  return {
    kind: 'shard',
    x,
    y,
    vx: rng.range(-70, 70),
    vy: rng.range(-70, 70),
    radius: 6,
    spin: rng.range(0, TAU),
    life: 20,
    homing: false,
  };
}

export function createParticle(x, y, rng, color, speed, life, size) {
  const angle = rng.range(0, TAU);
  const v = rng.range(speed * 0.25, speed);
  return {
    kind: 'particle',
    x,
    y,
    vx: Math.cos(angle) * v,
    vy: Math.sin(angle) * v,
    radius: size,
    color,
    life,
    maxLife: life,
  };
}

export function burst(particles, x, y, rng, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    particles.push(createParticle(x, y, rng, color, speed, rng.range(0.3, 0.8), rng.range(1.5, 3.4)));
  }
}

function steer(enemy, targetAngle, dt) {
  const turn = ENEMY_KINDS[enemy.kind].turn;
  let diff = targetAngle - enemy.angle;
  while (diff > Math.PI) diff -= TAU;
  while (diff < -Math.PI) diff += TAU;
  enemy.angle += Math.max(-turn * dt, Math.min(turn * dt, diff));
}

export function updatePlayer(player, input, dt) {
  const move = input.moveVector();
  const length = Math.hypot(move.x, move.y);
  const dashing = player.dashTime > 0;
  const speed = player.stats.speed * (dashing ? 2.6 : 1);
  if (length > 0) {
    player.vx = (move.x / length) * speed;
    player.vy = (move.y / length) * speed;
  } else {
    player.vx *= Math.max(0, 1 - dt * 10);
    player.vy *= Math.max(0, 1 - dt * 10);
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(player.radius, Math.min(ARENA.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(ARENA.height - player.radius, player.y));

  player.angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  player.invulnerableTime = Math.max(0, player.invulnerableTime - dt);
}

export function tryDash(player, input, audio) {
  const wantsDash = input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight') || input.wasPressed('KeyJ');
  if (wantsDash && player.dashCooldown <= 0 && player.dashTime <= 0) {
    player.dashTime = 0.16;
    player.dashCooldown = player.stats.dashRecharge;
    player.invulnerableTime = Math.max(player.invulnerableTime, 0.22);
    audio.dash();
  }
}

/** Fire from every cannon the player owns; returns the new bullets. */
export function playerShots(player, input, audio) {
  if (!input.firing() || player.fireCooldown > 0) return [];
  player.fireCooldown = player.stats.fireInterval;
  audio.shoot();
  const cannons = player.stats.cannons;
  const shots = [];
  for (let i = 0; i < cannons; i += 1) {
    const spread = (i - (cannons - 1) / 2) * 0.13;
    const noseX = player.x + Math.cos(player.angle) * (player.radius + 4);
    const noseY = player.y + Math.sin(player.angle) * (player.radius + 4);
    shots.push(createBullet(noseX, noseY, player.angle + spread, player.stats.bulletDamage, player.stats.pierce));
  }
  return shots;
}

export function updateEnemy(enemy, player, dt, elapsed) {
  const base = ENEMY_KINDS[enemy.kind];
  const speed = base.speed * (enemy.speedMul ?? 1);
  const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);

  if (enemy.kind === 'dart') {
    // Darts circle-strafe until their lunge timer fires, then dive.
    enemy.lungeTime -= dt;
    if (enemy.lungeTime <= 0) {
      enemy.lungeTime = 1.5;
      enemy.vx = Math.cos(toPlayer) * speed * 2.5;
      enemy.vy = Math.sin(toPlayer) * speed * 2.5;
    }
    steer(enemy, toPlayer, dt);
    enemy.vx *= Math.max(0, 1 - dt * 1.6);
    enemy.vy *= Math.max(0, 1 - dt * 1.6);
    enemy.x += (Math.cos(enemy.angle) * speed * 0.55 + enemy.vx) * dt;
    enemy.y += (Math.sin(enemy.angle) * speed * 0.55 + enemy.vy) * dt;
  } else if (enemy.kind === 'weaver') {
    // Weavers approach on a sine path, which makes their line wobble.
    steer(enemy, toPlayer, dt);
    const sway = Math.sin(elapsed * 3.1 + enemy.wobblePhase) * 0.9;
    const dir = enemy.angle + sway * 0.6;
    enemy.x += Math.cos(dir) * speed * dt;
    enemy.y += Math.sin(dir) * speed * dt;
  } else if (enemy.kind === 'stinger') {
    // Stingers are duelists: they hold a firing range of about 230,
    // strafing sideways while they close or back away to keep it.
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    steer(enemy, toPlayer, dt);
    const radial = dist > 260 ? 1 : dist < 190 ? -1 : 0;
    const strafe = Math.sin(elapsed * 1.7 + enemy.wobblePhase) > 0 ? 1 : -1;
    const mx = Math.cos(enemy.angle) * radial + Math.cos(enemy.angle + Math.PI / 2) * strafe * 0.7;
    const my = Math.sin(enemy.angle) * radial + Math.sin(enemy.angle + Math.PI / 2) * strafe * 0.7;
    enemy.x += mx * speed * dt;
    enemy.y += my * speed * dt;
  } else if (enemy.kind === 'boss') {
    // The Dreadnought mostly drifts at the ship like a moon falling —
    // until its charge clock fires and it lunges, twice as fast as a
    // Lance, with a hull that does not notice the impact. Enraged, the
    // drift and the lunge both quicken by half again.
    const rage = enemy.enraged ? 1.5 : 1;
    enemy.chargeTime -= dt;
    if (enemy.chargeTime <= 0) {
      enemy.chargeTime = rngFreeCharge() / rage;
      enemy.vx = Math.cos(toPlayer) * speed * 6.4 * rage;
      enemy.vy = Math.sin(toPlayer) * speed * 6.4 * rage;
    }
    steer(enemy, toPlayer, dt);
    enemy.vx *= Math.max(0, 1 - dt * 1.1);
    enemy.vy *= Math.max(0, 1 - dt * 1.1);
    enemy.x += (Math.cos(enemy.angle) * speed * rage + enemy.vx) * dt;
    enemy.y += (Math.sin(enemy.angle) * speed * rage + enemy.vy) * dt;
  } else {
    steer(enemy, toPlayer, dt);
    enemy.x += Math.cos(enemy.angle) * speed * dt;
    enemy.y += Math.sin(enemy.angle) * speed * dt;
  }
  enemy.flashTime = Math.max(0, enemy.flashTime - dt);
}

function rngFreeCharge() {
  // Charge cadence lives here so updateEnemy stays free of the run rng:
  // a plain 4.2–5.6 second window is variety enough for a boss.
  return 4.2 + Math.random() * 1.4;
}

export function updateBullet(bullet, dt) {
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  bullet.life -= dt;
  return bullet.life > 0 && bullet.x > -20 && bullet.x < ARENA.width + 20 && bullet.y > -20 && bullet.y < ARENA.height + 20;
}

export function updateShard(shard, player, dt) {
  shard.life -= dt;
  shard.spin += dt * 3;
  const dx = player.x - shard.x;
  const dy = player.y - shard.y;
  const dist = Math.hypot(dx, dy);
  if (shard.homing) {
    // The wave-clear sweep: a shard that is homing never fades and
    // accelerates at the ship from any distance, so a cleared arena
    // visibly pays out before the Forge opens.
    shard.life = Math.max(shard.life, 1);
    if (dist > 1) {
      shard.vx += (dx / dist) * 1500 * dt;
      shard.vy += (dy / dist) * 1500 * dt;
    }
  } else if (dist < player.stats.magnetRadius && dist > 1) {
    const pull = 340 * (1 - dist / player.stats.magnetRadius) + 60;
    shard.vx += (dx / dist) * pull * dt * 3;
    shard.vy += (dy / dist) * pull * dt * 3;
  }
  shard.vx *= Math.max(0, 1 - dt * 2.4);
  shard.vy *= Math.max(0, 1 - dt * 2.4);
  shard.x += shard.vx * dt;
  shard.y += shard.vy * dt;
  return shard.life > 0;
}

export function updateParticle(particle, dt) {
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vx *= Math.max(0, 1 - dt * 2);
  particle.vy *= Math.max(0, 1 - dt * 2);
  particle.life -= dt;
  return particle.life > 0;
}

export function overlaps(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

// ---------------------------------------------------------------------
// Skill Cores: what the Hollow drop when they break.
//
// A kill is not just points — sometimes the wreck leaves a Core, a
// stolen piece of Hollow skill the ship can fly over and make its own:
// a burst of speed, a nova, a rack of seeker missiles. Elites always
// drop one; the Dreadnought drops two; anything else drops one now and
// then, so a fight can turn on what the last kill left behind.
// ---------------------------------------------------------------------

export const PICKUP_KINDS = {
  overdrive: { name: 'OVERDRIVE', letter: 'O', color: '#ffb35c', seconds: 10 },
  seekers: { name: 'SEEKER MISSILES', letter: 'S', color: '#c9a7ff', seconds: 12 },
  piercing: { name: 'PIERCING BOLTS', letter: 'P', color: '#4dd8ff', seconds: 12 },
  nova: { name: 'NOVA BURST', letter: 'N', color: '#ff5d7a', seconds: 0 },
  aegis: { name: 'AEGIS CELL', letter: 'A', color: '#7ab8ff', seconds: 0 },
  repair: { name: 'REPAIR NANITES', letter: '+', color: '#7dff9a', seconds: 0 },
  magnet: { name: 'SHARD VACUUM', letter: 'M', color: '#ffd94d', seconds: 0 },
};

export function createPickup(kind, x, y, rng) {
  return {
    kind: 'pickup',
    pickupKind: kind,
    x,
    y,
    vx: rng.range(-26, 26),
    vy: rng.range(-26, 26),
    radius: 12,
    bobPhase: rng.range(0, TAU),
    life: 13,
  };
}

export function updatePickup(pickup, player, dt) {
  pickup.life -= dt;
  pickup.bobPhase += dt * 3.2;
  // Cores lean toward a near ship harder than shards do — they want
  // to be taken — but they will not cross the arena for you.
  const dx = player.x - pickup.x;
  const dy = player.y - pickup.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 120 && dist > 1) {
    pickup.vx += (dx / dist) * 420 * dt;
    pickup.vy += (dy / dist) * 420 * dt;
  }
  pickup.vx *= Math.max(0, 1 - dt * 2.2);
  pickup.vy *= Math.max(0, 1 - dt * 2.2);
  pickup.x += pickup.vx * dt;
  pickup.y += pickup.vy * dt;
  return pickup.life > 0;
}

/** A seeker missile: slow off the rack, then it hunts. */
export function createMissile(x, y, angle) {
  return {
    kind: 'missile',
    x,
    y,
    vx: Math.cos(angle) * 190,
    vy: Math.sin(angle) * 190,
    radius: 5,
    angle,
    damage: 2,
    life: 2.8,
  };
}

export function updateMissile(missile, target, dt) {
  if (target !== null) {
    const want = Math.atan2(target.y - missile.y, target.x - missile.x);
    let diff = want - missile.angle;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    missile.angle += Math.max(-6.2 * dt, Math.min(6.2 * dt, diff));
  }
  const speed = Math.min(470, Math.hypot(missile.vx, missile.vy) + 620 * dt);
  missile.vx = Math.cos(missile.angle) * speed;
  missile.vy = Math.sin(missile.angle) * speed;
  missile.x += missile.vx * dt;
  missile.y += missile.vy * dt;
  missile.life -= dt;
  return missile.life > 0 && missile.x > -20 && missile.x < ARENA.width + 20 && missile.y > -20 && missile.y < ARENA.height + 20;
}

/** A gravity rift: a wound in the arena that drags the fight into it. */
export function createRift(x, y) {
  return {
    kind: 'rift',
    x,
    y,
    radius: 118,
    life: 12,
    maxLife: 12,
    spin: 0,
  };
}

export function updateRift(rift, dt) {
  rift.life -= dt;
  rift.spin += dt * 1.9;
  return rift.life > 0;
}

/** One segment of the ion wake a dash leaves behind: it burns what follows. */
export function createWake(x, y) {
  return {
    kind: 'wake',
    x,
    y,
    radius: 17,
    life: 1.15,
    maxLife: 1.15,
    hit: null,
  };
}

export function updateWake(wake, dt) {
  wake.life -= dt;
  return wake.life > 0;
}
