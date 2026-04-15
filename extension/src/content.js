// Content script — runs on x.com / twitter.com
// Responsabilidades:
// 1. Detectar tweets en la página
// 2. Inyectar botón "Save to Cortex" en cada tweet
// 3. Al click: extraer tweet (o hilo completo si aplica) y mandar al server local
// 4. Exponer API para el popup (sync masivo desde /i/bookmarks)

const SERVER_URL = "http://localhost:7777/ingest";

// TODO: selectors — X cambia el DOM seguido, centralizar aquí
const SELECTORS = {
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  tweetLink: 'a[href*="/status/"]',
  authorHandle: '[data-testid="User-Name"] a[role="link"]'
};

function extractTweet(articleEl) {
  // TODO: extraer { id, author, text, urls, timestamp } de un <article>
  throw new Error("not implemented");
}

function isThread(articleEl) {
  // TODO: detectar si el tweet pertenece a un hilo del mismo autor
  // Heurística: buscar "Show this thread" o tweets encadenados del mismo user
  throw new Error("not implemented");
}

async function extractThread(articleEl) {
  // TODO: expandir hilo, recolectar todos los tweets del autor, ordenar cronológico
  throw new Error("not implemented");
}

async function sendToServer(payload) {
  try {
    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("[x-to-cortex] server unreachable:", err);
    return { ok: false, error: "server unreachable — is it running on :7777?" };
  }
}

function injectButton(articleEl) {
  // TODO: inyectar botón "Save to Cortex" en la barra de acciones del tweet
  throw new Error("not implemented");
}

// Observer para tweets que aparecen con scroll infinito
const observer = new MutationObserver(() => {
  document.querySelectorAll(SELECTORS.tweet).forEach((el) => {
    if (!el.dataset.cortexInjected) {
      injectButton(el);
      el.dataset.cortexInjected = "1";
    }
  });
});

// TODO: iniciar observer solo cuando haya #react-root
// observer.observe(document.body, { childList: true, subtree: true });

// Mensajes desde popup/background (ej. sync masivo)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "syncAllBookmarks") {
    // TODO: scraping de /i/bookmarks con scroll automático
    sendResponse({ ok: false, error: "not implemented" });
  }
  return true;
});
