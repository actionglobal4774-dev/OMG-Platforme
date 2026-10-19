const NOTIFICATIONS_KEY = "omg_notifications_v1";
const PREFERENCES_KEY = "omg_notification_preferences_v1";
const CHANGE_EVENT = "omg:notifications-changed";

export const notificationCategories = [
  "payment",
  "parcel",
  "appointment",
  "tax",
  "order",
  "account",
  "administration"
];

export const defaultNotificationPreferences = {
  enabled: true,
  browser: false,
  payment: true,
  parcel: true,
  appointment: true,
  tax: true,
  order: true,
  account: true,
  administration: true
};

export const mockNotifications = [
  {
    id: "notif-payment-001",
    category: "payment",
    title: "Paiement Payflow confirmé",
    message: "Votre paiement de 45,00 USD à Store Online est terminé.",
    link: "/payflow/transactions",
    createdAt: "2026-07-27T14:35:00.000Z",
    read: false
  },
  {
    id: "notif-parcel-001",
    category: "parcel",
    title: "Colis arrivé",
    message: "Le colis OMG-MP-10025 est prêt à être récupéré.",
    link: "/mailport/tracking",
    createdAt: "2026-07-27T13:10:00.000Z",
    read: false
  },
  {
    id: "notif-health-001",
    category: "appointment",
    title: "Rappel de rendez-vous",
    message: "Rendez-vous avec Dr Smith demain à 10:00.",
    link: "/health-care/appointments",
    createdAt: "2026-07-27T11:00:00.000Z",
    read: false
  },
  {
    id: "notif-tax-001",
    category: "tax",
    title: "Action fiscale requise",
    message: "Un relevé bancaire manque dans votre dossier fiscal 2026.",
    link: "/usa-tax-pro/documents",
    createdAt: "2026-07-26T18:20:00.000Z",
    read: true
  },
  {
    id: "notif-order-001",
    category: "order",
    title: "Commande expédiée",
    message: "La commande Store #10025 a été confiée à Mailport.",
    link: "/store/tracking",
    createdAt: "2026-07-26T15:45:00.000Z",
    read: true
  },
  {
    id: "notif-account-001",
    category: "account",
    title: "Inscription confirmée",
    message: "Votre profil OMG est prêt. Complétez vos préférences.",
    link: "/profile",
    createdAt: "2026-07-25T09:15:00.000Z",
    read: true
  },
  {
    id: "notif-admin-001",
    category: "administration",
    title: "Alerte administrative",
    message: "Deux vérifications de compte nécessitent une revue.",
    link: "/platform-administration/audit",
    createdAt: "2026-07-24T16:30:00.000Z",
    read: true
  }
];

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function getNotifications() {
  const stored = safeRead(NOTIFICATIONS_KEY, null);
  if (Array.isArray(stored)) return stored;
  saveNotifications(mockNotifications);
  return mockNotifications;
}

export function saveNotifications(notifications) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    emitChange();
  }
  return notifications;
}

export function subscribeNotifications(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function getUnreadCount() {
  return getNotifications().filter((item) => !item.read).length;
}

export function addNotification(input) {
  const preferences = getNotificationPreferences();
  if (!preferences.enabled || preferences[input.category] === false) {
    return { ok: false, reason: "category-disabled" };
  }
  const item = {
    id: input.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: input.category || "account",
    title: input.title || "OMG Platforme",
    message: input.message || "",
    link: input.link || "/notifications",
    createdAt: input.createdAt || new Date().toISOString(),
    read: false
  };
  saveNotifications([item, ...getNotifications()]);
  return { ok: true, data: item };
}

export function setNotificationRead(id, read = true) {
  const next = getNotifications().map((item) => item.id === id ? { ...item, read } : item);
  saveNotifications(next);
  return { ok: true, data: next.find((item) => item.id === id) };
}

export function markAllNotificationsRead() {
  return saveNotifications(getNotifications().map((item) => ({ ...item, read: true })));
}

export function deleteNotification(id) {
  saveNotifications(getNotifications().filter((item) => item.id !== id));
  return { ok: true };
}

export function getNotificationPreferences() {
  return {
    ...defaultNotificationPreferences,
    ...safeRead(PREFERENCES_KEY, {})
  };
}

export function saveNotificationPreferences(preferences) {
  const next = { ...defaultNotificationPreferences, ...preferences };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    emitChange();
  }
  return next;
}

export async function notifyUser(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "not-supported" };
  }
  let permission = window.Notification.permission;
  if (permission === "default") permission = await window.Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };
  new window.Notification(title, { body, icon: "./icons/omg-icon-192.png" });
  return { ok: true };
}

export async function notifyModuleUser(moduleId, title, body, data = {}) {
  const local = addNotification({
    category: data.category || "account",
    title,
    message: body,
    link: data.link || `/${moduleId}`
  });
  const preferences = getNotificationPreferences();
  const browser = preferences.browser ? await notifyUser(title, body) : { ok: false, reason: "disabled" };
  return { ok: local.ok || browser.ok, local, browser };
}
