// main.ts — the entrypoint that hands Starshard Arena in.
//
// The game itself is the static site in game/ (open game/index.html in a
// browser and play; it loads nothing from the network). This program's
// whole job is packaging: copy game/ and screenshots/ into the output
// directory and write dossier.json there with the vendored make.fun
// library — the dossier is the bundle of screenshots and source text
// the bounty judges from.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Play it locally instead with:  node serve.ts  (http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
const localShots = join(repoDir, 'screenshots');
if (existsSync(localShots)) cpSync(localShots, shotsDir, { recursive: true });

// The caps are the scorer's own: at most 4 screenshots of 256 KiB each,
// at most 993 game files totalling 48 MiB, and the dossier's source
// text capped at 160 KiB. Refusing here beats being refused there.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1_000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
