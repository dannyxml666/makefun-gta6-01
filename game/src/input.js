// Vice Metropolis - Keyboard Input Handling

export class InputManager {
  constructor() {
    this.keys = {};
    this.pressed = {};
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keys[code]) {
        this.pressed[code] = true;
      }
      this.keys[code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    const val = !!this.pressed[code];
    this.pressed[code] = false;
    return val;
  }

  clear() {
    this.pressed = {};
  }
}
