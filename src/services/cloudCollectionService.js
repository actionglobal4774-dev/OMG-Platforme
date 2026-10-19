import { callFirebaseFunction, isFirebaseConfigured } from "./firebaseClient.js";

function requireCloud() {
  if (!isFirebaseConfigured()) throw new Error("Firebase doit etre configure pour synchroniser les donnees.");
}

export async function listCloudCollection(moduleId, collectionName) {
  requireCloud();
  const result = await callFirebaseFunction("listUserModuleCollection", { moduleId, collectionName });
  return (result.items || []).filter((item) => !item.deleted);
}

export async function upsertCloudItem(moduleId, collectionName, item) {
  requireCloud();
  const itemId = item?.id ? String(item.id) : undefined;
  return callFirebaseFunction("upsertUserModuleItem", { moduleId, collectionName, itemId, item });
}

export async function softDeleteCloudItem(moduleId, collectionName, itemId) {
  requireCloud();
  return callFirebaseFunction("softDeleteUserModuleItem", { moduleId, collectionName, itemId: String(itemId) });
}
