/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  ignorePatterns: ["*.test.ts", "**/dist"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: [
      "./examples/.*/*/tsconfig.json",
      "./examples/*/tsconfig.json",
      "./package/tsconfig.json",
      "./tsconfig.json",
    ],
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "require-await": "off",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/consistent-type-imports": "error",
  },
};

module.exports = config;
