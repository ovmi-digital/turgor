import * as THREE from 'three';
import { GH, addBox } from '../greenhouse.js';
import { RISER_NORTH_Z } from './underground.js';

export function createComponents(scene, greenhouse) {
  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const wh = GH.wallH;
  const ph = GH.peakH;
  const RISER_X = 0;

  const fanGroup = new THREE.Group();
  fanGroup.position.set(RISER_X, 0.4, RISER_NORTH_Z);
  scene.add(fanGroup);
  const fanHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 })
  );
  fanGroup.add(fanHousing);
  const fanBladesGroup = new THREE.Group();
  fanGroup.add(fanBladesGroup);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.01, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 })
    );
    blade.position.x = 0.03;
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.y = (i * Math.PI) / 2;
    fanBladesGroup.add(pivot);
  }
  fanGroup.userData = { type: 'fan' };

  const solarMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.6, roughness: 0.3 });
  const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 1.2), solarMat);
  const solarY = (wh + ph) / 2 + 0.15;
  solarPanel.position.set(hw * 0.4, solarY, 0);
  solarPanel.rotation.z = -greenhouse.roofAngle;
  solarPanel.userData = { type: 'solar' };
  scene.add(solarPanel);

  const batteryMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
  const battery = addBox(scene, 0.25, 0.2, 0.15, batteryMat, hw - 0.2, 0.1, hl - 0.3);
  battery.userData = { type: 'battery' };

  const thermostatMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
  const thermostat = addBox(scene, 0.06, 0.06, 0.03, thermostatMat, RISER_X + 0.1, 0.35, RISER_NORTH_Z);
  thermostat.userData = { type: 'thermostat' };

  return {
    update(dt, fanOn) {
      if (fanOn) {
        fanBladesGroup.rotation.y += dt * 8;
      }
    },
    solarY,
  };
}
