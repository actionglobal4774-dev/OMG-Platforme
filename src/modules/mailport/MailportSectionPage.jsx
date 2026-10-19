import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getMailportPackages } from "../../services/mailportService";
import { saveModuleActivity } from "../../services/activityService";
import MailportWorkspace from "./MailportWorkspace";

const sections = {
  "address-search": { title: "Recherche d'adresse", action: "Chercher adresse", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  "my-address": { title: "Mon adresse et mon QR", action: "Voir QR adresse", roles: ["owner", "buyer", "admin"] },
  "create-address": { title: "Créer une adresse Mailport", action: "Publier adresse gratuitement", roles: ["owner", "admin"] },
  tracking: { title: "Suivi de colis", action: "Suivre colis", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  history: { title: "Historique des colis", kind: "history", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  driver: { title: "Espace transporteur / livreur", action: "Missions disponibles", roles: ["carrier", "admin"] },
  delivery: { title: "Livraison et remise", action: "Livrer colis", roles: ["owner", "carrier", "admin"] },
  messages: { title: "Messagerie Mailport", kind: "messages", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  claims: { title: "Réclamations", kind: "claims", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  map: { title: "Carte et localisation", kind: "map", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  settings: { title: "Paramètres Mailport", kind: "settings", roles: ["owner", "buyer", "sender", "carrier", "admin"] },
  support: { title: "Aide et support", kind: "support", roles: ["owner", "buyer", "sender", "carrier", "admin"] }
};

const navigation = [
  ["address-search", "Search Address"], ["my-address", "My Address"], ["create-address", "Create Address"],
  ["tracking", "Track Package"], ["history", "Parcel History"], ["driver", "Driver"],
  ["delivery", "Scan / Deliver"], ["messages", "Messages"], ["claims", "Report Issue"],
  ["map", "Navigate"], ["settings", "Settings"], ["support", "Aide"]
];

function roleFrom(profile, user) {
  const value = `${profile?.userType || ""} ${user?.role || ""}`.toLowerCase();
  if (value.includes("admin")) return "admin";
  if (value.includes("livreur") || value.includes("transport") || value.includes("carrier")) return "carrier";
  if (value.includes("exped") || value.includes("sender")) return "sender";
  if (value.includes("propriet") || value.includes("owner")) return "owner";
  return "buyer";
}

function StatusList({ packages, parcelId }) {
  const filtered = parcelId ? packages.filter((item) => [item.id, item.trackingId, item.packageQr, item.qrCode].includes(parcelId)) : packages;
  return <div className="space-y-3">{filtered.length ? filtered.map((item) => (
    <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800">
      <strong>{item.trackingId || item.packageQr || item.qrCode || item.id}</strong><p className="mt-1">Statut : {item.status || "Créé"}</p>
      <Link className="mt-2 inline-block font-bold text-omgGreen" to={`/mailport/parcels/${encodeURIComponent(item.trackingId || item.id)}`}>Voir le détail</Link>
    </article>
  )) : <p className="rounded-xl bg-white p-4 text-slate-700">Aucun colis correspondant.</p>}</div>;
}

export default function MailportSectionPage({ parcelDetail = false }) {
  const { section, parcelId } = useParams();
  const navigate = useNavigate();
  const { user, getModuleProfile } = useAuth();
  const profile = getModuleProfile("mailport");
  const config = parcelDetail ? { title: "Détail du colis", kind: "parcel", roles: ["owner", "buyer", "sender", "carrier", "admin"] } : sections[section];
  const packages = useMemo(() => getMailportPackages(), []);
  const [form, setForm] = useState({ reference: "", details: "" });
  const [notice, setNotice] = useState("");
  if (!config) return <Navigate to="/not-found" replace />;
  const activeRole = roleFrom(profile, user);
  if (!config.roles.includes(activeRole)) return <Navigate to="/access-denied" replace />;
  const submitLocalAction = (action) => {
    if (!form.reference.trim()) { setNotice("Le numéro de colis est obligatoire."); return; }
    saveModuleActivity("mailport", { action, reference: form.reference.trim(), status: "submitted", details: form.details.trim() });
    setNotice(`${action} enregistré pour le colis ${form.reference.trim()}.`);
  };

  return <DashboardLayout><section className="mx-auto max-w-6xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-omgGold">Mailport</p><h1 className="text-3xl font-black text-white">{config.title}</h1></div><Link to="/mailport" className="rounded border border-omgGold px-4 py-2 font-bold text-omgGold">Accueil Mailport</Link></div>
    <nav aria-label="Navigation Mailport" className="mb-5 flex gap-2 overflow-x-auto pb-2">{navigation.filter(([path]) => sections[path].roles.includes(activeRole)).map(([path, label]) => <Link key={path} to={`/mailport/${path}`} className="shrink-0 rounded-full border border-slate-600 bg-black/40 px-3 py-2 text-sm font-semibold text-white">{label}</Link>)}</nav>
    {config.action && <MailportWorkspace selectedAction={config.action} profile={profile || {}} closeModuleAction={() => navigate("/mailport")} />}
    {(config.kind === "history" || config.kind === "parcel") && <StatusList packages={packages} parcelId={parcelId} />}
    {config.kind === "messages" && <div className="rounded-2xl bg-white p-5 text-slate-800"><label className="font-bold" htmlFor="mailport-message">Contacter un acteur du colis</label><input className="mt-3 w-full rounded border p-3" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Numéro de colis" /><textarea id="mailport-message" rows="4" className="mt-3 w-full rounded border p-3" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="Message" /><button type="button" onClick={() => submitLocalAction("Contact")} className="mt-3 rounded bg-omgGreen px-5 py-3 font-bold text-white">Contact</button></div>}
    {config.kind === "claims" && <div className="rounded-2xl bg-white p-5 text-slate-800"><input className="w-full rounded border p-3" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Numéro de suivi" /><textarea rows="4" className="mt-3 w-full rounded border p-3" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="Décrivez le problème" /><button type="button" onClick={() => submitLocalAction("Réclamation")} className="mt-3 rounded bg-red-700 px-5 py-3 font-bold text-white">Report Issue</button></div>}
    {config.kind === "map" && <div className="rounded-2xl bg-white p-5 text-slate-800"><div className="grid h-64 place-items-center rounded-xl bg-slate-100 text-center"><p><strong>Carte Mailport</strong><br />Localisation simulée selon le colis sélectionné.</p></div><button type="button" className="mt-3 rounded bg-omgGreen px-5 py-3 font-bold text-white">Navigate</button></div>}
    {config.kind === "settings" && <div className="rounded-2xl bg-white p-5 text-slate-800"><label className="flex items-center justify-between gap-4"><span>Notifications de statut colis</span><input type="checkbox" defaultChecked /></label><Link to="/settings" className="mt-5 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Paramètres du compte</Link></div>}
    {config.kind === "support" && <details className="rounded-2xl bg-white p-5 text-slate-800"><summary className="cursor-pointer font-black">Comment utiliser un QR Mailport ?</summary><p className="mt-3">Scannez le QR à l'arrivée, à la remise ou à la livraison, puis confirmez l'identité du destinataire.</p></details>}
    {notice && <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-900">{notice}</p>}
  </section></DashboardLayout>;
}
