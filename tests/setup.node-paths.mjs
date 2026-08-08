// Node test-runner setup: resolves the "@/..." path alias from tsconfig.json
// so *.server.ts modules can be imported without a bundler.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const srcRoot = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), srcRoot).href;
      for (const suffix of ["", ".ts", ".tsx"]) {
        const candidate = base + suffix;
        if (existsSync(fileURLToPath(candidate))) {
          return nextResolve(candidate, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
