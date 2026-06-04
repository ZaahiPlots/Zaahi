// Flat config for ESLint 10 / Next 15.
// Minimal — focused on the Rules of Hooks guarantee that tsc + build
// don't provide. See docs/research/test-process-diag.md §3 for why.
//
// Primary rule: react-hooks/rules-of-hooks = error
//   This statically catches "useMemo / useEffect / useState etc. called
//   after a conditional early return" — exactly the aefa842 prod crash
//   class. tsc + build pass that code; only React runtime throws.
//
// Secondary: react-hooks/exhaustive-deps = warn
//   Surfaces missing useEffect deps. Warn (not error) so the build
//   pipeline doesn't break on the large pre-existing backlog in
//   src/app/parcels/map/page.tsx.

import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
      // Register the @typescript-eslint plugin namespace so pre-existing
      // `eslint-disable @typescript-eslint/no-unused-vars` directives
      // resolve to a known rule. Next 15 runs ESLint during `next build`
      // once a config exists; without registration the directive in
      // src/lib/vault-serialize.ts:168 fails the build. Founder chose
      // not to mass-fix existing comments — we register-and-silence.
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Rule registered above; keep off so it doesn't surface a new
      // wave of findings on a codebase that has never been audited
      // for unused vars.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    ignores: [
      ".next/",
      "node_modules/",
      "data/",
      "public/",
      "scripts/",
      "docs/",
      "prisma/",
      "backend/",
      "knowledge/",
      "memory/",
    ],
  },
);
