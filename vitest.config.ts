import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    globals: true,
    // Integration tests share one test database and use broad deleteMany() cleanup.
    // Run test files sequentially so concurrent files don't clobber each other's rows.
    fileParallelism: false,
    // next-auth transitively imports the bare specifier "next/server", which Node's
    // ESM resolver can't resolve in the Vitest (node) environment because Next's
    // package "exports" conditions aren't matched. Inlining next-auth lets Vite
    // transform + resolve it (with the proper extension) instead.
    server: {
      deps: {
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
      "client-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
});
