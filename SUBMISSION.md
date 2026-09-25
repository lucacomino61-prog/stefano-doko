# Awwwards submission sheet

What to send to Awwwards, and what has to be true first. The scores this aims at: Site of the Day is Design 40%, Usability 30%, Creativity 20%, Content 10%, and the Developer Award judges semantics, animation, accessibility, performance, responsiveness and markup. Winners lose their points on usability and accessibility, so those are measured below.

## Not before

- [ ] The real email is set in the admin (Contact). Awwwards marks placeholder copy down, and `hello@example.invalid` is one.
- [ ] The site is deployed on its own domain, built with `SITE_URL` set (canonical, hreflang, structured data and the sitemap then carry the real address). See README, "Before launch".
- [ ] The work is as full as it can honestly be: Dresses by Greta gets its case sheet once its domain is live, and any other finished work Stefano can show goes in. Nothing is added that did not happen.
- [ ] Parts worth switching on in the admin, each only with real content: availability (a real month), WhatsApp (his number), the portrait (a real photo), client quotes (with permission), the rates (his prices) and the calculator under them, graphic work (real pieces, each with its client's permission), his profile links.
- [ ] The Italian is read by a native speaker, or the entry names only English and Albanian.
- [ ] The credits below are filled in by Luca.

## The entry

- **Title:** Stefano Doko, the day's broadside
- **Description (EN):** The portfolio of Stefano Doko, graphic designer and web developer in Albania, set as the day's broadside the way a paper is set today: wood type fitted line by line, Inter for everything read, a relief engraving in one black and one red with Tirana's weather in its sky, a delivery van that drives down the sheet painting its road as you read, and work you can visit. In English, Albanian and Italian.
- **Categories:** Portfolio. Tags: typography, WebGL, animation, graphic design, multilingual.
- **Credits:** (Luca to fill in: who designed the site, who built it, and who the client is. State them as they are.)

## The one signature

As you read, a hand ink roller rolls across each sheet head, and the wood type takes ink under it; and the Elixir van from the engraving drives down the sheet beside you, painting its road red, turning across the page between its parts (moved on the compositor with the scroll, so it keeps up on a phone).

Everything else is there to be found, not announced: the loupe over each work plate (true colour under a glass rim), the engraving's wet ink that the pointer stirs (a tap on phones), the engraving's sun, which stands where the sun stands over Albania at that hour and sets into the sea by Bar Martiri (a tilt of a phone leans its light), PROOF mode (the sheet turns into its marked-up proof), the fan of proofs, the case sheets held while they develop, the letter caster (draw a letter, take home a real font), the poster press (set your business's name and take it home as a broadside to share), Jump the ink (the footer game), the pied-type 404, and the language switch that re-sets the sheet under type-case tiles.

## Measured (24 September 2026, local build, every optional part off)

| Check | This site | Awwwards portfolio winners (top 10, 2024–2026) |
| --- | --- | --- |
| First screens, cold cache | 1.4 MB | 8 MB median; two over 68 MB |
| Animation loops | one (about 120 calls a second) | median about 100; four winners at 344 to 5,588 |
| Layout shift (CLS) | 0.037 | four winners over 0.2 |
| Largest paint (lab) | the engraving band, 0.75 s on desktop | |
| Skip link | yes | none of the 30 winners measured |
| Reduced motion | CSS and a visible switch ("Stop the press") | none of the 10 |
| Images without alt text | 0 | two winners shipped 41 and 85 |
| axe-core (WCAG 2.2 AA) | 0 on the contact page and the admin; on phones, the proofs at the back of the fanned deck are nearly covered (each is also a full-size link in the contents). The same on 25 September with every part on, in the three languages | accessibility is the lowest developer score, about 6.8 |
| Structured data | ProfilePage and Person; each case sheet names the live site it shows; breadcrumbs in all three languages | |
| Link previews | one per sheet and language (15), in the sheet's own type and words | |

Re-measure on the deployed site before sending: `node ~/.claude/skills/awwwards-blueprints/scripts/fingerprint.mjs https://the-domain` and `node ~/.claude/skills/awwwards-blueprints/scripts/audit.mjs https://the-domain`.

## To send with it

- Screenshots at 1600 × 1200: the front page at rest, a case sheet held with its key, PROOF mode, the phone front page with the fan, the red EXTRA sheet.
- A short screen recording (about 30 s): arrival, the brayer inking the heads, the loupe over a plate, the fan, the switch to Albanian.
