import { callFirebaseFunction, isFirebaseConfigured } from "./firebaseClient.js";
import { requireDemoMode } from "./runtimePolicy.js";

const demoWallet = { balance: 1250, currency: "USD", status: "demo" };
const demoTransactions = [
  { id: "PF-1001", type: "received", amount: 50, currency: "USD" },
  { id: "PF-1002", type: "sent", amount: 25, currency: "USD" }
];

function mockResponse(data) {
  return Promise.resolve({ data: { ...data, mock: true } });
}

function withoutPin(data = {}) {
  const { pin, ...safeData } = data;
  return safeData;
}

export function getWallet() {
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
    return { data: { ...draft, reference: draft.draftId, request: safeData, live: true } };
  }
  requireDemoMode("Le transfert Payflow");
  return mockResponse({ ok: true, reference: "PF-DEMO-SEND", request: withoutPin(data) });
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
    return { data: { ...request, reference: request.requestId, live: true } };
  }
  requireDemoMode("La demande Payflow");
  return mockResponse({ ok: true, reference: "PF-DEMO-REQUEST", request: withoutPin(data) });
}

export async function receiveMoney(data) {
  if (isFirebaseConfigured()) {
    const receipt = await callFirebaseFunction("preparePayflowReceipt", {
      mode: data.mode,
      humanConfirmed: data.confirmed === true
    });
    return { data: { ...receipt, reference: receipt.receiptId, live: true } };
  }
  requireDemoMode("La reception Payflow");
  return mockResponse({ ok: true, reference: "PF-DEMO-RECEIVE", request: withoutPin(data) });
}

export function getTransactions() {
  return Promise.resolve({ data: demoTransactions });
}

export function payService(data) {
  return mockResponse({ ok: true, reference: "PF-DEMO-CHECKOUT", request: withoutPin(data) });
}

export function createQrSession(data) {
  return mockResponse({ ok: true, reference: "PF-DEMO-QR", request: withoutPin(data) });
}

export function payQr(data) {
  return mockResponse({ ok: true, reference: "PF-DEMO-QR-PAY", request: withoutPin(data) });
}
