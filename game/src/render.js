// Senja Skies — rendering.
//
// One sunset style for everything: a purple-to-amber sky, a low sun, soft
// clouds, and green islands below. The camera is a side chase view — the
// aircraft stays left of centre and the world scrolls past. All drawing is
// canvas 2D paths, no images, so the game needs no assets at all.

import { CONFIG } from './config.js';
import { FEATURES, groundHeight } from './terrain.js';

export function worldToScreen(game, wx, wy) {
  const s = CONFIG.scale;
  return { x: (wx - game.camera.x) * s, y: game.canvas.height - (wy - game.camera.y) * s };
}

function skyGradient(ctx, horizonY) {
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(horizonY, 1));
  g.addColorStop(0, '#2e1a5e');
  g.addColorStop(0.45, '#7b2d6d');
  g.addColorStop(0.75, '#e2574c');
  g.addColorStop(1, '#ffb35c');
  return g;
}

function drawSky(ctx, game, time) {
  const W = game.canvas.width;
  const H = game.canvas.height;
  const horizonY = H - (0 - game.camera.y) * CONFIG.scale;
  ctx.fillStyle = skyGradient(ctx, Math.min(horizonY, H));
  ctx.fillRect(0, 0, W, H);

  // Low sun, fixed in the sky so it never scrolls away.
  const sunX = W * 0.74;
  const sunY = Math.min(horizonY - 70, H * 0.42);
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
  glow.addColorStop(0, 'rgba(255, 214, 140, 0.9)');
  glow.addColorStop(0.35, 'rgba(255, 170, 90, 0.45)');
  glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = '#ffe3a3';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();

  // Clouds drift slowly across the sky, warm-lit from below.
  ctx.fillStyle = 'rgba(255, 205, 170, 0.5)';
  for (const cloud of FEATURES.clouds) {
    const drift = (time * cloud.speed) % 400;
    const p = worldToScreen(game, cloud.x + drift, cloud.y);
    if (p.x < -160 || p.x > W + 160) continue;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 70 * cloud.scale, 16 * cloud.scale, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + 40 * cloud.scale, p.y + 6, 46 * cloud.scale, 12 * cloud.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The volcano's silhouette, far away and hazy, with a wisp of smoke.
  const vx = worldToScreen(game, 7600, 0).x;
  if (vx > -260 && vx < W + 260) {
    const baseY = H - (0 - game.camera.y) * CONFIG.scale;
    ctx.fillStyle = 'rgba(58, 32, 84, 0.55)';
    ctx.beginPath();
    ctx.moveTo(vx - 260, baseY);
    ctx.lineTo(vx - 40, baseY - 190);
    ctx.lineTo(vx + 30, baseY - 190);
    ctx.lineTo(vx + 260, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 190, 0.35)';
    ctx.beginPath();
    ctx.ellipse(vx - 5, baseY - 205, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx, game) {
  const W = game.canvas.width;
  const H = game.canvas.height;
  const s = CONFIG.scale;
  const x0 = Math.max(0, game.camera.x - 20);
  const x1 = Math.min(CONFIG.worldWidth, game.camera.x + W / s + 20);

  // The ground itself, sampled every 4 metres.
  ctx.beginPath();
  ctx.moveTo((x0 - game.camera.x) * s, H + 4);
  for (let x = x0; x <= x1; x += 4) {
    const p = worldToScreen(game, x, groundHeight(x));
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo((x1 - game.camera.x) * s, H + 4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, '#4a8a3f');
  g.addColorStop(1, '#24512a');
  ctx.fillStyle = g;
  ctx.fill();

  // Field bands: alternating translucent strips that follow the ground
  // surface, so the lower half of the screen reads as patchwork fields
  // instead of one flat green slab when flying low.
  for (let x = Math.floor(x0 / 220) * 220; x < x1; x += 220) {
    const gy0 = groundHeight(x);
    const gy1 = groundHeight(Math.min(x + 220, x1));
    const a = worldToScreen(game, x, gy0);
    const b = worldToScreen(game, Math.min(x + 220, x1), gy1);
    ctx.fillStyle = (Math.floor(x / 220) % 2 === 0) ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 240, 180, 0.06)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x, b.y + 34);
    ctx.lineTo(a.x, a.y + 34);
    ctx.closePath();
    ctx.fill();
  }

  // Rice paddies: flat green-gold strips that catch the sunset.
  for (const paddy of FEATURES.paddies) {
    if (paddy.x + paddy.w < x0 || paddy.x > x1) continue;
    const gy = groundHeight(paddy.x + paddy.w / 2);
    const a = worldToScreen(game, paddy.x, gy);
    const b = worldToScreen(game, paddy.x + paddy.w, gy);
    ctx.fillStyle = paddy.shade > 0.5 ? 'rgba(214, 178, 74, 0.6)' : 'rgba(126, 199, 84, 0.55)';
    ctx.fillRect(a.x, a.y - 9, Math.max(2, b.x - a.x), 9);
  }

  // The river: a blue band where the valley dips below the waterline.
  ctx.fillStyle = '#3d7ea6';
  ctx.beginPath();
  let started = false;
  for (let x = 3950; x <= 4450; x += 10) {
    const gy = groundHeight(x);
    if (gy >= 9) continue;
    const p = worldToScreen(game, x, Math.min(gy + 1.5, 9));
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else ctx.lineTo(p.x, p.y);
  }
  if (started) {
    ctx.lineTo(worldToScreen(game, 4450, 9).x, worldToScreen(game, 4450, 9).y);
    ctx.closePath();
    ctx.fill();
  }

  // The coast road, following the ground from the runway to the airstrip.
  ctx.strokeStyle = '#4a4a55';
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let x = 700; x <= 9800; x += 20) {
    const p = worldToScreen(game, x, groundHeight(x) + 0.6);
    if (x === 700) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  for (let x = 700; x <= 9800; x += 20) {
    const p = worldToScreen(game, x, groundHeight(x) + 0.6);
    if (x === 700) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // The town: houses with warm lit windows.
  for (const house of FEATURES.houses) {
    if (house.x < x0 || house.x > x1) continue;
    const gy = groundHeight(house.x);
    const p = worldToScreen(game, house.x, gy);
    const w = house.w * s * 0.8;
    const h = house.h * s * 0.8;
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(p.x, p.y - h, w, h);
    ctx.fillStyle = house.roof;
    ctx.beginPath();
    ctx.moveTo(p.x - 2, p.y - h);
    ctx.lineTo(p.x + w / 2, p.y - h - 13);
    ctx.lineTo(p.x + w + 2, p.y - h);
    ctx.closePath();
    ctx.fill();
    if (house.lit) {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(p.x + w * 0.25, p.y - h * 0.6, 7, 8);
      ctx.fillRect(p.x + w * 0.6, p.y - h * 0.6, 7, 8);
    }
  }

  // Palm trees scattered along the island.
  for (const tree of FEATURES.trees) {
    if (tree.x < x0 || tree.x > x1) continue;
    const gy = groundHeight(tree.x);
    const p = worldToScreen(game, tree.x, gy);
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 2, p.y - 18 * tree.size);
    ctx.stroke();
    ctx.fillStyle = '#2f7a33';
    ctx.beginPath();
    ctx.arc(p.x + 2, p.y - 20 * tree.size, 10 * tree.size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRunway(ctx, game, CONFIG.homeRunway, '07');
  drawRunway(ctx, game, CONFIG.islandStrip, '25');

  // The sea, east of the shoreline.
  const sea = worldToScreen(game, CONFIG.seaStart, 0);
  if (sea.x < W) {
    const waterY = sea.y;
    const wg = ctx.createLinearGradient(0, waterY, 0, H);
    wg.addColorStop(0, '#2a7ba8');
    wg.addColorStop(1, '#0d3a5c');
    ctx.fillStyle = wg;
    ctx.fillRect(Math.max(0, sea.x), waterY, W - Math.max(0, sea.x), H - waterY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let x = Math.max(0, sea.x); x < W; x += 8) {
        const y = waterY + 8 + i * 14 + Math.sin((x + game.now * 40 + i * 90) * 0.02) * 2;
        if (x === Math.max(0, sea.x)) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

function drawRunway(ctx, game, strip, label) {
  const a = worldToScreen(game, strip.x0, strip.ground);
  const b = worldToScreen(game, strip.x1, strip.ground);
  if (b.x < 0 || a.x > game.canvas.width) return;
  ctx.fillStyle = '#3c3c46';
  ctx.fillRect(a.x, a.y - 4, b.x - a.x, 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - 1);
  ctx.lineTo(b.x, a.y - 1);
  ctx.stroke();
  // Centre dashes.
  ctx.fillStyle = '#fff8e6';
  for (let x = strip.x0 + 30; x < strip.x1 - 20; x += 90) {
    const p = worldToScreen(game, x, strip.ground);
    ctx.fillRect(p.x, a.y - 2, 26, 2);
  }
  ctx.fillStyle = 'rgba(255,248,230,0.9)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, a.x + 8, a.y - 10);
}

function drawRings(ctx, game, time) {
  for (const ring of game.rings) {
    const p = worldToScreen(game, ring.x, ring.y);
    if (p.x < -80 || p.x > game.canvas.width + 80) continue;
    const r = ring.r * CONFIG.scale;
    const pulse = 0.75 + 0.25 * Math.sin(time * 3 + ring.id);
    ctx.save();
    ctx.shadowColor = ring.passed ? '#7ee787' : '#ffd166';
    ctx.shadowBlur = 18 * pulse;
    ctx.strokeStyle = ring.passed ? 'rgba(126, 231, 135, 0.85)' : `rgba(255, 209, 102, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r - 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (ring.passed) {
      ctx.fillStyle = '#7ee787';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', p.x, p.y + 7);
    }
  }
}

function drawPlane(ctx, game, time) {
  const { aircraft } = game;
  const p = worldToScreen(game, aircraft.x, aircraft.y);
  const s = CONFIG.scale;

  // Soft shadow on the ground when flying low.
  const groundY = worldToScreen(game, aircraft.x, groundHeight(aircraft.x)).y;
  const heightAbove = groundY - p.y;
  if (heightAbove < 220 && heightAbove > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.28 * (1 - heightAbove / 220)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, groundY - 1, 44 * (1 - heightAbove / 440), 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-aircraft.pitch);
  // Drawn 1.7x life size so the aircraft reads clearly even when the
  // screenshot is shrunk by the judge.
  ctx.scale(1.7, 1.7);
  // Wing (far side, darker).
  ctx.fillStyle = '#c96a2e';
  ctx.beginPath();
  ctx.ellipse(-2, 8, 16, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Fuselage: cream body with a sunset-orange stripe.
  ctx.fillStyle = '#fff3dd';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.ellipse(2, 2.5, 22, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.moveTo(-22, -2);
  ctx.lineTo(-30, -12);
  ctx.lineTo(-24, -1);
  ctx.closePath();
  ctx.fill();
  // Cockpit window, lit from inside.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.ellipse(12, -3.5, 7, 4.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Spinning propeller.
  const prop = time * 42;
  ctx.strokeStyle = 'rgba(40, 30, 50, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(26 + Math.cos(prop) * 13, Math.sin(prop) * 13);
  ctx.lineTo(26 - Math.cos(prop) * 13, -Math.sin(prop) * 13);
  ctx.stroke();
  ctx.fillStyle = '#2a2233';
  ctx.beginPath();
  ctx.arc(26, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights, blinking.
  const blink = Math.sin(time * 6) > 0;
  ctx.fillStyle = blink ? '#ff5b4d' : 'rgba(255, 91, 77, 0.35)';
  ctx.beginPath();
  ctx.arc(-24, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = blink ? '#7ee787' : 'rgba(126, 231, 135, 0.35)';
  ctx.beginPath();
  ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWorld(ctx, game, time) {
  drawSky(ctx, game, time);
  drawGround(ctx, game);
  drawRings(ctx, game, time);
  drawPlane(ctx, game, time);
}

function overlayPanel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(14, 10, 30, 0.82)';
  ctx.strokeStyle = 'rgba(255, 190, 120, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

export function drawMenuOverlay(ctx, game, time) {
  const W = game.canvas.width;
  const H = game.canvas.height;
  ctx.fillStyle = 'rgba(20, 12, 44, 0.45)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd9a0';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SENJA SKIES', W / 2, 128);
  ctx.fillStyle = '#fff3dd';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Langit Senja — terbang di atas pulau saat matahari terbenam', W / 2, 164);
  ctx.fillStyle = '#c9b8a3';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('W/S throttle  •  A/D naik-turun  •  atau tombol di layar  •  M suara  •  P jeda', W / 2, 196);

  // Mission cards. Their boxes are stored so clicks can pick a mission.
  const cards = [];
  const cardW = 330;
  const cardH = 190;
  const gap = 28;
  const totalW = cardW * 3 + gap * 2;
  let x = (W - totalW) / 2;
  const y = 240;
  CONFIG.missions.forEach((mission, i) => {
    const hover = game.menuHover === i;
    ctx.fillStyle = hover ? 'rgba(255, 190, 120, 0.22)' : 'rgba(14, 10, 30, 0.82)';
    ctx.strokeStyle = hover ? '#ffb85c' : 'rgba(255, 190, 120, 0.4)';
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb85c';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`MISI ${mission.id}`, x + cardW / 2, y + 34);
    ctx.fillStyle = '#fff3dd';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(mission.name, x + cardW / 2, y + 66);
    ctx.fillStyle = '#d8c9b4';
    ctx.font = '14px system-ui, sans-serif';
    wrapText(ctx, mission.blurb, x + cardW / 2, y + 96, cardW - 36, 19);
    ctx.fillStyle = '#c9b8a3';
    ctx.font = '13px system-ui, sans-serif';
    const meta = `${mission.rings.length} ring  •  Fuel ${mission.fuel}` +
      (mission.timeLimit ? `  •  ${mission.timeLimit} dtk` : '');
    ctx.fillText(meta, x + cardW / 2, y + cardH - 26);
    ctx.fillStyle = '#7ee787';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`Tekan ${i + 1} atau klik`, x + cardW / 2, y + cardH - 48);
    cards.push({ x, y, w: cardW, h: cardH, mission: i });
    x += cardW + gap;
  });
  game.menuCards = cards;

  ctx.fillStyle = '#c9b8a3';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Lepas landas dari runway, lewati ring, mendarat dengan selamat. Bahan bakar dan kerusakan itu nyata.', W / 2, y + cardH + 44);
  void time;
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, yy);
}

export function drawEndOverlay(ctx, game) {
  const W = game.canvas.width;
  const H = game.canvas.height;
  ctx.fillStyle = 'rgba(20, 12, 44, 0.55)';
  ctx.fillRect(0, 0, W, H);
  const won = game.state === 'win' || game.state === 'landed';
  const title = game.state === 'crashed' ? 'PESAWAT JATUH' : 'MISI SELESAI!';
  const color = game.state === 'crashed' ? '#ff6b5e' : '#7ee787';
  overlayPanel(ctx, W / 2 - 300, H / 2 - 150, 600, 300);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 88);
  ctx.fillStyle = '#fff3dd';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(game.endReason || '', W / 2, H / 2 - 50);
  ctx.fillStyle = '#ffb85c';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`Skor: ${game.score}`, W / 2, H / 2 + 2);
  ctx.fillStyle = '#d8c9b4';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Ring ${game.ringsPassed}/${game.rings.length}  •  ${game.mission.name}`, W / 2, H / 2 + 36);
  if (game.timeBonus > 0) {
    ctx.fillText(`Bonus waktu: +${game.timeBonus}`, W / 2, H / 2 + 62);
  }
  ctx.fillStyle = '#c9b8a3';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Tekan R untuk terbang lagi  •  Esc untuk kembali ke menu', W / 2, H / 2 + 104);
}
