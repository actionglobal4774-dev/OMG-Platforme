import React from "react";
import { Link } from "react-router-dom";

export default function PayflowOutcome({ result, amount, currency = "USD", onRestart }) {
  if (!result) return null;
  const reference = result.reference || result.receiptId || result.requestId;
  return <section aria-label="Résultat Payflow" className="mt-5 rounded-xl border border-omgGreen p-5 text-white">
    <h2 className="text-xl font-bold text-omgGold">{result.live ? result.status === "completed" ? "Paiement confirmé par le serveur" : "Demande préparée par le serveur" : "Résultat de démonstration"}</h2>
    <p className="mt-3">Référence : {reference || "Non disponible"}</p>
    {amount !== undefined && <p>Montant : {Number(amount).toFixed(2)} {currency}</p>}
    <p className="mt-2">{result.live ? "Consultez le statut avant de considérer les fonds comme transférés ou reçus." : "Cette démonstration ne déplace aucun fonds réel."}</p>
    <nav aria-label="Suite du parcours Payflow" className="mt-4 flex flex-wrap gap-3">
      <Link to="/payflow/transactions" className="rounded border px-3 py-2">Consulter l'historique</Link>
      {reference && <Link to={`/payflow/track-transfer?reference=${encodeURIComponent(reference)}`} className="rounded border px-3 py-2">Suivre cette référence</Link>}
      <Link to="/payflow/wallet" className="rounded border px-3 py-2">Portefeuille</Link>
      {onRestart && <button type="button" onClick={onRestart} className="rounded bg-omgGreen px-3 py-2 font-bold">Nouvelle opération</button>}
    </nav>
  </section>;
}
