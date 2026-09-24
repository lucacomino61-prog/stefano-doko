# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + three.js + GSAP (Luca's choice, 2026-09-23). Static build, deployable to any static host. GSAP is the single animation engine: its ticker drives Lenis smooth scroll and the WebGL render; nothing else runs its own requestAnimationFrame loop.

## Users

Business owners, in Albania first, who need a graphic designer who also builds websites: someone to make their business look good in print and on the web, often including its first proper website, designed and coded. They judge within seconds whether this person can do that for them, and they need an obvious way to get in touch in their own language.

## Product Purpose

Stefano Doko's portfolio. It shows that he makes businesses look good, proves it with live work that real businesses use every day, and turns a visit into a message. Success is a business owner writing to him.

## Positioning

A graphic designer in Albania whose portfolio is running businesses (an online perfume shop, a beach bar), not concept pieces, and whose own site demonstrates the craft directly: the visitor handles the typography, colour and motion instead of reading claims about them.

## Operating Context

Visitors read in Albanian or English and arrive on phones as often as desktops. They compare him with whoever else they know who "does design"; the two live sites are the thing they can check.

## Capabilities and Constraints

- Bilingual: English and Albanian, both complete, with an EN/SQ switch. Since 2026-09-23 each language has its own address: the Albanian sheets live under /sq/ (written at build time by tools/build-sq.mjs), with hreflang and canonical links. Those links are root-relative until the domain is known; set SITE_URL for the build before launch, which also writes the sitemap.
- Sheets (Luca's choice, 2026-09-23): the front page; a case edition for each live site (/work/elixir/, /work/bar-martiri/); how this sheet was made (/how-it-was-made/); and the telegraph counter (/contact/), a contact form.
- The contact form checks what it needs and then writes the telegram into the visitor's own mail app, addressed to the site's email; nothing is stored. To post it instead, set ENDPOINT in src/ui/telegram.js to a form service (on Netlify, '/' works as it is: the form carries the Netlify Forms markers and a honeypot). The privacy note on the page must change with it.
- May state that Stefano is based in Albania (a live Albania-time clock is allowed). No city is confirmed.
- Contact: the real email arrives before launch. Until then the site uses the placeholder `hello@example.invalid`.
- Confirmed by Luca on 2026-09-23: Stefano is also a website designer and developer, front end and back end. The site says so and has a websites sheet (Design, Front end, Back end).
- Coding languages: the site lists 27, from HTML, CSS, JavaScript, TypeScript, PHP, Python and SQL to Zig. Luca asked for "the coding languages Claude can do", so the list is that set, not a skills inventory from Stefano. Trim it if he will not take work in some of them.
- Not confirmed, so not stated: print services (identities, posters, books, menus, labels). Anything more specific needs Luca's confirmation first.
- No invented facts: no other clients, years, roles, metrics, awards, prices or testimonials.

## Brand Commitments

- Name: Stefano Doko. Descriptors: graphic designer; web designer and developer. The short form, where space is tight (toolbar lockup, intro stamp), is "Designer & developer" / "Dizajner & zhvillues".
- Earlier sites used "Stefano — graphic design" as the page title; the logo (chosen by Luca, 2026-09-23) is the SD speech bubble ("Say it"): a black S and a red D shaped like a speech bubble, which replaced the earlier red D with an S counter the same day; files and rules in brand/final/ (guide.png). It appears in the toolbar lockup, the pill and the favicon.

## Evidence on Hand

- **elixir.al**: an online perfume shop with designer, Arabic and niche fragrances, delivered across Albania (restates the site's own description). Screenshots, Sept 2026: `LC/claude-site/work/elixir-desktop.jpg`, `elixir-phone.jpg`.
- **barmartiri.com**: Bar Martiri in Spille, ice cream and sunbeds by the sea, in three languages (restates the site's own description). Screenshots, Sept 2026: `LC/claude-site/work/martiri-desktop.jpg`, `martiri-phone.jpg`.
- **The case editions' plates**, captured from both live sites on 2026-09-23 by tools/shoot-work.mjs with the sites' non-essential cookies declined (public/work/elixir-*.jpg, martiri-*.jpg, each carrying its provenance). What the case pages say about each site restates what the site itself showed that day (delivery terms, prices, hours, languages); they are dated on the page.
- **Dresses by Greta** (added 2026-09-24 at Luca's request, as Stefano's work): shown on the front page by name and preview only. Its site is live at a temporary Cloudflare Workers address and gets its own domain later, so the page carries no address, no link and no facts about it (its shop was not yet selling). Screenshots of 2026-09-24 by tools/shoot-work.mjs, taken as the page opens with nothing clicked: public/work/greta-home.jpg, greta-phone.jpg. Once the domain exists: add the visit link, and facts only from what the live site says.
- Absent, and not to be fabricated: portrait photos, other projects beyond these three, testimonials, client quotes, prices, years in practice.

## Product Principles

1. Show, don't claim. Every statement about Stefano is backed by the two live sites or confirmed by Luca.
2. The site is the audition. Its own craft is the first piece of evidence a business owner sees.
3. The way to write to him is never more than one gesture away, in both languages.
4. Albanian is first-class, never a translation afterthought.
