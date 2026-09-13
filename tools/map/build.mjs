/* ============================================================
   bide guest TV — north coast map builder

       node tools/map/build.mjs

   Writes tools/map/coast.svg: the land, the coastline and the road,
   as SVG path data in the map's own viewBox. That fragment is pasted
   into public/nc500/map/ and into the map poster on public/nc500/, so
   the television fetches nothing and loads no library — it is the same
   inline SVG the pages have always used, with the shapes now traced
   from real geography rather than drawn by hand.

   Geometry: OpenStreetMap via the Overpass API.
   OpenStreetMap data is © OpenStreetMap contributors, ODbL. The licence
   covers the data rather than the picture, so the attribution belongs
   with the project rather than burnt into the guest's screen — it is
   recorded in public/assets/seed/CREDITS.md and in the README.

   Projection is equirectangular with the longitude axis scaled by
   cos(mid-latitude). Over sixty kilometres at 58°N the error against a
   proper conformal projection is far below one pixel on a television,
   and it keeps this file readable.
   ============================================================ */

import fs from 'node:fs/promises';
import path from 'node:path';

const HERE = import.meta.dirname;
const TMP = path.join(HERE, '../../.seed-tmp');

/* ---- the maps this builds ----
   Two windows on the same data and the same code: the north coast, for
   the NC500 guide, and Thurso itself, for eat and drink. Pick one on the
   command line — `node tools/map/build.mjs town`. Everything below is
   written against MAP, so adding a third is a matter of adding a config,
   not of copying this file. */
const MAPS = {
  coast: {
    out: 'coast.svg',
    /* West of Thurso to past Duncansby, and far enough north to hold the
       south end of Orkney. Everything the guide sends a guest to is
       inside it, which is the whole argument of the page. */
    west: -4.00, east: -2.75, south: 58.53, north: 58.90,
    width: 320,
    coastTolerance: 0.4,
    minIsland: 1.2,
    /* the road north */
    roadFilter: '["highway"]["ref"~"^A(836|99|9)$"]',
    roadTolerance: 0.8,
    orkney: { lon: -3.22, lat: 58.868, label: 'ORKNEY' },
    /* PLACEHOLDER — this is my reading of where the building is, not a
       surveyed position, and it is the one thing on these maps that did
       not come out of OSM. Both pins and every walking time on the eat
       pages hang off it. Replace it before this goes in front of a
       guest. */
    here: { label: 'THE VIEW', lat: 58.5960, lon: -3.5230, dy: 17 },
    places: [
      { href: '/nc500/orkney-ferry/',     label: 'Scrabster',     lat: 58.6120, lon: -3.5460, dx: -17, dy: -8 },
      { href: '/nc500/thurso-beach/',     label: 'Thurso beach',  lat: 58.6045, lon: -3.5120, dx: 34,  dy: 2 },
      { href: '/nc500/dunnet-head/',      label: 'Dunnet Head',   lat: 58.6710, lon: -3.3750, dx: -4,  dy: -11 },
      { href: '/nc500/castle-of-mey/',    label: 'Castle of Mey', lat: 58.6470, lon: -3.2260, dx: 0,   dy: -11 },
      { href: '/nc500/duncansby-stacks/', label: 'Duncansby',     lat: 58.6440, lon: -3.0230, dx: 11,  dy: -10 }
    ]
  },

  town: {
    out: 'town.svg',
    /* Thurso itself: the bay at the top, the town below it, and Scrabster
       just off the west edge. Tight enough that a five-minute walk is a
       visible distance rather than a rounding error. */
    west: -3.5355, east: -3.5110, south: 58.5935, north: 58.6010,
    width: 320,
    coastTolerance: 0.12,
    minIsland: 0.3,
    /* the streets, not the trunk road */
    roadFilter: '["highway"~"^(primary|secondary|tertiary|residential|unclassified|pedestrian|living_street)$"]',
    roadTolerance: 0.25,
    orkney: null,
    /* PLACEHOLDER — see the note on the coast map. Same guessed
       position; the town map is the one where being 100m out shows. */
    here: { label: 'THE VIEW', lat: 58.5960, lon: -3.5230, dy: 15 },
    /* Real places, at their real coordinates. Names, streets and
       coordinates come from OpenStreetMap; nothing here is invented.
       See public/eat/index.html for what that does and does not let
       the page claim. */
    places: [
      { href: '/eat/northern-plate/', label: 'The Northern Plate', lat: 58.59678, lon: -3.52084, dx: 2,   dy: -11 },
      { href: '/eat/jamiesons/',      label: "Jamieson's",         lat: 58.59499, lon: -3.52004, dx: -22, dy: 3 },
      { href: '/eat/reids-bakers/',   label: "Reid's Bakers",      lat: 58.59536, lon: -3.51920, dx: 27,  dy: 3 },
      { href: '/eat/bydand/',         label: 'Bydand',             lat: 58.59459, lon: -3.52021, dx: 0,   dy: 14 }
    ]
  }
};

const MAP = MAPS[process.argv[2] || 'coast'];
if (!MAP) throw new Error(`no such map: ${process.argv[2]} (have ${Object.keys(MAPS).join(', ')})`);

const WEST = MAP.west, EAST = MAP.east;
const SOUTH = MAP.south, NORTH = MAP.north;

const W = MAP.width;                             /* viewBox width */
const MIDLAT = (SOUTH + NORTH) / 2;
const KX = Math.cos(MIDLAT * Math.PI / 180);     /* longitude foreshortening */
const SCALE = W / ((EAST - WEST) * KX);
const H = Math.round((NORTH - SOUTH) * SCALE);   /* height follows from the aspect */

const MARGIN_UNITS = 80;                         /* viewBox units of land built outside the frame */

const project = ([lon, lat]) => [
  (lon - WEST) * KX * SCALE,
  (NORTH - lat) * SCALE
];

/* ---- Overpass, cached on disk so reruns cost nothing ---- */
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

async function overpass(name, query) {
  const cache = path.join(TMP, `${name}.json`);
  try { return JSON.parse(await fs.readFile(cache, 'utf8')); } catch { /* not cached yet */ }
  await fs.mkdir(TMP, { recursive: true });
  let lastError = null;
  for (const mirror of MIRRORS) {
    try { return await ask(mirror, name, query, cache); }
    catch (e) { lastError = e; process.stderr.write(`  ${mirror}: ${e.message}\n`); }
  }
  throw lastError;
}

async function ask(endpoint, name, query, cache) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'bide-tv-map/1.0 (prototype map build; runs a handful of times, not in CI)'
    },
    body: new URLSearchParams({ data: query })
  });
  if (!res.ok) throw new Error(`overpass ${name}: ${res.status}`);
  const text = await res.text();
  if (!text.startsWith('{')) throw new Error(`overpass ${name}: not JSON — ${text.slice(0, 120)}`);
  await fs.writeFile(cache, text);
  return JSON.parse(text);
}

/* Fetched outside the picture, because the land is closed off beyond the
   frame and a coastline that stops short of the closing edge leaves a
   hole in the middle of the town. How far outside is worked out from the
   projection rather than typed in: the coast map spans sixty miles and
   wants half a degree of slack, the town map spans a mile and wants a
   few hundred metres. Asking Overpass for every residential street in
   half of Caithness, which is what a hand-set figure did here, takes
   minutes and then times out. */
const PAD_LAT = (MARGIN_UNITS * 2) / SCALE;
const PAD_LON = PAD_LAT / KX;
const BBOX = [
  (SOUTH - PAD_LAT).toFixed(4), (WEST - PAD_LON).toFixed(4),
  (NORTH + PAD_LAT).toFixed(4), (EAST + PAD_LON).toFixed(4)
].join(',');

const key = process.argv[2] || 'coast';
const coastRaw = await overpass(`${key}-coast`,
  `[out:json][timeout:90];way["natural"="coastline"](${BBOX});out geom;`);
const roadRaw = await overpass(`${key}-roads`,
  `[out:json][timeout:90];way${MAP.roadFilter}(${BBOX});out geom;`);

const geometry = el => (el.geometry || []).map(g => [g.lon, g.lat]);
const mod = (a, n) => ((a % n) + n) % n;
const mod4 = t => mod(t, 4);

/* ---- stitch ways end to end ----
   Overpass hands back a bag of fragments and a coastline is only
   readable once they are joined. Joining on shared endpoints is enough:
   OSM guarantees the shared node, so the coordinates match exactly.

   The join is undirected — a fragment is reversed if that is what makes
   it fit. OSM does draw coastline consistently, with the land on its
   left, but a bbox query returns ways that were split for reasons of
   their own, and insisting on direction leaves the coast in pieces: the
   first version of this stopped dead at Gills Bay and squared Caithness
   off with a ruler. Nothing downstream depends on the direction; the
   land is worked out from where Thurso is. */
function stitchOnce(parts) {
  const key = p => `${p[0]},${p[1]}`;

  const ends = new Map();                 /* endpoint -> [{way, atStart}] */
  const note = (w, atStart) => {
    const k = key(atStart ? w[0] : w[w.length - 1]);
    if (!ends.has(k)) ends.set(k, []);
    ends.get(k).push({ w, atStart });
  };
  for (const w of parts) { note(w, true); note(w, false); }

  const used = new Set();
  const chains = [];
  for (const seed of parts) {
    if (used.has(seed)) continue;
    used.add(seed);
    let chain = seed.slice();

    /* grow forwards, then backwards */
    for (const forwards of [true, false]) {
      for (;;) {
        const tip = forwards ? chain[chain.length - 1] : chain[0];
        /* Where three ways meet — a harbour wall at Gills Bay, a pier at
           Scrabster — take the longest. The main coast is always the long
           one; the alternative is following a jetty out and stopping. */
        const options = (ends.get(key(tip)) || []).filter(e => !used.has(e.w));
        options.sort((a, b) => b.w.length - a.w.length);
        const hit = options[0];
        if (!hit) break;
        used.add(hit.w);
        /* Growing forwards we need a piece that STARTS at the tip;
           growing backwards, one that ENDS at it. Getting this the same
           way round for both directions folds the way back on itself and
           quietly eats the coast a few miles further on. */
        const startsAtTip = hit.atStart;
        const piece = (forwards === startsAtTip) ? hit.w : hit.w.slice().reverse();
        if (forwards) chain.push(...piece.slice(1));
        else chain = piece.slice(0, -1).concat(chain);
        if (key(chain[0]) === key(chain[chain.length - 1])) break;   /* a closed ring */
      }
    }
    chains.push(chain);
  }
  return chains.sort((a, b) => b.length - a.length);
}

/* One pass is not enough. Whether two fragments end up in the same chain
   depends on the order Overpass happened to list them in: a pass can
   leave two chains nose to tail with a single twelve-point way stranded
   between them, which is how Caithness came to stop at Gills Bay and get
   squared off with a ruler. Passing the chains back through the same
   join, until a pass changes nothing, settles it. */
function stitch(elements) {
  let chains = elements.map(geometry).filter(w => w.length > 1);
  for (let pass = 0; pass < 6; pass++) {
    const next = stitchOnce(chains);
    if (next.length === chains.length) return next;
    chains = next;
  }
  return chains;
}

/* ---- Douglas-Peucker, in viewBox units ----
   The tolerance is in the units the television actually renders, so the
   result is "as much coastline as a pixel can show" rather than an
   arbitrary fraction of a degree. */
function simplify(points, tol) {
  if (points.length < 3) return points;
  const sqTol = tol * tol;
  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x; dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1, maxSq = sqTol;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last]);
      if (sq > maxSq) { index = i; maxSq = sq; }
    }
    if (index > -1) { keep[index] = true; stack.push([first, index], [index, last]); }
  }
  return points.filter((_, i) => keep[i]);
}

/* ---- the land ----
   Earlier versions of this threaded every clipped coastline fragment
   round the edge of the frame, the way a general-purpose coastline
   renderer has to. On a frame this small that turned out to be all risk
   and no benefit: a dozen fragments meet the edge, several at
   indistinguishable positions, and one mis-threaded pair silently swaps
   the sea for the land.

   So the frame is simply made bigger than the picture. The coastline is
   clipped to a rectangle well outside the viewBox, and the mainland is
   closed off round the south and the west — which is the land, here,
   north coast and east coast both. Every invented edge lies outside the
   viewBox and is never drawn; the television clips it away. The cost is
   that this knows it is looking at the north coast of Scotland. It says
   so, rather than pretending to be general and getting it wrong. */
const MARGIN = MARGIN_UNITS;                /* viewBox units of slack */
const X0 = -MARGIN, X1 = W + MARGIN;
const Y0 = -MARGIN, Y1 = H + MARGIN;

const isIn = ([x, y]) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1;

function clipSegment(p, q) {
  let t0 = 0, t1 = 1;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const tests = [[-dx, p[0] - X0], [dx, X1 - p[0]], [-dy, p[1] - Y0], [dy, Y1 - p[1]]];
  for (const [pk, qk] of tests) {
    if (pk === 0) { if (qk < 0) return null; continue; }
    const r = qk / pk;
    if (pk < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [
    [p[0] + t0 * dx, p[1] + t0 * dy],
    [p[0] + t1 * dx, p[1] + t1 * dy]
  ];
}

function runsInside(points) {
  const runs = [];
  let run = [];
  const push = pt => {
    const last = run[run.length - 1];
    if (!last || Math.hypot(last[0] - pt[0], last[1] - pt[1]) > 1e-9) run.push(pt);
  };
  for (let i = 0; i < points.length - 1; i++) {
    const seg = clipSegment(points[i], points[i + 1]);
    if (!seg) { if (run.length > 1) runs.push(run); run = []; continue; }
    push(seg[0]);
    push(seg[1]);
    if (!isIn(points[i + 1])) { if (run.length > 1) runs.push(run); run = []; }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

function signedArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  }
  return a / 2;
}
const area = poly => Math.abs(signedArea(poly));

/* All land is wound the same way, so that the single fill path adds
   shapes together instead of a reversed ring punching a hole through
   the one underneath it. */
const wound = poly => (signedArea(poly) < 0 ? poly.slice().reverse() : poly);

const d = pts => pts.map((p, i) =>
  `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

/* ---- build ---- */
const COAST_TOL = MAP.coastTolerance;
const MIN_ISLAND = MAP.minIsland;   /* viewBox units squared — below this a skerry is a smudge */

const runs = [];                 /* every stretch of coast inside the clip rectangle */
const islands = [];              /* rings that never leave it */
const THURSO = project([MAP.here.lon, MAP.here.lat]);

for (const chain of stitch(coastRaw.elements)) {
  const projected = chain.map(project);
  const closed = Math.hypot(projected[0][0] - projected[projected.length - 1][0],
                            projected[0][1] - projected[projected.length - 1][1]) < 0.4;

  if (closed && projected.every(isIn)) {
    const ring = simplify(projected, COAST_TOL);
    if (ring.length > 3 && area(ring) >= MIN_ISLAND) islands.push(ring);
    continue;
  }
  for (const run of runsInside(projected)) {
    const simple = simplify(run, COAST_TOL);
    if (simple.length > 1) runs.push(simple);
  }
}

/* ---- the Caithness coast ----
   Start from the run that passes closest to Thurso — not the longest,
   which with the clip rectangle reaching past Hoy is Orkney — and then
   grow it along whatever continues it. The growing is done here, on the
   projected runs, rather than trusted to the stitch upstream: stitching
   the raw ways leaves the coast in a few long pieces that happen to
   line up nose to tail, and joining those is one loop rather than an
   argument with the order Overpass listed them in. */
const JOIN = 0.05;               /* viewBox units — a shared node, allowing for float drift */
const meets = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < JOIN;

let seed = -1, seedNear = Infinity;
runs.forEach((run, i) => {
  if (run.length < 20) return;
  for (const p of run) {
    const near = Math.hypot(p[0] - THURSO[0], p[1] - THURSO[1]);
    if (near < seedNear) { seedNear = near; seed = i; }
  }
});
if (seed < 0) throw new Error('no Caithness coast in frame');

const taken = new Set([seed]);
let mainland = runs[seed].slice();
for (let grew = true; grew;) {
  grew = false;
  for (let i = 0; i < runs.length; i++) {
    if (taken.has(i)) continue;
    const run = runs[i];
    const head = mainland[0], tail = mainland[mainland.length - 1];
    const a = run[0], b = run[run.length - 1];
    if (meets(tail, a))      { mainland.push(...run.slice(1)); }
    else if (meets(tail, b)) { mainland.push(...run.slice(0, -1).reverse()); }
    else if (meets(head, b)) { mainland = run.slice(0, -1).concat(mainland); }
    else if (meets(head, a)) { mainland = run.slice(1).reverse().concat(mainland); }
    else continue;
    taken.add(i);
    grew = true;
  }
}

/* Run it west to east, then close it off along the bottom of the clip
   rectangle. What that encloses is everything south of the coastline —
   which on this stretch is Caithness, and, once the coast turns south
   past Duncansby, everything west of it too. The closing edge sits well
   below the viewBox, so the television never sees it. */
if (mainland[0][0] > mainland[mainland.length - 1][0]) mainland.reverse();
const first = mainland[0], last = mainland[mainland.length - 1];
const landRing = mainland.concat([[last[0], Y1], [first[0], Y1], first]);

/* Sanity: Thurso must have ended up on land. If it has not, the coast
   ran the other way and closing to the south-west enclosed the sea. */
function contains(poly, [px, py]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
if (!contains(landRing, THURSO)) {
  throw new Error('Thurso came out at sea — the mainland closure is the wrong way round');
}

const land = [landRing].concat(islands).map(wound);
const order = land.map((_, i) => i).sort((a, b) => area(land[b]) - area(land[a]));
const assembled = [landRing];

/* The coastline as a line rather than as the edge of a shape: the frame
   edges are not coast and must not be stroked. */
const shore = [mainland].concat(islands.map(r => r.concat([r[0]])));

/* the road: the A836 along the north coast and the A99 down the east */
const roads = stitch(roadRaw.elements)
  .flatMap(c => runsInside(c.map(project)))
  .map(c => simplify(c, MAP.roadTolerance))
  .filter(c => c.length > 5);

/* ---- the places the guide sends people to ----
   Positions are the real ones. The map is small and the labels are not,
   so each carries a nudge in viewBox units to keep it off its neighbour;
   the pin itself is never moved. */
const PLACES = MAP.places;
const YOU_ARE_HERE = MAP.here;

const pins = PLACES.map(pl => {
  const [x, y] = project([pl.lon, pl.lat]);
  return `<a href="${pl.href}" class="pin-hit" tabindex="0">` +
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="transparent"/>` +
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" class="pin-ring"/>` +
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" class="pin-dot"/>` +
    `<text x="${(x + pl.dx).toFixed(1)}" y="${(y + pl.dy).toFixed(1)}" class="pin-label" text-anchor="middle">${pl.label}</text>` +
    `</a>`;
});

const [hx, hy] = project([YOU_ARE_HERE.lon, YOU_ARE_HERE.lat]);
const here = `<g class="here">` +
  `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3.4" class="here-dot"/>` +
  `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="7.5" fill="none" stroke="#F9F8F3" stroke-width=".8" opacity=".45"/>` +
  `<text x="${hx.toFixed(1)}" y="${(hy + YOU_ARE_HERE.dy).toFixed(1)}" class="here-label" text-anchor="middle">${YOU_ARE_HERE.label}</text></g>`;

let orkney = '';
if (MAP.orkney) {
  const [ox, oy] = project([MAP.orkney.lon, MAP.orkney.lat]);
  orkney = `<text x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" class="pin-label" text-anchor="middle" ` +
    `style="letter-spacing:.3em;font-size:6px;opacity:.7">${MAP.orkney.label}</text>`;
}

const svg = [
  `<!-- generated by tools/map/build.mjs — do not hand-edit`,
  `     geometry © OpenStreetMap contributors, ODbL`,
  `     window ${WEST}..${EAST} lon, ${SOUTH}..${NORTH} lat`,
  `     viewBox 0 0 ${W} ${H} -->`,
  ``,
  `<!-- land: ${land.length} shapes in one path, so overlaps merge -->`,
  `<path class="land" d="${order.map(i => d(land[i]) + 'Z').join('')}"/>`,
  ``,
  `<!-- coastline: ${shore.length} runs -->`,
  `<path class="shore" d="${shore.map(d).join('')}"/>`,
  ``,
  `<!-- the road north — A836 and A99: ${roads.length} runs -->`,
  `<path class="road" d="${roads.map(d).join('')}"/>`,
  ``,
  `<!-- where you are, and where the guide can take you -->`,
  orkney,
  here,
  ...pins
].join('\n');

await fs.writeFile(path.join(HERE, MAP.out), svg + '\n');

console.log(`viewBox 0 0 ${W} ${H}`);
console.log(`mainland ${mainland.length} pts + ${islands.length} islands · ${roads.length} road runs`);
for (const i of order.slice(0, 6)) {
  console.log(`  ${(area(land[i]) / (W * H) * 100).toFixed(1).padStart(5)}%  ${String(land[i].length).padStart(4)} pts`);
}
console.log(`wrote tools/map/${MAP.out} (${(svg.length / 1024).toFixed(1)} kB)`);
