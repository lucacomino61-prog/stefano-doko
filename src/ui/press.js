// The hand-fed press: every change of state lands with a small judder, the
// way a sheet settles under the platen. And the press's sounds, synthesised
// on the spot (no audio files), off until the visitor turns them on.
import gsap from 'gsap';
import { state } from '../state.js';

export function judder(el, strength = 1) {
  if (!el || state.reduced) return;
  const s = strength;
  gsap.timeline({ defaults: { duration: 0.045, ease: 'none' } })
    .to(el, { x: -2 * s, y: 1 * s })
    .to(el, { x: 2 * s, y: -1 * s })
    .to(el, { x: -1 * s, y: 0.5 * s })
    .to(el, { x: 0, y: 0, duration: 0.08, ease: 'power2.out', clearProps: 'x,y' });
}

let ctx = null;
let master = null;
let rollGain = null;
let noiseBuf = null;

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // the brayer's rumble: looped noise through a low filter, gain follows speed
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  rollGain = ctx.createGain(); rollGain.gain.value = 0;
  src.connect(lp).connect(rollGain).connect(master);
  src.start();
  return ctx;
}

function noise(dur, type, freq, q, gain) {
  const c = audio(); if (!c) return;
  const src = c.createBufferSource(); src.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); const t = c.currentTime;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 1.2); src.stop(t + dur + 0.02);
}

function thump(freq, dur, gain) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain(); const t = c.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const sound = {
  enable(on) {
    state.sound = on;
    if (on) { const c = audio(); c?.resume(); } else if (rollGain) rollGain.gain.value = 0;
  },
  press() { if (!state.sound) return; noise(0.07, 'highpass', 1800, 0.7, 0.35); thump(92, 0.16, 0.6); },
  paper() { if (!state.sound) return; noise(0.32, 'bandpass', 2400, 0.5, 0.18); },
  tick() { if (!state.sound) return; noise(0.018, 'bandpass', 3800, 3, 0.2); },
  jump() {
    if (!state.sound) return;
    const c = audio(); if (!c) return;
    const o = c.createOscillator(); const g = c.createGain(); const t = c.currentTime;
    o.type = 'square'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(660, t + 0.09);
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
  },
  splat() { if (!state.sound) return; noise(0.22, 'lowpass', 500, 0.8, 0.5); thump(60, 0.25, 0.5); },
  roll(speed) {
    if (!rollGain || !ctx) return;
    const target = state.sound ? Math.min(0.22, speed * 0.0009) : 0;
    rollGain.gain.setTargetAtTime(target, ctx.currentTime, 0.06);
  },
};
