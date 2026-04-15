// Service worker — background script
// Mantiene estado de sync y escucha eventos del popup

chrome.runtime.onInstalled.addListener(() => {
  console.log("[x-to-cortex] installed");
});

// TODO: relay de mensajes entre popup y content script
// TODO: health check al server local cada N minutos (storage.session)
