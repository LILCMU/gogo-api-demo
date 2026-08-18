<template>
  <div class="bytemap">
    <!--? the strip is the diagram: every byte of the frame in address order,
         tinted by the field that owns it, so the shape of the packet is
         visible before a single table row is read -->
    <div class="bytemap__strip" role="img" :aria-label="summary">
      <div class="bytemap__row" v-for="row in rows" :key="row.offset">
        <span class="bytemap__gutter">{{ row.offset }}</span>
        <span
          v-for="cell in row.cells"
          :key="cell.index"
          class="bytemap__cell"
          :class="['bytemap__cell--' + cell.tone, { 'is-start': cell.start }]"
          :title="cell.label"
        >{{ cell.index }}</span>
      </div>
    </div>

    <dl class="bytemap__key">
      <template v-for="region in toned">
        <dt :key="region.from + '-t'" :class="'bytemap__swatch bytemap__swatch--' + region.tone">
          {{ region.from === region.to ? region.from : region.from + "–" + region.to }}
        </dt>
        <dd :key="region.from + '-d'">
          {{ region.label }}<span v-if="region.note" class="bytemap__note">{{ region.note }}</span>
        </dd>
      </template>
    </dl>
  </div>
</template>

<script>
const PER_ROW = 16;

//? rotated so two adjacent regions never land on the same colour by accident
const TONES = ["blue", "orange", "green", "pink", "ink"];

export default {
  name: "ByteMap",
  props: {
    size: { type: Number, default: 63 },
    //? [{ from, to, label, note?, tone? }]
    regions: { type: Array, required: true },
  },
  computed: {
    toned: function () {
      return this.regions.map((region, i) =>
        Object.assign({}, region, { tone: region.tone || TONES[i % TONES.length] })
      );
    },

    cells: function () {
      const owner = new Array(this.size).fill(null);
      this.toned.forEach(function (region) {
        for (let i = region.from; i <= region.to; i += 1) {
          if (i < owner.length) owner[i] = region;
        }
      });

      return owner.map(function (region, index) {
        return {
          index: index,
          tone: region ? region.tone : "unused",
          label: region ? region.label : "unallocated",
          start: !!region && index === region.from,
        };
      });
    },

    rows: function () {
      const rows = [];
      for (let offset = 0; offset < this.size; offset += PER_ROW) {
        rows.push({ offset: offset, cells: this.cells.slice(offset, offset + PER_ROW) });
      }
      return rows;
    },

    //? the strip is decorative on its own; this is what a screen reader gets
    summary: function () {
      return (
        this.size +
        " bytes. " +
        this.toned
          .map(function (r) {
            return "bytes " + r.from + " to " + r.to + ", " + r.label;
          })
          .join(". ")
      );
    },
  },
};
</script>

<style>
.bytemap { display: flex; flex-direction: column; gap: var(--space-4); }

.bytemap__strip {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-x: auto;
  padding: var(--pad);
  background: var(--gogo-ink);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
}

.bytemap__row { display: flex; gap: 3px; align-items: center; }

.bytemap__gutter {
  flex: none;
  width: 3ch;
  text-align: right;
  margin-right: 5px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #5d879b;
}

.bytemap__cell {
  flex: none;
  width: 30px;
  padding: 6px 0;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 11px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  cursor: default;
}

/*? a left edge on the first byte of a region — without it a run of same-tone
    cells reads as one field when it is several */
.bytemap__cell.is-start { box-shadow: inset 2px 0 0 rgba(1, 53, 76, 0.55); }

.bytemap__cell--blue   { background: var(--gogo-blue);   color: #04202c; }
.bytemap__cell--orange { background: var(--gogo-orange); color: #33240c; }
.bytemap__cell--green  { background: var(--gogo-green);  color: #22330a; }
.bytemap__cell--pink   { background: var(--gogo-pink);   color: #fff; }
.bytemap__cell--ink    { background: #2d6a86;            color: #eaf4f9; }
.bytemap__cell--unused { background: #0b2c3c;            color: #4d7386; }

.bytemap__key {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 7px var(--pad);
  margin: 0;
  font-size: 13.5px;
}

.bytemap__swatch {
  padding: 2px 9px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.bytemap__swatch--blue   { background: var(--gogo-blue);   color: #04202c; }
.bytemap__swatch--orange { background: var(--gogo-orange); color: #33240c; }
.bytemap__swatch--green  { background: var(--gogo-green);  color: #22330a; }
.bytemap__swatch--pink   { background: var(--gogo-pink);   color: #fff; }
.bytemap__swatch--ink    { background: #2d6a86;            color: #eaf4f9; }

.bytemap__key dd { margin: 0; color: var(--gogo-slate); }
.bytemap__note { display: block; color: var(--muted); font-size: 12.5px; }
</style>
