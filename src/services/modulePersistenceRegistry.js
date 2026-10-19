const exactCollectionModules = {
  appointments: "health",
  merchants: "city",
  payments: "payflow",
  receipts: "payflow",
  properties: "property",
  favorites_property: "property",
  cart: "store",
  university_admin_courses: "administration"
};

const prefixCollectionModules = [
  ["payflow_", "payflow"],
  ["mailport_", "mailport"],
  ["store_", "store"],
  ["property_", "property"],
  ["restaurant_", "restaurant"],
  ["school_", "school"],
  ["city_", "city"],
  ["health_", "health"],
  ["travel_", "travel"],
  ["university_", "university"],
  ["tax_", "tax"],
  ["admin_", "administration"]
];

export function getCollectionModule(collectionName) {
  const name = String(collectionName || "");
  if (exactCollectionModules[name]) return exactCollectionModules[name];
  return prefixCollectionModules.find(([prefix]) => name.startsWith(prefix))?.[1] || null;
}

export function getPersistedLocalCollections() {
  if (typeof window === "undefined") return [];
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith("omg_local_"))
    .map((key) => key.slice("omg_local_".length))
    .filter((name) => getCollectionModule(name));
}
