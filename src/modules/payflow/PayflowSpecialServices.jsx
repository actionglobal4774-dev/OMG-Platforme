import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { countries, getCountryByCode, getCountryServiceCharge } from "../../data/globalOptions";
import { payflowSpecialServiceDelays } from "../../data/payflowTiming";
import { readPayflowEvents, recordPayflowEvent } from "../../services/payflowJourney";

function createReference() {
  return `PF-COUNTRY-${Date.now().toString().slice(-6)}`;
}

function PayflowSpecialServices({ selectedAction = "" }) {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const label = (key, fallback) => t(key, { defaultValue: fallback });
  const [draft, setDraft] = useState({
    countryCode: "HT",
    pin: "",
    confirmed: false
  });
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [caseDraft, setCaseDraft] = useState({ reference: searchParams.get("reference") || "", details: "", pin: "", confirmed: false });
  const [caseResult, setCaseResult] = useState("");
  const [trackedEvent, setTrackedEvent] = useState(null);
  const normalizedAction = String(selectedAction).toLowerCase();
  const isDispute = normalizedAction.includes("litige") || normalizedAction.includes("dispute");
  const isTracking = normalizedAction.includes("track") || normalizedAction.includes("suivi");

  const selectedCountry = useMemo(() => getCountryByCode(draft.countryCode), [draft.countryCode]);
  const fee = useMemo(() => getCountryServiceCharge(draft.countryCode, 4.99), [draft.countryCode]);

  const submitCountryChange = (event) => {
    event.preventDefault();
    setError("");
    setConfirmation(null);

    if (!/^\d{4}$/.test(draft.pin)) {
      setError(label("payflow_country_pin_required", "Veuillez entrer votre PIN Payflow a 4 chiffres."));
      return;
    }

    if (!draft.confirmed) {
      setError(label("payflow_country_confirmation_required", "Veuillez confirmer le pays, la devise et les frais avant de continuer."));
      return;
    }

    setConfirmation({
      reference: createReference(),
      country: selectedCountry.name,
      currency: selectedCountry.currency,
      fee,
      delay: payflowSpecialServiceDelays.countryChange
    });
  };

  const serviceCards = [
    {
      title: label("payflow_change_country", "Changer de pays"),
      route: "/payflow/exchange",
      detail: label("payflow_change_country_detail", "Le pays choisi change automatiquement la devise du compte Payflow."),
      delay: payflowSpecialServiceDelays.countryChange
    },
    {
      title: label("payflow_direct_deposit", "Depot direct sur compte"),
      route: "/payflow/deposit",
      detail: label("payflow_direct_deposit_detail", "Depot vers compte Payflow, banque ou operateur autorise."),
      delay: payflowSpecialServiceDelays.directDeposit
    },
    {
      title: label("payflow_qr_buy_sell", "Achat et vente par QR"),
      route: "/payflow/qr-payment",
      detail: label("payflow_qr_buy_sell_detail", "QR Acheter pour payer, QR Vendre pour recevoir."),
      delay: payflowSpecialServiceDelays.qrBuySell
    },
    {
      title: label("dispute", "Litige"),
      route: "/payflow/dispute",
      detail: label("payflow_dispute_detail", "Ouvrir une reclamation sur une transaction Payflow."),
      delay: payflowSpecialServiceDelays.dispute
    },
    {
      title: label("track_transfer", "Suivi"),
      route: "/payflow/track-transfer",
      detail: label("payflow_track_detail", "Verifier l'etat d'un transfert avec son numero de reference."),
      delay: payflowSpecialServiceDelays.trackTransfer
    }
  ];

  const submitCase = (event) => {
    event.preventDefault();
    setError("");
    setCaseResult("");
    if (!caseDraft.reference.trim()) {
      setError(isTracking ? "Veuillez entrer la reference du transfert." : "Veuillez entrer la reference de la transaction contestee.");
      return;
    }
    if (isTracking) {
      const event = readPayflowEvents().find((item) => item.reference === caseDraft.reference.trim());
      setTrackedEvent(event || null);
      if (!event) { setError("Cette référence ne figure pas dans l'historique de cet appareil. Le suivi serveur reste à connecter."); return; }
      setCaseResult(event.reference);
      return;
    }
    if (isDispute && caseDraft.details.trim().length < 10) {
      setError("Veuillez expliquer le probleme en au moins 10 caracteres.");
      return;
    }
    if (!/^\d{4}$/.test(caseDraft.pin)) {
      setError("Veuillez entrer votre PIN Payflow a 4 chiffres.");
      return;
    }
    if (!caseDraft.confirmed) {
      setError("Veuillez confirmer les informations avant de continuer.");
      return;
    }
    const reference = `PF-DISPUTE-${Date.now()}`;
    recordPayflowEvent({ reference, type: "dispute", status: "prepared" });
    setCaseResult(reference);
    setCaseDraft((current) => ({ ...current, pin: "", confirmed: false }));
  };

  if (isDispute || isTracking) {
    return (
      <form onSubmit={submitCase} className="omg-card mt-6 rounded-xl p-5">
        <h2 className="text-2xl font-bold text-omgGold">{isTracking ? "Suivre un transfert" : "Ouvrir un litige Payflow"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={caseDraft.reference}
            onChange={(event) => setCaseDraft({ ...caseDraft, reference: event.target.value })}
            className="rounded border border-gray-700 bg-black p-3 text-white"
            placeholder="Reference de transaction ou transfert"
          />
          <input
            value={caseDraft.pin}
            onChange={(event) => setCaseDraft({ ...caseDraft, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })}
            className="rounded border border-gray-700 bg-black p-3 text-white"
            type="password"
            hidden={isTracking}
            inputMode="numeric"
            maxLength="4"
            placeholder="PIN Payflow"
          />
          {isDispute && (
            <textarea
              value={caseDraft.details}
              onChange={(event) => setCaseDraft({ ...caseDraft, details: event.target.value })}
              className="rounded border border-gray-700 bg-black p-3 text-white md:col-span-2"
              rows={4}
              placeholder="Expliquez le probleme rencontre"
            />
          )}
        </div>
        <label hidden={isTracking} className="mt-4 items-start gap-3 rounded-xl border border-omgGreen/40 bg-green-950/20 p-3 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={caseDraft.confirmed}
            onChange={(event) => setCaseDraft({ ...caseDraft, confirmed: event.target.checked })}
          />
          <span>Je confirme la reference et les informations de cette demande.</span>
        </label>
        {error && <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm font-semibold text-red-100">{error}</div>}
        <button type="submit" className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
          {isTracking ? "Verifier le transfert" : "Creer le dossier de litige"}
        </button>
        {caseResult && (
          <div className="mt-4 rounded-xl border border-omgGreen bg-green-950/40 p-3 text-sm font-semibold text-green-200">
            {isTracking ? "Référence retrouvée dans l'historique local" : "Brouillon de litige préparé, transmission à connecter"} : {caseResult}
            {trackedEvent && <p className="mt-2">État enregistré : {trackedEvent.status}. Ce statut local ne remplace pas la confirmation financière du serveur.</p>}
            <Link to="/payflow/transactions" className="mt-3 inline-block underline">Consulter l'historique</Link>
          </div>
        )}
      </form>
    );
  }

  return (
    <section className="mt-6 space-y-5">
      <div className="omg-card rounded-xl p-5">
        <h2 className="text-2xl font-bold text-omgGold">{label("payflow_special_services", "Client service special")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {serviceCards.map((service) => (
            <Link to={service.route} key={service.title} className="rounded-xl border border-omgGold/30 bg-black/40 p-4 transition hover:border-omgGreen focus:outline-none focus:ring-2 focus:ring-omgGreen">
              <h3 className="font-bold text-omgGold">{service.title}</h3>
              <p className="mt-2 text-sm text-gray-300">{service.detail}</p>
              <p className="mt-2 text-xs font-semibold text-omgGreen">
                {label("payflow_delivery_delay", "Delai estime")}: {service.delay}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {selectedAction && <form onSubmit={submitCountryChange} className="omg-card rounded-xl p-5">
        <h3 className="text-xl font-bold text-omgGold">{label("payflow_change_country_currency", "Changer de pays / devise")}</h3>
        <p className="mt-2 text-sm text-gray-300">
          {label("payflow_country_currency_rule", "Dans Payflow, changer de pays change automatiquement la devise du compte. Les frais fixes sont de 4.99 USD ou equivalent local.")}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-200">
            {label("country", "Pays")}
            <select
              className="mt-2 w-full rounded border border-gray-700 bg-black p-3 text-white"
              value={draft.countryCode}
              onChange={(event) => setDraft({ ...draft, countryCode: event.target.value, confirmed: false })}
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-omgGreen/30 bg-green-950/20 p-4">
            <div className="text-sm text-gray-300">{label("currency", "Devise")}</div>
            <div className="mt-2 text-2xl font-bold text-omgGreen">{selectedCountry.currency}</div>
            <div className="mt-1 text-xs text-gray-400">{selectedCountry.name}</div>
          </div>

          <div className="rounded-xl border border-omgGold/40 bg-yellow-950/20 p-4">
            <div className="text-sm text-gray-300">{label("service_fee", "Frais de service")}</div>
            <div className="mt-2 text-xl font-bold text-omgGold">
              {fee.usdAmount.toFixed(2)} USD / {fee.localAmount.toFixed(2)} {fee.currency}
            </div>
            <div className="mt-1 text-xs text-gray-400">{label("payflow_fee_equivalent_notice", "Equivalent local affiche avant validation finale.")}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-omgGreen/30 bg-green-950/20 p-4 text-sm text-green-100">
          <span className="font-bold">{label("payflow_delivery_delay", "Delai estime")}:</span>{" "}
          {payflowSpecialServiceDelays.countryChange}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded border border-gray-700 bg-black p-3 text-white"
            type="password"
            inputMode="numeric"
            maxLength="4"
            placeholder={label("payflow_pin", "PIN Payflow")}
            value={draft.pin}
            onChange={(event) => setDraft({ ...draft, pin: event.target.value })}
          />
          <label className="flex items-start gap-3 rounded-xl border border-omgGreen/40 bg-green-950/20 p-3 text-sm text-gray-200">
            <input
              type="checkbox"
              className="mt-1"
              checked={draft.confirmed}
              onChange={(event) => setDraft({ ...draft, confirmed: event.target.checked })}
            />
            <span>{label("payflow_confirm_country_fee", "Je confirme que ce changement de pays changera la devise et appliquera les frais de 4.99 USD ou equivalent local.")}</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm font-semibold text-red-100">
            {error}
          </div>
        )}

        <button type="submit" className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
          {label("payflow_confirm_country_change", "Confirmer changement pays/devise")}
        </button>

        {confirmation && (
          <div className="mt-4 rounded-xl border border-omgGreen bg-green-950/40 p-3 text-sm font-semibold text-green-200">
            {label("payflow_country_change_done", "Changement pays/devise prepare avec confirmation")}: {confirmation.reference} -
            {" "}{confirmation.country} / {confirmation.currency} -
            {" "}{confirmation.fee.usdAmount.toFixed(2)} USD / {confirmation.fee.localAmount.toFixed(2)} {confirmation.fee.currency} -
            {" "}{label("payflow_delivery_delay", "Delai estime")}: {confirmation.delay}
          </div>
        )}
      </form>}
    </section>
  );
}

export default PayflowSpecialServices;
