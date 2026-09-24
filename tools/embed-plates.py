# Dev-only: write the origin note into every case plate after
# tools/shoot-work.mjs has re-shot them (what was shot, when, how, in what
# state), then check with: impeccable embed-prompt --scan public public/work
# usage: python tools/embed-plates.py
import io, json, os, subprocess, tempfile

root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
exe = os.path.expanduser('~/.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe')
plates = json.load(io.open(os.path.join(root, 'src', 'data', 'plates.json'), encoding='utf-8'))

# plates left in a state other than "cookies declined, nothing opened"
STATE = {
    'martiri-welcome': ' The site\'s first-visit card (language and map consent) was left open, as it is the subject.',
    'martiri-menu': ' The site\'s menu was opened with its own "View the menu" button; non-essential cookies declined.',
    'martiri-basket': ' One vanilla ice cream was put in the basket of a throwaway browser so the basket shows where an order is brought; nothing was ordered or sent. Non-essential cookies declined.',
}

with tempfile.TemporaryDirectory() as tmp:
    for name, p in sorted(plates.items()):
        view = 'phone 390x844 at 2x' if p['view'] == 'phone' else 'desktop 1440x900'
        if name.startswith('greta-'):
            # shown by name and preview only; its temporary address is kept off the site
            text = (f"Not AI-generated. A screenshot of the live Dresses by Greta site at its temporary "
                    f"Cloudflare Workers address (its own domain comes later), captured on {p['shot']} in headless "
                    f"Chrome ({view}) by tools/shoot-work.mjs, taken as the page first opens with nothing clicked. "
                    f"Shown on the front page of the Stefano Doko site by name and preview only; not edited.")
        else:
            note = STATE.get(name, ' The site\'s non-essential cookies were declined.')
            text = (f"Not AI-generated. A screenshot of the live page {p['url']}, captured on {p['shot']} "
                    f"in headless Chrome ({view}) by tools/shoot-work.mjs for the case pages of the Stefano Doko site.{note} "
                    f"Shown as a case-study plate with a lettered key; not edited.")
        f = os.path.join(tmp, name + '.txt')
        io.open(f, 'w', encoding='utf-8').write(text)
        img = os.path.join(root, 'public', 'work', name + '.jpg')
        r = subprocess.run([exe, 'embed-prompt', img, '--prompt-file', f], capture_output=True, text=True)
        print(name, 'ok' if r.returncode == 0 else (r.stderr or r.stdout).strip())
