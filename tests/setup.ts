import { loadEnvConfig } from "@next/env";

// Load .env.test the same way Next.js does (NODE_ENV is "test" under Vitest).
loadEnvConfig(process.cwd());
