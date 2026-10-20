import React from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSectionTask } from "../../data/moduleNavigation";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { getActionsForUserType } from "../../data/moduleLogic";
import { findModulePage } from "../../data/pageInventory";
import TravelWorkspace from "./TravelWorkspace";

const actions = {
  home: "Planifier voyage", assistant: "Planifier voyage", flights: "Rechercher vols", hotels: "Rechercher hotels", insurance: "Comparer assurance",
  trips: "Mes voyages", bookings: "Mes reservations", payment: "Planifier voyage", documents: "Documents voyage", support: "Assistance voyage",
  partner: "Gerer offres partenaires", administration: "Administration Travel"
};

export default function TravelSectionPage() {
  const { section } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { getModuleProfile } = useAuth();
  const profile = getModuleProfile("travel");
  const match = findModulePage("travel", section);
  if (!match) return <Navigate to="/not-found" replace />;
  const [, title, description] = match.page;
  const action = search.get("task") ? getSectionTask("travel", section, search.get("task"), profile?.userType) : getSectionTask("travel", section, "", profile?.userType) || actions[section];
  const allowed = profile && getActionsForUserType("travel", profile.userType, []).includes(action);

  return <DashboardLayout><main className="mx-auto max-w-7xl space-y-5"><header className="rounded-2xl bg-gradient-to-r from-[#063d35] to-[#0b614e] p-6 text-white"><Link to="/travel" className="text-sm font-bold text-omgGold">← One Million Travel</Link><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 text-emerald-50/85">{description}</p></header><nav aria-label="Navigation One Million Travel" className="flex gap-2 overflow-x-auto pb-2">{match.module.pages.map(([slug, label]) => <Link key={slug} to={`/travel/${slug}`} aria-current={slug === section ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${slug === section ? "bg-emerald-700 text-white" : "border bg-white text-slate-700"}`}>{label}</Link>)}</nav>{!profile ? <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Profil Travel requis</h2><p className="mt-2 text-slate-600">Créez votre profil Travel pour choisir un rôle et utiliser les parcours autorisés.</p><Link to="/travel" className="mt-4 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Ouvrir One Million Travel</Link></section> : !allowed ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-xl font-black text-amber-950">Accès non autorisé</h2><p className="mt-2 text-amber-900">Cette fonction n'est pas nécessaire pour le rôle actif : {profile.userType}.</p><Link to="/travel" className="mt-4 inline-block rounded bg-slate-900 px-5 py-3 font-bold text-white">Retour aux services autorisés</Link></section> : <TravelWorkspace selectedAction={action} profile={profile} closeModuleAction={() => navigate("/travel")} />}</main></DashboardLayout>;
}
