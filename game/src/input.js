// Senja Skies — input.
//
// One reader for every way to fly: the keyboard and the on-screen buttons.
// Each frame main.js asks for a snapshot: how much throttle to add, which
// way the stick is pushed, and which edge-triggered actions fired since the
// last frame (menu keys, restart, pause, mute). Nothing here knows about
// the game state; it only reports what the pilot did.

const KEY_BINDINGS = {
  // Throttle: W / ArrowUp adds power, S / ArrowDown takes it away.
  throttleUp: ['KeyW', 'ArrowUp'],
  throttleDown: ['KeyS', 'ArrowDown'],
  // Stick: D / ArrowRight pulls the nose up, A / ArrowLeft pushes it down.
  climb: ['KeyD', 'ArrowRight'],
  descend: ['KeyA', 'ArrowLeft'],
};

// One-shot actions, reported once per key press.
const ACTION_KEYS = {
  Digit1: 'mission1',
  Digit2: 'mission2',
  Digit3: 'mission3',
  Enter: 'confirm',
  KeyR: 'restart',
  KeyP: 'pause',
  KeyM: 'mute',
  Escape: 'back',
};

export function createInput() {
  const keys = new Set();
  const buttons = { throttleUp: false, throttleDown: false, climb: false, descend: false };
  const actionQueue = [];

  const onKeyDown = (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    const action = ACTION_KEYS[event.code];
    if (action) actionQueue.push(action);
    // Keep the page from scrolling while the pilot flies.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  };
  const onKeyUp = (event) => keys.delete(event.code);
  // A hidden tab must never leave a key stuck down when the pilot returns.
  const onBlur = () => keys.clear();
  const onHidden = () => {
    if (document.hidden) keys.clear();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onHidden);

  // On-screen buttons: press and hold. They share the same flags as the keys.
  const bindButton = (id, name) => {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (event) => {
      event.preventDefault();
      buttons[name] = true;
      el.classList.add('held');
    };
    const up = () => {
      buttons[name] = false;
      el.classList.remove('held');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  };
  bindButton('btn-thr-up', 'throttleUp');
  bindButton('btn-thr-down', 'throttleDown');
  bindButton('btn-climb', 'climb');
  bindButton('btn-descend', 'descend');

  const held = (names) => names.some((code) => keys.has(code));

  return {
    // Snapshot for this frame. Values are -1, 0 or 1.
    snapshot() {
      return {
        throttle:
          (held(KEY_BINDINGS.throttleUp) || buttons.throttleUp ? 1 : 0) -
          (held(KEY_BINDINGS.throttleDown) || buttons.throttleDown ? 1 : 0),
        pitch:
          (held(KEY_BINDINGS.climb) || buttons.climb ? 1 : 0) -
          (held(KEY_BINDINGS.descend) || buttons.descend ? 1 : 0),
      };
    },
    // Drain the actions queued since the last call, in order.
    drainActions() {
      return actionQueue.splice(0, actionQueue.length);
    },
    // The menu also listens for clicks on the canvas; expose the hook.
    onCanvasClick(handler) {
      const canvas = document.getElementById('game');
      if (canvas) canvas.addEventListener('click', handler);
    },
  };
}
