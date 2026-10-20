import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "src", "modules", "university", "UniversityDashboard.jsx");
const source = fs.readFileSync(file, "utf8");

const checks = [
  ["unit price 19.99", "UNIVERSITY_FACULTY_PRICE_USD = 19.99"],
  ["dynamic amount by faculty count", "selectedFacultyCount * UNIVERSITY_FACULTY_PRICE_USD"],
  ["payflow payment available", "<option value=\"Payflow\">Payflow</option>"],
  ["backend payment action", "Paiement session University Integration"],
  ["local activity saved", "saveModuleActivity(\"university\""],
  ["demo access is separate from payment", "setPaid(isDemoMode)"]
  ,["enrollment validation", "validateUniversityEnrollment"]
  ,["Firestore enrollment saved", 'upsertCloudItem("university", "enrollments"']
  ,["Firestore payment saved", 'upsertCloudItem("university", "payments"']
  ,["Firestore progress synchronized", 'upsertCloudItem("university", "learning_progress"']
];

const failures = checks
  .filter(([, needle]) => !source.includes(needle))
  .map(([label]) => label);

if (failures.length) {
  console.error("University payment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK statique: tarif dynamique et demande University presentes ; paiement reel et droits serveur non certifies.");
