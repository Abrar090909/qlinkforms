import { existsSync } from "node:fs";

// DB tests hit a real Supabase database, so load .env.local rather than the
// dummy .env.test. (@next/env always picks .env.test when NODE_ENV is "test".)
// In CI there is no .env.local; the variables come from repository secrets.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
