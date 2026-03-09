import * as THREE from 'three';
import { GH } from '../greenhouse.js';
import { PIPE_LAYERS, RISER_NORTH_Z, RISER_SOUTH_Z } from './underground.js';

const PIPE_XS = [-1.5, -0.5, 0.5, 1.5];
const PARTICLE_COUNT = 75;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

export function createParticles(scene) {
  const hl = GH.l / 2;

  const paths = [];
  for (const layerY of PIPE_LAYERS) {
    for (const px of PIPE_XS) {
      paths.push(new THREE.CatmullRomCurve3([
        v(px * 0.4, 2.2, -0.5),
        v(px * 0.2, 2.5, 0.5),
        v(0.1, 1.8, 1.5),
        v(0, 0.5, RISER_NORTH_Z),
        v(0, 0.0, RISER_NORTH_Z),
        v(0, layerY + 0.2, RISER_NORTH_Z),
        v(px * 0.5, layerY, RISER_NORTH_Z - 0.5),
        v(px, layerY, hl * 0.5),
        v(px, layerY, 0),
        v(px, layerY, -hl * 0.5),
        v(px * 0.5, layerY, RISER_SOUTH_Z + 0.5),
        v(0, layerY + 0.2, RISER_SOUTH_Z),
        v(0, 0.0, RISER_SOUTH_Z),
        v(0, 0.5, RISER_SOUTH_Z),
        v(px * 0.3, 1.2, -1.5),
        v(px * 0.5, 1.8, -0.8),
      ], true));
    }
  }

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const progress = new Float32Array(PARTICLE_COUNT);
  const pathIndex = new Uint8Array(PARTICLE_COUNT);
  const speeds = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    progress[i] = Math.random();
    pathIndex[i] = Math.floor(Math.random() * paths.length);
    speeds[i] = 0.15 + Math.random() * 0.1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const warmColor = new THREE.Color(0xF59E0B);
  const coolColor = new THREE.Color(0x3B82F6);
  const tempColor = new THREE.Color();

  return {
    dispose() {
      geo.dispose();
      mat.dispose();
      scene.remove(points);
    },
    update(dt, isDay, fanOn) {
      const direction = isDay ? 1 : -1;
      const speed = fanOn ? 1.0 : 0.4;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        progress[i] += direction * speeds[i] * speed * dt;
        if (progress[i] > 1) progress[i] -= 1;
        if (progress[i] < 0) progress[i] += 1;

        const path = paths[pathIndex[i]];
        const point = path.getPointAt(progress[i]);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        const prog = progress[i];
        let colorMix;
        if (isDay) {
          colorMix = prog < 0.3 ? 1 - prog / 0.3 : prog > 0.7 ? (prog - 0.7) / 0.3 : 0;
        } else {
          colorMix = prog > 0.3 && prog < 0.7
            ? (prog - 0.3) / 0.4
            : prog <= 0.3 ? 0 : 1 - (prog - 0.7) / 0.3;
        }
        tempColor.copy(coolColor).lerp(warmColor, Math.max(0, Math.min(1, colorMix)));
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
