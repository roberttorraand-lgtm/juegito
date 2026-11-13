// =====================================================================
//  SAVE SYSTEM + CONFIG
// =====================================================================
const SAVE = {
  _key: 'distorsion-externa-save',
  _data: null,
  load() {
    try {
      const raw = localStorage.getItem(this._key);
      this._data = raw ? JSON.parse(raw) : {};
    } catch(e) { this._data = {}; }
    return this._data;
  },
  save(updates) {
    try {
      Object.assign(this._data, updates);
      localStorage.setItem(this._key, JSON.stringify(this._data));
      const el = document.getElementById('save-indicator');
      if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1200); }
    } catch(e) {}
  },
  get(key, fallback) { return this._data && this._data[key] !== undefined ? this._data[key] : fallback; },
};
SAVE.load();

// Graphics presets; every value can also be changed one by one in Ajustes → Video
const QUALITY = {
  baja:  { integer: false, pixelGrid: false, bloom: 0, particles: 1, shadows: false, grade: false, grain: false },
  media: { integer: true,  pixelGrid: false, bloom: 1, particles: 1, shadows: false, grade: true,  grain: false },
  alta:  { integer: true,  pixelGrid: true,  bloom: 1, particles: 2, shadows: true,  grade: true,  grain: true },
  ultra: { integer: true,  pixelGrid: true,  bloom: 2, particles: 3, shadows: true,  grade: true,  grain: true },
};
// Phones and tablets fill the whole screen by default
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
const CFG_DEFAULTS = { sfxVol: 80, musicVol: 60, textSpeed: 'normal', scanlines: false, fps: false, fpsCap: 0, impactFrames: false, softFlash: true, combatSpeed: 1, difficulty: 'normal', devUnlock: false, shakeFx: true, textSize: 'normal', clashOdds: true, fill: IS_TOUCH, quality: 'alta', ...QUALITY.alta };

const CFG = {
  persist(key, val) { this[key] = val; SAVE.save({ ['cfg_' + key]: val }); },
  applyQuality(q) {
    for (const k in QUALITY[q]) this.persist(k, QUALITY[q][k]);
    this.persist('quality', q);
  },
  reset() { for (const k in CFG_DEFAULTS) this[k] = CFG_DEFAULTS[k]; },
};
for (const k in CFG_DEFAULTS) CFG[k] = SAVE.get('cfg_' + k, CFG_DEFAULTS[k]);
