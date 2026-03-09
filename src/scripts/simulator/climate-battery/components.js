import * as THREE from 'three';
import { RISER_SOUTH_Z } from './underground.js';

const PIPE_R = 0.065;
const FAN_R = PIPE_R + 0.02;
const FAN_H = 0.1;
const FAN_Y = 0.3 + FAN_H / 2;

export function createComponents(scene) {
  const geometries = [];
  const materials = [];

  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, FAN_Y, RISER_SOUTH_Z);
  scene.add(fanGroup);

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a, metalness: 0.7, roughness: 0.3,
  });
  materials.push(housingMat);
  const housingGeo = new THREE.CylinderGeometry(FAN_R, FAN_R, FAN_H, 20, 1, true);
  geometries.push(housingGeo);
  const housing = new THREE.Mesh(housingGeo, housingMat);
  fanGroup.add(housing);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x555555, metalness: 0.8, roughness: 0.2,
  });
  materials.push(rimMat);
  const rimGeo = new THREE.TorusGeometry(FAN_R, 0.008, 8, 20);
  geometries.push(rimGeo);
  const topRim = new THREE.Mesh(rimGeo, rimMat);
  topRim.rotation.x = Math.PI / 2;
  topRim.position.y = FAN_H / 2;
  fanGroup.add(topRim);
  const botRim = topRim.clone();
  botRim.position.y = -FAN_H / 2;
  fanGroup.add(botRim);

  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x666666, metalness: 0.6, roughness: 0.3,
  });
  materials.push(hubMat);
  const hubGeo = new THREE.CylinderGeometry(0.015, 0.015, FAN_H * 0.6, 12);
  geometries.push(hubGeo);
  const hub = new THREE.Mesh(hubGeo, hubMat);
  fanGroup.add(hub);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x999999, metalness: 0.5, roughness: 0.4,
    side: THREE.DoubleSide,
  });
  materials.push(bladeMat);
  const fanBladesGroup = new THREE.Group();
  fanGroup.add(fanBladesGroup);
  const bladeLen = FAN_R - 0.02;
  const bladeGeo = new THREE.BoxGeometry(bladeLen, 0.005, 0.025);
  geometries.push(bladeGeo);
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.x = bladeLen / 2 + 0.01;
    blade.rotation.z = 0.3;
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.y = (i * Math.PI * 2) / 5;
    fanBladesGroup.add(pivot);
  }

  fanGroup.userData = { type: 'fan' };

  return {
    update(dt, fanOn) {
      if (fanOn) {
        fanBladesGroup.rotation.y += dt * 10;
      }
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      scene.remove(fanGroup);
    },
  };
}
