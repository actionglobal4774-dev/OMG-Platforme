import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { countries, getCountryByCode } from "../../data/globalOptions";
import { getBanksForCountry } from "../../data/payflowBanks";
import { getPayflowDeliveryDelay } from "../../data/payflowTiming";
import { sendMoney } from "../../services/payflowService";
import { useAuth } from "../../context/AuthContext";

function SendMoney() {
  const { t } = useTranslation();
  const { getModuleProfile } = useAuth();
  const payflowProfile = getModuleProfile("payflow");
  const label = (key, fallback) => t(key, { defaultValue: fallback });
  const [data, setData] = useState({
    receiver: "",
    amount: "",
    currency: "USD",
    method: "payflow",
    transferType: "local",
    bankCountry: "HT",
    bankName: "",
    accountHolder: "",
    bankAccount: "",
    swiftOrRouting: "",
    depositFor: "family",
    relationship: "",
    note: "",
    pin: "",
    confirmTransfer: false
  });
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  const amount = Number(data.amount || 0);
  const isBankTransfer = data.method === "international-bank" || data.method === "bank-transfer";
  const availableBanks = getBanksForCountry(data.bankCountry);
  const selectedBankCountry = getCountryByCode(data.bankCountry);
  const fee = data.transferType === "international" || data.method === "international-bank" ? amount * 0.0325 : 0;
  const total = amount + fee;
  const deliveryDelay = getPayflowDeliveryDelay(data.method, data.transferType);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!amount || amount <= 0) {
      setError(label("payflow_amount_required", "Veuillez entrer un montant valide."));
      return;
    }

    if (isBankTransfer) {
      const missingBankField = !data.bankCountry || !data.bankName || !data.accountHolder || !data.bankAccount || !data.swiftOrRouting || !data.relationship;
      if (missingBankField) {
        setError(label("payflow_bank_fields_required", "Veuillez remplir le pays, la banque disponible, le proche, le titulaire, le compte/IBAN et le code SWIFT/Routing."));
        return;
      }
    } else if (!data.receiver.trim()) {
      setError(label("payflow_receiver_required", "Veuillez entrer un beneficiaire ou choisir un contact."));
      return;
    }

    if (!/^\d{4}$/.test(data.pin)) {
      setError(label("payflow_pin_required", "Veuillez entrer votre PIN Payflow a 4 chiffres."));
      return;
    }

    if (!data.confirmTransfer) {
      setError(label("payflow_direct_confirmation_required", "Veuillez confirmer le destinataire, le montant, les frais et le total avant de finaliser."));
      return;
    }

    try {
      const response = await sendMoney({ ...data, fee, total, deliveryDelay, userCountry: payflowProfile?.country || "" });
      setReceipt(response.data || null);
    } catch (submissionError) {
      setError(submissionError?.message || "Le transfert n'a pas pu etre prepare.");
    }
  };

  return (
    <form onSubmit={submit} className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">{t("send_money")}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input className="rounded border border-gray-700 bg-black p-3 text-white" placeholder={label("payflow_receiver_placeholder", "Email, telephone, Payflow ID ou contact")} value={data.receiver} onChange={(event) => setData({ ...data, receiver: event.target.value })} />
        <input className="rounded border border-gray-700 bg-black p-3 text-white" type="number" min="0" placeholder={label("payflow_amount_placeholder", "Montant")} value={data.amount} onChange={(event) => setData({ ...data, amount: event.target.value })} />
        <select className="rounded border border-gray-700 bg-black p-3 text-white" value={data.currency} onChange={(event) => setData({ ...data, currency: event.target.value })}>
          <option value="USD">USD</option>
          <option value="HTG">HTG</option>
          <option value="DOP">DOP</option>
          <option value="EUR">EUR</option>
          <option value="XOF">XOF</option>
          <option value="BRL">BRL</option>
        </select>
        <select className="rounded border border-gray-700 bg-black p-3 text-white" value={data.method} onChange={(event) => setData({ ...data, method: event.target.value })}>
          <option value="payflow">Payflow</option>
          <option value="card">Carte bancaire</option>
          <option value="bank-transfer">{label("payflow_method_bank_transfer", "Virement bancaire")}</option>
          <option value="international-bank">{label("payflow_method_international_bank", "Banque internationale")}</option>
          <option value="operator">Operateur Payflow</option>
          <option value="moncash">MonCash</option>
          <option value="natcash">NatCash</option>
          <option value="ria">Ria</option>
          <option value="moneygram">MoneyGram</option>
          <option value="cam-transfer">CAM Transfer</option>
        </select>
        <select className="rounded border border-gray-700 bg-black p-3 text-white" value={data.transferType} onChange={(event) => setData({ ...data, transferType: event.target.value })}>
          <option value="local">Local</option>
          <option value="international">International - frais 3.25%</option>
        </select>
        <input className="rounded border border-gray-700 bg-black p-3 text-white" placeholder={label("payflow_note_placeholder", "Motif optionnel")} value={data.note} onChange={(event) => setData({ ...data, note: event.target.value })} />
        <input className="rounded border border-gray-700 bg-black p-3 text-white" type="password" inputMode="numeric" maxLength="4" placeholder="PIN Payflow" value={data.pin} onChange={(event) => setData({ ...data, pin: event.target.value })} />
      </div>
      {isBankTransfer && (
        <div className="mt-4 rounded-xl border border-omgGold/30 bg-black/40 p-4">
          <h3 className="font-bold text-omgGold">{label("payflow_bank_destination", "Destination bancaire")}</h3>
          <p className="mt-1 text-sm text-gray-400">
            {label("payflow_bank_notice", "Payflow prepare le transfert vers une banque existante du pays choisi. La banque et les informations du compte doivent etre confirmees par l'utilisateur.")}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              className="rounded border border-gray-700 bg-black p-3 text-white"
              value={data.bankCountry}
              onChange={(event) => {
                const nextCountry = event.target.value;
                const nextBanks = getBanksForCountry(nextCountry);
                setData({ ...data, bankCountry: nextCountry, bankName: nextBanks[0] || "" });
              }}
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
              ))}
            </select>
            <select
              className="rounded border border-gray-700 bg-black p-3 text-white"
              value={data.bankName}
              onChange={(event) => setData({ ...data, bankName: event.target.value })}
            >
              <option value="">{label("payflow_choose_available_bank", "Choisir une banque disponible")}</option>
              {availableBanks.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <select className="rounded border border-gray-700 bg-black p-3 text-white" value={data.depositFor} onChange={(event) => setData({ ...data, depositFor: event.target.value })}>
              <option value="family">{label("payflow_deposit_for_family", "Depot pour la famille")}</option>
              <option value="friend">{label("payflow_deposit_for_friend", "Depot pour un ami")}</option>
              <option value="close_person">{label("payflow_deposit_for_close_person", "Depot pour un proche")}</option>
            </select>
            <input className="rounded border border-gray-700 bg-black p-3 text-white" placeholder={label("payflow_relationship", "Lien avec la personne")} value={data.relationship} onChange={(event) => setData({ ...data, relationship: event.target.value })} />
            <input className="rounded border border-gray-700 bg-black p-3 text-white" placeholder={label("payflow_account_holder", "Titulaire du compte")} value={data.accountHolder} onChange={(event) => setData({ ...data, accountHolder: event.target.value })} />
            <input className="rounded border border-gray-700 bg-black p-3 text-white" placeholder={label("payflow_account_iban", "Numero compte / IBAN")} value={data.bankAccount} onChange={(event) => setData({ ...data, bankAccount: event.target.value })} />
            <input className="rounded border border-gray-700 bg-black p-3 text-white md:col-span-2" placeholder={label("payflow_swift_routing", "SWIFT / Routing / Transit")} value={data.swiftOrRouting} onChange={(event) => setData({ ...data, swiftOrRouting: event.target.value })} />
          </div>
          <div className="mt-4 rounded-lg border border-omgGreen/30 bg-green-950/20 p-3 text-sm text-green-100">
            {label("payflow_available_banks_notice", "Banques disponibles pour depot dans ce pays")}: {selectedBankCountry.name} - {availableBanks.length ? availableBanks.join(", ") : label("payflow_no_bank_available", "aucune banque activee pour le moment")}
          </div>
        </div>
      )}
      <div className="mt-4 rounded-xl border border-omgGold/30 bg-black/40 p-4 text-sm text-gray-200">
        <div>{label("payment_methods", "Moyen de paiement")}: {isBankTransfer ? label("payflow_method_international_bank", "Banque internationale") : data.method}</div>
        {isBankTransfer && <div>{label("payflow_bank_destination", "Destination bancaire")}: {data.bankName || "-"} / {selectedBankCountry.name || "-"}</div>}
        {isBankTransfer && <div>{label("payflow_deposit_for", "Depot pour")}: {data.depositFor} / {data.relationship || "-"}</div>}
        <div>{label("amount", "Montant")}: {amount.toFixed(2)} {data.currency}</div>
        <div>{label("service_fee", "Frais de service")}: {fee.toFixed(2)} {data.currency}</div>
        <div>{label("payflow_delivery_delay", "Delai estime")}: {deliveryDelay}</div>
        <div className="font-bold text-omgGold">{label("total", "Total")}: {total.toFixed(2)} {data.currency}</div>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-omgGreen/40 bg-green-950/20 p-3 text-sm text-gray-200">
        <input
          type="checkbox"
          className="mt-1"
          checked={data.confirmTransfer}
          onChange={(event) => setData({ ...data, confirmTransfer: event.target.checked })}
        />
        <span>{label("payflow_confirm_transfer_text", "Je confirme le beneficiaire, la banque si applicable, le montant, les frais et le total. Je comprends que cette action doit etre validee par moi-meme.")}</span>
      </label>
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}
      <button type="submit" className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
        {label("payflow_finalize_transaction", "Finaliser la transaction")}
      </button>
      {receipt && (
        <div className="mt-4 rounded-xl border border-omgGreen bg-green-950/40 p-3 text-sm font-semibold text-green-200">
          {receipt.live
            ? (receipt.requiresKyc ? "Transfert prepare : verification KYC requise avant execution" : "Transfert prepare et en attente de confirmation serveur")
            : label("payflow_direct_confirmation_done", "Transaction de demonstration finalisee")}: {receipt.reference} -
          {" "}{label("payflow_delivery_delay", "Delai estime")}: {deliveryDelay}
        </div>
      )}
    </form>
  );
}

export default SendMoney;
