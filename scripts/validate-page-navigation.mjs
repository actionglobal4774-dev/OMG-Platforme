import fs from "node:fs";
import path from "node:path";
import { modulePageInventory } from "../src/data/pageInventory.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const routes = read("src/routes.jsx");
const genericSections = read("src/modules/RemainingModuleSectionPage.jsx");
const travelSections = read("src/modules/travel/TravelSectionPage.jsx");
const healthSections = read("src/modules/health/HealthSectionPage.jsx");
const payflowSections = read("src/modules/payflow/PayflowSectionPage.jsx");
const failures = [];
const seenUrls = new Set();
const genericModuleIds = new Set(["property", "restaurant", "school", "city", "taxpro", "administration"]);

for (const module of modulePageInventory) {
  const baseRoute = module.basePath;
  const routePattern = `path="${baseRoute}/:section"`;
  if (!routes.includes(routePattern)) failures.push(`${module.name}: route de section absente`);
  const localSlugs = new Set();
  for (const [slug, title] of module.pages) {
    const url = `${baseRoute}/${slug}`;
    if (localSlugs.has(slug)) failures.push(`${module.name}: page doublée (${slug})`);
    if (seenUrls.has(url)) failures.push(`URL doublée (${url})`);
    localSlugs.add(slug);
    seenUrls.add(url);
    if (!title?.trim()) failures.push(`${url}: titre absent`);
  }
  if (genericModuleIds.has(module.id) && !genericSections.includes(`${module.id}:`)) {
    failures.push(`${module.name}: composant métier de section non raccordé`);
  }
}

for (const [label, source] of [
  ["Sections génériques métier", genericSections],
  ["Health Care", healthSections],
  ["One Million Travel", travelSections],
  ["Payflow", payflowSections],
]) {
  if (!source.includes("aria-label") || !source.includes("<Link")) failures.push(`${label}: navigation interne incomplète`);
}

if (routes.includes('import ModuleSectionPage') || routes.includes('<ModuleSectionPage ')) failures.push("ancienne page générique encore raccordée aux routes");
if (genericSections.includes('health: HealthWorkspace')) failures.push("doublon Health Care encore présent dans les sections génériques");

if (failures.length) {
  console.error("Audit page par page de la navigation échoué :");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`OK: ${seenUrls.size} pages directes contrôlées individuellement, sans URL doublée ni navigation générique active.`);
