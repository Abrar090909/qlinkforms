import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load .env.local (or .env.test) the same way Next.js does.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // The CLI (migrate, introspect) uses the direct/session connection, not the
  // transaction pooler. Empty is fine for commands that don't touch the DB
  // (generate, validate), which lets CI run without database secrets.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
