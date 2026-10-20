const allRoles = ["owner", "buyer", "sender", "carrier", "admin"];
export const mailportSections = {
  "address-search": { title: "Recherche d'adresse", action: "Chercher adresse", roles: allRoles },
  "my-address": { title: "Mon adresse et mon QR", action: "Voir QR adresse", roles: ["owner", "buyer", "admin"] },
  "create-address": { title: "Créer une adresse Mailport", action: "Publier adresse gratuitement", roles: ["owner", "admin"] },
  tracking: { title: "Suivi de colis", action: "Suivre colis", roles: allRoles },
  history: { title: "Historique des colis", kind: "history", roles: allRoles },
  driver: { title: "Espace livreur", action: "Missions disponibles", roles: ["carrier", "admin"] },
  delivery: { title: "Livraison et remise", action: "Livrer colis", roles: ["owner", "carrier", "admin"] },
  messages: { title: "Messagerie Mailport", kind: "messages", roles: allRoles },
  claims: { title: "Réclamations", kind: "claims", roles: allRoles },
  map: { title: "Carte et localisation", kind: "map", roles: allRoles },
  settings: { title: "Paramètres Mailport", kind: "settings", roles: allRoles },
  support: { title: "Aide et support", kind: "support", roles: allRoles }
};

const variants = {
  buy: { section: "address-search", title: "Acheter une adresse", action: "Acheter adresse", roles: ["buyer", "admin"] },
  change: { section: "address-search", title: "Changer d'adresse", action: "Changer adresse", roles: ["buyer", "admin"] },
  photos: { section: "create-address", title: "Photos de mon adresse", action: "Ajouter photos adresse", roles: ["owner", "admin"] },
  application: { section: "driver", title: "Candidature livreur", action: "Candidature", roles: ["carrier", "admin"] },
  earnings: { section: "driver", title: "Gains du livreur", action: "Gains", roles: ["carrier", "admin"] },
  revenue: { section: "my-address", title: "Revenus de mon adresse", action: "Revenus", roles: ["owner", "admin"] },
  pickup: { section: "delivery", title: "Récupérer un colis", action: "Recuperer colis", roles: ["carrier", "admin"] },
  receive: { section: "delivery", title: "Recevoir un colis", action: "Recevoir colis", roles: ["owner", "admin"] }
};

const actionPaths = {
  "Publier adresse gratuitement": "/mailport/create-address",
  "Ajouter photos adresse": "/mailport/create-address?view=photos",
  "Recevoir colis": "/mailport/delivery?view=receive",
  "Livrer colis": "/mailport/delivery",
  Revenus: "/mailport/my-address?view=revenue",
  "Chercher adresse": "/mailport/address-search",
  "Acheter adresse": "/mailport/address-search?view=buy",
  "Voir QR adresse": "/mailport/my-address",
  "Changer adresse": "/mailport/address-search?view=change",
  "Suivre colis": "/mailport/tracking",
  Candidature: "/mailport/driver?view=application",
  "Missions disponibles": "/mailport/driver",
  "Recuperer colis": "/mailport/delivery?view=pickup",
  Gains: "/mailport/driver?view=earnings",
  Livraisons: "/mailport/delivery"
};

export function getMailportActionPath(action) {
  return Object.hasOwn(actionPaths, action) ? actionPaths[action] : null;
}

export function getMailportSection(section, view = "") {
  if (!Object.hasOwn(mailportSections, section)) return null;
  if (!view) return mailportSections[section];
  return Object.hasOwn(variants, view) && variants[view].section === section ? variants[view] : null;
}

export function getMailportRole(profile) {
  const value = String(profile?.userType || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("livreur") || value.includes("carrier")) return "carrier";
  if (value.includes("propriet") || value.includes("owner")) return "owner";
  if (value.includes("acheteur") || value.includes("buyer")) return "buyer";
  return null;
}

export function mailportReferenceLink(section, reference) {
  const query = new URLSearchParams();
  if (reference) query.set("reference", reference);
  return `/mailport/${section}${query.size ? `?${query}` : ""}`;
}
