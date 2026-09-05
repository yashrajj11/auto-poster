// One small endpoint standing in for a database. The HTML dashboard calls
// this to save/load everything (accounts, style examples, queue) so that
// collect-trends.js and scheduled-poster.js — which run on Netlify's
// servers on a timer, with no browser involved — can see the same data.
//
// Usage from the dashboard:
//   GET  /.netlify/functions/data?store=accounts                -> list all items
//   GET  /.netlify/functions/data?store=accounts&key=123         -> get one item
//   POST /.netlify/functions/data?store=accounts&key=123  {body} -> save one item
//   DELETE /.netlify/functions/data?store=queue&key=abc           -> delete one item

import { store, json, checkSecret } from "./_store.js";

export default async (req) => {
  if (!checkSecret(req)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const storeName = url.searchParams.get("store");
  const key = url.searchParams.get("key");
  if (!storeName) return json({ error: "store required" }, 400);
  const s = store(storeName);

  if (req.method === "GET" && key) {
    const item = await s.get(key, { type: "json" });
    return json({ item });
  }

  if (req.method === "GET") {
    const { blobs } = await s.list();
    const items = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
    return json({ items });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const k = key || body.id || crypto.randomUUID();
    const record = { ...body, id: k };
    await s.setJSON(k, record);
    return json({ item: record });
  }

  if (req.method === "DELETE" && key) {
    await s.delete(key);
    return json({ deleted: key });
  }

  return json({ error: "Bad request" }, 400);
};

export const config = { path: "/.netlify/functions/data" };
