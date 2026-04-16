import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { config } from "./config.js";

const bookmarksRoot = () => path.join(config.cortexRawPath, config.bookmarksDir);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function slug(text, max = 60) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, max);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Escribe un post individual.
 * @param {{id, author, text, urls, dateBookmarked}} tweet
 * @param {{category, translated}} classification
 */
export async function writePost(tweet, classification) {
  const dir = path.join(bookmarksRoot(), "posts");
  await ensureDir(dir);

  const date = today();
  const title = (classification.translated || tweet.text).slice(0, 60);
  const filename = `${date}-${tweet.id}-${slug(title, 40)}.md`;

  const sourceUrl = `https://x.com/${tweet.author.replace(/^@/, "")}/status/${tweet.id}`;

  const frontmatter = {
    title,
    type: "article",
    source: sourceUrl,
    author: tweet.author,
    date_ingested: date,
    date_bookmarked: tweet.dateBookmarked || date,
    category: classification.category,
    status: "pending",
    is_thread_context: !!tweet.isThreadContext,
    is_truncated: !!tweet.isTruncated,
    tags: []
  };

  const urls = (tweet.urls || []).map((u) => `- ${u}`).join("\n");

  // Aviso visible cuando el contenido puede estar incompleto
  const warnings = [];
  if (tweet.isThreadContext) warnings.push("⚠️ Este tweet es parte de un hilo — solo se guardó este post, ver hilo completo en el link.");
  if (tweet.isTruncated) warnings.push("⚠️ Tweet truncado por X (\"Show more\") — abrir el link para leer completo.");
  const warningsBlock = warnings.length ? warnings.join("\n") + "\n\n" : "";

  const body = `---
${yaml.dump(frontmatter).trim()}
---

🔗 **Ver en X:** ${sourceUrl}

${warningsBlock}## Traducción

${classification.translated || "(sin traducción)"}

## Original

${tweet.text}

## URLs

${urls || "(ninguna)"}
`;

  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, body, "utf8");
  return filepath;
}

/**
 * Escribe un hilo completo.
 * @param {{rootId, author, tweets: [{id, text, urls}], dateBookmarked}} thread
 * @param {{category, translated}} classification - translated viene como bloque ya numerado
 */
export async function writeThread(thread, classification) {
  const dir = path.join(bookmarksRoot(), "threads");
  await ensureDir(dir);

  const date = today();
  const firstText = thread.tweets[0]?.text || "";
  const title = (classification.translated || firstText).slice(0, 60);
  const filename = `${date}-${thread.rootId}-${slug(title, 40)}.md`;

  const sourceUrl = `https://x.com/${thread.author.replace(/^@/, "")}/status/${thread.rootId}`;

  const frontmatter = {
    title,
    type: "article",
    source: sourceUrl,
    author: thread.author,
    date_ingested: date,
    date_bookmarked: thread.dateBookmarked || date,
    category: classification.category,
    thread_length: thread.tweets.length,
    status: "pending",
    tags: []
  };

  const originalNumbered = thread.tweets
    .map((t, i) => `**${i + 1}/** ${t.text}`)
    .join("\n\n");

  const allUrls = thread.tweets.flatMap((t) => t.urls || []);
  const urlsBlock = allUrls.length ? allUrls.map((u) => `- ${u}`).join("\n") : "(ninguna)";

  const body = `---
${yaml.dump(frontmatter).trim()}
---

🔗 **Ver en X:** ${sourceUrl} · ${thread.tweets.length} tweets

## Traducción

${classification.translated || "(sin traducción)"}

## Original

${originalNumbered}

## URLs

${urlsBlock}
`;

  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, body, "utf8");
  return filepath;
}

/**
 * Chequea si un tweet ya fue almacenado (busca por id en posts/ y threads/).
 */
export async function alreadyStored(id) {
  const root = bookmarksRoot();
  const dirs = [path.join(root, "posts"), path.join(root, "threads")];
  for (const dir of dirs) {
    try {
      const files = await fs.readdir(dir);
      if (files.some((f) => f.includes(`-${id}-`) || f.includes(`-${id}.md`))) return true;
    } catch {
      // dir no existe aún — OK
    }
  }
  return false;
}

/**
 * Loggea un tweet rechazado en JSONL para revisión.
 */
export async function logRejected(entry) {
  await ensureDir(bookmarksRoot());
  const file = path.join(bookmarksRoot(), "_rejected.jsonl");
  await fs.appendFile(file, JSON.stringify(entry) + "\n", "utf8");
}
