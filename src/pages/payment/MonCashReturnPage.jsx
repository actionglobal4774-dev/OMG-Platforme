import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { verifyMonCashPayment } from "../../services/backendService";

export default function MonCashReturnPage() {
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Verification du paiement MonCash...");
  const pending = (() => {
    try { return JSON.parse(sessionStorage.getItem("omgMonCashPending") || "null"); } catch { return null; }
  })();
  const destination = pending?.moduleId === "payflow" ? "/payflow" : "/dashboard";

  useEffect(() => {
    if (!pending?.orderId) {
      setStatus("error");
      setMessage("La reference MonCash est absente.");
      return;
    }
    verifyMonCashPayment(pending.orderId)
      .then((result) => {
        if (result.status !== "COMPLETED") throw new Error("Le paiement MonCash n'est pas encore confirme.");
        sessionStorage.removeItem("omgMonCashPending");
        setStatus("completed");
        setMessage(`Paiement MonCash confirme. Reference: ${pending.orderId}`);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error?.message || "MonCash n'a pas pu confirmer le paiement.");
      });
  }, [pending?.orderId]);

  return (
    <main className="min-h-screen bg-black px-5 py-16 text-white">
      <section className="mx-auto max-w-xl rounded-2xl border border-omgGold bg-slate-950 p-8 text-center">
        <h1 className="text-3xl font-bold text-omgGold">MonCash</h1>
        <p className="mt-5 text-lg">{message}</p>
        {status === "processing" && <p className="mt-3 text-sm text-slate-400">Veuillez patienter sans fermer cette page.</p>}
        <Link to={destination} className="mt-8 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">
          Retour a OMG Platforme
        </Link>
      </section>
    </main>
  );
}
