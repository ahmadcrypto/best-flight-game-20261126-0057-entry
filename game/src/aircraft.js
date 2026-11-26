// Senja Skies — aircraft.
//
// A small arcade flight model with real trade-offs: throttle buys speed,
// speed buys lift, lift buys altitude, and fuel buys all of it. Fly too
// slow and the wing quits; fly too fast into the dirt and the airframe
// quits. The update returns events (takeoff, touchdown, damage, crash,
// fuel out) so the game loop can play sounds and show what happened.

import { CONFIG } from './config.js';
import { groundHeight, runwayAt, isSea } from './terrain.js';

const GEAR_HEIGHT = 1.2; // metres from the ground to the fuselage

export function createAircraft(mission) {
  const home = CONFIG.homeRunway;
  return {
    x: home.x0 + 60,
    y: home.ground + GEAR_HEIGHT,
    vx: 0,
    vy: 0,
    pitch: 0,
    throttle: 0,
    fuel: mission.fuel,
    damage: 0,
    grounded: true,
    airborne: false,
    engineOut: false,
    speed: 0,
  };
}

export function updateAircraft(ac, input, dt, mission) {
  const events = [];
  const c = CONFIG;

  // --- throttle -----------------------------------------------------------
  if (!ac.engineOut) {
    ac.throttle = Math.max(0, Math.min(1, ac.throttle + input.throttle * 0.7 * dt));
  } else {
    ac.throttle = Math.max(0, ac.throttle - 2 * dt);
  }

  // --- fuel ---------------------------------------------------------------
  if (ac.throttle > 0 && ac.fuel > 0) {
    ac.fuel = Math.max(0, ac.fuel - ac.throttle * c.fuelBurnFull * dt);
    if (ac.fuel <= 0 && !ac.engineOut) {
      ac.engineOut = true;
      events.push({ type: 'fuelOut' });
    }
  }

  // --- stick --------------------------------------------------------------
  ac.pitch += input.pitch * c.pitchRate * dt;
  ac.pitch = Math.max(c.pitchMin, Math.min(c.pitchMax, ac.pitch));
  // Hands off the stick, the nose eases back toward level.
  if (input.pitch === 0 && !ac.grounded) {
    ac.pitch *= Math.max(0, 1 - 0.35 * dt);
  }

  const speed = Math.hypot(ac.vx, ac.vy);
  ac.speed = speed;

  if (ac.grounded) {
    // Rolling: thrust pushes along the ground, friction holds it back.
    ac.vx += Math.cos(ac.pitch) * ac.throttle * c.thrustAccel * dt;
    ac.vx *= Math.max(0, 1 - 0.25 * dt);
    ac.vy = 0;
    ac.x += ac.vx * dt;
    // Lift-off needs speed and a nose-up attitude.
    if (speed > c.takeoffSpeed && ac.pitch > 0.08) {
      ac.grounded = false;
      ac.airborne = true;
      ac.vy = Math.sin(ac.pitch) * speed * 0.4;
      events.push({ type: 'takeoff' });
    }
  } else {
    // Flying: the engine pushes along the nose with real authority, so a
    // pilot who is slow and sinking can still pull out — the old model
    // drove thrust from the speed deficit, which left almost no climb
    // left at part throttle and made descents unrecoverable. Lift cancels
    // most of gravity when fast; quadratic drag caps the speed on its own.
    const thrust = ac.throttle * c.thrustAccel;
    ac.vx += Math.cos(ac.pitch) * thrust * dt;
    ac.vy += Math.sin(ac.pitch) * thrust * dt;
    const lift = Math.min(1, speed / 55);
    ac.vy -= c.gravity * (1 - c.liftFactor * lift) * dt;
    // Below stall speed the wing gives up and the nose drops.
    if (speed < c.stallSpeed) {
      ac.vy -= c.gravity * 0.35 * dt;
      ac.pitch = Math.max(c.pitchMin, ac.pitch - 0.25 * dt);
    }
    const dragK = c.dragQuadratic * speed;
    ac.vx -= ac.vx * dragK * dt;
    ac.vy -= ac.vy * dragK * dt;
    ac.x += ac.vx * dt;
    ac.y += ac.vy * dt;
  }

  // --- world edges ----------------------------------------------------------
  ac.x = Math.max(50, Math.min(c.worldWidth - 50, ac.x));
  if (ac.y > 380) {
    ac.y = 380;
    ac.vy = Math.min(0, ac.vy);
  }

  // --- ground contact -------------------------------------------------------
  // Only a descent can touch the ground: on the very frame the wheels
  // leave the runway vy is positive, and without this guard the take-off
  // itself counted as an instant touchdown (the plane never got airborne).
  const ground = groundHeight(ac.x);
  const strip = runwayAt(ac.x);
  const overSea = isSea(ac.x);
  if (!ac.grounded && ac.vy <= 0 && ac.y <= ground + GEAR_HEIGHT) {
    ac.y = ground + GEAR_HEIGHT;
    const vertical = Math.abs(ac.vy);
    const horizontal = Math.abs(ac.vx);
    if (overSea) {
      events.push({ type: 'crash', reason: 'sea' });
      return events;
    }
    if (strip) {
      if (vertical <= c.softTouchdown) {
        ac.grounded = true;
        ac.vy = 0;
        ac.pitch = 0;
        events.push({ type: 'touchdown', strip, vertical });
      } else if (vertical <= c.hardTouchdown) {
        ac.grounded = true;
        ac.vy = 0;
        ac.pitch = 0;
        ac.damage += 30;
        events.push({ type: 'hardLanding', strip, vertical, damage: ac.damage });
        if (ac.damage >= 100) events.push({ type: 'crash', reason: 'damage' });
      } else {
        events.push({ type: 'crash', reason: 'hardImpact' });
        return events;
      }
    } else if (horizontal <= c.dirtCrashSpeed && vertical <= c.softTouchdown) {
      // A gentle belly landing in a paddy field: survivable, but costly.
      ac.grounded = true;
      ac.vy = 0;
      ac.pitch = 0;
      ac.damage += 40;
      events.push({ type: 'roughLanding', vertical, damage: ac.damage });
      if (ac.damage >= 100) events.push({ type: 'crash', reason: 'damage' });
    } else {
      events.push({ type: 'crash', reason: 'terrain' });
      return events;
    }
  }
  if (ac.grounded) {
    ac.y = groundHeight(ac.x) + GEAR_HEIGHT;
  }
  return events;
}

// Heading in compass degrees, for the HUD. East is 090, west is 270;
// climbing and diving nudge it a few degrees either way.
export function headingDegrees(ac) {
  if (ac.vx >= 0) return 90 - (ac.pitch * 180) / Math.PI;
  return 270 + (ac.pitch * 180) / Math.PI;
}
