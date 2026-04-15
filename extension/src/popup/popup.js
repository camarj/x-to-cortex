// Popup logic

const statusEl = document.getElementById("server-status");
const syncBtn = document.getElementById("sync-all");
const progressEl = document.getElementById("progress");
const barFill = document.getElementById("bar-fill");
const progressText = document.getElementById("progress-text");
const logEl = document.getElementById("log");

async function checkServer() {
  try {
    const res = await fetch("http://localhost:7777/health", { method: "GET" });
    const ok = res.ok;
    statusEl.className = "status " + (ok ? "ok" : "err");
    statusEl.textContent = ok ? "●" : "×";
  } catch {
    statusEl.className = "status err";
    statusEl.textContent = "×";
  }
}

syncBtn.addEventListener("click", async () => {
  // TODO: mandar mensaje al content script de la tab activa
  logEl.textContent = "not implemented";
});

checkServer();
