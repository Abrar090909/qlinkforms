import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests that need a real database. Run with `pnpm test:db`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    setupFiles: ["./tests/db/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One shared remote database: keep files sequential.
    fileParallelism: false,
  },
});
