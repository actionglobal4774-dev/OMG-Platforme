import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const commands = [
  ["translations", process.execPath, ["scripts/validate-translations.mjs"]],
  ["navigation", process.execPath, ["scripts/validate-navigation.mjs"]],
  ["frontend", process.execPath, ["scripts/validate-frontend.mjs"]],
  ["web build", process.platform === "win32" ? "cmd.exe" : "npm", process.platform === "win32" ? ["/c", "npm.cmd", "run", "build"] : ["run", "build"]]
];

function run(label, command, args) {
  console.log(`\n=== Verification: ${label} ===`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`\nECHEC: ${label}`);
    process.exit(result.status || 1);
  }
}

for (const item of commands) {
  run(...item);
}

const requiredReleaseFiles = [
  "dist/index.html",
  "src/pages/public/Home.jsx",
  "src/components/common/AppErrorBoundary.jsx",
  "src/components/modules/ModuleDashboardTemplate.jsx",
  "src/modules/university/UniversityDashboard.jsx",
  "src/data/modules.js",
  "src/data/universityCatalog.js"
];

const missing = requiredReleaseFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error("\nECHEC: fichiers release manquants");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log("\nOK: OMG Frontend 509 est pret pour verification utilisateur et publication web.");
