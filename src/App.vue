<template>
  <div id="app">
    <div id="nav">
      <router-link to="/gogoapi">GoGoAPI</router-link> |
      <router-link to="/offline-datalog">Offline Datalog</router-link>
    </div>
    <p class="board-status" :class="boardStatus ? 'is-connected' : 'is-disconnected'">
      {{ boardStatus ? "GoGo Board connected" : "No GoGo Board connected" }}
    </p>
    <router-view />
  </div>
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "App",
  computed: {
    ...mapGetters(["boardStatus"]),
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px 30px 10px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}

.board-status {
  margin: 0 0 20px;
  font-size: 0.85em;
}

.board-status::before {
  content: "";
  display: inline-block;
  width: 0.6em;
  height: 0.6em;
  margin-right: 0.5em;
  border-radius: 50%;
  vertical-align: middle;
}

.board-status.is-connected {
  color: #09af32;
}

.board-status.is-connected::before {
  background-color: #09af32;
}

.board-status.is-disconnected {
  color: #8a8a8a;
}

.board-status.is-disconnected::before {
  background-color: #c4c4c4;
}

/* shared by both views: actions that need a connected board */
button[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-message {
  min-height: 1.2em;
  margin: 10px 0 0;
  font-size: 0.85em;
}

.action-message.is-error {
  color: #eb4e4e;
}
</style>
