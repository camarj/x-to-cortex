// Popup logic — solo health check del server
// Sync masivo descartado: el flujo principal es el botón "→ Cortex" por tweet.

const statusEl = document.getElementById("server-status");

async function checkServer() {
  try {
    const res = await fetch("http://localhost:7777/health");
    const ok = res.ok;
    statusEl.className = "status " + (ok ? "ok" : "err");
    statusEl.textContent = ok ? "●" : "×";
    statusEl.title = ok ? "Server corriendo en :7777" : "Server no responde";
  } catch {
    statusEl.className = "status err";
    statusEl.textContent = "×";
    statusEl.title = "Server no corriendo. Arranca con: cd server && npm start";
  }
}

checkServer();
setInterval(checkServer, 5000);
