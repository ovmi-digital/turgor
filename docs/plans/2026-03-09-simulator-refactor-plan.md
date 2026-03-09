# Simulator Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the monolithic 1250-line inline simulator into reusable ES modules, add outdoor environment, remove cost breakdown.

**Architecture:** Shared modules (`core`, `environment`, `greenhouse`, `labels`) provide the base scene. Per-article modules (`climate-battery/*`) add article-specific content. Astro bundles everything via Vite — Three.js installed as a dependency, no more CDN import map.

**Tech Stack:** Astro 5, Three.js 0.162.0, Tailwind v4, Bun

---

### Task 1: Install Three.js and create core.js

**Files:**
- Create: `src/scripts/simulator/core.js`

**Step 1:** Install Three.js.
```bash
bun add three@0.162.0
```

**Step 2:** Create `src/scripts/simulator/core.js`. This module handles renderer, camera, OrbitControls, WebGL check, resize, and animation loop.

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCore(canvas, viewport) {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) {
    const fallback = document.getElementById('webgl-fallback');
    if (fallback) fallback.classList.remove('hidden');
    throw new Error('WebGL not supported');
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    viewport.clientWidth / viewport.clientHeight,
    0.1,
    100
  );
  camera.position.set(7, 5, -7);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.target.set(0, 0.5, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.update();

  const defaultCamPos = camera.position.clone();
  const defaultTarget = controls.target.clone();

  const tickCallbacks = [];
  let prevTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - prevTime) / 1000, 0.1);
    prevTime = now;
    controls.update();
    for (const cb of tickCallbacks) cb(dt);
    renderer.render(scene, camera);
  }

  function onResize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  new ResizeObserver(onResize).observe(viewport);

  return {
    scene,
    camera,
    renderer,
    controls,
    canvas,
    onTick(cb) { tickCallbacks.push(cb); },
    resetCamera() {
      camera.position.copy(defaultCamPos);
      controls.target.copy(defaultTarget);
      controls.update();
    },
    start() { animate(); },
  };
}
```

**Step 3:** `bun run build` — should pass (no pages import it yet).

**Step 4:** Commit.
```bash
git add package.json bun.lockb src/scripts/simulator/core.js
git commit -m "feat: add Three.js dependency and simulator core module"
```

---

### Task 2: Create greenhouse.js

**Files:**
- Create: `src/scripts/simulator/greenhouse.js`

**Step 1:** Create `src/scripts/simulator/greenhouse.js`. Exports greenhouse constants and builds the frame, glass, and floor.

```js
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
  const roofAngle = Math.atan2(ph - wh, hw);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xb0b0b0,
    metalness: 0.8,
    roughness: 0.3,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xccccbb,
    roughness: 0.9,
  });

  const ghGroup = new THREE.Group();
  scene.add(ghGroup);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(GH.w + 1, GH.l + 1);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  ghGroup.add(floorMesh);

  // Interior floor
  const innerFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(GH.w, GH.l),
    new THREE.MeshStandardMaterial({ color: 0xc8c0ae, roughness: 0.95 })
  );
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = 0.005;
  innerFloor.receiveShadow = true;
  ghGroup.add(innerFloor);

  // Frame
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
  // Vertical mid-studs (short walls)
  addBeam(frameGroup, v(-hw / 2, 0, -hl), v(-hw / 2, wh, -hl), frameMat, 0.015);
  addBeam(frameGroup, v(hw / 2, 0, -hl), v(hw / 2, wh, -hl), frameMat, 0.015);
  addBeam(frameGroup, v(-hw / 2, 0, hl), v(-hw / 2, wh, hl), frameMat, 0.015);
  addBeam(frameGroup, v(hw / 2, 0, hl), v(hw / 2, wh, hl), frameMat, 0.015);

  // Glass panels
  const glassGroup = new THREE.Group();
  ghGroup.add(glassGroup);

  // South wall
  const southWallGlass = new THREE.Mesh(new THREE.PlaneGeometry(GH.w, wh), glassMat);
  southWallGlass.position.set(0, wh / 2, -hl);
  glassGroup.add(southWallGlass);

  // South gable
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-hw, 0);
  gableShape.lineTo(hw, 0);
  gableShape.lineTo(0, ph - wh);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);

  const southGable = new THREE.Mesh(gableGeo, glassMat);
  southGable.position.set(0, wh, -hl);
  glassGroup.add(southGable);

  // North wall
  const northWallGlass = new THREE.Mesh(new THREE.PlaneGeometry(GH.w, wh), glassMat);
  northWallGlass.position.set(0, wh / 2, hl);
  northWallGlass.rotation.y = Math.PI;
  glassGroup.add(northWallGlass);

  const northGable = new THREE.Mesh(gableGeo.clone(), glassMat);
  northGable.position.set(0, wh, hl);
  northGable.rotation.y = Math.PI;
  glassGroup.add(northGable);

  // East wall
  const eastWallGlass = new THREE.Mesh(new THREE.PlaneGeometry(GH.l, wh), glassMat);
  eastWallGlass.position.set(hw, wh / 2, 0);
  eastWallGlass.rotation.y = -Math.PI / 2;
  glassGroup.add(eastWallGlass);

  // West wall
  const westWallGlass = new THREE.Mesh(new THREE.PlaneGeometry(GH.l, wh), glassMat);
  westWallGlass.position.set(-hw, wh / 2, 0);
  westWallGlass.rotation.y = Math.PI / 2;
  glassGroup.add(westWallGlass);

  // Roof panels
  const roofSlope = Math.sqrt(hw * hw + (ph - wh) * (ph - wh));
  const roofGeo = new THREE.PlaneGeometry(roofSlope, GH.l);

  const westRoof = new THREE.Mesh(roofGeo, glassMat);
  westRoof.position.set(-hw / 2, (wh + ph) / 2, 0);
  westRoof.rotation.z = roofAngle;
  westRoof.rotation.order = 'ZYX';
  glassGroup.add(westRoof);

  const eastRoof = new THREE.Mesh(roofGeo.clone(), glassMat);
  eastRoof.position.set(hw / 2, (wh + ph) / 2, 0);
  eastRoof.rotation.z = -roofAngle;
  eastRoof.rotation.order = 'ZYX';
  glassGroup.add(eastRoof);

  return { group: ghGroup, roofAngle };
}
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/greenhouse.js
git commit -m "feat: add greenhouse structure module"
```

---

### Task 3: Create environment.js

**Files:**
- Create: `src/scripts/simulator/environment.js`

**Step 1:** Create `src/scripts/simulator/environment.js`. This is new code — sky dome with gradient shader, sun disc, green ground plane, 2-3 low-poly pine trees, stars, day/night transitions.

```js
import * as THREE from 'three';

const DAY_TOP = new THREE.Color(0x87CEEB);
const DAY_HORIZON = new THREE.Color(0xE8F0F5);
const NIGHT_TOP = new THREE.Color(0x0A1628);
const NIGHT_HORIZON = new THREE.Color(0x1A2744);

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
  // Sky dome
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

  // Sun disc
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFF8E1 });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), sunMat);
  sun.position.set(15, 25, -10);
  scene.add(sun);

  // Ground plane
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4A7C59,
    roughness: 0.95,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    groundMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Trees
  createTree(-6, -4, 3.5, scene);
  createTree(7, 5, 2.8, scene);
  createTree(-5, 7, 4.0, scene);

  // Lighting
  const sunLight = new THREE.DirectionalLight(0xFFF4E0, 2.0);
  sunLight.position.set(4, 8, -3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
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

  // Stars
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
  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0,
  });
  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  // Day/night state
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

      // Sky gradient
      skyMat.uniforms.topColor.value.copy(DAY_TOP).lerp(NIGHT_TOP, 1 - t);
      skyMat.uniforms.horizonColor.value.copy(DAY_HORIZON).lerp(NIGHT_HORIZON, 1 - t);

      // Sun disc
      sun.visible = t > 0.3;
      sun.material.opacity = t;

      // Lighting
      sunLight.color.copy(daySunColor).lerp(nightSunColor, 1 - t);
      sunLight.intensity = 0.3 + t * 1.7;
      ambientLight.intensity = 0.15 + t * 0.25;
      hemiLight.intensity = 0.1 + t * 0.2;

      // Stars
      starsMat.opacity = 1 - t;

      // Ground darkens at night
      const dayGreen = 0x4A7C59;
      const nightGreen = 0x1A2E22;
      groundMat.color.set(dayGreen).lerp(new THREE.Color(nightGreen), 1 - t);
    },

    setDayNight(isDay) {
      transitioning = true;
      transitionTarget = isDay ? 1 : 0;
    },
  };
}
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/environment.js
git commit -m "feat: add environment module with sky, sun, ground, and trees"
```

---

### Task 4: Create labels.js

**Files:**
- Create: `src/scripts/simulator/labels.js`

**Step 1:** Create `src/scripts/simulator/labels.js`. Generic label system — article provides label definitions, this module handles projection and visibility.

```js
export function createLabels(viewport, camera, container) {
  const labels = [];
  let visible = true;

  return {
    add(definitions) {
      for (const def of definitions) {
        const el = document.createElement('div');
        el.className = 'label-3d';
        el.textContent = def.text;
        el.style.background = 'rgba(250,250,250,0.9)';
        el.style.color = '#0A0A0A';
        container.appendChild(el);
        labels.push({ el, pos: def.pos, detail: def.detail });
      }
    },

    update() {
      if (!visible) {
        for (const l of labels) l.el.style.display = 'none';
        return;
      }
      const w = viewport.clientWidth;
      const h = viewport.clientHeight;
      for (const l of labels) {
        const projected = l.pos.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;
        if (projected.z > 1 || x < -50 || x > w + 50 || y < -50 || y > h + 50) {
          l.el.style.display = 'none';
        } else {
          l.el.style.display = 'block';
          l.el.style.left = x + 'px';
          l.el.style.top = y + 'px';
        }
      }
    },

    toggle() {
      visible = !visible;
      return visible;
    },

    setVisible(v) { visible = v; },
  };
}
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/labels.js
git commit -m "feat: add generic label system module"
```

---

### Task 5: Create climate-battery/underground.js

**Files:**
- Create: `src/scripts/simulator/climate-battery/underground.js`

**Step 1:** Create the directory and file. This module builds soil layers, pipes, manifolds, risers, cutaway cover, cross-section faces, and soil glow.

```js
import * as THREE from 'three';
import { GH, addBox } from '../greenhouse.js';

const PIPE_RADIUS = 0.055;
const PIPE_XS = [-1.5, -0.5, 0.5, 1.5];
export const PIPE_LAYERS = [-0.8, -1.2];
const RISER_X = 0;
export const RISER_NORTH_Z = 2.0;
export const RISER_SOUTH_Z = -2.0;

export function createUnderground(scene) {
  const hw = GH.w / 2;
  const hl = GH.l / 2;

  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.85 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const deepSoilMat = new THREE.MeshStandardMaterial({ color: 0x4a2f15, roughness: 0.95 });
  const drainGravelMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.85 });
  const plywoodMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, roughness: 0.7 });
  const pvcMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 });

  const undergroundGroup = new THREE.Group();
  scene.add(undergroundGroup);
  const cutawayCover = new THREE.Group();
  scene.add(cutawayCover);

  function addSoilLayer(group, yTop, yBot, material) {
    const thickness = yTop - yBot;
    const yCenter = (yTop + yBot) / 2;
    addBox(group, hw, thickness, GH.l, material, hw / 2, yCenter, 0);
    addBox(group, hw, thickness, hl, material, -hw / 2, yCenter, hl / 2);
  }

  function addSoilCover(group, yTop, yBot, material) {
    const thickness = yTop - yBot;
    const yCenter = (yTop + yBot) / 2;
    addBox(group, hw, thickness, hl, material, -hw / 2, yCenter, -hl / 2);
  }

  // Soil strata
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
    addSoilLayer(undergroundGroup, top, bot, mat);
    addSoilCover(cutawayCover, top, bot, mat);
  }

  // Cross-section faces
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a1a,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const crossFront = new THREE.Mesh(new THREE.PlaneGeometry(hw, 1.80), crossMat);
  crossFront.position.set(-hw / 2, -0.9, 0);
  undergroundGroup.add(crossFront);
  const crossSide = new THREE.Mesh(new THREE.PlaneGeometry(hl, 1.80), crossMat);
  crossSide.position.set(0, -0.9, -hl / 2);
  crossSide.rotation.y = Math.PI / 2;
  undergroundGroup.add(crossSide);

  // Pipes
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

  // Manifolds
  const manifoldN = addBox(undergroundGroup, 0.6, 0.3, 0.4, plywoodMat, 0, -0.95, hl - 0.35);
  manifoldN.userData = { type: 'manifold' };
  const manifoldS = addBox(undergroundGroup, 0.6, 0.3, 0.4, plywoodMat, 0, -0.95, -hl + 0.35);
  manifoldS.userData = { type: 'manifold' };

  // Risers
  const riserGeo = new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, 1.2, 12);
  const riserA = new THREE.Mesh(riserGeo, pvcMat);
  riserA.position.set(RISER_X, -0.35, RISER_NORTH_Z);
  riserA.userData = { type: 'riser' };
  undergroundGroup.add(riserA);
  const riserB = new THREE.Mesh(riserGeo.clone(), pvcMat);
  riserB.position.set(RISER_X, -0.35, RISER_SOUTH_Z);
  riserB.userData = { type: 'riser' };
  undergroundGroup.add(riserB);

  // Riser caps above ground (returned so ghGroup owner can add them)
  const riserCapGeo = new THREE.CylinderGeometry(PIPE_RADIUS + 0.01, PIPE_RADIUS + 0.01, 0.3, 12);
  const riserCaps = [
    { mesh: new THREE.Mesh(riserCapGeo, pvcMat), pos: [RISER_X, 0.15, RISER_NORTH_Z] },
    { mesh: new THREE.Mesh(riserCapGeo.clone(), pvcMat), pos: [RISER_X, 0.15, RISER_SOUTH_Z] },
  ];

  // Soil glow
  const soilGlow = new THREE.PointLight(0xff6600, 0, 2);
  soilGlow.position.set(0, -0.9, 0);
  undergroundGroup.add(soilGlow);

  // Init: cutaway visible (cover hidden)
  cutawayCover.visible = false;

  return {
    riserCaps,
    soilGlow,
    toggleCutaway() {
      cutawayCover.visible = !cutawayCover.visible;
      return !cutawayCover.visible;
    },
  };
}
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/climate-battery/underground.js
git commit -m "feat: add underground system module"
```

---

### Task 6: Create climate-battery/components.js

**Files:**
- Create: `src/scripts/simulator/climate-battery/components.js`

**Step 1:** Create `src/scripts/simulator/climate-battery/components.js`. Fan, solar panel, battery, thermostat.

```js
import * as THREE from 'three';
import { GH, addBox } from '../greenhouse.js';
import { RISER_NORTH_Z } from './underground.js';

export function createComponents(scene, greenhouse) {
  const hw = GH.w / 2;
  const hl = GH.l / 2;
  const wh = GH.wallH;
  const ph = GH.peakH;
  const RISER_X = 0;

  // Fan
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

  // Solar panel
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.6, roughness: 0.3 });
  const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 1.2), solarMat);
  const solarY = (wh + ph) / 2 + 0.15;
  solarPanel.position.set(hw * 0.4, solarY, 0);
  solarPanel.rotation.z = -greenhouse.roofAngle;
  solarPanel.userData = { type: 'solar' };
  scene.add(solarPanel);

  // Battery
  const batteryMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
  const battery = addBox(scene, 0.25, 0.2, 0.15, batteryMat, hw - 0.2, 0.1, hl - 0.3);
  battery.userData = { type: 'battery' };

  // Thermostat
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
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/climate-battery/components.js
git commit -m "feat: add climate battery components module"
```

---

### Task 7: Create climate-battery/particles.js

**Files:**
- Create: `src/scripts/simulator/climate-battery/particles.js`

**Step 1:** Create `src/scripts/simulator/climate-battery/particles.js`. Airflow particle system.

```js
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
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/climate-battery/particles.js
git commit -m "feat: add airflow particle system module"
```

---

### Task 8: Create climate-battery/temperature.js

**Files:**
- Create: `src/scripts/simulator/climate-battery/temperature.js`

**Step 1:** Create `src/scripts/simulator/climate-battery/temperature.js`. Temperature data model and UI updater.

```js
const TEMP_DATA = [
  [0,    -8,   7,   16, false],
  [240,  -7,   5,   13, false],
  [360,  -5,   6,   12, false],
  [480,  -3,  25,   14, true],
  [600,  -2,  30,   17, true],
  [720,   0,  33,   20, true],
  [840,  -1,  30,   21, true],
  [960,  -3,  25,   20, true],
  [1020, -4,  20,   19, true],
  [1080, -5,  12,   18, false],
  [1200, -7,   9,   17, false],
  [1320, -8,   7,   16, false],
  [1440, -8,   7,   16, false],
];

export function createTemperatureModel() {
  function getTemps(minutes) {
    let i = 0;
    for (; i < TEMP_DATA.length - 1; i++) {
      if (TEMP_DATA[i + 1][0] >= minutes) break;
    }
    const a = TEMP_DATA[i];
    const b = TEMP_DATA[Math.min(i + 1, TEMP_DATA.length - 1)];
    const range = b[0] - a[0];
    const t = range > 0 ? (minutes - a[0]) / range : 0;
    return {
      outside: a[1] + (b[1] - a[1]) * t,
      greenhouse: a[2] + (b[2] - a[2]) * t,
      soil: a[3] + (b[3] - a[3]) * t,
      fanOn: minutes >= 480 && minutes <= 1020 && a[4],
    };
  }

  function updateUI(timeMinutes) {
    const temps = getTemps(timeMinutes);
    const hours = Math.floor(timeMinutes / 60);
    const mins = Math.floor(timeMinutes % 60);

    document.getElementById('time-display').textContent =
      String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    document.getElementById('temp-outside').textContent = Math.round(temps.outside) + '\u00B0C';
    document.getElementById('temp-greenhouse').textContent = Math.round(temps.greenhouse) + '\u00B0C';
    document.getElementById('temp-soil').textContent = Math.round(temps.soil) + '\u00B0C';
    document.getElementById('fan-status').textContent = temps.fanOn ? 'ON' : 'OFF';
    document.getElementById('fan-status').style.color = temps.fanOn ? '#10B981' : '';

    const isSunUp = timeMinutes >= 360 && timeMinutes <= 1080;
    document.getElementById('mode-title').textContent = isSunUp ? 'Storing Heat' : 'Releasing Heat';

    const ghTempEl = document.getElementById('temp-greenhouse');
    if (temps.greenhouse > 20) {
      ghTempEl.style.color = '#F59E0B';
    } else if (temps.greenhouse > 10) {
      ghTempEl.style.color = '#10B981';
    } else {
      ghTempEl.style.color = '#3B82F6';
    }

    return temps;
  }

  return { getTemps, updateUI };
}
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/climate-battery/temperature.js
git commit -m "feat: add temperature model module"
```

---

### Task 9: Create climate-battery/index.js

**Files:**
- Create: `src/scripts/simulator/climate-battery/index.js`

**Step 1:** Create `src/scripts/simulator/climate-battery/index.js`. Composes all modules, exports `init()`, handles raycasting.

```js
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
```

**Step 2:** `bun run build` — should pass.

**Step 3:** Commit.
```bash
git add src/scripts/simulator/climate-battery/index.js
git commit -m "feat: add climate battery composition module"
```

---

### Task 10: Rewrite article page

**Files:**
- Modify: `src/pages/blog/climate-battery-system.astro`

**Step 1:** Remove the cost breakdown HTML block. Delete lines 192-230 (the entire `<!-- Cost Breakdown -->` `<details>` element including the table).

**Step 2:** Remove the `<script is:inline type="importmap">` block (lines 371-378 in the original). It's no longer needed — Astro bundles the imports.

**Step 3:** Replace the entire `<script is:inline type="module">` block (the ~870 line Three.js script) with a new non-inline `<script>` block:

```html
<script>
  import { init } from '../../scripts/simulator/climate-battery/index.js';

  const canvas = document.getElementById('canvas');
  const viewport = document.getElementById('viewport');
  const sim = init(canvas, viewport);

  // Day/Night buttons
  document.getElementById('btn-day').addEventListener('click', () => {
    const t = sim.setMode(true);
    document.getElementById('btn-day').classList.add('active');
    document.getElementById('btn-night').classList.remove('active');
    document.getElementById('time-slider').value = t;
  });
  document.getElementById('btn-night').addEventListener('click', () => {
    const t = sim.setMode(false);
    document.getElementById('btn-night').classList.add('active');
    document.getElementById('btn-day').classList.remove('active');
    document.getElementById('time-slider').value = t;
  });

  // Time slider
  document.getElementById('time-slider').addEventListener('input', (e) => {
    const minutes = parseInt(e.target.value);
    sim.setTime(minutes);
    const isDay = sim.getIsDay();
    document.getElementById('btn-day').classList.toggle('active', isDay);
    document.getElementById('btn-night').classList.toggle('active', !isDay);
  });

  // Toggle buttons
  document.getElementById('btn-cutaway').addEventListener('click', () => {
    const active = sim.toggleCutaway();
    document.getElementById('btn-cutaway').classList.toggle('active', active);
  });
  document.getElementById('btn-labels').addEventListener('click', () => {
    const active = sim.toggleLabels();
    document.getElementById('btn-labels').classList.toggle('active', active);
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    sim.resetCamera();
  });
</script>
```

**Step 4:** Keep the `<style is:inline>` block — it contains simulator-specific CSS that references blog tokens. But remove the `scene.background` references since the sky dome now handles background color. No changes needed to the style block.

**Step 5:** `bun run build` — should pass.

**Step 6:** Commit.
```bash
git add src/pages/blog/climate-battery-system.astro
git commit -m "feat: rewrite article page to use modular simulator"
```

---

### Task 11: Visual verification

**Files:**
- Possibly tweak: any simulator module or article page

**Step 1:** `bun run build` — must pass.

**Step 2:** `bun run preview` and verify:
- **Landing page**: still dark, unaffected
- **Blog index**: still light theme, hero texture
- **Article page — header/prose**: light theme, green headings (unchanged from earlier)
- **Simulator viewport**: greenhouse renders with sky dome background (blue gradient, not flat color), sun disc visible, green ground plane extending beyond greenhouse, 2-3 pine trees in background, all 3D elements render correctly
- **Day/Night toggle**: sky transitions from blue to dark navy, sun disappears, stars appear, ground darkens, greenhouse lighting dims
- **Time slider**: temperatures update, fan spins, particles flow
- **Cutaway toggle**: underground cross-section shows/hides
- **Labels toggle**: 3D labels show/hide
- **Reset button**: camera returns to default position
- **Component click**: clicking 3D objects opens matching detail panel
- **Cost breakdown**: gone from info panel
- **Mobile (375px)**: simulator controls wrap correctly, viewport fills space

**Step 3:** Fix any visual issues found.

**Step 4:** Commit if changes made.
```bash
git add -A
git commit -m "polish: visual adjustments for modular simulator"
```
