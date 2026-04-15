// Content script — runs on x.com / twitter.com
// Detecta tweets, inyecta botón "→ Cortex" y maneja sync masivo desde /i/bookmarks.

const SERVER_URL = "http://localhost:7777/ingest";

// Centralizado: si X cambia el DOM, arreglar solo aquí.
const SELECTORS = {
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  userName: '[data-testid="User-Name"]',
  actionBar: '[role="group"]',
};

// ─── Extracción ─────────────────────────────────────────────────────────────

function extractTweet(articleEl) {
  // Permalink del tweet: el <a> que envuelve el <time>
  const timeEl = articleEl.querySelector("time");
  const permalink = timeEl?.closest("a");
  const href = permalink?.getAttribute("href");
  if (!href) return null;

  const match = href.match(/\/([^/]+)\/status\/(\d+)/);
  if (!match) return null;
  const [, authorFromUrl, id] = match;

  const textEl = articleEl.querySelector(SELECTORS.tweetText);
  const text = textEl?.innerText?.trim() || "";

  // Handle — preferir el link del User-Name block
  let author = `@${authorFromUrl}`;
  const userNameEl = articleEl.querySelector(SELECTORS.userName);
  if (userNameEl) {
    for (const a of userNameEl.querySelectorAll("a[href]")) {
      const h = a.getAttribute("href");
      if (h && /^\/[^/]+$/.test(h)) {
        author = "@" + h.slice(1);
        break;
      }
    }
  }

  // URLs dentro del texto del tweet (link cards no incluidas por simplicidad)
  const urls = [];
  if (textEl) {
    textEl.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (h && /^https?:\/\//.test(h)) urls.push(h);
    });
  }

  const dateBookmarked =
    timeEl?.getAttribute("datetime")?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  return { id, author, text, urls, dateBookmarked };
}

function isStatusPage() {
  return /\/status\/\d+/.test(location.pathname);
}

function extractThreadFromStatusPage(articleEl) {
  const root = extractTweet(articleEl);
  if (!root) return null;

  const all = document.querySelectorAll(SELECTORS.tweet);
  const sameAuthor = [];
  const seen = new Set();

  for (const art of all) {
    const t = extractTweet(art);
    if (t && t.author === root.author && !seen.has(t.id)) {
      seen.add(t.id);
      sameAuthor.push(t);
    }
  }

  if (sameAuthor.length < 2) return null;

  // IDs de Twitter son snowflake IDs → orden lexicográfico == cronológico
  sameAuthor.sort((a, b) => a.id.localeCompare(b.id));

  return {
    rootId: sameAuthor[0].id,
    author: root.author,
    tweets: sameAuthor.map((t) => ({ id: t.id, text: t.text, urls: t.urls })),
    dateBookmarked: root.dateBookmarked,
  };
}

// ─── UI: botón por tweet ────────────────────────────────────────────────────

async function saveArticle(articleEl, btn) {
  const originalText = btn.textContent;
  btn.textContent = "...";
  btn.disabled = true;

  try {
    let payload = null;

    if (isStatusPage()) {
      const thread = extractThreadFromStatusPage(articleEl);
      if (thread && thread.tweets.length >= 2) {
        payload = { kind: "thread", thread };
      }
    }

    if (!payload) {
      const tweet = extractTweet(articleEl);
      if (!tweet) {
        btn.textContent = "✗ parse";
        return;
      }
      payload = { kind: "post", tweet };
    }

    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok && data.stored) {
      btn.textContent = `✓ ${data.category}`;
      btn.classList.add("cortex-ok");
    } else if (data.ok && !data.stored) {
      btn.textContent = "− other";
      btn.classList.add("cortex-skip");
    } else {
      btn.textContent = "✗";
      console.error("[x-to-cortex]", data);
    }
  } catch (err) {
    btn.textContent = "✗ server";
    console.error("[x-to-cortex] server unreachable:", err);
  } finally {
    btn.disabled = false;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("cortex-ok", "cortex-skip");
    }, 4000);
  }
}

function injectButton(articleEl) {
  // Encontrar la barra de acciones (el último role="group" dentro del article)
  const groups = articleEl.querySelectorAll(SELECTORS.actionBar);
  const actionBar = groups[groups.length - 1];
  if (!actionBar) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cortex-btn";
  btn.textContent = "→ Cortex";
  btn.title = "Save to Cortex knowledge base";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    saveArticle(articleEl, btn);
  });

  actionBar.appendChild(btn);
}

function injectStyles() {
  if (document.getElementById("cortex-styles")) return;
  const style = document.createElement("style");
  style.id = "cortex-styles";
  style.textContent = `
    .cortex-btn {
      margin-left: 12px;
      padding: 4px 12px;
      background: transparent;
      border: 1px solid rgb(83, 100, 113);
      border-radius: 9999px;
      color: rgb(113, 118, 123);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .cortex-btn:hover {
      background: rgba(29, 155, 240, 0.1);
      color: rgb(29, 155, 240);
      border-color: rgb(29, 155, 240);
    }
    .cortex-btn:disabled { opacity: 0.6; cursor: wait; }
    .cortex-btn.cortex-ok {
      color: rgb(0, 186, 124);
      border-color: rgb(0, 186, 124);
    }
    .cortex-btn.cortex-skip {
      color: rgb(136, 153, 166);
    }
  `;
  document.head.appendChild(style);
}

// ─── Observer para scroll infinito ──────────────────────────────────────────

function scan() {
  document.querySelectorAll(SELECTORS.tweet).forEach((el) => {
    if (!el.dataset.cortexInjected) {
      injectButton(el);
      el.dataset.cortexInjected = "1";
    }
  });
}

injectStyles();
scan();

const observer = new MutationObserver(() => scan());
observer.observe(document.body, { childList: true, subtree: true });

// ─── Sync masivo desde /i/bookmarks ─────────────────────────────────────────

async function bulkSync(onProgress) {
  if (!location.pathname.includes("/i/bookmarks")) {
    return { ok: false, error: "Navega a x.com/i/bookmarks primero" };
  }

  const collected = new Map(); // id → tweet
  let lastHeight = 0;
  let stableScrolls = 0;

  // Scroll infinito con detección de fondo
  while (stableScrolls < 3) {
    document.querySelectorAll(SELECTORS.tweet).forEach((el) => {
      const t = extractTweet(el);
      // Saltar tweets sin texto (solo media) — ahorra round-trip + token waste
      if (t && t.text && !collected.has(t.id)) collected.set(t.id, t);
    });

    if (onProgress) onProgress({ phase: "scroll", collected: collected.size });

    window.scrollBy(0, window.innerHeight * 2);
    await new Promise((r) => setTimeout(r, 1500));

    const h = document.documentElement.scrollHeight;
    if (h === lastHeight) stableScrolls++;
    else {
      stableScrolls = 0;
      lastHeight = h;
    }
  }

  // Enviar cada uno al server (secuencial, rate-limit friendly)
  const tweets = [...collected.values()];
  const results = { total: tweets.length, stored: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < tweets.length; i++) {
    try {
      const res = await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "post", tweet: tweets[i] }),
      });
      const data = await res.json();
      if (data.ok && data.stored) results.stored++;
      else if (data.ok) results.skipped++;
      else results.errors++;
    } catch {
      results.errors++;
    }
    if (onProgress) onProgress({ phase: "send", current: i + 1, total: tweets.length, ...results });
    await new Promise((r) => setTimeout(r, 200));
  }

  return { ok: true, ...results };
}

// Mensajes desde popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "syncAllBookmarks") {
    bulkSync((progress) => {
      chrome.runtime.sendMessage({ action: "syncProgress", progress }).catch(() => {});
    })
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }
});
