<template>
  <div id="app">
    <app-header />
    <router-view />
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
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--gogo-ink);
  background: var(--page-bg);
  min-height: 100vh;
}

.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}

.page__empty {
  color: var(--muted);
  background: var(--card-bg);
  border: 1px dashed var(--hairline);
  border-radius: var(--radius-card);
  padding: 40px;
  text-align: center;
}

.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin: 26px 0 10px;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap);
}

.pills { display: flex; gap: 8px; }

.pill {
  background: var(--gogo-green-tint);
  color: var(--gogo-ink);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
}

.btn {
  font-size: 14px;
  font-weight: 700;
  color: var(--gogo-ink);
  background: var(--card-bg);
  border: 2px solid var(--hairline);
  border-radius: var(--radius-pill);
  padding: 9px 20px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover:not([disabled]) { background: var(--gogo-green-tint); }

.btn--primary { background: var(--gogo-green); border-color: var(--gogo-green); }

.btn--large { font-size: 18px; padding: 16px 44px; }

.btn[disabled] { opacity: 0.4; cursor: not-allowed; }

.control-row {
  display: flex;
  align-items: center;
  gap: var(--gap);
  background: var(--card-bg);
  border-radius: var(--radius-card);
  padding: 12px var(--pad);
  margin-bottom: 8px;
}

.control-row__name { font-weight: 700; min-width: 90px; }
.control-row__value { color: var(--muted); min-width: 48px; }

.readout { display: flex; flex-direction: column; gap: 2px; }
.readout span { font-size: 11px; color: var(--dark-panel-label); font-weight: 700; }
.readout strong { font-size: 18px; color: var(--dark-panel-value); }

.bytes {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  background: var(--card-bg);
  border-radius: var(--radius-card);
  padding: var(--pad);
  overflow-x: auto;
  color: var(--gogo-ink);
}

.bytes--dump { line-height: 1.8; }
.bytes__row { white-space: nowrap; }

.bytes__offset {
  display: inline-block;
  width: 2ch;
  text-align: right;
  color: var(--muted);
}

.bytes__sep {
  display: inline-block;
  width: 2ch;
  text-align: center;
  color: var(--muted);
}

.bytes__cell {
  display: inline-block;
  width: 2.5ch;
  text-align: center;
}

.bytes__cell--gap { margin-left: 1ch; }
.bytes__cell--category { background: var(--gogo-blue-tint); color: var(--gogo-ink); border-radius: 4px; }
.bytes__cell--command { background: var(--gogo-orange-tint); color: var(--gogo-ink); border-radius: 4px; }
.bytes__row--header .bytes__cell { color: var(--muted); }

.bytes-legend { margin-top: 8px; font-size: 12px; color: var(--muted); }

.bytes-legend__chip { padding: 1px 6px; border-radius: 4px; }
.bytes-legend__chip--category { background: var(--gogo-blue-tint); color: var(--gogo-ink); }
.bytes-legend__chip--command { background: var(--gogo-orange-tint); color: var(--gogo-ink); }

.action-message { min-height: 1.2em; margin-top: 16px; font-size: 14px; color: var(--muted); }
.action-message.is-error { color: var(--gogo-pink-text); }
</style>
