import { mapGetters } from "vuex";

//? src/gogo/ throws lower-case error strings (e.g. "no GoGo Board connected");
//? the app's own copy is sentence case, so normalise here rather than at
//? each of the four call sites
function sentenceCase(message) {
  return message ? message.charAt(0).toUpperCase() + message.slice(1) : message;
}

//? shared by every view that sends a command and reports the outcome
//? through .action-message — the state, hint and guard were duplicated
//? verbatim across four views before this
export default {
  data: function () {
    return {
      actionMessage: "",
      actionFailed: false,
    };
  },
  computed: {
    ...mapGetters(["isBoardReady"]),

    actionHint: function () {
      return this.isBoardReady ? "" : "Connect a GoGo Board first";
    },
  },
  methods: {
    reportAction: function (message, failed) {
      this.actionMessage = sentenceCase(message);
      this.actionFailed = !!failed;
    },

    requireBoard: function () {
      if (this.isBoardReady) return true;
      this.reportAction("Connect a GoGo Board first.", true);
      return false;
    },
  },
};
