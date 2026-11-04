// =====================================================================
//  EFFECTS — post-processing applied when the scene is presented, plus
//  actor shadows. Each one is a graphics option in Ajustes → Video.
// =====================================================================
function drawScanlines() {
  if (!CFG.scanlines) return;
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < H; y += 2) ctx.fillRect(-OX, y, VW, 1);
  ctx.globalAlpha = 1;
}

function setCRTEnabled() {}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Bloom works on a quarter-size copy: bright-pass, blur, add back on top
const bloomA = makeCanvas(160, 90), bloomB = makeCanvas(160, 90);
const bloomActx = bloomA.getContext('2d'), bloomBctx = bloomB.getContext('2d');

// Film grain at game-pixel resolution so it keeps the pixel grid
const grainFrames = [];
for (let k = 0; k < 4; k++) {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const id = g.createImageData(W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  grainFrames.push(c);
}

let gridPattern = null;
const shadowBuf = makeCanvas(W * SCALE, H * SCALE);
const fpsMeter = { last: 0, frames: 0, fps: 0 };

function onResizeFX() {
  const n = SCALE;
  const p = makeCanvas(n, n), g = p.getContext('2d');
  g.fillStyle = `rgba(0,0,0,${n >= 5 ? 0.32 : 0.22})`;
  g.fillRect(n - 1, 0, 1, n);
  g.fillRect(0, n - 1, n - 1, 1);
  gridPattern = vctx.createPattern(p, 'repeat');
  shadowBuf.width = scene.width;
  shadowBuf.height = scene.height;
}
onResizeFX();

// Draws the actor into a buffer, then stamps it on the floor as a
// flipped, squashed, slanted black silhouette.
function drawActorShadow(a, draw) {
  const sb = shadowBuf.getContext('2d');
  sb.setTransform(1, 0, 0, 1, 0, 0);
  sb.clearRect(0, 0, shadowBuf.width, shadowBuf.height);
  sb.setTransform(SCALE, 0, 0, SCALE, OX * SCALE, 0);
  sb.imageSmoothingEnabled = false;
  const prev = ctx;
  ctx = sb;
  try { draw(); } finally { ctx = prev; }
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.transform(1, 0, -0.9, -0.32, 0, 0);
  ctx.translate(-a.x, -a.y);
  ctx.globalAlpha = 0.38;
  ctx.filter = 'brightness(0)';
  ctx.drawImage(shadowBuf, -OX, 0, VW, H);
  ctx.restore();
}

function present(t) {
  const F = FRAME;
  const scaled = F.w !== scene.width || F.h !== scene.height;
  vctx.save();
  vctx.globalCompositeOperation = 'copy';
  vctx.filter = CFG.grade ? 'contrast(1.1) saturate(1.2) brightness(1.04)' : 'none';
  vctx.imageSmoothingEnabled = scaled;
  vctx.imageSmoothingQuality = 'high';
  if (F.x || F.y) { vctx.fillStyle = '#000'; vctx.fillRect(0, 0, cv.width, cv.height); vctx.globalCompositeOperation = 'source-over'; }
  vctx.drawImage(scene, F.x, F.y, F.w, F.h);
  vctx.restore();

  if (CFG.bloom) {
    bloomActx.globalCompositeOperation = 'copy';
    bloomActx.imageSmoothingEnabled = true;
    bloomActx.filter = 'brightness(0.55) contrast(4) saturate(1.5)';
    bloomActx.drawImage(scene, 0, 0, 160, 90);
    bloomBctx.globalCompositeOperation = 'copy';
    bloomBctx.filter = `blur(${CFG.bloom > 1 ? 4 : 2}px)`;
    bloomBctx.drawImage(bloomA, 0, 0);
    vctx.save();
    vctx.globalCompositeOperation = 'lighter';
    vctx.globalAlpha = CFG.bloom > 1 ? 0.8 : 0.5;
    vctx.imageSmoothingEnabled = true;
    vctx.drawImage(bloomB, F.x, F.y, F.w, F.h);
    vctx.restore();
  }

  if (CFG.grain) {
    vctx.save();
    vctx.globalCompositeOperation = 'overlay';
    vctx.globalAlpha = 0.08;
    vctx.drawImage(grainFrames[Math.floor(t / 50) % grainFrames.length], F.x, F.y, F.w, F.h);
    vctx.restore();
  }

  // the grid only lines up when each game pixel is an exact block on screen
  if (CFG.pixelGrid && SCALE >= 3 && !scaled) {
    vctx.fillStyle = gridPattern;
    vctx.fillRect(0, 0, cv.width, cv.height);
  }

  if (CFG.fps) {
    fpsMeter.frames++;
    if (t - fpsMeter.last >= 500) {
      fpsMeter.fps = Math.round(fpsMeter.frames * 1000 / (t - fpsMeter.last));
      fpsMeter.frames = 0;
      fpsMeter.last = t;
    }
    const s = F.h / H, x0 = F.x + F.w;
    vctx.fillStyle = 'rgba(0,0,0,0.7)';
    vctx.fillRect(x0 - 40 * s, F.y + 2 * s, 38 * s, 10 * s);
    vctx.font = `${9 * s}px VT323, monospace`;
    vctx.fillStyle = fpsMeter.fps >= 50 ? '#3fbf6a' : fpsMeter.fps >= 30 ? '#e8c040' : '#ff4a5a';
    vctx.fillText(`${fpsMeter.fps} FPS`, x0 - 37 * s, F.y + 10 * s);
  }
}
