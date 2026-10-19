// Les simulations sont utiles localement, mais ne doivent jamais confirmer une
// action financiere ou metier sur le site publie.
const runtimeEnv = import.meta.env || {};

export const isDemoMode = Boolean(
  runtimeEnv.DEV || runtimeEnv.VITE_ALLOW_LOCAL_DEMO === "true"
);

export function requireDemoMode(action = "Cette action") {
  if (!isDemoMode) throw new Error(`${action} exige une connexion au backend securise.`);
}

export function liveBackendError(action = "Cette action") {
  return new Error(`${action} n'a pas pu etre confirme par le backend. Aucun resultat local n'a ete enregistre.`);
}
