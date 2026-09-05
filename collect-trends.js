// Runs automatically once a day — no browser needed. For each connected
// account, queries Threads' official keyword_search endpoint for that
// account's niche keywords and saves the results. The dashboard's
// "Generate draft" step reads this snapshot as trend inspiration.
//
// NOTE: searching public posts (not just your own) requires Meta's
// approval for the threads_keyword_search permission on your app. Until
// approved, this only sees posts from accounts you've connected yourself
// — still useful, just narrower.

import { store } from "./_store.js";

async function searchKeyword(keyword, accessToken) {
  const url = new URL("https://graph.threads.net/v1.0/keyword_search");
  url.searchParams.set("q", keyword);
  url.searchParams.set("search_mode", "KEYWORD");
  url.searchParams.set("media_type", "TEXT_POST");
  url.searchParams.set("fields", "id,text,permalink,timestamp");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export default async () => {
  const accounts = store("accounts");
  const trends = store("trends");

  const { blobs } = await accounts.list();
  for (const b of blobs) {
    const account = await accounts.get(b.key, { type: "json" });
    if (!account?.nicheKeywords?.length || !account.accessToken) continue;

    let allPosts = [];
    for (const keyword of account.nicheKeywords) {
      allPosts = allPosts.concat(await searchKeyword(keyword, account.accessToken));
    }
    allPosts.sort((a, b2) => new Date(b2.timestamp) - new Date(a.timestamp));

    await trends.setJSON(account.id, {
      collectedAt: Date.now(),
      keywords: account.nicheKeywords,
      topPosts: allPosts.slice(0, 15),
    });
  }

  return new Response("ok");
};

export const config = { path: "/.netlify/functions/collect-trends" };
