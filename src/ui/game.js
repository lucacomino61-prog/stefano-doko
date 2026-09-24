// Jump the ink: the back-page amusement. A wood-type S runs along the
// composing stick and hops over blots of ink and spilled quads. Driven by the
// sheet's one clock, and only while it is on screen.
import { state, bus } from '../state.js';
import { sound } from './press.js';

const BEST = 'sd-best';

export function initGame() {
  const canvas = document.querySelector('[data-game]');
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  const scoreEl = document.querySelector('[data-game-score]');
  const bestEl = document.querySelector('[data-game-best]');
  const live = document.querySelector('[data-game-status]');
  let best = 0;
  try { best = +localStorage.getItem(BEST) || 0; } catch { /* private mode */ }
  bestEl.textContent = String(best);

  let W = 0, H = 0, dpr = 1, ground = 0;
  let mode = 'idle';
  let visible = false;
  const S = { x: 64, y: 0, vy: 0, w: 38, h: 50, onGround: true, inked: false };
  let obstacles = [], speed = 330, spawnIn = 1.1, score = 0, scroll = 0, t = 0;
  let colors = { ink: '#141414', paper: '#EFE6D2', aged: '#E3D6BA', alarm: '#E23B2E' };

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    colors = { ink: cs.getPropertyValue('--ink').trim() || colors.ink, paper: cs.getPropertyValue('--paper').trim() || colors.paper, aged: cs.getPropertyValue('--aged').trim() || colors.aged, alarm: cs.getPropertyValue('--alarm').trim() || colors.alarm };
  };
  bus.on('proof', () => setTimeout(() => { readColors(); draw(); }, 850));

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ground = H - 46;
    if (S.onGround) S.y = ground - S.h;
    draw();
  }

  function blob(w, h) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.72 + Math.random() * 0.36;
      pts.push([Math.cos(a) * r * w / 2, Math.sin(a) * r * h / 2]);
    }
    return pts;
  }
  function spawn() {
    const kind = Math.random() < 0.65 ? 'blot' : 'quad';
    const w = kind === 'blot' ? 26 + Math.random() * 30 : 16 + Math.random() * 14;
    const h = kind === 'blot' ? 18 + Math.random() * 22 : 22 + Math.random() * 20;
    obstacles.push({ kind, x: W + 20, w, h, shape: kind === 'blot' ? blob(w, h * 2) : null, passed: false });
  }

  function reset() {
    obstacles = []; speed = 330; spawnIn = 0.9; score = 0; S.inked = false;
    S.y = ground - S.h; S.vy = 0; S.onGround = true;
    scoreEl.textContent = '0';
  }
  function jump() {
    if (mode === 'idle' || mode === 'over') { reset(); mode = 'run'; live.textContent = ''; }
    if (S.onGround) { S.vy = -800; S.onGround = false; sound.jump(); }
  }
  function over() {
    mode = 'over'; S.inked = true; sound.splat();
    if (score > best) { best = score; bestEl.textContent = String(best); try { localStorage.setItem(BEST, String(best)); } catch { /* ignore */ } }
    live.textContent = state.T.gameOver(score);
    draw();
  }

  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.focus({ preventScroll: true }); jump(); });
  canvas.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') { e.preventDefault(); jump(); }
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible && mode === 'run') { mode = 'idle'; draw(); } }, { threshold: 0.2 }).observe(canvas);
  new ResizeObserver(size).observe(canvas);
  readColors();

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function draw() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // ruled stick and faint rules scrolling behind
    ctx.strokeStyle = colors.ink;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    for (let y = 26; y < ground - 10; y += 22) {
      ctx.beginPath();
      ctx.setLineDash([2, 7]);
      ctx.lineDashOffset = scroll * 0.3;
      ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(8, ground, W - 16, 4);
    ctx.fillRect(8, ground + 8, W - 16, 1.2);
    // sorts marked along the stick
    ctx.globalAlpha = 0.5;
    for (let x = (-scroll % 36) + 8; x < W - 8; x += 36) ctx.fillRect(x, ground + 4, 1.2, 4);
    ctx.globalAlpha = 1;
    // obstacles
    for (const o of obstacles) {
      if (o.kind === 'blot') {
        ctx.beginPath();
        const cx = o.x + o.w / 2, cy = ground;
        o.shape.forEach(([px, py], i) => {
          const [nx, ny] = o.shape[(i + 1) % o.shape.length];
          const mx = cx + (px + nx) / 2, my = cy + Math.min(0, (py + ny) / 2);
          if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(cx + px, cy + Math.min(0, py), mx, my);
        });
        ctx.closePath();
        ctx.fill();
        ctx.beginPath(); ctx.arc(o.x - 6, ground - 6, 2.4, 0, Math.PI * 2); ctx.fill();
      } else {
        roundRect(o.x, ground - o.h, o.w, o.h, 2);
        ctx.fillStyle = colors.aged; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = colors.ink; ctx.stroke();
        ctx.fillStyle = colors.ink;
      }
    }
    // the sort
    roundRect(S.x, S.y, S.w, S.h, 4);
    ctx.fillStyle = S.inked ? colors.ink : colors.paper;
    ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = colors.ink; ctx.stroke();
    ctx.fillStyle = S.inked ? colors.paper : colors.ink;
    ctx.font = '400 34px Ultra, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('S', S.x + S.w / 2, S.y + S.h / 2 + 2);
    // captions
    if (mode !== 'run') {
      ctx.fillStyle = colors.ink;
      ctx.font = '800 13px Anybody, sans-serif';
      ctx.textAlign = 'left';
      const text = (mode === 'over' ? state.T.gameOver(score) : state.T.gameStart).toUpperCase();
      ctx.fillText(text, S.x + S.w + 22, 34, W - S.x - S.w - 40);
    }
  }

  return function update(dt) {
    if (!visible || mode !== 'run') return;
    t += dt;
    dt = Math.min(dt, 1 / 30);
    scroll += speed * dt;
    S.vy += 2300 * dt;
    S.y += S.vy * dt;
    if (S.y >= ground - S.h) { S.y = ground - S.h; S.vy = 0; S.onGround = true; }
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = (0.75 + Math.random() * 0.8) * (330 / speed) + 0.35; }
    for (const o of obstacles) {
      o.x -= speed * dt;
      if (!o.passed && o.x + o.w < S.x) { o.passed = true; score++; scoreEl.textContent = String(score); speed = Math.min(720, speed + 12); }
      const hitX = S.x + 5 < o.x + o.w - 3 && S.x + S.w - 5 > o.x + 3;
      const hitY = S.y + S.h > ground - o.h + 5;
      if (hitX && hitY) { over(); return; }
    }
    obstacles = obstacles.filter((o) => o.x > -80);
    draw();
  };
}
