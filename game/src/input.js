export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_CONTINUE = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyE') actions |= ACTION_ENTER_CAR;
    if (e.code === 'KeyF') actions |= ACTION_PUNCH;
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  return {
    takeActions() {
      const current = actions;
      actions = 0;
      return current;
    },
    getControls() {
      let throttle = 0;
      let steering = 0;
      let brake = 0;
      let forward = 0;
      let turn = 0;

      if (keys.has('ArrowUp') || keys.has('KeyW')) { throttle = 1; forward = 1; }
      if (keys.has('ArrowDown') || keys.has('KeyS')) { brake = 1; forward = -1; }
      if (keys.has('ArrowLeft') || keys.has('KeyA')) { steering = 1; turn = 1; }
      if (keys.has('ArrowRight') || keys.has('KeyD')) { steering = -1; turn = -1; }

      return { throttle, steering, brake, forward, turn };
    }
  };
}
