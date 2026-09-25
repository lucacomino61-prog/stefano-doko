// Tilt a phone and the light leans across the engraving, and the view with it,
// the way a mouse moves them on a computer; held still, both settle back to
// the sun. The event only notes the reading: the stage leans the light in the
// one clock (src/gl/stage.js, `lean`). An iPhone or an iPad asks first, so a
// word under the band asks for the phone's motion, and nothing is asked until
// it is pressed.
import { state } from '../state.js';

export function initTilt() {
  if (state.fine || !('DeviceOrientationEvent' in window)) return;
  if (!document.querySelector('[data-gl="band"]')) return;
  const word = document.querySelector('[data-tilt]');
  const read = (e) => {
    if (e.beta == null || e.gamma == null) return;
    // left-right and toward-away as the reader holds the screen
    const a = screen.orientation?.angle ?? window.orientation ?? 0;
    let x = e.gamma, y = e.beta;
    if (a === 90) { x = e.beta; y = -e.gamma; }
    else if (a === -90 || a === 270) { x = -e.beta; y = e.gamma; }
    else if (a === 180) { x = -e.gamma; y = -e.beta; }
    state.tilt.x = x;
    state.tilt.y = y;
    state.tilt.on = true;
  };
  const listen = () => window.addEventListener('deviceorientation', read, { passive: true });
  if (typeof DeviceOrientationEvent.requestPermission !== 'function') { listen(); return; }
  if (!word || state.reduced) return;
  word.hidden = false;
  word.addEventListener('click', async () => {
    let answer = 'denied';
    try { answer = await DeviceOrientationEvent.requestPermission(); } catch { /* not asked */ }
    word.hidden = true;
    if (answer === 'granted') listen();
  });
}
