<template>
  <section class="page page--dev">
    <h2 class="section-label">Build a packet</h2>
    <div class="control-row">
      <label>Category <input type="number" v-model.number="category" /></label>
      <label>Command <input type="number" v-model.number="command" /></label>
      <label>Params <input type="text" v-model="params" placeholder="1,2,3" /></label>
      <button class="btn btn--primary" :disabled="!boardStatus" @click="sendPacket()">Send</button>
    </div>

    <h2 class="section-label">Frame preview</h2>
    <pre class="bytes">{{ preview }}</pre>

    <h2 class="section-label">Last response</h2>
    <pre class="bytes" v-if="lastResponse">command {{ lastResponse.command }}  status {{ lastResponse.status }}  length {{ lastResponse.length }}
{{ hex(lastResponse.payload) }}</pre>
    <p v-else class="page__empty">Nothing received yet.</p>

    <p class="action-message" :class="{ 'is-error': failed }">{{ message }}</p>
  </section>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { buildCommand } from "@/gogo/protocol";

export default {
  name: "Packets",
  data: function () {
    return { category: 0, command: 11, params: "", message: "", failed: false };
  },
  computed: {
    ...mapGetters(["boardStatus", "lastResponse"]),

    paramBytes: function () {
      return this.params
        ? this.params.split(",").map((v) => parseInt(v, 10) || 0)
        : [];
    },

    preview: function () {
      try {
        return this.hex(buildCommand(this.category, this.command, this.paramBytes));
      } catch (error) {
        return error.message;
      }
    },
  },
  methods: {
    ...mapActions(["send"]),

    hex: function (bytes) {
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    },

    sendPacket: async function () {
      if (!this.boardStatus) {
        this.message = "Connect a GoGo Board first.";
        this.failed = true;
        return;
      }

      try {
        await this.send({
          category: this.category,
          command: this.command,
          params: this.paramBytes,
        });
        this.message = "Sent.";
        this.failed = false;
      } catch (error) {
        this.message = error.message;
        this.failed = true;
      }
    },
  },
};
</script>
