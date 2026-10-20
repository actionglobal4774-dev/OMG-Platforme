import React, { useMemo, useState } from "react";
import { getCollection, upsertItem } from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";

const MODULES = ["Payflow", "Mailport", "Property", "Restaurant", "Store", "Health", "School", "City", "USA Tax Pro", "University", "Travel"];

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function money(value) {
  return Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminFinancialGovernance({ profile }) {
  const payments = getCollection("payments");
  const saved = getCollection("admin_financial_snapshots");
  const latest = saved[0] || {};
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [settings, setSettings] = useState({
    commissionRate: latest.commissionRate ?? 8,
    processorFees: latest.processorFees ?? 0,
    refunds: latest.refunds ?? 0,
    apiCosts: latest.apiCosts ?? 0,
    operatingCosts: latest.operatingCosts ?? 0,
    processorSettlement: latest.processorSettlement ?? 0,
    reserveRate: latest.reserveRate ?? 1
  });
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => MODULES.map((module) => {
    const items = payments.filter((item) => normalize(item.module || item.label).includes(normalize(module)));
    const grossVolume = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const platformRevenue = grossVolume * Number(settings.commissionRate || 0) / 100;
    return { module, transactions: items.length, grossVolume, clientFunds: Math.max(0, grossVolume - platformRevenue), platformRevenue };
  }), [payments, settings.commissionRate]);

  const totals = rows.reduce((acc, row) => ({
    transactions: acc.transactions + row.transactions,
    grossVolume: acc.grossVolume + row.grossVolume,
    clientFunds: acc.clientFunds + row.clientFunds,
    platformRevenue: acc.platformRevenue + row.platformRevenue
  }), { transactions: 0, grossVolume: 0, clientFunds: 0, platformRevenue: 0 });
  const reserve = totals.grossVolume * Number(settings.reserveRate || 0) / 100;
  const expenses = Number(settings.processorFees || 0) + Number(settings.refunds || 0) + Number(settings.apiCosts || 0) + Number(settings.operatingCosts || 0) + reserve;
  const result = totals.platformRevenue - expenses;
  const expectedSettlement = totals.grossVolume - Number(settings.processorFees || 0) - Number(settings.refunds || 0);
  const reconciliationGap = Number(settings.processorSettlement || 0) - expectedSettlement;
  const reconciled = totals.grossVolume > 0 && Math.abs(reconciliationGap) < 0.01;

  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value.replace(/[^0-9.]/g, "") }));
  const saveSnapshot = () => {
    const snapshot = upsertItem("admin_financial_snapshots", {
      period,
      ...settings,
      ...totals,
      reserve,
      expenses,
      operatingResult: result,
      reconciliationGap,
      reconciliationStatus: reconciled ? "reconciled" : "needs-review",
      preparedBy: profile?.email || "administration",
      createdAt: new Date().toISOString(),
      status: "pending-second-approval"
    });
    upsertItem("admin_audit", {
      action: "FINANCIAL_SNAPSHOT_PREPARED",
      actor: profile?.email || "administration",
      target: snapshot.data.id,
      details: `${period} · volume ${money(totals.grossVolume)} USD · resultat ${money(result)} USD`,
      immutable: true,
      occurredAt: new Date().toISOString()
    });
    saveModuleActivity("administration", { action: "Cloture financiere preparee", reference: snapshot.data.id, status: "pending-second-approval" });
    setNotice(`Cloture ${period} enregistree. Reference ${snapshot.data.id}. Une seconde validation reste obligatoire.`);
  };

  const Card = ({ label, value, tone = "slate" }) => <div className={`rounded-xl border border-${tone}-200 bg-${tone}-50 p-4`}><p className="text-sm font-bold text-slate-600">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>;

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-amber-50 p-4 font-bold text-amber-900">SIMULATEUR LOCAL — pas une comptabilite reelle. Le taux saisi est une hypothese, non un tarif applique aux modules. Aucun rapprochement bancaire ni versement certifie.</p>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-black">Simulation financiere des 11 modules</h3><p className="text-sm text-slate-600">Estimations locales uniquement, non rapprochees avec les prestataires.</p></div><input type="month" className="rounded border p-3" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
        <div className="mt-4 grid gap-3 md:grid-cols-4"><Card label="Volume marchand" value={`${money(totals.grossVolume)} USD`} /><Card label="Fonds dus aux partenaires" value={`${money(totals.clientFunds)} USD`} tone="amber" /><Card label="Revenu brut OMG" value={`${money(totals.platformRevenue)} USD`} tone="emerald" /><Card label="Resultat estime" value={`${money(result)} USD`} tone={result >= 0 ? "emerald" : "red"} /></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-black">Compte de resultat par module</h3>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Module</th><th className="p-2">Operations</th><th className="p-2">Volume</th><th className="p-2">Fonds clients</th><th className="p-2">Revenu OMG</th></tr></thead><tbody>{rows.map((row) => <tr key={row.module} className="border-b"><td className="p-2 font-bold">{row.module}</td><td className="p-2">{row.transactions}</td><td className="p-2">{money(row.grossVolume)}</td><td className="p-2">{money(row.clientFunds)}</td><td className="p-2 font-bold text-emerald-700">{money(row.platformRevenue)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-black">Charges, reserve et indicateurs mensuels</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold">Commission moyenne OMG (%)<input className="mt-1 w-full rounded border p-3" value={settings.commissionRate} onChange={(e) => update("commissionRate", e.target.value)} /></label>
          <label className="text-sm font-bold">Frais Stripe / PayPal<input className="mt-1 w-full rounded border p-3" value={settings.processorFees} onChange={(e) => update("processorFees", e.target.value)} /></label>
          <label className="text-sm font-bold">Remboursements / litiges<input className="mt-1 w-full rounded border p-3" value={settings.refunds} onChange={(e) => update("refunds", e.target.value)} /></label>
          <label className="text-sm font-bold">Cloud et API<input className="mt-1 w-full rounded border p-3" value={settings.apiCosts} onChange={(e) => update("apiCosts", e.target.value)} /></label>
          <label className="text-sm font-bold">Charges d'exploitation<input className="mt-1 w-full rounded border p-3" value={settings.operatingCosts} onChange={(e) => update("operatingCosts", e.target.value)} /></label>
          <label className="text-sm font-bold">Reserve de risque (%)<input className="mt-1 w-full rounded border p-3" value={settings.reserveRate} onChange={(e) => update("reserveRate", e.target.value)} /></label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4"><Card label="Taux effectif OMG" value={`${money(settings.commissionRate)} %`} /><Card label="Reserve constituee" value={`${money(reserve)} USD`} /><Card label="Total charges + reserve" value={`${money(expenses)} USD`} /><Card label="Marge operationnelle" value={`${totals.platformRevenue ? money(result / totals.platformRevenue * 100) : "0,00"} %`} /></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-black">Rapprochement quotidien</h3>
        <p className="mt-1 text-sm text-slate-600">Saisir le versement net confirme par Stripe, PayPal et les autres processeurs.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3"><label className="text-sm font-bold">Versement processeurs<input className="mt-1 w-full rounded border p-3" value={settings.processorSettlement} onChange={(e) => update("processorSettlement", e.target.value)} /></label><Card label="Versement attendu" value={`${money(expectedSettlement)} USD`} /><Card label="Ecart" value={`${money(reconciliationGap)} USD`} tone={reconciled ? "emerald" : "amber"} /></div>
        <p className={`mt-3 rounded-xl p-3 font-bold ${reconciled ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{reconciled ? "Rapprochement equilibre." : "Rapprochement a verifier avant cloture."}</p>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-4"><h3 className="font-black text-red-900">Controle administratif</h3><p className="mt-1 text-sm text-red-800">L'enregistrement cree une cloture provisoire, un journal d'audit et une demande de seconde validation. Il ne declenche aucun versement bancaire.</p><button type="button" onClick={saveSnapshot} className="mt-4 rounded bg-red-700 px-5 py-3 font-bold text-white">Preparer la cloture mensuelle</button>{notice && <p role="status" className="mt-3 font-bold text-red-900">{notice}</p>}</section>
    </div>
  );
}
