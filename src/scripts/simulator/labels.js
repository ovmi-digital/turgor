export function createLabels(viewport, camera, container) {
  const labels = [];
  let visible = true;
  const hiddenGroups = new Set();

  return {
    add(definitions) {
      for (const def of definitions) {
        const el = document.createElement('div');
        el.className = 'label-3d';
        el.textContent = def.text;
        el.style.background = 'rgba(250,250,250,0.9)';
        el.style.color = '#0A0A0A';
        container.appendChild(el);
        labels.push({
          el, pos: def.pos, detail: def.detail, group: def.group,
        });
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
        if (l.group && hiddenGroups.has(l.group)) {
          l.el.style.display = 'none';
          continue;
        }
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

    setGroupVisible(group, v) {
      if (v) hiddenGroups.delete(group);
      else hiddenGroups.add(group);
    },
  };
}
