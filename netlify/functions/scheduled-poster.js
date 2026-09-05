// Runs automatically every 15 minutes — this is what makes posting truly
// "hands-off": it fires whether or not your laptop is open. Checks the
// queue for anything scheduled for now-or-earlier and publishes it via
// the official Threads API (container -> publish, per Threads' own flow).

import { store } from "./_store.js";

async function createContainer(account, item) {
  const params = new URLSearchParams({ access_token: account.accessToken, text: item.text });
  if (item.imageUrl) {
    params.set("media_type", "IMAGE");
    params.set("image_url", item.imageUrl);
  } else {
    params.set("media_type", "TEXT");
  }
  const res = await fetch(`https://graph.threads.net/v1.0/${account.id}/threads?${params}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.id;
}

async function publishContainer(account, creationId) {
  const params = new URLSearchParams({ access_token: account.accessToken, creation_id: creationId });
  const res = await fetch(`https://graph.threads.net/v1.0/${account.id}/threads_publish?${params}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.id;
}

export default async () => {
  const queue = store("queue");
  const accounts = store("accounts");
  const log = store("log");
  const now = Date.now();

  const { blobs } = await queue.list();
  for (const b of blobs) {
    const item = await queue.get(b.key, { type: "json" });
    if (!item || item.status !== "pending" || item.scheduledFor > now) continue;

    const account = await accounts.get(item.accountId, { type: "json" });
    if (!account) continue;

    try {
      const creationId = await createContainer(account, item);
      await new Promise((r) => setTimeout(r, 3000)); // Threads recommends a short pause before publish
      const publishedId = await publishContainer(account, creationId);
      await log.setJSON(item.id, { ...item, status: "posted", publishedId, postedAt: Date.now() });
      await queue.delete(item.id);
    } catch (err) {
      await queue.setJSON(item.id, { ...item, status: "failed", error: String(err) });
    }
  }

  return new Response("ok");
};

export const config = { path: "/.netlify/functions/scheduled-poster" };
