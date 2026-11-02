// =====================================================================
//  EFFECTS — CRT + bloom post-processing shader
// =====================================================================
const CRT_FRAG = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform vec2 uResolution;

const float curvature = 10.0;
const float scanStr = 0.08;
const float vigStr = 0.08;
const float chroma = 0.0012;
const float bloomStr = 0.12;

vec2 curve(vec2 uv){
  uv = uv*2.0-1.0;
  vec2 o = abs(uv.yx)/curvature;
  uv = uv + uv*o*o;
  return uv*0.5+0.5;
}

void main(){
  vec2 uv = curve(vTextureCoord);
  if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){gl_FragColor=vec4(0.0);return;}

  float r = texture2D(uSampler, vec2(uv.x+chroma, uv.y)).r;
  float g = texture2D(uSampler, uv).g;
  float b = texture2D(uSampler, vec2(uv.x-chroma, uv.y)).b;
  vec3 col = vec3(r,g,b);

  vec3 bloom = vec3(0.0);
  vec2 tx = 1.0/uResolution;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){
    vec3 s = texture2D(uSampler, uv+vec2(float(x),float(y))*tx*2.0).rgb;
    float lum = dot(s, vec3(0.299,0.587,0.114));
    bloom += s * smoothstep(0.15,0.5,lum);
  }
  bloom /= 9.0;
  col += bloom * bloomStr;

  float sl = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
  col *= 1.0 - scanStr*(1.0-sl);

  float vig = uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);
  col *= smoothstep(0.0, vigStr, vig) * 0.6 + 0.4;

  float gray = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(gray), col, 1.25);

  col *= 0.985 + 0.015*sin(uTime*4.0);
  col *= 1.35;

  gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
}
`;

const crtFilter = new PIXI.Filter(null, CRT_FRAG, {
  uTime: 0.0,
  uResolution: [320.0, 180.0],
});

if (CFG.scanlines) gameSprite.filters = [crtFilter];

function updateEffects(t) {
  crtFilter.uniforms.uTime = t * 0.001;
}

function setCRTEnabled(on) {
  gameSprite.filters = on ? [crtFilter] : [];
}
