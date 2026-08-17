<template>
  <div class="app-header-wrap">
    <header class="app-header">
      <img class="app-header__logo" src="@/assets/gogo-logo.png" alt="GoGo Board" />

      <nav class="app-header__nav">
        <router-link to="/live">Live</router-link>
        <router-link to="/control">Control</router-link>
        <router-link to="/datalog">Datalog</router-link>
        <span class="app-header__divider"></span>
        <router-link to="/logo">Logo</router-link>
        <router-link to="/packets">Packets</router-link>
      </nav>

      <div class="app-header__right">
        <button v-if="!isBoardReady" class="btn app-header__connect" @click="handleConnect">Connect a board</button>

        <span class="app-header__status-wrap" aria-live="polite">
          <button
            v-if="isBoardReady"
            type="button"
            class="app-header__status is-connected"
            aria-label="Disconnect the GoGo Board"
            @click="handleDisconnect"
          >
            Connected
          </button>
          <span v-else class="app-header__status is-disconnected">No board</span>
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
.app-header {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--hairline);
}

.app-header__logo { width: 132px; height: 39px; }

.app-header__nav { display: flex; align-items: center; gap: 18px; }

.app-header__nav a {
  display: inline-flex;
  align-items: center;
  /*? 11px top/bottom brings the ~19px text line up past the 36px tablet
      hit-target floor; 8px sides do the same for "Live", the shortest link,
      whose width was otherwise the smaller (and failing) dimension */
  padding: 11px 8px;
  font-weight: 700;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.app-header__nav a.router-link-active { color: var(--gogo-ink); }

.app-header__divider {
  width: 1px;
  height: 18px;
  background: var(--hairline);
}

.app-header__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

/*? compound selector so this reliably outranks .action-message's margin-top
    regardless of CSS module load order */
p.app-header__error {
  margin: 0;
  padding: 10px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--hairline);
}

.app-header__status {
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border: 0;
  border-radius: var(--radius-pill);
}

.app-header__status.is-connected { background: var(--gogo-green); color: var(--gogo-ink); cursor: pointer; }
.app-header__status.is-disconnected { background: var(--status-disconnected-bg); color: var(--muted); }

.app-header__status.is-connected:focus-visible {
  outline: 2px solid var(--gogo-blue);
  outline-offset: 2px;
}
</style>
