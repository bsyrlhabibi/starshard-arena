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
  burst,
  createEnemy,
  createOrb,
  createPlayer,
  createShard,
  overlaps,
  playerShots,
  tryDash,
  updateBullet,
  updateEnemy,
  updateOrb,
  updateParticle,
  updatePlayer,
  updateShard,
} from './entities.js';
import { createInput } from './input.js';
import { COLORS, drawBanner, drawHud, drawWorld, makeStarfield } from './render.js';
import { makeRng } from './rng.js';
import { drawGameOver, drawPause, drawTitle, drawUpgrade, pointInRect } from './screens.js';
import { stageShot } from './shots.js';
import { drawChoices } from './upgrades.js';
import { buildWave, spawnInterval, waveLabel } from './waves.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = ARENA.width;
canvas.height = ARENA.height;

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

function freshState(runSeed) {
  const rng = makeRng(runSeed);
  return {
    screen: 'title',
    rng,
    stars: makeStarfield(rng),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    orbs: [],
    shards: [],
    particles: [],
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

function startRun() {
  const best = state.best;
  state = freshState((Date.now() % 100000) + 17);
  state.best = best;
  state.screen = 'play';
  beginWave(1);
  audio.unlock();
  audio.waveStart();
}

function beginWave(wave) {
  state.wave = wave;
  state.spawnQueue = buildWave(wave, state.rng, ARENA.width, ARENA.height);
  state.spawnTimer = 0.4;
  if (state.player !== null) state.player.shield = Math.max(state.player.shield, state.taken.aegis ?? 0);
  const label = waveLabel(wave);
  setBanner(`WAVE ${wave}`, label ?? '', 1.7);
}

function endRun() {
  state.screen = 'over';
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
  audio.gameOver();
}

function killEnemy(enemy) {
  const at = state.enemies.indexOf(enemy);
  if (at >= 0) state.enemies.splice(at, 1);
  state.combo += 1;
  state.comboTimer = 2.2;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const multiplier = Math.min(8, Math.max(1, state.combo));
  state.score += enemy.score * multiplier;
  const big = enemy.kind === 'splitter' || enemy.kind === 'boss';
  burst(state.particles, enemy.x, enemy.y, state.rng, COLORS[enemy.kind], enemy.kind === 'boss' ? 46 : big ? 22 : 13, enemy.kind === 'boss' ? 380 : 260);
  audio.explosion(big);
  if (enemy.kind === 'boss') {
    state.shake = Math.max(state.shake, 12);
    setBanner('DREADNOUGHT DOWN', `+${(enemy.score * multiplier).toLocaleString('en-US')} · the dark gets quieter`, 2.2);
  }
  if (enemy.kind === 'splitter') {
    // A splitter dies as two minis, already angry and already moving.
    for (let i = 0; i < 2; i += 1) {
      const child = createEnemy('mini', enemy.x + (i === 0 ? -16 : 16), enemy.y + (i === 0 ? -12 : 12), state.rng, 1);
      child.angle = enemy.angle + (i === 0 ? -0.7 : 0.7);
      state.enemies.push(child);
    }
  }
  for (let i = 0; i < enemy.shards; i += 1) {
    state.shards.push(createShard(enemy.x, enemy.y, state.rng));
  }
  if (enemy.kind === 'splitter') state.shake = Math.max(state.shake, 5);
}

/** The Hollow that fight back: Wraiths spit orbs, the Dreadnought sheds Mites and spits wider. */
function enemyOffense(enemy, player, dt) {
  if (enemy.kind === 'weaver' || enemy.kind === 'boss') {
    enemy.shootTime -= dt;
    if (enemy.shootTime <= 0) {
      enemy.shootTime = enemy.kind === 'boss' ? 1.5 : 2.3;
      const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      state.orbs.push(createOrb(enemy.x, enemy.y, aim, enemy.kind));
      if (enemy.kind === 'boss') {
        state.orbs.push(createOrb(enemy.x, enemy.y, aim - 0.3, enemy.kind));
        state.orbs.push(createOrb(enemy.x, enemy.y, aim + 0.3, enemy.kind));
      }
      audio.enemyHit();
    }
  }
  if (enemy.kind === 'boss') {
    enemy.broodTime -= dt;
    const mites = state.enemies.filter((e) => e.kind === 'mini').length;
    if (enemy.broodTime <= 0 && mites < 6) {
      enemy.broodTime = 3.4;
      for (let i = 0; i < 2; i += 1) {
        const child = createEnemy('mini', enemy.x + (i === 0 ? -40 : 40), enemy.y + (i === 0 ? -24 : 24), state.rng, 1);
        state.enemies.push(child);
      }
    }
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
  state.bullets.push(...playerShots(player, input, audio));

  // The director trickles the wave in.
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.enemies.push(state.spawnQueue.shift());
      state.spawnTimer = spawnInterval(state.wave);
    }
  }

  for (const enemy of [...state.enemies]) {
    updateEnemy(enemy, player, dt, state.elapsed);
    enemyOffense(enemy, player, dt);
  }
  state.bullets = state.bullets.filter((b) => updateBullet(b, dt));
  state.orbs = state.orbs.filter((o) => updateOrb(o, dt));
  state.shards = state.shards.filter((s) => updateShard(s, player, dt));
  state.particles = state.particles.filter((p) => updateParticle(p, dt));

  // Bullets against Hollow.
  for (const bullet of [...state.bullets]) {
    for (const enemy of [...state.enemies]) {
      if (overlaps(bullet, enemy)) {
        state.bullets.splice(state.bullets.indexOf(bullet), 1);
        enemy.hp -= bullet.damage;
        enemy.flashTime = 0.08;
        audio.enemyHit();
        if (enemy.hp <= 0) killEnemy(enemy);
        break;
      }
    }
  }

  // Hollow against the ship — bodies and plasma alike.
  if (state.screen === 'play') {
    for (const enemy of [...state.enemies]) {
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

  // The combo clock.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // Wave cleared: the Forge opens.
  if (state.screen === 'play' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.choices = drawChoices(player, state.rng, state.taken);
    state.screen = 'upgrade';
    audio.upgrade();
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
    drawHud(ctx, {
      player: state.player,
      score: state.score,
      wave: state.wave,
      combo: state.combo,
      comboTime: state.comboTimer / 2.2,
      shards: state.shardBank,
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
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  state.elapsed += dt;

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
