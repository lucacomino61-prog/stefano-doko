// The work plates. Each screenshot first prints as a line-engraved proof,
// then develops into its true colour under a wet-ink edge as the sheet is
// read. A printer's loupe follows the pointer over a plate: magnified, true
// colour, a glass rim that bends the image at its edge. The callout leaders
// that reach into a plate are drawn here, so they sit on top of the picture.
import * as THREE from 'three';
import { shared } from './engrave.js';

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
  uniform sampler2D tImg;
  uniform vec2 uView;       // plate size, css px
  uniform vec2 uCanvas;     // drawing buffer, device px
  uniform float uDpr;
  uniform float uDevelop;
  uniform vec2 uMouse;      // css px from the plate's top-left
  uniform float uLoupe;     // 0..1
  uniform float uLoupeR;
  uniform float uZoom;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform vec3 uAnchors[8]; // x, y (0..1 from top-left), exit side (+1 right, -1 left)
  uniform float uCount;
  uniform float uLeader;    // 0..1 drawn
  uniform float uTime;
  uniform float uRadius;    // css px: the picture's corners (style.css .plate__mount img)
  varying vec2 vUv;

  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  vec3 img(vec2 uvTop) { return texture2D(tImg, vec2(uvTop.x, 1.0 - uvTop.y)).rgb; }
  float lineInk(float coord, float w) {
    float l = abs(fract(coord) - 0.5) * 2.0;
    float aa = max(fwidth(coord) * 1.25, 1e-4);
    return 1.0 - smoothstep(w - aa, w + aa, l);
  }

  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 px = uv * uView;

    vec3 colour = img(uv);
    vec3 col = colour;
    // once a plate has developed there is nothing left to engrave: skip it
    if (uDevelop < 0.999) {
      // the proof: a line screen cut from the picture's tone
      float lum = dot(texture2D(tImg, vec2(uv.x, 1.0 - uv.y), 1.3).rgb, vec3(0.3, 0.59, 0.11));
      float dark = pow(1.0 - lum, 0.9);
      float coord = px.y / 3.4 + sin(px.x * 0.018 + px.y * 0.004) * 0.35;
      float ink = lineInk(coord, smoothstep(0.04, 0.96, dark));
      vec3 paper = uPaper * (0.975 + 0.05 * hash12(floor(px * 0.7)));
      vec3 proof = mix(paper, uInk, ink * (0.92 + 0.08 * vnoise(px * 0.08)));
      // developing: true colour arrives from the top under a ragged wet edge
      float t = uDevelop * 1.3 - 0.15;
      float edgeN = ((vnoise(vec2(px.x * 0.03, 3.0)) - 0.5) * 24.0 + (vnoise(px * 0.2) - 0.5) * 3.0) / uView.y;
      float front = uv.y + edgeN - t;
      float dev = 1.0 - smoothstep(-0.006, 0.006, front);
      col = mix(proof, colour, dev);
      float wet = exp(-pow(front * uView.y / 2.2, 2.0)) * step(0.001, uDevelop);
      col = mix(col, uInk, wet * 0.6);
    }

    // the loupe
    if (uLoupe > 0.001) {
      float R = uLoupeR * uLoupe;
      vec2 d = px - uMouse;
      float r = length(d);
      if (r < R + 2.0) {
        float k = clamp(r / max(R, 1.0), 0.0, 1.0);
        float bend = 1.0 - sqrt(max(0.0, 1.0 - k * k));
        vec2 dir = d / max(r, 1e-3);
        vec2 src = uMouse + d / uZoom - dir * bend * R * 0.22;
        vec3 lc = img(src / uView);
        float inside = 1.0 - smoothstep(R - 1.0, R + 0.5, r);
        col = mix(col, lc, inside);
        float ring = 1.0 - smoothstep(1.2, 2.6, abs(r - R));
        float ring2 = 1.0 - smoothstep(0.6, 1.4, abs(r - R + 5.0));
        col = mix(col, uInk, max(ring, ring2 * 0.8));
      }
    }

    // callout leaders: a ring on the detail and a rule out to the plate's edge
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uCount) break;
      vec3 a = uAnchors[i];
      vec2 ap = a.xy * uView;
      float grow = clamp(uLeader * 1.6 - float(i) * 0.08, 0.0, 1.0);
      if (grow <= 0.0) continue;
      float rr = length(px - ap);
      float ringOut = 1.0 - smoothstep(6.0, 7.2, rr);
      float ringIn = 1.0 - smoothstep(3.4, 4.6, rr);
      col = mix(col, uPaper, ringOut * grow);
      col = mix(col, uInk, (ringOut - ringIn) * grow);
      col = mix(col, uInk, ringIn * 0.0);
      float edgeX = a.z > 0.0 ? uView.x : 0.0;
      float x0 = ap.x + a.z * 7.0;
      float x1 = mix(x0, edgeX, grow);
      float onSeg = step(min(x0, x1), px.x) * step(px.x, max(x0, x1));
      float lineD = abs(px.y - ap.y);
      float ln = (1.0 - smoothstep(0.55, 1.35, lineD)) * onSeg;
      float halo = (1.0 - smoothstep(1.4, 3.2, lineD)) * onSeg;
      col = mix(col, uPaper, halo * 0.7 * grow);
      col = mix(col, uInk, ln * grow);
    }
    // the rounded corners of the box it is drawn into (style.css): outside
    // them the canvas is left clear, so the paper shows; written premultiplied
    vec2 rq = abs(px - uView * 0.5) - (uView * 0.5 - uRadius);
    float rd = length(max(rq, 0.0)) + min(max(rq.x, rq.y), 0.0) - uRadius;
    float ra = uRadius > 0.0 ? 1.0 - smoothstep(-0.7, 0.7, rd) : 1.0;
    gl_FragColor = vec4(col * ra, ra);
  }
`;

export function createPlates() {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const list = [];

  function add(figure, anchors = []) {
    const imgEl = figure.querySelector('img');
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tImg: { value: null },
        uView: { value: new THREE.Vector2(1, 1) },
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uDpr: { value: 1 },
        uDevelop: { value: 0 },
        uMouse: { value: new THREE.Vector2(-999, -999) },
        uLoupe: { value: 0 },
        uLoupeR: { value: 86 },
        uZoom: { value: 2.3 },
        uPaper: shared.uPaper,
        uInk: shared.uInk,
        uAnchors: { value: Array.from({ length: 8 }, (_, i) => new THREE.Vector3(...(anchors[i] || [0, 0, 1]))) },
        uCount: { value: anchors.length },
        uLeader: { value: 0 },
        uTime: shared.uTime,
        uRadius: { value: parseFloat(getComputedStyle(imgEl).borderTopLeftRadius) || 0 },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    const plate = { figure, imgEl, mat, mesh, ready: false, develop: 0, leader: 0, loupe: 0, occluder: null, drawnDevelop: -1, drawnLeader: -1, occTop: Infinity };
    const load = (cb) => {
      if (plate.ready) { if (cb) cb(); return; }
      if (plate.loading) { if (cb) plate.waiting.push(cb); return; }
      plate.loading = true;
      plate.waiting = cb ? [cb] : [];
      const done = () => {
        const tex = new THREE.Texture(imgEl);
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        mat.uniforms.tImg.value = tex;
        plate.tex = tex;
        plate.ready = true;
        figure.classList.add('is-gl');
        plate.waiting.forEach((f) => f());
        plate.waiting.length = 0;
      };
      if (imgEl.complete && imgEl.naturalWidth) done();
      else { imgEl.loading = 'eager'; imgEl.addEventListener('load', done, { once: true }); }
    };
    plate.load = load;
    list.push(plate);
    return plate;
  }

  return { cam, list, add };
}
