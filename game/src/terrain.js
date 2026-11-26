// Senja Skies — terrain.
//
// The island chain is procedural but deterministic: one seeded generator
// builds the ground height, the rice paddies, the river, the road, the town
// and the clouds, so every load of the game shows the same islands. The
// ground is a smooth function of x, which is also what the flight model
// collides with — what you see is exactly what you can land on (or crash
// into). Distances in metres, heights in metres above sea level.

import { CONFIG } from './config.js';

// A tiny seeded generator (mulberry32). Same seed, same islands, every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
// Smooth blend that eases in and out, so runways meet the hills with no step.
const smooth = (t) => {
  const s = clamp01(t);
  return s * s * (3 - 2 * s);
};

// Rolling hills away from the flat places. Kept separate so the runways,
// the river valley and the volcano can blend over it.
function hills(x) {
  return (
    20 +
    9 * Math.sin(x * 0.004 + 1.7) +
    6 * Math.sin(x * 0.011 + 0.4) +
    3.5 * Math.sin(x * 0.023 + 2.1)
  );
}

export function groundHeight(x) {
  const c = CONFIG;
  if (x <= 0) return c.homeRunway.ground;
  if (x >= c.worldWidth) return 0;

  let h = hills(x);

  // River valley: the ground dips to a stream around x = 4200.
  const river = Math.exp(-((x - 4200) ** 2) / (2 * 260 * 260));
  h -= 15 * river;

  // Volcano hill: a broad cone around x = 7600, the island's high ground.
  const volcano = Math.exp(-((x - 7600) ** 2) / (2 * 420 * 420));
  h += 26 * volcano;

  // Home runway: dead flat, then blend into the hills over 400 m.
  if (x < c.homeRunway.x1 + 400) {
    h = lerp(c.homeRunway.ground, h, smooth((x - c.homeRunway.x1) / 400));
  }
  // Island airstrip: flat, blended in and out over 400 m each side.
  if (x > c.islandStrip.x0 - 400 && x < c.islandStrip.x1 + 400) {
    const tIn = smooth((x - (c.islandStrip.x0 - 400)) / 400);
    const tOut = smooth(((c.islandStrip.x1 + 400) - x) / 400);
    h = lerp(h, c.islandStrip.ground, Math.min(tIn, tOut));
  }
  // Beach: the ground sinks into the sea from x = 10800 to the shoreline.
  if (x > 10800) {
    h = lerp(h, 0, smooth((x - 10800) / (c.seaStart - 10800)));
  }
  if (x >= c.seaStart) return 0;

  return Math.max(0, h);
}

// Is x over a paved strip the wheels can use?
export function runwayAt(x) {
  const c = CONFIG;
  if (x >= c.homeRunway.x0 && x <= c.homeRunway.x1) return 'home';
  if (x >= c.islandStrip.x0 && x <= c.islandStrip.x1) return 'island';
  return null;
}

// Is x over water? The sea has no ground to land on.
export function isSea(x) {
  return x >= CONFIG.seaStart;
}

// --- decorative features, all placed once from the same seed ---------------

function buildFeatures() {
  const rng = mulberry32(20261126);
  const paddies = [];
  // Rice paddies on the flat lowland west of the river and east of town.
  for (let x = 900; x < 4000; x += 260 + rng() * 180) {
    paddies.push({ x, w: 150 + rng() * 140, shade: rng() });
  }
  for (let x = 8300; x < 9600; x += 280 + rng() * 160) {
    paddies.push({ x, w: 140 + rng() * 120, shade: rng() });
  }
  const houses = [];
  // A small fishing town on the rise around x = 5500–6300.
  for (let i = 0; i < 15; i++) {
    const x = 5500 + i * 52 + rng() * 24;
    houses.push({
      x,
      w: 26 + rng() * 14,
      h: 16 + rng() * 12,
      roof: ['#b3543f', '#8a4b3a', '#a8642f'][Math.floor(rng() * 3)],
      lit: rng() > 0.35,
    });
  }
  const trees = [];
  for (let x = 800; x < 10800; x += 120 + rng() * 260) {
    if (x > 4000 && x < 4400) continue; // keep the river clear
    if (x > 5450 && x < 6350) continue; // keep the town clear
    if (x > 9750 && x < 10450) continue; // keep the island airstrip clear
    trees.push({ x, size: 0.8 + rng() * 0.7 });
  }
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    clouds.push({
      x: rng() * CONFIG.worldWidth,
      y: 230 + rng() * 110,
      scale: 0.7 + rng() * 1.1,
      speed: 1.2 + rng() * 1.8,
    });
  }
  return { paddies, houses, trees, clouds };
}

export const FEATURES = buildFeatures();
