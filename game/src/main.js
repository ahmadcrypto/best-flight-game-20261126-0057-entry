// Senja Skies — game loop and state machine.
//
// States: menu → flying → landed / win / crashed. The loop owns the clock,
// the camera, the score, the timer and the messages; the flight model,
// terrain, rings, instruments and renderer each own their own job. In
// screenshot mode (?shot=...) the clock is frozen so every frame is the
// same deterministic picture.

import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { groundHeight } from './terrain.js';
import { createAircraft, updateAircraft } from './aircraft.js';
import { createRings, checkRings, ringsPassed, allRingsPassed } from './rings.js';
import { drawHud, drawGauges } from './instruments.js';
import { drawWorld, drawMenuOverlay, drawEndOverlay, worldToScreen } from './render.js';
import { GameAudio } from './audio.js';
import { shotFromUrl, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export const game = {
  canvas,
  state: 'menu',
  missionIndex: 0,
  mission: CONFIG.missions[0],
  aircraft: null,
  rings: [],
  ringsPassed: 0,
  score: 0,
  timeLeft: 0,
  timeBonus: 0,
  messages: [],
  now: 0,
  camera: { x: 0, y: 0 },
  menuHover: -1,
  menuCards: [],
  endReason: '',
  paused: false,
  shot: shotFromUrl(),
};

const input = createInput();
const audio = new GameAudio();

function say(text, color) {
  game.messages.push({ text, color: color || '#fff3dd', at: game.now });
  if (game.messages.length > 3) game.messages.shift();
}

function startMission(index) {
  game.missionIndex = index;
  game.mission = CONFIG.missions[index];
  game.aircraft = createAircraft(game.mission);
  game.rings = createRings(game.mission);
  game.ringsPassed = 0;
  game.score = 0;
  game.timeLeft = game.mission.timeLimit;
  game.timeBonus = 0;
  game.messages = [];
  game.endReason = '';
  game.state = 'flying';
  game.paused = false;
  game.camera.x = 0;
  game.camera.y = 0;
  audio.ensure();
  say(`${game.mission.name} — gas penuh, lepas landas!`, '#ffb85c');
}

function endMission(won, reason) {
  // Guard: a touchdown and the grounded check in the same frame both
  // call finishIfDone — without this, the landing bonus was added twice
  // (the autopilot's first full flight scored 1000 instead of 750).
  if (game.state !== 'flying') return;
  game.state = won ? 'win' : 'crashed';
  game.endReason = reason;
  if (won) {
    game.score += 250;
    if (game.mission.timeLimit > 0 && game.timeLeft > 0) {
      game.timeBonus = Math.round(game.timeLeft) * 5;
      game.score += game.timeBonus;
    }
  }
}

function updateCamera(dt) {
  const ac = game.aircraft;
  if (!ac) return;
  const targetX = Math.max(0, Math.min(CONFIG.worldWidth - CONFIG.canvasWidth / CONFIG.scale, ac.x - CONFIG.lookAhead));
  // Keep the ground in view when low, the sky when high. The camera may
  // sit below ground level (down to -160 m) so that low flight fills the
  // lower half of the screen with terrain instead of a thin strip.
  const targetY = Math.max(-160, ac.y - 190);
  const k = Math.min(1, 4 * dt);
  game.camera.x += (targetX - game.camera.x) * k;
  game.camera.y += (targetY - game.camera.y) * k;
}

function update(dt) {
  const ac = game.aircraft;
  if (!ac) return;

  if (game.state !== 'flying') return;

  // Mission clock (mission 3 only).
  if (game.mission.timeLimit > 0) {
    game.timeLeft -= dt;
    if (game.timeLeft <= 0) {
      game.timeLeft = 0;
      if (game.ringsPassed < game.rings.length) {
        endMission(false, 'Waktu habis — rally tidak selesai.');
        audio.crash();
        return;
      }
    }
  }

  const snapshot = input.snapshot();
  const events = updateAircraft(ac, snapshot, dt, game.mission);
  for (const event of events) {
    if (event.type === 'takeoff') {
      say('Lepas landas! Cari ring berikutnya →', '#7ee787');
    } else if (event.type === 'touchdown') {
      audio.land();
      say('Mendarat mulus!', '#7ee787');
      finishIfDone(event.strip);
    } else if (event.type === 'hardLanding') {
      audio.land();
      say(`Mendarat keras! Kerusakan ${Math.round(ac.damage)}%`, '#ff6b5e');
      finishIfDone(event.strip);
    } else if (event.type === 'roughLanding') {
      audio.land();
      say(`Mendarat darurat di sawah. Kerusakan ${Math.round(ac.damage)}%`, '#ff6b5e');
      finishIfDone(null);
    } else if (event.type === 'fuelOut') {
      say('Bahan bakar habis! Meluncur...', '#ff6b5e');
    } else if (event.type === 'crash') {
      audio.crash();
      const reasons = {
        sea: 'Jatuh ke laut.',
        terrain: 'Menabrak tanah.',
        hardImpact: 'Benturan terlalu keras saat mendarat.',
        damage: 'Kerusakan sudah 100%.',
      };
      endMission(false, reasons[event.reason] || 'Pesawat jatuh.');
      return;
    }
  }

  // Rings.
  const hit = checkRings(game.rings, ac);
  for (const ring of hit) {
    game.ringsPassed = ringsPassed(game.rings);
    game.score += 100;
    audio.ring();
    say(`Ring ${ring.id + 1}! +100`, '#ffd166');
  }

  // Out of fuel and on the ground with the mission done is still a finish.
  if (ac.grounded && allRingsPassed(game.rings)) {
    finishIfDone(runwayAt(ac.x));
  }

  audio.setEngine(ac.throttle, !ac.grounded);
  updateCamera(dt);
}

function finishIfDone(strip) {
  const mission = game.mission;
  const ringsDone = allRingsPassed(game.rings);
  if (!ringsDone) return;
  if (mission.landAnywhereSafe) {
    endMission(true, strip ? `Mendarat di runway ${strip === 'home' ? 'asal' : 'pulau'}.` : 'Mendarat darurat, tapi misi selesai.');
  } else if (strip === 'island') {
    endMission(true, 'Paket sampai di airstrip pulau!');
  } else {
    say('Paket harus mendarat di airstrip pulau (timur). Terbang lagi!', '#ffb85c');
  }
}

function runwayAt(x) {
  if (x >= CONFIG.homeRunway.x0 && x <= CONFIG.homeRunway.x1) return 'home';
  if (x >= CONFIG.islandStrip.x0 && x <= CONFIG.islandStrip.x1) return 'island';
  return null;
}

function handleActions() {
  for (const action of input.drainActions()) {
    audio.ensure();
    if (action === 'mute') {
      const muted = audio.toggleMute();
      say(muted ? 'Suara mati' : 'Suara hidup');
      continue;
    }
    if (game.state === 'menu') {
      if (action === 'mission1') startMission(0);
      else if (action === 'mission2') startMission(1);
      else if (action === 'mission3') startMission(2);
      else if (action === 'confirm') startMission(game.missionIndex);
      continue;
    }
    if (action === 'restart') {
      startMission(game.missionIndex);
    } else if (action === 'pause') {
      if (game.state === 'flying') {
        game.paused = !game.paused;
        say(game.paused ? 'Jeda' : 'Lanjut terbang');
      }
    } else if (action === 'back') {
      game.state = 'menu';
      game.aircraft = null;
      audio.setEngine(0, false);
    }
  }
}

function handleMenuClick(event) {
  if (game.state !== 'menu') return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  for (const card of game.menuCards) {
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      audio.ensure();
      audio.click();
      startMission(card.mission);
      return;
    }
  }
}

function handleMenuHover(event) {
  if (game.state !== 'menu') return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  game.menuHover = -1;
  game.menuCards.forEach((card, i) => {
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      game.menuHover = i;
    }
  });
}

input.onCanvasClick(handleMenuClick);
canvas.addEventListener('mousemove', handleMenuHover);

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (game.state === 'menu') {
    // Parked on the home runway behind the menu, for a lively backdrop.
    // The camera sits a little low so runway 07 stays visible below the
    // menu cards instead of a hairline at the bottom edge.
    if (!game.aircraft) {
      game.aircraft = createAircraft(CONFIG.missions[0]);
      game.rings = createRings(CONFIG.missions[0]);
      game.camera.x = 0;
      game.camera.y = -60;
    }
    drawWorld(ctx, game, game.now);
    drawMenuOverlay(ctx, game, game.now);
    return;
  }
  drawWorld(ctx, game, game.now);
  drawHud(ctx, game);
  drawGauges(ctx, game);
  if (game.state === 'win' || game.state === 'crashed') {
    drawEndOverlay(ctx, game);
  }
  if (game.paused && game.state === 'flying') {
    ctx.fillStyle = 'rgba(20, 12, 44, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff3dd';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JEDA — tekan P untuk lanjut', canvas.width / 2, canvas.height / 2);
  }
}

let last = performance.now();

function frame(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleActions();
  if (game.shot) {
    // Screenshot mode: one frozen, deterministic frame.
    render();
    return;
  }
  if (!game.paused) {
    game.now += rawDt;
    update(rawDt);
  }
  render();
  requestAnimationFrame(frame);
}

// --- boot -------------------------------------------------------------------
if (game.shot) {
  document.body.classList.add('shot');
  game.now = 12.5;
  applyShot(game, game.shot, { startMission, say });
  last = performance.now();
  requestAnimationFrame(frame);
} else {
  requestAnimationFrame(frame);
}

// Test hook for the local playtest: window.__SENJA__.game
window.__SENJA__ = { game, startMission, CONFIG, groundHeight, worldToScreen };
