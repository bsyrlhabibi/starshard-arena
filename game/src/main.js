// main.js — boots Starshard Arena and runs its state machine.
//
// Screens: title -> play -> (wave cleared) -> upgrade -> play -> ...
// -> over -> title. This file owns the run's state and the collisions;
// entities.js owns movement, waves.js the director, upgrades.js the
// Forge, render.js and screens.js the drawing, shots.js the staged
// screenshot scenes (?shot=...&seed=N).

import { createAudio } from './audio.js';
import {
  ARENA,
  ENEMY_KINDS,
  PICKUP_KINDS,
  burst,
  createEnemy,
  createMissile,
  createOrb,
  createPickup,
  createPlayer,
  createRift,
  createShard,
  createWake,
  overlaps,
  playerShots,
  tryDash,
  updateBullet,
  updateEnemy,
  updateMissile,
  updateOrb,
  updateParticle,
  updatePickup,
  updatePlayer,
  updateRift,
  updateShard,
  updateWake,
} from './entities.js';
import { createInput } from './input.js';
import { makeNebula, makeStarfield } from './backdrop.js';
import { drawBanner, drawHud } from './hud.js';
import { COLORS, sectorForWave } from './palette.js';
import { drawWorld } from './render.js';
import { makeRng } from './rng.js';
import { drawGameOver, drawPause, drawTitle, drawUpgrade, pointInRect } from './screens.js';
import { stageShot } from './shots.js';
import { drawChoices } from './upgrades.js';
import { buildWave, rollModifier, spawnInterval, waveLabel } from './waves.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = ARENA.width;
canvas.height = ARENA.height;

// The three ways to meet the dark. Nightmare's swarm is faster and
// tougher, and every point it yields counts double — the Forge does
// not care how you earned the shards.
const DIFFICULTIES = {
  cadet: { id: 'cadet', hpMul: 0.8, speedMul: 0.9, scoreMul: 1 },
  standard: { id: 'standard', hpMul: 1, speedMul: 1, scoreMul: 1 },
  nightmare: { id: 'nightmare', hpMul: 1.35, speedMul: 1.15, scoreMul: 2 },
};

const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

function loadBest() {
  try {
    return Number(window.localStorage.getItem('starshard-best') ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('starshard-best', String(value));
  } catch {
    // Private modes refuse storage; the best score just lasts the visit.
  }
}

// The pilot record: the meta-progression that outlives any one run —
// sorties flown, Hollow felled, named elites brought down, Cores
// stolen, and the deepest wave ever reached. It is the game's memory
// of its pilot, shown on the title and the results screen.
function loadRecord() {
  try {
    const raw = JSON.parse(window.localStorage.getItem('starshard-record') ?? 'null');
    if (raw && typeof raw === 'object') return { runs: 0, kills: 0, elites: 0, cores: 0, bestWave: 0, bestScore: 0, ...raw };
  } catch {
    // Corrupt or refused storage just means a fresh record.
  }
  return { runs: 0, kills: 0, elites: 0, cores: 0, bestWave: 0, bestScore: 0 };
}

function saveRecord(record) {
  try {
    window.localStorage.setItem('starshard-record', JSON.stringify(record));
  } catch {
    // Private modes refuse storage; the record just lasts the visit.
  }
}

function freshState(runSeed) {
  const rng = makeRng(runSeed);
  return {
    screen: 'title',
    rng,
    stars: makeStarfield(rng),
    nebula: makeNebula(rng),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    orbs: [],
    shards: [],
    particles: [],
    // The round-two arsenal: dropped skill Cores waiting to be stolen,
    // homing missiles in flight, the burning segments of the dash's
    // ion wake, gravity rifts, and the floating words that narrate it.
    pickups: [],
    missiles: [],
    wakes: [],
    rifts: [],
    floaters: [],
    // Timed stolen skills, in seconds left. The Forge sells permanence;
    // Cores rent it, mid-fight, for free — that tension is the game.
    effects: { overdrive: 0, seekers: 0, piercing: 0, lance: 0 },
    starfallReady: false,
    coresCollected: 0,
    modifier: null,
    shardMul: 1,
    riftTimer: 0,
    flash: 0,
    slowmo: 0,
    // The spectacle layer: expanding shockwave rings, dash ghosts, the
    // ship's trail ribbon, freeze-frame hit-stop and the cinematic
    // letterbox that rolls in when a Dreadnought announces itself.
    shockwaves: [],
    ghosts: [],
    trail: [],
    hitstop: 0,
    letterbox: 0,
    ghostTimer: 0,
    difficulty: DIFFICULTIES.standard,
    beam: null,
    sectorIndex: 0,
    waveTotal: 0,
    kills: 0,
    elitesDown: 0,
    record: loadRecord(),
    spawnQueue: [],
    spawnTimer: 0,
    wave: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    // The shard bank is the Forge's currency; shardsCollected is the
    // lifetime total the results screen brags about. They diverge the
    // moment the player buys anything. (The entity list above is also
    // called shards — that is the drops lying in the arena.)
    shardBank: 0,
    shardsCollected: 0,
    taken: {},
    choices: [],
    banner: null,
    shake: 0,
    elapsed: 0,
    best: loadBest(),
    buttons: [],
    mouse: input.mouse,
  };
}

let state = freshState(seed * 7919 + 13);
if (shotName !== null) stageShot(state, shotName);

function setBanner(title, subtitle, duration) {
  state.banner = { title, subtitle, time: 0, duration };
}

/** A floating word over the arena: a score, a stolen skill, a warning. */
function addFloater(x, y, text, color, size = 14, life = 1.1) {
  state.floaters.push({ x, y, text, color, size, life, maxLife: life });
}

function startRun() {
  const best = state.best;
  const difficulty = state.difficulty;
  const record = state.record;
  state = freshState((Date.now() % 100000) + 17);
  state.best = best;
  state.difficulty = difficulty;
  state.record = record;
  state.screen = 'play';
  beginWave(1);
  audio.unlock();
  audio.waveStart();
}

function beginWave(wave) {
  state.wave = wave;
  const sector = sectorForWave(wave);
  const crossedSector = sector.index !== state.sectorIndex;
  state.sectorIndex = sector.index;
  state.spawnQueue = buildWave(wave, state.rng, ARENA.width, ARENA.height, state.difficulty);
  state.modifier = rollModifier(wave, state.rng);
  state.shardMul = state.modifier?.id === 'rush' ? 2 : 1;
  state.riftTimer = state.modifier?.id === 'rift' ? 2.5 : 0;
  if (state.modifier?.id === 'surge') {
    // A second, cheaper wave rides on the first one's tail.
    const extra = buildWave(Math.max(1, wave - 1), state.rng, ARENA.width, ARENA.height, state.difficulty)
      .filter((e) => e.kind === 'chaser' || e.kind === 'dart' || e.kind === 'mini');
    state.spawnQueue.push(...extra);
  }
  state.waveTotal = state.spawnQueue.length;
  state.spawnTimer = 0.4;
  if (state.player !== null) state.player.shield = Math.max(state.player.shield, state.taken.aegis ?? 0);
  if (wave % 5 === 0) {
    // A boss wave is an event, not a wave: the bars roll in, the
    // warning sounds, and the banner carries its name like a headline.
    state.letterbox = 1.8;
    setBanner('⚠ THE DREADNOUGHT ⚠', 'it has come to eat the light', 2.3);
    audio.explosion(true);
    return;
  }
  const label = waveLabel(wave);
  if (crossedSector && wave > 1) {
    // Crossing into a new sector is the run's geography changing:
    // the banner names the place before it names the wave.
    setBanner(`◈ ${sector.name} ◈`, `WAVE ${wave} · ${label}`, 2.0);
    return;
  }
  const subtitle = [label, state.modifier?.label, sector.name].filter(Boolean).join('  ·  ');
  setBanner(`WAVE ${wave}`, subtitle, 1.7);
}

function endRun() {
  state.screen = 'over';
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
  const record = state.record;
  record.runs += 1;
  record.kills += state.kills;
  record.elites += state.elitesDown;
  record.cores += state.coresCollected;
  record.bestWave = Math.max(record.bestWave, state.wave);
  record.bestScore = Math.max(record.bestScore, state.score);
  saveRecord(record);
  audio.gameOver();
}

/** Which Core a wreck leaves: weighted, and Repair only finds a hurt ship. */
function rollDropKind() {
  const table = [
    ['overdrive', 20],
    ['seekers', 18],
    ['piercing', 16],
    ['lance', 12],
    ['nova', 14],
    ['magnet', 12],
    ['aegis', 10],
    ['repair', state.player.hp < state.player.maxHp ? 10 : 2],
  ];
  let total = 0;
  for (const [, w] of table) total += w;
  let roll = state.rng.next() * total;
  for (const [kind, w] of table) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return 'overdrive';
}

function dropCore(x, y) {
  state.pickups.push(createPickup(rollDropKind(), x, y, state.rng));
}

function killEnemy(enemy) {
  const at = state.enemies.indexOf(enemy);
  if (at >= 0) state.enemies.splice(at, 1);
  state.kills += 1;
  state.combo += 1;
  state.comboTimer = 2.2;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const multiplier = Math.min(8, Math.max(1, state.combo));
  const gained = Math.round(enemy.score * multiplier * state.difficulty.scoreMul);
  state.score += gained;
  // A maxed combo charges the Starfall; the HUD starts shouting about it.
  if (state.combo >= 8 && !state.starfallReady) {
    state.starfallReady = true;
    addFloater(state.player.x, state.player.y - 34, 'STARFALL CHARGED', COLORS.shard, 17, 1.4);
  }
  if (gained >= 300 || enemy.elite) {
    addFloater(enemy.x, enemy.y - 10, `+${gained.toLocaleString('en-US')}`, enemy.elite ? COLORS.elite : COLORS.text, enemy.elite ? 17 : 13);
  }
  const big = enemy.kind === 'splitter' || enemy.kind === 'boss' || enemy.kind === 'bulwark';
  burst(state.particles, enemy.x, enemy.y, state.rng, COLORS[enemy.kind], enemy.kind === 'boss' ? 46 : big ? 22 : 13, enemy.kind === 'boss' ? 380 : 260);
  audio.explosion(big);
  // Big deaths ring the arena and stop the world for a frame or two;
  // the pause is the punctuation that makes a kill feel heavy.
  if (enemy.kind === 'boss' || enemy.elite) {
    state.shockwaves.push({ x: enemy.x, y: enemy.y, r: 8, maxR: enemy.kind === 'boss' ? 240 : 120, color: COLORS[enemy.kind] });
    state.hitstop = Math.max(state.hitstop, enemy.kind === 'boss' ? 0.09 : 0.05);
  } else if (big) {
    state.shockwaves.push({ x: enemy.x, y: enemy.y, r: 6, maxR: 80, color: COLORS[enemy.kind] });
  }
  if (enemy.kind === 'boss') {
    state.shake = Math.max(state.shake, 12);
    setBanner('DREADNOUGHT DOWN', `+${gained.toLocaleString('en-US')} · the dark gets quieter`, 2.2);
  }
  if (enemy.elite) {
    // A named terror falls: the banner carries its name like an
    // obituary headline, the way rival banners carry a racer's.
    state.elitesDown += 1;
    if (enemy.eliteName) {
      setBanner(`☠ ${enemy.eliteName} IS DOWN`, `elite ${ENEMY_KINDS[enemy.kind].name} destroyed · +${gained.toLocaleString('en-US')}`, 1.9);
    }
  }
  if (enemy.kind === 'splitter') {
    // A splitter dies as two minis, already angry and already moving.
    for (let i = 0; i < 2; i += 1) {
      const child = createEnemy('mini', enemy.x + (i === 0 ? -16 : 16), enemy.y + (i === 0 ? -12 : 12), state.rng, 1);
      child.angle = enemy.angle + (i === 0 ? -0.7 : 0.7);
      state.enemies.push(child);
    }
  }
  for (let i = 0; i < enemy.shards * state.shardMul; i += 1) {
    state.shards.push(createShard(enemy.x, enemy.y, state.rng));
  }
  // The drop roll: elites always leave a Core, the Dreadnought leaves
  // two, and anything else leaves one just often enough that a player
  // detours for wrecks. Mites leave nothing — they are the crumbs.
  if (enemy.kind === 'boss') {
    dropCore(enemy.x - 26, enemy.y);
    dropCore(enemy.x + 26, enemy.y);
  } else if (enemy.elite) {
    dropCore(enemy.x, enemy.y);
  } else if (enemy.kind !== 'mini' && state.rng.next() < 0.06) {
    dropCore(enemy.x, enemy.y);
  }
  if (enemy.kind === 'splitter') state.shake = Math.max(state.shake, 5);
}

/** The Hollow that fight back: Wraiths and Stingers spit orbs, the Dreadnought sheds Mites, spits wider, and enrages past half hull. */
function enemyOffense(enemy, player, dt) {
  if (enemy.kind === 'boss' && !enemy.enraged && enemy.hp <= enemy.maxHp / 2) {
    enemy.enraged = true;
    addFloater(enemy.x, enemy.y - 60, 'THE DREADNOUGHT ENRAGES', COLORS.boss, 19, 1.6);
    burst(state.particles, enemy.x, enemy.y, state.rng, COLORS.boss, 30, 340);
    state.shake = Math.max(state.shake, 8);
    audio.explosion(true);
  }
  if (enemy.kind === 'weaver' || enemy.kind === 'stinger' || enemy.kind === 'boss') {
    enemy.shootTime -= dt;
    if (enemy.shootTime <= 0) {
      const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      if (enemy.kind === 'boss' && enemy.enraged) {
        // The enrage pattern: a five-armed spiral that rotates as it
        // fires, so standing anywhere still is standing somewhere wrong.
        enemy.shootTime = 0.85;
        const base = state.elapsed * 1.7;
        for (let i = 0; i < 5; i += 1) {
          state.orbs.push(createOrb(enemy.x, enemy.y, base + (i / 5) * Math.PI * 2, enemy.kind));
        }
      } else {
        enemy.shootTime = enemy.kind === 'boss' ? 1.5 : enemy.kind === 'stinger' ? 2.6 : 2.3;
        state.orbs.push(createOrb(enemy.x, enemy.y, aim, enemy.kind));
        if (enemy.kind === 'boss') {
          state.orbs.push(createOrb(enemy.x, enemy.y, aim - 0.3, enemy.kind));
          state.orbs.push(createOrb(enemy.x, enemy.y, aim + 0.3, enemy.kind));
        }
      }
      audio.enemyHit();
    }
  }
  if (enemy.kind === 'boss') {
    enemy.broodTime -= dt;
    const mites = state.enemies.filter((e) => e.kind === 'mini').length;
    if (enemy.broodTime <= 0 && mites < 6) {
      enemy.broodTime = enemy.enraged ? 2.4 : 3.4;
      for (let i = 0; i < 2; i += 1) {
        const child = createEnemy('mini', enemy.x + (i === 0 ? -40 : 40), enemy.y + (i === 0 ? -24 : 24), state.rng, 1);
        state.enemies.push(child);
      }
    }
  }
}

/** Steal a dropped Core: the effect lands the moment the ship touches it. */
function applyPickup(pickup) {
  const player = state.player;
  const kind = pickup.pickupKind;
  const def = PICKUP_KINDS[kind];
  state.coresCollected += 1;
  addFloater(player.x, player.y - 26, def.name, def.color, 16, 1.2);
  audio.corePickup();
  if (kind === 'overdrive') state.effects.overdrive = def.seconds;
  else if (kind === 'seekers') state.effects.seekers = def.seconds;
  else if (kind === 'piercing') state.effects.piercing = def.seconds;
  else if (kind === 'lance') state.effects.lance = def.seconds;
  else if (kind === 'aegis') player.shield = Math.min(2, player.shield + 1);
  else if (kind === 'repair') player.hp = Math.min(player.maxHp, player.hp + 1);
  else if (kind === 'magnet') {
    // The vacuum: every shard in the arena remembers the ship at once.
    for (const shard of state.shards) shard.homing = true;
  } else if (kind === 'nova') {
    // The burst: everything on screen takes a heavy hit, right now.
    state.flash = Math.max(state.flash, 0.4);
    state.shake = Math.max(state.shake, 10);
    burst(state.particles, player.x, player.y, state.rng, def.color, 34, 420);
    audio.nova();
    for (const enemy of [...state.enemies]) {
      enemy.hp -= 3;
      enemy.flashTime = 0.12;
      if (enemy.hp <= 0) killEnemy(enemy);
    }
  }
}

/** Starfall: the combo's reward — the sky answers, once, everywhere. */
function unleashStarfall() {
  const player = state.player;
  state.starfallReady = false;
  state.combo = 0;
  state.comboTimer = 0;
  state.flash = 0.55;
  state.slowmo = 0.4;
  state.shake = Math.max(state.shake, 14);
  state.orbs = [];
  burst(state.particles, player.x, player.y, state.rng, COLORS.shard, 60, 520);
  addFloater(player.x, player.y - 40, 'STARFALL', COLORS.shard, 26, 1.5);
  audio.starfall();
  for (const enemy of [...state.enemies]) {
    enemy.hp -= 6;
    enemy.flashTime = 0.15;
    if (enemy.hp <= 0) killEnemy(enemy);
  }
}

function hurtPlayer() {
  const player = state.player;
  if (player.invulnerableTime > 0) return;
  if (player.shield > 0) {
    player.shield -= 1;
    player.invulnerableTime = 1.1;
    burst(state.particles, player.x, player.y, state.rng, COLORS.shield, 14, 220);
    audio.playerHurt();
    return;
  }
  player.hp -= 1;
  player.invulnerableTime = 1.4;
  state.shake = Math.max(state.shake, 9);
  state.combo = 0;
  state.comboTimer = 0;
  burst(state.particles, player.x, player.y, state.rng, COLORS.heart, 20, 300);
  audio.playerHurt();
  if (player.hp <= 0) endRun();
}

function updatePlay(dt) {
  const player = state.player;
  tryDash(player, input, audio);
  updatePlayer(player, input, dt);

  // Stolen skills burn down; the Starfall waits for its key.
  state.effects.overdrive = Math.max(0, state.effects.overdrive - dt);
  state.effects.seekers = Math.max(0, state.effects.seekers - dt);
  state.effects.piercing = Math.max(0, state.effects.piercing - dt);
  state.effects.lance = Math.max(0, state.effects.lance - dt);
  if (state.starfallReady && input.wasPressed('KeyE')) unleashStarfall();
  if (state.screen !== 'play') return;

  // Fire. While a stolen Lance Core burns, the blaster pours one
  // continuous beam instead of bolts: everything standing in the
  // light takes damage every frame, and the beam is drawn from the
  // state it leaves behind. Otherwise, bolts — Overdrive squeezes
  // the cycle; a Piercing Core lends each one an extra hull.
  state.beam = null;
  if (state.effects.lance > 0 && input.firing()) {
    player.fireCooldown = 0.05;
    const angle = player.angle;
    const range = 780;
    let farthest = 0;
    for (const enemy of [...state.enemies]) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const along = dx * Math.cos(angle) + dy * Math.sin(angle);
      if (along < -10 || along > range + enemy.radius) continue;
      const perp = Math.abs(dy * Math.cos(angle) - dx * Math.sin(angle));
      if (perp > 30 + enemy.radius * 0.55) continue;
      enemy.hp -= 10 * dt;
      enemy.flashTime = 0.06;
      if (along > farthest) farthest = along;
      if (state.rng.next() < 0.35) {
        burst(state.particles, enemy.x + state.rng.range(-9, 9), enemy.y + state.rng.range(-9, 9), state.rng, '#ffe066', 1, 130);
      }
      if (enemy.hp <= 0) killEnemy(enemy);
    }
    state.beam = {
      x: player.x + Math.cos(angle) * 26,
      y: player.y - 26 + Math.sin(angle) * 8,
      angle,
      length: farthest > 0 ? Math.min(range, farthest + 26) : range,
    };
  } else {
    const fresh = playerShots(player, input, audio);
    if (state.effects.overdrive > 0 && fresh.length > 0) player.fireCooldown *= 0.55;
    if (state.effects.piercing > 0) for (const b of fresh) b.pierce += 1;
    state.bullets.push(...fresh);
  }

  // The dash leaves an ion wake: a burning ribbon that punishes
  // anything that follows the ship through its own escape line.
  if (player.dashTime > 0) {
    const last = state.wakes[state.wakes.length - 1];
    if (last === undefined || Math.hypot(last.x - player.x, last.y - player.y) > 12) {
      state.wakes.push(createWake(player.x, player.y));
    }
  }

  // Seekers: the Forge rack and a stolen Core stack. One volley a
  // second, aimed at nothing — they find their own way home.
  const launchers = player.stats.missileCount + (state.effects.seekers > 0 ? 1 : 0);
  player.missileTimer -= dt;
  if (launchers > 0 && player.missileTimer <= 0 && state.enemies.length > 0) {
    player.missileTimer = 1.0;
    for (let i = 0; i < launchers; i += 1) {
      const back = player.angle + Math.PI + (i - (launchers - 1) / 2) * 0.5;
      state.missiles.push(createMissile(player.x, player.y, back));
    }
    audio.dash();
  }

  // The director trickles the wave in — through a warp ring, so an
  // arrival is a small event and never a pop.
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const next = state.spawnQueue.shift();
      next.spawnIn = 0.35;
      state.enemies.push(next);
      state.spawnTimer = spawnInterval(state.wave);
    }
  }

  // Rifted space: wells open on their own clock and drag the fight in.
  if (state.modifier?.id === 'rift') {
    state.riftTimer -= dt;
    if (state.riftTimer <= 0 && state.rifts.length === 0) {
      state.riftTimer = 9;
      let rx = 0;
      let ry = 0;
      do {
        rx = state.rng.range(140, ARENA.width - 140);
        ry = state.rng.range(120, ARENA.height - 120);
      } while (Math.hypot(rx - player.x, ry - player.y) < 190);
      state.rifts.push(createRift(rx, ry));
      addFloater(rx, ry - 70, 'A RIFT OPENS', COLORS.rift, 15, 1.3);
    }
  }
  for (const rift of state.rifts) {
    const pull = (obj, strength) => {
      const dx = rift.x - obj.x;
      const dy = rift.y - obj.y;
      const dist = Math.hypot(dx, dy);
      if (dist < rift.radius && dist > 1) {
        obj.x += (dx / dist) * strength * dt;
        obj.y += (dy / dist) * strength * dt;
      }
      return dist;
    };
    for (const enemy of [...state.enemies]) {
      // The well grinds what it catches: hulls that linger at its
      // heart come apart, Dreadnought last and slowest.
      if (pull(enemy, 120) < 30) {
        enemy.hp -= (enemy.kind === 'boss' ? 0.8 : 2.2) * dt;
        enemy.flashTime = Math.max(enemy.flashTime, 0.03);
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
    for (const shard of state.shards) pull(shard, 170);
    for (const orb of [...state.orbs]) {
      if (pull(orb, 110) < 13) state.orbs.splice(state.orbs.indexOf(orb), 1);
    }
    pull(player, 26);
  }

  for (const enemy of [...state.enemies]) {
    if ((enemy.spawnIn ?? 0) > 0) {
      enemy.spawnIn -= dt;
      continue;
    }
    updateEnemy(enemy, player, dt, state.elapsed);
    enemyOffense(enemy, player, dt);
  }

  // Spectacle bookkeeping: rings expand, ghosts fade, the trail follows.
  for (const wave of state.shockwaves) wave.r += 300 * dt;
  state.shockwaves = state.shockwaves.filter((w) => w.r < w.maxR);
  state.ghostTimer -= dt;
  if (player.dashTime > 0 && state.ghostTimer <= 0) {
    state.ghostTimer = 0.03;
    state.ghosts.push({ x: player.x, y: player.y, angle: player.angle, life: 0.3, maxLife: 0.3 });
  }
  for (const ghost of state.ghosts) ghost.life -= dt;
  state.ghosts = state.ghosts.filter((g) => g.life > 0);
  state.trail.push({ x: player.x, y: player.y });
  if (state.trail.length > 16) state.trail.shift();
  state.bullets = state.bullets.filter((b) => updateBullet(b, dt));
  state.orbs = state.orbs.filter((o) => updateOrb(o, dt));
  state.shards = state.shards.filter((s) => updateShard(s, player, dt));
  state.particles = state.particles.filter((p) => updateParticle(p, dt));
  state.pickups = state.pickups.filter((p) => updatePickup(p, player, dt));
  state.rifts = state.rifts.filter((r) => updateRift(r, dt));
  state.wakes = state.wakes.filter((w) => updateWake(w, dt));
  for (const floater of state.floaters) floater.life -= dt;
  state.floaters = state.floaters.filter((f) => f.life > 0);

  // Missiles hunt the nearest hull, one target each.
  for (const missile of [...state.missiles]) {
    let target = null;
    let best = Infinity;
    for (const enemy of state.enemies) {
      const d = Math.hypot(enemy.x - missile.x, enemy.y - missile.y);
      if (d < best) {
        best = d;
        target = enemy;
      }
    }
    if (!updateMissile(missile, target, dt)) {
      state.missiles.splice(state.missiles.indexOf(missile), 1);
      continue;
    }
    if (target !== null && overlaps(missile, target)) {
      state.missiles.splice(state.missiles.indexOf(missile), 1);
      target.hp -= missile.damage;
      target.flashTime = 0.08;
      burst(state.particles, missile.x, missile.y, state.rng, COLORS.missile, 7, 200);
      audio.enemyHit();
      if (target.hp <= 0) killEnemy(target);
    }
  }

  // The wake burns what flies through it — once per segment per hull.
  for (const wake of state.wakes) {
    if (wake.hit === null) wake.hit = new Set();
    for (const enemy of [...state.enemies]) {
      if (!wake.hit.has(enemy) && overlaps(wake, enemy)) {
        wake.hit.add(enemy);
        enemy.hp -= 2;
        enemy.flashTime = 0.08;
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
  }

  // Bullets against Hollow. A piercing bolt wounds and flies on.
  for (const bullet of [...state.bullets]) {
    for (const enemy of [...state.enemies]) {
      if (bullet.hit !== null && bullet.hit.has(enemy)) continue;
      if (overlaps(bullet, enemy)) {
        enemy.hp -= bullet.damage;
        enemy.flashTime = 0.08;
        burst(state.particles, bullet.x, bullet.y, state.rng, COLORS.bullet, 3, 170);
        audio.enemyHit();
        if (enemy.hp <= 0) killEnemy(enemy);
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
          if (bullet.hit === null) bullet.hit = new Set();
          bullet.hit.add(enemy);
        } else {
          state.bullets.splice(state.bullets.indexOf(bullet), 1);
        }
        break;
      }
    }
  }

  // Hollow against the ship — bodies and plasma alike. A Hollow still
  // warping in is not solid yet and cannot bite.
  if (state.screen === 'play') {
    for (const enemy of [...state.enemies]) {
      if ((enemy.spawnIn ?? 0) > 0.15) continue;
      if (overlaps(enemy, player)) {
        // Ramming a Dreadnought hurts the ship, not the moon.
        if (enemy.kind !== 'boss') killEnemy(enemy);
        hurtPlayer();
        if (state.screen !== 'play') return;
      }
    }
    for (const orb of [...state.orbs]) {
      if (overlaps(orb, player)) {
        state.orbs.splice(state.orbs.indexOf(orb), 1);
        hurtPlayer();
        if (state.screen !== 'play') return;
      }
    }
  }

  // The swarm eats too: a Hollow that touches a dropped shard swallows
  // it and grows — a little hull, a little size, a gold pip to show it.
  // Contest your winnings or fight what they become.
  for (const enemy of [...state.enemies]) {
    if (enemy.kind === 'boss') continue;
    for (const shard of [...state.shards]) {
      if (!shard.homing && overlaps(enemy, shard)) {
        state.shards.splice(state.shards.indexOf(shard), 1);
        enemy.growth += 1;
        enemy.maxHp += 1;
        enemy.hp += 1;
        if (enemy.growth <= 8) enemy.radius += 1.1;
        if (enemy.growth === 3) addFloater(enemy.x, enemy.y - 20, 'IT GROWS', COLORS.heart, 13, 1.1);
      }
    }
  }

  // Shards home to the ship: score now, Forge currency for later.
  for (const shard of [...state.shards]) {
    if (overlaps(shard, player)) {
      state.shards.splice(state.shards.indexOf(shard), 1);
      state.shardBank += 1;
      state.shardsCollected += 1;
      state.score += 25 * Math.min(8, Math.max(1, state.combo));
      audio.pickup(state.combo);
    }
  }

  // Cores, stolen on contact.
  for (const pickup of [...state.pickups]) {
    if (overlaps(pickup, player)) {
      state.pickups.splice(state.pickups.indexOf(pickup), 1);
      applyPickup(pickup);
      if (state.screen !== 'play') return;
    }
  }

  // The combo clock.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // Wave cleared: first the payout sweep — every shard still lying in
  // the arena homes to the ship — and only then does the Forge open,
  // so what a wave earned is never left lying out of reach.
  if (state.screen === 'play' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    if (state.shards.length > 0) {
      for (const shard of state.shards) shard.homing = true;
    } else {
      state.choices = drawChoices(player, state.rng, state.taken);
      state.screen = 'upgrade';
      audio.upgrade();
    }
  }
}

function chooseUpgrade(index) {
  const choice = state.choices[index];
  if (choice === undefined) return;
  if (state.shardBank < choice.cost) {
    // The Forge does not haggle: a dull buzz and the cards stay up.
    audio.playerHurt();
    return;
  }
  state.shardBank -= choice.cost;
  choice.apply(state.player);
  state.taken[choice.id] = (state.taken[choice.id] ?? 0) + 1;
  leaveForge();
}

function leaveForge() {
  state.screen = 'play';
  beginWave(state.wave + 1);
  audio.waveStart();
}

function handleClick() {
  if (!input.mouse.clicked) return;
  audio.unlock();
  for (const rect of state.buttons) {
    if (!pointInRect(input.mouse.x, input.mouse.y, rect)) continue;
    if (rect.id === 'start' || rect.id === 'restart') startRun();
    else if (rect.id === 'resume') state.screen = 'play';
    else if (rect.id.startsWith('diff-')) state.difficulty = DIFFICULTIES[rect.id.slice(5)] ?? DIFFICULTIES.standard;
    else if (rect.id === 'skip-forge') leaveForge();
    else if (rect.id.startsWith('upgrade-')) chooseUpgrade(Number(rect.id.split('-')[1]));
    return;
  }
  if (state.screen === 'title') startRun();
}

function handleKeys() {
  if (input.wasPressed('KeyM')) audio.toggleMute();
  if (state.screen === 'title' && (input.wasPressed('Enter') || input.wasPressed('Space'))) startRun();
  else if (state.screen === 'over' && input.wasPressed('KeyR')) startRun();
  else if (state.screen === 'upgrade') {
    if (input.wasPressed('Digit1')) chooseUpgrade(0);
    if (input.wasPressed('Digit2')) chooseUpgrade(1);
    if (input.wasPressed('Digit3')) chooseUpgrade(2);
    if (input.wasPressed('Enter') || input.wasPressed('KeyB')) leaveForge();
  } else if (state.screen === 'play' && (input.wasPressed('KeyP') || input.wasPressed('Escape'))) {
    state.screen = 'pause';
  } else if (state.screen === 'pause' && (input.wasPressed('KeyP') || input.wasPressed('Escape'))) {
    state.screen = 'play';
  }
}

function draw() {
  ctx.save();
  if (state.shake > 0.2) {
    ctx.translate(state.rng.range(-state.shake, state.shake), state.rng.range(-state.shake, state.shake));
  }
  drawWorld(ctx, state);
  ctx.restore();

  if (state.screen === 'play' || state.screen === 'pause') {
    const boss = state.enemies.find((e) => e.kind === 'boss');
    drawHud(ctx, {
      player: state.player,
      score: state.score,
      wave: state.wave,
      combo: state.combo,
      comboTime: state.comboTimer / 2.2,
      shards: state.shardBank,
      boss: boss ? { hp: boss.hp, maxHp: boss.maxHp, enraged: boss.enraged } : null,
      effects: [
        { label: 'OVERDRIVE', seconds: state.effects.overdrive, color: PICKUP_KINDS.overdrive.color },
        { label: 'SEEKERS', seconds: state.effects.seekers, color: PICKUP_KINDS.seekers.color },
        { label: 'PIERCING', seconds: state.effects.piercing, color: PICKUP_KINDS.piercing.color },
        { label: 'LANCE BEAM', seconds: state.effects.lance, color: PICKUP_KINDS.lance.color },
      ].filter((e) => e.seconds > 0),
      starfallReady: state.starfallReady,
      sector: sectorForWave(state.wave),
      hostiles: state.enemies.length + state.spawnQueue.length,
      waveTotal: state.waveTotal,
      elapsed: state.elapsed,
      enemies: state.enemies,
      pickups: state.pickups,
    });
    drawBanner(ctx, state.banner, state.elapsed);
  }

  state.buttons = [];
  if (state.screen === 'title') state.buttons = drawTitle(ctx, state);
  else if (state.screen === 'upgrade') state.buttons = drawUpgrade(ctx, state);
  else if (state.screen === 'over') state.buttons = drawGameOver(ctx, state);
  else if (state.screen === 'pause') state.buttons = drawPause(ctx, state);
}

let lastTime = performance.now();
function frame(now) {
  const rawDt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  // Starfall buys a breath of slow time; a heavy kill buys a freeze.
  state.slowmo = Math.max(0, state.slowmo - rawDt);
  state.hitstop = Math.max(0, state.hitstop - rawDt);
  state.letterbox = Math.max(0, state.letterbox - rawDt);
  let dt = state.slowmo > 0 ? rawDt * 0.35 : rawDt;
  if (state.hitstop > 0) dt *= 0.07;
  state.elapsed += dt;
  state.flash = Math.max(0, state.flash - rawDt * 1.6);

  // The title screen is alive: Hollow drift across the dark behind the
  // veil, going nowhere, hunting no one — yet.
  if (state.screen === 'title' && shotName === null) {
    if (state.enemies.length < 6 && state.rng.next() < 0.012) {
      const at = state.rng.edgePoint(ARENA.width, ARENA.height, 20);
      const drifter = createEnemy(state.rng.pick(['chaser', 'dart', 'weaver', 'splitter', 'bulwark', 'stinger']), at.x, at.y, state.rng, 1);
      drifter.angle = Math.atan2(ARENA.height / 2 - at.y, ARENA.width / 2 - at.x) + state.rng.range(-0.7, 0.7);
      state.enemies.push(drifter);
    }
    for (const enemy of [...state.enemies]) {
      enemy.x += Math.cos(enemy.angle) * 34 * rawDt;
      enemy.y += Math.sin(enemy.angle) * 34 * rawDt;
      if (enemy.x < -70 || enemy.x > ARENA.width + 70 || enemy.y < -70 || enemy.y > ARENA.height + 70) {
        state.enemies.splice(state.enemies.indexOf(enemy), 1);
      }
    }
  }

  // The music follows the fight: quiet at the menus, climbing with the
  // wave and the crowd, hottest when the combo is alive.
  audio.setIntensity(
    state.screen === 'play'
      ? Math.min(1, 0.3 + state.wave * 0.05 + (state.enemies.length > 6 ? 0.15 : 0) + (state.combo >= 4 ? 0.15 : 0))
      : 0.15,
  );

  if (state.banner !== null) {
    state.banner.time += dt;
    if (state.banner.time >= state.banner.duration) state.banner = null;
  }
  state.shake = Math.max(0, state.shake - dt * 26);

  handleKeys();
  // A staged screenshot scene (?shot=...) is a frozen frame: the world
  // is posed by shots.js and must not simulate away before the camera.
  if (state.screen === 'play' && shotName === null) updatePlay(dt);
  handleClick();
  draw();
  input.clearFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
