// Vice Metropolis - Main Game Loop and State Management

import { World } from './world.js';
import { Renderer } from './render.js';
import { InputManager } from './input.js';
import { initShshots } from './shots.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gl-canvas');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.renderer = new Renderer(this.canvas, this.minimapCanvas);
    this.input = new InputManager();
    this.world = new World();

    this.state = 'TITLE'; // TITLE, PLAYING, PAUSED, BUSTED, WASTED
    this.cash = 500;
    this.wantedLevel = 0;
    this.health = 100;
    this.armour = 100;
    this.mission = { active: false, title: 'None', time: 0, desc: '' };

    this.player = {
      x: 0,
      z: 0,
      y: 0,
      angle: 0,
      speed: 0,
      inCar: false,
      car: null,
    };

    this.camera = { x: 0, y: 15, z: -25, cx: 0, cy: 0, cz: 0 };

    this.setupUI();
    initShshots(this);

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  setupUI() {
    document.getElementById('new-game-btn').addEventListener('click', () => {
      document.getElementById('title-screen').style.display = 'none';
      this.state = 'PLAYING';
    });

    const continueBtn = document.getElementById('continue-btn');
    const saved = localStorage.getItem('vice_save');
    if (saved) {
      continueBtn.style.display = 'block';
      continueBtn.addEventListener('click', () => {
        this.loadGame();
        document.getElementById('title-screen').style.display = 'none';
        this.state = 'PLAYING';
      });
    }
  }

  setupStartScene() {
    this.player.x = 0;
    this.player.z = 0;
    this.state = 'PLAYING';
  }

  setupPlayScene() {
    this.player.x = 20;
    this.player.z = 20;
    this.player.inCar = true;
    this.wantedLevel = 1;
    this.mission = { active: true, title: 'Getaway Drive', time: 45, desc: 'Evade police and reach dropzone.' };
    this.state = 'PLAYING';
  }

  setupEndScene() {
    this.state = 'BUSTED';
    document.getElementById('busted-screen').style.display = 'flex';
    document.getElementById('final-cash').innerText = this.cash;
  }

  saveGame() {
    const data = { cash: this.cash, wantedLevel: this.wantedLevel, x: this.player.x, z: this.player.z };
    localStorage.setItem('vice_save', JSON.stringify(data));
  }

  loadGame() {
    const data = JSON.parse(localStorage.getItem('vice_save'));
    if (data) {
      this.cash = data.cash;
      this.wantedLevel = data.wantedLevel;
      this.player.x = data.x;
      this.player.z = data.z;
    }
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    if (this.input.wasPressed('KeyP')) {
      this.state = 'PAUSED';
      document.getElementById('pause-screen').style.display = 'flex';
      return;
    }

    // Player movement
    if (this.input.isDown('KeyW') || this.input.isDown('ArrowUp')) {
      this.player.speed = 5.0;
      this.player.x += Math.sin(this.player.angle) * this.player.speed * dt;
      this.player.z += Math.cos(this.player.angle) * this.player.speed * dt;
    } else if (this.input.isDown('KeyS') || this.input.isDown('ArrowDown')) {
      this.player.speed = -3.0;
      this.player.x += Math.sin(this.player.angle) * this.player.speed * dt;
      this.player.z += Math.cos(this.player.angle) * this.player.speed * dt;
    } else {
      this.player.speed = 0;
    }

    if (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft')) {
      this.player.angle += 2.5 * dt;
    }
    if (this.input.isDown('KeyD') || this.input.isDown('ArrowRight')) {
      this.player.angle -= 2.5 * dt;
    }

    // Camera follow
    this.camera.cx = this.player.x;
    this.camera.cy = this.player.y + 2;
    this.camera.cz = this.player.z;
    this.camera.x = this.player.x - Math.sin(this.player.angle) * 15;
    this.camera.y = this.player.y + 8;
    this.camera.z = this.player.z - Math.cos(this.player.angle) * 15;

    // Update world
    this.world.update(dt, this.player, this.wantedLevel);

    // Update HUD
    document.getElementById('cash-display').innerText = `$${this.cash}`;
    document.getElementById('wanted-display').innerText = '★'.repeat(this.wantedLevel) || '☆';
    document.getElementById('health-bar').style.width = `${this.health}%`;
    document.getElementById('armour-bar').style.width = `${this.armour}%`;
  }

  render() {
    this.renderer.render(this.world, this.player, this.camera);
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('load', () => {
  new Game();
});
