import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export function stageShot(name, world) {
  world.reset(false);
  if (name === 'play') {
    for (let i = 0; i < 60; i++) {
      world.step(STEP, { throttle: 1, steering: 0.2, brake: 0, forward: 0, turn: 0 }, 0, false);
    }
    return { screen: SCREEN_PLAY, best: 2500 };
  }
  if (name === 'end') {
    for (let i = 0; i < 60; i++) {
      world.step(STEP, { throttle: 0, steering: 0, brake: 1, forward: 0, turn: 0 }, 0, false);
    }
    world.state.gameOver = true;
    return { screen: SCREEN_OVER, best: 2500 };
  }
  return { screen: SCREEN_TITLE, best: 2500 };
}
