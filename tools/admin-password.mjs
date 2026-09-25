// Sets the admin password without it ever appearing on screen or in a file
// (the same tool as LC/greta):
//   npm run admin:password            -> writes the hash into .dev.vars (local)
//   node tools/admin-password.mjs --print | npx wrangler secret put ADMIN_PASSWORD_HASH
//     (the prompts go to stderr, so only the hash reaches the pipe)
// Format matches worker/auth.js: pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { stdin, stderr as stdout } from 'node:process';

const ITERATIONS = 100000; // the Workers runtime caps PBKDF2 here

function ask(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') process.exit(1);
      else if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
      else value += ch;
    };
    stdin.on('data', onData);
  });
}

const password = await ask('New admin password (at least 10 characters): ');
if (password.length < 10) {
  console.error('Too short: use at least 10 characters.');
  process.exit(1);
}
const again = await ask('Repeat it: ');
if (again !== password) {
  console.error('The two do not match.');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const value = `pbkdf2_sha256$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;

if (process.argv.includes('--print')) {
  console.log(value);
} else {
  const file = new URL('../.dev.vars', import.meta.url);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const next = /^ADMIN_PASSWORD_HASH=.*$/m.test(text) ? text.replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${value}`) : `${text.trimEnd()}\nADMIN_PASSWORD_HASH=${value}\n`;
  writeFileSync(file, next);
  console.log('Saved to .dev.vars. Restart `npm run worker:dev` to use it.');
}
