// Senja Skies — screenshot poses.
//
// ?shot=start | play | end | rally freezes the game in one deterministic
// state so a screenshot is the same picture every time it is taken: the
// clock is fixed, the aircraft is placed by hand, and nothing random moves.
// These poses exist only for taking the entry's screenshots; the game
// itself never reads the query string.

import { CONFIG } from './config.js';
import { createAircraft } from './aircraft.js';
import { createRings } from './rings.js';

export function shotFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const shot = q.get('shot');
    return ['start', 'play', 'cover', 'end', 'rally'].includes(shot) ? shot : null;
  } catch {
    return null;
  }
}

function placeAircraft(game, x, y, speed, pitch, throttle, fuel) {
  const ac = game.aircraft;
  ac.x = x;
  ac.y = y;
  ac.vx = Math.cos(pitch) * speed;
  ac.vy = Math.sin(pitch) * speed;
  ac.pitch = pitch;
  ac.throttle = throttle;
  ac.fuel = fuel;
  ac.speed = speed;
  ac.grounded = false;
  ac.airborne = true;
  game.camera.x = Math.max(0, Math.min(CONFIG.worldWidth - CONFIG.canvasWidth / CONFIG.scale, x - CONFIG.lookAhead));
  // Same low-camera rule as the live game (main.js updateCamera): the
  // camera may sit below ground level so low flight fills the lower half
  // of the screen with terrain.
  game.camera.y = Math.max(-160, y - 190);
}

export function applyShot(game, shot, hooks) {
  const { startMission } = hooks;
  game.paused = false;
  game.messages = [];
  if (shot === 'start') {
    // Menu over the parked aircraft on the home runway.
    game.state = 'menu';
    game.missionIndex = 0;
    game.mission = CONFIG.missions[0];
    game.aircraft = createAircraft(game.mission);
    game.rings = createRings(game.mission);
    game.camera.x = 0;
    // Drop the camera so the home runway 07 sits visibly below the menu
    // cards instead of being a thin line at the very bottom edge.
    game.camera.y = -60;
    game.menuHover = 0;
    return;
  }

  if (shot === 'cover') {
    // The cover shot: low over the fishing town (x 5500-6300), ring 4
    // pulled in close ahead, HUD complete. Rings 1-3 already passed.
    startMission(0);
    for (let i = 0; i < 3; i++) game.rings[i].passed = true;
    game.ringsPassed = 3;
    game.score = 300;
    // Ring 4 normally sits at (5200, 185) — behind the aircraft here —
    // so move it ahead over the town for this pose only. x=5700 keeps
    // the whole hoop inside the 1280 px frame (at 5800 it was cut off
    // by the right edge).
    game.rings[3].x = 5700;
    game.rings[3].y = 100;
    placeAircraft(game, 5550, 58, 62, 0.08, 0.7, 74);
    game.messages = [{ text: 'Ring 3! +100', color: '#ffd166', at: game.now - 0.5 }];
    return;
  }

  if (shot === 'play') {
    // Mid-flight in mission 1, closing on ring 2, HUD complete.
    startMission(0);
    game.rings[0].passed = true;
    game.ringsPassed = 1;
    game.score = 100;
    placeAircraft(game, 2420, 150, 68, 0.12, 0.72, 82);
    game.messages = [{ text: 'Ring 1! +100', color: '#ffd166', at: game.now - 0.5 }];
    return;
  }

  if (shot === 'end') {
    // Mission 1 won: parked on the island strip, score on screen.
    startMission(0);
    game.rings.forEach((ring) => {
      ring.passed = true;
    });
    game.ringsPassed = game.rings.length;
    game.score = 500;
    const ac = game.aircraft;
    ac.x = 10100;
    ac.y = CONFIG.islandStrip.ground + 1.2;
    ac.vx = 0;
    ac.vy = 0;
    ac.pitch = 0;
    ac.throttle = 0;
    ac.fuel = 61;
    ac.speed = 0;
    ac.grounded = true;
    ac.airborne = false;
    game.camera.x = 10100 - CONFIG.lookAhead;
    // Same small drop as the menu pose: the island strip reads better
    // with ground under it instead of a hairline at the bottom edge.
    game.camera.y = -40;
    game.state = 'win';
    game.endReason = 'Mendarat di runway pulau.';
    game.messages = []; // the take-off cheer does not belong on a win screen
    game.score += 250;
    return;
  }

  if (shot === 'rally') {
    // Mission 3 against the clock: 5 of 8 rings, fuel getting low.
    startMission(2);
    for (let i = 0; i < 5; i++) game.rings[i].passed = true;
    game.ringsPassed = 5;
    game.score = 500;
    game.timeLeft = 47;
    placeAircraft(game, 6150, 165, 74, 0.08, 0.85, 18);
    game.messages = [{ text: 'Bahan bakar menipis!', color: '#ff6b5e', at: game.now - 0.5 }];
  }
}
