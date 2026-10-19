import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const src = new URL("../src/", import.meta.url);
const issues = [];
const extensions = new Set([".js", ".jsx", ".mjs"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const file of await walk(src.pathname.slice(1))) {
  const content = await readFile(file, "utf8");
  const name = relative(root.pathname.slice(1), file);
  if (/console\.(log|debug)\s*\(/.test(content)) issues.push(`${name}: console.log/debug détecté`);
  if (/href=["']#["']/.test(content)) issues.push(`${name}: lien décoratif href="#" détecté`);
  if (/\.map\([^)]*=>\s*\(\s*<(?!React\.Fragment)[A-Z]/s.test(content) && !/key=/.test(content)) {
    issues.push(`${name}: vérifier une clé React dans une liste`);
  }
}

if (issues.length) {
  console.error(`Lint OMG: ${issues.length} problème(s)\n${issues.join("\n")}`);
  process.exit(1);
}
console.log("Lint OMG: PASS — aucun console.log/debug ou lien décoratif détecté.");
