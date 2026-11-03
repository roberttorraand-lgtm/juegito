// =====================================================================
//  EFFECTS — Lightweight canvas-based post-processing (no WebGL)
// =====================================================================
function drawScanlines() {
  if (!CFG.scanlines) return;
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;
}

function setCRTEnabled() {}
