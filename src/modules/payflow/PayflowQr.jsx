import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import {
  createSecurePayflowQr,
  inspectSecurePayflowQr,
  redeemSecurePayflowQr
} from "../../services/backendService";

function PayflowQr() {
  const { t } = useTranslation();
  const label = (key, fallback) => t(key, { defaultValue: fallback });
  const [mode, setMode] = useState("sell");
  const [sell, setSell] = useState({ amount: "", currency: "USD", pin: "", confirmed: false });
  const [buy, setBuy] = useState({ payload: "", pin: "", confirmed: false });
  const [session, setSession] = useState(null);
  const [quote, setQuote] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const stopCamera = () => {
    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const createSellerQr = async () => {
    const amount = Number(String(sell.amount || "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus(label("payflow_qr_amount_required", "Entrez un montant valide avant de creer le QR."));
      return;
    }
    if (!/^\d{4}$/.test(sell.pin)) {
      setStatus(label("payflow_qr_pin_required", "Entrez votre PIN Payflow a 4 chiffres."));
      return;
    }
    if (!sell.confirmed) {
      setStatus(label("payflow_qr_human_confirmation", "Confirmez personnellement le montant, la devise et le beneficiaire."));
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const result = await createSecurePayflowQr({ amount, currency: sell.currency, humanConfirmed: true });
      setSession(result);
      setStatus(label("payflow_qr_sell_ready", "QR Vendre actif. Il peut recevoir une seule fois pendant cinq minutes."));
    } catch (error) {
      setStatus(error?.message || label("payflow_qr_retry", "Creation du QR impossible."));
    } finally {
      setLoading(false);
      setSell((current) => ({ ...current, pin: "" }));
    }
  };

  const inspectQr = async (payloadValue = buy.payload) => {
    const payload = String(payloadValue || "").trim();
    if (!payload) {
      setStatus(label("payflow_qr_scan_required", "Scannez ou collez un QR Payflow."));
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const result = await inspectSecurePayflowQr(payload);
      setBuy((current) => ({ ...current, payload }));
      setQuote(result);
      setReceipt(null);
      setStatus(label("payflow_qr_checked", "QR verifie. Controlez le montant et le beneficiaire avant de payer."));
      stopCamera();
    } catch (error) {
      setQuote(null);
      setStatus(error?.message || label("payflow_qr_invalid", "QR Payflow invalide ou expire."));
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      setStatus(label("payflow_qr_camera_unavailable", "Le scanner camera n'est pas disponible ici. Collez le contenu du QR."));
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const codes = await detector.detect(videoRef.current).catch(() => []);
        const rawValue = codes[0]?.rawValue;
        if (rawValue) await inspectQr(rawValue);
      }, 700);
    } catch {
      stopCamera();
      setStatus(label("payflow_qr_camera_denied", "Camera indisponible ou permission refusee."));
    }
  };

  const payQr = async () => {
    if (!quote) {
      setStatus(label("payflow_qr_verify_first", "Verifiez le QR avant de payer."));
      return;
    }
    if (!/^\d{4}$/.test(buy.pin)) {
      setStatus(label("payflow_qr_pin_required", "Entrez votre PIN Payflow a 4 chiffres."));
      return;
    }
    if (!buy.confirmed) {
      setStatus(label("payflow_qr_payment_confirmation", "Confirmez personnellement le beneficiaire, le montant et la devise."));
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const result = await redeemSecurePayflowQr({ payload: buy.payload, humanConfirmed: true });
      setReceipt(result);
      setQuote(null);
      setStatus(label("payflow_qr_paid", "Paiement QR termine. Le QR est maintenant inutilisable."));
    } catch (error) {
      setStatus(error?.message || label("payflow_qr_payment_failed", "Paiement QR impossible."));
    } finally {
      setLoading(false);
      setBuy((current) => ({ ...current, pin: "", confirmed: false }));
    }
  };

  return (
    <section className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">{label("payflow_use_qr", "Utiliser le QR Payflow")}</h2>
      <p className="mt-2 text-sm text-gray-300">
        {label("payflow_qr_rule", "Vendre genere une demande a recevoir. Acheter scanne cette demande et paie seulement apres confirmation humaine.")}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => { stopCamera(); setMode("sell"); setStatus(""); }} className={`rounded border p-4 font-bold ${mode === "sell" ? "border-omgGreen text-omgGreen" : "border-omgGold/30 text-gray-200"}`}>
          {label("payflow_qr_sell", "Vendre / recevoir")}
        </button>
        <button type="button" onClick={() => { setMode("buy"); setStatus(""); }} className={`rounded border p-4 font-bold ${mode === "buy" ? "border-omgGreen text-omgGreen" : "border-omgGold/30 text-gray-200"}`}>
          {label("payflow_qr_buy", "Acheter / payer")}
        </button>
      </div>

      {mode === "sell" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="rounded-xl bg-white p-5 text-center">
            {session ? <QRCodeSVG value={session.payload} size={176} /> : <div className="flex h-44 items-center justify-center text-sm font-bold text-slate-600">QR en attente</div>}
            <p className="mt-3 break-all text-xs font-bold text-slate-700">{session?.sessionId || "—"}</p>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded border border-gray-700 bg-black p-3 text-white" type="number" min="0.01" step="0.01" placeholder={label("payflow_seller_amount", "Montant a recevoir")} value={sell.amount} onChange={(event) => setSell({ ...sell, amount: event.target.value, confirmed: false })} />
              <select className="rounded border border-gray-700 bg-black p-3 text-white" value={sell.currency} onChange={(event) => setSell({ ...sell, currency: event.target.value, confirmed: false })}>
                {["USD", "HTG", "EUR", "CAD", "GBP"].map((currency) => <option key={currency}>{currency}</option>)}
              </select>
              <input className="rounded border border-gray-700 bg-black p-3 text-white" type="password" inputMode="numeric" maxLength="4" placeholder="PIN Payflow" value={sell.pin} onChange={(event) => setSell({ ...sell, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </div>
            <label className="flex gap-3 rounded border border-omgGold/30 p-3 text-sm text-gray-200">
              <input type="checkbox" checked={sell.confirmed} onChange={(event) => setSell({ ...sell, confirmed: event.target.checked })} />
              <span>Je confirme personnellement le montant, la devise et mon compte beneficiaire.</span>
            </label>
            <button type="button" disabled={loading} onClick={createSellerQr} className="rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-50">Creer le QR Vendre securise</button>
            {session && <p className="text-sm text-gray-300">Montant: {session.amount} {session.currency} · Expire: {new Date(session.expiresAt).toLocaleTimeString()}</p>}
          </div>
        </div>
      )}

      {mode === "buy" && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={cameraActive ? stopCamera : startCamera} className="rounded border border-omgGreen px-4 py-3 font-bold text-omgGreen">{cameraActive ? "Arreter la camera" : "Scanner avec la camera"}</button>
          </div>
          {cameraActive && <video ref={videoRef} muted playsInline className="max-h-72 w-full rounded-xl bg-black object-cover" aria-label="Scanner QR Payflow" />}
          <textarea className="min-h-24 w-full rounded border border-gray-700 bg-black p-3 text-white" placeholder="Contenu du QR Payflow" value={buy.payload} onChange={(event) => { setBuy({ ...buy, payload: event.target.value, confirmed: false }); setQuote(null); }} />
          <button type="button" disabled={loading} onClick={() => inspectQr()} className="rounded border border-omgGold px-5 py-3 font-bold text-omgGold">Verifier le QR</button>
          {quote && (
            <div className="rounded-xl border border-omgGreen/50 bg-green-950/30 p-4">
              <div className="text-sm text-gray-300">Beneficiaire securise: {quote.payeeReference}</div>
              <div className="mt-2 text-2xl font-black text-omgGold">{quote.amount} {quote.currency}</div>
              <div className="text-sm text-gray-300">Expiration: {new Date(quote.expiresAt).toLocaleTimeString()}</div>
            </div>
          )}
          <input className="w-full rounded border border-gray-700 bg-black p-3 text-white" type="password" inputMode="numeric" maxLength="4" placeholder="PIN Payflow" value={buy.pin} onChange={(event) => setBuy({ ...buy, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })} />
          <label className="flex gap-3 rounded border border-omgGold/30 p-3 text-sm text-gray-200">
            <input type="checkbox" checked={buy.confirmed} onChange={(event) => setBuy({ ...buy, confirmed: event.target.checked })} />
            <span>Je confirme personnellement le beneficiaire, le montant et la devise. L'IA ne peut pas confirmer ce paiement.</span>
          </label>
          <button type="button" disabled={loading || !quote} onClick={payQr} className="rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-50">Confirmer et payer</button>
          {receipt && <div className="rounded-xl border border-omgGold/40 p-4 text-sm text-gray-200">Recu: {receipt.receiptId} · {receipt.amount} {receipt.currency} · {receipt.status}</div>}
        </div>
      )}

      {status && <div className="mt-4 rounded-xl border border-omgGreen/40 bg-green-950/40 p-4 text-sm font-semibold text-green-100">{status}</div>}
    </section>
  );
}

export default PayflowQr;
