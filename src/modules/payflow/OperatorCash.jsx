import React, { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PayflowReview from "./PayflowReview";
import PayflowOutcome from "./PayflowOutcome";
import { useTranslation } from "react-i18next";
import { payService } from "../../services/payflowService";

function OperatorCash({ mode = "deposit" }) {
  const { t } = useTranslation();
  const isDeposit = mode === "deposit";
  const [search] = useSearchParams();
  const [draft, setDraft] = useState({ operator: search.get("operator") || "", amount: "", currency: "USD", pin: "", confirmed: false });
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [phase, setPhase] = useState("entry");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    setReference("");
    const amount = Number(draft.amount);
    if (!draft.operator.trim()) {
      setError("Veuillez choisir ou entrer un operateur Payflow.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Veuillez entrer un montant valide.");
      return;
    }
    if (phase === "entry") { setPhase("review"); setDraft((current) => ({ ...current, pin: "", confirmed: false })); return; }
    if (!/^\d{4}$/.test(draft.pin)) {
      setError("Veuillez entrer votre PIN Payflow a 4 chiffres.");
      return;
    }
    if (!draft.confirmed) {
      setError("Veuillez confirmer l'operateur, le montant et le type d'operation.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const response = await payService({ ...draft, amount, operation: mode });
      setReference(response.data || null);
    } catch (submissionError) { setError(submissionError?.message || "Cette opération est indisponible."); }
    finally { pending.current = false; setBusy(false); setDraft((current) => ({ ...current, pin: "", confirmed: false })); }
  };

  if (reference) return <PayflowOutcome result={reference} amount={draft.amount} currency={draft.currency} onRestart={() => { setReference(""); setPhase("entry"); setDraft((current) => ({ ...current, amount: "", pin: "", confirmed: false })); }} />;
  if (phase === "review") return <PayflowReview title={isDeposit ? "Vérifier le dépôt" : "Vérifier le retrait"} rows={[["Opérateur", draft.operator], ["Montant", `${Number(draft.amount).toFixed(2)} ${draft.currency}`], ["Opération", isDeposit ? "Dépôt" : "Retrait"]]} pin={draft.pin} confirmed={draft.confirmed} onPin={(pin) => setDraft((current) => ({ ...current, pin }))} onConfirmed={(confirmed) => setDraft((current) => ({ ...current, confirmed }))} onSubmit={submit} onEdit={() => { setPhase("entry"); setError(""); setDraft((current) => ({ ...current, pin: "", confirmed: false })); }} busy={busy} error={error} />;

  return (
    <form onSubmit={submit} className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">
        {isDeposit ? "Depot operateur" : "Retrait operateur"}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={draft.operator}
          onChange={(event) => setDraft({ ...draft, operator: event.target.value })}
          className="rounded border border-gray-700 bg-black p-3 text-white"
          placeholder="Nom, ID ou emplacement de l'operateur"
        />
        <input
          value={draft.amount}
          onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
          className="rounded border border-gray-700 bg-black p-3 text-white"
          type="number"
          min="0"
          placeholder="Montant"
        />
        <select
          value={draft.currency}
          onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
          className="rounded border border-gray-700 bg-black p-3 text-white"
        >
          <option value="USD">USD</option>
          <option value="HTG">HTG</option>
          <option value="DOP">DOP</option>
          <option value="EUR">EUR</option>
        </select>
        <input
          value={draft.pin}
          onChange={(event) => setDraft({ ...draft, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })}
          className="rounded border border-gray-700 bg-black p-3 text-white"
          type="password"
          hidden
          inputMode="numeric"
          maxLength="4"
          placeholder="PIN Payflow"
        />
      </div>
      <label hidden className="mt-4 items-start gap-3 rounded-xl border border-omgGreen/40 bg-green-950/20 p-3 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={draft.confirmed}
          onChange={(event) => setDraft({ ...draft, confirmed: event.target.checked })}
        />
        <span>Je confirme l'operateur, le montant et cette operation {isDeposit ? "de depot" : "de retrait"}.</span>
      </label>
      {error && <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm font-semibold text-red-100">{error}</div>}
      <button type="submit" className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
        Vérifier les informations
      </button>
      {reference && (
        <div className="mt-4 rounded-xl border border-omgGreen bg-green-950/40 p-3 text-sm font-semibold text-green-200">
          Operation preparee : {reference}
        </div>
      )}
    </form>
  );
}

export default OperatorCash;
