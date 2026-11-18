import * as THREE from '../vendor/three.module.js';
import { CAR, PALETTE, WORLD_SIZE } from './config.js';
import { MISSIONS } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

export function createRenderer(canvas) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyTop);
  scene.fog = new THREE.FogExp2(PALETTE.skyTop, 0.0012);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 3000);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xff4b82, 1.3);
  sun.position.set(300, 500, 300);
  scene.add(sun);

  // Ground & Roads
  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings
  const buildingGroup = new THREE.Group();
  const bMat = new THREE.MeshStandardMaterial({ color: PALETTE.buildingBase, roughness: 0.7 });
  for (let x = -WORLD_SIZE / 2 + 100; x < WORLD_SIZE / 2 - 100; x += 160) {
    for (let z = -WORLD_SIZE / 2 + 100; z < WORLD_SIZE / 2 - 100; z += 160) {
      const h = 70 + Math.abs(Math.sin(x * z)) * 160;
      const geo = new THREE.BoxGeometry(110, h, 110);
      const bMesh = new THREE.Mesh(geo, bMat);
      bMesh.position.set(x, h / 2, z);
      buildingGroup.add(bMesh);
    }
  }
  scene.add(buildingGroup);

  // Player Meshes (Car & On Foot)
  const carGeo = new THREE.BoxGeometry(CAR.width, CAR.height, CAR.length);
  const carMat = new THREE.MeshStandardMaterial({ color: PALETTE.playerCar, metalness: 0.8, roughness: 0.2 });
  const playerCarMesh = new THREE.Mesh(carGeo, carMat);
  playerCarMesh.position.y = CAR.height / 2;
  scene.add(playerCarMesh);

  const footGeo = new THREE.CylinderGeometry(0.8, 0.8, 3, 8);
  const footMat = new THREE.MeshStandardMaterial({ color: PALETTE.neonCyan });
  const playerFootMesh = new THREE.Mesh(footGeo, footMat);
  playerFootMesh.position.y = 1.5;
  scene.add(playerFootMesh);

  // Traffic Meshes
  const trafficMat = new THREE.MeshStandardMaterial({ color: PALETTE.npcCar, metalness: 0.7, roughness: 0.3 });
  const trafficMeshes = [];

  // Police Meshes
  const copMat = new THREE.MeshStandardMaterial({ color: PALETTE.policeCar, metalness: 0.8, roughness: 0.2 });
  const policeMeshes = [];

  // Pedestrian Meshes
  const pedMat = new THREE.MeshStandardMaterial({ color: PALETTE.pedestrian });
  const pedestrianMeshes = [];

  // Collectibles Meshes
  const coinGeo = new THREE.CylinderGeometry(2, 2, 0.6, 16);
  const coinMat = new THREE.MeshStandardMaterial({ color: PALETTE.neonYellow, emissive: PALETTE.neonYellow, emissiveIntensity: 0.5 });
  const coinMeshes = [];

  // Mission Marker Mesh
  const markerGeo = new THREE.CylinderGeometry(8, 8, 40, 32);
  const markerMat = new THREE.MeshBasicMaterial({ color: PALETTE.neonCyan, transparent: true, opacity: 0.5 });
  const missionMarker = new THREE.Mesh(markerGeo, markerMat);
  missionMarker.position.y = 20;
  scene.add(missionMarker);

  // Minimap canvas setup
  const minimapCanvas = document.getElementById('minimap');
  const miniCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  return {
    draw(state, screen, best) {
      const p = state.player;

      // Visibility of player car vs foot
      playerCarMesh.visible = p.inCar;
      playerFootMesh.visible = !p.inCar;

      if (p.inCar) {
        playerCarMesh.position.set(p.x, CAR.height / 2, p.z);
        playerCarMesh.rotation.y = p.rotation;

        const camDist = 20;
        const camHeight = 8;
        camera.position.x = p.x - Math.sin(p.rotation) * camDist;
        camera.position.z = p.z - Math.cos(p.rotation) * camDist;
        camera.position.y = p.y + camHeight;
        camera.lookAt(p.x, p.y + 2, p.z);
      } else {
        playerFootMesh.position.set(p.x, 1.5, p.z);
        playerFootMesh.rotation.y = p.rotation;

        const camDist = 12;
        const camHeight = 5;
        camera.position.x = p.x - Math.sin(p.rotation) * camDist;
        camera.position.z = p.z - Math.cos(p.rotation) * camDist;
        camera.position.y = p.y + camHeight;
        camera.lookAt(p.x, p.y + 1.5, p.z);
      }

      // Mission target marker
      const m = MISSIONS[state.missionIndex] || MISSIONS[0];
      missionMarker.position.set(m.targetX, 20, m.targetZ);

      // Traffic
      while (trafficMeshes.length < state.traffic.length) {
        const mesh = new THREE.Mesh(carGeo, trafficMat);
        scene.add(mesh);
        trafficMeshes.push(mesh);
      }
      for (let i = 0; i < state.traffic.length; i++) {
        const cData = state.traffic[i];
        const cMesh = trafficMeshes[i];
        if (cMesh && cData) {
          cMesh.position.set(cData.x, CAR.height / 2, cData.z);
          cMesh.rotation.y = cData.rotation;
          cMesh.visible = cData.x !== 9999;
        }
      }

      // Police
      while (policeMeshes.length < state.police.length) {
        const mesh = new THREE.Mesh(carGeo, copMat);
        scene.add(mesh);
        policeMeshes.push(mesh);
      }
      for (let i = 0; i < state.police.length; i++) {
        const cData = state.police[i];
        const cMesh = policeMeshes[i];
        if (cMesh && cData) {
          cMesh.position.set(cData.x, CAR.height / 2, cData.z);
          cMesh.rotation.y = cData.rotation;
        }
      }

      // Pedestrians
      while (pedestrianMeshes.length < state.pedestrians.length) {
        const mesh = new THREE.Mesh(footGeo, pedMat);
        scene.add(mesh);
        pedestrianMeshes.push(mesh);
      }
      for (let i = 0; i < state.pedestrians.length; i++) {
        const pData = state.pedestrians[i];
        const pMesh = pedestrianMeshes[i];
        if (pMesh && pData) {
          pMesh.position.set(pData.x, 1.5, pData.z);
          pMesh.rotation.z = pData.knocked ? Math.PI / 2 : 0;
        }
      }

      // Collectibles
      while (coinMeshes.length < state.collectibles.length) {
        const coin = new THREE.Mesh(coinGeo, coinMat);
        scene.add(coin);
        coinMeshes.push(coin);
      }
      for (let i = 0; i < state.collectibles.length; i++) {
        const c = state.collectibles[i];
        const m = coinMeshes[i];
        if (m && c) {
          m.position.set(c.x, 1, c.z);
          m.visible = !c.collected;
          m.rotation.y += 0.03;
        }
      }

      renderer.render(scene, camera);

      // Render Minimap
      if (miniCtx) {
        miniCtx.fillStyle = '#100b2e';
        miniCtx.fillRect(0, 0, 160, 160);

        const scale = 160 / 1200;
        const cx = 80;
        const cy = 80;

        // Draw mission target on minimap
        miniCtx.fillStyle = '#00f0ff';
        const mx = cx + (m.targetX - p.x) * scale;
        const mz = cy + (m.targetZ - p.z) * scale;
        miniCtx.beginPath();
        miniCtx.arc(mx, mz, 5, 0, Math.PI * 2);
        miniCtx.fill();

        // Draw collectibles
        miniCtx.fillStyle = '#ffe600';
        for (const c of state.collectibles) {
          if (!c.collected) {
            const rx = cx + (c.x - p.x) * scale;
            const rz = cy + (c.z - p.z) * scale;
            if (rx >= 0 && rx <= 160 && rz >= 0 && rz <= 160) {
              miniCtx.fillRect(rx - 2, rz - 2, 4, 4);
            }
          }
        }

        // Draw police on minimap
        miniCtx.fillStyle = '#1e88e5';
        for (const cop of state.police) {
          const rx = cx + (cop.x - p.x) * scale;
          const rz = cy + (cop.z - p.z) * scale;
          if (rx >= 0 && rx <= 160 && rz >= 0 && rz <= 160) {
            miniCtx.fillRect(rx - 3, rz - 3, 6, 6);
          }
        }

        // Draw player on minimap
        miniCtx.fillStyle = '#ff007f';
        miniCtx.beginPath();
        miniCtx.arc(cx, cy, 6, 0, Math.PI * 2);
        miniCtx.fill();
      }
    }
  };
}
