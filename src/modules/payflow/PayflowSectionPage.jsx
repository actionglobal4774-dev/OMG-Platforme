import React, { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import OperatorCash from "./OperatorCash";
import PaymentMethods from "./PaymentMethods";
import PayflowQr from "./PayflowQr";
import PayflowSpecialServices from "./PayflowSpecialServices";
import ReceiveMoney from "./ReceiveMoney";
import RequestMoney from "./RequestMoney";
import SendMoney from "./SendMoney";
import Transactions from "./Transactions";
import Wallet from "./Wallet";

const sectionTitles = {
  wallet: "Portefeuille Payflow",
  send: "Envoyer de l'argent",
  request: "Demander de l'argent",
  receive: "Recevoir de l'argent",
  deposit: "Depot operateur",
  withdraw: "Retrait operateur",
  exchange: "Changer de pays et de devise",
  transactions: "Historique des transactions",
  "qr-payment": "Paiement QR Payflow",
  operators: "Operateurs Payflow",
  verification: "Verification du compte",
  "payment-methods": "Moyens de paiement",
  settings: "Parametres Payflow",
  dispute: "Ouvrir un litige Payflow",
  "track-transfer": "Suivre un transfert Payflow"
};

const payflowNavigation = [
  ["wallet", "Wallet"], ["send", "Envoyer"], ["request", "Demander"], ["receive", "Recevoir"],
  ["deposit", "Depot"], ["withdraw", "Retrait"], ["exchange", "Devise"], ["transactions", "Transactions"],
  ["qr-payment", "QR"], ["operators", "Operateurs"], ["verification", "Verification"],
  ["payment-methods", "Paiements"], ["settings", "Parametres"], ["dispute", "Litige"], ["track-transfer", "Suivi"]
];

function OperatorsDirectory() {
  const operators = [
    ["PF-OP-HT-509", "Port-au-Prince", "Depot et retrait"],
    ["PF-OP-US-101", "Boston", "Depot"],
    ["PF-OP-DO-220", "Santo Domingo", "Depot et retrait"]
  ];
  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <p className="text-sm text-gray-300">Choisissez uniquement un operateur verifie. La geolocalisation reelle necessitera une API cartographique.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {operators.map(([id, city, services]) => <article key={id} className="rounded-xl border border-omgGold/30 p-4"><strong className="text-omgGold">{id}</strong><p>{city}</p><p className="text-sm text-gray-400">{services}</p></article>)}
      </div>
      <OperatorCash mode="deposit" />
    </div>
  );
}

function VerificationPanel() {
  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-omgGreen/40 p-4"><strong>Compte</strong><p className="text-omgGreen">Connecte</p></div>
        <div className="rounded-xl border border-omgGold/30 p-4"><strong>KYC</strong><p>A fournir selon le seuil ou le risque</p></div>
        <div className="rounded-xl border border-omgGold/30 p-4"><strong>Limites</strong><p>Definies apres verification</p></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/profile" className="rounded bg-omgGreen px-4 py-2 font-bold text-white">Verifier mon profil</Link>
        <Link to="/payflow/settings" className="rounded border border-omgGold px-4 py-2 font-bold text-omgGold">Securite Payflow</Link>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [preferences, setPreferences] = useState({ alerts: true, biometrics: false });
  const [saved, setSaved] = useState(false);
  const save = () => {
    localStorage.setItem("omg_payflow_preferences", JSON.stringify(preferences));
    setSaved(true);
  };
  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <label className="flex gap-3"><input type="checkbox" checked={preferences.alerts} onChange={(event) => { setPreferences({ ...preferences, alerts: event.target.checked }); setSaved(false); }} /> Alertes de transaction</label>
      <label className="mt-3 flex gap-3"><input type="checkbox" checked={preferences.biometrics} onChange={(event) => { setPreferences({ ...preferences, biometrics: event.target.checked }); setSaved(false); }} /> Preparer l'authentification biometrique sur mobile</label>
      <button type="button" onClick={save} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer</button>
      {saved && <p className="mt-3 font-semibold text-omgGreen">Parametres enregistres sur cet appareil.</p>}
    </div>
  );
}

function PayflowSectionPage() {
  const { section } = useParams();
  if (!sectionTitles[section]) return <Navigate to="/not-found" replace />;

  const content = {
    wallet: <Wallet />,
    send: <SendMoney />,
    request: <RequestMoney />,
    receive: <ReceiveMoney />,
    deposit: <OperatorCash mode="deposit" />,
    withdraw: <OperatorCash mode="withdraw" />,
    exchange: <PayflowSpecialServices selectedAction="Changer de pays" />,
    transactions: <Transactions />,
    "qr-payment": <PayflowQr />,
    operators: <OperatorsDirectory />,
    verification: <VerificationPanel />,
    "payment-methods": <PaymentMethods />,
    settings: <SettingsPanel />,
    dispute: <PayflowSpecialServices selectedAction="Litige" />,
    "track-transfer": <PayflowSpecialServices selectedAction="Suivi" />
  }[section];

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-bold uppercase tracking-wider text-omgGreen">Payflow</p><h1 className="text-3xl font-black text-omgGold">{sectionTitles[section]}</h1></div>
          <Link to="/payflow" className="inline-flex rounded border border-omgGold/40 px-4 py-2 font-semibold text-omgGold">Retour a Payflow</Link>
        </div>
        <nav aria-label="Navigation Payflow" className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {payflowNavigation.map(([path, label]) => <Link key={path} to={`/payflow/${path}`} aria-current={section === path ? "page" : undefined} className={`shrink-0 rounded-full border px-3 py-2 text-sm font-bold ${section === path ? "border-omgGold bg-omgGreen text-white" : "border-slate-600 bg-black/40 text-gray-200"}`}>{label}</Link>)}
        </nav>
        {content}
      </section>
    </DashboardLayout>
  );
}

export default PayflowSectionPage;
