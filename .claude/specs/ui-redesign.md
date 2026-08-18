# UI redesign — audit and direction

## Design read

Redesign-preserve of an internal WebHID device console for engineers and
teachers, with a technical-instrument language, leaning toward native CSS
variables + Source Sans 3 (the GoGoCode brand font) + tabular numerics +
near-zero motion.

Dials: `DESIGN_VARIANCE 4` / `MOTION_INTENSITY 3` / `VISUAL_DENSITY 6`.
Low variance and low motion are deliberate — this app is documentation that
runs. Asymmetry and scroll choreography would fight the "open one page, read
one file, copy it" goal stated in CLAUDE.md.

## Constraints the redesign may not trade away

1. **Copy-readability.** The views are the documentation. Templates stay flat
   and legible; no wrapper soup added for visual effect.
2. **Existing a11y work.** 36px hit targets, focus-visible rings, `aria-live`,
   contrast-safe disabled states. All deliberate, all commented, all kept.
3. **Brand palette.** `tokens.css` mirrors GoGoCode's real `_variables.scss`.
   Green/orange never carry white text; `--gogo-pink` is fill only.
4. **Four-tone sensor tiles are functional**, not decoration — they colour-code
   ports 1-4. The "one accent only" rule does not apply to them.
5. **`src/gogo/` is untouched.** Device service, no styling.
6. **gh-pages triple coupling** in `public/index.html` is untouched.

## Findings

### Typography
- No brand font. `Avenir, Helvetica, Arial` is a macOS-only guess that renders
  Helvetica or Arial for most users. GoGoCode uses **Source Sans 3**.
- Only 400/700 in play. No 600 for the mid-tier hierarchy.
- Live sensor values are proportional digits and stream continuously, so tile
  widths jitter. Needs `font-variant-numeric: tabular-nums`.
- `.page-title` at 26px/700 has no presence; every page opens identically flat.
- No `max-width` on body copy; helper text runs the full 900px column.

### Colour and surface
- Page is `#f7f8fa` flat with `#fff` cards and zero elevation. Cards are
  distinguished by nothing but fill, so grouping reads weakly.
- No shadows at all, tinted or otherwise. Nothing sits above anything.
- `--muted: #4f6b7d` is the only secondary text value; no third step for
  captions.
- Dark surfaces (`DarkPanel`, `.board-state`) are the one strong move and are
  used well. Keep and extend that idea rather than inventing a new one.

### Layout
- `min-height: 100vh` on `#app` — jumps on iOS Safari. Should be `100dvh`.
- `.tile-grid` is a hard `repeat(4, 1fr)` with no responsive collapse. Below
  ~560px the sensor tiles are unreadable.
- `.page` is 900px for every page. Datalog's chart and Packets' byte dump both
  want more; Control wants less.
- Header nav wraps at narrow widths with no mobile treatment.
- Vertical rhythm is ad-hoc: `26px 0 10px`, `1.5em`, `0.5em`, `1em auto` all
  appear. No spacing scale.

### States and interaction
- `.btn` has hover but **no `:active`**. Nothing feels pressed.
- `.btn--danger:hover` sets the same background it already has — a dead rule.
- Empty states are plain dashed boxes reading "Connect a GoGo Board." They are
  the first thing every visitor sees, and they teach nothing. This is the
  single biggest miss against the project's access goal.
- Active nav link is distinguished by colour alone (`--muted` to `--gogo-ink`).
- No loading state during datalog sync beyond a progress bar; Logo compile has
  no skeleton.
- Transitions are `0.15s` on background only, inconsistently applied.

### Markup and head
- `<html lang="">` is empty. Screen readers get no language.
- `#app` is a `div` wrapping `<main>`; pages are `<section>` not `<main>`.
- No `<meta name="description">`, no OG tags, no themed favicon.
- No skip-to-content link.
- No custom 404 view — the router redirects everything to `/live`, which hides
  typos rather than explaining them.

## Direction

- **Type**: Source Sans 3 at 400/600/700, self-declared fallback stack. Display
  sizes gain negative tracking; all numeric readouts get tabular figures.
- **Surface**: keep the light page, add one tinted elevation step (shadow in
  `--gogo-ink` hue, not black) so cards read as objects. Ink panels stay the
  contrast device for "what the board reports".
- **Rhythm**: one spacing scale (`--space-1` .. `--space-7`), one radius rule
  (containers 18px, inner elements 10px, interactive full-pill).
- **Empty state becomes the onboarding surface**: Chrome requirement, cable,
  Connect button, in that order, on every page that needs a board.
- **States completed**: `:active` press on every button, skeletons for sync and
  compile, inline errors already present kept.
- **Motion**: 150-200ms transform/opacity only, behind
  `prefers-reduced-motion`. No scroll choreography, no marquees, no glass.

## What shipped

Branch `feature/ui-redesign`, off `develop`.

- **Brand recovered from GoGoCode**, not invented: blue header chrome
  (`$top-nav-bg`), white ground (`$body-bg`), green glow shadows
  (`$greeny-box-shadow`), 30px uppercase tracked pills (`$btn-border-radius`
  plus the `.btn` rule), 12px card radius (`$cc-radius`), the green left stripe
  (`$info-widget-border`), slate body text (`$body-color`), `$brand-danger` red.
- **Source Sans 3 + JetBrains Mono** loaded from Google Fonts in
  `public/index.html`. Source Sans 3 is GoGoCode's `$font-family-sans-serif`.
- **One deliberate divergence**: GoGoCode's `.btn-primary` is white on green
  (1.7:1) and its nav is white on blue (2.6:1). Both fail AA. This app uses ink
  on green (8.4:1) and ink on blue (4.8:1) instead.
- **No dark mode** — single light theme, by request.
- `BoardOnboarding.vue` replaces the dashed empty box on Live, Control and
  Datalog with the three-step connect flow plus a requirements panel.
- `Reference.vue` renders `src/reference/*.js` through purpose-built block
  types — byte maps, frame diagrams, callouts, tables, steps — in the same
  design system as the tool pages. `GuideLink.vue` puts a quiet entry point
  next to each section heading, deep-linking to the matching reference anchor.
- Router gained `/reference/:doc(protocol|datalog)` and a `scrollBehavior` that
  honours the hash, without which the guide links would navigate but not scroll.

Two real bugs found by driving the built app rather than reading it:

1. `body` kept its default 8px margin, leaving a white gutter around the blue
   header. Invisible while the header was white on a grey page.
2. `.split__main` on Packets floored at the byte dump's min-content width, so
   the page scrolled sideways at 390px instead of the dump scrolling inside
   itself. Fixed with `min-width: 0`.

Verified: `npm run lint`, `npm test` (44 pass), `npm run build`, and all seven
pages driven in a browser at 1440px and 390px — zero console errors, no
horizontal overflow, guide-link anchors landing on target.

Not verified: anything requiring a physical board. Every page was exercised in
its disconnected state, which is what renders without hardware.

## Hardware verification, GoGo Board 7F firmware 4.0.0

Driven against a physical board, not a fixture:

- **Live** — chips read `GoGo Board 7 / 7F / 4.0.0`; built-ins 23°C, 64% RH,
  light 579, 46 dB; accelerometer z = 997 milli-g at rest, rendered 1.00 g.
- **Control** — beep sent. Servo 1 driven 90° to 120° and the board's own
  report echoed 120° back into the board-state pill, then restored to 90°.
- **Relay scale confirmed** — relay 1 set to 40 reported back `40`, the percent
  scale, matching what the reference page states. Set back to 0.
- **Packets** — the live type-0 dump highlights 1 packet-type byte, 8 sensor
  bytes and 5 board-identity bytes. Row 0 read `00 03ff 0000 0000 0000 03ff …`,
  and `0x03ff` = 1023 matches the sensor 1 tile. A beep packet built in the
  form sent cleanly.
- **Datalog** — two full syncs, both returning `lookupTableSize 18` /
  `recordsSize 1570` → 157 records over fields `light` and `illuminance`.
  1570 / 10 = 157 confirms the 10-byte record layout again.
- **Logo** — the wire-packet view was checked against both chunking cases:
  61 bytes produces pointer + 60-byte write + 1-byte write; 60 bytes produces
  pointer + 60-byte write + the zero-length commit frame `01 03 00 …`. The
  60-byte-multiple rule is now visible on screen rather than only described.

Deliberately not run:

- **Datalog delete** — the board holds 157 real records that must be kept.
- **Logo compile and download** — overwrites the board's stored program, and
  7.x has no read-back command, so it is not reversible. Needs a go-ahead.

Known cosmetic limit: the three-stage sync indicator is correct but visible for
only about 7 frames on a 157-record transfer. It is there for a stalled or large
sync, not for a small one.

## Wire views

Two pages now show the frames that actually go on the wire, built with the same
`buildCommand` / `buildLogoWriteSequence` the send paths use, so the display
cannot drift from what is sent. The `.wire` block is shared in `App.vue`;
`src/utils/trimFrame.js` cuts each frame to its last meaningful 16-byte row.

- **Logo** — pointer reset then one write per chunk. Verified at 61 bytes
  (pointer + 60-byte write + 1-byte write) and at 60 bytes, where the trailing
  zero-length commit frame `01 03 00 …` appears. The 60-byte-multiple rule is
  now visible rather than only described.
- **Datalog** — the request frame plus every type-20 response, captured from
  `packet.raw` during the sync. On the test board: 29 frames, of which the
  request and the three stage-enders are shown by default and 26 in-progress
  frames sit behind an explicit "Show all", never a silent cap.

Read straight off a real sync, which is the point of the view:

    14 08 02 04 31 38 0a 31 35 37 30 0a   ->  status 4, ASCII "18\n1570\n"
    14 12 02 05 6c 69 67 68 74 2c ...     ->  status 5, ASCII "light,illumi..."
    14 24 02 06 ...                       ->  status 6, 36 payload bytes

Fixed along the way: moving the date picker into the actions row had orphaned
its help paragraph, which is the input's `aria-describedby` target. Label,
control and help are one block again.

## Logo editor

The source and opcode inputs are CodeMirror, matching GoGoCode's own editor
(`vue-codemirror@4` / CodeMirror 5, `base16-dark`, line numbers, active line,
close brackets). Same library the target project uses, so what is prototyped
here is what a learner sees there. Cost: vendor chunk 544 KiB to 747 KiB.

Two bugs surfaced while wiring it, both inherited from GoGoCode:

1. `mode: 'text/python'` is not a registered CodeMirror MIME — only
   `text/x-python` is — so the mode silently resolves to the null mode and
   nothing highlights at all. GoGoCode's `ProgramEditor.vue` has this typo.
2. Python mode is the wrong language regardless. **Logo comments start with
   `;`, Python's with `#`**, so every Logo comment renders as code and every
   `#` renders as a comment.

`src/components/logoMode.js` is a real Logo mode instead, generated from the
compiler's own `reserved` table in `gogo-logo-compiler/tinkerlogo.py` and
mirroring its lexer: `;.*` comments, `".*?"` strings, `\d+\.\d+` floats,
`[a-zA-Z_][a-zA-Z_0-9]*` identifiers. The 257 reserved words are split into 26
structure words (`to`, `repeat`, `ifelse`, ...) and the rest as builtins, so a
program's shape and its board calls read apart. Regenerate from that table if
the language gains words.

Also fixed: the compile-error status line said "see details below" while the
detail block renders above it. It now states the fact that matters -- nothing
was sent to the board.

## Navigation grouping

Three pairs rather than an uneven 3/2/1: **Live, Control | Datalog, Logo |
Packets, Reference** — what the board is doing now, what it has stored, and the
protocol underneath. Fits one line at 1440 and 1024; scrolls inside the bar
below 860.

## Frame sent, on Control

Control shows the frame its last click put on the wire, hidden until something
is sent. It is not the Packets page moved: Packets *authors* arbitrary frames
and inspects the inbound stream, while this only echoes the one frame the click
produced. Built with the same `buildCommand` the send path uses.

Live deliberately does not get one. It has no outbound frames, its inbound
type-0 report is already dumped on Packets, and a second copy would weigh down
the page most aimed at readers who just want sensor values.

Verified on hardware:

    beep            00 0b                  cmd 11 BEEP, no params
    servo 1 -> 120  00 11 01 00 78         cmd 17, port mask 01, 0x0078 = 120

The two-byte angle split the reference documents is visible in the dump.

`src/utils/wireFrame.js` now holds `trimFrame` and the shared `LEGEND_LABELS`
for the three pages that render frames; the per-view copies are gone.
