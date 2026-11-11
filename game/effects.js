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
// flipped, squashed, slanted black silhouette. Only the box around the actor
// is touched, and the silhouette is made black with a composite fill
// (no canvas filter), which keeps this cheap even at high resolutions.
function drawActorShadow(a, draw) {
  const sc = a.scale || 1;
  const bw = Math.ceil(130 * sc), bh = Math.ceil(140 * sc);
  const x0 = Math.floor(a.x + (a.ox || 0) - bw / 2), y0 = Math.floor(a.y - bh + 10);
  const px0 = Math.max(0, (x0 + OX) * SCALE), py0 = Math.max(0, y0 * SCALE);
  const pw = Math.min(shadowBuf.width - px0, (x0 + OX) * SCALE + bw * SCALE - px0);
  const ph = Math.min(shadowBuf.height - py0, y0 * SCALE + bh * SCALE - py0);
  if (pw <= 0 || ph <= 0) return;
  const sb = shadowBuf.getContext('2d');
  sb.setTransform(1, 0, 0, 1, 0, 0);
  sb.clearRect(px0, py0, pw, ph);
  sb.save();
  sb.beginPath(); sb.rect(px0, py0, pw, ph); sb.clip();
  sb.setTransform(SCALE, 0, 0, SCALE, OX * SCALE, 0);
  sb.imageSmoothingEnabled = false;
  const prev = ctx;
  ctx = sb;
  try { draw(); } finally { ctx = prev; sb.restore(); }
  sb.globalCompositeOperation = 'source-in';
  sb.fillStyle = '#000';
  sb.fillRect(px0, py0, pw, ph);
  sb.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.transform(1, 0, -0.9, -0.32, 0, 0);
  ctx.translate(-a.x, -a.y);
  ctx.globalAlpha = 0.38;
  ctx.drawImage(shadowBuf, px0, py0, pw, ph, px0 / SCALE - OX, py0 / SCALE, pw / SCALE, ph / SCALE);
  ctx.restore();
}

function present(t) {
  const F = FRAME;
  const scaled = F.w !== scene.width || F.h !== scene.height;
  vctx.save();
  vctx.globalCompositeOperation = 'copy';
  // colour grading runs as a CSS filter on the canvas: the compositor does it
  // on the GPU, far cheaper than a canvas filter on every frame
  const grade = CFG.grade ? 'contrast(1.1) saturate(1.2) brightness(1.04)' : '';
  if (cv.style.filter !== grade) cv.style.filter = grade;
  vctx.filter = 'none';
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
    vctx.fillStyle = fpsMeter.fps >= 55 ? (fpsMeter.fps >= 100 ? '#3af0ff' : '#3fbf6a') : fpsMeter.fps >= 30 ? '#e8c040' : '#ff4a5a';
    vctx.fillText(`${fpsMeter.fps} FPS`, x0 - 37 * s, F.y + 10 * s);
  }
}
