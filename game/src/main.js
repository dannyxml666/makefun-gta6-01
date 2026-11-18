import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, MISSIONS } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 100000);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const titleScreen = document.getElementById('title-screen');
const overScreen = document.getElementById('over-screen');
const cashDisplay = document.getElementById('cash-display');
const wantedDisplay = document.getElementById('wanted-display');
const healthDisplay = document.getElementById('health-display');
const missionTitle = document.getElementById('mission-title');
const missionDesc = document.getElementById('mission-desc');
const missionTimer = document.getElementById('mission-timer');
const startBtn = document.getElementById('start-btn');
const continueBtn = document.getElementById('continue-btn');
const restartBtn = document.getElementById('restart-btn');

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// Check save for Continue button
if (world.loadGame()) {
  continueBtn.classList.remove('hidden');
}

function runShot(name) {
  const scene = stageShot(name, world);
  titleScreen.classList.add('hidden');
  if (scene.screen === SCREEN_OVER) {
    overScreen.classList.remove('hidden');
  } else {
    overScreen.classList.add('hidden');
  }
  function paint() {
    renderer.draw(world.state, scene.screen, 0);
  }
  paint();
  paint();
  window.__shotReady = true;
}

if (shot) {
  runShot(shot);
} else {
  runGame();
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fromSave = false) {
    world.reset(fromSave);
    accumulator = 0;
    screen = SCREEN_PLAY;
    titleScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    announce('Game started. Vice Metropolis is open.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    overScreen.classList.remove('hidden');
    document.getElementById('over-title').textContent = world.state.gameWon ? 'Mission Accomplished!' : 'Busted / Wasted';
    document.getElementById('over-stats').textContent = `Final Cash: $${world.state.cash} | Completed Missions: ${world.state.completedMissions}`;
    announce('Game over.');
  }

  startBtn.addEventListener('click', () => startGame(false));
  continueBtn.addEventListener('click', () => startGame(true));
  restartBtn.addEventListener('click', () => startGame(false));

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { throttle: 0, steering: 0, brake: 0, forward: 0, turn: 0 }, 0, true);
      return;
    }
    const controls = input.getControls();
    const actions = input.takeActions();
    const events = world.step(STEP, controls, actions, false);

    // Update HUD
    cashDisplay.textContent = `$${world.state.cash}`;
    const stars = '★'.repeat(world.state.wanted) + '☆'.repeat(5 - world.state.wanted);
    wantedDisplay.textContent = stars;
    healthDisplay.textContent = `HEALTH ${Math.max(0, Math.round(world.state.health))}% | ARMOR ${world.state.armor}%`;

    const m = MISSIONS[world.missionIndex] || MISSIONS[MISSIONS.length - 1];
    missionTitle.textContent = m.title;
    missionDesc.textContent = m.desc;
    missionTimer.textContent = `Target Distance: ${Math.round(Math.hypot(world.state.player.x - m.targetX, world.state.player.z - m.targetZ))}m | Time: ${Math.max(0, Math.round(world.state.missionTimer))}s`;

    if (events & EVENT_OVER || world.state.gameWon) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;

    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
      }
    }

    renderer.draw(world.state, screen, 0);
  }

  announce('Vice Metropolis. Press Start to play.');
  requestAnimationFrame(frame);
}
