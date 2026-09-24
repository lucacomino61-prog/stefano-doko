import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import fs from 'node:fs';

const root = import.meta.dirname;

// The sheets: the broadside itself, the two case editions, the colophon at
// length, the telegraph counter and the 404. Static output in dist/; the
// Albanian pages are written from these after the build (tools/build-sq.mjs).
const pages = {
  main: 'index.html',
  elixir: 'work/elixir/index.html',
  martiri: 'work/bar-martiri/index.html',
  made: 'how-it-was-made/index.html',
  contact: 'contact/index.html',
  notFound: '404.html',
};

// <!-- @include name.html --> pulls in a shared piece of every sheet from
// partials/, so the toolbar, the dateline and the foot are set once.
function partials() {
  const dir = resolve(root, 'partials');
  const include = (html) => html.replace(/<!--\s*@include\s+([\w.-]+)\s*-->/g, (_, file) => include(fs.readFileSync(resolve(dir, file), 'utf8')));
  return {
    name: 'sheet-partials',
    transformIndexHtml: { order: 'pre', handler: include },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('change', (file) => { if (file.startsWith(dir)) server.ws.send({ type: 'full-reload' }); });
    },
  };
}

export default defineConfig({
  plugins: [partials()],
  server: { port: 3670, strictPort: true },
  preview: { port: 3671, strictPort: true },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, resolve(root, v)])),
    },
  },
});
