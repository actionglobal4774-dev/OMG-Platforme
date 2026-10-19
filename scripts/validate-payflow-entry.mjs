import fs from "node:fs";
import path from "node:path";
import { modules } from "../src/data/modules.js";
import { getActionsForUserType, getModuleLogic } from "../src/data/moduleLogic.js";

const root = process.cwd();
const failures = [];
const payflow = modules.find((module) => module.id === "payflow");
const templatePath = path.join(root, "src", "components", "modules", "ModuleDashboardTemplate.jsx");
const dashboardPath = path.join(root, "src", "modules", "payflow", "PayflowDashboard.jsx");
const sectionPagePath = path.join(root, "src", "modules", "payflow", "PayflowSectionPage.jsx");
const routesPath = path.join(root, "src", "routes.jsx");
const qrPath = path.join(root, "src", "modules", "payflow", "PayflowQr.jsx");
const contactServicePath = path.join(root, "src", "services", "payflowContactService.js");
const sendMoneyPath = path.join(root, "src", "modules", "payflow", "SendMoney.jsx");
const requestMoneyPath = path.join(root, "src", "modules", "payflow", "RequestMoney.jsx");
const receiveMoneyPath = path.join(root, "src", "modules", "payflow", "ReceiveMoney.jsx");
const specialServicesPath = path.join(root, "src", "modules", "payflow", "PayflowSpecialServices.jsx");
const payflowBanksPath = path.join(root, "src", "data", "payflowBanks.js");
const payflowTimingPath = path.join(root, "src", "data", "payflowTiming.js");
const globalOptionsPath = path.join(root, "src", "data", "globalOptions.js");
const paypalReturnPath = path.join(root, "src", "pages", "payment", "PayPalReturnPage.jsx");
const stripeReturnPath = path.join(root, "src", "pages", "payment", "StripeReturnPage.jsx");
const moncashReturnPath = path.join(root, "src", "pages", "payment", "MonCashReturnPage.jsx");

if (!fs.existsSync(sectionPagePath)) {
  failures.push("Le routeur des sous-pages Payflow est absent.");
} else {
  const sectionPage = fs.readFileSync(sectionPagePath, "utf8");
  for (const slug of ["wallet", "send", "request", "receive", "deposit", "withdraw", "exchange", "transactions", "qr-payment", "operators", "verification", "payment-methods", "settings", "dispute", "track-transfer"]) {
    if (!sectionPage.includes(`${slug}:`) && !sectionPage.includes(`"${slug}":`)) failures.push(`Sous-page Payflow non fonctionnelle: ${slug}`);
  }
  for (const control of ["Retour a Payflow", "Navigate to=\"/not-found\"", "OperatorCash", "PaymentMethods", "PayflowQr", "SendMoney", "RequestMoney", "Transactions", "Wallet", "Enregistrer"]) {
    if (!sectionPage.includes(control)) failures.push(`Controle de sous-page Payflow absent: ${control}`);
  }
}

const routes = fs.readFileSync(routesPath, "utf8");
for (const protectedRoute of [
  'path="/payflow" element={<ProtectedRoute><PayflowDashboard /></ProtectedRoute>}',
  'path="/payflow/:section" element={<ProtectedRoute><PayflowSectionPage /></ProtectedRoute>}'
]) {
  if (!routes.includes(protectedRoute)) failures.push(`Acces Payflow non protege: ${protectedRoute}`);
}

for (const [provider, filePath, requiredParts] of [
  ["PayPal", paypalReturnPath, ['pending?.moduleId === "payflow" ? "/payflow"', "capturePayPalOrder", 'sessionStorage.removeItem("omgPayPalPending")']],
  ["Stripe", stripeReturnPath, ['pending?.moduleId === "payflow" ? "/payflow"', "verifyStripeCheckoutSession", 'sessionStorage.removeItem("omgStripePending")']],
  ["MonCash", moncashReturnPath, ['pending?.moduleId === "payflow" ? "/payflow"', "verifyMonCashPayment", 'sessionStorage.removeItem("omgMonCashPending")']]
]) {
  const source = fs.readFileSync(filePath, "utf8");
  for (const part of requiredParts) if (!source.includes(part)) failures.push(`Retour ${provider} vers Payflow incomplet: ${part}`);
}

if (!payflow) {
  failures.push("Payflow est absent de la liste des modules.");
} else {
  if (payflow.route !== "/payflow") {
    failures.push(`Route Payflow incorrecte: ${payflow.route}`);
  }

  const expectedUserTypes = ["Avec carte bancaire", "Avec operateur Payflow"];
  for (const userType of expectedUserTypes) {
    if (!payflow.userTypes.includes(userType)) {
      failures.push(`Type utilisateur Payflow absent: ${userType}`);
      continue;
    }

    const actions = getActionsForUserType("payflow", userType, payflow.actions);
    if (!actions.length) {
      failures.push(`Aucun service Payflow visible apres creation du profil pour: ${userType}`);
    }

    if (userType === "Avec carte bancaire") {
      for (const requiredAction of ["Envoyer argent", "Demander argent", "Recevoir paiement", "Utiliser QR"]) {
        if (!actions.includes(requiredAction)) {
          failures.push(`Payflow carte bancaire: action manquante apres la deuxieme page: ${requiredAction}`);
        }
      }
    }

    if (userType === "Avec operateur Payflow") {
      for (const requiredAction of ["Depot operateur", "Retrait operateur", "Envoyer argent", "Recevoir paiement"]) {
        if (!actions.includes(requiredAction)) {
          failures.push(`Payflow operateur: action manquante apres la deuxieme page: ${requiredAction}`);
        }
      }
    }
  }

  const logic = getModuleLogic("payflow");
  if (!logic?.journey?.some((step) => step.toLowerCase().includes("creer"))) {
    failures.push("Le parcours Payflow ne mentionne pas la creation/ouverture du profil.");
  }

  if (!logic?.journey?.some((step) => step.toLowerCase().includes("carte") || step.toLowerCase().includes("operateur"))) {
    failures.push("Le parcours Payflow ne mentionne pas le choix carte bancaire / operateur.");
  }
}

if (!fs.existsSync(templatePath)) {
  failures.push("Le composant de navigation des modules est absent.");
} else {
  const template = fs.readFileSync(templatePath, "utf8");
  const requiredFlowParts = [
    'setStep("profile")',
    'setStep("accountLogin")',
    'setStep("menu")',
    "saveModuleProfile(module.id",
    "getActionsForUserType(module.id, profile.userType",
    "openModuleAction(index)",
    "setActiveAction(index)",
    "selectedAction",
    "closeModuleAction",
    "setActiveAction(null)",
    "return_menu",
    "setActiveTab(\"history\")",
    "confirmAction"
  ];

  for (const part of requiredFlowParts) {
    if (!template.includes(part)) {
      failures.push(`Connexion Payflow incomplete dans le parcours menu/action/retour: ${part}`);
    }
  }

  const requiredThirdPageFields = [
    "module_action_title",
    "module_action_location",
    "module_action_amount",
    "module_action_file",
    "module_action_details",
    "module_action_step_confirm"
  ];

  for (const field of requiredThirdPageFields) {
    if (!template.includes(field)) {
      failures.push(`Troisieme page Payflow incomplete, champ/action absent: ${field}`);
    }
  }

  const requiredFourthStepParts = [
    "getActionValidationMessage",
    "payflow_final_confirmation_required",
    "payflow_amount_required",
    "payflow_contact_required",
    "local-validation",
    "!draft.confirmed",
    "actionResult &&",
    "action_confirmed",
    "action_needs_confirmation",
    "reference",
    "saveModuleActivity(module.id",
    "getModuleActivities(module.id)",
    "setActivities(getModuleActivities(module.id))",
    "notifyModuleUser(module.id",
    'setActiveTab("history")',
    "closeModuleAction();",
    'activeTab === "history"',
    "history_empty"
  ];

  for (const part of requiredFourthStepParts) {
    if (!template.includes(part)) {
      failures.push(`Quatrieme etape Payflow incomplete apres confirmation: ${part}`);
    }
  }

  const requiredContactParts = [
    "getPayflowContacts",
    "savePayflowContact",
    "getPayflowContactAccountKey",
    "showPayflowContacts",
    "choosePayflowContact",
    "addPayflowContact",
    "payflow_contacts_title",
    "payflow_save_contact",
    "selectedPayflowContact",
    "contact: selectedPayflowContact"
  ];

  for (const part of requiredContactParts) {
    if (!template.includes(part)) {
      failures.push(`Liste de contacts Payflow incomplete ou non reliee: ${part}`);
    }
  }
}

if (!fs.existsSync(dashboardPath)) {
  failures.push("Le tableau Payflow est absent.");
} else {
  const dashboard = fs.readFileSync(dashboardPath, "utf8");
  if (!dashboard.includes("ModuleDashboardTemplate")) {
    failures.push("Payflow n'utilise pas la navigation universelle des modules.");
  }
  if (!dashboard.includes('getModuleById("payflow")')) {
    failures.push("Payflow ne charge pas le bon module.");
  }
  if (!dashboard.includes("renderCompactAction") || !dashboard.includes("<PayflowQr />")) {
    failures.push("Le bouton Utiliser son QR n'ouvre pas le vrai composant QR Payflow.");
  }
  if (!dashboard.includes("SendMoney") || !dashboard.includes("<SendMoney />")) {
    failures.push("Le bouton Envoyer n'ouvre pas le vrai formulaire d'envoi Payflow.");
  }
  if (!dashboard.includes("RequestMoney") || !dashboard.includes("<RequestMoney />")) {
    failures.push("Le bouton Demander n'ouvre pas le vrai formulaire de demande Payflow.");
  }
  if (!dashboard.includes("ReceiveMoney") || !dashboard.includes("<ReceiveMoney />")) {
    failures.push("Le bouton Recevoir n'ouvre pas le vrai formulaire de reception Payflow.");
  }
  if (!dashboard.includes("PayflowSpecialServices") || !dashboard.includes("<PayflowSpecialServices />")) {
    failures.push("Le bouton Client service special n'ouvre pas la page Changer pays/devise Payflow.");
  }
}

if (!fs.existsSync(sendMoneyPath)) {
  failures.push("Le formulaire Envoyer argent Payflow est absent.");
} else {
  const sendMoney = fs.readFileSync(sendMoneyPath, "utf8");
  const requiredInternationalBankParts = [
    "international-bank",
    "bank-transfer",
    "bankCountry",
    "bankName",
    "accountHolder",
    "bankAccount",
    "swiftOrRouting",
    "getBanksForCountry",
    "availableBanks",
    "payflow_choose_available_bank",
    "payflow_available_banks_notice",
    "depositFor",
    "relationship",
    "payflow_deposit_for_friend",
    "payflow_deposit_for_close_person",
    "confirmTransfer",
    "payflow_direct_confirmation_required",
    "payflow_direct_confirmation_done",
    "deliveryDelay",
    "getPayflowDeliveryDelay",
    "payflow_delivery_delay",
    "Finaliser la transaction"
  ];

  for (const part of requiredInternationalBankParts) {
    if (!sendMoney.includes(part)) {
      failures.push(`Envoi Payflow vers banque internationale incomplet: ${part}`);
    }
  }
}

if (!fs.existsSync(requestMoneyPath)) {
  failures.push("Le formulaire Demander argent Payflow est absent.");
} else {
  const requestMoney = fs.readFileSync(requestMoneyPath, "utf8");
  for (const part of ["payflow_payer_required", "payflow_request_confirmation_required", "payflow_create_request_now", "payflow_payment_request_created", "payflow_request_delay"]) {
    if (!requestMoney.includes(part)) {
      failures.push(`Demander argent Payflow incomplet: ${part}`);
    }
  }
}

if (!fs.existsSync(receiveMoneyPath)) {
  failures.push("Le formulaire Recevoir argent Payflow est absent.");
} else {
  const receiveMoney = fs.readFileSync(receiveMoneyPath, "utf8");
  for (const part of ["payflow_receive_confirmation_required", "payflow_confirm_receive_now", "payflow_receive_ready", "payflow_qr_receive_delay", "payflow_receive_delay"]) {
    if (!receiveMoney.includes(part)) {
      failures.push(`Recevoir argent Payflow incomplet: ${part}`);
    }
  }
}

if (!fs.existsSync(payflowBanksPath)) {
  failures.push("La liste des banques Payflow par pays est absente.");
} else {
  const banks = fs.readFileSync(payflowBanksPath, "utf8");
  for (const part of ["payflowBankDirectory", "getBanksForCountry", "HT", "US", "Unibank", "JPMorgan Chase"]) {
    if (!banks.includes(part)) {
      failures.push(`Liste banques Payflow incomplete: ${part}`);
    }
  }
}

if (!fs.existsSync(globalOptionsPath)) {
  failures.push("La liste mondiale pays/langue/devise est absente.");
} else {
  const globalOptions = fs.readFileSync(globalOptionsPath, "utf8");
  for (const part of ["currency", "currencyRateFromUsd", "getCurrencyForCountryCode", "getCountryServiceCharge", "4.99"]) {
    if (!globalOptions.includes(part)) {
      failures.push(`Pays/devise Payflow incomplet: ${part}`);
    }
  }
}

if (!fs.existsSync(specialServicesPath)) {
  failures.push("La page Payflow Client service special est absente.");
} else {
  const specialServices = fs.readFileSync(specialServicesPath, "utf8");
  const requiredSpecialServiceParts = [
    "Changer de pays / devise",
    "getCountryServiceCharge",
    "4.99",
    "currency",
    "payflow_country_currency_rule",
    "payflow_confirm_country_fee",
    "payflow_country_change_done",
    "payflowSpecialServiceDelays",
    "payflow_delivery_delay",
    "countryChange"
  ];

  for (const part of requiredSpecialServiceParts) {
    if (!specialServices.includes(part)) {
      failures.push(`Changer pays/devise Payflow incomplet: ${part}`);
    }
  }
}

if (!fs.existsSync(payflowTimingPath)) {
  failures.push("La table des delais Payflow est absente.");
} else {
  const timing = fs.readFileSync(payflowTimingPath, "utf8");
  for (const part of ["payflowDeliveryDelays", "payflowSpecialServiceDelays", "getPayflowDeliveryDelay", "international-bank", "2 a 5 jours ouvrables", "countryChange"]) {
    if (!timing.includes(part)) {
      failures.push(`Delais Payflow incomplets: ${part}`);
    }
  }
}

if (!fs.existsSync(qrPath)) {
  failures.push("Le composant QR Payflow est absent.");
} else {
  const qr = fs.readFileSync(qrPath, "utf8");
  const requiredQrParts = [
    "QRCodeSVG",
    "createSecurePayflowQr",
    "inspectSecurePayflowQr",
    "redeemSecurePayflowQr",
    'mode, setMode] = useState("sell")',
    "BarcodeDetector",
    "humanConfirmed: true",
    "payflow_qr_buy",
    "payflow_qr_sell",
    "payflow_qr_pin_required",
    "payflow_qr_amount_required",
    "payflow_qr_sell_ready",
    "/^\\d{4}$/.test(sell.pin)",
    "/^\\d{4}$/.test(buy.pin)",
    "L'IA ne peut pas confirmer ce paiement"
  ];

  for (const part of requiredQrParts) {
    if (!qr.includes(part)) {
      failures.push(`Option QR Payflow incomplete: ${part}`);
    }
  }
}

if (!fs.existsSync(contactServicePath)) {
  failures.push("Le service de memorisation des contacts Payflow est absent.");
} else {
  const contactService = fs.readFileSync(contactServicePath, "utf8");
  for (const part of ["PAYFLOW_CONTACTS_KEY", "getPayflowContacts", "savePayflowContact", "localStorage"]) {
    if (!contactService.includes(part)) {
      failures.push(`Service contacts Payflow incomplet: ${part}`);
    }
  }
}

if (failures.length) {
  console.error("Validation Payflow echouee:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK: Payflow page 1 -> page 2 -> page 3 -> confirmation/historique + retour valides pour carte bancaire et operateur Payflow.");
