import fs from "node:fs";
import path from "node:path";
import { modulePageInventory } from "../src/data/pageInventory.js";

const root = process.cwd();
const routesFile = path.join(root, "src", "routes.jsx");
const modulesFile = path.join(root, "src", "data", "modules.js");

const expected = [
  { route: "/payflow", sectionId: "payflow", file: "src/modules/payflow/PayflowDashboard.jsx" },
  { route: "/mailport", sectionId: "mailport", file: "src/modules/mailport/MailportDashboard.jsx" },
  { route: "/store", sectionId: "store", file: "src/modules/store/StoreDashboard.jsx" },
  { route: "/property", sectionId: "property", file: "src/modules/property/PropertyDashboard.jsx" },
  { route: "/restaurant-hotel-traiteur", sectionId: "restaurant", file: "src/modules/restaurant/RestaurantDashboard.jsx" },
  { route: "/school", sectionId: "school", file: "src/modules/school/SchoolDashboard.jsx" },
  { route: "/city-administration", sectionId: "city", file: "src/modules/city/CityDashboard.jsx" },
  { route: "/health-care", sectionId: "health", file: "src/modules/health/HealthDashboard.jsx" },
  { route: "/travel", sectionId: "travel", file: "src/modules/travel/TravelDashboard.jsx" },
  { route: "/university-integration", sectionId: "university", file: "src/modules/university/UniversityDashboard.jsx" },
  { route: "/usa-tax-pro", sectionId: "taxpro", file: "src/modules/taxpro/TaxDashboard.jsx" },
  { route: "/platform-administration", sectionId: "administration", file: "src/modules/administration/AdminDashboard.jsx" }
];

const failures = [];
const routeSource = fs.readFileSync(routesFile, "utf8");
const modulesSource = fs.readFileSync(modulesFile, "utf8");
const sidebarSource = fs.readFileSync(path.join(root, "src", "components", "layout", "Sidebar.jsx"), "utf8");
const navbarSource = fs.readFileSync(path.join(root, "src", "components", "layout", "Navbar.jsx"), "utf8");
const layoutSource = fs.readFileSync(path.join(root, "src", "components", "layout", "DashboardLayout.jsx"), "utf8");
const templateSource = fs.readFileSync(path.join(root, "src", "components", "modules", "ModuleDashboardTemplate.jsx"), "utf8");

for (const item of expected) {
  if (!routeSource.includes(`path="${item.route}"`)) failures.push(`missing route ${item.route}`);
  if (!modulesSource.includes(`route: "${item.route}"`)) failures.push(`missing module registry route ${item.route}`);
  if (!fs.existsSync(path.join(root, item.file))) failures.push(`missing dashboard file ${item.file}`);
  if (!routeSource.includes(`path="${item.route}/:section"`)) failures.push(`missing section route ${item.route}/:section`);
  const hasSpecializedSection = (item.sectionId === "payflow" && routeSource.includes("<PayflowSectionPage />")) ||
    (item.sectionId === "mailport" && routeSource.includes("<MailportSectionPage />")) ||
    (item.sectionId === "store" && routeSource.includes("<StoreSectionPage />")) ||
    (["property", "restaurant", "school", "city", "taxpro", "administration"].includes(item.sectionId) && routeSource.includes(`<RemainingModuleSectionPage moduleId="${item.sectionId}" />`)) ||
    (item.sectionId === "health" && routeSource.includes("<HealthSectionPage />")) ||
    (item.sectionId === "travel" && routeSource.includes("<TravelSectionPage />")) ||
    (item.sectionId === "university" && routeSource.includes('path="/university-integration/:section" element={<ProtectedRoute><UniversityDashboard /></ProtectedRoute>}'));
  if (!hasSpecializedSection && !routeSource.includes(`moduleId="${item.sectionId}"`)) failures.push(`wrong section module id for ${item.route}`);
}

for (const module of modulePageInventory) {
  if (!expected.some((item) => item.route === module.basePath && item.sectionId === module.id)) {
    failures.push(`orphan page inventory module ${module.id}`);
  }
  const slugs = module.pages.map(([slug]) => slug);
  if (new Set(slugs).size !== slugs.length) failures.push(`duplicate section slug in ${module.id}`);
  if (!slugs.length) failures.push(`no direct sections declared for ${module.id}`);
}

for (const [legacy, canonical] of [
  ["/restaurant", "/restaurant-hotel-traiteur"],
  ["/city", "/city-administration"],
  ["/health", "/health-care"],
  ["/travel-agency", "/travel"],
  ["/university", "/university-integration"],
  ["/administration", "/platform-administration"]
]) {
  if (!routeSource.includes(`path="${legacy}" element={<Navigate to="${canonical}" replace />}`)) {
    failures.push(`missing canonical redirect ${legacy} -> ${canonical}`);
  }
}

if (!sidebarSource.includes("modules.map") || !sidebarSource.includes('to="/dashboard"') || !sidebarSource.includes('to="/settings"')) {
  failures.push("desktop Sidebar does not expose modules, dashboard and settings");
}
if (!navbarSource.includes('to="/"') || !navbarSource.includes('to="/dashboard"') || !navbarSource.includes('to="/notifications"')) {
  failures.push("Navbar global navigation is incomplete");
}
if (!layoutSource.includes('aria-label="Modules OMG"') || !layoutSource.includes("modules.map") || !layoutSource.includes("omg-module-rail")) {
  failures.push("mobile module navigation rail is incomplete");
}
for (const tab of ['id: "home"', 'id: "profile"', 'id: "history"', 'id: "services"']) {
  if (!templateSource.includes(tab)) failures.push(`mobile bottom navigation missing ${tab}`);
}
if (!routeSource.includes('<Route path="*" element={<NotFound />} />')) failures.push("global 404 route missing");

if (!routeSource.includes('path="/university-integration" element={<ProtectedRoute><UniversityDashboard /></ProtectedRoute>}')) {
  failures.push("University dashboard direct URL is not authentication-protected");
}
if (!routeSource.includes('path="/university-integration/:section" element={<ProtectedRoute><UniversityDashboard /></ProtectedRoute>}')) {
  failures.push("University section direct URLs are not authentication-protected");
}
if (!routeSource.includes('path="/payflow" element={<ProtectedRoute><PayflowDashboard /></ProtectedRoute>}')) {
  failures.push("Payflow dashboard direct URL is not authentication-protected");
}
if (!routeSource.includes('path="/payflow/:section" element={<ProtectedRoute><PayflowSectionPage /></ProtectedRoute>}')) {
  failures.push("Payflow section direct URLs are not authentication-protected");
}
if (!routeSource.includes('path="/mailport" element={<ProtectedRoute><MailportDashboard /></ProtectedRoute>}') ||
    !routeSource.includes('path="/mailport/:section" element={<ProtectedRoute><MailportSectionPage /></ProtectedRoute>}')) {
  failures.push("Mailport routes are not protected by authentication");
}
if (!routeSource.includes('path="/health-care/:section" element={<ProtectedRoute><HealthSectionPage /></ProtectedRoute>}')) {
  failures.push("Health Care section direct URLs are not specialized and authentication-protected");
}
if (!routeSource.includes('path="/travel" element={<ProtectedRoute><TravelDashboard /></ProtectedRoute>}') ||
    !routeSource.includes('path="/travel/:section" element={<ProtectedRoute><TravelSectionPage /></ProtectedRoute>}')) {
  failures.push("Travel routes are not specialized and authentication-protected");
}

const forbiddenLegacyModule = ["Jah", "Mu"].join("-");
if (modulesSource.includes(forbiddenLegacyModule) || routeSource.includes(forbiddenLegacyModule.toLowerCase())) {
  failures.push("A retired legacy module still appears in active navigation");
}

if (failures.length) {
  console.error("Navigation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const directSections = modulePageInventory.reduce((total, module) => total + module.pages.length, 0);
console.log(`OK: 12 module routes, ${directSections} direct sections, aliases, global menus and 404 validated.`);
