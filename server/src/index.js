import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { classifyAndTranslate } from "./classify.js";
import { writePost, writeThread, logRejected, alreadyStored } from "./writer.js";

const app = express();
app.use(cors({ origin: ["https://x.com", "https://twitter.com", "chrome-extension://*"] }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, cortexRawPath: config.cortexRawPath, model: config.claudeModel });
});

/**
 * POST /ingest
 * Body (post):
 *   { kind: "post", tweet: { id, author, text, urls, dateBookmarked } }
 * Body (thread):
 *   { kind: "thread", thread: { rootId, author, tweets: [{id, text, urls}], dateBookmarked } }
 */
app.post("/ingest", async (req, res) => {
  try {
    const { kind } = req.body;

    if (kind === "post") {
      const { tweet } = req.body;
      if (!tweet?.text?.trim()) {
        await logRejected({ kind, tweet, reason: "empty-text", at: new Date().toISOString() });
        return res.json({ ok: true, stored: false, reason: "empty-text" });
      }
      if (await alreadyStored(tweet.id)) {
        return res.json({ ok: true, stored: false, reason: "already-stored" });
      }
      const classification = await classifyAndTranslate(tweet.text);

      if (!config.validCategories.includes(classification.category)) {
        await logRejected({ kind, tweet, classification, at: new Date().toISOString() });
        return res.json({ ok: true, stored: false, reason: "other" });
      }

      const filepath = await writePost(tweet, classification);
      return res.json({ ok: true, stored: true, filepath, category: classification.category });
    }

    if (kind === "thread") {
      const { thread } = req.body;
      const joined = thread.tweets.map((t, i) => `${i + 1}/ ${t.text}`).join("\n\n").trim();
      if (!joined) {
        await logRejected({ kind, thread, reason: "empty-text", at: new Date().toISOString() });
        return res.json({ ok: true, stored: false, reason: "empty-text" });
      }
      if (await alreadyStored(thread.rootId)) {
        return res.json({ ok: true, stored: false, reason: "already-stored" });
      }
      const classification = await classifyAndTranslate(joined);

      if (!config.validCategories.includes(classification.category)) {
        await logRejected({ kind, thread, classification, at: new Date().toISOString() });
        return res.json({ ok: true, stored: false, reason: "other" });
      }

      const filepath = await writeThread(thread, classification);
      return res.json({ ok: true, stored: true, filepath, category: classification.category });
    }

    return res.status(400).json({ ok: false, error: `unknown kind: ${kind}` });
  } catch (err) {
    console.error("[ingest] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(config.port, () => {
  console.log(`[x-to-cortex] server running on http://localhost:${config.port}`);
  console.log(`[x-to-cortex] writing to: ${config.cortexRawPath}/x-bookmarks/`);
});
