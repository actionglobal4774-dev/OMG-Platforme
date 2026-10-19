import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestMoney } from "../../services/payflowService";

function RequestMoney() {
  const { t } = useTranslation();
  const label = (key, fallback) => t(key, { defaultValue: fallback });
  const [data, setData] = useState({
    payer: "",
    amount: "",
    currency: "USD",
    method: "notification",
    note: "",
    pin: "",
    confirmed: false
  });
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setReference("");

    const amount = Number(data.amount || 0);
    if (!data.payer.trim()) {
      setError(label("payflow_payer_required", "Veuillez entrer le payeur ou choisir un contact."));
      return;
    }

    if (!amount || amount <= 0) {
      setError(label("payflow_amount_required", "Veuillez entrer un montant valide."));
      return;
    }

    if (!/^\d{4}$/.test(data.pin)) {
      setError(label("payflow_pin_required", "Veuillez entrer votre PIN Payflow a 4 chiffres."));
      return;
    }

    if (!data.confirmed) {
      setError(label("payflow_request_confirmation_required", "Veuillez confirmer le payeur, le montant et la methode de demande avant de continuer."));
      return;
    }

    try {
      const response = await requestMoney({ ...data, amount });
      setReference(response.data || null);
    } catch (submissionError) {
      setError(submissionError?.message || "La demande n'a pas pu etre preparee.");
    }
  };

  return (
    <form onSubmit={submit} className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">{label("request_money", "Demander de l'argent")}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input
          className="rounded border border-gray-700 bg-black p-3 text-white"
          placeholder={label("payflow_payer_placeholder", "Email, telephone, Payflow ID ou contact du payeur")}
          value={data.payer}
          onChange={(event) => setData({ ...data, payer: event.target.value })}
        />
        <input
          className="rounded border border-gray-700 bg-black p-3 text-white"
          type="number"
          min="0"
          placeholder={label("payflow_amount_placeholder", "Montant")}
          value={data.amount}
          onChange={(event) => setData({ ...data, amount: event.target.value })}
        />
        <select className="rounded border border-gray-700 bg-black p-3 text-white" value={data.currency} onChange={(event) => setData({ ...data, currency: event.target.value })}>
          <option value="USD">USD</option>
          <option value="HTG">HTG</option>
          <option value="DOP">DOP</option>
          <option value="EUR">EUR</option>
          <option value="XOF">XOF</option>
          <option value="BRL">BRL</option>
        </select>
        <select className="rounded border border-gray-700 bg-black p-3 text-white" value={data.method} onChange={(event) => setData({ ...data, method: event.target.value })}>
          <option value="qr">{label("payflow_request_qr", "Generer un QR de demande")}</option>
          <option value="notification">{label("payflow_request_notification", "Envoyer une notification")}</option>
          <option value="link">{label("payflow_request_link", "Partager un lien de demande")}</option>
        </select>
        <input
          className="rounded border border-gray-700 bg-black p-3 text-white"
          placeholder={label("payflow_note_placeholder", "Motif optionnel")}
          value={data.note}
          onChange={(event) => setData({ ...data, note: event.target.value })}
        />
        <input
          className="rounded border border-gray-700 bg-black p-3 text-white"
          type="password"
          inputMode="numeric"
          maxLength="4"
          placeholder="PIN Payflow"
          value={data.pin}
          onChange={(event) => setData({ ...data, pin: event.target.value })}
        />
      </div>
      <div className="mt-4 rounded-xl border border-omgGold/30 bg-black/40 p-4 text-sm text-gray-200">
        <div>{label("payflow_payer", "Payeur")}: {data.payer || "-"}</div>
        <div>{label("amount", "Montant")}: {Number(data.amount || 0).toFixed(2)} {data.currency}</div>
        <div>{label("request_method", "Methode de demande")}: {data.method}</div>
        <div>{label("payflow_delivery_delay", "Delai estime")}: {label("payflow_request_delay", "Notification ou lien disponible immediatement; paiement selon le moyen choisi par le payeur.")}</div>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-omgGreen/40 bg-green-950/20 p-3 text-sm text-gray-200">
        <input
          type="checkbox"
          className="mt-1"
          checked={data.confirmed}
          onChange={(event) => setData({ ...data, confirmed: event.target.checked })}
        />
        <span>{label("payflow_confirm_request_text", "Je confirme le payeur, le montant et la methode. Cette demande sera envoyee apres ma validation.")}</span>
      </label>
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}
      <button type="submit" className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
        {label("payflow_create_request_now", "Creer la demande maintenant")}
      </button>
      {reference && (
        <div className="mt-4 rounded-xl border border-omgGreen bg-green-950/40 p-3 text-sm font-semibold text-green-200">
          {reference.live ? "Demande enregistree, en attente du paiement du payeur" : label("payflow_payment_request_created", "Demande de demonstration creee")}: {reference.reference} -
          {" "}{label("payflow_delivery_delay", "Delai estime")}: {label("payflow_request_delay", "Notification ou lien disponible immediatement; paiement selon le moyen choisi par le payeur.")}
        </div>
      )}
    </form>
  );
}

export default RequestMoney;
