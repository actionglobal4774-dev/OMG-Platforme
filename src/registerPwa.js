let deferredInstallPrompt = null;
const CHUNK_RELOAD_KEY = "omg:last-chunk-reload";

function recoverFromObsoleteChunk(event) {
  event.preventDefault();
  const lastReload = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);

  // Une seule actualisation automatique dans une fenetre de 15 secondes.
  // Cela recupere le nouvel index apres un deploiement sans creer de boucle.
  if (Date.now() - lastReload > 15000) {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
}

export function registerPwa() {
  window.addEventListener("vite:preloadError", recoverFromObsoleteChunk);

  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;

    navigator.serviceWorker.register(swUrl)
      .then((registration) => registration.update())
      .catch(() => {});
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("omg:pwa-installable"));
  });
}

export function canInstallPwa() {
  return Boolean(deferredInstallPrompt);
}

export async function installPwa() {
  if (!deferredInstallPrompt) return { ok: false, reason: "not-available" };
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return { ok: choice.outcome === "accepted", outcome: choice.outcome };
}
