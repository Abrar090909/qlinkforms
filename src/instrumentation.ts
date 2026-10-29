// Runs once when the Next.js server starts. Importing env here makes the server
// refuse to boot when a variable is missing, instead of failing on first request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
  }
}
