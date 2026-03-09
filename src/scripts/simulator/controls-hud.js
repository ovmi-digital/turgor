const PANEL_STYLE = [
  'position:absolute',
  'right:12px',
  'bottom:12px',
  'display:flex',
  'flex-direction:column',
  'align-items:flex-end',
  'gap:6px',
  'z-index:10',
].join(';');

const INNER_STYLE = [
  'display:flex',
  'flex-direction:column',
  'gap:4px',
  'padding:8px',
  'border-radius:10px',
  'background:rgba(0,0,0,0.5)',
  'backdrop-filter:blur(6px)',
  '-webkit-backdrop-filter:blur(6px)',
].join(';');

const BTN_BASE = [
  'border:none',
  'border-radius:6px',
  'padding:6px 10px',
  'font-size:11px',
  'font-weight:700',
  'letter-spacing:0.04em',
  'cursor:pointer',
  'transition:all 0.15s',
  'white-space:nowrap',
  'text-align:center',
  'min-width:28px',
].join(';');

const BTN_OFF = 'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);';
const BTN_ON = 'background:rgba(255,255,255,0.85);color:#111;';

const TAB_STYLE = [
  'border:none',
  'border-radius:10px',
  'width:36px',
  'height:36px',
  'font-size:20px',
  'line-height:1',
  'cursor:pointer',
  'background:rgba(0,0,0,0.5)',
  'backdrop-filter:blur(6px)',
  '-webkit-backdrop-filter:blur(6px)',
  'color:rgba(255,255,255,0.7)',
  'transition:all 0.15s',
  'display:flex',
  'align-items:center',
  'justify-content:center',
].join(';');

const SEP_STYLE = [
  'width:100%',
  'height:1px',
  'background:rgba(255,255,255,0.12)',
  'border:none',
  'margin:2px 0',
].join(';');

const SPEED_WRAP = [
  'display:flex',
  'gap:2px',
  'border-radius:6px',
  'padding:2px',
  'background:rgba(255,255,255,0.06)',
].join(';');

const SPEED_BTN_BASE = [
  'border:none',
  'border-radius:4px',
  'padding:4px 6px',
  'font-size:10px',
  'font-weight:700',
  'cursor:pointer',
  'transition:all 0.15s',
].join(';');

function applyActive(btn, active) {
  btn.style.cssText = BTN_BASE + ';' + (active ? BTN_ON : BTN_OFF);
}

function applySpeedActive(btn, active) {
  btn.style.cssText = SPEED_BTN_BASE + ';' + (active ? BTN_ON : BTN_OFF);
}

export function createControlsHUD(viewport) {
  const root = document.createElement('div');
  root.style.cssText = PANEL_STYLE;
  viewport.appendChild(root);

  const inner = document.createElement('div');
  inner.style.cssText = INNER_STYLE;
  root.appendChild(inner);

  const tab = document.createElement('button');
  tab.style.cssText = TAB_STYLE;
  tab.textContent = '×';
  tab.title = 'Toggle controls';
  root.appendChild(tab);

  let visible = true;
  tab.addEventListener('click', () => {
    visible = !visible;
    inner.style.display = visible ? 'flex' : 'none';
    tab.textContent = visible ? '×' : '⚙';
  });

  function addToggle(label, active, callback) {
    const btn = document.createElement('button');
    btn.textContent = label;
    applyActive(btn, active);
    btn.addEventListener('click', () => {
      const result = callback();
      applyActive(btn, result);
    });
    inner.appendChild(btn);
    return btn;
  }

  function addPlayPause(playing, callback) {
    const btn = document.createElement('button');
    btn.textContent = playing ? '⏸' : '▶';
    applyActive(btn, playing);
    btn.addEventListener('click', () => {
      const nowPlaying = callback();
      btn.textContent = nowPlaying ? '⏸' : '▶';
      applyActive(btn, nowPlaying);
    });
    inner.appendChild(btn);
    return btn;
  }

  function addSpeedGroup(speeds, defaultSpeed, callback) {
    const wrap = document.createElement('div');
    wrap.style.cssText = SPEED_WRAP;
    const buttons = [];
    for (const { label, value } of speeds) {
      const btn = document.createElement('button');
      btn.textContent = label;
      applySpeedActive(btn, value === defaultSpeed);
      btn.addEventListener('click', () => {
        callback(value);
        for (const b of buttons) {
          applySpeedActive(b.btn, b.value === value);
        }
      });
      wrap.appendChild(btn);
      buttons.push({ btn, value });
    }
    inner.appendChild(wrap);
    return wrap;
  }

  function addButton(label, callback) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = BTN_BASE + ';' + BTN_OFF;
    btn.addEventListener('click', callback);
    inner.appendChild(btn);
    return btn;
  }

  function addSeparator() {
    const sep = document.createElement('hr');
    sep.style.cssText = SEP_STYLE;
    inner.appendChild(sep);
  }

  return { addToggle, addPlayPause, addSpeedGroup, addButton, addSeparator };
}
