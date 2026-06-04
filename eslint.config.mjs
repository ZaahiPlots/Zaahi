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
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
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
