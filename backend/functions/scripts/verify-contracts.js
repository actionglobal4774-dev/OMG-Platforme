const fs = require('node:fs');
const path = require('node:path');

const backendPath = path.join(process.cwd(), 'index.js');
const backendSource = fs.readFileSync(backendPath, 'utf8');

const requiredCallableFunctions = [
  'processPayment',
  'createPayflowQrSession',
  'processWithdrawal',
  'calculateFees',
  'publishMailportAddress',
  'purchaseMailportAddress',
  'registerMailportDriver',
  'createTracking',
  'processOrder',
  'processPropertyPayment',
  'createPropertyContract',
  'processReservation',
  'processRestaurantOrder',
  'updateKitchenStatus',
  'processSchoolPayment',
  'processEnrollment',
  'processMerchantRegistration',
  'calculateTax',
  'processAppointment',
  'recordLabResult',
  'recordVitalSigns',
  'processTeleconsultation',
  'processUniEnrollment',
  'gradeTest',
  'issueCertificate',
  'processTaxReturn',
  'analyzeTaxDocumentWithAI',
  'submitIRSReturn',
  'manageAdministration',
  'createAuditLog',
  'generateAdminReport',
  'sendBackendNotification',
  'askFred509',
  'registerPushToken',
  'listUserModuleCollection',
  'upsertUserModuleItem',
  'softDeleteUserModuleItem',
  'createPayflowMoneyRequest',
  'preparePayflowReceipt',
  'createTravelReservationRequest',
  'requestTravelReservationCancellation',
];

const missing = requiredCallableFunctions.filter((name) => (
  !backendSource.includes(`${name}:`) &&
  !backendSource.includes(`exports.${name}`)
));

if (missing.length) {
  console.error(`Contrats backend manquants: ${missing.join(', ')}`);
  process.exit(1);
}

if (!backendSource.includes('humanConfirmationRequired')) {
  console.error('La protection de confirmation humaine est absente.');
  process.exit(1);
}

if (!backendSource.includes('enforceAppCheck')) {
  console.error('La preparation Firebase App Check est absente.');
  process.exit(1);
}

for (const travelRequirement of [
  "'travel'",
  "collection('travelReservationRequests')",
  "status: 'awaiting_supplier_verification'",
  "paymentStatus: 'not_paid'",
  'serviceFeeUsd',
  'roomServiceFeeUsd',
  "'natcash'",
  'requestTravelReservationCancellation',
]) {
  if (!backendSource.includes(travelRequirement)) {
    console.error(`Backend Travel incomplet: ${travelRequirement}`);
    process.exit(1);
  }
}

console.log(`${requiredCallableFunctions.length} contrats frontend-backend verifies.`);
console.log('Confirmation humaine et App Check prepares.');

if (!backendSource.includes("defineSecret('OPENAI_API_KEY')") || !backendSource.includes("https://api.openai.com/v1/responses")) {
  console.error('Integration OpenAI securisee absente.');
  process.exit(1);
}

for (const qrSecurityPart of [
  'createPayflowQrSessionSecure',
  'inspectPayflowQrSessionSecure',
  'redeemPayflowQrSessionSecure',
  "collection('payflowQrSessions')",
  "collection('payflowQrReceipts')",
  "collection('payflowWallets')",
  "status: 'used'",
  'payflowQrTokenHash',
  'payflowQrValidityMs',
  'db.runTransaction',
]) {
  if (!backendSource.includes(qrSecurityPart)) {
    failures.push(`QR Payflow securise incomplet: ${qrSecurityPart}`);
  }
}

for (const mailportSecurityPart of [
  'publishMailportAddressSecure',
  'searchMailportAddressesSecure',
  'prepareMailportAddressPurchaseSecure',
  'completeMailportAddressPurchaseWithPayflowSecure',
  'completeMailportAddressPurchaseExternalSecure',
  'requireActiveMailportRole',
  "collection('mailportAddresses')",
  "collection('mailportAddressPurchases')",
  "status: 'pending_admin_review'",
  "status: 'pending_payment'",
  "qrStatus: 'not_issued_before_payment'",
  "qrStatus: 'issued'",
  "type: 'mailport_address_access'",
  "paypal: { collection: 'paypalOrders'",
  "stripe: { collection: 'stripePayments'",
  'createMailportPackageSecure',
  'inspectMailportPackageSecure',
  'advanceMailportPackageSecure',
  'mailportPackageTransitions',
  'mailportQrTokenHash',
  "collection('mailportPackages')",
  "collection('mailportPackageEvents')",
  "status: 'delivered_rewards_pending_payflow'",
  'qrConsumed = true',
]) {
  if (!backendSource.includes(mailportSecurityPart)) {
    failures.push(`Backend Mailport securise incomplet: ${mailportSecurityPart}`);
  }
}

if (!backendSource.includes('getMessaging') || !backendSource.includes('registerPushToken')) {
  console.error('Preparation Firebase Cloud Messaging absente.');
  process.exit(1);
}

console.log('OpenAI Responses API et Firebase Cloud Messaging prepares.');
