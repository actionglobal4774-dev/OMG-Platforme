import { addNotification } from "./notificationService.js";
import { getCollectionModule } from "./modulePersistenceRegistry.js";
import { requireDemoMode } from "./runtimePolicy.js";
import { isFirebaseConfigured } from "./firebaseClient.js";
import { prepareModulePayment as prepareServerPayment } from "./backendService.js";

const PREFIX = "omg_local_";

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(`${PREFIX}${key}`) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  }
  return value;
}

function result(data, message) {
  return { ok: true, data, message, savedAt: new Date().toISOString() };
}

function syncCloudItem(collectionName, item) {
  const moduleId = getCollectionModule(collectionName);
  if (!moduleId || !item?.id) return;
  void import("./cloudCollectionService.js")
    .then(({ upsertCloudItem }) => upsertCloudItem(moduleId, collectionName, item))
    .catch(() => null);
}

export function getCollection(name) {
  return read(name, []);
}

export function saveCollection(name, items) {
  const saved = write(name, items);
  if (Array.isArray(items)) items.forEach((item) => syncCloudItem(name, item));
  return saved;
}

export function upsertItem(name, item) {
  if (!item || typeof item !== "object") return { ok: false, error: "Données invalides." };
  const items = getCollection(name);
  const nextItem = {
    ...item,
    id: item.id || `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    updatedAt: new Date().toISOString()
  };
  const index = items.findIndex((entry) => entry.id === nextItem.id);
  const next = index >= 0
    ? items.map((entry) => entry.id === nextItem.id ? nextItem : entry)
    : [nextItem, ...items];
  saveCollection(name, next);
  return result(nextItem, "Enregistrement local réussi.");
}

export function removeItem(name, id) {
  saveCollection(name, getCollection(name).filter((item) => item.id !== id));
  const moduleId = getCollectionModule(name);
  if (moduleId && id) {
    void import("./cloudCollectionService.js")
      .then(({ softDeleteCloudItem }) => softDeleteCloudItem(moduleId, name, id))
      .catch(() => null);
  }
  return result(id, "Élément supprimé localement.");
}

export function toggleFavorite(entityType, item) {
  const key = `favorites_${entityType}`;
  const items = getCollection(key);
  const exists = items.some((entry) => entry.id === item.id);
  const next = exists ? items.filter((entry) => entry.id !== item.id) : [item, ...items];
  saveCollection(key, next);
  return result({ favorite: !exists, items: next }, !exists ? "Ajouté aux favoris." : "Retiré des favoris.");
}

export function addToCart(product, quantity = 1) {
  const cart = getCollection("cart");
  const existing = cart.find((item) => item.id === product.id);
  const next = existing
    ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
    : [...cart, { ...product, quantity }];
  saveCollection("cart", next);
  return result(next, "Produit ajouté au panier.");
}

export function updateCartQuantity(id, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, error: "Quantité invalide." };
  const next = getCollection("cart")
    .map((item) => item.id === id ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0);
  saveCollection("cart", next);
  return result(next, "Panier mis à jour.");
}

export function saveAppointment(appointment) {
  const response = upsertItem("appointments", {
    status: "Confirmed",
    ...appointment
  });
  if (response.ok) {
    addNotification({
      category: "appointment",
      title: "Rendez-vous confirmé",
      message: `${response.data.provider || "Votre professionnel"} · ${response.data.date || "date à confirmer"}`,
      link: "/health-care/appointments"
    });
  }
  return response;
}

export function changeAppointment(id, status, changes = {}) {
  const items = getCollection("appointments");
  const current = items.find((item) => item.id === id);
  if (!current) return { ok: false, error: "Rendez-vous introuvable." };
  return upsertItem("appointments", { ...current, ...changes, status });
}

export function registerMerchant(merchant) {
  const response = upsertItem("merchants", { status: "Active", ...merchant });
  if (response.ok) {
    addNotification({
      category: "administration",
      title: "Commerçant enregistré",
      message: `${response.data.name || "Nouveau commerçant"} a été ajouté au registre local.`,
      link: "/city-administration/directory"
    });
  }
  return response;
}

export function simulatePayment(payment) {
  requireDemoMode("Le paiement");
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Montant de paiement invalide." };
  const transaction = {
    ...payment,
    amount,
    id: payment.id || `OMG-PF-${Date.now().toString().slice(-8)}`,
    status: "completed",
    createdAt: new Date().toISOString()
  };
  const response = upsertItem("payments", transaction);
  addNotification({
    category: "payment",
    title: "Paiement simulé réussi",
    message: `${amount.toFixed(2)} ${payment.currency || "USD"} · ${payment.label || "Service OMG"}`,
    link: "/payflow/transactions"
  });
  return response;
}

export async function prepareModulePayment(payment) {
  if (isFirebaseConfigured()) {
    const prepared = await prepareServerPayment(payment);
    return {
      ok: true,
      live: true,
      data: {
        id: prepared.paymentId,
        amount: prepared.totalToPay,
        currency: payment.currency || "USD",
        status: "prepared",
        paymentProviders: prepared.paymentProviders
      }
    };
  }
  requireDemoMode("Le paiement");
  return simulatePayment(payment);
}

export function generateReceipt(payment) {
  if (!payment?.id) return { ok: false, error: "Paiement requis pour générer le reçu." };
  return upsertItem("receipts", {
    id: `receipt-${payment.id}`,
    transactionId: payment.id,
    amount: payment.amount,
    currency: payment.currency || "USD",
    label: payment.label || "Service OMG",
    issuedAt: new Date().toISOString()
  });
}

export function saveProfile(profile) {
  const data = { ...read("profile", {}), ...profile, updatedAt: new Date().toISOString() };
  write("profile", data);
  return result(data, "Profil enregistré localement.");
}

export function getProfile() {
  return read("profile", {
    firstName: "Frederic",
    lastName: "Cineus",
    country: "United States",
    userType: "International User",
    verificationLevel: 2,
    currency: "USD"
  });
}

export function saveDraft(type, data) {
  write(`draft_${type}`, { ...data, savedAt: new Date().toISOString() });
  return result(data, "Brouillon sauvegardé.");
}

export function loadDraft(type) {
  return read(`draft_${type}`, null);
}

export function savePreferences(scope, preferences) {
  const data = { ...read(`preferences_${scope}`, {}), ...preferences };
  write(`preferences_${scope}`, data);
  return result(data, "Préférences enregistrées.");
}

export function queryItems(items, options = {}) {
  const {
    search = "",
    filters = {},
    sortBy,
    sortDirection = "asc",
    page = 1,
    pageSize = 10
  } = options;
  const normalizedSearch = search.trim().toLowerCase();
  let resultItems = [...items];
  if (normalizedSearch) {
    resultItems = resultItems.filter((item) =>
      Object.values(item).some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      resultItems = resultItems.filter((item) => String(item[key]) === String(value));
    }
  });
  if (sortBy) {
    resultItems.sort((a, b) => {
      const left = a[sortBy];
      const right = b[sortBy];
      const order = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left ?? "").localeCompare(String(right ?? ""));
      return sortDirection === "desc" ? -order : order;
    });
  }
  const total = resultItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: resultItems.slice(start, start + pageSize),
    total,
    page: currentPage,
    pageSize,
    totalPages
  };
}
