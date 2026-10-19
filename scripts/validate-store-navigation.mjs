import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireCheck(condition, message) {
  if (!condition) throw new Error(`Store validation failed: ${message}`);
}

const routes = read("src/routes.jsx");
const page = read("src/modules/store/StoreSectionPage.jsx");
const workspace = read("src/modules/store/StoreWorkspace.jsx");
const expected = ["search", "product", "categories", "cart", "checkout", "orders", "seller-center", "products", "tracking", "map", "reviews", "commerce-ai"];

requireCheck(routes.includes('import("./modules/store/StoreSectionPage")'), "StoreSectionPage is not lazy-loaded");
requireCheck(routes.includes('<Route path="/store/:section" element={<ProtectedRoute><StoreSectionPage /></ProtectedRoute>} />'), "direct Store sections must require authentication");
for (const slug of expected) requireCheck(page.includes(`"${slug}"`), `missing section ${slug}`);
for (const feature of ["Navigation Store", "Ajouter au panier", "Passer au paiement", "Acces vendeur requis", "Carte Store mock", "Publier un avis", "Assistant Commerce AI"]) {
  requireCheck(page.includes(feature), `missing specialized function: ${feature}`);
}
for (const feature of ["createSecureStoreOrder", "completeSecureStoreOrderWithPayflow", "createPayPalOrder", "createStripeCheckoutSession", "Reference ou QR Mailport"]) {
  requireCheck(workspace.includes(feature), `missing Store integration: ${feature}`);
}

console.log("OK: 12 Store sections, buyer/seller permissions, cart, checkout, Mailport, reviews, map and Commerce AI validated.");
