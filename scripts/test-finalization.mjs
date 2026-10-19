import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { queryItems } from "../src/services/localActionService.js";
import {
  defaultNotificationPreferences,
  mockNotifications,
  notificationCategories
} from "../src/services/notificationService.js";

const routes = await readFile(new URL("../src/routes.jsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8");
const firebaseClient = await readFile(new URL("../src/services/firebaseClient.js", import.meta.url), "utf8");
const cloudCollections = await readFile(new URL("../src/services/cloudCollectionService.js", import.meta.url), "utf8");
const backendService = await readFile(new URL("../src/services/backendService.js", import.meta.url), "utf8");
const localActions = await readFile(new URL("../src/services/localActionService.js", import.meta.url), "utf8");
const runtimePolicy = await readFile(new URL("../src/services/runtimePolicy.js", import.meta.url), "utf8");
const payflowService = await readFile(new URL("../src/services/payflowService.js", import.meta.url), "utf8");
const protectedRoute = await readFile(new URL("../src/components/auth/ProtectedRoute.jsx", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../public/service-worker.js", import.meta.url), "utf8");

assert.equal(mockNotifications.length, 7, "Les sept catégories de notifications doivent avoir un mock");
assert.deepEqual(
  [...new Set(mockNotifications.map((item) => item.category))].sort(),
  [...notificationCategories].sort()
);
assert.ok(mockNotifications.every((item) => item.id && item.title && item.message && item.link));
assert.ok(notificationCategories.every((category) => defaultNotificationPreferences[category] === true));

const query = queryItems(
  [
    { id: "1", name: "Boston House", country: "US", price: 450000 },
    { id: "2", name: "Paris Apartment", country: "FR", price: 300000 },
    { id: "3", name: "Boston Studio", country: "US", price: 250000 }
  ],
  { search: "Boston", filters: { country: "US" }, sortBy: "price", sortDirection: "desc", page: 1, pageSize: 1 }
);
assert.equal(query.total, 2);
assert.equal(query.items[0].price, 450000);
assert.equal(query.totalPages, 2);

for (const path of ["/dashboard", "/notifications", "/profile", "/offline", "/payflow", "/mailport", "/store", "/travel"]) {
  assert.ok(routes.includes(`path="${path}"`), `Route manquante: ${path}`);
}
assert.ok(routes.includes("<ProtectedRoute><Dashboard /></ProtectedRoute>"));
assert.ok(auth.includes("getStoredFirebaseUser"));
assert.ok(firebaseClient.includes('AUTH_SESSION_KEY = "omg_firebase_auth_session"'));
assert.ok(auth.includes("listCloudCollection") && auth.includes("upsertCloudItem"));
assert.ok(auth.includes("cloudSafeProfile") && auth.includes("modulePassword"));
assert.ok(cloudCollections.includes("listUserModuleCollection"));
assert.ok(cloudCollections.includes("upsertUserModuleItem"));
assert.ok(protectedRoute.includes("Navigate"));
for (const path of ["/settings", "/profile", "/notifications", "/ai-assistant", "/store", "/property", "/restaurant-hotel-traiteur", "/school", "/city-administration", "/usa-tax-pro", "/travel"]) {
  assert.ok(routes.includes(`path=\"${path}\" element={<ProtectedRoute>`), `Route sensible non protegee: ${path}`);
}
assert.ok(runtimePolicy.includes("VITE_ALLOW_LOCAL_DEMO"));
assert.ok(backendService.includes("if (!isDemoMode) throw liveBackendError"));
assert.ok(localActions.includes('requireDemoMode("Le paiement")'));
assert.ok(payflowService.includes('callFirebaseFunction("validatePayflowTransferDraft"'));
assert.ok(payflowService.includes('requireDemoMode("La demande Payflow")'));
assert.ok(payflowService.includes('callFirebaseFunction("createPayflowMoneyRequest"'));
assert.ok(payflowService.includes('callFirebaseFunction("preparePayflowReceipt"'));

assert.equal(manifest.display, "standalone");
assert.equal(manifest.theme_color, "#050505");
assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
assert.ok(serviceWorker.includes("offline.html"));
assert.ok(serviceWorker.includes("CACHE_NAME"));

console.log("Tests ciblés OMG: PASS — notifications, actions locales, routes, auth et PWA.");
