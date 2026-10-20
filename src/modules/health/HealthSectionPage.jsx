import React from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSectionTask, getModuleActionDestination } from "../../data/moduleNavigation";
import { FaBell, FaClipboardList, FaFlask, FaLock, FaNotesMedical, FaPills, FaShieldAlt, FaUserMd, FaXRay } from "react-icons/fa";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getActionsForUserType } from "../../data/moduleLogic";
import { findModulePage } from "../../data/pageInventory";
import HealthWorkspace from "./HealthWorkspace";

// Canonical Health Care journeys. Former duplicated catalogue pages now resolve
// to one operational journey instead of rendering the generic module page.
const redirects = {
  provider: "doctors",
  appointment: "doctors",
  centers: "doctors",
  "provider-dashboard": "audit"
};

const pageActions = {
  profile: "Voir dossier",
  doctors: "Rendez-vous",
  appointments: "Mes rendez-vous",
  payment: "Paiement sante",
  insurance: "Pre-autorisations assurance",
  pharmacy: "Livrer medicaments",
  "laboratory-catalog": "Catalogue examens",
  imaging: "Demander imagerie",
  "secure-sharing": "Partager dossier securise",
  "emergency-access": "Acces urgence",
  audit: "Journal audit"
};

const navGroups = [
  { label: "Espace de soins", items: [["profile", "Dossier", FaNotesMedical], ["doctors", "Professionnels", FaUserMd], ["appointments", "Rendez-vous", FaClipboardList]] },
  { label: "Parcours clinique", items: [["pharmacy", "Pharmacie", FaPills], ["laboratory-catalog", "Laboratoire", FaFlask], ["imaging", "Imagerie", FaXRay]] },
  { label: "Protection", items: [["insurance", "Assurance", FaShieldAlt], ["secure-sharing", "Partage sécurisé", FaLock], ["audit", "Audit", FaShieldAlt]] }
];

export default function HealthSectionPage() {
  const { section } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { getModuleProfile } = useAuth();
  const match = findModulePage("health", section);
  const profile = getModuleProfile("health");

  if (!match) return <Navigate to="/not-found" replace />;
  if (section === "provider-dashboard" && profile) {
    const firstAction = getActionsForUserType("health", profile.userType, [])[0];
    return <Navigate to={getModuleActionDestination("health", firstAction) || "/health-care"} replace />;
  }
  if (redirects[section]) return <Navigate to={`/health-care/${redirects[section]}${search.toString() ? `?${search.toString()}` : ""}`} replace />;

  const [, title, description] = match.page;
  const roleActions = profile ? getActionsForUserType("health", profile.userType, []) : [];
  const action = search.get("task") ? getSectionTask("health", section, search.get("task"), profile?.userType) : getSectionTask("health", section, "", profile?.userType) || pageActions[section];
  const authorized = profile && (roleActions.includes(action) || (["appointments", "payment"].includes(section) && !search.get("task") && roleActions.includes("Rendez-vous")));
  const canOpen = (slug) => Boolean(getSectionTask("health", slug, "", profile?.userType)) || (["appointments", "payment"].includes(slug) && roleActions.includes("Rendez-vous"));
  const pages = match.module.pages.filter(([slug]) => !redirects[slug] && canOpen(slug));

  return (
    <DashboardLayout>
      <main className="overflow-hidden rounded-3xl border border-emerald-950/15 bg-[#f4f8f6] shadow-sm">
        <div className="grid min-h-[calc(100vh-10rem)] lg:grid-cols-[238px_minmax(0,1fr)]">
          <aside className="hidden bg-gradient-to-b from-[#063d35] to-[#022821] p-4 text-emerald-50 lg:block">
            <Link to="/health-care" className="flex items-center gap-3 border-b border-white/15 pb-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-omgGold text-lg font-black text-[#073a32]">OMG</span>
              <span><strong className="block text-sm">OMG Platform</strong><small className="text-emerald-100/70">Health Care</small></span>
            </Link>
            <p className="mt-5 px-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/55">{profile?.userType || "Accès sécurisé"}</p>
            <nav aria-label="Navigation Health Care" className="mt-3 space-y-5">
              {navGroups.map((group) => <div key={group.label}><p className="px-2 text-[11px] font-bold uppercase tracking-wider text-emerald-100/45">{group.label}</p><div className="mt-2 space-y-1">{group.items.filter(([slug]) => canOpen(slug)).map(([slug, label, Icon]) => <Link key={slug} to={`/health-care/${slug}`} aria-current={slug === section ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${slug === section ? "bg-emerald-500 text-white shadow" : "text-emerald-50/85 hover:bg-white/10"}`}><Icon className="text-base" />{label}</Link>)}</div></div>)}
            </nav>
            <Link to="/health-care/emergency-access" className="mt-6 flex items-center gap-3 rounded-xl border border-red-200/35 bg-red-950/40 px-3 py-3 text-sm font-bold text-red-100"><FaBell />Accès urgence</Link>
          </aside>
          <div className="min-w-0">
            <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><Link to="/health-care" className="text-sm font-bold text-emerald-700">← Health Care</Link><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>
                <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><FaShieldAlt className="mr-1 inline" />Accès contrôlé</span><Link to="/notifications" className="grid h-9 w-9 place-items-center rounded-full border text-slate-600" aria-label="Notifications"><FaBell /></Link></div>
              </div>
              <nav aria-label="Navigation Health Care mobile" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {pages.map(([slug, label]) => <Link key={slug} to={`/health-care/${slug}`} aria-current={slug === section ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${slug === section ? "bg-emerald-700 text-white" : "border bg-white text-slate-700"}`}>{label}</Link>)}
              </nav>
            </header>
            <div className="p-5 sm:p-7">
        {!profile ? (
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-black">Profil Health Care requis</h2>
            <p className="mt-2 text-slate-600">Ouvrez le module pour créer le profil et appliquer les droits médicaux adaptés à votre rôle.</p>
            <Link to="/health-care" className="mt-4 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Ouvrir Health Care</Link>
          </section>
        ) : !authorized ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-950">Accès limité par le Patient Data Firewall</h2>
            <p className="mt-2 text-amber-900">Cette fonction n’est pas nécessaire pour le rôle actif : {profile.userType}.</p>
            <Link to="/health-care" className="mt-4 inline-block rounded bg-slate-900 px-5 py-3 font-bold text-white">Retour aux services autorisés</Link>
          </section>
        ) : (
          <><nav aria-label="Actions de mon rôle santé" className="mb-4 flex flex-wrap gap-2">{roleActions.map((item) => <Link key={item} className="rounded border bg-white px-3 py-2 text-sm text-emerald-800" to={getModuleActionDestination("health", item)}>{item}</Link>)}</nav><HealthWorkspace key={`${section}/${search.toString()}`} initialReference={search.get("reference") || ""} selectedAction={action} profile={profile} closeModuleAction={() => navigate("/health-care")} /></>
        )}
            </div>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 bg-[#063d35] px-5 py-3 text-xs text-emerald-50/85"><strong className="text-omgGold">OMG Platform</strong><span className="hidden xl:inline">Secure Health. Connected Care. Intelligent Future.</span><nav aria-label="Modules intégrés" className="flex items-center gap-1"><Link to="/health-care" className="rounded px-2 py-1.5 hover:bg-white/10"><FaNotesMedical className="mx-auto" /><span className="sr-only">Santé</span></Link><Link to="/health-care/laboratory-catalog" className="rounded px-2 py-1.5 hover:bg-white/10"><FaFlask className="mx-auto" /><span className="sr-only">Laboratoire</span></Link><Link to="/health-care/pharmacy" className="rounded px-2 py-1.5 hover:bg-white/10"><FaPills className="mx-auto" /><span className="sr-only">Pharmacie</span></Link><Link to="/health-care/insurance" className="rounded px-2 py-1.5 hover:bg-white/10"><FaShieldAlt className="mx-auto" /><span className="sr-only">Assurance</span></Link><Link to="/platform-administration" className="rounded px-2 py-1.5 hover:bg-white/10"><FaClipboardList className="mx-auto" /><span className="sr-only">Administration</span></Link></nav><span className="rounded-full bg-white/10 px-3 py-1">Données accessibles selon votre rôle</span></footer>
      </main>
    </DashboardLayout>
  );
}
