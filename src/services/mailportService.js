const ADDRESS_KEY = "omg_mailport_reference_addresses";
const PACKAGE_KEY = "omg_mailport_packages";

const seedAddresses = [
  {
    id: "MP-ADDR-HT-PAP-001",
    ownerName: "Jean Adresse",
    country: "Haiti",
    city: "Port-au-Prince",
    zone: "Delmas",
    street: "Rue Faustin 1er",
    postalCode: "HT6120",
    addressType: "Maison familiale",
    description: "Adresse referentielle disponible pour reception de petits colis.",
    photoName: "adresse-delmas-demo.jpg",
    ownerPhotoName: "proprietaire-demo.jpg",
    status: "available",
    priceUsd: 4.99,
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "MP-ADDR-SN-DKR-001",
    ownerName: "Fatou Relais",
    country: "Senegal",
    city: "Dakar",
    zone: "Medina",
    street: "Avenue Blaise Diagne",
    postalCode: "12000",
    addressType: "Point relais particulier",
    description: "Adresse referentielle proche du centre-ville.",
    photoName: "adresse-dakar-demo.jpg",
    ownerPhotoName: "proprietaire-dakar-demo.jpg",
    status: "available",
    priceUsd: 4.99,
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "MP-ADDR-US-BOS-001",
    ownerName: "OMG Boston Point",
    country: "United States",
    city: "Boston",
    zone: "Mattapan",
    street: "Blue Hill Avenue",
    postalCode: "02126",
    addressType: "Adresse referentielle urbaine",
    description: "Point Mailport de demonstration pour achats et reception.",
    photoName: "adresse-boston-demo.jpg",
    ownerPhotoName: "proprietaire-boston-demo.jpg",
    status: "available",
    priceUsd: 4.99,
    createdAt: "2026-07-01T00:00:00.000Z"
  }
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Le mode local ne doit jamais bloquer la navigation de l'utilisateur.
  }
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function getMailportAddresses() {
  const saved = readJson(ADDRESS_KEY, null);
  if (Array.isArray(saved) && saved.length) return saved;
  writeJson(ADDRESS_KEY, seedAddresses);
  return seedAddresses;
}

export function searchMailportAddresses(filters = {}) {
  const values = {
    country: normalize(filters.country),
    city: normalize(filters.city),
    zone: normalize(filters.zone),
    street: normalize(filters.street),
    postalCode: normalize(filters.postalCode)
  };

  return getMailportAddresses().filter((address) => (
    (!values.country || normalize(address.country).includes(values.country)) &&
    (!values.city || normalize(address.city).includes(values.city)) &&
    (!values.zone || normalize(address.zone).includes(values.zone)) &&
    (!values.street || normalize(address.street).includes(values.street)) &&
    (!values.postalCode || normalize(address.postalCode).includes(values.postalCode))
  ));
}

export function publishMailportAddress(profile, form) {
  const address = {
    id: createId("MP-ADDR"),
    ownerName: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || form.ownerName || "Proprietaire Mailport",
    country: form.country || profile?.country || "",
    city: form.city || "",
    zone: form.zone || "",
    street: form.street || "",
    postalCode: form.postalCode || "",
    addressType: form.addressType || "",
    description: form.description || "",
    photoName: form.photoName || "",
    ownerPhotoName: form.ownerPhotoName || "",
    status: "available",
    priceUsd: 4.99,
    createdAt: new Date().toISOString()
  };
  const next = [address, ...getMailportAddresses()];
  writeJson(ADDRESS_KEY, next);
  return address;
}

export function purchaseMailportAddress(profile, address, paymentMethod = "Payflow") {
  const purchase = {
    id: createId("MP-PURCHASE"),
    addressId: address.id,
    buyerName: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Acheteur Mailport",
    buyerEmail: profile?.email || "",
    country: address.country,
    city: address.city,
    street: address.street,
    postalCode: address.postalCode,
    amountUsd: address.priceUsd || 4.99,
    paymentMethod,
    qrCode: createId("MP-QR"),
    status: "paid-address-ready",
    createdAt: new Date().toISOString()
  };
  const packages = readJson(PACKAGE_KEY, []);
  writeJson(PACKAGE_KEY, [purchase, ...packages]);
  return purchase;
}

export function getMailportPackages() {
  return readJson(PACKAGE_KEY, []);
}

export function createMailportPackageStep(profile, action, form = {}) {
  const step = {
    id: createId("MP-STEP"),
    action,
    actorName: `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Utilisateur Mailport",
    trackingId: form.trackingId || createId("MP-TRACK"),
    packageQr: form.packageQr || createId("MP-PKG-QR"),
    fromLocation: form.fromLocation || "",
    toLocation: form.toLocation || "",
    photoName: form.photoName || "",
    signatureName: form.signatureName || "",
    status: "confirmed",
    createdAt: new Date().toISOString()
  };
  const packages = readJson(PACKAGE_KEY, []);
  writeJson(PACKAGE_KEY, [step, ...packages]);
  return step;
}
