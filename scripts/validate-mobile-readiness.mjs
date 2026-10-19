import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "index.html",
  "capacitor.config.ts",
  "public/manifest.webmanifest",
  "public/service-worker.js",
  "public/icons/omg-icon.svg",
  "public/icons/omg-icon-192.png",
  "public/icons/omg-icon-512.png"
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error(`Missing mobile/PWA files:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8"));
const serviceWorker = fs.readFileSync(path.join(root, "public/service-worker.js"), "utf8");
const capacitorConfig = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const checks = [
  ["viewport meta", html.includes('name="viewport"')],
  ["theme color", html.includes('name="theme-color"')],
  ["apple mobile capable", html.includes("apple-mobile-web-app-capable")],
  ["apple touch icon", html.includes("apple-touch-icon")],
  ["manifest link", html.includes('rel="manifest"')],
  ["standalone display", manifest.display === "standalone"],
  ["portrait orientation", String(manifest.orientation || "").includes("portrait")],
  ["start url", typeof manifest.start_url === "string" && manifest.start_url.length > 0],
  ["192 icon", manifest.icons?.some((icon) => String(icon.sizes).includes("192"))],
  ["512 icon", manifest.icons?.some((icon) => String(icon.sizes).includes("512"))],
  ["service worker install", serviceWorker.includes('addEventListener("install"')],
  ["service worker fetch", serviceWorker.includes('addEventListener("fetch"')],
  ["capacitor app id", capacitorConfig.includes("com.onemillionglobal.omgplatforme")],
  ["capacitor web dir", capacitorConfig.includes('webDir: "dist"')],
  ["capacitor android dependency", Boolean(packageJson.devDependencies?.["@capacitor/android"])],
  ["capacitor ios dependency", Boolean(packageJson.devDependencies?.["@capacitor/ios"])],
  ["mobile sync script", Boolean(packageJson.scripts?.["mobile:sync"])]
];

const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);

if (failed.length) {
  console.error(`Mobile readiness failed:\n${failed.map((label) => `- ${label}`).join("\n")}`);
  process.exit(1);
}

console.log("OK: OMG Platforme is mobile/PWA ready for web install, Android wrapper preparation, and iOS wrapper preparation.");
