# Simulator Refactor — Design

**Goal:** Extract the monolithic inline simulator into reusable ES modules. Add an outdoor environment. Remove cost breakdown.

**Constraints:** Lightweight — no texture files, environment adds <500 triangles. Three.js stays on CDN via import map.

---

## Module Architecture

```
src/scripts/simulator/
  core.js              — Renderer, camera, OrbitControls, resize, animation loop (onTick callbacks)
  environment.js       — Sky dome, sun disc, ground plane, low-poly trees, day/night transitions, stars
  greenhouse.js        — 4x5m frame, glass panels, floor, interior floor
  labels.js            — Generic label system: create/update/show/hide 3D-projected labels

  climate-battery/
    underground.js     — Soil layers, pipes, manifolds, risers, cutaway cover, cross-section faces
    components.js      — Fan (with blade rotation), solar panel, battery, thermostat
    particles.js       — Airflow particle system (paths, colors, speed)
    temperature.js     — Temperature data model, UI updater (temps, fan status, mode title)
    index.js           — Composes all climate-battery modules, exports init()
```

## Module Interface Pattern

Each module exports a factory function that takes `(scene, options?)` and returns a control object:

```js
// Example: environment.js
export function createEnvironment(scene) {
  // Add sky dome, sun, ground, trees to scene
  return {
    update(dt, dayProgress) { /* animate sun position, sky color, stars */ },
    setDayNight(isDay) { /* trigger transition */ },
  };
}
```

The composition module (`climate-battery/index.js`) wires everything together:

```js
export function init(canvas, viewport, options) {
  const core = createCore(canvas, viewport);
  const env = createEnvironment(core.scene);
  const gh = createGreenhouse(core.scene);
  const underground = createUnderground(core.scene);
  const components = createComponents(core.scene, gh);
  const particleSys = createParticles(core.scene);
  const labels = createLabels(viewport, core.camera);
  const temp = createTemperatureModel();

  core.onTick((dt) => {
    env.update(dt);
    components.update(dt, temp.current());
    particleSys.update(dt, temp.current());
    labels.update();
  });

  return { core, env, setMode, setTime, toggleCutaway, toggleLabels, resetCamera };
}
```

Article page inline script becomes ~20 lines: import, call `init()`, wire DOM buttons.

## Environment Design

- **Sky dome**: Large inverted sphere with `ShaderMaterial` — vertical gradient from light blue (#87CEEB) to white at horizon. Night: dark navy (#0F172A) to dark blue. Lerps during transitions.
- **Sun disc**: Small emissive sphere positioned to match directional light. Hidden at night.
- **Ground plane**: Large flat plane extending well beyond greenhouse. Green material (#4a7c59), high roughness, receives shadows. No texture files.
- **Trees**: 2-3 low-poly pine trees (cone + cylinder, ~20 tris each) at varying distances. Cast no shadows. Static.
- **Stars**: Existing star system, shown at night (already implemented).
- **Performance**: <500 total triangles added. No texture loads. No additional shadow casters.

## Removals

- Cost breakdown `<details>` block (HTML + table) from info panel
- `DAY_BG`/`NIGHT_BG` constants for `scene.background` (replaced by sky dome)

## What Stays in the Article Page

- HTML info panel (system overview, temperatures, component details)
- Bottom controls bar (day/night, time slider, cutaway, labels, reset)
- `<style is:inline>` block for simulator-specific CSS
- Small `<script type="module">` that imports `init()` and wires DOM events

## Shared Constants

Greenhouse dimensions (`GH = { w: 4, l: 5, wallH: 2.5, peakH: 3.5 }`) defined in `greenhouse.js` and exported for use by article modules that need to position things relative to the structure.

## Import Map

Stays as-is in the article page `<head>`:
```json
{
  "imports": {
    "three": "https://unpkg.com/three@0.162.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.162.0/examples/jsm/"
  }
}
```

Simulator modules import from `"three"` — the browser resolves via import map.
