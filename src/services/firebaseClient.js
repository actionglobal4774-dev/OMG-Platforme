// Vite exposes import.meta.env in the browser build.  Keeping a safe empty
// value also lets frontend validation run in Node without a browser runtime.
const runtimeEnv = import.meta.env || {};

const firebaseConfig = {
  apiKey: runtimeEnv.VITE_FIREBASE_API_KEY,
  authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: runtimeEnv.VITE_FIREBASE_APP_ID,
  measurementId: runtimeEnv.VITE_FIREBASE_MEASUREMENT_ID
};

const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const AUTH_SESSION_KEY = "omg_firebase_auth_session";
let anonymousSession = null;

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  return session;
}

async function refreshSession(session) {
  if (!session?.refreshToken) return null;
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken })
  });
  const payload = await response.json();
  if (!response.ok || !payload.id_token) return null;
  return saveSession({ ...session, idToken: payload.id_token, refreshToken: payload.refresh_token, localId: payload.user_id, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 });
}

async function ensureAuthenticated() {
  if (!configured) throw new Error("Firebase n'est pas configure.");
  const storedSession = readStoredSession();
  if (storedSession?.idToken && storedSession.expiresAt > Date.now() + 60_000) return storedSession;
  if (storedSession?.refreshToken) {
    const refreshed = await refreshSession(storedSession);
    if (refreshed) return refreshed;
  }
  if (anonymousSession?.idToken && anonymousSession.expiresAt > Date.now() + 60_000) return anonymousSession;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) }
  );
  const payload = await response.json();
  if (!response.ok || !payload.idToken) throw new Error("Authentification Firebase anonyme indisponible.");
  anonymousSession = {
    idToken: payload.idToken,
    localId: payload.localId,
    expiresAt: Date.now() + Number(payload.expiresIn || 3600) * 1000
  };
  return anonymousSession;
}

async function emailPasswordRequest(path, data) {
  if (!configured) throw new Error("Firebase n'est pas configure.");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, returnSecureToken: true })
  });
  const payload = await response.json();
  if (!response.ok || !payload.idToken) throw new Error((payload.error?.message || "AUTHENTICATION_FAILED").replaceAll("_", " ").toLowerCase());
  return saveSession({ idToken: payload.idToken, refreshToken: payload.refreshToken, localId: payload.localId, email: payload.email, displayName: payload.displayName || data.displayName || "Utilisateur OMG", expiresAt: Date.now() + Number(payload.expiresIn || 3600) * 1000 });
}

export async function registerFirebaseUser({ email, password, displayName }) {
  const session = await emailPasswordRequest("accounts:signUp", { email, password });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: session.idToken, displayName, returnSecureToken: true })
  });
  const payload = await response.json();
  if (!response.ok || !payload.idToken) return { ...session, displayName };
  return saveSession({ ...session, idToken: payload.idToken, refreshToken: payload.refreshToken || session.refreshToken, displayName });
}

export function loginFirebaseUser({ email, password }) {
  return emailPasswordRequest("accounts:signInWithPassword", { email, password });
}

export async function sendFirebasePasswordReset(email) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error((payload.error?.message || "RESET_FAILED").replaceAll("_", " ").toLowerCase());
  return { ok: true };
}

export function getStoredFirebaseUser() {
  const session = readStoredSession();
  return session?.localId ? { uid: session.localId, email: session.email, displayName: session.displayName, mode: "firebase" } : null;
}

export function logoutFirebaseUser() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  anonymousSession = null;
}

export async function uploadFirebaseFile(file, folder = "moduleDocuments") {
  if (!file) throw new Error("Fichier obligatoire.");
  const session = await ensureAuthenticated();
  const safeName = `${Date.now()}-${String(file.name || "file").replace(/[^A-Za-z0-9._-]/g, "-")}`;
  const objectPath = `${folder}/${session.localId}/${safeName}`;
  const response = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(firebaseConfig.storageBucket)}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.idToken}`, "Content-Type": file.type || "application/octet-stream" },
    body: file
  });
  const payload = await response.json();
  if (!response.ok || !payload.name) throw new Error(payload.error?.message || "Televersement Firebase impossible.");
  return { path: payload.name, contentType: payload.contentType, size: payload.size };
}

export async function callFirebaseFunction(name, data) {
  const session = await ensureAuthenticated();
  const region = runtimeEnv.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
  const emulatorHost = runtimeEnv.DEV && runtimeEnv.VITE_FIREBASE_EMULATOR_HOST;
  const baseUrl = emulatorHost
    ? `http://${emulatorHost}:${Number(runtimeEnv.VITE_FIREBASE_EMULATOR_PORT || 5001)}/${firebaseConfig.projectId}/${region}`
    : `https://${region}-${firebaseConfig.projectId}.cloudfunctions.net`;
  const response = await fetch(`${baseUrl}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data })
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    const error = new Error(payload.error?.message || `Firebase ${name} indisponible.`);
    error.code = payload.error?.status || response.status;
    throw error;
  }
  const result = payload.data ?? payload.result;
  if (result === undefined) {
    throw new Error(`Reponse Firebase ${name} invalide.`);
  }
  return result;
}

export function isFirebaseConfigured() {
  return configured;
}
