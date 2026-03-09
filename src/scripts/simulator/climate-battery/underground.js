import * as THREE from 'three';
import { GH, addBox } from '../greenhouse.js';

const PIPE_RADIUS = 0.055;
const PIPE_XS = [-1.5, -0.5, 0.5, 1.5];
export const PIPE_LAYERS = [-0.8, -1.2];
const RISER_X = 0;
export const RISER_NORTH_Z = 2.0;
export const RISER_SOUTH_Z = -2.0;

export function createUnderground(scene, { floors = [] } = {}) {
  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const EPS = 0.003;

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.85 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const deepSoilMat = new THREE.MeshStandardMaterial({ color: 0x4a2f15, roughness: 0.95 });
  const drainGravelMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.85 });
  const plywoodMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, roughness: 0.7 });
  const pvcMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 });

  const undergroundGroup = new THREE.Group();
  scene.add(undergroundGroup);
  const solidCover = new THREE.Group();
  scene.add(solidCover);

  function addCutawaySoil(group, yTop, yBot, material) {
    const thickness = (yTop - yBot) - EPS;
    const yCenter = (yTop + yBot) / 2;
    addBox(group, hw + EPS, thickness, GH.l, material, hw / 2, yCenter, 0);
    addBox(group, hw, thickness, hl, material, -hw / 2, yCenter, hl / 2);
  }

  const layers = [
    [0, -0.20, gravelMat],
    [-0.20, -0.65, soilMat],
    [-0.65, -0.95, soilMat],
    [-0.95, -1.05, soilMat],
    [-1.05, -1.35, deepSoilMat],
    [-1.35, -1.50, drainGravelMat],
    [-1.50, -1.80, deepSoilMat],
  ];
  for (const [top, bot, mat] of layers) {
    addCutawaySoil(undergroundGroup, top, bot, mat);
    const thickness = (top - bot) - EPS;
    const yCenter = (top + bot) / 2;
    addBox(solidCover, GH.w, thickness, GH.l, mat, 0, yCenter, 0);
  }

  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a1a, roughness: 0.9, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const crossFront = new THREE.Mesh(new THREE.PlaneGeometry(hw, 1.80), crossMat);
  crossFront.position.set(-hw / 2, -0.9, -EPS);
  undergroundGroup.add(crossFront);
  const crossSide = new THREE.Mesh(new THREE.PlaneGeometry(hl, 1.80), crossMat);
  crossSide.position.set(-EPS, -0.9, -hl / 2);
  crossSide.rotation.y = Math.PI / 2;
  undergroundGroup.add(crossSide);

  for (const layerY of PIPE_LAYERS) {
    for (const px of PIPE_XS) {
      const pipeGeo = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, GH.l - 0.4, 12);
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(px, layerY, 0);
      pipe.userData = { type: 'pipe' };
      undergroundGroup.add(pipe);
    }
  }

  const manifoldN = addBox(undergroundGroup, 0.6, 0.3, 0.4, plywoodMat, 0, -0.95, hl - 0.35);
  manifoldN.userData = { type: 'manifold' };
  const manifoldS = addBox(undergroundGroup, 0.6, 0.3, 0.4, plywoodMat, 0, -0.95, -hl + 0.35);
  manifoldS.userData = { type: 'manifold' };

  const riserGeo = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, 1.2, 12);
  const riserA = new THREE.Mesh(riserGeo, pvcMat);
  riserA.position.set(RISER_X, -0.35, RISER_NORTH_Z);
  riserA.userData = { type: 'riser' };
  undergroundGroup.add(riserA);
  const riserB = new THREE.Mesh(riserGeo.clone(), pvcMat);
  riserB.position.set(RISER_X, -0.35, RISER_SOUTH_Z);
  riserB.userData = { type: 'riser' };
  undergroundGroup.add(riserB);

  const riserCapGeo = new THREE.CylinderGeometry(PIPE_RADIUS + 0.01, PIPE_RADIUS + 0.01, 0.3, 12);
  const riserCaps = [
    { mesh: new THREE.Mesh(riserCapGeo, pvcMat), pos: [RISER_X, 0.15, RISER_NORTH_Z] },
    { mesh: new THREE.Mesh(riserCapGeo.clone(), pvcMat), pos: [RISER_X, 0.15, RISER_SOUTH_Z] },
  ];

  const soilGlow = new THREE.PointLight(0xff6600, 0, 2);
  soilGlow.position.set(0, -0.9, 0);
  undergroundGroup.add(soilGlow);

  solidCover.visible = false;

  return {
    riserCaps,
    soilGlow,
    toggleCutaway() {
      const showCutaway = solidCover.visible;
      solidCover.visible = !showCutaway;
      undergroundGroup.visible = showCutaway;
      for (const f of floors) f.visible = !showCutaway;
      return showCutaway;
    },
  };
}
