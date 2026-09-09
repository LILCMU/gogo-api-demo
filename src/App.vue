<template>
  <div id="app">
    <a class="skip-link" href="#main">Skip to content</a>
    <app-header />
    <main id="main">
      <router-view />
    </main>
  </div>
</template>

<script>
import AppHeader from "@/components/AppHeader.vue";

export default {
  name: "App",
  components: { AppHeader },
};
</script>

<style>
/*? the default 8px body margin left a white gutter around the blue header —
    invisible while the header was white on a grey page, obvious once it wasn't */
body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--gogo-slate);
  background: var(--page-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  /*? dvh, not vh — vh is the tallest viewport on iOS Safari, so the page
      jumps as the address bar collapses */
  min-height: 100dvh;
}

/*? first tab stop on every page — visible only once focused */
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 30;
  padding: 10px 18px;
  background: var(--gogo-green);
  color: var(--gogo-ink);
  font-weight: 700;
  border-radius: 0 0 var(--radius-inner) 0;
}

.skip-link:focus {
  left: 0;
  top: 0;
}

.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5) var(--space-7);
}

.page-head {
  display: flex;
  align-items: flex-end;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.page-title {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--gogo-ink);
  margin: 0;
  text-wrap: balance;
}

.page-lede {
  flex: 1 1 320px;
  max-width: 62ch;
  margin: 0;
  padding-bottom: 5px;
  font-size: 14.5px;
  color: var(--muted);
  text-wrap: pretty;
}

.page__empty {
  color: var(--muted);
  background: var(--card-bg);
  border-left: var(--stripe) solid var(--gogo-blue);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
  padding: var(--space-5);
}

/*? inside a card the full-page empty state is far too tall */
.page__empty--compact {
  padding: var(--space-3) var(--space-4);
  font-size: 13.5px;
}

.section-label {
  font-size: 12px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--gogo-ink);
  font-weight: 700;
  margin: var(--space-6) 0 var(--space-3);
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap);
}

.chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--gogo-blue-tint);
  color: var(--gogo-ink);
  font-size: 13px;
  font-weight: 700;
  padding: 6px 15px;
  border-radius: var(--radius-pill);
}

/*? the key is the quiet half — the value is what you came to read */
.chip__k {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
}

/*? $btn-secondary — green outline on white that fills on hover; $btn-primary
    is the same pill already filled. Uppercase and tracked, as in GoGoCode */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 38px;
  padding: 0 20px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  /*? ink on green, never white — white is 1.7:1 on this green. GoGoCode's own
      .btn-primary uses white; this app deliberately does not */
  color: var(--gogo-ink);
  background: var(--card-bg);
  border: 2px solid var(--gogo-green);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
}

.btn:hover:not([disabled]) { background: var(--gogo-green-lit); border-color: var(--gogo-green-lit); }

/*? a press has to read as physical — hover alone leaves the button inert */
.btn:active:not([disabled]) { transform: translateY(1px); box-shadow: none; }

.btn--primary { background: var(--gogo-green); box-shadow: var(--glow-green); }

/*? the download actions are a different kind of act from Run, so they take the
    blue rather than sharing --btn--primary's green. Ink on this blue is 4.9:1;
    white would be 2.65:1, the same failure the header already documents */
.btn--info { background: var(--gogo-blue); border-color: var(--gogo-blue); box-shadow: var(--glow-blue); }
.btn--info:hover:not([disabled]) { background: var(--gogo-blue-lit); border-color: var(--gogo-blue-lit); }

.btn--large { min-height: 52px; padding: 0 40px; font-size: 15px; letter-spacing: 0.12em; }

/*? vertical padding alone (not font-size) clears the 36px tablet hit-target
    floor — the ~26px height came from 4px, not from the 12px text */
.btn--small { min-height: 34px; padding: 0 14px; font-size: 11.5px; }

.btn--ghost { border-color: var(--hairline); color: var(--muted); }
.btn--ghost:hover:not([disabled]) { background: var(--sunk-bg); border-color: var(--gogo-blue); color: var(--gogo-ink); }

.btn--danger { color: var(--danger); border-color: var(--danger); background: var(--card-bg); }
.btn--danger:hover:not([disabled]) { background: var(--danger); border-color: var(--danger); color: #fff; }

/*? overrides .btn--primary's green fill too, via the attribute selector's
    higher specificity — opacity alone made disabled Beep pale grey on pale
    green, which fails legibility */
.btn[disabled] {
  color: var(--inactive-control);
  background: var(--sunk-bg);
  border-color: var(--hairline);
  box-shadow: none;
  cursor: not-allowed;
}

/*? one hairline between rows, not a border per row — the group is the object */
.control-rows {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  background: var(--hairline);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
}

.control-row {
  display: flex;
  align-items: center;
  gap: var(--gap);
  background: var(--card-bg);
  padding: 11px var(--pad);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow-lo);
  margin-bottom: var(--space-2);
  transition: background 0.15s ease;
}

/*? inside the group the rows are one object, so they drop their own edges */
.control-rows .control-row {
  border-radius: 0;
  box-shadow: none;
  margin-bottom: 0;
}

.control-rows .control-row:hover { background: var(--sunk-bg); }

.control-row__name { font-weight: 700; min-width: 82px; color: var(--gogo-ink); }
.control-row__value { color: var(--muted); min-width: 52px; font-variant-numeric: tabular-nums; }

.readout { display: flex; flex-direction: column; gap: 2px; }

/*? scale cue on the Sensors heading — a bare number tells a child nothing
    about whether 512 is a lot */
.section-label__note { font-weight: 400; letter-spacing: 0; color: var(--faint); text-transform: none; font-size: 12.5px; }
.readout span { font-size: 11px; color: var(--dark-panel-label); font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase; }
.readout strong { font-size: 23px; color: var(--dark-panel-value); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

.bytes {
  font-family: var(--font-mono);
  font-size: 12.5px;
  background: var(--gogo-ink);
  border-radius: var(--radius-card);
  padding: var(--pad) 20px;
  overflow-x: auto;
  color: #cfe3ec;
  box-shadow: var(--widget-shadow);
}

.bytes--dump { line-height: 1.95; }
.bytes__row { white-space: nowrap; }

.bytes__offset {
  display: inline-block;
  width: 3ch;
  text-align: right;
  color: #5d879b;
}

.bytes__sep {
  display: inline-block;
  width: 2ch;
  text-align: center;
  color: #5d879b;
}

.bytes__cell {
  display: inline-block;
  width: 2.6ch;
  text-align: center;
}

.bytes__cell--gap { margin-left: 1ch; }

/*? four colour roles, reused across frame kinds — a type-0 report has no
    command byte and a write frame has no sensors, so no single dump ever shows
    two meanings on one hue. Every dump carries its own legend to say which */
.bytes__cell--category,
.bytes__cell--type    { background: var(--gogo-blue);   color: #04202c; font-weight: 700; border-radius: 3px; }
.bytes__cell--command,
.bytes__cell--builtin { background: var(--gogo-orange); color: #33240c; font-weight: 700; border-radius: 3px; }
.bytes__cell--sensors,
.bytes__cell--payload,
.bytes__cell--status  { background: var(--gogo-green);  color: #22330a; font-weight: 700; border-radius: 3px; }
.bytes__cell--board,
.bytes__cell--length  { background: var(--gogo-pink);   color: #fff;    font-weight: 700; border-radius: 3px; }
.bytes__row--header .bytes__cell { color: #5d879b; }

.bytes-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--pad);
  margin-top: var(--space-3);
  font-size: 12px;
  color: var(--muted);
}

.bytes-legend__item { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; }

.bytes-legend__swatch { width: 11px; height: 11px; border-radius: 3px; flex: none; }
.bytes-legend__swatch--category,
.bytes-legend__swatch--type    { background: var(--gogo-blue); }
.bytes-legend__swatch--command,
.bytes-legend__swatch--builtin { background: var(--gogo-orange); }
.bytes-legend__swatch--sensors,
.bytes-legend__swatch--payload,
.bytes-legend__swatch--status  { background: var(--gogo-green); }
.bytes-legend__swatch--board,
.bytes-legend__swatch--length  { background: var(--gogo-pink); }

/*? ties a decoded value on the right back to the bytes it came from — without
    it the decode reads as a separate, unrelated panel */
.facts dt { display: flex; align-items: center; gap: 7px; }

.facts__swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.facts__swatch--type    { background: var(--gogo-blue); }
.facts__swatch--builtin { background: var(--gogo-orange); }
.facts__swatch--sensors { background: var(--gogo-green); }
.facts__swatch--board   { background: var(--gogo-pink); }

.bytes-legend__chip { padding: 2px 7px; border-radius: 3px; font-weight: 700; }
.bytes-legend__chip--category { background: var(--gogo-blue); color: #04202c; }
.bytes-legend__chip--command { background: var(--gogo-orange); color: #33240c; }

/*? shared by Logo and Datalog: a numbered sequence of real frames, each shown
    as the bytes that actually go on the wire */
.wire { display: flex; flex-direction: column; gap: var(--space-4); }

.wire__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: 0 0 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--gogo-ink);
}

.wire__step {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--gogo-blue);
  color: #fff;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/*? the frame that closes a stage is the one worth finding in a long sequence */
.wire__step--end { background: var(--gogo-green); color: var(--gogo-ink); }

.wire__note { font-weight: 400; color: var(--muted); font-size: 12.5px; }

.wire__tail {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: 0;
  font-size: 12.5px;
  color: var(--faint);
}

.action-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 1.4em;
  margin-top: var(--space-4);
  font-size: 14px;
  color: var(--muted);
}

.action-message.is-error { color: var(--danger); font-weight: 700; }

/*? a placeholder is an example, not a value — at the same weight and colour as
    real input it reads as text the user already typed. The visible label above
    each field carries the meaning, so this can sit well back */
::placeholder {
  color: var(--faint);
  opacity: 1; /*? Firefox dims placeholders again on top of the colour */
  font-style: italic;
}

.btn:focus-visible,
input:focus-visible,
textarea:focus-visible,
a:focus-visible {
  outline: 2px solid var(--gogo-blue);
  outline-offset: 2px;
}

/*? bare OS control otherwise — height covers the 36px tablet hit-target
    floor even though the visible track is much thinner */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 168px;
  height: 36px;
  padding: 0;
  background: transparent;
  vertical-align: middle;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  background: var(--gogo-blue);
  border-radius: var(--radius-pill);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  margin-top: -10px; /*? centers the 26px thumb on the 6px track */
  background: var(--gogo-blue);
  border: 3px solid var(--card-bg);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--gogo-blue);
}

input[type="range"]::-moz-range-track {
  height: 6px;
  background: var(--gogo-blue);
  border-radius: var(--radius-pill);
}

input[type="range"]::-moz-range-thumb {
  width: 26px;
  height: 26px;
  background: var(--gogo-blue);
  border: 3px solid var(--card-bg);
  border-radius: 50%;
  box-sizing: border-box;
}

/*? matches .btn[disabled] — desaturate the track rather than fading the
    whole control, which is the approach this app moved away from */
input[type="range"]:disabled { cursor: not-allowed; }
input[type="range"]:disabled::-webkit-slider-runnable-track { background: var(--inactive-control); }
input[type="range"]:disabled::-webkit-slider-thumb { background: var(--inactive-control); box-shadow: 0 0 0 1px var(--inactive-control); }
input[type="range"]:disabled::-moz-range-track { background: var(--inactive-control); }
input[type="range"]:disabled::-moz-range-thumb { background: var(--inactive-control); }

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}

@media (max-width: 940px) {
  .tile-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .page { padding: var(--space-5) var(--space-4) var(--space-6); }
  .page-title { font-size: 27px; }
  .tile-grid { grid-template-columns: 1fr; }
  .control-row { flex-wrap: wrap; }
}
</style>
