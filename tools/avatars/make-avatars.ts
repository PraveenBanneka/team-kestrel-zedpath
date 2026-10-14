// Generates the 12 preset profile pictures (CR-006) as static SVG files in public/avatars/a01.svg ... a12.svg.
// Style: a plain person silhouette (head and shoulders) on a coloured circle, one colour family per picture
// (Praveen 2026-10-14: "icons like this, just different colours and shades", replacing the earlier character sets).
// Drawn here, so there is no third-party artwork, licence or credit. Generated once and served as files.
// Run from the repo root:  node tools/avatars/make-avatars.ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'avatars');
// [background, figure]: a mid tone with a light tint of the same hue (contrast >= 3:1 so the figure reads clearly).
// a01..a12 keep their codes (account.avatar CHECK in migration 0010), so saved choices keep working.
const PALETTE: [string, string][] = [
  ['#647887', '#D3DCE4'],   // slate (the classic)
  ['#3F6FB5', '#CFE0F7'],   // blue
  ['#24868A', '#C9EEEE'],   // teal
  ['#3E8E5A', '#CDEBD6'],   // green
  ['#7A8A2E', '#E6EDC2'],   // olive
  ['#B7791F', '#F6E3C0'],   // amber
  ['#C0603A', '#F7D9CB'],   // terracotta
  ['#B4456E', '#F5D2DF'],   // rose
  ['#8650B0', '#E6D6F3'],   // purple
  ['#5257B8', '#D7D9F5'],   // indigo
  ['#2C7FA3', '#CBE7F3'],   // ocean
  ['#5F5A55', '#DCD8D3'],   // stone
];

const svg = ([bg, fg]: [string, string], id: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs>` +
  `<g clip-path="url(#${id})"><rect width="100" height="100" fill="${bg}"/><circle cx="50" cy="40" r="17" fill="${fg}"/>` +
  `<ellipse cx="50" cy="96" rx="33" ry="29" fill="${fg}"/></g></svg>`;

fs.mkdirSync(OUT, { recursive: true });
PALETTE.forEach((pair, i) => {
  const code = `a${String(i + 1).padStart(2, '0')}`;
  fs.writeFileSync(path.join(OUT, `${code}.svg`), svg(pair, `c${code}`));
});
console.log(`wrote ${PALETTE.length} avatars to ${path.relative(ROOT, OUT)}`);
