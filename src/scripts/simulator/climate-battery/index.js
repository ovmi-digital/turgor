import * as THREE from 'three';
import { createCore } from '../core.js';
import { createEnvironment } from '../environment.js';
import { createGreenhouse, GH } from '../greenhouse.js';
import { createLabels } from '../labels.js';
import { createUnderground, RISER_NORTH_Z, RISER_SOUTH_Z } from './underground.js';
import { createComponents } from './components.js';
import { createParticles } from './particles.js';
import { createTemperatureModel } from './temperature.js';

export function init(canvasEl, viewport) {
  const core = createCore(canvasEl, viewport);
  const env = createEnvironment(core.scene);
  const gh = createGreenhouse(core.scene);
  const underground = createUnderground(core.scene);
  const components = createComponents(core.scene, gh);
  const particles = createParticles(core.scene);
  const temp = createTemperatureModel();

  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const RISER_X = 0;

  // Add riser caps to scene (above ground)
  for (const cap of underground.riserCaps) {
    const mesh = cap.mesh;
    mesh.position.set(...cap.pos);
    core.scene.add(mesh);
  }

  // Labels
  const labelsContainer = document.getElementById('labels-container');
  const labels = createLabels(viewport, core.camera, labelsContainer);
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  labels.add([
    { text: 'Riser A (Fan)', pos: v(RISER_X, 0.65, RISER_NORTH_Z), detail: 'detail-fan' },
    { text: 'Riser B', pos: v(RISER_X, 0.65, RISER_SOUTH_Z), detail: 'detail-risers' },
    { text: 'Solar Panel', pos: v(hw * 0.4, components.solarY + 0.2, 0), detail: 'detail-solar' },
    { text: 'Battery', pos: v(hw - 0.2, 0.35, hl - 0.3), detail: 'detail-battery' },
    { text: 'Thermostat', pos: v(RISER_X + 0.1, 0.55, RISER_NORTH_Z), detail: 'detail-thermostat' },
    { text: 'Manifold N', pos: v(0, -0.65, hl - 0.35), detail: 'detail-manifold' },
    { text: 'Manifold S', pos: v(0, -0.65, -hl + 0.35), detail: 'detail-manifold' },
    { text: 'Pipe Layer 1', pos: v(-0.5, -0.8, 0), detail: 'detail-pipes' },
    { text: 'Pipe Layer 2', pos: v(0.5, -1.2, 0), detail: 'detail-pipes' },
  ]);

  // State
  let isDay = true;
  let timeMinutes = 720;

  // Raycasting
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredObject = null;

  canvasEl.addEventListener('pointermove', (e) => {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, core.camera);
    const meshes = [];
    core.scene.traverse((obj) => { if (obj.isMesh && obj.userData.type) meshes.push(obj); });
    const intersects = raycaster.intersectObjects(meshes);
    hoveredObject = null;
    canvasEl.style.cursor = 'grab';
    if (intersects.length > 0) {
      hoveredObject = intersects[0].object;
      canvasEl.style.cursor = 'pointer';
    }
  });

  canvasEl.addEventListener('click', () => {
    if (!hoveredObject || !hoveredObject.userData.type) return;
    const typeMap = {
      pipe: 'detail-pipes', manifold: 'detail-manifold', fan: 'detail-fan',
      solar: 'detail-solar', battery: 'detail-battery',
      thermostat: 'detail-thermostat', riser: 'detail-risers',
    };
    const detailId = typeMap[hoveredObject.userData.type];
    if (detailId) {
      const detail = document.getElementById(detailId);
      if (detail) {
        detail.open = true;
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  // Animation tick
  core.onTick((dt) => {
    const temps = temp.getTemps(timeMinutes);
    env.update(dt);
    components.update(dt, temps.fanOn);
    particles.update(dt, isDay, temps.fanOn);
    labels.update();

    const soilHeat = (temps.soil - 10) / 15;
    underground.soilGlow.intensity = Math.max(0, soilHeat) * 1.5;
  });

  // Initial UI
  temp.updateUI(timeMinutes);

  // Start rendering
  core.start();

  return {
    setMode(day) {
      isDay = day;
      env.setDayNight(day);
      timeMinutes = day ? 720 : 1320;
      temp.updateUI(timeMinutes);
      return timeMinutes;
    },
    setTime(minutes) {
      timeMinutes = minutes;
      const isSunUp = minutes >= 360 && minutes <= 1080;
      if (isSunUp !== isDay) {
        isDay = isSunUp;
        env.setDayNight(isSunUp);
      }
      temp.updateUI(minutes);
    },
    getTime() { return timeMinutes; },
    getIsDay() { return isDay; },
    toggleCutaway() { return underground.toggleCutaway(); },
    toggleLabels() { return labels.toggle(); },
    resetCamera() { core.resetCamera(); },
  };
}
