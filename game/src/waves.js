// waves.js — the wave director: what each wave sends, and when.
//
// A wave is a budget of Hollow spent on a mix of kinds. Early waves are
// chasers alone, then each new kind is introduced with a banner-worthy
// wave of mostly that kind, and from wave 6 the mixes blend. Enemy
// health creeps up 6% a wave so a long run keeps tightening, and the
// spawn trickle quickens so later waves feel denser, not just longer.

import { createEnemy } from './entities.js';

const INTRODUCTIONS = {
  2: { kind: 'dart', share: 0.55, label: 'LANCES INBOUND' },
  3: { kind: 'splitter', share: 0.45, label: 'BROODS INBOUND' },
  4: { kind: 'weaver', share: 0.45, label: 'WRAITHS INBOUND' },
};

/** Every fifth wave is a boss wave: one Dreadnought and a light escort. */
export function isBossWave(wave) {
  return wave % 5 === 0;
}

export function waveBudget(wave) {
  return 6 + wave * 4;
}

export function waveMix(wave, rng) {
  if (isBossWave(wave)) {
    // The Dreadnought leads; its escort trickles in behind it.
    const mix = ['boss'];
    const escort = 3 + Math.floor(wave / 5);
    for (let i = 0; i < escort; i += 1) mix.push(rng.pick(['chaser', 'dart', 'mini']));
    return mix;
  }
  const intro = INTRODUCTIONS[wave];
  const mix = [];
  let budget = waveBudget(wave);

  if (intro !== undefined) {
    const count = Math.round(budget * intro.share);
    for (let i = 0; i < count; i += 1) mix.push(intro.kind);
    budget -= count;
  }

  const unlocked = ['chaser'];
  if (wave >= 2) unlocked.push('dart');
  if (wave >= 3) unlocked.push('splitter');
  if (wave >= 4) unlocked.push('weaver');

  const costs = { chaser: 1, dart: 1, splitter: 2, weaver: 2 };
  let guard = 0;
  while (budget > 0 && guard < 200) {
    guard += 1;
    const kind = rng.pick(unlocked);
    if (costs[kind] > budget && budget >= 1) {
      mix.push('chaser');
      budget -= 1;
    } else {
      mix.push(kind);
      budget -= costs[kind];
    }
  }

  // Shuffle so kinds arrive interleaved instead of in blocks.
  for (let i = mix.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = mix[i];
    mix[i] = mix[j];
    mix[j] = tmp;
  }
  return mix;
}

export function waveLabel(wave) {
  if (isBossWave(wave)) return 'THE DREADNOUGHT COMES';
  const intro = INTRODUCTIONS[wave];
  return intro !== undefined ? intro.label : null;
}

export function spawnInterval(wave) {
  return Math.max(0.38, 1.05 - wave * 0.06);
}

export function healthScale(wave) {
  return 1 + (wave - 1) * 0.06;
}

/** Build the spawn queue for a wave: enemy records in arrival order. */
export function buildWave(wave, rng, width, height) {
  const scale = healthScale(wave);
  return waveMix(wave, rng).map((kind) => {
    const at = rng.edgePoint(width, height, 30);
    return createEnemy(kind, at.x, at.y, rng, scale);
  });
}
