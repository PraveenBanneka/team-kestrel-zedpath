// Generates the 12 preset profile pictures (CR-006) as static SVG files in public/avatars/a01.svg ... a12.svg.
// Style: "Bottts" by Pablo Stanley (bottts.com), via DiceBear; licence: free for personal and commercial use (credited
// in the README). Praveen 2026-10-11: "cute ones like in Discord", so friendly robots: smiling mouths and kind eyes
// only (no horns, shades or grills), one bright colour each. Generated once and served as files: no outside service is
// called when a student views them.
// Run from the repo root:  node tools/avatars/make-avatars.ts
import fs from 'node:fs';
import path from 'node:path';
import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'avatars');
const BODY = ['1e88e5', 'f4511e', '43a047', '8e24aa', 'ffb300', '00acc1', 'd81b60', '5e35b1', 'fb8c00', '00897b', '039be5', 'c0ca33'];
const BG = ['d1e9ff', 'ffe0d6', 'd8f3dc', 'efdcf7', 'fff1c9', 'd2f4f7', 'ffd9e6', 'e3dcfa', 'ffe7cc', 'd3f0ec', 'd6efff', 'f2f5cf'];
const EYES = ['happy', 'hearts', 'round', 'eva', 'bulging', 'roundFrame01'];
const MOUTH = ['smile01', 'smile02'];
const TOP = ['antenna', 'bulb01', 'glowingBulb01', 'antennaCrooked', 'lights', 'radar'];
const FACE = ['round01', 'round02', 'square01', 'square02'];

fs.mkdirSync(OUT, { recursive: true });
BODY.forEach((color, i) => {
  const code = `a${String(i + 1).padStart(2, '0')}`;
  const svg = createAvatar(bottts, {
    seed: `zedpath-${code}`, size: 128, radius: 50, backgroundColor: [BG[i]], baseColor: [color],
    eyes: [EYES[i % EYES.length]] as never, mouth: [MOUTH[i % MOUTH.length]] as never, top: [TOP[(i * 5) % TOP.length]] as never,
    face: [FACE[i % FACE.length]] as never, textureProbability: 0, sidesProbability: 100, topProbability: 100,
  }).toString();
  fs.writeFileSync(path.join(OUT, `${code}.svg`), svg);
});
console.log(`wrote ${BODY.length} avatars to ${path.relative(ROOT, OUT)}`);
