import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PayflowOutcome from "./PayflowOutcome";
import { useTranslation } from "react-i18next";
import { receiveMoney } from "../../services/payflowService";

function ReceiveMoney() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const label = (key, fallback) => t(key, { defaultValue: fallback });
  const [mode, setMode] = useState("message");
  const [pin, setPin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  const confirm = async () => {
    if (pending.current) return;
    setError("");
    setConfirmation("");

    if (!/^\d{4}$/.test(pin)) {
      setError(label("payflow_pin_required", "Veuillez entrer votre PIN Payflow a 4 chiffres."));
      return;
    }

    if (!confirmed) {
      setError(label("payflow_receive_confirmation_required", "Veuillez confirmer le mode de reception avant de continuer."));
      return;
    }

    pending.current = true;
    setBusy(true);
    try {
      const response = await receiveMoney({ mode, pin, confirmed });
      setConfirmation(response.data || null);
    } catch (submissionError) {
      setError(submissionError?.message || "La reception n'a pas pu etre preparee.");
    } finally {
      pending.current = false;
      setBusy(false);
      setPin("");
      setConfirmed(false);
    }
  };

  if (confirmation) return <PayflowOutcome result={confirmation} onRestart={() => { setConfirmation(""); setError(""); }} />;

  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">{t("receive_money")}</h2>
      <p className="mt-3 text-gray-300">{t("payflow_receive_description")}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => setMode("message")} className={`rounded border p-4 text-left ${mode === "message" ? "border-omgGreen text-omgGreen" : "border-omgGold/30 text-gray-200"}`}>
          {label("payflow_receive_messages", "Messages recus")}
        </button>
        <button type="button" onClick={() => navigate("/payflow/qr-payment")} className={`rounded border p-4 text-left ${mode === "qr-sell" ? "border-omgGreen text-omgGreen" : "border-omgGold/30 text-gray-200"}`}>
          QR mode Vendre
        </button>
        <button type="button" onClick={() => navigate("/payflow/transactions")} className={`rounded border p-4 text-left ${mode === "history" ? "border-omgGreen text-omgGreen" : "border-omgGold/30 text-gray-200"}`}>
          {t("history")}
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-omgGold/30 bg-black/40 p-4 text-sm text-gray-200">
        <div>{label("selected_service", "Service choisi")}: {mode}</div>
        <div>{label("payflow_delivery_delay", "Delai estime")}: {mode === "qr-sell" ? label("payflow_qr_receive_delay", "Instantane a 15 minutes apres confirmation QR.") : label("payflow_receive_delay", "Disponible immediatement si un paiement ou une demande est en attente.")}</div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded border border-gray-700 bg-black p-3 text-white"
          type="password"
          inputMode="numeric"
          maxLength="4"
          placeholder={label("payflow_pin", "PIN Payflow")}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        <label className="flex items-start gap-3 rounded-xl border border-omgGreen/40 bg-green-950/20 p-3 text-sm text-gray-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>{label("payflow_confirm_receive_text", "Je confirme que je veux continuer avec ce mode de reception Payflow.")}</span>
        </label>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}
      <button type="button" disabled={busy} onClick={confirm} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-50">
        {label("payflow_confirm_receive_now", "Confirmer la reception")}
      </button>
      {confirmation && (
        <div className="mt-4 rounded-xl border border-omgGreen bg-green-950/40 p-3 text-sm font-semibold text-green-200">
          {confirmation.live ? "Reception preparee, en attente d'un paiement verifie" : label("payflow_receive_ready", "Reception de demonstration preparee")}: {confirmation.reference} -
          {" "}{label("payflow_delivery_delay", "Delai estime")}: {mode === "qr-sell" ? label("payflow_qr_receive_delay", "Instantane a 15 minutes apres confirmation QR.") : label("payflow_receive_delay", "Disponible immediatement si un paiement ou une demande est en attente.")}
        </div>
      )}
    </div>
  );
}

export default ReceiveMoney;
