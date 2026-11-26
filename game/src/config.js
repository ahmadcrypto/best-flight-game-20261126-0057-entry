// Senja Skies — tuning constants.
//
// One place for every number the flight model, the missions and the renderer
// agree on, so balancing the game is a one-line edit instead of a hunt
// through the code. All distances are metres, all speeds metres per second,
// all angles radians unless a name says degrees.

export const CONFIG = {
  canvasWidth: 1280,
  canvasHeight: 720,
  // Pixels per metre, the same on both axes so the world never stretches.
  scale: 2,
  // The island chain the game flies over, end to end.
  worldWidth: 12000,

  // --- aircraft -----------------------------------------------------------
  // Top speed is emergent: full throttle (16 m/s^2 of thrust) against
  // quadratic drag settles near 100 m/s in level flight.
  takeoffSpeed: 40, // wheels leave the runway above this
  stallSpeed: 30, // below this the wing stops lifting and the nose drops
  thrustAccel: 16, // how hard the engine pushes along the nose
  pitchRate: 0.65, // radians per second at full stick
  pitchMin: -0.5, // steepest dive the stick allows
  pitchMax: 0.55, // steepest climb the stick allows
  gravity: 9.8,
  // How much of gravity lift cancels at full flying speed.
  liftFactor: 0.85,
  // Quadratic drag: drag deceleration = dragQuadratic * speed * velocity,
  // so it grows with speed and caps the top speed on its own.
  dragQuadratic: 0.0016,
  fuelCapacity: 100,
  // Fuel units burned per second at full throttle. At 0.35, mission 3's
  // 55 units last a full 150 s rally at ~0.8 throttle with a little spare
  // for throttle discipline — at the old 0.55 it was unwinnable on fuel.
  fuelBurnFull: 0.35,
  // A touchdown softer than this vertical speed is a landing.
  softTouchdown: 6,
  // Between softTouchdown and this the gear takes damage instead.
  hardTouchdown: 9,
  // Touching dirt (not a runway) faster than this is a crash.
  dirtCrashSpeed: 20,

  // --- runways ------------------------------------------------------------
  // Home runway, where every sortie starts.
  homeRunway: { x0: 100, x1: 700, ground: 18 },
  // Island airstrip, the delivery target of mission 2.
  islandStrip: { x0: 9800, x1: 10400, ground: 26 },
  // Where the sea starts; past it there is nothing to land on.
  seaStart: 11200,

  // --- camera -------------------------------------------------------------
  // How far ahead of the nose the camera looks, in metres.
  lookAhead: 380,

  // --- missions -----------------------------------------------------------
  missions: [
    {
      id: 1,
      name: 'Penerbangan Perdana',
      blurb: 'Lepas landas, lewati 5 ring, lalu mendarat dengan selamat.',
      fuel: 100,
      timeLimit: 0, // 0 = no clock
      rings: [
        { x: 1500, y: 120 },
        { x: 2600, y: 165 },
        { x: 3800, y: 115 },
        { x: 5200, y: 185 },
        { x: 6800, y: 145 },
      ],
      landAnywhereSafe: true,
    },
    {
      id: 2,
      name: 'Antar Paket Pulau',
      blurb: 'Bawa paket ke airstrip pulau di ujung timur. Mendarat di strip.',
      fuel: 100,
      timeLimit: 0,
      rings: [
        { x: 1800, y: 130 },
        { x: 4200, y: 155 },
        { x: 7000, y: 175 },
      ],
      landAnywhereSafe: false,
    },
    {
      id: 3,
      name: 'Rally Senja',
      blurb: '8 ring melawan waktu. Bahan bakar terbatas — hemat throttle!',
      fuel: 55,
      timeLimit: 150,
      rings: [
        { x: 1200, y: 125 },
        { x: 2400, y: 170 },
        { x: 3600, y: 120 },
        { x: 4800, y: 180 },
        { x: 6000, y: 135 },
        { x: 7300, y: 175 },
        { x: 8600, y: 140 },
        { x: 9900, y: 165 },
      ],
      landAnywhereSafe: true,
    },
  ],

  // --- scoring ------------------------------------------------------------
  ringPoints: 100,
  landingPoints: 250,
  // Mission 3: points per second left on the clock.
  timeBonusPerSecond: 5,
};
