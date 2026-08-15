import { mapGetters } from "vuex";

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
    ...mapGetters(["boardStatus"]),

    actionHint: function () {
      return this.boardStatus ? "" : "Connect a GoGo Board first";
    },
  },
  methods: {
    reportAction: function (message, failed) {
      this.actionMessage = message;
      this.actionFailed = !!failed;
    },

    requireBoard: function () {
      if (this.boardStatus) return true;
      this.reportAction("Connect a GoGo Board first.", true);
      return false;
    },
  },
};
