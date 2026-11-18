import { CAR, FOOT, SAVE_KEY, WORLD_SIZE } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_CASH = 4;
export const EVENT_MISSION = 8;

export const MISSIONS = [
  { id: 0, title: "Mission 1: Getaway Drive", desc: "Meet Fixer Marcus at downtown. Drive the getaway car to the dropzone in 60s.", targetX: 300, targetZ: 300, reward: 2000, type: "drive" },
  { id: 1, title: "Mission 2: Package Delivery", desc: "Collect the contraband package from the docks and deliver it safely.", targetX: -400, targetZ: 250, reward: 3500, type: "delivery" },
  { id: 2, title: "Mission 3: Police Escape", desc: "Shake off all pursuing police cruisers in Vice Metropolis and survive!", targetX: 0, targetZ: 0, reward: 5000, type: "escape" },
];

export function createWorld(random) {
  const state = {
    player: {
      x: 0,
      z: 0,
      y: 0,
      rotation: 0,
      speed: 0,
      inCar: true,
      health: 100,
      armor: 50,
      cash: 1666,
      wanted: 2,
    },
    missionIndex: 0,
    missionActive: false,
    missionTimer: 60,
    completedMissions: 0,
    traffic: [],
    police: [],
    pedestrians: [],
    collectibles: [],
    time: 0,
    gameOver: false,
    gameWon: false,
  };

  function saveGame() {
    try {
      const data = {
        cash: state.player.cash,
        wanted: state.player.wanted,
        completedMissions: state.completedMissions,
        missionIndex: state.missionIndex,
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {}
  }

  function loadGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        state.player.cash = data.cash ?? 1666;
        state.player.wanted = data.wanted ?? 2;
        state.completedMissions = data.completedMissions ?? 0;
        state.missionIndex = data.missionIndex ?? 0;
        return true;
      }
    } catch {}
    return false;
  }

  function reset(fromSave = false) {
    if (fromSave && loadGame()) {
      // loaded successfully
    } else {
      state.player.cash = 1666;
      state.player.wanted = 2;
      state.completedMissions = 0;
      state.missionIndex = 0;
    }

    state.player.x = 20;
    state.player.z = 20;
    state.player.y = 0;
    state.player.rotation = 0;
    state.player.speed = 0;
    state.player.inCar = true;
    state.player.health = 100;
    state.player.armor = 50;
    state.time = 0;
    state.gameOver = false;
    state.gameWon = false;
    state.missionActive = true;
    state.missionTimer = 60;

    // Traffic cars
    state.traffic = [];
    for (let i = 0; i < 24; i++) {
      state.traffic.push({
        x: (random() - 0.5) * 1400,
        z: (random() - 0.5) * 1400,
        rotation: random() * Math.PI * 2,
        speed: 25 + random() * 30,
        stealing: false,
      });
    }

    // Police cruisers
    state.police = [];
    for (let i = 0; i < 4; i++) {
      state.police.push({
        x: state.player.x + (random() - 0.5) * 200,
        z: state.player.z + (random() - 0.5) * 200,
        rotation: random() * Math.PI * 2,
        speed: 40,
      });
    }

    // Pedestrians on sidewalks
    state.pedestrians = [];
    for (let i = 0; i < 30; i++) {
      state.pedestrians.push({
        x: (random() - 0.5) * 1400,
        z: (random() - 0.5) * 1400,
        rotation: random() * Math.PI * 2,
        speed: 2 + random() * 2,
        knocked: false,
      });
    }

    // Cash pickups & mission markers
    state.collectibles = [];
    for (let i = 0; i < 15; i++) {
      state.collectibles.push({
        x: (random() - 0.5) * 1200,
        z: (random() - 0.5) * 1200,
        value: 500,
        collected: false,
      });
    }
  }

  function toggleCar(actions) {
    if (actions & 4) { // ACTION_ENTER_CAR (Key E)
      const p = state.player;
      if (p.inCar) {
        // Exit car
        p.inCar = false;
        p.speed = 0;
      } else {
        // Try to enter nearest traffic car
        for (const car of state.traffic) {
          const dx = p.x - car.x;
          const dz = p.z - car.z;
          if (Math.sqrt(dx * dx + dz * dz) < 8) {
            p.inCar = true;
            p.x = car.x;
            p.z = car.z;
            p.rotation = car.rotation;
            p.speed = 0;
            car.x = 9999; // remove traffic car
            state.player.wanted = Math.min(5, state.player.wanted + 1);
            break;
          }
        }
      }
    }
  }

  function punchPedestrian(actions) {
    if (actions & 8) { // ACTION_PUNCH (Key F)
      const p = state.player;
      if (!p.inCar) {
        for (const ped of state.pedestrians) {
          const dx = p.x - ped.x;
          const dz = p.z - ped.z;
          if (Math.sqrt(dx * dx + dz * dz) < 6) {
            ped.knocked = true;
            state.player.wanted = Math.min(5, state.player.wanted + 1);
            state.player.cash += 100;
          }
        }
      }
    }
  }

  function step(dt, controls, actions, autopilot = false) {
    if (state.gameOver || state.gameWon) return EVENT_OVER;

    toggleCar(actions);
    punchPedestrian(actions);

    state.time += dt;
    const p = state.player;

    if (state.missionActive) {
      state.missionTimer -= dt;
      const m = MISSIONS[state.missionIndex];
      const dx = p.x - m.targetX;
      const dz = p.z - m.targetZ;
      if (Math.sqrt(dx * dx + dz * dz) < 25 || (m.type === 'escape' && state.missionTimer <= 0)) {
        p.cash += m.reward;
        state.completedMissions++;
        state.missionIndex++;
        if (state.missionIndex >= MISSIONS.length) {
          state.gameWon = true;
        } else {
          state.missionTimer = 60;
        }
        saveGame();
      }
      if (state.missionTimer <= 0 && m.type !== 'escape') {
        state.missionTimer = 60; // reset timer on fail or retry
      }
    }

    if (p.inCar) {
      let throttle = controls.throttle;
      let steering = controls.steering;
      let brake = controls.brake;

      if (autopilot) {
        throttle = 0.8;
        steering = Math.sin(state.time * 2) * 0.7;
      }

      if (throttle > 0) {
        p.speed = Math.min(CAR.maxSpeed, p.speed + CAR.accel * dt);
      } else if (brake > 0) {
        p.speed = Math.max(-20, p.speed - CAR.brake * dt);
      } else {
        p.speed *= CAR.friction;
      }

      if (Math.abs(p.speed) > 1) {
        p.rotation += steering * CAR.turnSpeed * (p.speed / CAR.maxSpeed) * dt;
      }

      p.x += Math.sin(p.rotation) * p.speed * dt;
      p.z += Math.cos(p.rotation) * p.speed * dt;
    } else {
      // On foot movement
      let forward = controls.forward;
      let turn = controls.turn;
      if (forward !== 0) {
        p.rotation += turn * FOOT.turnSpeed * dt;
        p.x += Math.sin(p.rotation) * FOOT.speed * forward * dt;
        p.z += Math.cos(p.rotation) * FOOT.speed * forward * dt;
      }
    }

    // Bounds
    const limit = WORLD_SIZE / 2 - 50;
    if (p.x < -limit || p.x > limit || p.z < -limit || p.z > limit) {
      p.x = Math.max(-limit, Math.min(limit, p.x));
      p.z = Math.max(-limit, Math.min(limit, p.z));
      p.speed *= -0.5;
    }

    // Update traffic
    for (const car of state.traffic) {
      car.z += Math.cos(car.rotation) * car.speed * dt;
      car.x += Math.sin(car.rotation) * car.speed * dt;
      if (Math.abs(car.x) > limit || Math.abs(car.z) > limit) {
        car.rotation += Math.PI;
      }
    }

    // Update pedestrians
    for (const ped of state.pedestrians) {
      if (!ped.knocked) {
        ped.z += Math.cos(ped.rotation) * ped.speed * dt;
        ped.x += Math.sin(ped.rotation) * ped.speed * dt;
        if (Math.abs(ped.x) > limit || Math.abs(ped.z) > limit) {
          ped.rotation += Math.PI;
        }
      }
    }

    // Update police (chase player if wanted > 0)
    let events = EVENT_NONE;
    if (p.wanted > 0) {
      for (const cop of state.police) {
        const dx = p.x - cop.x;
        const dz = p.z - cop.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const targetRot = Math.atan2(dx, dz);
        cop.rotation += (targetRot - cop.rotation) * 3 * dt;
        cop.speed = 45;
        cop.x += Math.sin(cop.rotation) * cop.speed * dt;
        cop.z += Math.cos(cop.rotation) * cop.speed * dt;

        if (dist < 6) {
          p.health -= 20 * dt;
          events |= EVENT_HIT;
          if (p.health <= 0) {
            state.gameOver = true;
            events |= EVENT_OVER;
          }
        }
      }
    }

    // Collectibles
    for (const c of state.collectibles) {
      if (!c.collected) {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        if (Math.sqrt(dx * dx + dz * dz) < 6) {
          c.collected = true;
          p.cash += c.value;
          events |= EVENT_CASH;
          saveGame();
        }
      }
    }

    return events;
  }

  reset(false);

  return {
    state,
    reset,
    step,
    saveGame,
    loadGame,
  };
}
