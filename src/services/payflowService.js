import { callFirebaseFunction, isFirebaseConfigured } from "./firebaseClient.js";
import { requireDemoMode } from "./runtimePolicy.js";
import { readPayflowEvents, recordPayflowEvent } from "./payflowJourney.js";

const demoWallet = { balance: 1250, currency: "USD", status: "demo" };

function mockResponse(data) {
  return Promise.resolve({ data: { ...data, mock: true } });
}

function withoutPin(data = {}) {
  const { pin, ...safeData } = data;
  return safeData;
}

export function getWallet() {
  requireDemoMode("La lecture du solde réel Payflow");
  return mockResponse(demoWallet);
}

export async function sendMoney(data) {
  const { pin, receiver, bankAccount, accountHolder, bankCountry, userCountry, ...safeData } = data || {};
  if (isFirebaseConfigured()) {
    const draft = await callFirebaseFunction("validatePayflowTransferDraft", {
      amount: Number(data.amount),
      currency: data.currency,
      recipient: receiver || accountHolder || bankAccount,
      channel: data.method,
      userCountry: userCountry || "HT",
      destinationCountry: bankCountry || userCountry || "HT"
    });
    recordPayflowEvent({ reference: draft.draftId, type: "sent", amount: data.amount, currency: data.currency, status: "awaiting_verification", live: true });
    return { data: { ...draft, reference: draft.draftId, request: safeData, live: true } };
  }
  requireDemoMode("Le transfert Payflow");
  const reference = `PF-DEMO-SEND-${Date.now()}`;
  recordPayflowEvent({ reference, type: "sent", amount: data.amount, currency: data.currency, status: "demo" });
  return mockResponse({ ok: true, reference, request: withoutPin(data) });
}

export async function requestMoney(data) {
  if (isFirebaseConfigured()) {
    const request = await callFirebaseFunction("createPayflowMoneyRequest", {
      amount: Number(data.amount),
      currency: data.currency,
      payerReference: data.payer,
      deliveryMethod: data.method,
      note: data.note,
      humanConfirmed: data.confirmed === true
    });
    recordPayflowEvent({ reference: request.requestId, type: "request", amount: data.amount, currency: data.currency, status: "awaiting_payment", live: true });
    return { data: { ...request, reference: request.requestId, live: true } };
  }
  requireDemoMode("La demande Payflow");
  const reference = `PF-DEMO-REQUEST-${Date.now()}`;
  recordPayflowEvent({ reference, type: "request", amount: data.amount, currency: data.currency, status: "demo" });
  return mockResponse({ ok: true, reference, request: withoutPin(data) });
}

export async function receiveMoney(data) {
  if (isFirebaseConfigured()) {
    const receipt = await callFirebaseFunction("preparePayflowReceipt", {
      mode: data.mode,
      humanConfirmed: data.confirmed === true
    });
    recordPayflowEvent({ reference: receipt.receiptId, type: "receive", status: "awaiting_payment", live: true });
    return { data: { ...receipt, reference: receipt.receiptId, live: true } };
  }
  requireDemoMode("La reception Payflow");
  const reference = `PF-DEMO-RECEIVE-${Date.now()}`;
  recordPayflowEvent({ reference, type: "receive", status: "demo" });
  return mockResponse({ ok: true, reference, request: withoutPin(data) });
}

export function getTransactions() {
  return Promise.resolve({ data: readPayflowEvents(), source: "local_journey" });
}

export function payService(data) {
  requireDemoMode("Le paiement Payflow");
  const reference = `PF-DEMO-CHECKOUT-${Date.now()}`;
  recordPayflowEvent({ reference, type: data.operation || "payment", amount: data.amount, currency: data.currency, status: "demo" });
  return mockResponse({ ok: true, reference, request: withoutPin(data) });
}

export function createQrSession(data) {
  return mockResponse({ ok: true, reference: "PF-DEMO-QR", request: withoutPin(data) });
}

export function payQr(data) {
  return mockResponse({ ok: true, reference: "PF-DEMO-QR-PAY", request: withoutPin(data) });
}
