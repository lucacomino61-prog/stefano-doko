// The telegraph counter. The blank is a real form: it asks for what it needs,
// counts the words the way a telegraph office did, and hands the telegram on.
// Until the site has a form service, sending writes the telegram into the
// visitor's own mail app, addressed to Stefano. Set ENDPOINT to post it
// instead (on Netlify, '/' works as it is: the blank is marked for Netlify
// Forms, with a honeypot field for bots).
import { state, bus } from '../state.js';
import { judder, sound } from './press.js';

const ENDPOINT = '';

const words = (s) => (String(s).trim().match(/\S+/g) || []).length;
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const rePhone = /^\+?[\d\s().-]{7,}$/;

export function initTelegram() {
  const form = document.querySelector('[data-telegram]');
  if (!form) return;
  const status = form.querySelector('[data-telegram-status]');
  const count = form.querySelector('[data-telegram-count]');
  const msg = form.querySelector('[data-telegram-message]');
  const to = () => (document.querySelector('[data-mail]')?.getAttribute('href') || '').replace(/^mailto:/, '');
  let tried = false;
  let lastErrs = {};

  // the reply language starts as the sheet's own
  const pickLang = () => {
    if (form.querySelector('input[name="lang"]:checked')) return;
    const r = form.querySelector(`input[name="lang"][value="${state.lang}"]`);
    if (r) r.checked = true;
  };
  pickLang();

  const recount = () => { count.textContent = String(words(msg.value)); };
  msg.addEventListener('input', recount);
  recount();

  function check() {
    const T = state.T;
    const f = new FormData(form);
    const errs = {};
    if (!String(f.get('name') || '').trim()) errs.name = T.ctErrName;
    if (words(f.get('message') || '') < 2) errs.message = T.ctErrMessage;
    const reply = String(f.get('reply') || '').trim();
    if (!reEmail.test(reply) && !rePhone.test(reply)) errs.reply = T.ctErrReply;
    form.querySelectorAll('[data-err]').forEach((el) => {
      const k = el.dataset.err;
      el.textContent = errs[k] || '';
      form.elements[k]?.setAttribute('aria-invalid', errs[k] ? 'true' : 'false');
    });
    lastErrs = errs;
    return errs;
  }
  // once a send has been tried, each line is checked again as it is corrected
  form.addEventListener('input', () => { if (tried) check(); });

  function compose() {
    const T = state.T;
    const f = new FormData(form);
    const name = String(f.get('name')).trim();
    const business = String(f.get('business') || '').trim();
    const body = [
      T.ctKind.toUpperCase(),
      `${T.ctFrom}: ${name}${business ? `, ${business}` : ''}`,
      `${T.ctReplyTo}: ${String(f.get('reply')).trim()}`,
      `${T.ctReplyIn}: ${f.get('lang') === 'en' ? 'English' : 'Shqip'}`,
      '',
      String(f.get('message')).trim(),
    ].join('\n');
    return { subject: T.ctSubject(name), body };
  }

  function say(text, copyText) {
    status.replaceChildren();
    const p = document.createElement('p');
    p.textContent = text;
    status.appendChild(p);
    if (!copyText) return;
    const row = document.createElement('p');
    row.className = 'telegram__fallback';
    const note = document.createElement('span');
    note.textContent = `${state.T.ctNoMail} `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--line btn--sm';
    btn.textContent = state.T.ctCopy;
    btn.addEventListener('click', async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(copyText); ok = true; } catch { ok = false; }
      btn.textContent = ok ? state.T.ctCopied : state.T.ctCopyFail;
      judder(btn);
    });
    row.append(note, btn);
    status.appendChild(row);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    tried = true;
    const errs = check();
    const first = Object.keys(errs)[0];
    if (first) {
      judder(form);
      say(state.T.ctErrSummary);
      form.elements[first]?.focus();
      return;
    }
    const { subject, body } = compose();
    sound.press();
    if (ENDPOINT) {
      say(state.T.ctSending);
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.classList.add('is-sent');
        say(state.T.ctSent);
      } catch {
        say(state.T.ctFailed);
      }
      return;
    }
    // no form service yet: the telegram leaves through the visitor's own mail app
    form.classList.add('is-handed');
    say(state.T.ctHanded, `${to()}\n${subject}\n\n${body}`);
    location.href = `mailto:${to()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  bus.on('lang', () => {
    recount();
    if (tried && Object.keys(lastErrs).length) check();
  });
}
