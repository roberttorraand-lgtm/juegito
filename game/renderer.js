// =====================================================================
//  RENDERER — each frame is drawn into `scene` at SCALE× the game pixel
//  grid, then presented on the visible canvas with post effects.
//
//  The game is designed on a 320x180 grid (W x H). In "fill" mode the
//  view grows wider (VW) to match the screen and everything designed for
//  the 320 grid is centred, offset by OX; backgrounds and panels extend
//  to the edges. With integer scaling every game pixel becomes an exact
//  SCALE x SCALE block of screen pixels.
// =====================================================================
const W = 320, H = 180;
let SCALE = 2, VW = W, OX = 0;
const FRAME = { x: 0, y: 0, w: 0, h: 0 };
const cv = document.getElementById('cv');
const vctx = cv.getContext('2d');
const scene = document.createElement('canvas');
const sceneCtx = scene.getContext('2d');
let ctx = sceneCtx;

function resizeCanvas() {
  const game = document.getElementById('game');
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  game.style.width = game.style.height = game.style.aspectRatio = '';
  document.body.style.padding = '';

  if (CFG.fill) {
    VW = Math.max(W, Math.round(H * vw / vh));
    SCALE = Math.min(6, Math.max(2, Math.ceil(Math.min(vh * dpr / H, vw * dpr / VW))));
    game.style.width = vw + 'px';
    game.style.height = vh + 'px';
    game.style.aspectRatio = 'auto';
    document.body.style.padding = '0';
    cv.width = Math.round(vw * dpr);
    cv.height = Math.round(vh * dpr);
  } else {
    VW = W;
    if (CFG.integer) {
      SCALE = Math.max(1, Math.floor(Math.min(vw * dpr / W, vh * dpr / H)));
      game.style.width = (W * SCALE / dpr) + 'px';
      document.body.style.padding = '0';
    } else {
      SCALE = 2;
    }
    cv.width = W * SCALE;
    cv.height = H * SCALE;
  }
  OX = (VW - W) / 2;
  scene.width = VW * SCALE;
  scene.height = H * SCALE;

  // where the scene lands on the visible canvas (fit, centred)
  const k = Math.min(cv.width / scene.width, cv.height / scene.height);
  FRAME.w = Math.round(scene.width * k);
  FRAME.h = Math.round(scene.height * k);
  FRAME.x = Math.round((cv.width - FRAME.w) / 2);
  FRAME.y = Math.round((cv.height - FRAME.h) / 2);

  vctx.imageSmoothingEnabled = false;
  sceneCtx.imageSmoothingEnabled = false;
  if (typeof onResizeFX === 'function') onResizeFX();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Screen position → game coordinates on the 320x180 design grid
function canvasToLogical(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  const px = (clientX - r.left) * cv.width / r.width;
  const py = (clientY - r.top) * cv.height / r.height;
  return {
    x: (px - FRAME.x) / FRAME.w * VW - OX,
    y: (py - FRAME.y) / FRAME.h * H,
  };
}
