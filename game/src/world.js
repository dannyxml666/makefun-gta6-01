// Vice Metropolis - World, City Layout, Traffic, Pedestrians, Police and Mission Markers

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.buildings = [];
    this.streetlights = [];
    this.trees = [];
    this.trafficCars = [];
    this.pedestrians = [];
    this.policeCars = [];
    this.missionMarker = null;
    this.generateCity();
  }

  random() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  generateCity() {
    // Generate building blocks on a grid
    const gridSize = 8;
    const spacing = 45;
    const offset = (gridSize * spacing) / 2;

    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        // Skip some for central plaza at center (3,3) to (4,4)
        if ((x === 3 || x === 4) && (z === 3 || z === 4)) continue;

        const bx = x * spacing - offset + spacing / 2;
        const bz = z * spacing - offset + spacing / 2;
        const width = 28 + this.random() * 8;
        const depth = 28 + this.random() * 8;
        const height = 15 + this.random() * 45;

        // Color variation (grays, brick reds, dark blues)
        const r = 0.2 + this.random() * 0.3;
        const g = 0.2 + this.random() * 0.3;
        const b = 0.3 + this.random() * 0.4;

        this.buildings.push({ x: bx, z: bz, width, height, depth, color: [r, g, b] });

        // Add streetlights near intersections
        this.streetlights.push({ x: bx - width / 2 - 4, z: bz - depth / 2 - 4 });
      }
    }

    // Add park and trees
    for (let i = 0; i < 15; i++) {
      this.trees.push({
        x: -70 + this.random() * 40,
        z: -70 + this.random() * 40,
        height: 6 + this.random() * 4,
      });
    }

    // Initialize traffic cars
    for (let i = 0; i < 12; i++) {
      this.trafficCars.push({
        x: (this.random() - 0.5) * 160,
        z: (this.random() - 0.5) * 160,
        speed: 4 + this.random() * 6,
        angle: this.random() * Math.PI * 2,
        color: [this.random(), this.random(), this.random()],
        stealthed: false,
      });
    }

    // Initialize pedestrians
    for (let i = 0; i < 20; i++) {
      this.pedestrians.push({
        x: (this.random() - 0.5) * 180,
        z: (this.random() - 0.5) * 180,
        speed: 1.0 + this.random() * 1.5,
        angle: this.random() * Math.PI * 2,
        health: 50,
        fleeing: false,
      });
    }

    // Initialize police cars
    for (let i = 0; i < 4; i++) {
      this.policeCars.push({
        x: 50 + i * 30,
        z: 50,
        speed: 0,
        angle: 0,
        active: false,
      });
    }
  }

  update(dt, player, wantedLevel) {
    // Update traffic
    for (const car of this.trafficCars) {
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.z += Math.sin(car.angle) * car.speed * dt;
      // Simple loop/turn bounds
      if (Math.abs(car.x) > 180 || Math.abs(car.z) > 180) {
        car.angle += Math.PI;
      }
    }

    // Update pedestrians
    for (const ped of this.pedestrians) {
      const spd = ped.fleeing ? ped.speed * 2.5 : ped.speed;
      ped.x += Math.cos(ped.angle) * spd * dt;
      ped.z += Math.sin(ped.angle) * spd * dt;
      if (Math.random() < 0.02) {
        ped.angle += (Math.random() - 0.5) * 2;
      }
    }

    // Update police cars based on wanted level
    for (let i = 0; i < this.policeCars.length; i++) {
      const pcar = this.policeCars[i];
      if (wantedLevel > 0 && i < wantedLevel * 2) {
        pcar.active = true;
        // Move towards player
        const dx = player.x - pcar.x;
        const dz = player.z - pcar.z;
        const targetAngle = Math.atan2(dz, dx);
        pcar.angle = targetAngle;
        pcar.speed = 12.0;
        pcar.x += Math.cos(pcar.angle) * pcar.speed * dt;
        pcar.z += Math.sin(pcar.angle) * pcar.speed * dt;
      } else {
        pcar.active = false;
        pcar.speed = 0;
      }
    }
  }
}
