module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: ["plugin:vue/essential", "eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    //? every view is named after its route (Control, Logo, Live, Datalog,
    //? Packets) — that is the "one page = one capability" convention this
    //? repo is built on, not an accident worth flagging file by file
    "vue/multi-word-component-names": "off",
  },
};
