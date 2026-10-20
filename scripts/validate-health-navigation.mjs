import fs from "node:fs";

const routes = fs.readFileSync(new URL("../src/routes.jsx", import.meta.url), "utf8");
const workspace = fs.readFileSync(new URL("../src/modules/health/HealthWorkspace.jsx", import.meta.url), "utf8");
const sectionPage = fs.readFileSync(new URL("../src/modules/health/HealthSectionPage.jsx", import.meta.url), "utf8");
const logic = fs.readFileSync(new URL("../src/data/moduleLogic.js", import.meta.url), "utf8");
const inventory = fs.readFileSync(new URL("../src/data/pageInventory.js", import.meta.url), "utf8");
const failures = [];

for (const routeCheck of [
  'path="/health-care" element={<ProtectedRoute><HealthDashboard /></ProtectedRoute>}',
  'path="/health-care/:section" element={<ProtectedRoute><HealthSectionPage /></ProtectedRoute>}',
  'path="/health" element={<Navigate to="/health-care" replace />}'
]) {
  if (!routes.includes(routeCheck)) failures.push(`route Health invalide: ${routeCheck}`);
}

for (const userType of ["Patient", "Medecin", "Infirmier", "Psychologue", "Pharmacie", "Laboratoire", "Assurance", "Administration sante", "Institution"]) {
  if (!logic.includes(`${userType}:`) && !logic.includes(`"${userType}":`)) failures.push(`profil Health absent: ${userType}`);
}

for (const mode of ["record", "appointment", "appointments", "payment", "prescriptions", "prescribe", "results", "lab", "telehealth", "consultation", "diagnosis", "vitals", "nurse-notes", "psychology", "pharmacy-delivery", "sessions", "access", "compliance", "emergency", "insurance", "insurance-records", "lab-catalog", "imaging", "sharing", "audit"]) {
  if (!workspace.includes(`"${mode}"`)) failures.push(`parcours Health absent: ${mode}`);
}

for (const section of ["profile", "doctors", "appointments", "payment", "insurance", "pharmacy", "laboratory-catalog", "imaging", "secure-sharing", "emergency-access", "audit"]) {
  const key = /^[a-z]+$/.test(section) ? `${section}:` : `"${section}":`;
  if (!sectionPage.includes(key)) failures.push(`page Health specialisee absente: ${section}`);
}

for (const redirect of ["provider: \"doctors\"", "appointment: \"doctors\"", "centers: \"doctors\"", '"provider-dashboard": "audit"']) {
  if (!sectionPage.includes(redirect)) failures.push(`doublon Health non redirige: ${redirect}`);
}

for (const privacyControl of ["visiblePrescriptions", "visibleLabResults", "visibleRecords", "belongsToPatient"]) {
  if (!workspace.includes(privacyControl)) failures.push(`filtrage patient absent: ${privacyControl}`);
}

for (const cloudControl of ["listCloudCollection", "upsertCloudItem", "persistHealthItem", '"access_audit"']) {
  if (!workspace.includes(cloudControl)) failures.push(`synchronisation Health absente: ${cloudControl}`);
}

for (const collection of ["appointments", "health_prescriptions", "health_lab_results", "health_vitals", "health_records", "health_psychology_protected", "health_staff", "health_access_audit", "health_emergency_access", "health_insurance_requests", "health_pharmacy_dispenses", "health_lab_catalog", "health_secure_shares", "health_imaging_requests"]) {
  if (!workspace.includes(`"${collection}"`)) failures.push(`collection Health non synchronisee: ${collection}`);
}

for (const slug of ["profile", "doctors", "provider", "appointment", "appointments", "payment", "centers", "provider-dashboard", "insurance", "pharmacy", "laboratory-catalog", "imaging", "secure-sharing", "emergency-access", "audit"]) {
  if (!inventory.includes(`["${slug}"`)) failures.push(`sous-page Health absente: ${slug}`);
}

if (failures.length) {
  console.error("Audit Health Care: ECHEC");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Audit statique Health Care: REUSSI — presence des routes, 9 profils, parcours et filtres. Ne certifie ni securite serveur ni recette navigateur.");
