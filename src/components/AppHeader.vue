<template>
  <div class="app-header-wrap">
    <header class="app-header">
      <router-link class="wordmark" to="/live" aria-label="GoGo API Demo, go to Live">
        <img class="wordmark__mark" src="@/assets/gogo-board.png" alt="" />
        <span class="wordmark__name">GoGo</span>
        <span class="wordmark__sub">API Demo</span>
      </router-link>

      <!--? three pairs: what the board is doing now, what it has stored, and
           the protocol underneath -->
      <nav class="app-header__nav">
        <router-link to="/live">Live</router-link>
        <router-link to="/control">Control</router-link>
        <span class="app-header__divider"></span>
        <router-link to="/datalog">Datalog</router-link>
        <router-link to="/logo">Logo</router-link>
        <span class="app-header__divider"></span>
        <router-link to="/packets">Packets</router-link>
        <router-link to="/reference">Reference</router-link>
      </nav>

      <div class="app-header__right">
        <button v-if="!isBoardReady" class="btn btn--primary app-header__connect" @click="handleConnect">Connect a board</button>

        <span class="app-header__status-wrap" aria-live="polite">
          <button
            v-if="isBoardReady"
            type="button"
            class="app-header__status is-connected"
            aria-label="Disconnect the GoGo Board"
            @click="handleDisconnect"
          >
            <span class="app-header__led"></span>Connected
          </button>
          <span v-else class="app-header__status is-disconnected"><span class="app-header__led"></span>No board</span>
        </span>
      </div>
    </header>

    <!--? full-width banner, not part of the header's flex row — inline placement
         wrapped at 1024px and pushed the connect button/status pill onto two lines -->
    <!--? role="status" (polite, not "alert") — this is a connection state that
         changes routinely, not an urgent interruption -->
    <p v-if="!isBoardReady && error" class="action-message is-error app-header__error" role="status">
      {{ displayError }}
    </p>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapMutations } from "vuex";

export default {
  name: "AppHeader",
  computed: {
    ...mapGetters(["isBoardReady", "error"]),

    //? src/gogo/ throws lower-case error strings; the app's own copy is
    //? sentence case, so normalise on display without touching the throw site
    displayError: function () {
      return this.error ? this.error.charAt(0).toUpperCase() + this.error.slice(1) : this.error;
    },
  },
  methods: {
    ...mapActions(["connect", "disconnect"]),
    ...mapMutations(["SET_ERROR"]),

    //? requestDevice needs a real click; device.open() can still reject (e.g.
    //? the board is held open by another app), which connect() doesn't catch
    handleConnect: async function () {
      try {
        await this.connect({ prompt: true });
      } catch (error) {
        this.SET_ERROR(error.message);
      }
    },

    //? the only way to release the device short of reloading the page
    handleDisconnect: async function () {
      try {
        await this.disconnect();
      } catch (error) {
        this.SET_ERROR(error.message);
      }
    },
  },
};
</script>

<style>
/*? $top-nav-bg / $sidebar-bg — GoGoCode's chrome is GoGo blue, and this is
    the app's single strongest brand signal */
.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: 0 var(--space-5);
  min-height: 64px;
  background: var(--gogo-blue);
  box-shadow: var(--glow-blue);
  position: relative;
  z-index: 2;
}

/*? the gogoboard wordmark is magenta and orange on transparent and clashes
    with the blue bar, so the board itself carries the identity and the name is
    set in the app's own type */
.wordmark {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--gogo-ink);
  text-decoration: none;
  white-space: nowrap;
}

/*? the board art is 512x473 — contain keeps the hexagon from squashing in a
    square box, and the box keeps the name on a stable baseline */
.wordmark__mark {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.wordmark__name { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }

.wordmark__sub {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.72;
}

.wordmark:focus-visible { outline: 2px solid var(--gogo-ink); outline-offset: 3px; border-radius: var(--radius-inner); }

.app-header__nav { display: flex; align-items: center; gap: 2px; }

/*? ink on blue is 4.8:1; white on blue is 2.6:1 and fails AA at any size,
    so the brand's own dark blue carries the nav text instead */
.app-header__nav a {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 15px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gogo-ink);
  text-decoration: none;
  border-radius: var(--radius-pill);
  transition: background 0.15s ease, transform 0.1s ease;
}

.app-header__nav a:hover { background: rgba(255, 255, 255, 0.34); }
.app-header__nav a:active { transform: translateY(1px); }

/*? fill, not colour alone — on a blue bar a colour shift alone is invisible */
.app-header__nav a.router-link-active {
  background: var(--card-bg);
  box-shadow: 0 1px 3px rgba(1, 53, 76, 0.18);
}

.app-header__nav a:focus-visible { outline: 2px solid var(--gogo-ink); outline-offset: 2px; }

.app-header__divider {
  width: 1px;
  height: 20px;
  background: rgba(1, 53, 76, 0.22);
  margin: 0 var(--space-2);
}

.app-header__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/*? compound selector so this reliably outranks .action-message's margin-top
    regardless of CSS module load order */
p.app-header__error {
  margin: 0;
  padding: 10px var(--space-5);
  background: var(--gogo-pink-tint);
  border-bottom: 1px solid var(--hairline);
}

.app-header__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  min-height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.app-header__led { width: 8px; height: 8px; border-radius: 50%; background: var(--gogo-ink); }

.app-header__status.is-connected { background: var(--gogo-green); color: var(--gogo-ink); cursor: pointer; box-shadow: var(--glow-green); }
.app-header__status.is-disconnected { background: var(--status-disconnected-bg); color: var(--gogo-ink); }
.app-header__status.is-disconnected .app-header__led { background: rgba(1, 53, 76, 0.4); }

.app-header__status.is-connected:focus-visible {
  outline: 2px solid var(--gogo-ink);
  outline-offset: 2px;
}

@media (max-width: 860px) {
  .app-header { flex-wrap: wrap; padding: var(--space-3) var(--space-4); gap: var(--space-3); }
  .app-header__nav { order: 3; width: 100%; overflow-x: auto; }
  .app-header__right { margin-left: auto; }
}
</style>
