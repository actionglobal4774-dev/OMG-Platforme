import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getMailportPackages } from "../../services/mailportService";
import { saveModuleActivity } from "../../services/activityService";
import { getMailportRole, getMailportSection, mailportReferenceLink, mailportSections } from "./mailportNavigation";
import MailportWorkspace from "./MailportWorkspace";

function ParcelLinks({ reference, role }) {
  return <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-omgGreen">
    <Link to={mailportReferenceLink("tracking", reference)}>Suivre ce colis</Link>
    <Link to={mailportReferenceLink("messages", reference)}>Message lié au colis</Link>
    <Link to={mailportReferenceLink("claims", reference)}>Signaler un problème</Link>
    {["owner", "carrier"].includes(role) && <Link to={mailportReferenceLink("delivery", reference)}>Livraison et remise</Link>}
  </div>;
}

function StatusList({ packages, parcelId, role }) {
  const filtered = parcelId ? packages.filter((item) => [item.id, item.trackingId, item.packageQr, item.qrCode].includes(parcelId)) : packages;
  return <div className="space-y-3">{filtered.length ? filtered.map((item) => {
    const reference = item.trackingId || item.id;
    return <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800">
      <h2 className="font-bold">{reference}</h2><p className="mt-1">Statut : {item.status || "Créé"}</p>
      {parcelId ? <><p className="mt-2">Départ : {item.fromLocation || "Non renseigné"}</p><p>Destination : {item.toLocation || "Non renseignée"}</p><ParcelLinks reference={reference} role={role} /></> : <Link className="mt-2 inline-block font-bold text-omgGreen" to={`/mailport/parcels/${encodeURIComponent(reference)}`}>Voir le détail</Link>}
    </article>;
  }) : <div className="rounded-xl bg-white p-4 text-slate-700"><p>{parcelId ? "Ce colis ne figure pas dans les données disponibles sur cet appareil." : "Aucun colis disponible."}</p><Link className="mt-3 inline-block font-bold text-omgGreen" to={mailportReferenceLink("tracking", parcelId)}>Rechercher un colis</Link></div>}</div>;
}

function MailportPage({ parcelDetail }) {
  const { section, parcelId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { getModuleProfile } = useAuth();
  const profile = getModuleProfile("mailport");
  const role = getMailportRole(profile);
  const config = parcelDetail ? { title: "Détail du colis", kind: "parcel", roles: ["owner", "buyer", "carrier"] } : getMailportSection(section, search.get("view") || "");
  const reference = parcelId || search.get("reference") || "";
  const [packages] = useState(getMailportPackages);
  const [form, setForm] = useState({ reference, details: "" });
  const [notice, setNotice] = useState("");
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`omg_mailport_preferences_${profile?.email || ""}`) || "{}").alerts !== false; }
    catch { return true; }
  });
  if (!config) return <Navigate to="/not-found" replace />;
  const allowed = role && config.roles.includes(role);

  const submitLocalAction = (action) => {
    if (!form.reference.trim() || !form.details.trim()) { setNotice("La référence du colis et votre message sont obligatoires."); return; }
    try {
      saveModuleActivity("mailport", { action, reference: form.reference.trim(), status: "prepared", details: form.details.trim() });
      setNotice("Brouillon enregistré localement. Sa transmission à un destinataire reste à connecter.");
    } catch { setNotice("Le brouillon n'a pas pu être enregistré. Vos informations sont conservées dans le formulaire."); }
  };

  return <DashboardLayout><section className="mx-auto max-w-6xl">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-omgGold">Mailport</p><h1 className="text-3xl font-black text-white">{config.title}</h1></div><Link to="/mailport" className="rounded border border-omgGold px-4 py-2 font-bold text-omgGold">Accueil Mailport</Link></header>
    <nav aria-label="Navigation Mailport" className="mb-5 flex gap-2 overflow-x-auto pb-2">{Object.entries(mailportSections).filter(([, item]) => role && item.roles.includes(role)).map(([slug, item]) => <Link key={slug} to={mailportReferenceLink(slug, reference)} aria-current={!parcelDetail && section === slug ? "page" : undefined} className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold ${!parcelDetail && section === slug ? "border-omgGold bg-omgGreen text-white" : "border-slate-600 bg-black/40 text-white"}`}>{item.title}</Link>)}</nav>
    {!profile ? <div className="rounded-xl bg-white p-5 text-slate-800"><h2 className="text-xl font-black">Profil Mailport requis</h2><p className="mt-2">Créez ou ouvrez votre profil pour accéder au parcours adapté à votre rôle.</p><Link to="/mailport" className="mt-3 inline-block font-bold text-omgGreen">Ouvrir Mailport</Link></div> : !allowed ? <div className="rounded-xl bg-amber-50 p-5 text-amber-950"><h2 className="text-xl font-black">Accès réservé à un autre rôle</h2><p className="mt-2">Cette fonction n'est pas disponible pour votre profil Mailport.</p><Link to="/mailport" className="mt-3 inline-block font-bold">Retour aux services autorisés</Link></div> : <>
      {config.action && <MailportWorkspace selectedAction={config.action} initialReference={reference} profile={profile} closeModuleAction={() => navigate("/mailport")} />}
      {["history", "parcel"].includes(config.kind) && <StatusList packages={packages} parcelId={parcelDetail ? parcelId : null} role={role} />}
      {["messages", "claims"].includes(config.kind) && <form onSubmit={(event) => { event.preventDefault(); submitLocalAction(config.kind === "claims" ? "Réclamation" : "Contact"); }} className="rounded-2xl bg-white p-5 text-slate-800"><label htmlFor="mailport-reference" className="font-bold">Référence du colis</label><input id="mailport-reference" required className="mt-2 w-full rounded border p-3" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /><label htmlFor="mailport-details" className="mt-3 block font-bold">{config.kind === "claims" ? "Décrivez le problème" : "Votre message"}</label><textarea id="mailport-details" required rows="4" className="mt-2 w-full rounded border p-3" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /><button type="submit" className="mt-3 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer le brouillon</button><Link to={mailportReferenceLink("tracking", form.reference)} className="ml-3 inline-block font-bold text-omgGreen">Consulter le suivi</Link></form>}
      {config.kind === "map" && <div className="rounded-2xl bg-white p-5 text-slate-800"><h2 className="text-xl font-bold">Localisation du colis</h2><p className="mt-3">La cartographie temps réel n'est pas encore disponible.</p>{reference && <p className="mt-2">Colis sélectionné : {reference}</p>}<Link to={mailportReferenceLink("tracking", reference)} className="mt-3 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Suivre un colis</Link></div>}
      {config.kind === "settings" && <div className="rounded-2xl bg-white p-5 text-slate-800"><label className="flex items-center justify-between gap-4"><span>Préférence de notification des colis</span><input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} /></label><button type="button" onClick={() => { try { localStorage.setItem(`omg_mailport_preferences_${profile.email || ""}`, JSON.stringify({ alerts })); setNotice("Préférence enregistrée sur cet appareil ; l'application aux envois serveur reste à connecter."); } catch { setNotice("Impossible d'enregistrer cette préférence."); } }} className="mt-4 rounded bg-omgGreen px-4 py-2 font-bold text-white">Enregistrer</button><Link to="/settings" className="ml-3 inline-block font-bold text-omgGreen">Paramètres du compte</Link></div>}
      {config.kind === "support" && <div className="rounded-2xl bg-white p-5 text-slate-800"><details><summary className="cursor-pointer font-black">Comment utiliser un QR Mailport ?</summary><p className="mt-3">Ouvrez le parcours de remise adapté à votre rôle et renseignez la référence du colis.</p></details><div className="mt-4"><ParcelLinks reference={reference} role={role} /></div></div>}
    </>}
    {notice && <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-900">{notice}</p>}
    <nav aria-label="Retours Mailport" className="mt-6 flex flex-wrap gap-3"><Link to="/mailport" className="rounded border border-omgGold px-4 py-2 font-bold text-omgGold">Retour au menu Mailport</Link>{profile && section !== "history" && <Link to="/mailport/history" className="rounded border px-4 py-2">Historique des colis</Link>}</nav>
  </section></DashboardLayout>;
}

export default function MailportSectionPage({ parcelDetail = false }) {
  const location = useLocation();
  return <MailportPage key={`${location.pathname}${location.search}`} parcelDetail={parcelDetail} />;
}
