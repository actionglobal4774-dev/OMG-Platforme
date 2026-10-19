import fs from "node:fs";
import path from "node:path";
import { modulePageInventory } from "../src/data/pageInventory.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const workspace = read("src/modules/travel/TravelWorkspace.jsx");
const sectionPage = read("src/modules/travel/TravelSectionPage.jsx");
const moduleData = read("src/data/modules.js");
const logic = read("src/data/moduleLogic.js");
const routes = read("src/routes.jsx");
const inventory = modulePageInventory.find((module) => module.id === "travel");

if (!inventory || inventory.pages.length !== 12) failures.push("Travel doit déclarer ses 12 écrans directs");
for (const slug of ["home", "assistant", "flights", "hotels", "insurance", "trips", "bookings", "payment", "documents", "support", "partner", "administration"]) {
  if (!inventory?.pages.some(([pageSlug]) => pageSlug === slug)) failures.push(`écran Travel absent: ${slug}`);
  if (!sectionPage.includes(`${slug}:`)) failures.push(`navigation Travel absente: ${slug}`);
}
if (![workspace, moduleData, logic].join(" ").includes("4.99") && ![workspace, moduleData, logic].join(" ").includes("4,99")) {
  failures.push("frais de service Travel de 4,99 USD non déclarés");
}
if (!workspace.includes("roomServiceFee") || !logic.includes("par chambre")) failures.push("frais Travel par chambre absents");
for (const expected of ["awaiting_supplier_verification", "paymentStatus: \"not_paid\"", "supplier_confirmed", "cancellation_requested", "travel_reservations", "travel_support_requests", "roomServiceFee", "MonCash", "NatCash", "Payflow"]) {
  if (!workspace.includes(expected)) failures.push(`garantie métier Travel absente: ${expected}`);
}
if (!workspace.includes("Résultats de démonstration") || !workspace.includes("verification required")) failures.push("les offres de démonstration ne sont pas clairement étiquetées");
if (!workspace.includes("ne réserve jamais") || !workspace.includes("ne constituent pas une réservation")) failures.push("les limites de l'assistant de planification ne sont pas explicites");
if (!routes.includes('path="/travel/:section" element={<ProtectedRoute><TravelSectionPage /></ProtectedRoute>}')) failures.push("les écrans Travel ne sont pas protégés");

if (failures.length) {
  console.error("Travel validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK: Travel — 12 écrans, navigation, transparence des frais et garde-fous métier validés.");
