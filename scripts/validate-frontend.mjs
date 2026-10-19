import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["translations", "scripts/validate-translations.mjs"],
  ["navigation", "scripts/validate-navigation.mjs"],
  ["workflows", "scripts/validate-workflows.mjs"],
  ["university-payment", "scripts/validate-university-payment.mjs"]
];

for (const [label, script] of checks) {
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`Frontend validation stopped at ${label}.`);
    process.exit(result.status || 1);
  }
}

const requiredFiles = [
  "src/context/AuthContext.jsx",
  "src/context/FredContext.jsx",
  "src/components/modules/ModuleDashboardTemplate.jsx",
  "src/components/common/CountryLanguageFields.jsx",
  "src/data/universityCatalog.js"
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Frontend validation failed:");
  for (const file of missing) console.error(`- missing ${file}`);
  process.exit(1);
}

console.log("OK: frontend structure validated.");
