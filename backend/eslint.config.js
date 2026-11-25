const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "coverage/", "certs/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: { ...globals.node }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_|^next$|^req$|^res$" }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error"
    }
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } }
  }
];
