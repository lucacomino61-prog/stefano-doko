// The relief-engraving material. Tone becomes line: every surface is cut
// into parallel lines whose thickness follows the light, with a second set
// crossing in the shadows, the way an engraver builds a form.
//
// Two outputs:
//   plate  (uOut 0): R = black ink, G = red plate, A = something printed here.
//                    The band composites these with its own misregistration.
//   colour (uOut 1): the finished print, paper and ink, for the brayer.
import * as THREE from 'three';

// Colours go to the shaders as raw sRGB: these shaders write straight to an
// sRGB canvas, so nothing converts them on the way.
export const srgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export const shared = {
  uLight: { value: new THREE.Vector3(-0.55, 0.75, 0.5).normalize() },
  uTime: { value: 0 },
  uPaper: { value: srgb('#EFE6D2') },
  uInk: { value: srgb('#141414') },
  uRed: { value: srgb('#E23B2E') },
  uRes: { value: new THREE.Vector2(1, 1) },
  uLineScale: { value: 1 },
};

const common = /* glsl */ `
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float lineInk(float coord, float w) {
    float l = abs(fract(coord) - 0.5) * 2.0;
    float aa = max(fwidth(coord) * 1.25, 1e-4);
    return 1.0 - smoothstep(w - aa, w + aa, l);
  }
`;

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uWave;
  varying vec3 vW;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec3 p = position;
    if (uWave > 0.0) {
      vec4 wp = modelMatrix * vec4(p, 1.0);
      p.y += uWave * (sin(wp.x * 1.1 + uTime * 1.3) * 0.16 + sin(wp.z * 1.9 - uTime * 0.9) * 0.1 + sin((wp.x + wp.z) * 3.1 + uTime * 2.0) * 0.035);
    }
    vObj = position;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vec4 mv = viewMatrix * w;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform float uTime;
  uniform int uMode;
  uniform float uFreq;
  uniform vec3 uDir;
  uniform float uCross;
  uniform vec3 uCrossDir;
  uniform float uBase;      // 0 paper, 1 black (white-line), 2 red
  uniform float uTone;      // added to darkness
  uniform float uAmbient;
  uniform float uRim;
  uniform float uStripes;
  uniform float uFar;
  uniform float uFlatN;
  uniform float uSolid;     // 1 = all ink
  uniform float uOut;
  uniform float uAlpha;
  uniform sampler2D uMap;
  uniform float uUseMap;
  varying vec3 vW;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec2 vUv;
  varying float vDepth;
  ${common}
  void main() {
    vec3 N = normalize(vN);
    if (uFlatN > 0.5) N = normalize(cross(dFdx(vW), dFdy(vW)));
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vW);
    float lam = max(dot(N, normalize(uLight)), 0.0);
    float shade = uAmbient + (1.0 - uAmbient) * lam;
    float rim = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);
    float dark = clamp(1.0 - shade + uTone + rim * uRim, 0.0, 1.0);

    float ang = atan(vObj.z, vObj.x);
    if (uStripes > 0.0) {
      float panel = floor((ang / 6.28318 + 0.5) * uStripes);
      if (mod(panel, 2.0) > 0.5) dark = clamp(dark + 0.42, 0.0, 1.0);
    }
    float far = smoothstep(18.0, 42.0, vDepth) * uFar;
    dark *= 1.0 - 0.5 * far;

    float coord;
    if (uMode == 0) coord = dot(vW, uDir) * uFreq;
    else if (uMode == 1) coord = vUv.x * uFreq;
    else if (uMode == 2) coord = vUv.y * uFreq;
    else if (uMode == 3) coord = gl_FragCoord.y / uFreq;
    else if (uMode == 4) coord = length(vObj.xy) * uFreq;
    else coord = (ang / 6.28318) * uFreq;
    coord += sin(vW.x * 2.1 + vW.z * 1.3 + vW.y * 0.7) * 0.07;

    float w = smoothstep(0.07, 0.97, dark);
    float ink = 0.0;
    if (uMode == 5) {
      // stipple: dots on a jittered grid, larger where darker
      vec2 g = vW.xz * uFreq;
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5 - (vec2(hash12(cell), hash12(cell + 7.1)) - 0.5) * 0.5;
      float r = sqrt(w) * 0.42 + 0.05 * step(0.6, hash12(cell + 3.3));
      float d = length(f);
      float aa = max(fwidth(g.x), 1e-4) * 1.2;
      ink = 1.0 - smoothstep(r - aa, r + aa, d);
    } else {
      ink = lineInk(coord, w);
    }
    if (uCross > 0.0 && dark > 0.5) {
      float c2 = dot(vW, uCrossDir) * uCross + sin(vW.y * 1.7) * 0.05;
      ink = max(ink, lineInk(c2, smoothstep(0.5, 1.0, dark) * 0.85));
    }
    ink = max(ink, smoothstep(0.6, 0.68, dark)); // shadow sides print as solid relief
    if (uBase > 0.5 && uBase < 1.5) {
      // black block, cut with white lines where the light falls
      float lit = smoothstep(0.25, 1.0, shade + rim * 0.0);
      ink = 1.0 - lineInk(coord, lit * 0.62);
    }
    if (uSolid > 0.5) ink = 1.0;
    if (uUseMap > 0.5) ink = max(ink, texture2D(uMap, vUv).a);
    float red = uBase > 1.5 ? 1.0 : 0.0;

    if (uOut < 0.5) {
      gl_FragColor = vec4(ink, red, 0.0, 1.0);
    } else {
      vec2 px = gl_FragCoord.xy;
      float speck = step(0.93, hash12(floor(px * 0.8))) * 0.08;
      vec3 paper = uPaper * (0.985 + 0.03 * hash12(floor(px * 0.5))) - speck;
      vec3 col = mix(paper, uInk, ink);
      gl_FragColor = vec4(col * uAlpha, uAlpha);
    }
  }
`;

const DEF = {
  mode: 0, freq: 4, dir: [0, 1, 0], cross: 0, crossDir: [1, 0.2, 0.3], base: 0, tone: 0,
  ambient: 0.22, rim: 0.35, stripes: 0, far: 1, flat: 0, solid: 0, out: 0, wave: 0, map: null, side: THREE.FrontSide,
};

export function engrave(opts = {}) {
  const o = { ...DEF, ...opts };
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: o.side,
    transparent: o.out === 1,
    premultipliedAlpha: true,
    blending: o.out === 1 ? THREE.CustomBlending : THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      uLight: shared.uLight,
      uTime: shared.uTime,
      uPaper: shared.uPaper,
      uInk: shared.uInk,
      uMode: { value: o.mode },
      uFreq: { value: o.freq },
      uDir: { value: new THREE.Vector3(...o.dir).normalize() },
      uCross: { value: o.cross },
      uCrossDir: { value: new THREE.Vector3(...o.crossDir).normalize() },
      uBase: { value: o.base },
      uTone: { value: o.tone },
      uAmbient: { value: o.ambient },
      uRim: { value: o.rim },
      uStripes: { value: o.stripes },
      uFar: { value: o.far },
      uFlatN: { value: o.flat },
      uSolid: { value: o.solid },
      uOut: { value: o.out },
      uAlpha: { value: 1 },
      uWave: { value: o.wave },
      uMap: { value: o.map },
      uUseMap: { value: o.map ? 1 : 0 },
    },
  });
}

// Screen-space outline: the back faces pushed out along their normals by a
// fixed number of pixels, so every silhouette is cut with the same tool.
const hullVert = /* glsl */ `
  uniform vec2 uRes;
  uniform float uPx;
  uniform float uLineScale;
  uniform float uTime;
  uniform float uWave;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec2 dir = normalize(n.xy + 1e-5);
    clip.xy += dir * uPx * uLineScale * 2.0 / uRes * clip.w;
    gl_Position = clip;
  }
`;
const hullFrag = /* glsl */ `
  uniform float uOut;
  uniform vec3 uInk;
  uniform float uAlpha;
  void main() {
    if (uOut < 0.5) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    else gl_FragColor = vec4(uInk * uAlpha, uAlpha);
  }
`;

export function hull(px = 1.6, out = 0) {
  return new THREE.ShaderMaterial({
    vertexShader: hullVert,
    fragmentShader: hullFrag,
    side: THREE.BackSide,
    transparent: out === 1,
    blending: out === 1 ? THREE.CustomBlending : THREE.NoBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      uRes: shared.uRes,
      uLineScale: shared.uLineScale,
      uPx: { value: px },
      uOut: { value: out },
      uInk: shared.uInk,
      uAlpha: { value: 1 },
      uTime: shared.uTime,
      uWave: { value: 0 },
    },
  });
}

// Attach an outline copy to a mesh (smooth normals so corners stay closed).
export function outline(mesh, px = 1.6, out = 0) {
  const g = mesh.geometry.clone();
  g.deleteAttribute('uv');
  const merged = mergeForOutline(g);
  const h = new THREE.Mesh(merged, hull(px, out));
  h.renderOrder = -1;
  h.userData.isHull = true;
  mesh.add(h);
  return h;
}

function mergeForOutline(g) {
  // average normals of vertices that share a position
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  if (!nrm) { g.computeVertexNormals(); return g; }
  const map = new Map();
  const key = (i) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    const acc = map.get(k) || [0, 0, 0];
    acc[0] += nrm.getX(i); acc[1] += nrm.getY(i); acc[2] += nrm.getZ(i);
    map.set(k, acc);
  }
  for (let i = 0; i < pos.count; i++) {
    const a = map.get(key(i));
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    nrm.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
  nrm.needsUpdate = true;
  return g;
}
