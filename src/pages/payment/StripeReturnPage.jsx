import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { completeSecureMailportAddressPurchaseExternal, completeSecureStoreOrderExternal, verifyStripeCheckoutSession } from "../../services/backendService";
import { saveCollection, upsertItem } from "../../services/localActionService";

export default function StripeReturnPage({ cancelled = false }) {
  const location = useLocation();
  const [message, setMessage] = useState(cancelled
    ? "Le paiement par carte a ete annule. Aucun nouveau paiement n'a ete confirme."
    : "Verification securisee du paiement par carte...");
  const [pending] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("omgStripePending") || "null"); } catch { return null; }
  });
  const destination = pending?.moduleId === "payflow" ? "/payflow" : pending?.moduleId === "mailport" ? "/mailport" : pending?.moduleId === "store" ? "/store" : "/dashboard";

  useEffect(() => {
    if (cancelled) {
      sessionStorage.removeItem("omgStripePending");
      return;
    }
    const sessionId = new URLSearchParams(location.search).get("session_id");
    if (!sessionId) {
      setMessage("La reference Stripe est absente.");
      return;
    }
    verifyStripeCheckoutSession(sessionId)
      .then(async (result) => {
        if (!result.completed) throw new Error("Le paiement par carte n'est pas encore confirme.");
        if (pending?.moduleId === "mailport" && pending?.purchaseId) {
          await completeSecureMailportAddressPurchaseExternal({ purchaseId: pending.purchaseId, provider: "stripe", providerPaymentId: sessionId });
        }
        if (pending?.moduleId === "store" && pending?.storeOrderId) {
          const storeResult = await completeSecureStoreOrderExternal({ orderId: pending.storeOrderId, provider: "stripe", providerPaymentId: sessionId });
          upsertItem("store_orders", { id: storeResult.orderId, total: storeResult.total, status: storeResult.status, packageId: storeResult.packageId, mailportStatus: storeResult.mailportStatus });
          saveCollection("cart", []);
        }
        sessionStorage.removeItem("omgStripePending");
        setMessage(`Paiement par carte confirme. Reference : ${sessionId}`);
      })
      .catch((error) => setMessage(error?.message || "Stripe n'a pas pu confirmer le paiement."));
  }, [cancelled, location.search, pending?.purchaseId, pending?.storeOrderId]);

  return (
    <main className="min-h-screen bg-black px-4 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-omgGold/50 bg-slate-950 p-8 text-center">
        <h1 className="text-3xl font-bold text-omgGold">Paiement par carte</h1>
        <p className="mt-5 text-slate-200">{message}</p>
        <Link to={destination} className="mt-6 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Retour au tableau de bord</Link>
      </section>
    </main>
  );
}
