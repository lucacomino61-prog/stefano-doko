---
name: Stefano Doko
description: The day's penny broadside. One black relief ink on newsprint, alarm red only where the press floods it.
colors:
  newsprint: "#EFE6D2"
  aged-stock: "#E3D6BA"
  relief-ink: "#141414"
  ink-fade: "#5F584F"
  alarm-red: "#E23B2E"
  proof-paper: "#E4E2DA"
  proof-aged: "#D5D2C7"
  proof-ink: "#2A2825"
  proof-fade: "#57544D"
typography:
  display:
    fontFamily: "Anybody, 'Arial Narrow', sans-serif"
    fontSize: "fitted per line, 44px to 330px"
    fontWeight: 900
    lineHeight: 0.8
    letterSpacing: "normal"
    fontVariation: "'wdth' 50..100 used (face offers 50..150), fitted per line (prefers 70)"
  display-fat:
    fontFamily: "Ultra, Anybody, serif"
    fontSize: "fitted per line, 40px to 250px"
    fontWeight: 400
    lineHeight: 0.82
    letterSpacing: "normal"
  headline:
    fontFamily: "Anybody, 'Arial Narrow', sans-serif"
    fontSize: "clamp(26px, 2.5vw, 38px)"
    fontWeight: 850
    lineHeight: 0.98
    letterSpacing: "0.005em"
    fontVariation: "'wdth' 78"
  title:
    fontFamily: "Anybody, 'Arial Narrow', sans-serif"
    fontSize: "18px"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 86"
  body:
    fontFamily: "'Old Standard', 'Times New Roman', serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
    fontFeature: "'onum', 'pnum'"
  lede:
    fontFamily: "'Old Standard', 'Times New Roman', serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "'Old Standard', 'Times New Roman', serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "Anybody, 'Arial Narrow', sans-serif"
    fontSize: "14px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 90"
  button:
    fontFamily: "Anybody, 'Arial Narrow', sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 92"
rounded:
  type: "4px"
  control: "6px"
  box: "10px"
  round: "99px"
spacing:
  page-margin: "clamp(16px, 3.2vw, 48px)"
  stack-sm: "10px"
  stack: "14px"
  stack-md: "18px"
  gutter: "30px"
  section: "44px"
components:
  button-ink:
    backgroundColor: "{colors.relief-ink}"
    textColor: "{colors.newsprint}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px 0 22px"
    height: "48px"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.relief-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 20px 0 22px"
    height: "48px"
  button-line-hover:
    backgroundColor: "{colors.aged-stock}"
  button-sm:
    height: "38px"
    padding: "0 14px"
  button-lg:
    height: "58px"
    padding: "0 26px 0 28px"
  word:
    textColor: "{colors.relief-ink}"
    typography: "{typography.label}"
    padding: "6px 0"
  word-read:
    textColor: "{colors.ink-fade}"
  lang-toggle:
    rounded: "{rounded.control}"
    padding: "3px"
  lang-toggle-pressed:
    backgroundColor: "{colors.relief-ink}"
    textColor: "{colors.newsprint}"
    rounded: "{rounded.type}"
    height: "34px"
  plate:
    backgroundColor: "{colors.aged-stock}"
    rounded: "{rounded.box}"
    padding: "7px"
  fact-box:
    backgroundColor: "{colors.newsprint}"
    textColor: "{colors.relief-ink}"
    rounded: "{rounded.box}"
    padding: "12px 14px"
  pill:
    backgroundColor: "{colors.newsprint}"
    rounded: "{rounded.box}"
    height: "58px"
    padding: "0 8px 0 10px"
  tabbar:
    backgroundColor: "{colors.newsprint}"
    rounded: "{rounded.box}"
    height: "60px"
    padding: "6px"
  input-sort:
    backgroundColor: "{colors.newsprint}"
    textColor: "{colors.relief-ink}"
    typography: "{typography.display-fat}"
    rounded: "{rounded.control}"
    width: "56px"
    height: "48px"
  stamp:
    backgroundColor: "{colors.newsprint}"
    rounded: "{rounded.round}"
    size: "200px"
  type-case:
    backgroundColor: "{colors.aged-stock}"
    rounded: "{rounded.box}"
    padding: "8px"
  type-case-box:
    backgroundColor: "{colors.newsprint}"
    textColor: "{colors.relief-ink}"
    typography: "{typography.display}"
    padding: "9px 10px 8px"
---

# Design System: Stefano Doko

## Overview

**Creative North Star: "The Penny Broadside"**

The site is the day's broadside, printed while you watch. Every surface is a sheet of coarse newsprint carrying one black relief ink; each sheet feeds in through a slit, settles under the platen with a small judder, and is replaced by the next. Type is set, not styled: a condensed wood gothic is fitted line by line to the measure on its width axis, a heavy fat-face carries the case titles and the EXTRA, and a nineteenth-century newspaper serif carries everything that is read. Headlines arrive uninked, as outlines, and take ink where a 3D brayer rolls across them with the scroll.

Density is that of a front page: double rules, column rules, datelines, a contents column, captions under every cut. Structure is drawn with rules rather than filled panels. Colour is almost absent by discipline; alarm red is a flood reserved for two places and a marking colour for the press's own marks. Imagery is either a live WebGL relief engraving (tone becomes parallel line, crossed in shadow) or real screenshots of the two live businesses, mounted as plates and shown true-colour only under the loupe.

A second state, PROOF, re-inks the whole sheet as a correction proof: cooler stock, softer ink, red proof-reader's marks and ruled lines, the heads left uninked. It is a cross-fade of registered colour properties, not a separate theme.

**Key Characteristics:**
- One ink on newsprint; red is flood or mark, never decoration.
- Display type is fitted to the measure per line, never stretched and never a fixed size.
- Rules do the structural work: double rules at sheet heads, single rules between columns, star-capped rules at the ends of a measure.
- Boxes are double-bordered with small radii; round shapes belong only to the stamp, the loupe and a key's lettered rings.
- Motion is mechanical: judder, slit feed, rolling ink, type-case tiles. One GSAP ticker drives all of it.
- Reduced motion shows every finished state at once.

## Colors

A single black relief ink on warm, grained newsprint, with one alarm red used as a flooded plate and as a proof-reader's marking colour.

### Primary
- **Relief Ink** (`relief-ink`): all type, every rule, every box border, the solid button, the intro field. It is the only colour that carries structure.

### Secondary
- **Alarm Red** (`alarm-red`): flooded behind the engraving band on the front sheet and across the whole EXTRA contact sheet. As a mark it also appears where the press itself speaks: the outer focus ring, the text caret, the intro stamp and percentage, the red under-plate of the type-case tiles, and the correction marks of PROOF mode (arrows, ruling, strike-throughs).

### Neutral
- **Newsprint** (`newsprint`): the page stock, always under the grain and mottle textures (256px and 640px tiles). Also the fill of floating paper objects (pill, tab bar, fact boxes, index sheets, specimen cards) so they read as loose sheets.
- **Aged Stock** (`aged-stock`): the mount behind plates and thumbnails, the tray of the type case, the hover fill of line buttons and index sheets, the scrollbar track, the game field.
- **Ink Fade** (`ink-fade`): what is not yet pressed or already read: verse words before the scroll reaches them, visited contents entries and words, struck-through proof deletions.

### PROOF mode
Registered as `<color>` custom properties so the swap cross-fades over 0.8s on the in-out ease: newsprint becomes **Proof Paper** (`proof-paper`), aged stock **Proof Aged** (`proof-aged`), ink **Proof Ink** (`proof-ink`), fade **Proof Fade** (`proof-fade`). Alarm red does not change.

### Named Rules
**The One Ink Rule.** Everything structural is Relief Ink on Newsprint. A second colour never appears as a fill for panels, cards, or buttons outside the EXTRA sheet.

**The Flood-or-Mark Rule.** Alarm Red is either a full flood (the engraving band, the EXTRA sheet) or a press mark (focus ring, caret, proof marks, tiles, intro stamp). It is never a tint, a gradient, a hover colour, or a text colour for reading copy.

**The Registered Colour Rule.** Theme colours are `@property`-registered so PRINT and PROOF cross-fade as colours. A new colour role that must follow the mode is registered the same way.

## Typography

**Display Font:** Anybody, variable wdth 50 to 150 and wght 100 to 900 (with Arial Narrow)
**Fat Face:** Ultra (with Anybody)
**Body Font:** Old Standard regular, italic, bold (with Times New Roman)

**Character:** A condensed wood gothic that is set to the measure like a compositor fills a line, a fat-face for the loudest titles, and a Victorian newspaper serif with old-style figures for everything that is read. All three are self-hosted.

### Hierarchy
- **Display** (Anybody 900, fitted 44 to 330px, line-height 0.8, uppercase): the masthead name, sheet heads (THE WORK, ABOUT, WEBSITES, AMUSEMENTS), the marquee's gothic half. Size and width axis are chosen per line at runtime so each line fills its track; the width axis prefers about 70 and never widens past 100, so a line that reaches its size cap falls short rather than turning into an extended face. On phones a sheet head takes another line whenever that sets its smallest line a third larger, so heads break into big lines instead of setting one small one.
- **Display Fat** (Ultra 400, fitted 40 to 250px, line-height 0.8 to 0.82, uppercase): case titles (ELIXIR, BAR MARTIRI), the EXTRA head (sliced into three bands), the 404 code, the pied-type sorts.
- **Headline** (Anybody 850, clamp(26px, 2.5vw, 38px), line-height 0.98, wdth 78, uppercase, balanced): the centre-column stand head.
- **Title** (Anybody 850, 17 to 20px, wdth 84 to 96, uppercase): column heads, contents entries, index sheets, fact boxes (15px).
- **Body** (Old Standard 400, 18px, line-height 1.5, old-style proportional figures; 17px on phones): running copy, max 42 to 72ch. The verse runs larger, clamp(20px, 1.78vw, 27px)/1.45, justified in two columns.
- **Lede** (Old Standard italic, 22 to 27px, line-height 1.35 to 1.4): sheet ledes, case lines, the EXTRA line.
- **Caption** (Old Standard italic, 14 to 15px, line-height 1.3): cuts, plates, callouts, contents sub-lines, proof notes.
- **Label** (Anybody 800, 12 to 14px, 0.06 to 0.12em, uppercase): words (links), dateline, scores. Clocks use tabular lining figures.

### Named Rules
**The Fitted Line Rule.** Display type fills its track by choosing size and width per line (Anybody's wdth axis, or size alone for Ultra). It is never scaled with `transform`, never letter-spaced to fit, and its grid tracks are `minmax(0, 1fr)` so unfitted text cannot widen the layout before fitting runs.

**The Uninked Head Rule.** A display head starts as an outline of the ink colour (1.4px stroke) and fills as the brayer passes, with a speckled mask on the fill. The ink reaches half an em above the line so accents (the dots of Albanian Ë) take ink with their letters. Without motion, or before scripts run, heads show fully inked.

**The Serif Reads Rule.** Anything longer than a label is set in Old Standard. Anybody and Ultra are for heads, labels and controls only.

## Layout

A front page on a single page margin, clamp(16px, 3.2vw, 48px), shared by every sheet. The front sheet stacks: toolbar strip (78px, 6px top rule plus a 1.5px inner rule, 2px bottom), dateline strip (38px, cells divided by 1px rules), masthead (name about 60% of the measure beside a stacked two-line side block and a manicule, a star-capped vertical rule at each end), the engraving band (clamp(230px, 35vh, 360px)), then three columns (1fr / 1.3fr / 1fr) divided by 1px rules with 30px inner padding and closed by 2px rules above and below.

Work cases are sticky full-height sheets that stack over one another (100dvh, min 680px), each with a 2px top rule plus inner rule and a soft upward shadow, laying out a wide plate, a column of tilted fact boxes and a tall phone plate (6.2 / 2.5 / 2.1). Its key queues down the column between the plates: lettered labels at least 32px apart, each level with its ring where there is room. A label keeps to its room (that column, or on a stacked portrait tablet the measure on its own plate's side); one longer than its room wraps onto balanced lines, set flush toward its plate, and its rule meets the first line. A case shown by name and preview only (`case--preview`, Dresses by Greta: no facts, key or address until its domain exists) sets its name across the whole measure and its two plates side by side at one height, the height that fits both the held sheet and its width. The about verse is two justified columns split by a star-capped rule that draws itself. The websites sheet follows it: three equal columns (Design, Front end, Back end) divided like the front page's, 1px rules between and 2px rules above and below, then the type case of languages. The EXTRA sheet feeds in through a slit.

The other sheets open under the same toolbar and dateline (shared partials) and close with the same foot. **Case editions** (Elixir, Bar Martiri): a masthead with the name in the fat face fitted across about 60% of the measure beside three fact lines, a lede with the live link, then six figures 84px apart and a two-column list of what the site does. Each figure pairs a plate with its key: wide plates 7fr against a 3fr key; two phone plates share a row at 250px, set plate, key, plate, key (or key, plate, key, plate), so no hole opens between them; a phone plate on its own is set with its key as one 720px cut on the sheet's axis. The key goes on the side where every rule can leave the plate without crossing a word. **The colophon at length**: the fitted head, then its articles in two columns under a 1px column rule, a table of measurements and the set-your-own-line block. **The telegraph counter**: the fitted head, the telegram blank as a loose sheet (max 980px), and a privacy note. Every sheet but the front ends with the next sheet's name fitted across the measure under a 6px plus 1.5px double rule.

Spacing is rule-led rather than scale-led: stacks at 10, 14, 18px, column padding 30px, sheet sections 44px apart, sheet tops 96 to 136px.

**Breakpoints.** Phones up to 767px: one column everywhere, the toolbar drops its nav, its language control and its ink button (the tab bar carries the ink "Write" slot), the pill is replaced by a bottom tab bar (5 slots, 60px), column rules turn into top rules, the band goes full-bleed at max(320px, 92vw), cases unstick and the verse goes to one ragged column. 768 to 1100px: the front goes two columns with contents spanning below, and a case sheet deals its facts beside the name only (14px, one line per card) and runs its line, button and link across the measure under both: in one row on a landscape screen, where the sheet is short, and on a portrait one as the line above the button and the link. On a portrait tablet whose held sheet is tall enough (its plate area no more than 1.2 times as wide as it is tall; 0.98 for a preview case), a case's plates are stacked and sized from the height left under the head, so they fill the sheet to its foot: the desktop plate at the left with its key beside it, and the phone plate under it, a fifth taller, set with its key as one cut on the sheet's axis; a preview case sets both plates on the axis at one height. A shorter sheet keeps them side by side. Up to 1100px a figure's key becomes a lettered list under its plate, the same letters are pinned on the plate, and no rules are drawn.

**Layers.** Sheets 0 to 2; the fixed WebGL canvas 30; the lettered pins of a compact key 31; proof notes 35; pill and tab bar 40; index 50; type-case tiles 60; intro 70; skip link 80. Anything that must sit over a WebGL plate is drawn in the plate shader, not the DOM, except those pins: they sit in the figure, outside the plate mount, whose clip-path would hold them under the canvas.

### Named Rules
**The Rule-Not-Panel Rule.** Columns, strips and sections are separated by ink rules (1px between columns, 2px closing a block, a 6px plus 1.5px double rule opening and closing a sheet). Background fills are not used to separate content.

## Elevation & Depth

The page is flat print; depth comes from loose sheets of paper lying on it. Objects that float (the pill, tab bar, fact boxes, fan cards, index sheets, specimen cards, the stamp, pied sorts, stacked case sheets) carry one soft, negatively spread ink shadow falling downward, as paper casts on paper. Boxes that sit in the page carry no shadow; their edge is drawn by inset ink rings. Hover lifts a fan card 28px and deepens its shadow; nothing else lifts.

### Shadow Vocabulary
- **Loose sheet** (`box-shadow: 0 10px 24px -12px rgb(20 20 20 / 0.45)` to `0 14px 26px -14px rgb(20 20 20 / 0.55)`): pill, tab bar, index sheets, fact boxes, the stamp.
- **Held card** (`box-shadow: 0 22px 40px -22px rgb(20 20 20 / 0.55)`, lifted `0 34px 50px -24px rgb(20 20 20 / 0.6)`): fan cards.
- **Sheet overlap** (`box-shadow: 0 -26px 48px -30px rgb(20 20 20 / 0.5)`): a case sheet sliding over the previous one.
- **Double ring** (`box-shadow: inset 0 0 0 2px ink, inset 0 0 0 4px paper, inset 0 0 0 5px ink`): the double-bordered box edge. Not a shadow; the border of the system.

### Named Rules
**The Paper-on-Paper Rule.** A shadow means a loose sheet. It is always soft, downward, ink-tinted and negatively spread; never offset hard, never coloured, never used on in-page boxes.

## Shapes

Small radii only: 6px on controls, thumbnails, focus rings and inset images; 10px on boxes, plates, cards, the type case tray and the floating bars; 4px on the inner language buttons, callouts and type sorts; square corners on the type case's compartments; round only for the EXTRA stamp (99px on its 200px box, which reads as a circle but keeps Chrome off its circle-only shaders) and the loupe. Work plates are additionally chamfered with a 14px octagonal clip on top of the 10px radius, and double-ringed (2px ink, 5px stock, 1px ink).

Borders are drawn as inset box-shadow rings rather than CSS borders, so double rules stay crisp at any width. Ornaments are SVG: a five-point star capping rules and column heads, the manicule (pointing hand) on primary actions and contents entries, a self-drawing fleuron closing the marquee and the verse.

### Named Rules
**The Round-Is-Rare Rule.** Only the stamp, the loupe and a key's lettered rings (drawn on the plate, or pinned there as 20px letters on small screens) are round. Everything else is a rectangle with a 4, 6 or 10px corner.

## Components

### Buttons
Two presses: a solid block of ink, or a double-ruled line.
- **Shape:** gently cornered (6px), 48px tall; small 38px, large 58px.
- **Ink button:** relief-ink fill, newsprint type, with an inner hairline ring (3px ink, then 1px of 60% paper) so it reads as a cut block. Carries the manicule on the primary action.
- **Line button:** transparent, double-ruled by inset rings (2px ink, 2px paper, 1px ink). Hover fills with aged stock and thickens the rings. On the EXTRA sheet it sits on newsprint.
- **Press:** `translateY(1px) scale(0.97)` over 160ms on the out ease. Disabled at 45% opacity with no press.
- **Focus:** 2px ink outline at 3px offset plus a 5px alarm-red ring (a paper ring on the EXTRA sheet), 6px radius.

### Words (links)
Wood-type words are the link and toggle style: Anybody 800, uppercase, 14px, underlined 2px at 6px offset in 30% ink. Hover (fine pointers) inks the rule fully at 3px; pressed or current inks it at 4px. Read links fade to ink-fade.

### Language control
A double-width 6px frame with a 2px inset ring holding EN and SQ; the pressed one is solid ink. Switching re-sets the page under type-case tiles: a grid of ink blocks over offset red under-plates (4px, 3px misregistration) that close and reopen.

### Plates and boxes
- **Plate:** aged-stock mount, 7px padding, double-ringed, 10px radius with a 14px chamfer; the screenshot inside at 3px radius. Captions in serif italic below. On capable devices the plate is redrawn in WebGL as an engraving and the loupe shows true colour.
- **Fact box:** newsprint, double-ringed, 10px, loose-sheet shadow, Anybody 850 uppercase 15px, each set at a slight tilt (-2.2, 1.6, -0.8 degrees).
- **Feature plate / thumbnails:** aged stock with a single 2px or 1.5px inset ring, 10px and 6px.

### Navigation
- **Toolbar:** a strip under a double rule; lockup left (name in fitted Anybody 900, descriptor tracked 0.28em between stars), words centred, language control and ink button right, cells divided by 1px rules.
- **Pill:** appears after the masthead leaves: a newsprint sheet, double-ringed, 10px, 58px tall, with an ink mark and words; a 2px ink rule along its foot fills with reading progress. Slides down on the out ease over 320ms.
- **Tab bar (phones):** fixed bottom, five slots, double-ringed newsprint, 10px; current item underlined 3px; the write slot is solid ink; press scales 0.96.
- **Index:** stacked paper sheets (10px, 2px ring, loose-sheet shadow) overlapping by 6px, each a title and an italic line with a manicule. On phones it stands at the foot of the screen under a short double-rule handle, and it can be pulled down to put it away: it follows the finger down (upward it gives only a little), a pull past 70px or a flick faster than 0.11px/ms carries it on down and away, anything less springs back (300ms, out ease). A pull never opens the sheet under the finger.
- **Fan of proofs (the work sheet):** five loose proofs dealt from a pile into an arch as the sheet arrives, two per live site and the preview's phone in the middle. Under a fine pointer they spread apart around the one under it. On phones the arch becomes a deck: one proof at the front, upright and at 1.22 scale, the others fanned behind it. Drag it sideways and it follows the finger; a quick flick deals the next proof forward even when the drag was short; past either end it gives, less the further it is pulled, and settles back. A tap on the front proof opens its sheet, a tap on one behind brings it forward. Two manicules under the fan deal for anyone who does not swipe, with a count (3 / 5) between them. Only a sideways drag belongs to the fan (`touch-action: pan-y`), so the page still scrolls through it.

### Inputs
The letter field is a single type sort: 56 by 48px, newsprint, 2px inset ink ring, 6px, set in Ultra 26px. The caret is alarm red.

### Type case (the languages)
Not the type-case tiles of the language switch: the languages he writes, set out like a compositor's case. An aged-stock tray, double-ringed like a plate mount (2px ink, 3px stock, 1px ink, 10px radius, 8px padding), holds one sheet of newsprint ruled into square compartments by 1px ink rules. Box size follows what the web uses most: 3 by 2 for HTML, CSS, JavaScript, TypeScript, PHP, Python and SQL, each with an italic line on what it is for; 2 by 1 and 1 by 1 for the rest. In page order the boxes tile the grid exactly, 12 columns by 6 rows, or 6 by 12 at 1100px and below. Names are Anybody caps (900 at 72% in the big boxes, 850 at 80 to 84% in the others), bottom-left, the italic line top-left. The first time the case comes into view the sorts drop into their boxes one after another (translateY from -0.5em and opacity, 460ms on the out ease, 22ms apart); reduced motion shows them set.

### Figure with key (case editions)
A plate of the live site and its key. The plate prints as the WebGL engraving and develops into colour as it comes up the sheet (start at 82% of the viewport, develop over the first 55% of the travel); then a lettered ring is drawn beside each detail and its rule runs out of the plate's edge, and the key labels (Ultra letter, italic serif line, on paper) fade in level with their rings, stacked at least 34px apart.

A ring never sits on what it names, and a rule never crosses a word. Where they go is worked out on the live page when the screenshot is taken (tools/shoot-work.mjs): the tool measures the detail's box (the control it sits in, its chip, or the ink of its text) and every visible line of text, control and picture on the screen, then sets the ring just outside the detail on the side facing the key, at the height where a straight rule to the plate's edge crosses nothing. A rule may graze the leading of a line or the padding of a button, never the letters; rules keep at least 18px of the shot apart (about 11px on the page) and in key order, so the letters read A, B, C down the column. Where nothing beside a detail is clear, the ring is pinned on the detail's edge. Both sides are stored (src/data/plates.json, `r` and `l`, each ring with the way out from its detail); the figure's `folio--flip` picks the left.

Up to 1100px the key is a list under the plate, each line led by its letter in a 20px ink ring, and the same letters are pinned on the plate where the rings would be (20px, 16px on phones); no rules are drawn. A desktop shot shrunk onto a phone makes a pinned letter several times the ring it stands for, so each pin steps out from its detail by the difference and never covers what it names.

### What the site does
A 2px rule, a star column head, then short factual lines in two columns under a 1px column rule, each line closed by a 1px rule; a dated italic note says when the site said so. One column on phones.

### The next sheet
The way on at the foot of each sheet: the next sheet's name ("Next: Bar Martiri") set in the display face and fitted across the measure, with a manicule that moves 10px on hover. It sits under a 6px plus 1.5px double rule like a sheet's head.

### Telegram blank (contact)
A loose sheet of newsprint (double ring, 10px, loose-sheet shadow) printed like a telegraph form: a strip under a 2px rule with TELEGRAM in the fat face, the addressee and a running word count (telegrams were paid by the word); fields as ruled lines, labels in Anybody 800 caps, entries in the serif at 21px, the message on ruled paper. A line that still needs filling carries the proof-reader's red underline (a mark, never red text); the message under it is ink. Sending checks the name, a few words and an email or phone, then hands the telegram to the visitor's mail app (or posts it, once a form service is set); the status line says which, and offers to copy the telegram if no mail app opens.

Once it has gone, the counter's stamp comes down on the blank: HANDED IN (or RECEIVED, when a form service posts it; DORËZUAR / PRANUAR in Albanian) over the Albanian time and date it went. It is a rectangle in ink (a 2.5px ring and an inner 1.5px ring, 6px corners, turned -6 degrees), printed unevenly through the same speckle mask as the inked heads, never red and never round (rings on an exact circle cost Chrome a shader compile on first sight). It gathers speed on the way down (scale 1.32 to 1 and -12 to -6 degrees over 170ms, ease-in) and stops dead; the blank judders, the press sounds if sound is on, and phones that can buzz give one 12ms knock, also only with sound on. The mail app opens once the stamp has landed, since on a phone it takes the whole screen. It sits across the strip's rule on a phone and just below it on a wide blank, clear of the addressee and the word count. It is decoration (aria-hidden): the status line says the same in words. Reduced motion fades it in.

### Set your own line (colophon)
A single field; whatever is typed is fitted across the measure in the display face as it is typed, width axis first and then size, the way every head on the sheet is set.

### The Stamp (signature)
The EXTRA sheet's round stamp: newsprint disc with a 3px ink ring, a 38px paper band carrying text on a circle, an inner 1px ring and a manicule; press scales 0.97. It sits on its own compositor layer, and its radius is 99px rather than 50%, so its rings and shadow use the same GPU shaders as every other box.

### The Press (signature motion)
One GSAP ticker drives everything, including Lenis smooth scroll and the WebGL render. State changes land with a judder (45ms steps then an 80ms settle). Sheets marked to feed open from a horizontal slit (`clip-path` inset from 50% to 0 over 760ms). The verse's inline cuts open from a thin line by transform (scaleY from 0.12, 520ms), never by a rounded clip-path. The brayer inks heads as a pure function of scroll; the head of a sheet without the proof counter (or on a return to the front page, once the counter has been seen that visit) is inked as the sheet opens. Moving from sheet to sheet, the new sheet feeds in over the old one through a horizontal slit (a cross-document view transition, `clip-path` inset from 50% to 0 over 620ms on the out ease; the opt-in is written inline in each page's head so the new sheet has it before anything loads). Easing tokens: out `cubic-bezier(0.23, 1, 0.32, 1)` for arrivals, in-out `cubic-bezier(0.77, 0, 0.175, 1)` for mode swaps. Under reduced motion there is no intro, no judder or feed, and every head, verse word, cut and rule shows finished.

**Under a finger.** A phone has no hover, so every pressable thing answers the press itself, on the `scale` property (it composes with the element's own transform) over 160ms on the out ease: fan proofs 0.97, the contents' thumbnails 0.92 (and their manicule points), index sheets 0.98, the fan's manicules 0.92; a word inks its rule at 4px while pressed, and the next sheet's line dips 2px while its manicule moves on. iOS Safari shows these only on a page that listens for touches, so the page registers an empty passive `touchstart` listener. With no pointer to stir it, the engraving band answers a tap: the wet ink is flicked outward from the fingertip in a ring of pushes over four frames, fading, and the plates slip out of register around it, then settle within about a second. The tap is only noted by the event; the splats are made in the frame, so the one clock still does all the drawing. Swipes over the band stay the page's scroll.

## Do's and Don'ts

### Do:
- **Do** separate content with ink rules (1px, 2px, and the 6px plus 1.5px double rule) instead of filled panels.
- **Do** fit display type per line on Anybody's width axis or Ultra's size, and hold it in `minmax(0, 1fr)` tracks.
- **Do** draw box edges as inset double rings (2px ink, 2px paper, 1px ink) with 6px or 10px corners.
- **Do** keep Alarm Red to its flood (engraving band, EXTRA sheet) and its press marks (focus ring, caret, proof marks, tiles, intro stamp).
- **Do** register any new mode-dependent colour with `@property` so PRINT and PROOF cross-fade.
- **Do** give every state change the press judder, and let reduced motion show the finished state.
- **Do** keep all motion on the one GSAP ticker; nothing gets its own requestAnimationFrame loop.

### Don't:
- **Don't** use a second hue, gradients, or tinted panels; the world has one ink and one red.
- **Don't** set Alarm Red as the colour of reading-size text on newsprint.
- **Don't** round anything fully except the stamp, the loupe and a key's lettered rings.
- **Don't** set a callout ring on the detail it names, or run its rule through a word: the ring goes beside the detail and the rule through clear space.
- **Don't** give in-page boxes shadows, or give floating sheets a hard offset shadow.
- **Don't** stretch display type with transforms or letter-spacing to fill a measure.
- **Don't** set running copy in Anybody or Ultra.
- **Don't** animate a clip-path with rounded corners, or give an exact circle rings and a soft shadow: Chrome compiles GPU shaders for them the first time they are drawn, mid-scroll. Open by transform, and keep round shapes at 99px on 200px.
