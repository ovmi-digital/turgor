import * as THREE from 'three';
import { addBox } from '../greenhouse.js';
import { RISER_NORTH_Z } from './underground.js';

export function createComponents(scene) {
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

  const thermostatMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
  const thermostat = addBox(scene, 0.06, 0.06, 0.03, thermostatMat, RISER_X + 0.1, 0.35, RISER_NORTH_Z);
  thermostat.userData = { type: 'thermostat' };

  return {
    update(dt, fanOn) {
      if (fanOn) {
        fanBladesGroup.rotation.y += dt * 8;
      }
    },
  };
}
