// upgrades.js — the Forge: three choices offered between waves.
//
// Nothing here is free. Every upgrade is forged from star shards — the
// currency the Hollow drop when they break — so each visit to the
// Forge is a real decision: spend the shards now on firepower, or bank
// them toward the Aegis and take the next wave as you are. Costs sit in
// `cost`; main.js checks the player's shard bank before it lets a pick
// through, and the bank-or-buy tension is what makes builds diverge:
// a rich run forges a fortress, a poor one forges a gambler.

export const UPGRADES = [
  {
    id: 'cannons',
    cost: 38,
    name: 'Twin Cannons',
    blurb: '+1 cannon. Every shot fires one more bolt, fanned wide.',
    max: 3,
    applies: (player) => player.stats.cannons < 4,
    apply: (player) => {
      player.stats.cannons += 1;
    },
  },
  {
    id: 'rapid',
    cost: 24,
    name: 'Rapid Cycler',
    blurb: 'Fire 18% faster. The swarm melts sooner; so does your aim.',
    max: 5,
    applies: () => true,
    apply: (player) => {
      player.stats.fireInterval *= 0.82;
    },
  },
  {
    id: 'heavy',
    cost: 28,
    name: 'Heavy Bolts',
    blurb: '+1 bolt damage. Splitters pop in half the hits.',
    max: 4,
    applies: () => true,
    apply: (player) => {
      player.stats.bulletDamage += 1;
    },
  },
  {
    id: 'thrusters',
    cost: 18,
    name: 'Swift Thrusters',
    blurb: '+12% flight speed and a quicker dash recharge.',
    max: 4,
    applies: () => true,
    apply: (player) => {
      player.stats.speed *= 1.12;
      player.stats.dashRecharge *= 0.85;
    },
  },
  {
    id: 'magnet',
    cost: 12,
    name: 'Shard Magnet',
    blurb: 'Shards fly to you from 60% farther away.',
    max: 3,
    applies: () => true,
    apply: (player) => {
      player.stats.magnetRadius *= 1.6;
    },
  },
  {
    id: 'aegis',
    cost: 32,
    name: 'Aegis Plating',
    blurb: 'A shield that eats one hit, and recharges every wave.',
    max: 2,
    applies: (player) => player.shield < 2,
    apply: (player) => {
      player.shield += 1;
    },
  },
  {
    id: 'repair',
    cost: 18,
    name: 'Field Repair',
    blurb: 'Restore 1 hull now, and raise max hull by 1 (once per pick, up to 5).',
    max: 3,
    applies: (player) => player.hp < player.maxHp || player.maxHp < 5,
    apply: (player) => {
      if (player.maxHp < 5) player.maxHp += 1;
      player.hp = Math.min(player.maxHp, player.hp + 1);
    },
  },
];

/** Draw three distinct upgrades the player can still use. */
export function drawChoices(player, rng, taken) {
  const pool = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max && u.applies(player));
  const choices = [];
  const copy = [...pool];
  while (choices.length < 3 && copy.length > 0) {
    const index = Math.floor(rng.next() * copy.length);
    choices.push(copy.splice(index, 1)[0]);
  }
  return choices;
}
