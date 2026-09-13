/* ============================================================
   bide guest TV — seed photography fetcher

   Downloads the prototype's seed photographs from Wikimedia
   Commons, resizes them for the two places they are used, and
   writes the attribution file that the licences require.

       node tools/seed/fetch.mjs

   Nothing here runs on the television, and nothing here runs at
   build time — the resulting JPEGs are committed. This script
   exists so the set can be reproduced, audited, or replaced
   wholesale when The View sends its own photography.

   Every photo in manifest.json is CC0, CC BY or CC BY-SA, which
   is why the credits file is not optional: see CREDITS.md in the
   output directory.

   Renditions:
     wide  1280px  full-bleed backdrops and hero bands
     card   560px  poster tiles in the streaming rows

   Resizing is done with sips, which ships with macOS. On Linux,
   swap the resize() body for ImageMagick.
   ============================================================ */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'public/assets/seed');
const TMP = path.join(ROOT, '.seed-tmp');

const SIZES = { wide: 1600, card: 960 };
const QUALITY = '58';             /* sips formatOptions: 0-100, or normal/high/best */

/* Commons asks for a descriptive agent with a contact route. */
const UA = {
  'User-Agent': 'bide-tv-seed/1.0 (https://github.com/bide/lg-bide-tv; prototype asset fetch)'
};

const manifest = JSON.parse(
  await fs.readFile(path.join(import.meta.dirname, 'manifest.json'), 'utf8')
);

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(TMP, { recursive: true });

async function download(slug, url) {
  const src = path.join(TMP, `${slug}.orig`);
  try {
    await fs.access(src);
    return src;                    /* already have it — reruns are cheap */
  } catch {}
  /* Flickr, which is where the Openverse photographs live, times out often
     enough that one attempt is not a fetch. */
  let body = null, last = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      body = Buffer.from(await res.arrayBuffer());
      break;
    } catch (e) {
      last = e;
      process.stderr.write(`  ${slug}: ${e.message}, retrying\n`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  if (!body) throw new Error(`${slug}: ${last && last.message}`);
  await fs.writeFile(src, body);
  await new Promise(r => setTimeout(r, 400));   /* be a good Commons citizen */
  return src;
}

/* Resize to a target WIDTH, letting the height fall where it may, then
   re-encode as JPEG. --resampleWidth rather than --resampleHeightWidthMax
   so a portrait original is not left enormous. */
async function resize(src, dest, width) {
  await run('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', QUALITY,
    '--resampleWidth', String(width),
    src, '--out', dest
  ]);
}

const credits = [];
let bytes = 0;

for (const [slug, m] of Object.entries(manifest)) {
  const src = await download(slug, m.url);
  for (const r of m.renditions) {
    const dest = path.join(OUT, `${slug}-${r}.jpg`);
    await resize(src, dest, SIZES[r]);
    bytes += (await fs.stat(dest)).size;
    process.stdout.write(`  ${path.basename(dest)}\n`);
  }
  credits.push(m);
}

/* ---- the attribution file the licences require ---- */
const lines = [
  '# Seed photography — credits',
  '',
  'The photographs in this directory are **prototype seed imagery**, not',
  "The View's own pictures. They are here so the guest pages can be reviewed",
  'with real photographs in them rather than placeholders. Every one is',
  'licensed for commercial use with attribution, and every one is credited',
  'below as those licences require.',
  '',
  'Replace them with the property\'s own photography before this faces a real',
  'guest — see the seed photography section of the README. Once they are all',
  'replaced, this file goes with them.',
  '',
  'Regenerate with `node tools/seed/fetch.mjs`.',
  '',
  '| Photograph | Author | Licence | Source |',
  '| --- | --- | --- | --- |'
];
for (const m of credits) {
  lines.push(`| ${m.caption} | ${m.author} | ${m.licence} | [Wikimedia Commons](${m.page}) |`);
}
lines.push('');
lines.push('## The map');
lines.push('');
lines.push('The north coast map on `/nc500/map/` is drawn from OpenStreetMap data:');
lines.push('coastline, islands and the A836/A99, fetched through the Overpass API and');
lines.push('traced into SVG by `tools/map/build.mjs`. No tiles are served and no request');
lines.push('leaves the television.');
lines.push('');
lines.push('> Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors,');
lines.push('> available under the [Open Database Licence](https://opendatacommons.org/licenses/odbl/).');
lines.push('');
lines.push('Unlike the photographs, this one does not go away when The View sends its own');
lines.push('pictures — the map stays, and so does the attribution.');
lines.push('');
lines.push('## Licence texts');
lines.push('');
lines.push('Photographs: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), ' +
  '[CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/), ' +
  '[CC BY 3.0 DE](https://creativecommons.org/licenses/by/3.0/de/deed.en), ' +
  '[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), ' +
  '[CC0](https://creativecommons.org/publicdomain/zero/1.0/).');
lines.push('');

await fs.writeFile(path.join(OUT, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${credits.length} photographs, ${(bytes / 1024 / 1024).toFixed(2)} MB total.`);
console.log(`Originals cached in ${path.relative(ROOT, TMP)}/ — delete it when you are done.`);
