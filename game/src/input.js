// input.js — keyboard and mouse state for the arena.
//
// The game polls this module once a frame instead of reacting to events
// directly, which keeps the controls identical whether the player holds
// a key for a second or taps it: movement is a held direction, firing is
// a held button, and one-shot actions (dash, pause, confirm) read the
// edge-triggered `pressed` set that clearFrame() resets after each use.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    const code = codeOf(event);
    if (!held.has(code)) pressed.add(code);
    held.add(code);
    if (code.startsWith('Arrow') || code === 'Space') event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    held.delete(codeOf(event));
  });

  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });

  function toArena(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (event.clientX - rect.left) * scaleX;
    mouse.y = (event.clientY - rect.top) * scaleY;
  }

  canvas.addEventListener('mousemove', toArena);
  canvas.addEventListener('mousedown', (event) => {
    toArena(event);
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  return {
    mouse,
    /** The held movement direction as a unit-ish vector (not normalised). */
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      return { x, y };
    },
    firing() {
      return mouse.down || held.has('Space');
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    /** Call once at the end of every frame. */
    clearFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
