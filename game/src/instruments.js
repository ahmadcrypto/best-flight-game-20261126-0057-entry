// Senja Skies — instruments.
//
// The HUD: altitude, speed and heading in a top bar, lit analogue gauges
// in the lower left, fuel and throttle bars, and the mission panel. The
// gauges are drawn, not images — warm backlight, glowing needles, glass
// highlights — so they read as instruments that are switched on.

import { headingDegrees } from './aircraft.js';
import { ringsPassed, ringDirection } from './rings.js';

const PANEL = 'rgba(12, 10, 28, 0.72)';
const PANEL_EDGE = 'rgba(255, 190, 120, 0.35)';
const AMBER = '#ffb85c';
const CREAM = '#fff3dd';
const DIM = '#c9b8a3';
const GREEN = '#7ee787';
const RED = '#ff6b5e';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function dial(ctx, cx, cy, r, label, value, max, unit, color) {
  // Warm backlit face.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  glow.addColorStop(0, 'rgba(255, 196, 110, 0.28)');
  glow.addColorStop(1, 'rgba(12, 10, 28, 0.85)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Ticks around the face.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const inner = r - (i % 5 === 0 ? 9 : 5);
    ctx.strokeStyle = i % 5 === 0 ? CREAM : DIM;
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  // Needle.
  const frac = Math.max(0, Math.min(1, value / max));
  const na = Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (r - 10), cy + Math.sin(na) * (r - 10));
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Label and digital readout, kept well inside the dial face: the old
  // layout put the value at 0.68r where long texts ("245 km/h") touched
  // the bottom edge of the circle. The font also shrinks if the text
  // would still be wider than the face.
  ctx.fillStyle = DIM;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r * 0.30);
  ctx.fillStyle = CREAM;
  const readout = `${Math.round(value)} ${unit}`;
  let readoutPx = 13;
  ctx.font = `bold ${readoutPx}px system-ui, sans-serif`;
  while (ctx.measureText(readout).width > r * 1.5 && readoutPx > 9) {
    readoutPx -= 1;
    ctx.font = `bold ${readoutPx}px system-ui, sans-serif`;
  }
  ctx.fillText(readout, cx, cy + r * 0.55);
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(4, w * frac), h, 4);
    ctx.fill();
  }
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6, y + h / 2 + 4);
}

export function drawHud(ctx, game) {
  const { aircraft, mission, rings, score, timeLeft, messages } = game;
  const W = ctx.canvas.width;

  // --- top bar: ALT / SPD / HDG -------------------------------------------
  panel(ctx, 16, 14, 340, 54);
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('ALT', 30, 32);
  ctx.fillText('SPD', 140, 32);
  ctx.fillText('HDG', 250, 32);
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${Math.max(0, Math.round(aircraft.y))} m`, 30, 56);
  ctx.fillText(`${Math.round(aircraft.speed * 3.6)} km/h`, 140, 56);
  ctx.fillText(`${String(Math.round(headingDegrees(aircraft))).padStart(3, '0')}°`, 250, 56);

  // --- compass strip --------------------------------------------------------
  const cx = W / 2;
  panel(ctx, cx - 150, 14, 300, 54);
  const hdg = headingDegrees(aircraft);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - 150, 14, 300, 54, 8);
  ctx.clip();
  ctx.fillStyle = DIM;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 15) {
    const deg = Math.round((hdg + d + 360) % 360);
    const x = cx + d * 2.2;
    const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}°`;
    ctx.fillText(label, x, d % 45 === 0 ? 34 : 40);
    ctx.strokeStyle = d % 45 === 0 ? CREAM : DIM;
    ctx.beginPath();
    ctx.moveTo(x, 48);
    ctx.lineTo(x, 56);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 20);
  ctx.lineTo(cx, 30);
  ctx.stroke();

  // --- mission panel ---------------------------------------------------------
  panel(ctx, W - 296, 14, 280, 54);
  ctx.textAlign = 'left';
  ctx.fillStyle = AMBER;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(mission.name, W - 282, 34);
  ctx.fillStyle = CREAM;
  ctx.font = '13px system-ui, sans-serif';
  const ringText = `Ring ${ringsPassed(rings)}/${rings.length}`;
  const timeText = timeLeft > 0 ? `  •  ${Math.ceil(timeLeft)} dtk` : '';
  ctx.fillText(`${ringText}${timeText}  •  Skor ${score}`, W - 282, 54);

  // --- fuel + throttle -------------------------------------------------------
  const fuelColor = aircraft.fuel < 20 ? RED : aircraft.fuel < 45 ? AMBER : GREEN;
  bar(ctx, 16, 76, 180, 18, aircraft.fuel / 100, fuelColor, `FUEL ${Math.round(aircraft.fuel)}`);
  bar(ctx, 204, 76, 152, 18, aircraft.throttle, AMBER, `THR ${Math.round(aircraft.throttle * 100)}%`);

  // --- next-ring pointer ------------------------------------------------------
  const dir = ringDirection(rings, aircraft);
  if (dir && game.state === 'flying') {
    const px = W - 60;
    const py = 120;
    const angle = Math.atan2(dir.dy, dir.dx);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = CREAM;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(dir.distance)} m`, px, py + 34);
  }

  // --- messages ----------------------------------------------------------------
  ctx.textAlign = 'center';
  messages.forEach((msg, i) => {
    const age = (game.now - msg.at) / 1000;
    if (age > 3) return;
    ctx.globalAlpha = Math.max(0, 1 - age / 3);
    ctx.fillStyle = msg.color || CREAM;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(msg.text, W / 2, 130 + i * 30);
    ctx.globalAlpha = 1;
  });
}

export function drawGauges(ctx, game) {
  const { aircraft } = game;
  dial(ctx, 78, ctx.canvas.height - 78, 56, 'ALTITUDE', Math.max(0, aircraft.y), 350, 'm', AMBER);
  dial(ctx, 198, ctx.canvas.height - 78, 56, 'AIRSPEED', aircraft.speed * 3.6, 360, 'km/h', GREEN);
  // Damage lamp: dark until the airframe is hurt, then it glows red.
  // Plain text, no symbol glyphs, so it renders in every canvas font.
  if (aircraft.damage > 0) {
    panel(ctx, 268, ctx.canvas.height - 108, 130, 30);
    ctx.fillStyle = RED;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`DAMAGE ${Math.round(aircraft.damage)}%`, 280, ctx.canvas.height - 88);
  }
}
