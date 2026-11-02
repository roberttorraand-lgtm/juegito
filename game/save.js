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

const CFG = {
  sfxVol: SAVE.get('cfg_sfxVol', 80),
  textSpeed: SAVE.get('cfg_textSpeed', 'normal'),
  scanlines: SAVE.get('cfg_scanlines', true),
  persist(key, val) { this[key] = val; SAVE.save({ ['cfg_' + key]: val }); },
};
