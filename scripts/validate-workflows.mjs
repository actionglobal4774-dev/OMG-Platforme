import { modules } from "../src/data/modules.js";
import { getActionsForUserType, getModuleLogic } from "../src/data/moduleLogic.js";
import { readFileSync } from "node:fs";

const failures = [];
const payflowConnectedModules = [
  "payflow",
  "mailport",
  "store",
  "property",
  "restaurant",
  "school",
  "city",
  "health",
  "travel",
  "university",
  "tax"
];
const requiredPaymentTerms = ["payflow", "carte de credit", "mastercard", "carte de debit"];
const moduleDashboardTemplate = readFileSync(new URL("../src/components/modules/ModuleDashboardTemplate.jsx", import.meta.url), "utf8");
const requiredPaymentMemoryTerms = [
  "paymentMethods",
  "preferredPaymentMethodId",
  "savePaymentMethod",
  "selectedPaymentMethod",
  "paymentMethodId"
];

for (const term of requiredPaymentMemoryTerms) {
  if (!moduleDashboardTemplate.includes(term)) {
    failures.push(`memoire moyens de paiement absente: ${term}`);
  }
}

for (const module of modules) {
  if (!module.id || !module.route || !module.name) {
    failures.push(`module incomplet: ${module.name || module.id || "inconnu"}`);
    continue;
  }

  if (!Array.isArray(module.userTypes) || module.userTypes.length === 0) {
    failures.push(`${module.name}: aucun type utilisateur`);
  }

  if (!Array.isArray(module.actions) || module.actions.length === 0) {
    failures.push(`${module.name}: aucun menu principal`);
  }

  const logic = getModuleLogic(module.id);
  if (!logic.objective || !Array.isArray(logic.journey) || logic.journey.length < 3) {
    failures.push(`${module.name}: parcours utilisateur insuffisant`);
  }

  if (payflowConnectedModules.includes(module.id)) {
    const paymentSurface = [
      module.paymentRule,
      ...(logic.fees || []),
      logic.objective
    ].join(" ").toLowerCase();

    if (!paymentSurface.includes("payflow")) {
      failures.push(`${module.name}: paiement Payflow non declare clairement`);
    }

    for (const term of requiredPaymentTerms) {
      if (!paymentSurface.includes(term)) {
        failures.push(`${module.name}: moyen de paiement absent: ${term}`);
      }
    }
  }

  for (const userType of module.userTypes || []) {
    const actions = getActionsForUserType(module.id, userType, module.actions);
    if (!Array.isArray(actions) || actions.length === 0) {
      failures.push(`${module.name}: aucune fonction pour ${userType}`);
    }

    if (actions.length > 8) {
      failures.push(`${module.name}: trop de fonctions visibles pour ${userType}`);
    }
  }
}

const expectedModules = [
  "payflow",
  "mailport",
  "store",
  "property",
  "restaurant",
  "school",
  "city",
  "health",
  "travel",
  "university",
  "tax",
  "administration"
];

for (const moduleId of expectedModules) {
  if (!modules.some((module) => module.id === moduleId)) {
    failures.push(`module attendu absent: ${moduleId}`);
  }
}

if (failures.length) {
  console.error("Workflow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK: 12 workflows modules validated by user type.");
