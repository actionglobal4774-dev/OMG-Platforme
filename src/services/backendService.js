import { callFirebaseFunction, isFirebaseConfigured } from "./firebaseClient.js";
import { isDemoMode, liveBackendError } from "./runtimePolicy.js";

const defaultFunctionByModule = {
  payflow: "processPayment",
  mailport: "publishMailportAddress",
  store: "processOrder",
  property: "processPropertyPayment",
  restaurant: "processReservation",
  school: "processSchoolPayment",
  city: "processMerchantRegistration",
  health: "processAppointment",
  university: "processUniEnrollment",
  tax: "processTaxReturn",
  administration: "manageAdministration"
};

const keywordFunctionRules = [
  { moduleId: "payflow", keywords: ["qr"], functionName: "createPayflowQrSession" },
  { moduleId: "payflow", keywords: ["depot", "retrait", "withdraw"], functionName: "processWithdrawal" },
  { moduleId: "payflow", keywords: ["frais", "fees"], functionName: "calculateFees" },
  { moduleId: "mailport", keywords: ["acheter", "purchase"], functionName: "purchaseMailportAddress" },
  { moduleId: "mailport", keywords: ["livreur", "driver"], functionName: "registerMailportDriver" },
  { moduleId: "mailport", keywords: ["colis", "tracking", "qr"], functionName: "createTracking" },
  { moduleId: "property", keywords: ["contrat", "contract"], functionName: "createPropertyContract" },
  { moduleId: "restaurant", keywords: ["commande", "order"], functionName: "processRestaurantOrder" },
  { moduleId: "restaurant", keywords: ["cuisine", "kitchen"], functionName: "updateKitchenStatus" },
  { moduleId: "school", keywords: ["inscription", "enrollment"], functionName: "processEnrollment" },
  { moduleId: "city", keywords: ["taxe", "tax"], functionName: "calculateTax" },
  { moduleId: "health", keywords: ["laboratoire", "lab"], functionName: "recordLabResult" },
  { moduleId: "health", keywords: ["signes", "vitals"], functionName: "recordVitalSigns" },
  { moduleId: "health", keywords: ["teleconsultation", "video"], functionName: "processTeleconsultation" },
  { moduleId: "university", keywords: ["test"], functionName: "gradeTest" },
  { moduleId: "university", keywords: ["certificat", "certificate"], functionName: "issueCertificate" },
  { moduleId: "tax", keywords: ["scan", "analyse", "document"], functionName: "analyzeTaxDocumentWithAI" },
  { moduleId: "tax", keywords: ["irs", "soumission", "efile"], functionName: "submitIRSReturn" },
  { moduleId: "administration", keywords: ["audit"], functionName: "createAuditLog" },
  { moduleId: "administration", keywords: ["rapport", "report"], functionName: "generateAdminReport" }
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getBackendFunctionName(moduleId, action = "") {
  const loweredAction = normalize(action);
  const rule = keywordFunctionRules.find((item) => (
    item.moduleId === moduleId && item.keywords.some((keyword) => loweredAction.includes(keyword))
  ));

  return rule?.functionName || defaultFunctionByModule[moduleId] || "sendModuleNotification";
}

export async function submitModuleAction({ moduleId, moduleName, action, profile, payload = {} }) {
  const functionName = getBackendFunctionName(moduleId, action);
  const requestPayload = {
    moduleId,
    moduleName,
    action,
    profile,
    payload,
    source: "frontend-509",
    requestedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured()) {
    try {
      const data = await callFirebaseFunction(functionName, requestPayload);
      return { ok: true, live: true, functionName, request: requestPayload, data };
    } catch (error) {
      if (!isDemoMode) throw liveBackendError(action || "Cette action");
      console.warn(`Firebase ${functionName} indisponible; utilisation locale.`, error?.code || error?.message);
    }
  }

  if (!isDemoMode) throw liveBackendError(action || "Cette action");

  return { ok: true, live: false, functionName, request: requestPayload, data: {
    reference: `OMG-MOCK-${Date.now()}`,
    message: "Action completed with local mock data."
  } };
}

export async function prepareModulePayment({ moduleId, action, amount, currency = "USD" }) {
  if (!isFirebaseConfigured()) throw liveBackendError("Le paiement");
  return callFirebaseFunction("prepareModulePayment", {
    moduleId,
    action,
    amount: Number(amount),
    currency
  });
}

export async function sendBackendNotification({ moduleId, title, body, data = {} }) {
  if (isFirebaseConfigured()) {
    try {
      const result = await callFirebaseFunction("sendBackendNotification", { moduleId, title, body, data });
      return { ok: true, mock: false, notification: result };
    } catch (error) {
      if (!isDemoMode) throw liveBackendError("La notification");
      console.warn("Notification Firebase indisponible; utilisation locale.", error?.code || error?.message);
    }
  }
  if (!isDemoMode) throw liveBackendError("La notification");
  return {
    ok: true,
    mock: true,
    notification: { moduleId, title, body, data, requestedAt: new Date().toISOString() }
  };
}

export async function askFred509({ message, moduleId = "platform", context = null }) {
  if (!isFirebaseConfigured()) return { ok: false, live: false };
  const result = await callFirebaseFunction("askFred509", { message, moduleId, context });
  return { ...result, live: true };
}

export async function registerPushToken(token, platform = "android") {
  return callFirebaseFunction("registerPushToken", { token, platform });
}

export async function createPayPalOrder({ amount, currency = "USD", moduleId, action, returnUrl, cancelUrl }) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase doit etre configure pour utiliser PayPal.");
  }
  return callFirebaseFunction("createPayPalOrderSecure", {
    amount: Number(String(amount).replace(",", ".")),
    currency,
    moduleId,
    action,
    returnUrl,
    cancelUrl
  });
}

export async function capturePayPalOrder(orderId) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase doit etre configure pour utiliser PayPal.");
  }
  return callFirebaseFunction("capturePayPalOrderSecure", { orderId });
}

export async function createMonCashPayment({ amount, moduleId, action }) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase doit etre configure pour utiliser MonCash.");
  }
  return callFirebaseFunction("createMonCashPaymentSecure", {
    amount: Number(String(amount).replace(",", ".")),
    moduleId,
    action
  });
}

export async function verifyMonCashPayment(orderId) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase doit etre configure pour utiliser MonCash.");
  }
  return callFirebaseFunction("verifyMonCashPaymentSecure", { orderId });
}

export async function createStripeCheckoutSession({ amount, currency = "USD", moduleId, action, successUrl, cancelUrl }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour utiliser Stripe.");
  return callFirebaseFunction("createStripeCheckoutSessionSecure", {
    amount: Number(String(amount).replace(",", ".")), currency, moduleId, action, successUrl, cancelUrl
  });
}

export async function verifyStripeCheckoutSession(sessionId) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour utiliser Stripe.");
  return callFirebaseFunction("verifyStripeCheckoutSessionSecure", { sessionId });
}

export async function createSecurePayflowQr({ amount, currency, humanConfirmed }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour utiliser le QR Payflow.");
  return callFirebaseFunction("createPayflowQrSessionSecure", {
    amount: Number(String(amount).replace(",", ".")),
    currency,
    humanConfirmed
  });
}

export async function inspectSecurePayflowQr(payload) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour verifier le QR Payflow.");
  return callFirebaseFunction("inspectPayflowQrSessionSecure", { payload });
}

export async function redeemSecurePayflowQr({ payload, humanConfirmed }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour payer avec le QR Payflow.");
  return callFirebaseFunction("redeemPayflowQrSessionSecure", { payload, humanConfirmed });
}

export async function publishSecureMailportAddress(address) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour publier une adresse Mailport.");
  return callFirebaseFunction("publishMailportAddressSecure", { ...address, humanConfirmed: true });
}

export async function searchSecureMailportAddresses(filters = {}) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour rechercher les adresses Mailport.");
  return callFirebaseFunction("searchMailportAddressesSecure", filters);
}

export async function prepareSecureMailportAddressPurchase({ addressId, paymentMethod }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour acheter une adresse Mailport.");
  return callFirebaseFunction("prepareMailportAddressPurchaseSecure", { addressId, paymentMethod });
}

export async function completeSecureMailportAddressPurchaseWithPayflow(purchaseId) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour payer l'adresse avec Payflow.");
  return callFirebaseFunction("completeMailportAddressPurchaseWithPayflowSecure", { purchaseId, humanConfirmed: true });
}

export async function completeSecureMailportAddressPurchaseExternal({ purchaseId, provider, providerPaymentId }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour confirmer l'achat Mailport.");
  return callFirebaseFunction("completeMailportAddressPurchaseExternalSecure", { purchaseId, provider, providerPaymentId });
}

export async function createSecureMailportPackage(data) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour creer un colis Mailport.");
  return callFirebaseFunction("createMailportPackageSecure", { ...data, humanConfirmed: true });
}

export async function inspectSecureMailportPackage(payload) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour verifier un colis Mailport.");
  return callFirebaseFunction("inspectMailportPackageSecure", { payload });
}

export async function advanceSecureMailportPackage({ payload, nextStatus, proofPhotoPath = "", receiverName = "" }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour mettre a jour un colis Mailport.");
  return callFirebaseFunction("advanceMailportPackageSecure", { payload, nextStatus, proofPhotoPath, receiverName, humanConfirmed: true });
}

export async function createSecureStoreOrder(data) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour creer une commande Store.");
  return callFirebaseFunction("createStoreOrderSecure", data);
}

export async function completeSecureStoreOrderWithPayflow(orderId) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour payer la commande avec Payflow.");
  return callFirebaseFunction("completeStoreOrderWithPayflowSecure", { orderId, humanConfirmed: true });
}

export async function completeSecureStoreOrderExternal({ orderId, provider, providerPaymentId }) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour confirmer la commande Store.");
  return callFirebaseFunction("completeStoreOrderExternalSecure", { orderId, provider, providerPaymentId });
}

export async function createTravelReservationRequest(data) {
  if (!isFirebaseConfigured()) return { ok: false, live: false };
  const result = await callFirebaseFunction("createTravelReservationRequest", data);
  return { ...result, live: true };
}

export async function requestTravelReservationCancellation(reservationId) {
  if (!isFirebaseConfigured()) return { ok: false, live: false };
  const result = await callFirebaseFunction("requestTravelReservationCancellation", { reservationId });
  return { ...result, live: true };
}

export async function createSecureModuleAccount(data) {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour creer le profil du module.");
  return callFirebaseFunction("createModuleAccount", data);
}
