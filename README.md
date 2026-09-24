# Stefano Doko, the day's broadside

Portfolio for Stefano Doko, graphic designer and web designer and developer in Albania. Every sheet of the site is a penny-press broadside: shouting wood type, a relief engraving in one black ink with an alarm-red flood, verse in two justified columns. An ink brayer rolls across each sheet head and the type takes ink under it.

English and Albanian, both complete, each at its own address. Static site: Vite, three.js, GSAP (with Lenis for smooth scroll) and opentype.js for the letter caster. No framework, no server.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Opens on http://localhost:3670. `npm run build` runs `vite build` and then `node tools/build-sq.mjs`, which writes the Albanian twin of every sheet, so `dist/` holds ten sheets (five in each language) and `404.html`. `npm run preview` serves the build on port 3671. In the Claude app the launch entries are `stefano-doko` (3670) and `stefano-doko-preview` (3671).

## The sheets

| Sheet | English | Albanian | Source |
| --- | --- | --- | --- |
| The front page | `/` | `/sq/` | `index.html` |
| Elixir, case edition | `/work/elixir/` | `/sq/puna/elixir/` | `work/elixir/index.html` |
| Bar Martiri, case edition | `/work/bar-martiri/` | `/sq/puna/bar-martiri/` | `work/bar-martiri/index.html` |
| How it was made | `/how-it-was-made/` | `/sq/si-u-be/` | `how-it-was-made/index.html` |
| The telegraph counter (contact) | `/contact/` | `/sq/kontakt/` | `contact/index.html` |
| Sheet not found | any other address | | `404.html` |

- `vite.config.js` lists every page. A small plugin there replaces `<!-- @include name.html -->` with that file from `partials/` (head, defs, chrome, dateline, foot, end), so the toolbar, the dateline and the foot are set once.
- One `src/main.js` boots every sheet. Each module does nothing where its elements are absent, and the stage builds the band and the ink fluid only where there is a band.
- Every word in both languages is in `src/i18n.js`. The HTML carries the English, so a sheet reads without JavaScript. At build time `tools/build-sq.mjs` swaps in the Albanian (everything marked `data-i18n`, `data-i18n-list` or `data-i18n-attr`, the proof notes and the verse), points `data-route` links at the Albanian sheets and gives every sheet its canonical and hreflang links.
- Addresses are in `src/routes.js`. The language switch re-sets the sheet in place and, in the built site, moves the address to its twin (`history.replaceState`). In development each sheet has one address.
- The front page holds three case sheets. Elixir and Bar Martiri have keys, callouts and facts. Dresses by Greta is a preview: its name and two plates, the middle card of the fan and an entry in the contents ("A first look"), with no address, link to its site or facts until its domain is bought. The footer names only Elixir and Bar Martiri, since Greta has no page.
- From sheet to sheet the new page feeds in with a cross-document view transition. Its opt-in is written inline in `partials/head.html`: in the stylesheet alone it sometimes counted too late and the transition was dropped.

## Before launch

- **Email.** The real address has not arrived yet. The placeholder `hello@example.invalid` is in 5 files, 10 times: `partials/chrome.html` (3), `partials/foot.html` (1), `index.html` (4), `contact/index.html` (1) and `404.html` (1). The partials are on every sheet, and the contact form addresses its telegram from the page's `[data-mail]` link, so replacing every match covers the whole site.
- **Domain.** Build with the domain set. `tools/build-sq.mjs` then makes canonical, hreflang, `og:url` and `og:image` absolute on all ten sheets, writes `dist/sitemap.xml` and adds it to `dist/robots.txt`. Without it the links stay root-relative and there is no sitemap. Don't leave a build made with a test domain in `dist/`.

  ```bash
  SITE_URL=https://the-domain npm run build
  ```

  In PowerShell: `$env:SITE_URL='https://the-domain'; npm run build`.
- **Contact form.** It checks the telegram and hands it to the visitor's own mail app; nothing is stored. To post it to a form service instead, set `ENDPOINT` in `src/ui/telegram.js` (on Netlify `'/'` works as it is: the form already carries the Netlify Forms markers and a honeypot) and change the privacy note on the page to match.
- **Dresses by Greta.** When its domain exists, add the visit link and facts only from what its live site says, and re-shoot its plates: `node tools/shoot-work.mjs greta-home greta-phone`, then `python tools/embed-plates.py`.

## What the site may say

Everything it states comes from `PRODUCT.md`. Stefano is based in Albania (no city). The work is Elixir and Bar Martiri, told only as their own sites tell it, and Dresses by Greta by name. Web design and development, front end and back end, were confirmed by Luca on 2026-09-23 and have their own sheet (`#services`). The type case on that sheet holds 27 languages: the set Luca asked for ("the coding languages Claude can do"), not a list from Stefano, so trim it if he won't take work in some of them. Print services are not confirmed and are not stated anywhere. No invented clients, years, metrics, prices or testimonials.

## One clock

GSAP's ticker is the only animation loop. `src/main.js` adds one callback. It steps Lenis (`autoRaf: false`), reads everything the frame needs (the edition, the toolbar, the ink, the stage's boxes), and only then writes: the inking, the marquee, the stamp, the game and the WebGL stage, in that order. No module calls `requestAnimationFrame` itself. A new per-frame read belongs in a `measure*()` function, not among the writes.

The stage redraws only when something it draws has changed. A new visual input needs a place in that check, or it freezes on screen.

## Where each finding lives

| Finding (Awwwards SOTY teardown) | On this site | Code |
| --- | --- | --- |
| Liquid cursor | the pointer stirs the band's wet ink: a small stable-fluids solver slips the red plate against the black | `src/gl/fluid.js`, composite in `src/gl/stage.js` |
| Cursor reveal, frozen glass | a printer's loupe over each work plate: magnified true colour, a glass rim that bends the image | `src/gl/plates.js` |
| One 3D object riding the scroll | the brayer, a hand ink roller drawn with the engraving material | `src/gl/brayer.js`, `src/ui/ink.js` |
| Outline-to-fill headline | each sheet head is uninked type until the roller passes | `src/ui/ink.js`, `.ink` in `src/style.css` |
| Scroll-drawn line | the verse's column rule draws down as the words take ink; the marquee flourish draws itself | `src/ui/verse.js`, `src/ui/marquee.js` |
| HUD labels | lettered callouts with leader rules out to the details of each screenshot | `src/ui/cases.js`, leaders inside the plates in `src/gl/plates.js` |
| Grid glitch transition | type-case tiles, black and red a hair out of register, while the language is re-set | `src/ui/tiles.js` |
| Pinned case exhibit | each case sheet is held while it develops, then the next sheet is laid over it and the read one fades | `src/ui/cases.js`, `.stack` in `src/style.css` |
| Ring reveal, odometer | the proof counter rolls with the real loading, then the stamp opens onto the sheet | `src/ui/intro.js` |
| Chamfered frames, slit wipes | bevelled plate mounts; ledes, inline cuts and the red sheet open out of a slit like paper through rollers | `.plate__mount`, `[data-feed]`, `src/ui/feed.js` |
| Theme flip with copy rewrite | PRINT / PROOF: the sheet flips to its marked-up proof (uninked type, baseline grid, struck draft, red-pencil notes) | `src/ui/proof.js` |
| Sentence with inline pictures, word highlight | the verse inks word by word around two cuts of the work | `src/ui/verse.js` |
| Two-face marquee | wood gothic and newspaper italic on one running line, speed and direction from the scroll | `src/ui/marquee.js` |
| Fanned cards | five proofs dealt into a fan: two per live site, Greta's phone in the middle | `src/ui/fan.js` |
| Stacked-card menu | the index deals out as a stack of small sheets | `src/ui/toolbar.js` |
| Live clock | the dateline keeps Albania time | `src/ui/toolbar.js`, `albaniaNow` in `src/i18n.js` |
| Grain | newsprint grain and ink speckle, generated in the browser | `src/ui/paper.js` |
| Sliced type, circular badge | the Extra headline slips in three slices under the pointer; a turning stamp to write | `src/ui/extra.js` |
| Specimen hover cards | the colophon's typeface names | `.specimen` in `index.html` |
| Sticky pill toolbar | appears once the masthead has gone by, with a reading rule | `src/ui/toolbar.js` |
| Sound off by default | press sounds synthesised with Web Audio, no files | `src/ui/press.js` |
| Footer game | Jump the ink | `src/ui/game.js` |
| Font from a drawing | draw a letter, cast it into a real .otf in the browser, download it | `src/ui/letter.js` (opentype.js, loaded on first cast) |
| Joke 404 | the sheet's words lie pied on the floor; set them again | `404.html`, `src/notfound.js` |
| Loop back to top | past the foot the front page is set again and carries you back to the top | `src/ui/edition.js` |

Also on the sheets:

| Part | Code |
| --- | --- |
| Wood-type fitting: each line takes the size and width that fill the measure (Anybody's width axis), never a stretch | `src/ui/fit.js` |
| Case editions: plates of the live sites with lettered keys, the rings and rules placed from the live pages | `src/ui/folio.js`, `src/data/plates.json` |
| The type case: the languages lie in their boxes like sorts in a compositor's case | `src/ui/typecase.js` |
| Set your own line: whatever is typed is fitted to the measure as it is typed | `src/ui/setline.js` |
| The telegraph counter: the contact form, with a word count like a telegraph office | `src/ui/telegram.js` |

## The engraving

`src/gl/band.js` builds the scene from plain geometry (lathed bottles, an extruded van, umbrellas, a palm, the sea). `src/gl/engrave.js` turns tone into line: surfaces are cut into parallel lines whose thickness follows the light, with cross-hatching in the shadows and screen-space outlines. The band renders its two plates (black and red) into one target, and the composite prints them on newsprint with a hair of misregistration. Moving the pointer over the band moves the lamp, and the hatching re-cuts itself.

`public/band-poster.jpg` is a still of the band for browsers without WebGL, rendered from the page by `node tools/stills.mjs`. `public/og.png`, the link preview, comes from the brand set (`brand/final/templates/og-site.html`, exported as `brand/final/export/web/og-site.png`). `node tools/stills.mjs --og` would replace it with a capture of the page.

## Checking it

The Claude app's browser pane paints no WebGL frames, so visual and performance checks run in headless Chrome on the real GPU. The tools use `puppeteer-core`, a dev dependency that `npm install` sets up, and drive the installed Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`. Nothing downloads a browser. If Chrome moves, change `executablePath` in the tool.

Run them from the project folder:

```bash
node tools/capture.mjs
```

```bash
python tools/stitch.py
```

Frames land in `.impeccable/review/frames/`, stitched pages in `.impeccable/review/desktop.png` and `mobile.png`.

| Tool | What it does | Serve first |
| --- | --- | --- |
| `tools/capture.mjs [url] [--only desktop\|mobile]` | pages down the front page a screen at a time and saves each screen; reports fps, overflow and console errors | `npm run dev` |
| `tools/stills.mjs [url] [--og]` | re-renders `public/band-poster.jpg`; `--og` also replaces `public/og.png` | `npm run dev` |
| `tools/shoot-work.mjs [name ...] [--debug <dir>]` | re-shoots the case plates from the live sites (non-essential cookies declined, nothing ordered or sent) and places every callout from the live page; writes `public/work/*.jpg` and `src/data/plates.json` | nothing, it visits the live sites |
| `python tools/embed-plates.py` | after a re-shoot, writes each plate's origin note; then `impeccable embed-prompt --scan public public/work` should report 0 missing | nothing |
| `tools/profile.mjs [url] [--mobile] [--cpu 4] [--label name]` | scrolls with real wheel events, stirs the band, hovers a plate; records every frame interval and the long animation frames | `npm run build`, then `npm run preview` |
| `tools/redsheet.mjs [--at selector] [--mobile] [--cpu 4] [--invalidations]` | traces the first sight of one part of the page (the red EXTRA sheet by default), GPU shader compiles included | `npm run build`, then `npm run preview` |
| `tools/trace.mjs [url] [fromY] [toY]` | Chrome trace of a scroll stretch: layout and style work, and the script that forced it | `npm run dev` |
| `tools/cpu.mjs [url] [stir\|scroll]` | CPU profile of one interaction, by function | `npm run dev` |

Performance runs are saved in `.impeccable/perf/`. `ship-desktop.json` and `ship-mobile-cpu4.json` are the baseline to beat (p95 16.8 ms). Other work on the machine swings the numbers, so compare runs made back to back. The impeccable CLI is not on PATH: it is at `~/.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe`.

## Print and brand

Vite never reads these folders. Their renderers use the same `puppeteer-core`.

- `brand/final/` is the identity: the SD mark (a black S and a red D shaped like a speech bubble), its colours and type, and the rules in `guide.html`. `python brand/final/make.py && node brand/final/render.mjs` writes the logo SVGs in `logo/` and every export in `export/`: logo PNGs, favicons, Instagram posts, the link preview and the business card PDFs (`export/print/`). The site's favicons and `og.png` are copies of `export/web/` with an origin note embedded (`impeccable embed-prompt`). `python brand/final/highlights.py` makes the Instagram highlight covers.
- `brand/make_logo.py`, `brand/render.mjs` and `brand/v2/` to `brand/v8/` are the earlier logo studies.
- `flyer/` holds the A5 flyer (`node flyer/render.mjs`) and the five-slide Instagram carousel (`node flyer/render-instagram.mjs`). Their prices are estimates Luca has not confirmed, and they carry the placeholder email.
- The business card (`brand/final/templates/card.html`) still has placeholders on the back: email, phone, web address and Instagram handle.

## Type

Anybody (Etcetera Type Co, SIL OFL), Ultra (Astigmatic, Apache 2.0) and Old Standard (Alexey Kryukov, SIL OFL), subset to Latin with Albanian and self-hosted in `public/fonts/`, licences beside them. `tools/fonts-src/Ultra-Regular.ttf` is the full Ultra font, read by the logo studies `brand/make_logo.py` and `brand/v6/make.py`.

## Accessibility

Real headings and landmarks, a skip link, keyboard-reachable controls with themed focus rings, `aria-pressed` on the language, sound and proof words, and live regions for the copy button, the game and the letter caster. With reduced motion the intro, the brayer, the marquee, the word inking and the loop are replaced by their finished states.

## Notes

`PRODUCT.md` holds the facts and what may be said, `DESIGN.md` the design system, and `.impeccable/build-notes.md` the build history, the performance work and the traps met on the way.
