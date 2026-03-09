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
