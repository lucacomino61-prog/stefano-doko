// One WebGL canvas over the whole sheet. Each frame it draws only what is
// on screen: the engraving band into its box, the work plates into theirs,
// and the brayer wherever it is rolling. It is called by the one clock in
// main.js and never runs a loop of its own.
import * as THREE from 'three';
import { shared } from './engrave.js';
import { createBand } from './band.js';
import { createBrayer } from './brayer.js';
import { createPlates } from './plates.js';
import { createFluid } from './fluid.js';
import { state, bus, clamp } from '../state.js';
import { roller } from '../ui/ink.js';
import { sound } from '../ui/press.js';

const compositeFrag = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tVel;
  uniform vec2 uCanvas;
  uniform vec2 uView;
  uniform float uDpr;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform vec3 uRed;
  uniform float uSplit;
  varying vec2 vUv;
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 uv = vUv;
    vec2 px = uv * uView;
    vec2 vel = texture2D(tVel, gl_FragCoord.xy / uCanvas).xy;
    vec2 k = 1.0 / uView;
    // the black plate and the red plate slip apart where the ink is stirred
    vec2 offB = vel * 0.16 * k;
    vec2 offR = -vel * 0.26 * k + vec2(1.1, -0.8) * k;
    vec4 A = texture2D(tScene, uv + offB);
    vec4 B = texture2D(tScene, uv + offR);
    float ink = A.r;
    float red = mix(1.0, B.g, B.a);
    float starve = smoothstep(0.74, 0.96, vnoise(px * 0.011 + 11.0)) * 0.13 + step(0.9965, hash12(floor(px * 1.3))) * 0.55;
    red *= 1.0 - starve;
    vec3 redCol = uRed * (0.93 + 0.09 * vnoise(px * 0.06));
    vec3 paper = uPaper * (0.97 + 0.05 * hash12(floor(px * 0.6)));
    vec3 col = mix(paper, redCol, clamp(red, 0.0, 1.0));
    float pin = 1.0 - step(0.995, hash12(floor(px * 1.1) + 3.0)) * 0.85;
    col = mix(col, uInk, clamp(ink, 0.0, 1.0) * pin);
    // the heavy ink ground under each cut, with a paper hairline above it
    float panelH = uSplit > 0.5 ? uView.y * 0.5 : uView.y;
    float by = mod(uv.y * uView.y, panelH);
    float ground = step(by, 11.0) * (1.0 - step(0.992, hash12(floor(px * 0.9) + 9.0)) * 0.8);
    col = mix(col, uPaper, step(12.5, by) * step(by, 14.5));
    col = mix(col, uInk, ground);
    // two panels on a narrow sheet: a paper gutter with a rule down its middle
    if (uSplit > 0.5) {
      float d = abs(uv.y - 0.5) * uView.y;
      col = mix(col, uPaper, step(d, 6.0));
      col = mix(col, uInk, step(d, 1.2));
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;
const fullVert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function fullTri() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
}

export function createStage(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return null; }
  const dpr = Math.min(window.devicePixelRatio || 1, state.mobile ? 2 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  shared.uLineScale.value = dpr;

  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // the engraving band (and the wet ink it is stirred with) only where a sheet
  // carries one; the other sheets need just the plates and the brayer
  const hasBand = !!document.querySelector('[data-gl="band"], [data-edition]');
  const band = hasBand ? createBand() : null;
  const bandRT = new THREE.WebGLRenderTarget(4, 4, { samples: hasBand ? 4 : 0, depthBuffer: hasBand });
  const composite = new THREE.Mesh(fullTri(), new THREE.ShaderMaterial({
    vertexShader: fullVert,
    fragmentShader: compositeFrag,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tScene: { value: bandRT.texture },
      tVel: { value: null },
      uCanvas: { value: new THREE.Vector2(1, 1) },
      uView: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: dpr },
      uPaper: shared.uPaper,
      uInk: shared.uInk,
      uRed: shared.uRed,
      uSplit: { value: 0 },
    },
  }));
  composite.frustumCulled = false;

  const plates = createPlates();
  const brayer = createBrayer();
  const overlay = new THREE.Scene();
  overlay.add(brayer.group);
  const overlayCam = new THREE.PerspectiveCamera(20, 1, 1, 20000);
  const fluid = hasBand ? createFluid(renderer) : null;
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blank.needsUpdate = true;

  let bandEls = [...document.querySelectorAll('[data-gl="band"]')];
  bus.on('edition', () => { bandEls = [...document.querySelectorAll('[data-gl="band"]')]; });
  let vw = 0, vh = 0;
  const buf = new THREE.Vector2();
  let drewLast = true;

  function resize() {
    vw = state.vw; vh = state.vh;
    renderer.setSize(vw, vh, false);
    renderer.getDrawingBufferSize(buf);
    overlayCam.aspect = vw / vh;
    overlayCam.position.set(0, 0, vh / 2 / Math.tan(THREE.MathUtils.degToRad(10)));
    overlayCam.near = 10; overlayCam.far = overlayCam.position.z * 3;
    overlayCam.updateProjectionMatrix();
    fluid?.resize(vw, vh);
    band?.setLineSpacing(4.4 * dpr);
  }
  resize();

  // Compile every shader while the intro is still counting, so the first
  // stir, the first plate and the first pass of the brayer cost nothing.
  function warm() {
    if (band) {
      band.aim(4, 'full');
      renderer.setRenderTarget(bandRT);
      renderer.compile(band.scene, band.camera);
      renderer.setRenderTarget(null);
      renderer.compile(composite, orthoCam);
    }
    renderer.compile(overlay, overlayCam);
    const probe = plates.add(document.createElement('figure').appendChild(document.createElement('img')).parentElement, []);
    plates.list.splice(plates.list.indexOf(probe), 1);
    renderer.compile(probe.mesh, orthoCam);
    probe.mat.dispose();
    fluid?.warm();
  }
  warm();
  if (import.meta.env.DEV && band) console.info(`band: ${band.draws} meshes after merging`);

  // scissor to the part of a rect that is on screen and above an occluding sheet
  function clipTo(r, occTop = Infinity) {
    const top = Math.max(0, r.top), bottom = Math.min(vh, r.bottom, occTop);
    const left = Math.max(0, r.left), right = Math.min(vw, r.right);
    if (bottom <= top || right <= left) return false;
    renderer.setScissor(left, vh - bottom, right - left, bottom - top);
    renderer.setScissorTest(true);
    return true;
  }

  const p = state.pointer;
  const bands = [];
  const live = [];

  // With no pointer to stir it (a phone), a tap on the band flicks the wet
  // ink outward from the fingertip. The events only note the tap; the frame
  // splats it, so the one clock stays the only thing that draws.
  const taps = [];
  if (fluid && !state.fine) {
    let down = null;
    window.addEventListener('pointerdown', (e) => {
      down = e.pointerType === 'touch' && !state.reduced && e.target.closest?.('[data-gl="band"]') ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
    }, { passive: true });
    window.addEventListener('pointerup', (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && e.timeStamp - down.t < 350) taps.push([e.clientX, e.clientY]);
      down = null;
    }, { passive: true });
    window.addEventListener('pointercancel', () => { down = null; }, { passive: true });
  }
  let lastScroll = -1, lastRX = NaN, lastRY = NaN, lastRV = false, bandAcc = 1, forced = 2;
  bus.on('refit', () => { forced = 2; bandAcc = 1; });
  bus.on('resize', () => { forced = 2; bandAcc = 1; });
  bus.on('lang', () => { forced = 2; });
  bus.on('proof', () => { forced = 2; });

  // what is on screen this frame: reads only, done in the tick's read phase
  function measure() {
    bands.length = 0;
    live.length = 0;
    for (const el of bandEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh && r.width > 0) bands.push(r);
    }
    for (const pl of plates.list) {
      if (!pl.ready) continue;
      const r = pl.imgEl.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh && r.width > 4) {
        pl.rect = r;
        pl.occTop = pl.occluder ? pl.occluder.getBoundingClientRect().top : Infinity;
        live.push(pl);
      }
    }
  }

  function frame(t, dt) {
    shared.uTime.value = t;
    // stir the ink where there is ink to stir
    let stirred = false;
    if (fluid && p.moved && state.fine && !state.reduced) {
      for (const r of bands) {
        if (p.x > r.left - 40 && p.x < r.right + 40 && p.y > r.top - 40 && p.y < r.bottom + 40) {
          fluid.splat(p.x / vw, 1 - p.y / vh, p.vx, -p.vy);
          stirred = true;
          break;
        }
      }
    }
    if (taps.length) {
      // a ring of pushes outward from the tap, over four frames and fading,
      // the way a mouse stirs over many (one push in one frame barely shows)
      for (const tap of taps) {
        if (tap[2] === undefined) { tap[2] = 4; sound.splat(); }
        const [x, y, left] = tap;
        const k = left / 4;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2, ox = Math.cos(a), oy = Math.sin(a);
          fluid.splat((x + ox * 9) / vw, 1 - (y + oy * 9) / vh, ox * 52 * k, -oy * 52 * k);
        }
        tap[2] = left - 1;
      }
      for (let i = taps.length - 1; i >= 0; i--) if (taps[i][2] <= 0) taps.splice(i, 1);
      stirred = true;
    }
    const stirring = fluid ? fluid.step(dt) : false;
    const vel = fluid && (stirring || fluid.awake) ? fluid.texture : blank;

    const brayerOn = roller.visible || brayer.group.visible;
    if (!bands.length && !live.length && !brayerOn) {
      if (drewLast) { renderer.setRenderTarget(null); renderer.setScissorTest(false); renderer.clear(); drewLast = false; }
      return;
    }

    // Draw only when something changed. The engraving itself is re-cut at
    // 30 fps (it moves slowly), or every frame while the pointer works it.
    const scrolled = state.scroll !== lastScroll;
    lastScroll = state.scroll;
    let platesChanged = false;
    for (const pl of live) {
      const r = pl.rect;
      const over = state.fine && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
      const target = over ? 1 : 0;
      if (Math.abs(target - pl.loupe) > 0.002 || (over && p.moved)) platesChanged = true;
      pl.loupe += (target - pl.loupe) * Math.min(1, dt * 12);
      if (Math.abs(target - pl.loupe) < 0.002) pl.loupe = target;
      if (pl.develop !== pl.drawnDevelop || pl.leader !== pl.drawnLeader) platesChanged = true;
    }
    const br = bands[0];
    const insideBand = !!br && state.fine && p.x >= br.left && p.x <= br.right && p.y >= br.top && p.y <= br.bottom;
    bandAcc += dt;
    const bandDue = !!br && (forced > 0 || (!state.reduced && (insideBand || bandAcc >= 1 / 30)));
    const brayerMoved = brayerOn && (roller.x !== lastRX || roller.y !== lastRY || roller.visible !== lastRV || brayer.fading);
    lastRX = roller.x;
    lastRY = roller.y;
    lastRV = roller.visible;
    if (!(scrolled || bandDue || stirring || stirred || platesChanged || brayerMoved || forced > 0)) return;
    if (forced > 0) forced--;

    drewLast = true;
    renderer.setRenderTarget(null);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, vw, vh);
    renderer.clear();

    // the band (the front page's, or the next edition's copy of it)
    if (br) {
      const w = Math.max(4, Math.round(br.width * dpr)), h = Math.max(4, Math.round(br.height * dpr));
      const resized = bandRT.width !== w || bandRT.height !== h;
      if (resized) bandRT.setSize(w, h);
      const aspect = br.width / br.height;
      const split = aspect < 2.4;
      if (bandDue || resized) {
        band.update(t, Math.min(bandAcc, 0.1), {
          px: ((p.x - br.left) / br.width) * 2 - 1,
          py: ((p.y - br.top) / br.height) * 2 - 1,
          inside: insideBand,
          still: state.reduced,
        });
        bandAcc = 0;
        shared.uRes.value.set(w, h);
        bandRT.scissorTest = false;
        bandRT.viewport.set(0, 0, w, h);
        renderer.setRenderTarget(bandRT);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        if (!split) {
          band.aim(aspect, 'full');
          renderer.render(band.scene, band.camera);
        } else {
          const hh = Math.floor(h / 2);
          for (const [panel, y, ph] of [['left', hh, h - hh], ['right', 0, hh]]) {
            bandRT.viewport.set(0, y, w, ph);
            bandRT.scissor.set(0, y, w, ph);
            bandRT.scissorTest = true;
            renderer.setRenderTarget(bandRT);
            shared.uRes.value.set(w, ph);
            band.aim(w / ph, panel);
            renderer.render(band.scene, band.camera);
          }
          bandRT.scissorTest = false;
          bandRT.viewport.set(0, 0, w, h);
        }
        renderer.setRenderTarget(null);
      }
      const u = composite.material.uniforms;
      u.uSplit.value = split ? 1 : 0;
      u.tVel.value = vel;
      u.uCanvas.value.copy(buf);
      for (const r of bands) {
        u.uView.value.set(r.width, r.height);
        renderer.setViewport(r.left, vh - r.bottom, r.width, r.height);
        if (clipTo(r)) renderer.render(composite, orthoCam);
        renderer.setScissorTest(false);
      }
    }

    // the plates
    for (const pl of live) {
      const r = pl.rect;
      const u = pl.mat.uniforms;
      u.uMouse.value.set(p.x - r.left, p.y - r.top);
      u.uLoupe.value = pl.loupe;
      u.uLoupeR.value = Math.min(96, r.width * 0.26);
      u.uDevelop.value = state.reduced ? 1 : pl.develop;
      u.uLeader.value = state.reduced ? 1 : pl.leader;
      pl.drawnDevelop = pl.develop;
      pl.drawnLeader = pl.leader;
      u.uView.value.set(r.width, r.height);
      u.uCanvas.value.copy(buf);
      u.uDpr.value = dpr;
      renderer.setViewport(r.left, vh - r.bottom, r.width, r.height);
      if (clipTo(r, pl.occTop)) renderer.render(pl.mesh, orthoCam);
      renderer.setScissorTest(false);
    }

    // the brayer
    if (brayerOn) {
      brayer.place(roller, vw, vh, dt);
      if (brayer.group.visible) {
        shared.uRes.value.copy(buf);
        shared.uLight.value.set(-0.45, 0.8, 0.62).normalize();
        renderer.setViewport(0, 0, vw, vh);
        if (roller.clipBottom < vh) {
          if (clipTo({ top: 0, bottom: vh, left: 0, right: vw }, roller.clipBottom)) renderer.render(overlay, overlayCam);
        } else {
          renderer.render(overlay, overlayCam);
        }
        renderer.setScissorTest(false);
      }
    }
  }

  // Upload the screenshot textures while the reader is still on the front
  // page, one per idle moment, so no upload lands in the middle of a scroll.
  function primePlates() {
    const queue = plates.list.slice();
    const later = (f) => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout: 900 }) : setTimeout(f, 80));
    const next = () => {
      const pl = queue.shift();
      if (!pl) return;
      pl.load(() => { if (pl.tex) renderer.initTexture(pl.tex); later(next); });
    };
    later(next);
  }

  function addPlate(figure, anchors, occluder) {
    const pl = plates.add(figure, anchors);
    pl.occluder = occluder;
    return pl;
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.documentElement.classList.remove('gl-on');
  });

  return { measure, frame, resize, addPlate, primePlates };
}
