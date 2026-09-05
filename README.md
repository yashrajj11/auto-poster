# Threads Automator (one-file dashboard version)

`public/index.html` is the entire tool you interact with. Three small
functions in `netlify/functions/` are the only backend: `data.js` (shared
storage), `collect-trends.js` and `scheduled-poster.js` (the two that run
on a timer, which is what makes posting work even when you're not there).

## One-time Meta app setup

1. Create an app at https://developers.facebook.com/apps and add the
   "Threads API" use case. Note your **App ID** and **App Secret**.
2. Under Roles, add yourself (and any other account you'll manage) as a
   Threads tester, and accept the invite in the Threads app.
3. (Optional, for real trend data beyond your own posts) request the
   `threads_keyword_search` permission under App Review.

## Getting an access token per account (the one manual step)

A static file can't safely hold your app secret, so this one step happens
outside the tool, once per account, using `curl` in a terminal:

```bash
# 1. Get a short-lived code — open this URL in a browser, log in, and copy
#    the "code" value from the redirect URL it lands on:
https://threads.net/oauth/authorize?client_id=YOUR_APP_ID&redirect_uri=https://localhost&scope=threads_basic,threads_content_publish,threads_manage_insights,threads_keyword_search&response_type=code

# 2. Exchange it for a short-lived token
curl -X POST https://graph.threads.net/oauth/access_token \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://localhost" \
  -d "code=THE_CODE_FROM_STEP_1"

# 3. Exchange that for a long-lived token (~60 days)
curl "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"

# 4. Look up the account's Threads user id
curl "https://graph.threads.net/v1.0/me?fields=id,username&access_token=LONG_LIVED_TOKEN"
```

Paste the resulting user id, username, and long-lived token into the
"Connected accounts" section of the dashboard. Repeat per account.

**Refreshing later:** long-lived tokens last ~60 days and can be refreshed
without the app secret — `GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=CURRENT_TOKEN`. You'll need to re-run
this (and update the token in the dashboard) roughly every couple of months,
or I can add a small scheduled refresh function later if you want it fully
automatic too.

## Deploying

Drag-and-drop won't pick up the functions folder — you need one CLI (or
Git-linked) deploy:

```bash
netlify init
netlify env:set APP_SHARED_SECRET "make-up-a-long-random-string"
netlify deploy --prod
```

After that, open the live `index.html` URL, go to **Setup**, and enter:
- the same shared secret you just set
- your Anthropic API key (stays in your browser, never touches Netlify)

## About "free"

Threads' API and Netlify (functions + Blobs) cost nothing at this scale.
The Anthropic API is separate from any Claude subscription — it's billed
per request, small but real money (roughly cents per draft at your volume).
If you want genuinely $0 for the writing step too, Google's Gemini API has
a free tier with rate limits; say the word and I'll swap `generateDraft()`
to call that instead of Anthropic.

## What runs automatically vs. manually

- **Automatic, no browser needed:** trend collection (daily), posting
  anything due in the queue (every 15 min).
- **Manual, from the dashboard:** connecting an account (one-time paste),
  writing style examples, generating drafts, adding to the queue.

## Costs

Same as before — Threads API and Netlify (functions + Blobs) are free;
Anthropic API usage is the only real cost, a few dollars a month at your
volume.

## Known limitation

Image posts need a public `image_url` Threads can fetch — the dashboard
generates captions from a locally uploaded image, but for the image itself
to appear in the live post, host it somewhere public first (any image host
or a Netlify-hosted folder) and note that when scheduling. Text-only posts
work fully as-is.
