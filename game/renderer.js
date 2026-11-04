// =====================================================================
//  RENDERER — each frame is drawn into `scene` at SCALE× the 320x180
//  pixel grid, then presented on the visible canvas with post effects.
//  With integer scaling every game pixel maps to an exact SCALE×SCALE
//  block of screen pixels, so all pixels come out the same size.
// =====================================================================
const W = 320, H = 180;
let SCALE = 2;
const cv = document.getElementById('cv');
const vctx = cv.getContext('2d');
const scene = document.createElement('canvas');
const sceneCtx = scene.getContext('2d');
let ctx = sceneCtx;

function resizeCanvas() {
  const game = document.getElementById('game');
  const dpr = window.devicePixelRatio || 1;
  if (CFG.integer) {
    const availW = Math.max(W, window.innerWidth * dpr);
    const availH = Math.max(H, window.innerHeight * dpr);
    SCALE = Math.max(1, Math.floor(Math.min(availW / W, availH / H)));
    game.style.width = (W * SCALE / dpr) + 'px';
    document.body.style.padding = '0';
  } else {
    SCALE = 2;
    game.style.width = '';
    document.body.style.padding = '';
  }
  cv.width = scene.width = W * SCALE;
  cv.height = scene.height = H * SCALE;
  vctx.imageSmoothingEnabled = false;
  sceneCtx.imageSmoothingEnabled = false;
  if (typeof onResizeFX === 'function') onResizeFX();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
