// =====================================================================
//  RENDERER — Direct Canvas 2D (pixel-perfect, no WebGL)
// =====================================================================
const W = 320, H = 180;
const SCALE = 2;
const cv = document.getElementById('cv');
cv.width = W * SCALE;
cv.height = H * SCALE;
let ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
