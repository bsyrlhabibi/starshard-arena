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
    radius: 13,
    angle: -Math.PI / 2,
    hp: 3,
    maxHp: 3,
    shield: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    dashTime: 0,
    invulnerableTime: 0,
    // Upgradeable stats; upgrades.js mutates these between waves.
    stats: {
      speed: 265,
      fireInterval: 0.16,
      bulletDamage: 1,
      cannons: 1,
      magnetRadius: 74,
      dashRecharge: 1.6,
    },
  };
}

export function createBullet(x, y, angle, damage) {
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
    life: 0.9,
  };
}

// The Hollow kinds. Each entry is the whole personality of a kind: its
// name (the title screen introduces the cast by name), how tough, how
// quick, how it steers, what it is worth and what it drops. waves.js
// decides how many of each a wave sends; the Dreadnought is a boss that
// arrives alone every fifth wave.
export const ENEMY_KINDS = {
  chaser: { name: 'Stalker', hp: 3, speed: 108, radius: 15, score: 100, shards: 1, turn: 3.4 },
  dart: { name: 'Lance', hp: 2, speed: 168, radius: 11, score: 150, shards: 1, turn: 2.2 },
  splitter: { name: 'Brood', hp: 6, speed: 74, radius: 21, score: 200, shards: 2, turn: 2.6 },
  mini: { name: 'Mite', hp: 1, speed: 196, radius: 8, score: 50, shards: 0, turn: 4.6 },
  weaver: { name: 'Wraith', hp: 4, speed: 96, radius: 14, score: 250, shards: 2, turn: 3.0 },
  boss: { name: 'Dreadnought', hp: 70, speed: 44, radius: 46, score: 2500, shards: 14, turn: 1.1 },
};

export function createEnemy(kind, x, y, rng, hpScale) {
  const base = ENEMY_KINDS[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: base.radius,
    hp: Math.max(1, Math.round(base.hp * hpScale)),
    maxHp: Math.max(1, Math.round(base.hp * hpScale)),
    angle: rng.range(0, TAU),
    wobblePhase: rng.range(0, TAU),
    lungeTime: rng.range(0.4, 1.4),
    // Wraiths and the Dreadnought shoot plasma orbs on this clock; the
    // Dreadnought also sheds Mites on broodTime and charges on chargeTime.
    shootTime: rng.range(1.2, 2.4),
    broodTime: 3.2,
    chargeTime: rng.range(3.5, 5),
    flashTime: 0,
    score: base.score,
    shards: base.shards,
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
    life: 11,
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
    shots.push(createBullet(noseX, noseY, player.angle + spread, player.stats.bulletDamage));
  }
  return shots;
}

export function updateEnemy(enemy, player, dt, elapsed) {
  const base = ENEMY_KINDS[enemy.kind];
  const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);

  if (enemy.kind === 'dart') {
    // Darts circle-strafe until their lunge timer fires, then dive.
    enemy.lungeTime -= dt;
    if (enemy.lungeTime <= 0) {
      enemy.lungeTime = 1.5;
      enemy.vx = Math.cos(toPlayer) * base.speed * 2.5;
      enemy.vy = Math.sin(toPlayer) * base.speed * 2.5;
    }
    steer(enemy, toPlayer, dt);
    enemy.vx *= Math.max(0, 1 - dt * 1.6);
    enemy.vy *= Math.max(0, 1 - dt * 1.6);
    enemy.x += (Math.cos(enemy.angle) * base.speed * 0.55 + enemy.vx) * dt;
    enemy.y += (Math.sin(enemy.angle) * base.speed * 0.55 + enemy.vy) * dt;
  } else if (enemy.kind === 'weaver') {
    // Weavers approach on a sine path, which makes their line wobble.
    steer(enemy, toPlayer, dt);
    const sway = Math.sin(elapsed * 3.1 + enemy.wobblePhase) * 0.9;
    const dir = enemy.angle + sway * 0.6;
    enemy.x += Math.cos(dir) * base.speed * dt;
    enemy.y += Math.sin(dir) * base.speed * dt;
  } else if (enemy.kind === 'boss') {
    // The Dreadnought mostly drifts at the ship like a moon falling —
    // until its charge clock fires and it lunges, twice as fast as a
    // Lance, with a hull that does not notice the impact.
    enemy.chargeTime -= dt;
    if (enemy.chargeTime <= 0) {
      enemy.chargeTime = rngFreeCharge();
      enemy.vx = Math.cos(toPlayer) * base.speed * 6.4;
      enemy.vy = Math.sin(toPlayer) * base.speed * 6.4;
    }
    steer(enemy, toPlayer, dt);
    enemy.vx *= Math.max(0, 1 - dt * 1.1);
    enemy.vy *= Math.max(0, 1 - dt * 1.1);
    enemy.x += (Math.cos(enemy.angle) * base.speed + enemy.vx) * dt;
    enemy.y += (Math.sin(enemy.angle) * base.speed + enemy.vy) * dt;
  } else {
    steer(enemy, toPlayer, dt);
    enemy.x += Math.cos(enemy.angle) * base.speed * dt;
    enemy.y += Math.sin(enemy.angle) * base.speed * dt;
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
  if (dist < player.stats.magnetRadius && dist > 1) {
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
