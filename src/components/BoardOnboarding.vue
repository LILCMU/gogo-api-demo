<template>
  <div class="onboard">
    <div class="onboard__main">
      <h2 class="onboard__title">{{ title }}</h2>
      <p class="onboard__text"><slot /></p>

      <ol class="onboard__steps">
        <li class="onboard-step">
          <span class="onboard-step__n">1</span>
          <div>
            <div class="onboard-step__t">Connect the board over USB</div>
            <div class="onboard-step__d">Any GoGo Board 7 running firmware 4.0.0 or later.</div>
          </div>
        </li>
        <li class="onboard-step">
          <span class="onboard-step__n">2</span>
          <div>
            <div class="onboard-step__t">Press Connect a board</div>
            <div class="onboard-step__d">Chrome asks which device to share. Pick the GoGo Board and choose Connect.</div>
          </div>
        </li>
        <li class="onboard-step">
          <span class="onboard-step__n">3</span>
          <div>
            <div class="onboard-step__t">{{ lastStep }}</div>
            <div class="onboard-step__d">{{ lastStepNote }}</div>
          </div>
        </li>
      </ol>

      <div>
        <button class="btn btn--primary btn--large" @click="handleConnect">Connect a board</button>
      </div>
    </div>

    <aside class="onboard__side">
      <h3 class="onboard__side-title">What you need</h3>
      <ul class="onboard__req">
        <li><span class="onboard__mark">&#10003;</span><span><b>Chrome or Edge.</b> Firefox and Safari have no WebHID.</span></li>
        <li><span class="onboard__mark">&#10003;</span><span><b>A USB data cable.</b> Charge-only cables carry no data.</span></li>
        <li><span class="onboard__mark">&#10003;</span><span><b>The board switched on.</b> The power LED should be lit.</span></li>
      </ul>
      <p class="onboard__foot">
        Board held open by another tab or by GoGoCode? Close it first &mdash; only one page can own the device.
      </p>
    </aside>
  </div>
</template>

<script>
import { mapActions, mapMutations } from "vuex";

export default {
  name: "BoardOnboarding",
  props: {
    title: { type: String, default: "Plug in a GoGo Board to get started" },
    lastStep: { type: String, default: "Watch the readings fill in" },
    lastStepNote: { type: String, default: "The page updates the moment the first report lands." },
  },
  methods: {
    ...mapActions(["connect"]),
    ...mapMutations(["SET_ERROR"]),

    //? same shape as the header's button — requestDevice needs a real click,
    //? and device.open() can still reject after the picker closes
    handleConnect: async function () {
      try {
        await this.connect({ prompt: true });
      } catch (error) {
        this.SET_ERROR(error.message);
      }
    },
  },
};
</script>

<style>
.onboard {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  overflow: hidden;
  border-left: var(--stripe) solid var(--gogo-green);
  border-radius: var(--radius-card);
  background: var(--card-bg);
  box-shadow: var(--widget-shadow);
}

.onboard__main {
  display: flex;
  flex-direction: column;
  gap: var(--pad);
  padding: var(--space-6) var(--space-5);
}

.onboard__title {
  margin: 0;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--gogo-ink);
  text-wrap: balance;
}

.onboard__text { margin: 0; font-size: 14.5px; color: var(--muted); max-width: 52ch; }

.onboard__steps { display: flex; flex-direction: column; gap: var(--space-3); margin: 0; padding: 0; list-style: none; }

.onboard-step { display: grid; grid-template-columns: 28px 1fr; gap: var(--space-3); align-items: start; }

.onboard-step__n {
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

.onboard-step__t { font-size: 14.5px; font-weight: 700; color: var(--gogo-ink); }
.onboard-step__d { font-size: 13.5px; color: var(--muted); max-width: 46ch; }

.onboard__side {
  display: flex;
  flex-direction: column;
  gap: var(--pad);
  padding: var(--space-6) var(--space-5);
  background: var(--gogo-ink);
  color: var(--dark-panel-label);
}

.onboard__side-title {
  margin: 0;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--gogo-green);
}

.onboard__req { display: flex; flex-direction: column; gap: 11px; margin: 0; padding: 0; list-style: none; font-size: 13.5px; }
.onboard__req li { display: flex; gap: 10px; align-items: baseline; color: #d3e5ee; }
.onboard__req b { color: #fff; font-weight: 700; }
.onboard__mark { color: var(--gogo-green); font-weight: 700; }

.onboard__foot {
  margin: auto 0 0;
  padding-top: var(--pad);
  border-top: 1px solid var(--dark-panel-line);
  font-size: 13px;
  color: #a9c8d6;
}

@media (max-width: 860px) {
  .onboard { grid-template-columns: 1fr; }
}
</style>
