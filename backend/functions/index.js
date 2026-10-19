const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const functionsV1 = require('firebase-functions/v1');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const crypto = require('node:crypto');

initializeApp();

const db = getFirestore();
const paypalClientSecret = defineSecret('PAYPAL_CLIENT_SECRET');
const paypalClientId = defineSecret('PAYPAL_CLIENT_ID');
const moncashClientId = defineSecret('MONCASH_CLIENT_ID');
const moncashClientSecret = defineSecret('MONCASH_CLIENT_SECRET');
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const exchangeRateApiKey = defineSecret('EXCHANGE_RATE_API_KEY');
const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
const moncashMode = process.env.MONCASH_MODE || 'sandbox';
const founderUid = process.env.FOUNDER_UID || '';
const openaiModel = process.env.OPENAI_MODEL || 'gpt-5.6-terra';

const fredSystemPrompt = [
  'Vous etes Fred 509, assistant de OMG Platforme ProMax.',
  'Repondez dans la langue du message utilisateur, clairement et brievement.',
  'Vous pouvez expliquer, orienter et preparer une action, jamais executer ou confirmer un paiement, un retrait, une note, une permission administrative, une decision medicale ou fiscale.',
  'Ne demandez jamais de mot de passe, code PIN, cle API, numero complet de carte, document d identite complet ou autre secret.',
  'Pour University Integration, aidez a comprendre les notions et les erreurs sans fournir une reponse permettant de tricher a un examen.',
  'Dites explicitement quand une confirmation humaine ou un professionnel qualifie est requis.',
].join(' ');

const platformFees = {
  payflowMonthlyLocalUsd: 4.99,
  payflowCountryChangeUsd: 4.99,
  cityAdministrationPercent: 4.99,
  propertyOwnerPaymentPercent: 4.99,
  schoolPaymentPercent: 4.99,
  healthConsultationPercent: 10,
  therapyConsultationPercent: 10,
  storeProductMarkupUsd: 1.25,
  mailportAddressOwnerRewardUsd: 1.25,
  mailportCarrierRewardUsd: 1.25,
  storeDeliveryUsd: 4.5,
};

const userRoles = {
  standard_user: ['explore_modules', 'create_profile'],
  payflow_user: ['payflow_profile', 'request_money', 'receive_money'],
  payflow_local_user: ['payflow_local_profile', 'monthly_fee_required', 'local_agent_access'],
  payflow_international_user: ['card_required_for_sending', 'international_transfer_ready'],
  payflow_agent: ['cash_in_cash_out', 'local_service', 'cannot_modify_transactions'],
  store_owner: ['create_shop', 'add_products', 'create_packages'],
  property_owner: ['publish_properties', 'receive_owner_payments'],
  property_seeker: ['search_properties_after_30_day_access'],
  school_owner: ['manage_school', 'receive_school_payments', 'sell_books'],
  parent_guardian: ['pay_school', 'buy_books', 'access_student_info'],
  city_agent: ['register_merchants', 'view_red_green_status', 'cannot_delete_transactions'],
  health_patient: ['patient_record', 'appointments', 'prescriptions_private'],
  doctor: ['online_consultation', 'availability', 'credential_required'],
  psychologist: ['therapy_sessions', 'availability', 'credential_required'],
  pharmacy: ['prescriptions', 'license_required'],
  laboratory: ['lab_results', 'license_required'],
  hospitality_owner: ['hotel_restaurant_caterer', 'menus_rooms_tables', 'sales_control'],
  hospitality_employee: ['sales_only', 'cannot_add_menu', 'own_sales_visible'],
  mailport_address_owner: ['receive_packages', 'earn_per_package'],
  mailport_carrier: ['scan_package_qr', 'deliver_package', 'earn_per_delivery'],
  founder_super_admin: ['all_modules', 'approve_kyc', 'approve_agents', 'view_reports', 'cannot_delete_transactions'],
};

const kycLevels = {
  level0_explore: {
    label: 'Exploration',
    allowed: ['view_public_modules', 'read_about', 'start_registration'],
    blocked: ['payment', 'withdrawal', 'professional_service', 'agent_service'],
  },
  level1_basic: {
    label: 'Profil de base',
    requiredDocuments: ['name', 'phone', 'country', 'email'],
    allowed: ['profile', 'basic_requests'],
  },
  level2_identity: {
    label: 'Identite verifiee',
    requiredDocuments: ['government_id', 'selfie', 'country', 'phone'],
    allowed: ['payflow_receive', 'store_buy', 'property_access', 'school_payment'],
  },
  level3_professional: {
    label: 'Professionnel verifie',
    requiredDocuments: ['government_id', 'selfie', 'license_or_diploma', 'address_or_business_proof'],
    allowed: ['doctor', 'psychologist', 'pharmacy', 'laboratory', 'school_owner', 'city_agent'],
  },
  level4_financial_agent: {
    label: 'Agent financier local',
    requiredDocuments: ['government_id', 'selfie', 'business_or_community_reference', 'cash_capacity', 'admin_approval'],
    allowed: ['payflow_agent', 'cash_service'],
  },
};

const moduleWorkflowStatuses = {
  payflow: ['created', 'kyc_required', 'payment_prepared', 'verification_sent', 'completed', 'blocked_review'],
  mailport: ['package_created', 'qr_generated', 'carrier_scanned', 'address_owner_received', 'customer_notified', 'rewards_pending', 'completed'],
  store: ['product_created', 'price_markup_added', 'order_paid', 'package_created', 'delivery_selected', 'completed'],
  property: ['listing_created', 'search_access_paid', 'owner_payment_prepared', 'transfer_fee_applied_if_cross_country', 'completed'],
  restaurant: ['order_created', 'kitchen_or_service_started', 'delivered', 'checkout_ready', 'paid', 'delay_alert_if_late'],
  school: ['school_registered', 'parent_linked', 'student_private_record', 'payment_prepared', 'book_order_created', 'completed'],
  city: ['merchant_registered', 'payment_period_selected', 'red_late_or_green_paid', 'audit_locked', 'completed'],
  health: ['patient_record_created', 'professional_verified', 'availability_selected', 'payment_required', 'appointment_confirmed', 'medical_record_private'],
  travel: ['itinerary_prepared', 'supplier_verification_requested', 'supplier_confirmed', 'payment_prepared', 'ticket_or_voucher_issued', 'cancellation_requested'],
  admin: ['review_created', 'founder_or_admin_action', 'audit_written', 'notification_sent', 'completed'],
};

const notificationTemplates = {
  kyc_received: 'Vos documents KYC ont ete recus pour verification.',
  kyc_approved: 'Votre KYC est approuve.',
  payment_prepared: 'Votre paiement est prepare avec les frais affiches.',
  package_scanned: 'Votre colis a ete scanne.',
  package_delivered: 'Votre colis a ete livre a l adresse referentielle.',
  appointment_payment_required: 'Le paiement est requis pour confirmer le rendez-vous.',
  merchant_late: 'Paiement marchand en retard.',
  agent_approved: 'Votre statut Agent Payflow est approuve.',
  delay_alert: 'Alerte de retard prolonge detectee.',
};

const paymentRulesByModule = {
  payflow: ['payflow', 'paypal', 'moncash', 'card', 'bank', 'local_agent'],
  mailport: ['payflow', 'paypal', 'moncash', 'card', 'bank', 'local_agent', 'cash_ready'],
  store: ['payflow', 'paypal', 'moncash', 'card', 'bank', 'local_agent', 'cash_ready'],
  property: ['payflow', 'paypal', 'moncash', 'card', 'bank'],
  restaurant: ['payflow', 'paypal', 'moncash', 'card', 'bank', 'cash_ready'],
  school: ['payflow', 'paypal', 'moncash', 'card', 'bank', 'local_agent'],
  city: ['payflow', 'paypal', 'moncash', 'card', 'bank', 'cash_ready'],
  health: ['payflow', 'paypal', 'moncash', 'card', 'bank'],
  travel: ['payflow', 'paypal', 'moncash', 'natcash', 'card', 'bank'],
  admin: ['payflow', 'paypal', 'moncash', 'card', 'bank'],
};

const platformModules = [
  'payflow',
  'mailport',
  'store',
  'property',
  'restaurant',
  'school',
  'city',
  'health',
  'travel',
  'admin',
  'universite-integration',
  'taxpro-global',
];

const moduleAccountRoles = {
  payflow: ['local_operator_account', 'card_or_bank_account'],
  mailport: ['reference_address_owner', 'reference_address_buyer', 'carrier'],
  store: ['buyer', 'merchant'],
  property: ['property_owner', 'property_seeker'],
  restaurant: ['client', 'owner', 'employee'],
  school: ['parent_guardian', 'school_owner'],
  city: ['merchant', 'city_agent', 'city_supervisor'],
  health: ['patient', 'doctor', 'psychologist', 'pharmacy', 'laboratory'],
  travel: ['traveler', 'travel_partner', 'travel_administrator'],
  admin: ['founder_super_admin'],
  'universite-integration': ['applicant', 'payer_relative', 'education_admin'],
  'taxpro-global': ['tax_client', 'tax_preparer', 'tax_admin'],
};

const moduleRolesRequiringAdminReview = [
  'payflow:local_operator_account',
  'mailport:reference_address_owner',
  'mailport:carrier',
  'store:merchant',
  'school:school_owner',
  'city:city_agent',
  'city:city_supervisor',
  'health:doctor',
  'health:psychologist',
  'health:pharmacy',
  'health:laboratory',
  'admin:founder_super_admin',
  'universite-integration:education_admin',
  'taxpro-global:tax_preparer',
  'taxpro-global:tax_admin',
];

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Connexion requise.');
  }
  return request.auth.uid;
}

async function requireFounder(request) {
  const userId = requireAuth(request);
  if (userId === founderUid) {
    return userId;
  }

  const adminDoc = await db.collection('adminUsers').doc(userId).get();
  if (!adminDoc.exists || adminDoc.data().isFounder !== true) {
    throw new HttpsError('permission-denied', 'Acces reserve au proprietaire principal.');
  }

  return userId;
}

exports.assignRestrictedAdministrator = onCall(async (request) => {
  const founderUserId = await requireFounder(request);
  const email = cleanString(request.data.email, 254).toLowerCase();
  const role = cleanString(request.data.role, 60);
  const country = cleanString(request.data.country, 80);
  const reason = cleanString(request.data.reason, 500);
  const allowedRoles = ['Admin pays', 'Controle module', 'Lecture seule'];

  if (!email || !email.includes('@') || !allowedRoles.includes(role) || !reason) {
    throw new HttpsError('invalid-argument', 'Email, role limite et justification obligatoires.');
  }

  let targetUser;
  try {
    targetUser = await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Cet utilisateur doit creer son compte avant de recevoir un role administratif.');
    }
    throw error;
  }

  if (targetUser.uid === founderUserId) {
    throw new HttpsError('failed-precondition', 'Le compte fondateur conserve son role Super Admin unique.');
  }

  await db.collection('adminUsers').doc(targetUser.uid).set({
    email,
    role,
    country: country || null,
    reason,
    isFounder: false,
    canManageAdmins: false,
    canChangeSecurityRules: false,
    assignedBy: founderUserId,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('adminAudit').add({
    action: 'RESTRICTED_ADMIN_ASSIGNED',
    actorUserId: founderUserId,
    targetUserId: targetUser.uid,
    role,
    country: country || null,
    occurredAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, userId: targetUser.uid, role, isFounder: false, canManageAdmins: false };
});

const fxCacheMaxAgeMs = 26 * 60 * 60 * 1000;
const fxQuoteValidityMs = 10 * 60 * 1000;

function normalizeCurrencyCode(value) {
  const code = cleanString(value, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Code de devise invalide.');
  }
  return code;
}

async function getVerifiedUsdRates() {
  const cacheRef = db.collection('systemConfig').doc('fxRatesUsd');
  const cachedDoc = await cacheRef.get();
  const cached = cachedDoc.exists ? cachedDoc.data() : null;
  const cachedAgeMs = cached?.fetchedAtMs ? Date.now() - Number(cached.fetchedAtMs) : Number.POSITIVE_INFINITY;

  if (cached?.rates && cachedAgeMs <= fxCacheMaxAgeMs) {
    return { rates: cached.rates, fetchedAtMs: cached.fetchedAtMs, source: cached.source || 'ExchangeRate-API cache' };
  }

  const apiKey = exchangeRateApiKey.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Conversion temporairement indisponible: cle de taux de change non configuree.');
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/USD`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.result !== 'success' || !body.conversion_rates?.USD) {
      throw new Error('Reponse FX invalide');
    }
    const fetchedAtMs = Date.now();
    const safeRates = Object.fromEntries(
      Object.entries(body.conversion_rates)
        .filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(Number(rate)) && Number(rate) > 0)
        .map(([code, rate]) => [code, Number(rate)])
    );
    await cacheRef.set({
      baseCurrency: 'USD',
      rates: safeRates,
      source: 'ExchangeRate-API',
      fetchedAtMs,
      providerUpdatedAtMs: Number(body.time_last_update_unix || 0) * 1000 || null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { rates: safeRates, fetchedAtMs, source: 'ExchangeRate-API' };
  } catch (error) {
    logger.error('FX rate refresh failed', { message: error?.message || 'unknown' });
    throw new HttpsError('unavailable', 'Conversion temporairement indisponible: aucun taux recent et verifie.');
  }
}

async function convertCurrencyVerified(amount, fromCurrencyValue, toCurrencyValue) {
  const fromCurrency = normalizeCurrencyCode(fromCurrencyValue);
  const toCurrency = normalizeCurrencyCode(toCurrencyValue);
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new HttpsError('invalid-argument', 'Montant de conversion invalide.');
  }
  if (fromCurrency === toCurrency) return numericAmount;
  const verified = await getVerifiedUsdRates();
  const fromRate = Number(verified.rates[fromCurrency]);
  const toRate = Number(verified.rates[toCurrency]);
  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    throw new HttpsError('failed-precondition', 'Devise non prise en charge par le fournisseur de taux.');
  }
  return (numericAmount / fromRate) * toRate;
}

async function createNotification({ userId, type, title, body, moduleId = null, action = null }) {
  await db.collection('userNotifications').add({
    userId,
    type,
    title,
    body,
    moduleId,
    action,
    channels: ['in_app', 'email_ready', 'sms_ready'],
    status: 'created_by_backend',
    createdAt: FieldValue.serverTimestamp(),
  });
}

function buildTransactionAudit(data) {
  return {
    userId: data.userId,
    moduleId: data.moduleId || null,
    action: data.action || null,
    amount: Number(data.amount) || 0,
    currency: data.currency || 'USD',
    status: data.status || 'created',
    feePercent: data.feePercent || null,
    fixedFeeUsd: data.fixedFeeUsd || null,
    createdAt: FieldValue.serverTimestamp(),
    canDelete: false,
    immutableReason: 'audit_anti_fraud_anti_corruption',
  };
}

function assertKnownModule(moduleId) {
  if (!platformModules.includes(moduleId)) {
    throw new HttpsError('invalid-argument', 'Module invalide.');
  }
}

function assertKnownModuleRole(moduleId, role) {
  assertKnownModule(moduleId);
  if (!moduleAccountRoles[moduleId] || !moduleAccountRoles[moduleId].includes(role)) {
    throw new HttpsError('invalid-argument', 'Type utilisateur invalide pour ce module.');
  }
}

function cleanString(value, maxLength = 240) {
  return String(value || '').trim().slice(0, maxLength);
}

const persistedFrontendModules = [
  'payflow', 'mailport', 'store', 'property', 'restaurant', 'school',
  'city', 'health', 'travel', 'university', 'tax', 'administration',
];
const forbiddenPersistedKeys = /^(password|pin|secret|token|idtoken|refreshtoken|cvv|cvc|cardnumber|ssn|nationalid|apikey)$/i;

function normalizePersistenceSegment(value, label) {
  const segment = cleanString(value, 80);
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    throw new HttpsError('invalid-argument', `${label} invalide.`);
  }
  return segment;
}

function sanitizePersistedValue(value, depth = 0) {
  if (depth > 6) throw new HttpsError('invalid-argument', 'Donnees trop profondes.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new HttpsError('invalid-argument', 'Nombre invalide.');
    return value;
  }
  if (typeof value === 'string') return value.slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizePersistedValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 80).map(([key, item]) => {
      const safeKey = normalizePersistenceSegment(key, 'Champ');
      if (forbiddenPersistedKeys.test(safeKey)) {
        throw new HttpsError('invalid-argument', `Le champ sensible ${safeKey} ne peut pas etre persiste.`);
      }
      return [safeKey, sanitizePersistedValue(item, depth + 1)];
    }));
  }
  throw new HttpsError('invalid-argument', 'Type de donnee non pris en charge.');
}

function getUserModuleCollection(userId, moduleValue, collectionValue) {
  const moduleId = normalizePersistenceSegment(moduleValue, 'Module');
  if (!persistedFrontendModules.includes(moduleId)) throw new HttpsError('invalid-argument', 'Module non persistant.');
  const collectionName = normalizePersistenceSegment(collectionValue, 'Collection');
  return {
    moduleId,
    collectionName,
    ref: db.collection('users').doc(userId)
      .collection('moduleData').doc(moduleId)
      .collection('collections').doc(collectionName)
      .collection('items'),
  };
}

exports.listUserModuleCollection = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 20, invoker: 'public',
}, async (request) => {
  const userId = requireAuth(request);
  const target = getUserModuleCollection(userId, request.data?.moduleId, request.data?.collectionName);
  const snapshot = await target.ref.orderBy('updatedAtMs', 'desc').limit(200).get();
  return { items: snapshot.docs.map((doc) => {
    const { ownerUserId, moduleId, collectionName, updatedAt, ...data } = doc.data();
    return { id: doc.id, ...data };
  }) };
});

exports.upsertUserModuleItem = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 20, invoker: 'public',
}, async (request) => {
  const userId = requireAuth(request);
  const target = getUserModuleCollection(userId, request.data?.moduleId, request.data?.collectionName);
  const data = sanitizePersistedValue(request.data?.item || {});
  const encodedSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (encodedSize > 32 * 1024) throw new HttpsError('invalid-argument', 'Element trop volumineux.');
  const itemId = request.data?.itemId
    ? normalizePersistenceSegment(request.data.itemId, 'Identifiant')
    : target.ref.doc().id;
  const updatedAtMs = Date.now();
  await target.ref.doc(itemId).set({ ...data, ownerUserId: userId, moduleId: target.moduleId,
    collectionName: target.collectionName, deleted: false, updatedAtMs, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection('moduleDataAudit').add({ userId, moduleId: target.moduleId,
    collectionName: target.collectionName, itemId, action: 'upsert', occurredAt: FieldValue.serverTimestamp() });
  return { ok: true, id: itemId, updatedAtMs };
});

exports.softDeleteUserModuleItem = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 20, invoker: 'public',
}, async (request) => {
  const userId = requireAuth(request);
  const target = getUserModuleCollection(userId, request.data?.moduleId, request.data?.collectionName);
  const itemId = normalizePersistenceSegment(request.data?.itemId, 'Identifiant');
  await target.ref.doc(itemId).set({ ownerUserId: userId, moduleId: target.moduleId,
    collectionName: target.collectionName, deleted: true, deletedAt: FieldValue.serverTimestamp(), updatedAtMs: Date.now() }, { merge: true });
  await db.collection('moduleDataAudit').add({ userId, moduleId: target.moduleId,
    collectionName: target.collectionName, itemId, action: 'soft_delete', occurredAt: FieldValue.serverTimestamp() });
  return { ok: true, id: itemId };
});

function normalizeTravelRequest(data) {
  const trip = data?.trip || {};
  const destination = cleanString(trip.destination, 120);
  const origin = cleanString(trip.origin, 120);
  const departure = cleanString(trip.departure, 20);
  const days = Number(trip.days);
  const travelers = Number(trip.travelers || 1);
  const rooms = Number(trip.rooms || 1);
  if (!destination || !origin || !/^\d{4}-\d{2}-\d{2}$/.test(departure) || !Number.isInteger(days) || days < 1 || days > 365 || !Number.isInteger(travelers) || travelers < 1 || travelers > 12 || !Number.isInteger(rooms) || rooms < 1 || rooms > 8) {
    throw new HttpsError('invalid-argument', 'Les informations de voyage sont incomplètes ou invalides.');
  }
  if (data?.humanConfirmed !== true) {
    throw new HttpsError('failed-precondition', 'La confirmation explicite du voyageur est obligatoire.');
  }
  const selectedFlight = sanitizePersistedValue(data?.selectedFlight || null);
  const selectedHotel = sanitizePersistedValue(data?.selectedHotel || null);
  const selectedInsurance = sanitizePersistedValue(data?.selectedInsurance || null);
  if (!selectedFlight?.id && !selectedHotel?.id) {
    throw new HttpsError('invalid-argument', 'Sélectionnez au moins un vol ou un hôtel.');
  }
  return {
    trip: { destination, origin, departure, days, travelers, rooms, budget: cleanString(trip.budget, 40) || null },
    selectedFlight,
    selectedHotel,
    selectedInsurance,
    ticketServiceFeeUsd: selectedFlight?.id ? Number((4.99 * travelers).toFixed(2)) : 0,
    roomServiceFeeUsd: selectedHotel?.id ? Number((4.99 * rooms).toFixed(2)) : 0,
  };
}

exports.createTravelReservationRequest = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 20,
}, async (request) => {
  const userId = requireAuth(request);
  const travel = normalizeTravelRequest(request.data);
  const requestedPaymentMethod = cleanString(request.data?.paymentMethod, 30).toLowerCase();
  if (!['payflow', 'moncash', 'natcash', 'carte bancaire'].includes(requestedPaymentMethod)) {
    throw new HttpsError('invalid-argument', 'Moyen de paiement Travel invalide.');
  }
  const reservationRef = db.collection('travelReservationRequests').doc();
  await reservationRef.set({
    userId,
    ...travel,
    serviceFeeUsd: Number((travel.ticketServiceFeeUsd + travel.roomServiceFeeUsd).toFixed(2)),
    requestedPaymentMethod,
    status: 'awaiting_supplier_verification',
    paymentStatus: 'not_paid',
    supplierPriceStatus: 'not_verified',
    providerMessage: 'Prix et disponibilité à vérifier par un fournisseur autorisé avant tout paiement.',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    canDelete: false,
  });
  await db.collection('moduleSecurityAudit').add({
    userId, moduleId: 'travel', eventType: 'reservation_verification_requested', reservationId: reservationRef.id,
    immutable: true, createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, id: reservationRef.id, status: 'awaiting_supplier_verification', paymentStatus: 'not_paid', serviceFeeUsd: Number((travel.ticketServiceFeeUsd + travel.roomServiceFeeUsd).toFixed(2)) };
});

exports.requestTravelReservationCancellation = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 20,
}, async (request) => {
  const userId = requireAuth(request);
  const reservationId = normalizePersistenceSegment(request.data?.reservationId, 'Réservation');
  const reservationRef = db.collection('travelReservationRequests').doc(reservationId);
  const snapshot = await reservationRef.get();
  if (!snapshot.exists || snapshot.data().userId !== userId) throw new HttpsError('not-found', 'Réservation introuvable.');
  if (!['awaiting_supplier_verification', 'supplier_confirmed'].includes(snapshot.data().status)) {
    throw new HttpsError('failed-precondition', 'Cette réservation ne peut plus être annulée par ce parcours.');
  }
  await reservationRef.update({ status: 'cancellation_requested', cancellationRequestedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await db.collection('moduleSecurityAudit').add({ userId, moduleId: 'travel', eventType: 'cancellation_requested', reservationId, immutable: true, createdAt: FieldValue.serverTimestamp() });
  return { ok: true, id: reservationId, status: 'cancellation_requested' };
});

async function requireActiveMailportRole(userId, allowedRoles) {
  for (const role of allowedRoles) {
    const accountId = `${userId}_mailport_${role}`.replace(/[^A-Za-z0-9_-]/g, '_');
    const account = await db.collection('moduleAccounts').doc(accountId).get();
    if (account.exists && account.data().status === 'active') return account.data();
  }
  throw new HttpsError('permission-denied', 'Un profil Mailport actif et approuve est obligatoire.');
}

function normalizeMailportAddress(data) {
  const address = {
    country: cleanString(data.country, 80),
    city: cleanString(data.city, 120),
    zone: cleanString(data.zone, 160),
    street: cleanString(data.street, 240),
    postalCode: cleanString(data.postalCode, 40),
    addressType: cleanString(data.addressType || 'reference_address', 60),
    description: cleanString(data.description, 500),
    placeId: cleanString(data.placeId, 240),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    addressPhotoPath: cleanString(data.addressPhotoPath, 500),
    ownerPhotoPath: cleanString(data.ownerPhotoPath, 500),
  };
  if (!address.country || !address.city || !address.street || !address.addressPhotoPath) {
    throw new HttpsError('invalid-argument', 'Pays, ville, rue et photo stockee sont obligatoires.');
  }
  if (!Number.isFinite(address.latitude) || !Number.isFinite(address.longitude)) {
    throw new HttpsError('invalid-argument', 'Coordonnees Google Maps valides obligatoires.');
  }
  return address;
}

exports.publishMailportAddressSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 20,
}, async (request) => {
  const ownerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  await requireActiveMailportRole(ownerUserId, ['reference_address_owner']);
  if (request.data.humanConfirmed !== true) {
    throw new HttpsError('failed-precondition', 'La confirmation du proprietaire est obligatoire.');
  }
  const address = normalizeMailportAddress(request.data);
  const addressRef = db.collection('mailportAddresses').doc();
  await addressRef.set({
    ...address,
    ownerUserId,
    status: 'pending_admin_review',
    publicListing: false,
    packageRewardUsd: platformFees.mailportAddressOwnerRewardUsd,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    canDelete: false,
  });
  await db.collection('moduleSecurityAudit').add({
    userId: ownerUserId,
    moduleId: 'mailport',
    eventType: 'reference_address_submitted',
    addressId: addressRef.id,
    status: 'pending_admin_review',
    immutable: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, addressId: addressRef.id, status: 'pending_admin_review' };
});

exports.searchMailportAddressesSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 15,
}, async (request) => {
  requireAuth(request);
  validateFrontendPayload(request.data || {});
  const snapshot = await db.collection('mailportAddresses')
    .where('status', '==', 'active')
    .where('publicListing', '==', true)
    .limit(100)
    .get();
  const filters = {
    country: cleanString(request.data?.country, 80).toLowerCase(),
    city: cleanString(request.data?.city, 120).toLowerCase(),
    zone: cleanString(request.data?.zone, 160).toLowerCase(),
    postalCode: cleanString(request.data?.postalCode, 40).toLowerCase(),
  };
  return {
    ok: true,
    addresses: snapshot.docs.map((document) => {
      const item = document.data();
      return {
        id: document.id,
        country: item.country,
        city: item.city,
        zone: item.zone,
        street: item.street,
        postalCode: item.postalCode,
        addressType: item.addressType,
        description: item.description,
        latitude: item.latitude,
        longitude: item.longitude,
      };
    }).filter((item) => Object.entries(filters).every(([key, value]) => !value || String(item[key] || '').toLowerCase().includes(value))),
  };
});

exports.prepareMailportAddressPurchaseSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 20,
}, async (request) => {
  const buyerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  await requireActiveMailportRole(buyerUserId, ['reference_address_buyer']);
  const addressId = cleanString(request.data.addressId, 160);
  const paymentMethod = cleanString(request.data.paymentMethod, 40).toLowerCase();
  if (!['payflow', 'paypal', 'stripe', 'moncash', 'natcash'].includes(paymentMethod)) {
    throw new HttpsError('invalid-argument', 'Moyen de paiement Mailport invalide.');
  }
  const addressSnapshot = await db.collection('mailportAddresses').doc(addressId).get();
  if (!addressSnapshot.exists || addressSnapshot.data().status !== 'active' || addressSnapshot.data().publicListing !== true) {
    throw new HttpsError('not-found', 'Adresse Mailport active introuvable.');
  }
  if (addressSnapshot.data().ownerUserId === buyerUserId) {
    throw new HttpsError('failed-precondition', 'Vous ne pouvez pas acheter votre propre adresse.');
  }
  const purchaseRef = db.collection('mailportAddressPurchases').doc();
  await purchaseRef.set({
    buyerUserId,
    ownerUserId: addressSnapshot.data().ownerUserId,
    addressId,
    amountMinor: 499,
    currency: 'USD',
    paymentMethod,
    status: 'pending_payment',
    qrStatus: 'not_issued_before_payment',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    canDelete: false,
  });
  return { ok: true, purchaseId: purchaseRef.id, amount: 4.99, currency: 'USD', status: 'pending_payment', paymentMethod };
});

exports.completeMailportAddressPurchaseWithPayflowSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 25,
}, async (request) => {
  const buyerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  if (request.data.humanConfirmed !== true) {
    throw new HttpsError('failed-precondition', 'La confirmation personnelle du paiement est obligatoire.');
  }
  const purchaseId = cleanString(request.data.purchaseId, 160);
  const purchaseRef = db.collection('mailportAddressPurchases').doc(purchaseId);
  const walletId = `${buyerUserId}_USD`.replace(/[^A-Za-z0-9_-]/g, '_');
  const walletRef = db.collection('payflowWallets').doc(walletId);
  const revenueRef = db.collection('platformRevenue').doc();
  const token = crypto.randomBytes(32).toString('base64url');

  const result = await db.runTransaction(async (transaction) => {
    const [purchaseSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(purchaseRef),
      transaction.get(walletRef),
    ]);
    if (!purchaseSnapshot.exists || purchaseSnapshot.data().buyerUserId !== buyerUserId) {
      throw new HttpsError('not-found', 'Achat Mailport introuvable.');
    }
    const purchase = purchaseSnapshot.data();
    if (purchase.status === 'paid') throw new HttpsError('already-exists', 'Cet achat Mailport est deja paye.');
    if (purchase.status !== 'pending_payment' || purchase.paymentMethod !== 'payflow') {
      throw new HttpsError('failed-precondition', 'Cet achat ne peut pas etre paye avec Payflow.');
    }
    if (!walletSnapshot.exists || walletSnapshot.data().status !== 'active') {
      throw new HttpsError('failed-precondition', 'Portefeuille Payflow USD actif introuvable.');
    }
    const balanceMinor = Number(walletSnapshot.data().balanceMinor || 0);
    if (balanceMinor < purchase.amountMinor) throw new HttpsError('failed-precondition', 'Solde Payflow insuffisant.');

    transaction.update(walletRef, {
      balanceMinor: balanceMinor - purchase.amountMinor,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(purchaseRef, {
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      paymentReference: revenueRef.id,
      qrStatus: 'issued',
      qrTokenHash: mailportQrTokenHash(token),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(revenueRef, {
      userId: buyerUserId,
      moduleId: 'mailport',
      purchaseId,
      amountMinor: purchase.amountMinor,
      currency: purchase.currency,
      type: 'mailport_address_access',
      status: 'completed',
      canDelete: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection('transactionAudit').doc(revenueRef.id), {
      ...buildTransactionAudit({
        userId: buyerUserId,
        moduleId: 'mailport',
        action: 'address_purchase_payflow',
        amount: purchase.amountMinor / 100,
        currency: purchase.currency,
        status: 'completed',
      }),
      purchaseId,
      paymentReference: revenueRef.id,
    });
    return { addressId: purchase.addressId, amount: purchase.amountMinor / 100, currency: purchase.currency };
  });

  return {
    ok: true,
    purchaseId,
    status: 'paid',
    ...result,
    addressQrPayload: JSON.stringify({ system: 'OMG-MAILPORT-ADDRESS', version: 1, purchaseId, addressId: result.addressId, token }),
  };
});

exports.completeMailportAddressPurchaseExternalSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 25,
}, async (request) => {
  const buyerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  const purchaseId = cleanString(request.data.purchaseId, 160);
  const provider = cleanString(request.data.provider, 20).toLowerCase();
  const providerPaymentId = cleanString(request.data.providerPaymentId, 200);
  const providerConfig = {
    paypal: { collection: 'paypalOrders', completed: ['COMPLETED'] },
    stripe: { collection: 'stripePayments', completed: ['completed'] },
  }[provider];
  if (!providerConfig || !purchaseId || !providerPaymentId) {
    throw new HttpsError('invalid-argument', 'Reference de paiement externe Mailport invalide.');
  }
  const purchaseRef = db.collection('mailportAddressPurchases').doc(purchaseId);
  const paymentRef = db.collection(providerConfig.collection).doc(providerPaymentId);
  const revenueRef = db.collection('platformRevenue').doc();
  const token = crypto.randomBytes(32).toString('base64url');

  const result = await db.runTransaction(async (transaction) => {
    const [purchaseSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(purchaseRef),
      transaction.get(paymentRef),
    ]);
    if (!purchaseSnapshot.exists || purchaseSnapshot.data().buyerUserId !== buyerUserId) throw new HttpsError('not-found', 'Achat Mailport introuvable.');
    if (!paymentSnapshot.exists || paymentSnapshot.data().userId !== buyerUserId) throw new HttpsError('permission-denied', 'Paiement externe non autorise.');
    const purchase = purchaseSnapshot.data();
    const payment = paymentSnapshot.data();
    if (purchase.status === 'paid') throw new HttpsError('already-exists', 'Cet achat Mailport est deja paye.');
    if (purchase.status !== 'pending_payment' || purchase.paymentMethod !== provider) throw new HttpsError('failed-precondition', 'Fournisseur de paiement incorrect pour cet achat.');
    if (!providerConfig.completed.includes(payment.status)) throw new HttpsError('failed-precondition', 'Le fournisseur n a pas confirme ce paiement.');
    if (payment.moduleId !== 'mailport' || payment.action !== `mailport_address_purchase:${purchaseId}`) {
      throw new HttpsError('permission-denied', 'Le paiement ne correspond pas a cet achat Mailport.');
    }
    if (payment.currency !== 'USD' || Math.round(Number(payment.amount) * 100) !== purchase.amountMinor) {
      throw new HttpsError('failed-precondition', 'Le montant confirme ne correspond pas au prix Mailport.');
    }
    transaction.update(purchaseRef, {
      status: 'paid', paidAt: FieldValue.serverTimestamp(), paymentReference: providerPaymentId,
      paymentProvider: provider, qrStatus: 'issued', qrTokenHash: mailportQrTokenHash(token), updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(revenueRef, {
      userId: buyerUserId, moduleId: 'mailport', purchaseId, amountMinor: purchase.amountMinor,
      currency: purchase.currency, type: 'mailport_address_access', provider,
      providerPaymentId, status: 'completed', canDelete: false, createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection('transactionAudit').doc(revenueRef.id), {
      ...buildTransactionAudit({ userId: buyerUserId, moduleId: 'mailport', action: `address_purchase_${provider}`, amount: purchase.amountMinor / 100, currency: purchase.currency, status: 'completed' }),
      purchaseId, providerPaymentId,
    });
    return { addressId: purchase.addressId, amount: purchase.amountMinor / 100, currency: purchase.currency };
  });
  return {
    ok: true, purchaseId, status: 'paid', provider, ...result,
    addressQrPayload: JSON.stringify({ system: 'OMG-MAILPORT-ADDRESS', version: 1, purchaseId, addressId: result.addressId, token }),
  };
});

const mailportPackageQrValidityMs = 72 * 60 * 60 * 1000;
const mailportPackageTransitions = {
  created: 'carrier_scanned',
  carrier_scanned: 'in_transit',
  in_transit: 'delivered',
};

function parseMailportPackageQr(value) {
  let payload = value;
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value);
    } catch {
      throw new HttpsError('invalid-argument', 'QR colis Mailport illisible.');
    }
  }
  if (!payload || payload.system !== 'OMG-MAILPORT' || payload.version !== 1) {
    throw new HttpsError('invalid-argument', 'QR colis Mailport non reconnu.');
  }
  const packageId = cleanString(payload.packageId, 160);
  const token = cleanString(payload.token, 256);
  if (!packageId || token.length < 32) throw new HttpsError('invalid-argument', 'QR colis Mailport incomplet.');
  return { packageId, token };
}

function mailportQrTokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

exports.createMailportPackageSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 20,
}, async (request) => {
  const customerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  await requireActiveMailportRole(customerUserId, ['reference_address_buyer']);
  if (request.data.humanConfirmed !== true) throw new HttpsError('failed-precondition', 'Confirmation client obligatoire.');
  const purchaseId = cleanString(request.data.purchaseId, 160);
  const merchantReference = cleanString(request.data.merchantReference, 160);
  const fromLocation = cleanString(request.data.fromLocation, 240);
  const toLocation = cleanString(request.data.toLocation, 240);
  if (!purchaseId || !fromLocation || !toLocation) {
    throw new HttpsError('invalid-argument', 'Achat adresse, depart et arrivee sont obligatoires.');
  }
  const purchaseSnapshot = await db.collection('mailportAddressPurchases').doc(purchaseId).get();
  if (!purchaseSnapshot.exists || purchaseSnapshot.data().buyerUserId !== customerUserId || purchaseSnapshot.data().status !== 'paid') {
    throw new HttpsError('failed-precondition', 'Un achat Mailport paye est obligatoire avant de creer le colis.');
  }
  const addressSnapshot = await db.collection('mailportAddresses').doc(purchaseSnapshot.data().addressId).get();
  if (!addressSnapshot.exists || addressSnapshot.data().status !== 'active') {
    throw new HttpsError('failed-precondition', 'Adresse de destination Mailport inactive.');
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const packageRef = db.collection('mailportPackages').doc();
  const expiresAt = new Date(Date.now() + mailportPackageQrValidityMs);
  await packageRef.set({
    customerUserId,
    addressId: purchaseSnapshot.data().addressId,
    addressOwnerUserId: addressSnapshot.data().ownerUserId,
    merchantReference: merchantReference || null,
    fromLocation,
    toLocation,
    status: 'created',
    carrierUserId: null,
    qrTokenHash: mailportQrTokenHash(token),
    qrExpiresAt: expiresAt,
    qrConsumed: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    canDelete: false,
  });
  await db.collection('mailportPackageEvents').add({
    packageId: packageRef.id,
    actorUserId: customerUserId,
    status: 'created',
    immutable: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return {
    ok: true,
    packageId: packageRef.id,
    status: 'created',
    expiresAt: expiresAt.toISOString(),
    qrPayload: JSON.stringify({ system: 'OMG-MAILPORT', version: 1, packageId: packageRef.id, token }),
  };
});

exports.inspectMailportPackageSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 15,
}, async (request) => {
  const userId = requireAuth(request);
  validateFrontendPayload(request.data);
  const parsed = parseMailportPackageQr(request.data.payload);
  const snapshot = await db.collection('mailportPackages').doc(parsed.packageId).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Colis Mailport introuvable.');
  const item = snapshot.data();
  if (item.qrTokenHash !== mailportQrTokenHash(parsed.token)) throw new HttpsError('permission-denied', 'Signature QR colis invalide.');
  if (item.qrConsumed || item.status === 'delivered') throw new HttpsError('already-exists', 'Ce QR colis est deja termine.');
  if (!item.qrExpiresAt || item.qrExpiresAt.toMillis() <= Date.now()) throw new HttpsError('deadline-exceeded', 'Ce QR colis a expire.');
  const participant = [item.customerUserId, item.addressOwnerUserId, item.carrierUserId].includes(userId);
  if (!participant) await requireActiveMailportRole(userId, ['carrier']);
  return {
    ok: true,
    packageId: snapshot.id,
    status: item.status,
    fromLocation: item.fromLocation,
    toLocation: item.toLocation,
    expiresAt: item.qrExpiresAt.toDate().toISOString(),
    assigned: Boolean(item.carrierUserId),
  };
});

exports.advanceMailportPackageSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 25,
}, async (request) => {
  const carrierUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  await requireActiveMailportRole(carrierUserId, ['carrier']);
  if (request.data.humanConfirmed !== true) throw new HttpsError('failed-precondition', 'Confirmation personnelle du livreur obligatoire.');
  const parsed = parseMailportPackageQr(request.data.payload);
  const requestedStatus = cleanString(request.data.nextStatus, 40);
  const proofPhotoPath = cleanString(request.data.proofPhotoPath, 500);
  const receiverName = cleanString(request.data.receiverName, 160);
  const packageRef = db.collection('mailportPackages').doc(parsed.packageId);
  const deliveryRef = db.collection('mailportDeliveries').doc();

  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(packageRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Colis Mailport introuvable.');
    const item = snapshot.data();
    if (item.qrTokenHash !== mailportQrTokenHash(parsed.token)) throw new HttpsError('permission-denied', 'Signature QR colis invalide.');
    if (item.qrConsumed || item.status === 'delivered') throw new HttpsError('already-exists', 'Ce QR colis est deja termine.');
    if (!item.qrExpiresAt || item.qrExpiresAt.toMillis() <= Date.now()) throw new HttpsError('deadline-exceeded', 'Ce QR colis a expire.');
    const expectedStatus = mailportPackageTransitions[item.status];
    if (!expectedStatus || requestedStatus !== expectedStatus) {
      throw new HttpsError('failed-precondition', `Etape invalide. Prochaine etape autorisee: ${expectedStatus || 'aucune'}.`);
    }
    if (item.carrierUserId && item.carrierUserId !== carrierUserId) throw new HttpsError('permission-denied', 'Ce colis est attribue a un autre livreur.');
    if (requestedStatus === 'delivered' && (!proofPhotoPath || !receiverName)) {
      throw new HttpsError('invalid-argument', 'Photo de preuve et nom du receptionnaire obligatoires.');
    }
    const update = {
      status: requestedStatus,
      carrierUserId,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (requestedStatus === 'delivered') {
      update.qrConsumed = true;
      update.deliveredAt = FieldValue.serverTimestamp();
      update.proofPhotoPath = proofPhotoPath;
      update.receiverName = receiverName;
      transaction.set(deliveryRef, {
        packageId: packageRef.id,
        confirmedBy: carrierUserId,
        carrierUserId,
        addressOwnerUserId: item.addressOwnerUserId,
        customerUserId: item.customerUserId,
        proofPhotoPath,
        receiverName,
        carrierRewardUsd: platformFees.mailportCarrierRewardUsd,
        addressOwnerRewardUsd: platformFees.mailportAddressOwnerRewardUsd,
        status: 'delivered_rewards_pending_payflow',
        createdAt: FieldValue.serverTimestamp(),
      });
      for (const reward of [
        { userId: carrierUserId, role: 'carrier', amount: platformFees.mailportCarrierRewardUsd },
        { userId: item.addressOwnerUserId, role: 'reference_address_owner', amount: platformFees.mailportAddressOwnerRewardUsd },
      ]) {
        transaction.set(db.collection('payflowRewardLedger').doc(), {
          deliveryId: deliveryRef.id,
          packageId: packageRef.id,
          ...reward,
          currency: 'USD',
          status: 'pending_payflow_credit',
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
    transaction.update(packageRef, update);
    transaction.set(db.collection('mailportPackageEvents').doc(), {
      packageId: packageRef.id,
      actorUserId: carrierUserId,
      status: requestedStatus,
      immutable: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { status: requestedStatus, deliveryId: requestedStatus === 'delivered' ? deliveryRef.id : null };
  });
  return { ok: true, packageId: packageRef.id, ...result };
});

exports.calculatePayflowQuote = onCall({ secrets: [exchangeRateApiKey] }, async (request) => {
  const userId = requireAuth(request);
  const amount = Number(request.data.amount) || 0;
  const fromCurrency = normalizeCurrencyCode(request.data.fromCurrency || 'USD');
  const toCurrency = normalizeCurrencyCode(request.data.toCurrency || 'USD');
  const action = request.data.action || 'transfer';

  if (amount <= 0) {
    throw new HttpsError('invalid-argument', 'Montant invalide.');
  }

  let convertedAmount = amount;
  let estimatedExchangeRate = 1;
  let rateSource = 'same_currency';
  let rateFetchedAtMs = Date.now();
  if (fromCurrency !== toCurrency) {
    const verified = await getVerifiedUsdRates();
    const fromRate = Number(verified.rates[fromCurrency]);
    const toRate = Number(verified.rates[toCurrency]);
    if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
      throw new HttpsError('failed-precondition', 'Devise non prise en charge par le fournisseur de taux.');
    }
    convertedAmount = (amount / fromRate) * toRate;
    estimatedExchangeRate = convertedAmount / amount;
    rateSource = verified.source;
    rateFetchedAtMs = verified.fetchedAtMs;
  }
  const payflowFee = amount * 0.0499;
  const safetyMargin = amount * 0.015;
  const totalToPay = amount + payflowFee + safetyMargin;
  const expiresAt = new Date(Date.now() + fxQuoteValidityMs);

  const quote = {
    userId,
    action,
    amount,
    fromCurrency,
    toCurrency,
    convertedAmount,
    estimatedExchangeRate,
    payflowFee,
    safetyMargin,
    totalToPay,
    provider: 'payflow_verified_fx_quote',
    rateSource,
    rateFetchedAt: new Date(rateFetchedAtMs),
    expiresAt,
    status: 'active',
    note: 'Taux indicatif verrouille pour ce devis. Le fournisseur de paiement execute le reglement final.',
    createdAt: FieldValue.serverTimestamp(),
  };

  const quoteRef = await db.collection('payflowQuotes').add(quote);

  return {
    quoteId: quoteRef.id,
    convertedAmount,
    payflowFee,
    safetyMargin,
    totalToPay,
    estimatedExchangeRate,
    rateSource,
    rateFetchedAt: new Date(rateFetchedAtMs).toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
});

exports.getPlatformBackendConfig = onCall(async (request) => {
  requireAuth(request);

  return {
    platformFees,
    userRoles,
    kycLevels,
    moduleWorkflowStatuses,
    notificationTemplates,
    paymentRulesByModule,
    founderHierarchy: {
      firstLevel: 'founder_super_admin',
      founderConfigured: Boolean(founderUid),
      rule: 'La hierarchie commence par le proprietaire unique du platforme.',
    },
    guardrails: [
      'Payflow est le centre financier, les autres modules utilisent Payflow ou moyens de paiement connectes.',
      'Les transactions sensibles ne sont pas effacables.',
      'Fred IA oriente les utilisateurs mais ne valide pas KYC et ne touche pas aux transactions bancaires.',
      'Les documents sensibles restent limites a l utilisateur concerne et a l administration autorisee.',
      'Chaque module garde ses conditions d utilisation propres.',
    ],
  };
});

exports.createModuleAccount = onCall(async (request) => {
  const userId = requireAuth(request);
  const moduleId = cleanString(request.data.moduleId, 80);
  const role = cleanString(request.data.role, 80);
  const country = cleanString(request.data.country, 80);
  const language = cleanString(request.data.language || 'Francais', 80);
  const displayName = cleanString(request.data.displayName, 160);
  const email = cleanString(request.data.email, 160);
  const phone = cleanString(request.data.phone, 80);
  const passwordConfigured = request.data.passwordConfigured === true;

  assertKnownModuleRole(moduleId, role);

  if (!country || !language || !passwordConfigured) {
    throw new HttpsError('invalid-argument', 'Pays, langue et mot de passe du module sont obligatoires.');
  }

  const roleKey = `${moduleId}:${role}`;
  const status = moduleRolesRequiringAdminReview.includes(roleKey) ? 'pending_admin_review' : 'active';
  const accountId = `${userId}_${moduleId}_${role}`.replace(/[^A-Za-z0-9_-]/g, '_');

  await db.collection('moduleAccounts').doc(accountId).set({
    id: accountId,
    userId,
    moduleId,
    role,
    country,
    language,
    displayName: displayName || null,
    email: email || null,
    phone: phone || null,
    passwordConfigured: true,
    passwordStorageRule: 'password_must_be_handled_by_auth_or_server_hash_never_plaintext',
    status,
    paymentProviders: paymentRulesByModule[moduleId] || ['payflow'],
    roleIsolationRule: 'user_can_use_other_modules_but_cannot_access_private_data_of_other_roles_inside_this_module',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('moduleSecurityAudit').add({
    userId,
    moduleId,
    role,
    eventType: 'module_account_created_or_updated',
    status,
    immutable: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId,
    type: 'module_account',
    title: 'Compte module prepare',
    body: status === 'active'
      ? 'Votre compte de module est actif.'
      : 'Votre compte de module attend la validation administrative.',
    moduleId,
    action: role,
  });

  return { accountId, moduleId, role, status };
});

exports.getMyModuleNavigation = onCall(async (request) => {
  const userId = requireAuth(request);
  const moduleId = cleanString(request.data.moduleId, 80);
  assertKnownModule(moduleId);

  const accountsSnap = await db.collection('moduleAccounts')
    .where('userId', '==', userId)
    .where('moduleId', '==', moduleId)
    .get();

  const accounts = accountsSnap.docs.map((doc) => ({
    id: doc.id,
    role: doc.data().role,
    status: doc.data().status,
    country: doc.data().country,
    language: doc.data().language,
  }));

  return {
    moduleId,
    availableRoles: moduleAccountRoles[moduleId] || [],
    accounts,
    paymentProviders: paymentRulesByModule[moduleId] || ['payflow'],
    requiresAccountBeforePrivateAction: true,
    privacyRule: 'each_role_has_its_own_navigation_and_private_data',
  };
});

exports.registerUserRole = onCall(async (request) => {
  const userId = requireAuth(request);
  const role = request.data.role;
  const moduleId = request.data.moduleId || null;

  if (!role || !userRoles[role]) {
    throw new HttpsError('invalid-argument', 'Role invalide.');
  }

  const sensitiveRoles = [
    'payflow_agent',
    'doctor',
    'psychologist',
    'pharmacy',
    'laboratory',
    'school_owner',
    'city_agent',
    'founder_super_admin',
  ];

  const status = sensitiveRoles.includes(role) ? 'pending_admin_review' : 'active';

  await db.collection('userRoles').add({
    userId,
    role,
    moduleId,
    permissions: userRoles[role],
    status,
    createdAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId,
    type: 'role_registered',
    title: 'Role utilisateur enregistre',
    body: sensitiveRoles.includes(role)
      ? 'Votre role demande une validation administrative avant activation complete.'
      : 'Votre role est actif.',
    moduleId,
    action: role,
  });

  return { role, status };
});

exports.recordModuleWorkflowEvent = onCall(async (request) => {
  const userId = requireAuth(request);
  const moduleId = request.data.moduleId;
  const status = request.data.status;
  const referenceId = request.data.referenceId || null;
  const note = request.data.note || null;

  if (!moduleId || !moduleWorkflowStatuses[moduleId]) {
    throw new HttpsError('invalid-argument', 'Module invalide.');
  }

  if (!moduleWorkflowStatuses[moduleId].includes(status)) {
    throw new HttpsError('invalid-argument', 'Statut invalide pour ce module.');
  }

  await db.collection('moduleWorkflowEvents').add({
    userId,
    moduleId,
    status,
    referenceId,
    note,
    immutable: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { moduleId, status, saved: true };
});

exports.prepareModulePayment = onCall(async (request) => {
  const userId = requireAuth(request);
  const moduleId = request.data.moduleId;
  const action = request.data.action;
  const amount = Number(request.data.amount) || 0;
  const currency = request.data.currency || 'USD';

  if (!moduleId || !action || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Module, action et montant sont obligatoires.');
  }

  let feePercent = 0;
  let fixedFeeUsd = 0;

  if (moduleId === 'property') feePercent = platformFees.propertyOwnerPaymentPercent;
  if (moduleId === 'city') feePercent = platformFees.cityAdministrationPercent;
  if (moduleId === 'school') feePercent = platformFees.schoolPaymentPercent;
  if (moduleId === 'health' && action === 'Consultation medecin') feePercent = platformFees.healthConsultationPercent;
  if (moduleId === 'health' && action === 'Therapie psychologue') feePercent = platformFees.therapyConsultationPercent;
  if (moduleId === 'store' && action === 'Ajouter produit') fixedFeeUsd = platformFees.storeProductMarkupUsd;
  if (moduleId === 'store' && action === 'Payer commande') fixedFeeUsd = platformFees.storeDeliveryUsd;
  if (moduleId === 'payflow' && action === 'Conversion devise') fixedFeeUsd = platformFees.payflowCountryChangeUsd;

  const platformFee = amount * (feePercent / 100) + fixedFeeUsd;
  const totalToPay = amount + platformFee;

  const paymentRef = await db.collection('paymentPreparations').add({
    userId,
    moduleId,
    action,
    amount,
    currency,
    feePercent,
    fixedFeeUsd,
    platformFee,
    totalToPay,
    paymentProviders: ['payflow', 'paypal', 'card', 'bank', 'local_agent', 'cash_ready'],
    status: 'prepared',
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection('transactionAudit').add(buildTransactionAudit({
    userId,
    moduleId,
    action,
    amount,
    currency,
    status: 'prepared',
    feePercent,
    fixedFeeUsd,
  }));

  return {
    paymentId: paymentRef.id,
    platformFee,
    totalToPay,
    paymentProviders: ['payflow', 'paypal', 'card', 'bank', 'local_agent', 'cash_ready'],
  };
});

exports.validatePayflowTransferDraft = onCall(async (request) => {
  const userId = requireAuth(request);
  const amount = Number(request.data.amount) || 0;
  const currency = cleanString(request.data.currency || 'USD', 12);
  const recipient = cleanString(request.data.recipient, 200);
  const channel = cleanString(request.data.channel || 'payflow', 80);
  const userCountry = cleanString(request.data.userCountry, 80);
  const destinationCountry = cleanString(request.data.destinationCountry, 80);

  if (amount <= 0 || !recipient || !userCountry || !destinationCountry) {
    throw new HttpsError('invalid-argument', 'Montant, beneficiaire, pays utilisateur et pays destination sont obligatoires.');
  }

  const requiresKyc = amount >= 500;
  const crossCountryFeeUsd = userCountry !== destinationCountry ? platformFees.payflowCountryChangeUsd : 0;
  const serviceFee = amount * 0.0499;
  const totalEstimated = amount + serviceFee + crossCountryFeeUsd;

  const draftRef = await db.collection('payflowTransferDrafts').add({
    userId,
    amount,
    currency,
    recipient,
    channel,
    userCountry,
    destinationCountry,
    requiresKyc,
    kycRule: 'identity_proof_requested_once_from_500_usd_or_equivalent',
    serviceFee,
    crossCountryFeeUsd,
    totalEstimated,
    status: requiresKyc ? 'kyc_required_before_execution' : 'ready_for_confirmation',
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection('transactionAudit').add(buildTransactionAudit({
    userId,
    moduleId: 'payflow',
    action: 'validate_transfer_draft',
    amount,
    currency,
    status: requiresKyc ? 'kyc_required_before_execution' : 'ready_for_confirmation',
    fixedFeeUsd: crossCountryFeeUsd,
  }));

  return {
    draftId: draftRef.id,
    requiresKyc,
    serviceFee,
    crossCountryFeeUsd,
    totalEstimated,
    status: requiresKyc ? 'kyc_required_before_execution' : 'ready_for_confirmation',
  };
});

// Une demande ne credite jamais un portefeuille : seul un webhook verifie ou
// un paiement Payflow signe pourra la faire passer a l'etat paye.
exports.createPayflowMoneyRequest = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 20,
}, async (request) => {
  const userId = requireAuth(request);
  const amount = Number(request.data.amount) || 0;
  const currency = cleanString(request.data.currency || 'USD', 12);
  const payerReference = cleanString(request.data.payerReference, 200);
  const deliveryMethod = cleanString(request.data.deliveryMethod || 'notification', 30).toLowerCase();
  const note = cleanString(request.data.note, 500);
  if (request.data.humanConfirmed !== true) throw new HttpsError('failed-precondition', 'Confirmation personnelle obligatoire.');
  if (amount <= 0 || !payerReference || !['notification', 'link', 'qr'].includes(deliveryMethod)) {
    throw new HttpsError('invalid-argument', 'Payeur, montant et methode de demande valides sont obligatoires.');
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const requestRef = await db.collection('payflowMoneyRequests').add({
    requesterUserId: userId,
    payerReference,
    amount,
    currency,
    deliveryMethod,
    note,
    status: 'pending_payer_payment',
    canCreditWallet: false,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection('transactionAudit').add(buildTransactionAudit({
    userId,
    moduleId: 'payflow',
    action: 'create_money_request',
    amount,
    currency,
    status: 'pending_payer_payment',
  }));
  return { requestId: requestRef.id, status: 'pending_payer_payment', expiresAt: expiresAt.toISOString() };
});

// Cette session permet de suivre une reception, sans jamais creer de solde.
exports.preparePayflowReceipt = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 20,
}, async (request) => {
  const userId = requireAuth(request);
  const mode = cleanString(request.data.mode || 'message', 30).toLowerCase();
  if (request.data.humanConfirmed !== true) throw new HttpsError('failed-precondition', 'Confirmation personnelle obligatoire.');
  if (!['message', 'qr-sell', 'history'].includes(mode)) throw new HttpsError('invalid-argument', 'Mode de reception invalide.');

  const receiptRef = await db.collection('payflowReceiptSessions').add({
    userId,
    mode,
    status: 'waiting_for_verified_payment',
    canCreditWallet: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection('transactionAudit').add(buildTransactionAudit({
    userId,
    moduleId: 'payflow',
    action: 'prepare_receipt',
    amount: 0,
    currency: 'USD',
    status: 'waiting_for_verified_payment',
  }));
  return { receiptId: receiptRef.id, status: 'waiting_for_verified_payment' };
});

const starterStoreProducts = {
  'STORE-P-1001': { name: 'Sac OMG Global', priceMinor: 4500, currency: 'USD', stock: 12 },
  'STORE-P-1002': { name: 'Livre University Preparation', priceMinor: 1999, currency: 'USD', stock: 30 },
  'STORE-P-1003': { name: 'Kit maison connectee', priceMinor: 8900, currency: 'USD', stock: 8 },
};

async function resolveStoreItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    throw new HttpsError('invalid-argument', 'La commande doit contenir entre 1 et 50 produits.');
  }
  const items = [];
  for (const rawItem of rawItems) {
    const productId = cleanString(rawItem?.productId, 160);
    const quantity = Number(rawItem?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new HttpsError('invalid-argument', 'Produit ou quantite Store invalide.');
    }
    let product = starterStoreProducts[productId];
    let merchantUserId = null;
    if (!product) {
      const snapshot = await db.collection('storeProducts').doc(productId).get();
      if (!snapshot.exists || snapshot.data().status !== 'active') throw new HttpsError('not-found', 'Produit Store indisponible.');
      const data = snapshot.data();
      product = { name: data.name, priceMinor: Number(data.priceMinor), currency: data.currency, stock: Number(data.stock) };
      merchantUserId = data.merchantUserId || null;
    }
    if (product.currency !== 'USD' || !Number.isInteger(product.priceMinor) || product.priceMinor <= 0) {
      throw new HttpsError('failed-precondition', 'Prix Store non valide.');
    }
    if (quantity > product.stock) throw new HttpsError('failed-precondition', `Stock insuffisant pour ${product.name}.`);
    items.push({ productId, name: product.name, quantity, unitPriceMinor: product.priceMinor, lineTotalMinor: product.priceMinor * quantity, merchantUserId, availableStock: product.stock });
  }
  return items;
}

exports.createStoreOrderSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 25,
}, async (request) => {
  const customerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  const paymentMethod = cleanString(request.data.paymentMethod, 30).toLowerCase();
  const mailportPurchaseId = cleanString(request.data.mailportPurchaseId, 160);
  const recipientName = cleanString(request.data.recipientName, 160);
  const deliveryInstructions = cleanString(request.data.deliveryInstructions, 500);
  if (!['payflow', 'paypal', 'stripe'].includes(paymentMethod)) throw new HttpsError('invalid-argument', 'Moyen de paiement Store invalide.');
  if (!mailportPurchaseId || !recipientName) throw new HttpsError('invalid-argument', 'Adresse Mailport et destinataire obligatoires.');
  const purchaseSnapshot = await db.collection('mailportAddressPurchases').doc(mailportPurchaseId).get();
  if (!purchaseSnapshot.exists || purchaseSnapshot.data().buyerUserId !== customerUserId || purchaseSnapshot.data().status !== 'paid') {
    throw new HttpsError('failed-precondition', 'Une adresse Mailport achetee et payee est obligatoire.');
  }
  const items = await resolveStoreItems(request.data.items);
  const merchandiseMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  const deliveryFeeMinor = Math.round(platformFees.storeDeliveryUsd * 100);
  const totalMinor = merchandiseMinor + deliveryFeeMinor;
  const orderRef = db.collection('storeOrders').doc();
  const merchantUserIds = [...new Set(items.map((item) => item.merchantUserId).filter(Boolean))];
  await orderRef.set({
    customerUserId, items, merchandiseMinor, deliveryFeeMinor, totalMinor, currency: 'USD', paymentMethod,
    merchantUserIds,
    mailportPurchaseId, addressId: purchaseSnapshot.data().addressId, recipientName, deliveryInstructions,
    status: 'pending_payment', mailportStatus: 'not_created_before_payment', canDelete: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, orderId: orderRef.id, merchandiseAmount: merchandiseMinor / 100, deliveryFee: deliveryFeeMinor / 100, total: totalMinor / 100, currency: 'USD', status: 'pending_payment' };
});

async function finalizeStoreOrderPayment({ orderId, customerUserId, provider, providerPaymentId = null }) {
  const orderRef = db.collection('storeOrders').doc(orderId);
  const packageRef = db.collection('mailportPackages').doc();
  const revenueRef = db.collection('platformRevenue').doc();
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + mailportPackageQrValidityMs);
  const result = await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists || orderSnapshot.data().customerUserId !== customerUserId) throw new HttpsError('not-found', 'Commande Store introuvable.');
    const order = orderSnapshot.data();
    if (order.status === 'paid') throw new HttpsError('already-exists', 'Cette commande est deja payee.');
    if (order.status !== 'pending_payment' || order.paymentMethod !== provider) throw new HttpsError('failed-precondition', 'Moyen de paiement incorrect pour cette commande.');
    const purchaseRef = db.collection('mailportAddressPurchases').doc(order.mailportPurchaseId);
    const addressRef = db.collection('mailportAddresses').doc(order.addressId);
    const [purchaseSnapshot, addressSnapshot] = await Promise.all([transaction.get(purchaseRef), transaction.get(addressRef)]);
    if (!purchaseSnapshot.exists || purchaseSnapshot.data().status !== 'paid' || purchaseSnapshot.data().buyerUserId !== customerUserId) throw new HttpsError('failed-precondition', 'Acces Mailport non valide.');
    if (!addressSnapshot.exists || addressSnapshot.data().status !== 'active') throw new HttpsError('failed-precondition', 'Adresse Mailport inactive.');
    const inventoryEntries = order.items.map((item) => ({ item, ref: db.collection('storeInventory').doc(item.productId) }));
    const inventorySnapshots = await Promise.all(inventoryEntries.map(({ ref }) => transaction.get(ref)));
    inventoryEntries.forEach(({ item }, index) => {
      const available = inventorySnapshots[index].exists
        ? Number(inventorySnapshots[index].data().stock || 0)
        : Number(starterStoreProducts[item.productId]?.stock ?? item.availableStock);
      if (available < item.quantity) throw new HttpsError('failed-precondition', `Stock insuffisant pour ${item.name}.`);
    });
    if (provider === 'payflow') {
      const walletRef = db.collection('payflowWallets').doc(`${customerUserId}_USD`.replace(/[^A-Za-z0-9_-]/g, '_'));
      const walletSnapshot = await transaction.get(walletRef);
      if (!walletSnapshot.exists || walletSnapshot.data().status !== 'active') throw new HttpsError('failed-precondition', 'Portefeuille Payflow USD actif introuvable.');
      const balanceMinor = Number(walletSnapshot.data().balanceMinor || 0);
      if (balanceMinor < order.totalMinor) throw new HttpsError('failed-precondition', 'Solde Payflow insuffisant.');
      transaction.update(walletRef, { balanceMinor: balanceMinor - order.totalMinor, updatedAt: FieldValue.serverTimestamp() });
    }
    inventoryEntries.forEach(({ item, ref }, index) => {
      const currentStock = inventorySnapshots[index].exists
        ? Number(inventorySnapshots[index].data().stock || 0)
        : Number(starterStoreProducts[item.productId]?.stock ?? item.availableStock);
      transaction.set(ref, { productId: item.productId, stock: currentStock - item.quantity, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    const merchantTotals = order.items.reduce((totals, item) => {
      if (item.merchantUserId) totals[item.merchantUserId] = (totals[item.merchantUserId] || 0) + item.lineTotalMinor;
      return totals;
    }, {});
    Object.entries(merchantTotals).forEach(([merchantUserId, amountMinor]) => {
      transaction.set(db.collection('storeMerchantLedger').doc(), {
        merchantUserId, orderId, amountMinor, currency: order.currency, provider,
        status: 'pending_payflow_settlement', canDelete: false, createdAt: FieldValue.serverTimestamp(),
      });
    });
    transaction.update(orderRef, { status: 'paid', paymentProvider: provider, paymentReference: providerPaymentId || revenueRef.id, packageId: packageRef.id, mailportStatus: 'created', paidAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    transaction.set(packageRef, {
      customerUserId, addressId: order.addressId, addressOwnerUserId: addressSnapshot.data().ownerUserId,
      merchantReference: orderId, fromLocation: 'Store Online', toLocation: `${addressSnapshot.data().city}, ${addressSnapshot.data().country}`,
      recipientName: order.recipientName, deliveryInstructions: order.deliveryInstructions || '', status: 'created', carrierUserId: null,
      qrTokenHash: mailportQrTokenHash(token), qrExpiresAt: expiresAt, qrConsumed: false, canDelete: false,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    const merchantPayableMinor = Object.values(merchantTotals).reduce((sum, amount) => sum + amount, 0);
    transaction.set(revenueRef, {
      userId: customerUserId, moduleId: 'store', orderId,
      amountMinor: order.totalMinor, grossAmountMinor: order.totalMinor,
      merchantPayableMinor, platformAmountMinor: order.totalMinor - merchantPayableMinor,
      currency: order.currency, type: 'store_order_payment', provider, providerPaymentId,
      status: 'completed', canDelete: false, createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection('transactionAudit').doc(revenueRef.id), { ...buildTransactionAudit({ userId: customerUserId, moduleId: 'store', action: `store_order_${provider}`, amount: order.totalMinor / 100, currency: order.currency, status: 'completed' }), orderId, packageId: packageRef.id });
    return { total: order.totalMinor / 100, currency: order.currency };
  });
  return { ok: true, orderId, status: 'paid', packageId: packageRef.id, mailportStatus: 'created', ...result, packageQrPayload: JSON.stringify({ system: 'OMG-MAILPORT', version: 1, packageId: packageRef.id, token }) };
}

exports.completeStoreOrderWithPayflowSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 25,
}, async (request) => {
  const customerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  if (request.data.humanConfirmed !== true) throw new HttpsError('failed-precondition', 'Confirmation personnelle du paiement obligatoire.');
  return finalizeStoreOrderPayment({ orderId: cleanString(request.data.orderId, 160), customerUserId, provider: 'payflow' });
});

exports.completeStoreOrderExternalSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', timeoutSeconds: 25,
}, async (request) => {
  const customerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  const orderId = cleanString(request.data.orderId, 160);
  const provider = cleanString(request.data.provider, 20).toLowerCase();
  const providerPaymentId = cleanString(request.data.providerPaymentId, 200);
  const config = { paypal: { collection: 'paypalOrders', statuses: ['COMPLETED'] }, stripe: { collection: 'stripePayments', statuses: ['completed'] } }[provider];
  if (!config || !orderId || !providerPaymentId) throw new HttpsError('invalid-argument', 'Paiement externe Store invalide.');
  const [orderSnapshot, paymentSnapshot] = await Promise.all([db.collection('storeOrders').doc(orderId).get(), db.collection(config.collection).doc(providerPaymentId).get()]);
  if (!orderSnapshot.exists || orderSnapshot.data().customerUserId !== customerUserId) throw new HttpsError('not-found', 'Commande Store introuvable.');
  if (!paymentSnapshot.exists || paymentSnapshot.data().userId !== customerUserId) throw new HttpsError('permission-denied', 'Paiement externe non autorise.');
  const order = orderSnapshot.data();
  const payment = paymentSnapshot.data();
  if (!config.statuses.includes(payment.status) || payment.moduleId !== 'store' || payment.action !== `store_order:${orderId}`) throw new HttpsError('failed-precondition', 'Ce paiement ne correspond pas a la commande Store.');
  if (payment.currency !== 'USD' || Math.round(Number(payment.amount) * 100) !== order.totalMinor) throw new HttpsError('failed-precondition', 'Montant externe incorrect.');
  return finalizeStoreOrderPayment({ orderId, customerUserId, provider, providerPaymentId });
});

exports.prepareStoreProductPrice = onCall({ secrets: [exchangeRateApiKey] }, async (request) => {
  const userId = requireAuth(request);
  const basePrice = Number(request.data.basePrice) || 0;
  const currency = request.data.currency || 'USD';
  const productName = request.data.productName || 'Produit';

  if (basePrice <= 0) {
    throw new HttpsError('invalid-argument', 'Prix invalide.');
  }

  const markupLocal = await convertCurrencyVerified(platformFees.storeProductMarkupUsd, 'USD', currency);
  const publicPrice = basePrice + markupLocal;

  const productPriceRef = await db.collection('storeProductPricing').add({
    userId,
    productName,
    basePrice,
    currency,
    platformMarkupUsd: platformFees.storeProductMarkupUsd,
    platformMarkupLocal: markupLocal,
    publicPrice,
    rule: 'Le prix public ajoute automatiquement 1.25 USD ou equivalent au prix mis par le marchand.',
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    pricingId: productPriceRef.id,
    basePrice,
    platformMarkupLocal: markupLocal,
    publicPrice,
  };
});

exports.recordMailportDelivery = onCall({ secrets: [exchangeRateApiKey] }, async (request) => {
  const userId = requireAuth(request);
  const packageId = request.data.packageId;
  const carrierUserId = request.data.carrierUserId;
  const addressOwnerUserId = request.data.addressOwnerUserId;
  const currency = request.data.currency || 'USD';

  if (!packageId || !carrierUserId || !addressOwnerUserId) {
    throw new HttpsError('invalid-argument', 'Colis, livreur et proprietaire adresse sont obligatoires.');
  }

  const carrierReward = await convertCurrencyVerified(platformFees.mailportCarrierRewardUsd, 'USD', currency);
  const addressOwnerReward = await convertCurrencyVerified(platformFees.mailportAddressOwnerRewardUsd, 'USD', currency);

  const deliveryRef = await db.collection('mailportDeliveries').add({
    packageId,
    confirmedBy: userId,
    carrierUserId,
    addressOwnerUserId,
    currency,
    carrierReward,
    addressOwnerReward,
    status: 'delivered_rewards_pending_payflow',
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection('payflowRewardLedger').add({
    deliveryId: deliveryRef.id,
    packageId,
    userId: carrierUserId,
    role: 'carrier',
    amount: carrierReward,
    currency,
    status: 'pending_payflow_credit',
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection('payflowRewardLedger').add({
    deliveryId: deliveryRef.id,
    packageId,
    userId: addressOwnerUserId,
    role: 'reference_address_owner',
    amount: addressOwnerReward,
    currency,
    status: 'pending_payflow_credit',
    createdAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: carrierUserId,
    type: 'mailport_reward',
    title: 'Gain livreur Mailport',
    body: 'Un gain Mailport est pret pour credit Payflow.',
    moduleId: 'mailport',
    action: 'Livraison colis',
  });

  await createNotification({
    userId: addressOwnerUserId,
    type: 'mailport_reward',
    title: 'Gain adresse referentielle',
    body: 'Un gain pour reception de colis est pret pour credit Payflow.',
    moduleId: 'mailport',
    action: 'Reception colis',
  });

  return {
    deliveryId: deliveryRef.id,
    carrierReward,
    addressOwnerReward,
  };
});

exports.prepareHealthAppointment = onCall(async (request) => {
  const patientUserId = requireAuth(request);
  const professionalUserId = request.data.professionalUserId;
  const appointmentType = request.data.appointmentType || 'Consultation medecin';
  const price = Number(request.data.price) || 0;
  const currency = request.data.currency || 'USD';
  const scheduledAtText = request.data.scheduledAtText || '';

  if (!professionalUserId || price <= 0 || !scheduledAtText) {
    throw new HttpsError('invalid-argument', 'Professionnel, prix et date/heure sont obligatoires.');
  }

  const platformFee = price * (platformFees.healthConsultationPercent / 100);
  const professionalReceives = price - platformFee;

  const appointmentRef = await db.collection('healthAppointments').add({
    patientUserId,
    professionalUserId,
    appointmentType,
    price,
    currency,
    platformFeePercent: platformFees.healthConsultationPercent,
    platformFee,
    professionalReceives,
    scheduledAtText,
    status: 'payment_required_before_confirmation',
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    appointmentId: appointmentRef.id,
    platformFee,
    professionalReceives,
    status: 'payment_required_before_confirmation',
  };
});

exports.queueUserMessage = onCall(async (request) => {
  const userId = requireAuth(request);
  const moduleId = cleanString(request.data.moduleId, 80);
  const type = cleanString(request.data.type || 'general', 80);
  const title = cleanString(request.data.title, 160);
  const body = cleanString(request.data.body, 1000);
  const targetUserId = cleanString(request.data.targetUserId || userId, 160);
  const channels = Array.isArray(request.data.channels) && request.data.channels.length
    ? request.data.channels.slice(0, 3)
    : ['in_app', 'email_ready', 'sms_ready'];

  assertKnownModule(moduleId);

  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'Titre et message sont obligatoires.');
  }

  const messageRef = await db.collection('communicationsQueue').add({
    requestedBy: userId,
    userId: targetUserId,
    moduleId,
    type,
    title,
    body,
    channels,
    status: 'queued',
    deliveryNote: 'email_sms_provider_to_be_connected_later',
    createdAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: targetUserId,
    type,
    title,
    body,
    moduleId,
    action: 'message',
  });

  return { messageId: messageRef.id, status: 'queued' };
});

exports.openSupportTicket = onCall(async (request) => {
  const userId = requireAuth(request);
  const moduleId = cleanString(request.data.moduleId, 80);
  const subject = cleanString(request.data.subject, 160);
  const description = cleanString(request.data.description, 2000);
  const priority = cleanString(request.data.priority || 'normal', 40);

  assertKnownModule(moduleId);

  if (!subject || !description) {
    throw new HttpsError('invalid-argument', 'Sujet et description sont obligatoires.');
  }

  const ticketRef = await db.collection('supportTickets').add({
    userId,
    moduleId,
    subject,
    description,
    priority,
    status: 'open',
    assignedTo: 'platform_administration',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('moduleSecurityAudit').add({
    userId,
    moduleId,
    eventType: 'support_ticket_opened',
    referenceId: ticketRef.id,
    priority,
    immutable: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ticketId: ticketRef.id, status: 'open' };
});

exports.approveKycRequest = onCall(async (request) => {
  const adminUserId = await requireFounder(request);
  const kycId = request.data.kycId;

  if (!kycId) {
    throw new HttpsError('invalid-argument', 'kycId obligatoire.');
  }

  const kycRef = db.collection('kycRequests').doc(kycId);
  const kycDoc = await kycRef.get();

  if (!kycDoc.exists) {
    throw new HttpsError('not-found', 'KYC introuvable.');
  }

  const data = kycDoc.data();
  await kycRef.set({
    status: 'approved',
    approvedBy: adminUserId,
    approvedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('users').doc(data.userId).set({
    kycStatus: 'approved',
    kycApprovedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await createNotification({
    userId: data.userId,
    type: 'kyc_approved',
    title: 'KYC approuve',
    body: 'Votre verification KYC est approuvee.',
    moduleId: 'kyc',
    action: 'approval',
  });

  return { status: 'approved' };
});

exports.approvePayflowAgent = onCall(async (request) => {
  const adminUserId = await requireFounder(request);
  const requestId = request.data.requestId;

  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId obligatoire.');
  }

  const agentRef = db.collection('payflowAgentRequests').doc(requestId);
  const agentDoc = await agentRef.get();

  if (!agentDoc.exists) {
    throw new HttpsError('not-found', 'Demande Agent Payflow introuvable.');
  }

  const data = agentDoc.data();
  await agentRef.set({
    status: 'approved',
    approvedBy: adminUserId,
    approvedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('payflowAgents').doc(data.userId).set({
    userId: data.userId,
    country: data.country,
    city: data.city,
    zone: data.zone,
    agentType: data.agentType,
    phone: data.phone,
    status: 'active',
    canHandleCash: true,
    canApproveKyc: false,
    canModifyTransactions: false,
    approvedBy: adminUserId,
    approvedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await createNotification({
    userId: data.userId,
    type: 'payflow_agent_approved',
    title: 'Agent Payflow approuve',
    body: 'Votre profil Agent Payflow est maintenant actif.',
    moduleId: 'payflow',
    action: 'Operateurs locaux',
  });

  return { status: 'approved' };
});

exports.createStripeCheckoutSessionSecure = functionsV1
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data, context) => {
    const request = { data: data || {}, auth: context.auth };
    const userId = requireAuth(request);
    const amount = Number(request.data.amount) || 0;
    const currency = cleanString(request.data.currency || 'USD', 3).toLowerCase();
    const moduleId = cleanString(request.data.moduleId || 'payflow', 60);
    const action = cleanString(request.data.action || 'payment', 120);
    const successUrl = cleanString(request.data.successUrl, 500);
    const cancelUrl = cleanString(request.data.cancelUrl, 500);
    const secretKey = stripeSecretKey.value();

    if (!secretKey) {
      throw new HttpsError('failed-precondition', 'Stripe backend non configure. Ajoutez STRIPE_SECRET_KEY dans Firebase Secret Manager.');
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      throw new HttpsError('invalid-argument', 'Montant Stripe invalide.');
    }
    if (!/^[a-z]{3}$/.test(currency) || !successUrl.startsWith('https://') || !cancelUrl.startsWith('https://')) {
      throw new HttpsError('invalid-argument', 'Devise ou URL Stripe invalide.');
    }

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.set('client_reference_id', userId);
    params.set('line_items[0][price_data][currency]', currency);
    params.set('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
    params.set('line_items[0][price_data][product_data][name]', `OMG Platforme - ${action}`);
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[userId]', userId);
    params.set('metadata[moduleId]', moduleId);
    params.set('metadata[action]', action);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const session = await response.json();
    if (!response.ok || !session.id || !session.url) {
      logger.error('Stripe session creation failed', { status: response.status, type: session.error?.type });
      throw new HttpsError('internal', session.error?.message || 'Stripe n a pas pu creer la session.');
    }

    await db.collection('stripePayments').doc(session.id).set({
      userId, moduleId, action, amount, currency: currency.toUpperCase(), status: 'open',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { sessionId: session.id, redirectUrl: session.url };
  });

exports.verifyStripeCheckoutSessionSecure = functionsV1
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data, context) => {
    const request = { data: data || {}, auth: context.auth };
    const userId = requireAuth(request);
    const sessionId = cleanString(request.data.sessionId, 180);
    if (!/^cs_(test_|live_)/.test(sessionId)) {
      throw new HttpsError('invalid-argument', 'Reference Stripe invalide.');
    }
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeSecretKey.value()}` },
    });
    const session = await response.json();
    if (!response.ok || session.metadata?.userId !== userId) {
      throw new HttpsError('permission-denied', 'Session Stripe introuvable ou non autorisee.');
    }
    const completed = session.payment_status === 'paid' && session.status === 'complete';
    await db.collection('stripePayments').doc(sessionId).set({
      status: completed ? 'completed' : session.payment_status || session.status,
      paymentIntentId: session.payment_intent || null,
      verifiedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { sessionId, status: session.status, paymentStatus: session.payment_status, completed };
  });

exports.createPayPalOrderSecure = functionsV1
  .runWith({ secrets: [paypalClientId, paypalClientSecret] })
  .https.onCall(async (data, context) => {
  const request = { data: data || {}, auth: context.auth };
  const userId = requireAuth(request);
  const amount = Number(request.data.amount) || 0;
  const currency = cleanString(request.data.currency || 'USD', 3).toUpperCase();
  const moduleId = cleanString(request.data.moduleId || 'payflow', 60);
  const action = cleanString(request.data.action || 'payment', 120);
  const returnUrl = cleanString(request.data.returnUrl, 500);
  const cancelUrl = cleanString(request.data.cancelUrl, 500);
  const clientId = paypalClientId.value();

  if (!clientId || !paypalClientSecret.value()) {
    throw new HttpsError('failed-precondition', 'PayPal backend non configure. Ajoutez PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET dans Firebase Functions.');
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
    throw new HttpsError('invalid-argument', 'Montant invalide.');
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new HttpsError('invalid-argument', 'Devise PayPal invalide.');
  }

  const isAllowedRedirect = (value) => {
    if (!value) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(parsed.hostname);
    } catch {
      return false;
    }
  };

  if (!isAllowedRedirect(returnUrl) || !isAllowedRedirect(cancelUrl)) {
    throw new HttpsError('invalid-argument', 'Adresse de retour PayPal invalide.');
  }

  const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const authString = Buffer.from(`${clientId}:${paypalClientSecret.value()}`).toString('base64');

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    logger.error('PayPal token error', body);
    throw new HttpsError('internal', 'PayPal token impossible.');
  }

  const tokenData = await tokenResponse.json();
  const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      payment_source: {
        paypal: {
          experience_context: {
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          custom_id: `${userId}:${moduleId}:${action}`,
        },
      ],
    }),
  });

  if (!orderResponse.ok) {
    const body = await orderResponse.text();
    logger.error('PayPal order error', body);
    throw new HttpsError('internal', 'Creation ordre PayPal impossible.');
  }

  const order = await orderResponse.json();
  await db.collection('paypalOrders').doc(order.id).set({
    userId,
    moduleId,
    action,
    amount,
    currency,
    status: order.status,
    paypalMode,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    orderId: order.id,
    status: order.status,
    links: order.links || [],
  };
});

exports.capturePayPalOrderSecure = functionsV1
  .runWith({ secrets: [paypalClientId, paypalClientSecret] })
  .https.onCall(async (data, context) => {
  const request = { data: data || {}, auth: context.auth };
  const userId = requireAuth(request);
  const orderId = cleanString(request.data.orderId, 120);
  const clientId = paypalClientId.value();

  if (!clientId || !paypalClientSecret.value()) {
    throw new HttpsError('failed-precondition', 'PayPal backend non configure.');
  }

  if (!orderId) {
    throw new HttpsError('invalid-argument', 'orderId obligatoire.');
  }

  const orderDoc = await db.collection('paypalOrders').doc(orderId).get();
  if (!orderDoc.exists || orderDoc.data().userId !== userId) {
    throw new HttpsError('permission-denied', 'Ordre PayPal non autorise.');
  }

  const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const authString = Buffer.from(`${clientId}:${paypalClientSecret.value()}`).toString('base64');

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    logger.error('PayPal capture token error', body);
    throw new HttpsError('internal', 'PayPal token impossible.');
  }

  const tokenData = await tokenResponse.json();
  const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const captureBody = await captureResponse.json();
  if (!captureResponse.ok) {
    logger.error('PayPal capture error', captureBody);
    throw new HttpsError('internal', 'Capture PayPal impossible.');
  }

  await db.collection('paypalOrders').doc(orderId).set({
    status: captureBody.status || 'CAPTURED',
    capturedAt: FieldValue.serverTimestamp(),
    captureSummary: {
      id: captureBody.id || orderId,
      status: captureBody.status || null,
    },
  }, { merge: true });

  await db.collection('transactionAudit').add(buildTransactionAudit({
    userId,
    moduleId: orderDoc.data().moduleId || 'payflow',
    action: 'paypal_capture',
    amount: orderDoc.data().amount || 0,
    currency: orderDoc.data().currency || 'USD',
    status: captureBody.status || 'CAPTURED',
  }));

  return { orderId, status: captureBody.status || 'CAPTURED' };
});

async function getMonCashAccessToken() {
  const clientId = moncashClientId.value();
  const clientSecret = moncashClientSecret.value();
  if (!clientId || !clientSecret) {
    throw new HttpsError('failed-precondition', 'MonCash backend non configure.');
  }
  const apiBase = moncashMode === 'live'
    ? 'https://moncashbutton.digicelgroup.com/Api'
    : 'https://sandbox.moncashbutton.digicelgroup.com/Api';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${apiBase}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'scope=read%2Cwrite&grant_type=client_credentials',
  });
  if (!response.ok) {
    logger.error('MonCash OAuth error', { status: response.status });
    throw new HttpsError('internal', 'Authentification MonCash impossible.');
  }
  const body = await response.json();
  if (!body.access_token) throw new HttpsError('internal', 'Jeton MonCash absent.');
  return { accessToken: body.access_token, apiBase };
}

exports.createMonCashPaymentSecure = functionsV1
  .runWith({ secrets: [moncashClientId, moncashClientSecret] })
  .https.onCall(async (data, context) => {
    const request = { data: data || {}, auth: context.auth };
    const userId = requireAuth(request);
    const amount = Number(request.data.amount) || 0;
    const moduleId = cleanString(request.data.moduleId || 'payflow', 60);
    const action = cleanString(request.data.action || 'payment', 120);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      throw new HttpsError('invalid-argument', 'Montant MonCash invalide.');
    }
    const orderId = `OMG-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const { accessToken, apiBase } = await getMonCashAccessToken();
    const response = await fetch(`${apiBase}/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: Number(amount.toFixed(2)), orderId }),
    });
    const body = await response.json().catch(() => ({}));
    const paymentToken = body.payment_token?.token;
    if (!response.ok || !paymentToken) {
      logger.error('MonCash create payment error', { status: response.status });
      throw new HttpsError('internal', 'Creation du paiement MonCash impossible.');
    }
    const gatewayBase = moncashMode === 'live'
      ? 'https://moncashbutton.digicelgroup.com/Moncash-middleware'
      : 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';
    await db.collection('moncashPayments').doc(orderId).set({
      userId, moduleId, action, amount, currency: 'HTG', status: 'CREATED',
      moncashMode, createdAt: FieldValue.serverTimestamp(),
    });
    return {
      orderId,
      status: 'CREATED',
      redirectUrl: `${gatewayBase}/Payment/Redirect?token=${encodeURIComponent(paymentToken)}`,
    };
  });

exports.verifyMonCashPaymentSecure = functionsV1
  .runWith({ secrets: [moncashClientId, moncashClientSecret] })
  .https.onCall(async (data, context) => {
    const request = { data: data || {}, auth: context.auth };
    const userId = requireAuth(request);
    const orderId = cleanString(request.data.orderId, 150);
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId obligatoire.');
    const paymentRef = db.collection('moncashPayments').doc(orderId);
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists || paymentDoc.data().userId !== userId) {
      throw new HttpsError('permission-denied', 'Paiement MonCash non autorise.');
    }
    const { accessToken, apiBase } = await getMonCashAccessToken();
    const response = await fetch(`${apiBase}/v1/RetrieveOrderPayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.payment) {
      logger.error('MonCash verify payment error', { status: response.status });
      throw new HttpsError('failed-precondition', 'Paiement MonCash non confirme.');
    }
    const status = String(body.payment.message || '').toLowerCase() === 'successful' ? 'COMPLETED' : 'PENDING';
    await paymentRef.set({
      status,
      transactionId: cleanString(body.payment.transaction_id, 120),
      verifiedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    if (status === 'COMPLETED') {
      await db.collection('transactionAudit').add(buildTransactionAudit({
        userId,
        moduleId: paymentDoc.data().moduleId || 'payflow',
        action: 'moncash_payment',
        amount: paymentDoc.data().amount || 0,
        currency: 'HTG',
        status,
      }));
    }
    return { orderId, status, transactionId: body.payment.transaction_id || null };
  });

exports.createPayflowNotificationOnAction = onDocumentCreated('moduleActionRequests/{requestId}', async (event) => {
  const data = event.data && event.data.data();

  if (!data || !data.userId) {
    return;
  }

  await db.collection('userNotifications').add({
    userId: data.userId,
    type: 'module_action_created',
    title: `${data.action || 'Action'} recue`,
    body: `Votre demande dans ${data.moduleTitle || data.moduleId || 'OMG Platforme'} est enregistree.`,
    moduleId: data.moduleId || null,
    action: data.action || null,
    channels: ['in_app', 'email_ready', 'sms_ready'],
    status: 'created_by_backend',
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info('Notification created for module action', {
    requestId: event.params.requestId,
    userId: data.userId,
  });
});

exports.createKycNotification = onDocumentCreated('kycRequests/{kycId}', async (event) => {
  const data = event.data && event.data.data();

  if (!data || !data.userId) {
    return;
  }

  await db.collection('userNotifications').add({
    userId: data.userId,
    type: 'kyc_received',
    title: 'Documents KYC recus',
    body: 'Vos documents sont recus. Platforme Administration va verifier votre dossier.',
    moduleId: 'kyc',
    action: 'verification',
    channels: ['in_app', 'email_ready', 'sms_ready'],
    status: 'created_by_backend',
    createdAt: FieldValue.serverTimestamp(),
  });
});

exports.createPayflowAgentNotification = onDocumentCreated('payflowAgentRequests/{requestId}', async (event) => {
  const data = event.data && event.data.data();

  if (!data || !data.userId) {
    return;
  }

  await db.collection('userNotifications').add({
    userId: data.userId,
    type: 'payflow_agent_received',
    title: 'Demande Agent Payflow recue',
    body: 'Votre dossier Agent Payflow est recu et attend la validation administrative.',
    moduleId: 'payflow',
    action: 'Operateurs locaux',
    channels: ['in_app', 'email_ready', 'sms_ready'],
    status: 'created_by_backend',
    createdAt: FieldValue.serverTimestamp(),
  });
});

const supportedFrontendModules = new Set([
  'payflow',
  'mailport',
  'store',
  'property',
  'restaurant',
  'school',
  'city',
  'health',
  'university',
  'tax',
  'administration',
]);

const humanConfirmationOperations = new Set([
  'processPayment',
  'processWithdrawal',
  'processPropertyPayment',
  'processSchoolPayment',
  'submitIRSReturn',
  'issueCertificate',
  'manageAdministration',
  'createAuditLog',
]);

function cleanText(value, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanAssistantContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowedKeys = [
    'countryName', 'learningLanguage', 'subjectTitle', 'chapterTitle',
    'chapterIndex', 'totalChapters', 'questionsInChapter', 'unlockedCount', 'paid',
  ];
  return Object.fromEntries(allowedKeys
    .filter((key) => Object.prototype.hasOwnProperty.call(value, key))
    .map((key) => [key, typeof value[key] === 'string' ? cleanText(value[key], 160) : value[key]]));
}

async function enforceAiRateLimit(userId) {
  const bucket = new Date().toISOString().slice(0, 13);
  const ref = db.collection('aiRateLimits').doc(`${userId}_${bucket}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? Number(snapshot.data().count || 0) : 0;
    if (count >= 30) {
      throw new HttpsError('resource-exhausted', 'Limite temporaire de l assistant atteinte. Reessayez plus tard.');
    }
    transaction.set(ref, {
      userId,
      bucket,
      count: count + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

function extractOpenAIText(payload) {
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === 'output_text' && content.text) return content.text.trim();
    }
  }
  return '';
}

async function sendPushToUser(userId, title, body, data = {}) {
  const tokenSnapshot = await db.collection('pushTokens').where('userId', '==', userId).limit(20).get();
  const records = tokenSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const tokens = records.map((record) => record.token).filter(Boolean);
  if (!tokens.length) return { sent: 0, failed: 0 };

  const result = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
    android: { priority: 'high' },
  });

  const invalidCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ]);
  await Promise.all(result.responses.map((response, index) => {
    if (response.success || !invalidCodes.has(response.error?.code)) return null;
    return db.collection('pushTokens').doc(records[index].id).delete();
  }));
  return { sent: result.successCount, failed: result.failureCount };
}

exports.askFred509 = onCall({
  secrets: [openaiApiKey],
  timeoutSeconds: 60,
  memory: '256MiB',
  maxInstances: 20,
  invoker: 'public',
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
}, async (request) => {
  const userId = requireAuth(request);
  validateFrontendPayload(request.data);
  const message = cleanText(request.data.message, 2000);
  const moduleId = cleanText(request.data.moduleId || 'platform', 40);
  if (!message) throw new HttpsError('invalid-argument', 'Message obligatoire.');
  if (!supportedFrontendModules.has(moduleId) && moduleId !== 'platform') {
    throw new HttpsError('invalid-argument', 'Module assistant invalide.');
  }
  await enforceAiRateLimit(userId);

  const apiKey = openaiApiKey.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'Assistant OpenAI non configure.');
  const context = cleanAssistantContext(request.data.context);
  const safetyIdentifier = crypto.createHash('sha256').update(userId).digest('hex');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: openaiModel,
      instructions: fredSystemPrompt,
      input: `Module: ${moduleId}\nContexte autorise: ${JSON.stringify(context)}\nQuestion: ${message}`,
      reasoning: { effort: 'low' },
      max_output_tokens: 700,
      safety_identifier: safetyIdentifier,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    const providerCode = cleanText(payload?.error?.code || payload?.error?.type || 'unknown', 80);
    logger.error(`OpenAI request failed status=${response.status} code=${providerCode}`, {
      status: response.status,
      code: providerCode,
    });
    if (response.status === 401) {
      throw new HttpsError('failed-precondition', 'Cle OpenAI absente, invalide ou revoquee.');
    }
    if (response.status === 429) {
      throw new HttpsError('resource-exhausted', 'Quota ou credit OpenAI insuffisant.');
    }
    if (response.status === 400 || response.status === 404) {
      throw new HttpsError('failed-precondition', `Configuration OpenAI invalide (${providerCode}).`);
    }
    throw new HttpsError('unavailable', 'Assistant temporairement indisponible.');
  }
  const answer = extractOpenAIText(payload);
  if (!answer) throw new HttpsError('unavailable', 'Assistant sans reponse exploitable.');
  return { ok: true, answer, model: openaiModel };
});

exports.registerPushToken = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 15,
}, async (request) => {
  const userId = requireAuth(request);
  validateFrontendPayload(request.data);
  const token = cleanText(request.data.token, 4096);
  if (!token || token.length < 20) throw new HttpsError('invalid-argument', 'Jeton de notification invalide.');
  const tokenId = crypto.createHash('sha256').update(token).digest('hex');
  await db.collection('pushTokens').doc(tokenId).set({
    userId,
    token,
    platform: cleanText(request.data.platform || 'unknown', 20),
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

function validateFrontendPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Donnees de requete invalides.');
  }

  const serialized = JSON.stringify(data);
  if (serialized.length > 50_000) {
    throw new HttpsError('invalid-argument', 'Requete trop volumineuse.');
  }
}

const payflowQrValidityMs = 5 * 60 * 1000;
const payflowSupportedCurrencies = new Set(['USD', 'HTG', 'EUR', 'CAD', 'GBP']);

function payflowAmountToMinorUnits(value) {
  const amount = Number(String(value || '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw new HttpsError('invalid-argument', 'Montant QR Payflow invalide.');
  }
  return Math.round(amount * 100);
}

function payflowQrTokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function parsePayflowQrPayload(value) {
  let payload = value;
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value);
    } catch {
      throw new HttpsError('invalid-argument', 'Code QR Payflow illisible.');
    }
  }
  if (!payload || payload.system !== 'OMG-PAYFLOW' || payload.version !== 1) {
    throw new HttpsError('invalid-argument', 'Code QR Payflow non reconnu.');
  }
  const sessionId = cleanText(payload.sessionId, 160);
  const token = cleanText(payload.token, 256);
  if (!sessionId || token.length < 32) {
    throw new HttpsError('invalid-argument', 'Code QR Payflow incomplet.');
  }
  return { sessionId, token };
}

async function readActivePayflowQr(payloadValue) {
  const { sessionId, token } = parsePayflowQrPayload(payloadValue);
  const sessionRef = db.collection('payflowQrSessions').doc(sessionId);
  const snapshot = await sessionRef.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Demande QR Payflow introuvable.');
  const session = snapshot.data();
  if (session.tokenHash !== payflowQrTokenHash(token)) {
    throw new HttpsError('permission-denied', 'Signature QR Payflow invalide.');
  }
  if (session.status !== 'active') {
    throw new HttpsError('failed-precondition', 'Ce QR Payflow a deja ete utilise ou annule.');
  }
  if (!session.expiresAt || session.expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Ce QR Payflow a expire.');
  }
  return { sessionId, token, sessionRef, session };
}

exports.createPayflowQrSessionSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 15,
}, async (request) => {
  const payeeUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  if (request.data.humanConfirmed !== true) {
    throw new HttpsError('failed-precondition', 'La confirmation personnelle du beneficiaire est obligatoire.');
  }
  const currency = normalizeCurrencyCode(request.data.currency || 'USD');
  if (!payflowSupportedCurrencies.has(currency)) {
    throw new HttpsError('invalid-argument', 'Devise QR Payflow non prise en charge.');
  }
  const amountMinor = payflowAmountToMinorUnits(request.data.amount);
  const token = crypto.randomBytes(32).toString('base64url');
  const sessionRef = db.collection('payflowQrSessions').doc();
  const expiresAt = new Date(Date.now() + payflowQrValidityMs);
  await sessionRef.set({
    payeeUserId,
    mode: 'sell',
    amountMinor,
    currency,
    tokenHash: payflowQrTokenHash(token),
    status: 'active',
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null,
    receiptId: null,
    immutable: true,
  });
  return {
    ok: true,
    sessionId: sessionRef.id,
    payload: JSON.stringify({ system: 'OMG-PAYFLOW', version: 1, sessionId: sessionRef.id, token }),
    amount: amountMinor / 100,
    currency,
    expiresAt: expiresAt.toISOString(),
  };
});

exports.inspectPayflowQrSessionSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 15,
}, async (request) => {
  const payerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  const { sessionId, session } = await readActivePayflowQr(request.data.payload);
  if (session.payeeUserId === payerUserId) {
    throw new HttpsError('failed-precondition', 'Vous ne pouvez pas payer votre propre QR.');
  }
  return {
    ok: true,
    sessionId,
    amount: session.amountMinor / 100,
    currency: session.currency,
    payeeReference: crypto.createHash('sha256').update(session.payeeUserId).digest('hex').slice(0, 12),
    expiresAt: session.expiresAt.toDate().toISOString(),
  };
});

exports.redeemPayflowQrSessionSecure = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 20,
}, async (request) => {
  const payerUserId = requireAuth(request);
  validateFrontendPayload(request.data);
  if (request.data.humanConfirmed !== true) {
    throw new HttpsError('failed-precondition', 'La confirmation personnelle du payeur est obligatoire.');
  }
  const parsed = parsePayflowQrPayload(request.data.payload);
  const sessionRef = db.collection('payflowQrSessions').doc(parsed.sessionId);
  const receiptRef = db.collection('payflowQrReceipts').doc();

  const result = await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) throw new HttpsError('not-found', 'Demande QR Payflow introuvable.');
    const session = sessionSnapshot.data();
    if (session.tokenHash !== payflowQrTokenHash(parsed.token)) {
      throw new HttpsError('permission-denied', 'Signature QR Payflow invalide.');
    }
    if (session.status !== 'active') {
      throw new HttpsError('already-exists', 'Ce QR Payflow a deja ete utilise.');
    }
    if (!session.expiresAt || session.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('deadline-exceeded', 'Ce QR Payflow a expire.');
    }
    if (session.payeeUserId === payerUserId) {
      throw new HttpsError('failed-precondition', 'Vous ne pouvez pas payer votre propre QR.');
    }

    const walletId = (userId) => `${userId}_${session.currency}`.replace(/[^A-Za-z0-9_-]/g, '_');
    const payerWalletRef = db.collection('payflowWallets').doc(walletId(payerUserId));
    const payeeWalletRef = db.collection('payflowWallets').doc(walletId(session.payeeUserId));
    const [payerWalletSnapshot, payeeWalletSnapshot] = await Promise.all([
      transaction.get(payerWalletRef),
      transaction.get(payeeWalletRef),
    ]);
    if (!payerWalletSnapshot.exists || payerWalletSnapshot.data().status !== 'active') {
      throw new HttpsError('failed-precondition', 'Portefeuille payeur actif introuvable.');
    }
    const payerBalanceMinor = Number(payerWalletSnapshot.data().balanceMinor || 0);
    if (payerBalanceMinor < session.amountMinor) {
      throw new HttpsError('failed-precondition', 'Solde Payflow insuffisant.');
    }
    const payeeBalanceMinor = payeeWalletSnapshot.exists ? Number(payeeWalletSnapshot.data().balanceMinor || 0) : 0;
    const receipt = {
      sessionId: sessionRef.id,
      payerUserId,
      payeeUserId: session.payeeUserId,
      amountMinor: session.amountMinor,
      currency: session.currency,
      status: 'completed',
      humanConfirmed: true,
      createdAt: FieldValue.serverTimestamp(),
      canDelete: false,
    };
    transaction.update(payerWalletRef, {
      balanceMinor: payerBalanceMinor - session.amountMinor,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(payeeWalletRef, {
      userId: session.payeeUserId,
      currency: session.currency,
      balanceMinor: payeeBalanceMinor + session.amountMinor,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.update(sessionRef, {
      status: 'used',
      usedBy: payerUserId,
      usedAt: FieldValue.serverTimestamp(),
      receiptId: receiptRef.id,
    });
    transaction.set(receiptRef, receipt);
    transaction.set(db.collection('transactionAudit').doc(receiptRef.id), {
      ...buildTransactionAudit({
        userId: payerUserId,
        moduleId: 'payflow',
        action: 'qr_payment',
        amount: session.amountMinor / 100,
        currency: session.currency,
        status: 'completed',
      }),
      receiptId: receiptRef.id,
      payerUserId,
      payeeUserId: session.payeeUserId,
    });
    return { amount: session.amountMinor / 100, currency: session.currency };
  });

  return { ok: true, receiptId: receiptRef.id, status: 'completed', ...result };
});

function createFrontendActionHandler(expectedModule, operation) {
  return onCall({
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 100,
    concurrency: 40,
    invoker: 'public',
  }, async (request) => {
    const userId = requireAuth(request);
    validateFrontendPayload(request.data);

    if (!supportedFrontendModules.has(expectedModule)) {
      throw new HttpsError('failed-precondition', 'Module backend non configure.');
    }

    const requestedModule = cleanText(request.data.moduleId, 40);
    if (requestedModule && requestedModule !== expectedModule) {
      throw new HttpsError('invalid-argument', 'Le module demande ne correspond pas a cette fonction.');
    }

    const action = cleanText(request.data.action || operation);
    const moduleName = cleanText(request.data.moduleName || expectedModule, 100);
    const confirmationRequired = humanConfirmationOperations.has(operation);
    const requestRef = db.collection('moduleActionRequests').doc();

    await requestRef.set({
      userId,
      moduleId: expectedModule,
      moduleTitle: moduleName,
      action,
      operation,
      payload: request.data.payload || {},
      source: cleanText(request.data.source || 'frontend-509', 40),
      status: confirmationRequired ? 'awaiting_human_confirmation' : 'accepted',
      humanConfirmationRequired: confirmationRequired,
      requestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection('moduleWorkflowEvents').add({
      userId,
      moduleId: expectedModule,
      action,
      operation,
      requestId: requestRef.id,
      status: confirmationRequired ? 'awaiting_human_confirmation' : 'accepted',
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info('Frontend module action accepted', {
      userId,
      moduleId: expectedModule,
      operation,
      requestId: requestRef.id,
      humanConfirmationRequired: confirmationRequired,
    });

    return {
      ok: true,
      reference: requestRef.id,
      moduleId: expectedModule,
      operation,
      status: confirmationRequired ? 'awaiting_human_confirmation' : 'accepted',
      humanConfirmationRequired: confirmationRequired,
    };
  });
}

const frontendFunctionContracts = {
  processPayment: 'payflow',
  processWithdrawal: 'payflow',
  calculateFees: 'payflow',
  publishMailportAddress: 'mailport',
  purchaseMailportAddress: 'mailport',
  registerMailportDriver: 'mailport',
  createTracking: 'mailport',
  processOrder: 'store',
  processPropertyPayment: 'property',
  createPropertyContract: 'property',
  processReservation: 'restaurant',
  processRestaurantOrder: 'restaurant',
  updateKitchenStatus: 'restaurant',
  processSchoolPayment: 'school',
  processEnrollment: 'school',
  processMerchantRegistration: 'city',
  calculateTax: 'city',
  processAppointment: 'health',
  recordLabResult: 'health',
  recordVitalSigns: 'health',
  processTeleconsultation: 'health',
  processUniEnrollment: 'university',
  gradeTest: 'university',
  issueCertificate: 'university',
  processTaxReturn: 'tax',
  analyzeTaxDocumentWithAI: 'tax',
  submitIRSReturn: 'tax',
  manageAdministration: 'administration',
  createAuditLog: 'administration',
  generateAdminReport: 'administration',
};

Object.entries(frontendFunctionContracts).forEach(([functionName, moduleId]) => {
  exports[functionName] = createFrontendActionHandler(moduleId, functionName);
});

exports.sendModuleNotification = createFrontendActionHandler('administration', 'sendModuleNotification');

exports.sendBackendNotification = onCall({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 100,
  concurrency: 40,
}, async (request) => {
  const userId = requireAuth(request);
  validateFrontendPayload(request.data);

  const moduleId = cleanText(request.data.moduleId, 40);
  if (!supportedFrontendModules.has(moduleId)) {
    throw new HttpsError('invalid-argument', 'Module de notification invalide.');
  }

  const title = cleanText(request.data.title, 120);
  const body = cleanText(request.data.body, 500);
  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'Titre et message obligatoires.');
  }

  const notificationRef = db.collection('userNotifications').doc();
  await notificationRef.set({
    userId,
    moduleId,
    title,
    body,
    data: request.data.data || {},
    type: 'frontend_notification',
    channels: ['in_app'],
    status: 'created_by_backend',
    createdAt: FieldValue.serverTimestamp(),
  });

  const push = await sendPushToUser(userId, title, body, {
    moduleId,
    notificationId: notificationRef.id,
  });

  return {
    ok: true,
    notificationId: notificationRef.id,
    status: 'created',
    push,
  };
});
