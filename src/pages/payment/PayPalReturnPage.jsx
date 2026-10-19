import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { capturePayPalOrder, completeSecureMailportAddressPurchaseExternal, completeSecureStoreOrderExternal } from "../../services/backendService";
import { saveCollection, upsertItem } from "../../services/localActionService";

export default function PayPalReturnPage({ cancelled = false }) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(cancelled ? "cancelled" : "processing");
  const [message, setMessage] = useState(cancelled ? "Le paiement PayPal a ete annule. Aucun montant n'a ete capture." : "Confirmation du paiement PayPal...");
  const [pending] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("omgPayPalPending") || "null"); } catch { return null; }
  });
  const destination = pending?.moduleId === "payflow" ? "/payflow" : pending?.moduleId === "mailport" ? "/mailport" : pending?.moduleId === "store" ? "/store" : "/dashboard";

  useEffect(() => {
    if (cancelled) {
      sessionStorage.removeItem("omgPayPalPending");
      return;
    }
    const orderId = searchParams.get("token") || pending?.orderId;
    if (!orderId || (pending?.orderId && pending.orderId !== orderId)) {
      setStatus("error");
      setMessage("La reference PayPal est absente ou ne correspond pas a la demande initiale.");
      return;
    }
    capturePayPalOrder(orderId)
      .then(async (result) => {
        if (result.status !== "COMPLETED") throw new Error(`Statut PayPal inattendu: ${result.status || "inconnu"}`);
        if (pending?.moduleId === "mailport" && pending?.purchaseId) {
          await completeSecureMailportAddressPurchaseExternal({ purchaseId: pending.purchaseId, provider: "paypal", providerPaymentId: orderId });
        }
        if (pending?.moduleId === "store" && pending?.storeOrderId) {
          const storeResult = await completeSecureStoreOrderExternal({ orderId: pending.storeOrderId, provider: "paypal", providerPaymentId: orderId });
          upsertItem("store_orders", { id: storeResult.orderId, total: storeResult.total, status: storeResult.status, packageId: storeResult.packageId, mailportStatus: storeResult.mailportStatus });
          saveCollection("cart", []);
        }
        sessionStorage.removeItem("omgPayPalPending");
        setStatus("completed");
        setMessage(`Paiement PayPal confirme. Reference: ${orderId}`);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error?.message || "PayPal n'a pas pu confirmer le paiement.");
      });
  }, [cancelled, pending?.orderId, pending?.storeOrderId, searchParams]);

  return (
    <main className="min-h-screen bg-black px-5 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-omgGold bg-slate-950 p-8 text-center">
        <h1 className="text-3xl font-bold text-omgGold">PayPal</h1>
        <p className="mt-5 text-lg">{message}</p>
        {status === "processing" && <p className="mt-3 text-sm text-slate-400">Veuillez patienter sans fermer cette page.</p>}
        <Link to={destination} className="mt-8 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">
          Retour a OMG Platforme
        </Link>
      </section>
    </main>
  );
}
