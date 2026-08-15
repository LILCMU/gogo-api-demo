<template>
  <div
    class="bytes bytes--dump"
  ><div
    class="bytes__row bytes__row--header"
  ><span class="bytes__offset"></span><span class="bytes__sep"></span><span
      v-for="col in headerCells"
      :key="col.pos"
      class="bytes__cell"
      :class="{ 'bytes__cell--gap': col.pos === 8 }"
    >{{ col.label }}</span></div><div
    class="bytes__row"
    v-for="row in rows"
    :key="row.offset"
  ><span class="bytes__offset">{{ row.offset }}</span><span class="bytes__sep">|</span><span
      v-for="cell in row.cells"
      :key="cell.index"
      class="bytes__cell"
      :class="cellClass(cell)"
    >{{ cell.hex }}</span></div></div>
</template>

<script>
const ROW_SIZE = 16;

export default {
  name: "ByteDump",
  props: {
    bytes: { type: [Array, Uint8Array], required: true },
    //? byte index -> extra class name, e.g. { 0: 'bytes__cell--category' }
    highlights: { type: Object, default: () => ({}) },
  },
  computed: {
    //? header row shares the same pos-indexed cells as data rows so columns line up
    headerCells: function () {
      return Array.from({ length: ROW_SIZE }, (unused, pos) => ({ pos, label: String(pos).padStart(2) }));
    },

    rows: function () {
      const list = Array.from(this.bytes);
      const rows = [];
      for (let offset = 0; offset < list.length; offset += ROW_SIZE) {
        const rowBytes = list.slice(offset, offset + ROW_SIZE);
        rows.push({
          offset,
          cells: rowBytes.map((b, pos) => ({
            pos,
            index: offset + pos,
            hex: b.toString(16).padStart(2, "0"),
          })),
        });
      }
      return rows;
    },
  },
  methods: {
    cellClass: function (cell) {
      const highlight = this.highlights[cell.index];
      return {
        "bytes__cell--gap": cell.pos === 8,
        [highlight]: !!highlight,
      };
    },
  },
};
</script>
