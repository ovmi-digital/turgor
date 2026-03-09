import * as THREE from 'three';
import { GH } from './greenhouse.js';

const DAY_TOP = new THREE.Color(0x87CEEB);
const DAY_HORIZON = new THREE.Color(0xE8F0F5);
const NIGHT_TOP = new THREE.Color(0x152040);
const NIGHT_HORIZON = new THREE.Color(0x2A3858);

const SKY_VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition).y;
    float t = max(0.0, h);
    gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
  }
`;

function createTree(x, z, height, scene) {
  const trunkH = height * 0.35;
  const crownH = height * 0.65;
  const trunkR = height * 0.04;
  const crownR = height * 0.2;

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2D5A27, roughness: 0.8 });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR, trunkR * 1.3, trunkH, 5),
    trunkMat
  );
  trunk.position.set(x, trunkH / 2, z);
  trunk.castShadow = false;
  scene.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(crownR, crownH, 6),
    crownMat
  );
  crown.position.set(x, trunkH + crownH / 2, z);
  crown.castShadow = false;
  scene.add(crown);
}

export function createEnvironment(scene) {
  const skyGeo = new THREE.SphereGeometry(45, 16, 8);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: {
      topColor: { value: DAY_TOP.clone() },
      horizonColor: { value: DAY_HORIZON.clone() },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4A7C59, roughness: 0.95 });
  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const groundShape = new THREE.Shape();
  groundShape.moveTo(-40, -40);
  groundShape.lineTo(40, -40);
  groundShape.lineTo(40, 40);
  groundShape.lineTo(-40, 40);
  groundShape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-hw, -hl);
  hole.lineTo(hw, -hl);
  hole.lineTo(hw, hl);
  hole.lineTo(-hw, hl);
  hole.closePath();
  groundShape.holes.push(hole);
  const groundGeo = new THREE.ShapeGeometry(groundShape);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  createTree(-6, -4, 3.5, scene);
  createTree(7, 5, 2.8, scene);
  createTree(-5, 7, 4.0, scene);

  const sunLight = new THREE.DirectionalLight(0xFFF4E0, 2.0);
  sunLight.position.set(4, 8, -3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 20;
  sunLight.shadow.camera.left = -6;
  sunLight.shadow.camera.right = 6;
  sunLight.shadow.camera.top = 6;
  sunLight.shadow.camera.bottom = -6;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0xE8F4FD, 0x78552B, 0.3);
  scene.add(hemiLight);

  const starsGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(200 * 3);
  for (let i = 0; i < 200; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const r = 40;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  const daySunColor = new THREE.Color(0xFFF4E0);
  const nightSunColor = new THREE.Color(0xC4D4FF);
  let transitionProgress = 1;
  let transitioning = false;
  let transitionTarget = 1;

  return {
    update(dt) {
      if (!transitioning) return;
      const speed = 1.0 / 1.5;
      if (transitionTarget === 1) {
        transitionProgress = Math.min(1, transitionProgress + speed * dt);
        if (transitionProgress >= 1) transitioning = false;
      } else {
        transitionProgress = Math.max(0, transitionProgress - speed * dt);
        if (transitionProgress <= 0) transitioning = false;
      }
      const t = transitionProgress;

      skyMat.uniforms.topColor.value.copy(DAY_TOP).lerp(NIGHT_TOP, 1 - t);
      skyMat.uniforms.horizonColor.value.copy(DAY_HORIZON).lerp(NIGHT_HORIZON, 1 - t);

      sunLight.color.copy(daySunColor).lerp(nightSunColor, 1 - t);
      sunLight.intensity = 0.6 + t * 1.4;
      ambientLight.intensity = 0.3 + t * 0.1;
      hemiLight.intensity = 0.2 + t * 0.1;

      starsMat.opacity = 1 - t;

      const dayGreen = 0x4A7C59;
      const nightGreen = 0x2A3E32;
      groundMat.color.set(dayGreen).lerp(new THREE.Color(nightGreen), 1 - t);
    },

    setDayNight(isDay) {
      transitioning = true;
      transitionTarget = isDay ? 1 : 0;
    },
  };
}
