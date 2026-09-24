// Wet ink. A small stable-fluids solver over the whole viewport: the pointer
// stirs it, and the band and the plates read its velocity to slip their two
// printing plates apart. It sleeps when nothing stirs it.
import * as THREE from 'three';

const baseVert = /* glsl */ `
  uniform vec2 texelSize;
  varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
  void main() {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const head = 'precision highp float; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;\n';

const SH = {
  splat: head + `uniform sampler2D uTarget; uniform float aspect; uniform vec2 point; uniform vec3 color; uniform float radius;
    void main(){ vec2 p = vUv - point; p.x *= aspect; vec3 s = exp(-dot(p, p) / radius) * color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0); }`,
  advect: head + `uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform float dt; uniform float dissipation;
    void main(){ vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize; gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt); }`,
  divergence: head + `uniform sampler2D uVelocity;
    void main(){ float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x; float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy; if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0); }`,
  curl: head + `uniform sampler2D uVelocity;
    void main(){ float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y; float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0); }`,
  vorticity: head + `uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
    void main(){ float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x; float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x; float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
      vec2 v = texture2D(uVelocity, vUv).xy + force * dt; v = clamp(v, -1000.0, 1000.0); gl_FragColor = vec4(v, 0.0, 1.0); }`,
  pressure: head + `uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      float d = texture2D(uDivergence, vUv).x; gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0); }`,
  gradient: head + `uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      vec2 v = texture2D(uVelocity, vUv).xy; v -= vec2(R - L, T - B); gl_FragColor = vec4(v, 0.0, 1.0); }`,
  scale: head + `uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }`,
};

export function createFluid(renderer) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const texel = { value: new THREE.Vector2() };
  const mats = {};
  for (const [k, fs] of Object.entries(SH)) {
    const uniforms = { texelSize: texel };
    mats[k] = new THREE.ShaderMaterial({ vertexShader: baseVert, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  }
  const set = (m, obj) => { for (const [k, v] of Object.entries(obj)) { if (!m.uniforms[k]) m.uniforms[k] = { value: v }; else m.uniforms[k].value = v; } };
  const quad = new THREE.Mesh(tri, mats.splat);
  quad.frustumCulled = false;

  const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
  const double = (w, h) => {
    const o = { a: new THREE.WebGLRenderTarget(w, h, rtOpts), b: new THREE.WebGLRenderTarget(w, h, rtOpts) };
    return { get read() { return o.a; }, get write() { return o.b; }, swap() { [o.a, o.b] = [o.b, o.a]; }, dispose() { o.a.dispose(); o.b.dispose(); }, setSize(W, H) { o.a.setSize(W, H); o.b.setSize(W, H); } };
  };
  let W = 2, H = 2;
  const vel = double(W, H), prs = double(W, H);
  const div = new THREE.WebGLRenderTarget(W, H, rtOpts), crl = new THREE.WebGLRenderTarget(W, H, rtOpts);
  let aspect = 1;
  let idle = 99;
  const splats = [];
  const pt = new THREE.Vector2();
  const col = new THREE.Vector3();

  const pass = (mat, target) => {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(quad, cam);
  };

  function resize(vw, vh) {
    aspect = vw / vh;
    H = 110; W = Math.max(2, Math.round(H * aspect));
    [vel, prs].forEach((d) => d.setSize(W, H));
    div.setSize(W, H); crl.setSize(W, H);
    texel.value.set(1 / W, 1 / H);
    clearAll();
  }
  function clearAll() {
    const prev = renderer.getRenderTarget();
    const cc = new THREE.Color(); renderer.getClearColor(cc); const ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    [vel.read, vel.write, prs.read, prs.write, div, crl].forEach((rt) => { renderer.setRenderTarget(rt); renderer.clear(true, false, false); });
    renderer.setClearColor(cc, ca);
    renderer.setRenderTarget(prev);
  }

  // x, y in 0..1 (bottom-left origin); dx, dy in css px moved this frame
  function splat(x, y, dx, dy) {
    splats.push([x, y, dx, dy]);
    idle = 0;
  }

  function step(dt) {
    if (idle > 2.6) return false;
    idle += dt;
    dt = Math.min(dt, 1 / 30);
    const prevScissor = renderer.getScissorTest();
    renderer.setScissorTest(false);
    for (const [x, y, dx, dy] of splats) {
      pt.set(x, y);
      col.set(dx * 9, dy * 9, 0);
      set(mats.splat, { uTarget: vel.read.texture, aspect, point: pt, color: col, radius: 0.0016 });
      pass(mats.splat, vel.write); vel.swap();
    }
    splats.length = 0;
    set(mats.curl, { uVelocity: vel.read.texture }); pass(mats.curl, crl);
    set(mats.vorticity, { uVelocity: vel.read.texture, uCurl: crl.texture, curl: 18, dt }); pass(mats.vorticity, vel.write); vel.swap();
    set(mats.divergence, { uVelocity: vel.read.texture }); pass(mats.divergence, div);
    set(mats.scale, { uTexture: prs.read.texture, value: 0.8 }); pass(mats.scale, prs.write); prs.swap();
    set(mats.pressure, { uDivergence: div.texture, uPressure: prs.read.texture });
    for (let i = 0; i < 10; i++) { mats.pressure.uniforms.uPressure.value = prs.read.texture; pass(mats.pressure, prs.write); prs.swap(); }
    set(mats.gradient, { uPressure: prs.read.texture, uVelocity: vel.read.texture }); pass(mats.gradient, vel.write); vel.swap();
    set(mats.advect, { uVelocity: vel.read.texture, uSource: vel.read.texture, dt, dissipation: 1.6 }); pass(mats.advect, vel.write); vel.swap();
    renderer.setRenderTarget(null);
    renderer.setScissorTest(prevScissor);
    if (idle > 2.6) clearAll();
    return true;
  }

  // compile every pass now (during the intro), not on the first stir
  function warm() {
    set(mats.splat, { uTarget: vel.read.texture, aspect, point: pt, color: col, radius: 0.0016 });
    set(mats.curl, { uVelocity: vel.read.texture });
    set(mats.vorticity, { uVelocity: vel.read.texture, uCurl: crl.texture, curl: 18, dt: 0.016 });
    set(mats.divergence, { uVelocity: vel.read.texture });
    set(mats.scale, { uTexture: prs.read.texture, value: 0.8 });
    set(mats.pressure, { uDivergence: div.texture, uPressure: prs.read.texture });
    set(mats.gradient, { uPressure: prs.read.texture, uVelocity: vel.read.texture });
    set(mats.advect, { uVelocity: vel.read.texture, uSource: vel.read.texture, dt: 0.016, dissipation: 1.6 });
    // compiled against a render target, which is what they draw into
    renderer.setRenderTarget(vel.write);
    for (const m of Object.values(mats)) { quad.material = m; renderer.compile(quad, cam); }
    renderer.setRenderTarget(null);
  }

  return { resize, splat, step, warm, get texture() { return vel.read.texture; }, get awake() { return idle <= 2.6; } };
}
