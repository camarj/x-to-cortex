// Service worker — background script
// En este MVP toda la lógica vive en content script + popup.
// El worker solo registra el evento de instalación para debug.

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[x-to-cortex] installed", details.reason);
});
