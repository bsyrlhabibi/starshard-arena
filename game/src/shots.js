// shots.js — deterministic scenes for the screenshots in shots.json.
//
// Opening the game with ?shot=start|play|upgrade|end&seed=N stages one
// frozen moment of the game — the title, a mid-wave fight, the Forge's
// choice, a final score — built from the seed alone, so the maker's
// screenshots and any later review see exactly the same frame. It is
// also how a person can peek at every screen without playing to it.

import { burst, createEnemy, createMissile, createOrb, createPickup, createPlayer, createRift, createShard } from './entities.js';
import { COLORS, sectorForWave } from './palette.js';
import { UPGRADES } from './upgrades.js';

function place(state, kind, x, y, elite = false) {
  const enemy = createEnemy(kind, x, y, state.rng, 1, elite);
  enemy.angle = Math.atan2(state.player.y - y, state.player.x - x);
  state.enemies.push(enemy);
  return enemy;
}

export function stageShot(state, name) {
  const rng = state.rng;
  state.player = createPlayer();

  if (name === 'start') {
    state.screen = 'title';
    state.sectorIndex = 0;
    state.record = { runs: 14, kills: 2310, elites: 9, cores: 121, bestWave: 11, bestScore: 41850 };
    state.best = 41850;
    // A quiet patrol drifting behind the title veil — the full cast,
    // with the Dreadnought's silhouette looming in the far corner.
    place(state, 'chaser', 150, 120);
    place(state, 'weaver', 806, 140);
    place(state, 'splitter', 812, 408);
    place(state, 'dart', 138, 414);
    place(state, 'bulwark', 96, 268);
    place(state, 'stinger', 872, 268);
    place(state, 'boss', 866, 84);
    for (let i = 0; i < 7; i += 1) state.shards.push(createShard(120 + i * 118, 470 + Math.sin(i * 1.7) * 16, rng));
    return;
  }

  if (name === 'play') {
    // The money shot: a wave-5 Dreadnought fight, mid-charge, with the
    // ship kiting left, bolts streaming right, plasma coming back — and
    // the new war on show: an elite Bulwark, a rift tearing the corner,
    // a stolen-seekers chip on the HUD and a Core waiting to be taken.
    state.screen = 'play';
    state.wave = 5;
    state.sectorIndex = sectorForWave(5).index;
    state.waveTotal = 14;
    state.score = 13900;
    state.shardBank = 23;
    state.shardsCollected = 61;
    state.combo = 5;
    state.comboTimer = 1.35;
    state.bestCombo = 7;
    state.effects.seekers = 8.4;
    state.effects.lance = 6.2;
    state.starfallReady = true;
    state.player.x = 330;
    state.player.y = 330;
    state.player.hp = 2;
    state.player.shield = 1;
    state.player.angle = -0.35;
    // The Lance Beam, mid-burn: from the kid's blaster to the boss.
    state.beam = {
      x: state.player.x + Math.cos(state.player.angle) * 26,
      y: state.player.y - 26 + Math.sin(state.player.angle) * 8,
      angle: state.player.angle,
      length: 352,
    };
    // A named terror fell a breath ago; its obituary is still up. The
    // near-endless duration is deliberate: the banner clock runs even
    // in a staged scene, the camera may arrive many seconds after
    // the pose, and a normal duration would have faded by then.
    state.banner = { title: '☠ GRANNY VEX IS DOWN', subtitle: 'elite Stinger destroyed · +2,700', time: 0.3, duration: 999 };
    const boss = createEnemy('boss', 690, 215, rng, 1.24);
    boss.hp = 52;
    boss.angle = Math.atan2(state.player.y - 215, state.player.x - 690);
    state.enemies.push(boss);
    place(state, 'chaser', 590, 430);
    place(state, 'dart', 180, 140);
    place(state, 'weaver', 110, 460);
    place(state, 'mini', 610, 320);
    place(state, 'mini', 540, 130);
    const elite = place(state, 'bulwark', 470, 468, true);
    elite.hp = 31;
    place(state, 'stinger', 235, 225);
    // A gravity rift gnaws the lower-right corner.
    state.rifts.push(createRift(815, 445));
    // Two wrecks left power behind: a Nova Core and an Overdrive.
    state.pickups.push(createPickup('nova', 445, 235, rng));
    state.pickups.push(createPickup('overdrive', 190, 350, rng));
    // A seeker already away, bending toward the Dreadnought.
    const missile = createMissile(300, 385, -0.9);
    missile.vx = 300;
    missile.vy = -190;
    state.missiles.push(missile);
    state.floaters.push({ x: 470, y: 420, text: 'ELITE', color: COLORS.elite, size: 13, life: 1, maxLife: 1 });
    // Bolts already in flight from the ship's nose toward the boss.
    for (let i = 0; i < 3; i += 1) {
      state.bullets.push({
        kind: 'bullet',
        x: 400 + i * 52,
        y: 316 - i * 19,
        vx: 590,
        vy: -215,
        radius: 4,
        angle: -0.35,
        damage: 1,
        life: 0.9,
      });
    }
    // The Dreadnought's answer: a fan of plasma orbs mid-flight.
    state.orbs.push(createOrb(600, 240, Math.PI - 0.5, 'boss'));
    state.orbs.push(createOrb(560, 285, Math.PI - 0.15, 'boss'));
    state.orbs.push(createOrb(520, 330, Math.PI + 0.25, 'boss'));
    // One escort is mid-explosion beside the boss: a ring of sparks.
    burst(state.particles, 585, 250, rng, COLORS.chaser, 16, 240);
    burst(state.particles, 250, 420, rng, COLORS.splitter, 10, 200);
    for (const p of state.particles) p.life = p.maxLife * rng.range(0.5, 1);
    for (let i = 0; i < 9; i += 1) state.shards.push(createShard(470 + rng.range(-90, 110), 380 + rng.range(-50, 70), rng));
    return;
  }

  if (name === 'upgrade') {
    state.screen = 'upgrade';
    state.wave = 3;
    state.score = 8620;
    state.shardBank = 47;
    state.shardsCollected = 70;
    state.player.hp = 2;
    state.choices = ['missiles', 'cannons', 'aegis'].map((id) => UPGRADES.find((u) => u.id === id));
    return;
  }

  // 'end' and anything else: the results screen.
  state.screen = 'over';
  state.wave = 7;
  state.sectorIndex = sectorForWave(7).index;
  state.record = { runs: 15, kills: 2488, elites: 10, cores: 130, bestWave: 11, bestScore: 41850 };
  state.score = 21840;
  state.best = 21840;
  state.shardsCollected = 96;
  state.coresCollected = 9;
  state.bestCombo = 12;
  state.player.hp = 0;
  place(state, 'chaser', 210, 160);
  place(state, 'weaver', 760, 180);
  place(state, 'splitter', 700, 400);
}
