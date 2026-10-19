import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const translationsDir = path.join(root, "src", "localization", "translations");
const expectedLanguages = ["en", "fr", "ht", "es", "pt", "ar"];
const requiredKeys = [
  "welcome",
  "tagline",
  "language",
  "country",
  "home",
  "history",
  "services",
  "profile",
  "continue",
  "back",
  "return_modules",
  "create_profile",
  "access_account",
  "terms",
  "accept_terms",
  "save_profile",
  "module_action_ready",
  "module_action_step_identify",
  "module_action_step_review",
  "module_action_step_confirm",
  "module_action_notification",
  "cherlensky_default",
  "fred_transaction_denied",
  "fred_university_help",
  "payflow",
  "mailport",
  "store",
  "property",
  "restaurant",
  "school",
  "city",
  "health",
  "university",
  "tax",
  "administration"
];

const failures = [];

for (const language of expectedLanguages) {
  const file = path.join(translationsDir, `${language}.json`);
  if (!fs.existsSync(file)) {
    failures.push(`${language}: missing translation file`);
    continue;
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${language}: invalid JSON (${error.message})`);
    continue;
  }

  for (const key of requiredKeys) {
    if (!json[key]) failures.push(`${language}: missing key "${key}"`);
  }
}

if (failures.length) {
  console.error("Translation validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK: translations validated for en, fr, ht, es, pt, ar.");
