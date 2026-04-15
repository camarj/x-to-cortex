// Popup logic

const statusEl = document.getElementById("server-status");
const syncBtn = document.getElementById("sync-all");
const progressEl = document.getElementById("progress");
const barFill = document.getElementById("bar-fill");
const progressText = document.getElementById("progress-text");
const logEl = document.getElementById("log");

async function checkServer() {
  try {
    const res = await fetch("http://localhost:7777/health");
    const ok = res.ok;
    statusEl.className = "status " + (ok ? "ok" : "err");
    statusEl.textContent = ok ? "●" : "×";
    statusEl.title = ok ? "Server running" : "Server unreachable";
  } catch {
    statusEl.className = "status err";
    statusEl.textContent = "×";
    statusEl.title = "Server unreachable on :7777";
  }
}

// Escuchar progreso del content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "syncProgress") return;
  const p = msg.progress;
  if (p.phase === "scroll") {
    progressText.textContent = `Recolectando... ${p.collected} tweets`;
    barFill.style.width = "10%";
  } else if (p.phase === "send") {
    const pct = Math.round((p.current / p.total) * 100);
    barFill.style.width = pct + "%";
    progressText.textContent = `${p.current}/${p.total} · ✓${p.stored} −${p.skipped} ✗${p.errors}`;
  }
});

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  progressEl.classList.remove("hidden");
  progressText.textContent = "Iniciando...";
  logEl.textContent = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes("x.com/i/bookmarks") && !tab?.url?.includes("twitter.com/i/bookmarks")) {
      logEl.textContent = "Abre x.com/i/bookmarks en la tab activa primero";
      syncBtn.disabled = false;
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "syncAllBookmarks" }, (result) => {
      if (chrome.runtime.lastError) {
        logEl.textContent = "Error: " + chrome.runtime.lastError.message;
      } else if (result?.ok) {
        progressText.textContent = `✓ ${result.stored} guardados · ${result.skipped} descartados · ${result.errors} errores (de ${result.total})`;
        barFill.style.width = "100%";
      } else {
        logEl.textContent = "Error: " + (result?.error || "desconocido");
      }
      syncBtn.disabled = false;
    });
  } catch (err) {
    logEl.textContent = "Error: " + err.message;
    syncBtn.disabled = false;
  }
});

checkServer();
setInterval(checkServer, 5000);
