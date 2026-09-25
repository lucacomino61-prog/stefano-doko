// Talking to the Worker (/api/admin/*). Same origin, cookie session: the
// browser sends the Origin header on every change, which the Worker checks.

export class ApiError extends Error {
  constructor(code, status, data) {
    super(code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function call(method, path, body) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`/api/admin${path}`, {
      method,
      credentials: 'same-origin',
      headers: body && !isForm ? { 'content-type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError('network', 0, null);
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(data?.error || (res.status >= 500 ? 'server' : `http_${res.status}`), res.status, data);
  return data;
}

const photoForm = (blob, w, h) => {
  const form = new FormData();
  form.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
  form.append('w', String(w));
  form.append('h', String(h));
  return form;
};

export const api = {
  me: () => call('GET', '/me'),
  login: (password) => call('POST', '/login', { password }),
  devLogin: () => call('POST', '/dev-login', {}),
  logout: () => call('POST', '/logout', {}),
  settings: () => call('GET', '/settings'),
  save: (settings) => call('PUT', '/settings', settings),
  uploadPortrait: (blob, w, h) => call('POST', '/portrait', photoForm(blob, w, h)),
  removePortrait: () => call('DELETE', '/portrait'),
  addPiece: (blob, w, h) => call('POST', '/graphic', photoForm(blob, w, h)),
  replacePiece: (id, blob, w, h) => call('POST', `/graphic/${encodeURIComponent(id)}`, photoForm(blob, w, h)),
  telegrams: (cursor = '') => call('GET', `/telegrams${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  telegram: (key) => call('GET', `/telegrams/${encodeURIComponent(key)}`),
  markRead: (key, read) => call('POST', `/telegrams/${encodeURIComponent(key)}/read`, { read }),
  deleteTelegram: (key) => call('DELETE', `/telegrams/${encodeURIComponent(key)}`),
  stats: () => call('GET', '/stats'),
};
