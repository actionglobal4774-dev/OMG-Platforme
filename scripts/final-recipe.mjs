import { access, readFile, writeFile } from "node:fs/promises";

const modules = [
  ["Dashboard", "src/pages/user/Dashboard.jsx", "/dashboard"],
  ["Authentication", "src/pages/auth/Login.jsx", "/login"],
  ["Profile", "src/pages/user/Profile.jsx", "/profile"],
  ["Notifications", "src/pages/user/Notifications.jsx", "/notifications"],
  ["AI Assistant", "src/pages/user/AIAssistant.jsx", "/ai-assistant"],
  ["Payflow", "src/modules/payflow/PayflowDashboard.jsx", "/payflow"],
  ["Mailport", "src/modules/mailport/MailportDashboard.jsx", "/mailport"],
  ["Property", "src/modules/property/PropertyDashboard.jsx", "/property"],
  ["Restaurant", "src/modules/restaurant/RestaurantDashboard.jsx", "/restaurant-hotel-traiteur"],
  ["Store", "src/modules/store/StoreDashboard.jsx", "/store"],
  ["Health", "src/modules/health/HealthDashboard.jsx", "/health-care"],
  ["School", "src/modules/school/SchoolDashboard.jsx", "/school"],
  ["City", "src/modules/city/CityDashboard.jsx", "/city-administration"],
  ["USA Tax Pro", "src/modules/taxpro/TaxDashboard.jsx", "/usa-tax-pro"],
  ["University", "src/modules/university/UniversityDashboard.jsx", "/university-integration"],
  ["Administration", "src/modules/administration/AdminDashboard.jsx", "/platform-administration"],
  ["Settings", "src/pages/user/Settings.jsx", "/settings"]
];

const root = new URL("../", import.meta.url);
const routes = await readFile(new URL("../src/routes.jsx", import.meta.url), "utf8");
const inventory = await readFile(new URL("../src/data/pageInventory.js", import.meta.url), "utf8");
const rows = [];
const inventoryNames = {
  City: "City Administration",
  Restaurant: "Restaurant, Hotel & Catering",
  University: "University Integration",
  Administration: "Platform Administration"
};

for (const [name, file, route] of modules) {
  let filePresent = true;
  try {
    await access(new URL(`../${file}`, import.meta.url));
  } catch {
    filePresent = false;
  }
  const routePresent = routes.includes(`path="${route}"`);
  const sectionsPresent = ["Dashboard", "Authentication", "Profile", "Notifications", "AI Assistant", "Settings"].includes(name)
    ? true
    : inventory.includes(`name: "${inventoryNames[name] || name}"`) || inventory.includes(`name: "OMG ${name}"`) || inventory.includes(`name: "One Million ${name}"`);
  const status = filePresent && routePresent && sectionsPresent ? "Pass" : filePresent && routePresent ? "Partial" : "Blocked";
  rows.push({ name, status, filePresent, routePresent, sectionsPresent });
}

const report = [
  "# Recette finale frontend OMG Platforme",
  "",
  `Date: ${new Date().toISOString()}`,
  "",
  "| Module | Statut | Page principale | Route | Pages métier inventoriées |",
  "|---|---|---:|---:|---:|",
  ...rows.map((row) => `| ${row.name} | ${row.status} | ${row.filePresent ? "Oui" : "Non"} | ${row.routePresent ? "Oui" : "Non"} | ${row.sectionsPresent ? "Oui" : "Non"} |`),
  "",
  "## Portée vérifiée automatiquement",
  "",
  "- présence des pages principales;",
  "- présence des routes principales;",
  "- inventaire des pages métier;",
  "- build, lint et tests ciblés via les scripts npm séparés.",
  "",
  "## Limites de cette recette",
  "",
  "- Google Maps, Payflow, Firebase, backend, OCR, biométrie et notifications serveur restent simulés;",
  "- la validation visuelle exhaustive sur appareils physiques reste une recette manuelle;",
  "- les autorisations sont frontend et ne constituent pas une sécurité serveur.",
  ""
].join("\n");

await writeFile(new URL("../FINAL_RECIPE_REPORT.md", import.meta.url), report, "utf8");
console.log(report);
if (rows.some((row) => row.status === "Blocked")) process.exit(1);
