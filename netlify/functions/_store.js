import { getStore } from "@netlify/blobs";

export const STORES = ["accounts", "style", "queue", "trends", "log"];

export function store(name) {
  if (!STORES.includes(name)) throw new Error("Unknown store: " + name);
  return getStore(name);
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Simple shared-secret check so random internet traffic can't read/write
// your accounts or queue. The HTML dashboard sends this same secret with
// every request. Set it once as an env var and paste it into the dashboard.
export function checkSecret(req) {
  const expected = process.env.APP_SHARED_SECRET;
  if (!expected) return true; // not set = no check (fine for local testing, set it before going live)
  return req.headers.get("x-app-secret") === expected;
}
