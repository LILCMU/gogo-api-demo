<template>
  <codemirror
    class="editor"
    :value="value"
    :options="options"
    @input="onInput"
  />
</template>

<script>
//? Same editor GoGoCode ships (vue-codemirror 4 / CodeMirror 5), configured the
//? same way — mode, theme, line numbers, active line, close brackets — so what
//? is prototyped here matches what a learner sees in the real webapp.
//? See gogo-code/src/components/program/elements/ProgramEditor.vue.
import { codemirror } from "vue-codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/base16-dark.css";
//? a real Logo mode, keyed off the compiler's own reserved table — see
//? logoMode.js for why the Python mode GoGoCode falls back to is wrong here
import "./logoMode";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/addon/selection/active-line.js";
import "codemirror/addon/edit/closebrackets.js";
//? without this the `placeholder` option below is silently ignored
import "codemirror/addon/display/placeholder.js";

export default {
  name: "CodeEditor",
  components: { codemirror },
  props: {
    value: { type: String, default: "" },
    mode: { type: String, default: "text/x-logo" },
    placeholder: { type: String, default: "" },
  },
  computed: {
    options: function () {
      return {
        mode: this.mode,
        theme: "base16-dark",
        lineNumbers: true,
        styleActiveLine: true,
        autoCloseBrackets: true,
        lineWrapping: true,
        tabSize: 2,
        indentUnit: 2,
        placeholder: this.placeholder,
      };
    },
  },
  methods: {
    onInput: function (value) {
      this.$emit("input", value);
    },
  },
};
</script>

<style>
.editor {
  margin-bottom: var(--space-3);
  border-radius: var(--radius-card);
  box-shadow: var(--widget-shadow);
  overflow: hidden;
}

/*? base16-dark is close to --gogo-ink already; this pins it exactly so the
    editor reads as the same surface as the byte dumps below it */
.editor .CodeMirror {
  height: auto;
  min-height: 190px;
  padding: var(--space-2) 0;
  background: var(--gogo-ink);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
}

.editor .CodeMirror-gutters {
  background: var(--gogo-ink);
  border-right: 1px solid var(--dark-panel-line);
}

.editor .CodeMirror-linenumber { color: #5d879b; }
.editor .CodeMirror-cursor { border-left-color: var(--gogo-green); }
.editor .CodeMirror-activeline-background { background: rgba(255, 255, 255, 0.04); }
.editor .CodeMirror-selected { background: rgba(2, 168, 244, 0.28) !important; }

.editor .CodeMirror-focused { outline: 2px solid var(--gogo-blue); outline-offset: -2px; }

/*? base16-dark's own token colours are muddy on --gogo-ink, and it has no
    rule for cm-builtin at all — these keep structure, board words and comments
    apart, using the brand hues already on this surface */
.editor .cm-keyword  { color: var(--gogo-green); font-weight: 700; }
.editor .cm-builtin  { color: #6ec8f5; }
.editor .cm-number   { color: var(--gogo-orange); }
.editor .cm-string   { color: #f0a3c8; }
.editor .cm-comment  { color: #5d879b; font-style: italic; }
.editor .cm-operator { color: #cfe3ec; }
.editor .cm-bracket  { color: var(--gogo-orange); font-weight: 700; }
.editor .cm-variable { color: #e6f1f6; }

.editor .CodeMirror-placeholder { color: #5d879b; font-style: italic; }
</style>
