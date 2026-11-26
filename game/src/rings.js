// Senja Skies — rings and mission progress.
//
// A ring is a glowing hoop in the sky. Fly through its centre and it is
// yours: points, a chime, and one step closer to the mission goal. Rings
// are placed by the mission in config.js; this file only owns their state
// and the pass check.

import { CONFIG } from './config.js';

export const RING_RADIUS = 26; // metres, generous enough to feel fair

export function createRings(mission) {
  return mission.rings.map((ring, i) => ({
    id: i,
    x: ring.x,
    y: ring.y,
    r: RING_RADIUS,
    passed: false,
  }));
}

// Returns the rings the aircraft flew through this frame.
export function checkRings(rings, aircraft) {
  const hit = [];
  for (const ring of rings) {
    if (ring.passed) continue;
    const dx = aircraft.x - ring.x;
    const dy = aircraft.y - ring.y;
    if (Math.hypot(dx, dy) < ring.r) {
      ring.passed = true;
      hit.push(ring);
    }
  }
  return hit;
}

export function ringsPassed(rings) {
  return rings.filter((ring) => ring.passed).length;
}

export function allRingsPassed(rings) {
  return rings.length > 0 && rings.every((ring) => ring.passed);
}

export function nextRing(rings) {
  return rings.find((ring) => !ring.passed) ?? null;
}

// The arrow on the HUD points at this ring.
export function ringDirection(rings, aircraft) {
  const target = nextRing(rings);
  if (!target) return null;
  return {
    dx: target.x - aircraft.x,
    dy: target.y - aircraft.y,
    distance: Math.hypot(target.x - aircraft.x, target.y - aircraft.y),
  };
}

export function ringScore() {
  return CONFIG.ringPoints;
}
