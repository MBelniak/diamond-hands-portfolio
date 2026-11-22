import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    // Runs once at server start, not during `next build` - the build has no DB secrets or network access to Appwrite.
    const { initDatabase } = await import("@/database/appwrite");
    await initDatabase(process.env.APPWRITE_DATABASE_ID!);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
