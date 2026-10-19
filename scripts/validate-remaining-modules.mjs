import fs from "node:fs";
import { modulePageInventory } from "../src/data/pageInventory.js";

function read(path) { return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"); }
function check(value, message) { if (!value) throw new Error(`Remaining modules validation failed: ${message}`); }

const source = read("src/modules/RemainingModuleSectionPage.jsx");
const healthSectionSource = read("src/modules/health/HealthSectionPage.jsx");
const routes = read("src/routes.jsx");
const targets = ["property", "restaurant", "school", "city", "taxpro", "administration"];

for (const moduleId of targets) {
  const inventory = modulePageInventory.find((item) => item.id === moduleId);
  check(inventory, `missing inventory for ${moduleId}`);
  check(source.includes(`${moduleId}: {`), `missing action map for ${moduleId}`);
  for (const [slug] of inventory.pages) check(source.includes(`${JSON.stringify(slug)}:`) || source.includes(` ${slug}:`), `missing ${moduleId}/${slug}`);
}

for (const component of ["PropertyWorkspace", "RestaurantWorkspace", "SchoolWorkspace", "CityWorkspace", "TaxWorkspace", "AdminWorkspace"]) {
  check(source.includes(component), `missing specialized workspace ${component}`);
}
for (const route of ["/property/:section", "/restaurant-hotel-traiteur/:section", "/school/:section", "/city-administration/:section", "/health-care/:section", "/usa-tax-pro/:section", "/platform-administration/:section"]) {
  check(routes.includes(`path="${route}"`), `missing route ${route}`);
}
check(!routes.includes('<ModuleSectionPage moduleId="property"'), "Property still uses generic sections");
check(!routes.includes('<ModuleSectionPage moduleId="restaurant"'), "Restaurant still uses generic sections");
check(!routes.includes('<ModuleSectionPage moduleId="school"'), "School still uses generic sections");
check(!routes.includes('<ModuleSectionPage moduleId="city"'), "City still uses generic sections");
check(!routes.includes('<ModuleSectionPage moduleId="taxpro"'), "Tax Pro still uses generic sections");
check(!routes.includes('<ModuleSectionPage moduleId="administration"'), "Administration still uses generic sections");
check(routes.includes('<HealthSectionPage />'), "Health Care does not use its dedicated section navigation");
check(healthSectionSource.includes("Patient Data Firewall") && healthSectionSource.includes("const redirects"), "Health Care deduplication and role gate are missing");
check(routes.includes('path="/university-integration/:section" element={<ProtectedRoute><UniversityDashboard /></ProtectedRoute>}'), "University direct sections are not connected to the functional dashboard");
check(source.includes("Fonction non autorisee pour ce role"), "role denial is missing");
check(source.includes("Mot de passe du module incorrect"), "module password gate is missing");
check(source.includes("Navigation ${match.module.name}"), "internal navigation is missing");

console.log("OK: 58 specialized sections across Property, Restaurant, School, City, Health Care, USA Tax Pro and Platform Administration, plus 7 University functional routes, validated with role permissions.");
