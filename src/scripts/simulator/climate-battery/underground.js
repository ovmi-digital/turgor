import * as THREE from 'three';
import { GH, addBox } from '../greenhouse.js';

const PIPE_RADIUS = 0.055;
const PIPE_XS = [-1.5, -0.5, 0.5, 1.5];
export const PIPE_LAYERS = [-0.8, -1.2];
const RISER_X = 0;
const MANIFOLD_D = 0.35;
export const RISER_NORTH_Z = GH.l / 2 - MANIFOLD_D / 2 - 0.05;
export const RISER_SOUTH_Z = -(GH.l / 2 - MANIFOLD_D / 2 - 0.05);

export function createUnderground(scene, { floors = [] } = {}) {
  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const EPS = 0.003;

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.85 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const deepSoilMat = new THREE.MeshStandardMaterial({ color: 0x4a2f15, roughness: 0.95 });
  const pipeBedMat = new THREE.MeshStandardMaterial({ color: 0xc4b08a, roughness: 0.75 });
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
    [-0.65, -0.95, pipeBedMat],
    [-0.95, -1.05, soilMat],
    [-1.05, -1.35, pipeBedMat],
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

  // Internal cut faces (where the soil was "sliced")
  const crossFront = new THREE.Mesh(new THREE.PlaneGeometry(hw, 1.80), crossMat);
  crossFront.position.set(-hw / 2, -0.9, -EPS);
  undergroundGroup.add(crossFront);
  const crossSide = new THREE.Mesh(new THREE.PlaneGeometry(hl, 1.80), crossMat);
  crossSide.position.set(-EPS, -0.9, -hl / 2);
  crossSide.rotation.y = Math.PI / 2;
  undergroundGroup.add(crossSide);

  // Outer walls of the pit (prevent seeing through to sky)
  const outerWallMat = new THREE.MeshStandardMaterial({
    color: 0x4a2f15, roughness: 0.95, side: THREE.DoubleSide,
  });
  const southWall = new THREE.Mesh(new THREE.PlaneGeometry(hw, 1.80), outerWallMat);
  southWall.position.set(-hw / 2, -0.9, -hl + EPS);
  undergroundGroup.add(southWall);
  const westWall = new THREE.Mesh(new THREE.PlaneGeometry(hl, 1.80), outerWallMat);
  westWall.position.set(-hw + EPS, -0.9, -hl / 2);
  westWall.rotation.y = Math.PI / 2;
  undergroundGroup.add(westWall);

  // Pit floor
  const pitFloor = new THREE.Mesh(new THREE.PlaneGeometry(hw, hl), outerWallMat);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.set(-hw / 2, -1.80 + EPS, -hl / 2);
  undergroundGroup.add(pitFloor);

  // Manifolds — collector boxes spanning all pipes and both layers
  const manifoldW = PIPE_XS[PIPE_XS.length - 1] - PIPE_XS[0] + 0.4;
  const manifoldH = Math.abs(PIPE_LAYERS[0] - PIPE_LAYERS[1]) + 0.3;
  const manifoldY = (PIPE_LAYERS[0] + PIPE_LAYERS[1]) / 2;
  const manifoldNZ = RISER_NORTH_Z;
  const manifoldSZ = RISER_SOUTH_Z;

  const manifoldN = addBox(
    undergroundGroup, manifoldW, manifoldH, MANIFOLD_D, plywoodMat,
    0, manifoldY, manifoldNZ,
  );
  manifoldN.userData = { type: 'manifold' };
  const manifoldS = addBox(
    undergroundGroup, manifoldW, manifoldH, MANIFOLD_D, plywoodMat,
    0, manifoldY, manifoldSZ,
  );
  manifoldS.userData = { type: 'manifold' };

  // Pipes — terminate at manifold faces
  const pipeLen = Math.abs(manifoldNZ - manifoldSZ) - MANIFOLD_D;
  for (const layerY of PIPE_LAYERS) {
    for (const px of PIPE_XS) {
      const pipeGeo = new THREE.CylinderGeometry(
        PIPE_RADIUS, PIPE_RADIUS, pipeLen, 12,
      );
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(px, layerY, 0);
      pipe.userData = { type: 'pipe' };
      undergroundGroup.add(pipe);
    }
  }

  // Gravel rings at cross-section cut face (z=0)
  const GRAVEL_R = PIPE_RADIUS + 0.12;
  const RING_LEN = 0.12;
  for (const layerY of PIPE_LAYERS) {
    for (const px of PIPE_XS) {
      const ringGeo = new THREE.CylinderGeometry(
        GRAVEL_R, GRAVEL_R, RING_LEN, 12,
      );
      ringGeo.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, pipeBedMat);
      ring.position.set(px, layerY, RING_LEN / 2 - 0.03);
      undergroundGroup.add(ring);
    }
  }

  // Risers — vertical pipes from manifold top to above ground
  const manifoldTop = manifoldY + manifoldH / 2;
  const riserTop = 0.25;
  const riserH = riserTop - manifoldTop;
  const riserCenterY = (manifoldTop + riserTop) / 2;
  const riserGeo = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, riserH, 12);
  const riserA = new THREE.Mesh(riserGeo, pvcMat);
  riserA.position.set(RISER_X, riserCenterY, manifoldNZ);
  riserA.userData = { type: 'riser' };
  undergroundGroup.add(riserA);
  const riserB = new THREE.Mesh(riserGeo.clone(), pvcMat);
  riserB.position.set(RISER_X, riserCenterY, manifoldSZ);
  riserB.userData = { type: 'riser' };
  undergroundGroup.add(riserB);

  const riserCapGeo = new THREE.CylinderGeometry(PIPE_RADIUS + 0.01, PIPE_RADIUS + 0.01, 0.3, 12);
  const riserCaps = [
    { mesh: new THREE.Mesh(riserCapGeo, pvcMat), pos: [RISER_X, 0.15, manifoldNZ] },
    { mesh: new THREE.Mesh(riserCapGeo.clone(), pvcMat), pos: [RISER_X, 0.15, manifoldSZ] },
  ];

  const soilGlow = new THREE.PointLight(0xff6600, 0, 2);
  soilGlow.position.set(0, -0.9, 0);
  undergroundGroup.add(soilGlow);

  solidCover.visible = false;
  for (const f of floors) f.visible = false;

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
