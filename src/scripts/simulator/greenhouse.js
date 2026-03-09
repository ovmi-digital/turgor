import * as THREE from 'three';

export const GH = { w: 4, l: 5, wallH: 2.5, peakH: 3.5 };

const v = (x, y, z) => new THREE.Vector3(x, y, z);

function addBeam(group, p1, p2, material, radius) {
  radius = radius || 0.02;
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  if (length < 0.001) return;
  const geo = new THREE.CylinderGeometry(radius, radius, length, 6);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.lerpVectors(p1, p2, 0.5);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = direction.clone().normalize();
  if (Math.abs(up.dot(dir)) > 0.999) {
    mesh.rotation.set(0, 0, 0);
    if (dir.y < 0) mesh.rotation.z = Math.PI;
  } else {
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    mesh.quaternion.copy(quat);
  }
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

export function addBox(group, sx, sy, sz, material, px, py, pz) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(px, py, pz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createGreenhouse(scene) {
  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const wh = GH.wallH;
  const ph = GH.peakH;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.85, roughness: 0.25 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.9 });

  const ghGroup = new THREE.Group();
  scene.add(ghGroup);

  const floorGeo = new THREE.PlaneGeometry(GH.w + 1, GH.l + 1);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  ghGroup.add(floorMesh);

  const innerFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(GH.w, GH.l),
    new THREE.MeshStandardMaterial({ color: 0xc8c0ae, roughness: 0.95 })
  );
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = 0.005;
  innerFloor.receiveShadow = true;
  ghGroup.add(innerFloor);

  const frameGroup = new THREE.Group();
  ghGroup.add(frameGroup);

  // Bottom edges
  addBeam(frameGroup, v(-hw, 0, -hl), v(hw, 0, -hl), frameMat);
  addBeam(frameGroup, v(hw, 0, -hl), v(hw, 0, hl), frameMat);
  addBeam(frameGroup, v(hw, 0, hl), v(-hw, 0, hl), frameMat);
  addBeam(frameGroup, v(-hw, 0, hl), v(-hw, 0, -hl), frameMat);

  // Vertical corners
  addBeam(frameGroup, v(-hw, 0, -hl), v(-hw, wh, -hl), frameMat);
  addBeam(frameGroup, v(hw, 0, -hl), v(hw, wh, -hl), frameMat);
  addBeam(frameGroup, v(hw, 0, hl), v(hw, wh, hl), frameMat);
  addBeam(frameGroup, v(-hw, 0, hl), v(-hw, wh, hl), frameMat);

  // Top wall edges
  addBeam(frameGroup, v(-hw, wh, -hl), v(hw, wh, -hl), frameMat);
  addBeam(frameGroup, v(hw, wh, -hl), v(hw, wh, hl), frameMat);
  addBeam(frameGroup, v(hw, wh, hl), v(-hw, wh, hl), frameMat);
  addBeam(frameGroup, v(-hw, wh, hl), v(-hw, wh, -hl), frameMat);

  // Gable edges
  addBeam(frameGroup, v(-hw, wh, -hl), v(0, ph, -hl), frameMat);
  addBeam(frameGroup, v(hw, wh, -hl), v(0, ph, -hl), frameMat);
  addBeam(frameGroup, v(-hw, wh, hl), v(0, ph, hl), frameMat);
  addBeam(frameGroup, v(hw, wh, hl), v(0, ph, hl), frameMat);

  // Ridge beam
  addBeam(frameGroup, v(0, ph, -hl), v(0, ph, hl), frameMat);

  // Mid-height horizontal beams
  const midH = wh * 0.5;
  addBeam(frameGroup, v(-hw, midH, -hl), v(-hw, midH, hl), frameMat);
  addBeam(frameGroup, v(hw, midH, -hl), v(hw, midH, hl), frameMat);

  // Vertical mid-studs (long walls)
  for (let z = -hl + 1.25; z < hl; z += 1.25) {
    addBeam(frameGroup, v(-hw, 0, z), v(-hw, wh, z), frameMat, 0.015);
    addBeam(frameGroup, v(hw, 0, z), v(hw, wh, z), frameMat, 0.015);
  }
  addBeam(frameGroup, v(-hw / 2, 0, -hl), v(-hw / 2, wh, -hl), frameMat, 0.015);
  addBeam(frameGroup, v(hw / 2, 0, -hl), v(hw / 2, wh, -hl), frameMat, 0.015);
  addBeam(frameGroup, v(-hw / 2, 0, hl), v(-hw / 2, wh, hl), frameMat, 0.015);
  addBeam(frameGroup, v(hw / 2, 0, hl), v(hw / 2, wh, hl), frameMat, 0.015);

  return { group: ghGroup, frameGroup, floorMesh, innerFloor };
}
