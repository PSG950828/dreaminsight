import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  // Node scripts: relax TS rules and allow require() usage
  {
    files: ["scripts/**/*.{ts,js}", "src/lib/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "off",
    },
  },
  // App/src: relax strict any and specific Next rule to reduce noise while keeping guidance
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-assign-module-variable": "off",
    },
  },
];

export default eslintConfig;
