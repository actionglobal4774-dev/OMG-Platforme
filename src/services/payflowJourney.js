import { getStoredFirebaseUser } from "./firebaseClient.js";

export function buildPayflowEvent(event) {
  const amount = Number(event.amount || 0);
  if (!event.reference || !Number.isFinite(amount) || amount < 0) throw new Error("Référence ou montant Payflow invalide.");
  return {
    id: String(event.reference), reference: String(event.reference),
    type: String(event.type || "prepared"), amount,
    currency: String(event.currency || "USD"),
    status: event.status === "completed" && event.live !== true ? "prepared" : ["completed", "awaiting_payment", "awaiting_verification", "prepared", "demo"].includes(event.status) ? event.status : "prepared",
    live: event.live === true,
    createdAt: event.createdAt || new Date().toISOString()
  };
}

export function createPayflowJourneyStore(storage, accountId) {
  const key = `omg_payflow_journey_${accountId || "anonymous"}`;
  const read = () => {
    try { const rows = JSON.parse(storage.getItem(key) || "[]"); return Array.isArray(rows) ? rows.map(buildPayflowEvent) : []; }
    catch { return []; }
  };
  return {
    read,
    record(event) {
      const safe = buildPayflowEvent(event);
      const rows = [safe, ...read().filter((item) => item.id !== safe.id)].slice(0, 100);
      try { storage.setItem(key, JSON.stringify(rows)); return { saved: true, event: safe }; }
      catch { return { saved: false, event: safe }; }
    }
  };
}

function currentStore() {
  if (typeof localStorage === "undefined") return null;
  return createPayflowJourneyStore(localStorage, getStoredFirebaseUser()?.uid);
}
export function recordPayflowEvent(event) { try { return currentStore()?.record(event); } catch { return { saved: false }; } }
export function readPayflowEvents() { try { return currentStore()?.read() || []; } catch { return []; } }
