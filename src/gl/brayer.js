// The brayer: a hand ink roller. It rolls across each sheet head and the
// type takes ink under it. Drawn with the same engraving material as the
// band, but printed straight onto the page in paper and ink.
import * as THREE from 'three';
import { engrave, outline, shared } from './engrave.js';

export function createBrayer() {
  const group = new THREE.Group();   // placed and scaled in screen pixels
  const tilt = new THREE.Group();    // the resting swing
  group.add(tilt);
  const mats = [];
  const hulls = [];
  const put = (geo, mat, pos = [0, 0, 0], rot, line = 1.5) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (rot) m.quaternion.copy(rot);
    if (line) hulls.push(outline(m, line, 1));
    return m;
  };
  const mk = (o) => { const m = engrave({ ...o, out: 1, far: 0 }); mats.push(m); return m; };

  const rubber = mk({ mode: 1, freq: 30, base: 1, ambient: 0.12, rim: 0 });
  const metal = mk({ mode: 0, freq: 70, dir: [0, 1, 0], rim: 0.7, ambient: 0.3, tone: 0.08 });
  const rod = mk({ mode: 1, freq: 10, rim: 0.8, ambient: 0.35, tone: 0.1 });
  const wood = mk({ mode: 1, freq: 16, cross: 60, crossDir: [0.2, 1, 0.1], rim: 0.6, ambient: 0.3, tone: 0.06 });

  // roller along Y, rolling toward +X
  const roller = put(new THREE.CylinderGeometry(0.17, 0.17, 1.0, 56, 1), rubber, [0, 0, 0], null, 1.6);
  tilt.add(roller);
  [0.515, -0.515].forEach((y) => {
    const hub = put(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 32), metal, [0, y, 0], null, 1.2);
    tilt.add(hub);
    tilt.add(put(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), metal, [0, y + Math.sign(y) * 0.06, 0], null, 1));
  });

  // the fork: two wire arms meeting behind and below the roller
  const J = new THREE.Vector3(-0.42, -0.2, 0.44);
  [1, -1].forEach((s) => {
    const arm = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, s * 0.56, 0),
      new THREE.Vector3(-0.02, s * 0.64, 0.03),
      new THREE.Vector3(-0.16, s * 0.6, 0.16),
      new THREE.Vector3(-0.32, s * 0.3 - 0.1, 0.34),
      J.clone(),
    ]);
    tilt.add(put(new THREE.TubeGeometry(arm, 40, 0.024, 8), rod, [0, 0, 0], null, 1.1));
  });

  // the turned wooden handle
  const d = new THREE.Vector3(-0.86, -0.52, 0.36).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const prof = [[0, 0], [0.05, 0], [0.05, 0.09], [0.068, 0.11], [0.08, 0.3], [0.074, 0.56], [0.062, 0.72], [0.07, 0.78], [0.055, 0.84], [0, 0.85]];
  const handle = put(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40), wood, [J.x, J.y, J.z], q, 1.5);
  tilt.add(handle);
  tilt.add(put(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 24), metal, [J.x + d.x * 0.05, J.y + d.y * 0.05, J.z + d.z * 0.05], q, 1.1));

  // a soft shadow where the roller sits on the paper
  const shadowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uInk: shared.uInk, uAlpha: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uInk; uniform float uAlpha; varying vec2 vUv; void main(){ vec2 p = vUv * 2.0 - 1.0; float a = (1.0 - smoothstep(0.15, 1.0, length(p))) * 0.3 * uAlpha; gl_FragColor = vec4(uInk * a, a); }',
  });
  mats.push(shadowMat);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.4), shadowMat);
  shadow.position.set(0.1, -0.06, -0.3);
  shadow.renderOrder = -5;
  group.add(shadow);

  // three-quarter view: see a little of the roller's top and the handle's length
  tilt.rotation.set(0.32, -0.42, 0.02);

  const state = { spin: 0, lastX: null, alpha: 0 };

  function place({ x, y, len, u, visible }, vw, vh, dt) {
    const target = visible ? 1 : 0;
    if (state.lastX !== null && Math.abs(x - state.lastX) > Math.max(220, len * 2.5)) state.alpha = 0; // no streaks across the page
    state.alpha += (target - state.alpha) * Math.min(1, dt * 10);
    if (state.lastX !== null && visible) state.spin += (x - state.lastX) / (0.17 * len);
    state.lastX = x;
    roller.rotation.y = state.spin;
    group.position.set(x - vw / 2, vh / 2 - y, 0);
    group.scale.setScalar(len);
    const rest = THREE.MathUtils.smoothstep(u ?? 0, 0.9, 1);
    tilt.rotation.y = -0.42 + rest * 0.55;
    tilt.rotation.z = 0.02 - rest * 0.12;
    mats.forEach((m) => { m.uniforms.uAlpha.value = state.alpha; });
    hulls.forEach((h) => { h.material.uniforms.uAlpha.value = state.alpha; });
    group.visible = state.alpha > 0.01;
    api.fading = Math.abs(target - state.alpha) > 0.01;
  }

  const api = { group, place, fading: false };
  return api;
}
