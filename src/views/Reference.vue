<template>
  <section class="page page--wide reference">
    <div class="page-head">
      <h1 class="page-title">{{ content.title }}</h1>
      <p class="page-lede">{{ content.lede }}</p>
    </div>

    <div class="reference__tabs">
      <router-link class="reference__tab" to="/reference/protocol">Wire protocol</router-link>
      <router-link class="reference__tab" to="/reference/datalog">Offline datalog</router-link>
      <router-link class="reference__tab" to="/reference/logo">Logo language</router-link>
    </div>

    <div class="reference__body">
      <!--? sticky rather than fixed so it scrolls away with the page on short
           viewports instead of overlapping the content -->
      <nav class="reference__toc" aria-label="On this page">
        <p class="reference__toc-title">On this page</p>
        <a v-for="section in content.sections" :key="section.id" :href="'#' + section.id">{{ section.title }}</a>

        <!--? argument kinds appear in every signature on the page, so the key
             rides along in the sticky column rather than scrolling away -->
        <dl v-if="content.legend" class="reference__legend">
          <p class="reference__toc-title">Reading a signature</p>
          <template v-for="item in content.legend">
            <dt :key="item.token + '-t'"><code>{{ item.token }}</code></dt>
            <dd :key="item.token + '-d'">{{ item.means }}</dd>
          </template>
        </dl>
      </nav>

      <div class="reference__main">
        <section v-for="section in content.sections" :key="section.id" :id="section.id" class="ref-section">
          <h2 class="ref-section__title">{{ section.title }}</h2>

          <template v-for="(block, i) in section.blocks">
            <p v-if="block.type === 'prose'" :key="i" class="ref-prose">
              <template v-for="(run, r) in block.runs">
                <code v-if="run.code" :key="r">{{ run.code }}</code>
                <strong v-else-if="run.b" :key="r">{{ run.b }}</strong>
                <template v-else>{{ run }}</template>
              </template>
            </p>

            <div v-else-if="block.type === 'note'" :key="i" class="ref-note" :class="'ref-note--' + block.tone">
              <p class="ref-note__title">{{ block.title }}</p>
              <p class="ref-note__body">
                <template v-for="(run, r) in block.runs">
                  <code v-if="run.code" :key="r">{{ run.code }}</code>
                  <strong v-else-if="run.b" :key="r">{{ run.b }}</strong>
                  <template v-else>{{ run }}</template>
                </template>
              </p>
            </div>

            <div v-else-if="block.type === 'table'" :key="i" :id="block.id" class="ref-table-wrap">
              <table class="ref-table">
                <thead>
                  <tr>
                    <th v-for="(cell, c) in block.head" :key="c">{{ cell }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, r) in block.rows" :key="r">
                    <!--? a cell is either plain text or { text, to }, which deep-links
                         to an id further down the page; anything else stays literal -->
                    <td
                      v-for="(cell, c) in row"
                      :key="c"
                      :class="{ 'is-mono': block.mono && block.mono.indexOf(c) !== -1 }"
                    ><a v-if="cell && cell.to" :href="cell.to">{{ cell.text }}</a><template v-else>{{ cell }}</template></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else-if="block.type === 'frame'" :key="i" class="ref-frame">
              <div
                v-for="(field, f) in block.fields"
                :key="f"
                class="ref-frame__field"
                :class="'ref-frame__field--' + field.tone"
                :style="{ flexGrow: field.span }"
              >
                <span class="ref-frame__index">{{ field.index }}</span>
                <span class="ref-frame__label">{{ field.label }}</span>
              </div>
            </div>

            <byte-map v-else-if="block.type === 'bytemap'" :key="i" :size="block.size" :regions="block.regions" />

            <!--? a worked program: block.lines rendered verbatim, with an
                 optional caption below -->
            <div v-else-if="block.type === 'codeblock'" :key="i">
              <pre class="bytes">{{ block.lines.join('\n') }}</pre>
              <p v-if="block.caption" class="ref-codeblock__caption">{{ block.caption }}</p>
            </div>

            <ol v-else-if="block.type === 'steps'" :key="i" class="ref-steps">
              <li v-for="(item, s) in block.items" :key="s" class="ref-step">
                <span class="ref-step__n">{{ s + 1 }}</span>
                <div>
                  <div class="ref-step__t">{{ item.title }}</div>
                  <div class="ref-step__d">
                    <template v-for="(run, r) in item.runs">
                      <code v-if="run.code" :key="r">{{ run.code }}</code>
                      <strong v-else-if="run.b" :key="r">{{ run.b }}</strong>
                      <template v-else>{{ run }}</template>
                    </template>
                  </div>
                </div>
              </li>
            </ol>
          </template>
        </section>

        <p class="reference__source">
          Verified against GoGo Board 7.x firmware. The markdown originals live in
          <code>docs/protocol.md</code>, <code>docs/offline-datalog.md</code> and
          <code>docs/logo-language.md</code>.
        </p>
      </div>
    </div>
  </section>
</template>

<script>
import ByteMap from "@/components/ByteMap.vue";
import protocol from "@/reference/protocol";
import datalog from "@/reference/datalog";
import logo from "@/reference/logo";

const DOCS = { protocol: protocol, datalog: datalog, logo: logo };

export default {
  name: "Reference",
  components: { ByteMap },
  props: {
    //? constrained to protocol|datalog|logo by the route regex, so no fallback needed
    doc: { type: String, required: true },
  },
  computed: {
    content: function () {
      return DOCS[this.doc];
    },
  },
  watch: {
    //? the tab strip swaps :doc without remounting, so the title has to follow
    doc: {
      immediate: true,
      handler: function (doc) {
        document.title = DOCS[doc].title + " · GoGo API Demo";
      },
    },
  },
};
</script>

<style>
.reference__tabs { display: inline-flex; gap: 3px; padding: 4px; margin-bottom: var(--space-5); background: var(--sunk-bg); border-radius: var(--radius-pill); }

.reference__tab {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 20px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.reference__tab:hover { background: var(--card-bg); color: var(--gogo-ink); }
.reference__tab.router-link-active { background: var(--gogo-green); color: var(--gogo-ink); box-shadow: var(--glow-green); }

.reference__body { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: var(--space-6); align-items: start; }

.reference__toc { position: sticky; top: var(--space-5); display: flex; flex-direction: column; gap: 1px; }

.reference__toc-title {
  margin: 0 0 var(--space-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--faint);
}

.reference__toc a {
  padding: 7px 12px;
  border-left: 2px solid var(--hairline);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.reference__toc a:hover { border-left-color: var(--gogo-blue); color: var(--gogo-ink); background: var(--gogo-blue-tint); }

.reference__legend { margin: var(--space-4) 0 0; display: grid; grid-template-columns: auto 1fr; gap: 4px var(--space-2); align-items: baseline; }
.reference__legend .reference__toc-title { grid-column: 1 / -1; }
.reference__legend dt { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--gogo-ink); }
.reference__legend dd { margin: 0; font-size: 12px; color: var(--muted); }

.reference__main { display: flex; flex-direction: column; gap: var(--space-7); min-width: 0; }

/*? scroll-margin, not padding — the anchor target has to clear the top of the
    viewport when a guide link jumps straight into the middle of the page */
.ref-section { display: flex; flex-direction: column; gap: var(--space-4); scroll-margin-top: var(--space-5); }

.ref-section__title {
  margin: 0;
  padding-bottom: var(--space-3);
  border-bottom: 2px solid var(--hairline);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--gogo-ink);
}

.ref-prose { margin: 0; max-width: 68ch; font-size: 14.5px; line-height: 1.65; color: var(--gogo-slate); text-wrap: pretty; }

.reference code,
.ref-prose code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--sunk-bg);
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--gogo-ink);
}

/* --- callouts --------------------------------------------- */

.ref-note {
  padding: var(--pad) 20px;
  border-left: var(--stripe) solid var(--gogo-blue);
  border-radius: var(--radius-card);
  background: var(--gogo-blue-tint);
}

.ref-note--warn { border-left-color: var(--gogo-orange); background: var(--gogo-orange-tint); }
.ref-note--gotcha { border-left-color: var(--gogo-pink); background: var(--gogo-pink-tint); }

.ref-note__title { margin: 0 0 5px; font-size: 14px; font-weight: 700; color: var(--gogo-ink); }
.ref-note__body { margin: 0; max-width: 68ch; font-size: 13.5px; line-height: 1.6; color: var(--gogo-slate); }
.ref-note code { background: rgba(255, 255, 255, 0.7); }

/* --- tables ------------------------------------------------ */

.ref-table-wrap { overflow-x: auto; border-radius: var(--radius-card); box-shadow: var(--widget-shadow); }
/*? an anchored table would otherwise land under the sticky header */
.ref-table-wrap[id] { scroll-margin-top: var(--space-5); }
.ref-table a { color: var(--gogo-blue); text-decoration: underline; text-underline-offset: 2px; }
.ref-codeblock__caption { margin: var(--space-2) 0 0; color: var(--muted); font-size: 13px; }

.ref-table { width: 100%; border-collapse: collapse; background: var(--card-bg); font-size: 13.5px; }

.ref-table th {
  padding: 11px var(--pad);
  background: var(--gogo-ink);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  text-align: left;
  white-space: nowrap;
}

.ref-table td { padding: 10px var(--pad); border-top: 1px solid var(--hairline); color: var(--gogo-slate); vertical-align: top; }
.ref-table tbody tr:hover td { background: var(--sunk-bg); }

.ref-table td.is-mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--gogo-ink);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* --- frame diagram ----------------------------------------- */

.ref-frame { display: flex; gap: 3px; overflow: hidden; border-radius: var(--radius-card); box-shadow: var(--widget-shadow); }

.ref-frame__field {
  flex: 1 1 0;
  min-width: 0;
  padding: var(--space-3) var(--space-3) var(--pad);
  text-align: center;
}

.ref-frame__field--ink { background: #2d6a86; color: #eaf4f9; }
.ref-frame__field--blue { background: var(--gogo-blue); color: #04202c; }
.ref-frame__field--orange { background: var(--gogo-orange); color: #33240c; }
.ref-frame__field--green { background: var(--gogo-green); color: #22330a; }
.ref-frame__field--pink { background: var(--gogo-pink); color: #fff; }

.ref-frame__index { display: block; font-family: var(--font-mono); font-size: 11px; font-weight: 700; opacity: 0.75; }
.ref-frame__label { display: block; margin-top: 3px; font-size: 12.5px; font-weight: 700; }

/* --- steps -------------------------------------------------- */

.ref-steps { display: flex; flex-direction: column; gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
.ref-step { display: grid; grid-template-columns: 28px 1fr; gap: var(--space-3); align-items: start; }

.ref-step__n {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gogo-blue);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ref-step__t { font-size: 14.5px; font-weight: 700; color: var(--gogo-ink); }
.ref-step__d { max-width: 62ch; font-size: 13.5px; line-height: 1.6; color: var(--muted); }

.reference__source { margin: 0; font-size: 13px; color: var(--faint); }

@media (max-width: 940px) {
  .reference__body { grid-template-columns: 1fr; gap: var(--space-5); }
  .reference__toc { position: static; flex-direction: row; flex-wrap: wrap; gap: var(--space-2); }
  .reference__toc-title { width: 100%; margin: 0; }
  .reference__toc a { border-left: 0; border-radius: var(--radius-pill); background: var(--sunk-bg); padding: 6px 14px; }
  .reference__legend { width: 100%; }
  .ref-frame { flex-wrap: wrap; }
  .ref-frame__field { flex-basis: 30%; }
}
</style>
