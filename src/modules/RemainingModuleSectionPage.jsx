import React, { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getActionsForUserType } from "../data/moduleLogic";
import { findModulePage } from "../data/pageInventory";
import PropertyWorkspace from "./property/PropertyWorkspace";
import RestaurantWorkspace from "./restaurant/RestaurantWorkspace";
import SchoolWorkspace from "./school/SchoolWorkspace";
import CityWorkspace from "./city/CityWorkspace";
import TaxWorkspace from "./taxpro/TaxWorkspace";
import AdminWorkspace from "./administration/AdminWorkspace";

const workspaces = {
  property: PropertyWorkspace,
  restaurant: RestaurantWorkspace,
  school: SchoolWorkspace,
  city: CityWorkspace,
  taxpro: TaxWorkspace,
  administration: AdminWorkspace
};

const sectionActions = {
  property: {
    search: ["Rechercher", "Filtrer par pays/ville/rue/zipcode"], details: ["Rechercher", "Publier bien"], map: ["Filtrer par pays/ville/rue/zipcode", "Rechercher"],
    favorites: ["Favoris"], contact: ["Payer proprietaire", "Recevoir paiement"], settings: ["Comparer", "Disponibilite"]
  },
  restaurant: {
    restaurants: ["Commander", "Vendre", "Creer etablissement"], menu: ["Commander", "Vendre", "Ajouter menus/chambres/tables"],
    reservations: ["Reserver table", "Suivre commande", "Gerer employes"], hotel: ["Reserver chambre", "Ajouter menus/chambres/tables"],
    catering: ["Commander", "Vendre", "Inventaire"], orders: ["Suivre commande", "Voir recu", "Rapports"], management: ["Rapports", "Voir ses ventes", "Inventaire"]
  },
  school: {
    student: ["Voir rapports proteges", "Publier rapports"], parent: ["Voir rapports proteges", "Messagerie"], classes: ["Creer classes", "Voir rapports proteges"],
    fees: ["Payer frais", "Fixer frais"], books: ["Acheter livres", "Vendre livres"], reports: ["Voir rapports proteges", "Publier rapports"],
    messages: ["Messagerie", "Publier rapports"], administration: ["Creer ecole", "Creer classes"]
  },
  city: {
    "merchant-registration": ["Enregistrer marchand", "Creer municipalite"], "merchant-profile": ["Voir dossier", "Collecter donnees"],
    directory: ["Voir statut", "Voir retards", "Enregistrer marchand"], categories: ["Collecter donnees", "Rapports"],
    "tax-calculator": ["Payer taxe", "Marquer paiement"], "tax-payment": ["Payer taxe", "Marquer paiement"], history: ["Voir statut", "Rapports"],
    analytics: ["Rapports", "Audit"], map: ["Attribuer zones", "Collecter donnees"], settings: ["Creer municipalite", "Audit"]
  },
  health: {
    profile: ["Voir dossier", "Consultation", "Signes vitaux", "Notes separees et protegees", "Voir ordonnance", "Ajouter resultats", "Creer sessions employes"],
    doctors: ["Rendez-vous", "Consultation", "Gerer acces"], provider: ["Rendez-vous", "Consultation", "Gerer acces"],
    appointment: ["Rendez-vous", "Consultation"], appointments: ["Rendez-vous", "Notes visite", "Rapports conformite"],
    payment: ["Rendez-vous", "Consultation"], centers: ["Rendez-vous", "Gerer acces", "Creer sessions employes"],
    "provider-dashboard": ["Consultation", "Signes vitaux", "Notes visite", "Notes separees et protegees", "Livrer medicaments", "Ajouter resultats", "Rapports conformite"],
    insurance: ["Pre-autorisations assurance", "Dossiers assurance autorises"], pharmacy: ["Livrer medicaments"], "laboratory-catalog": ["Catalogue examens"],
    imaging: ["Demander imagerie"], "secure-sharing": ["Partager dossier securise"], "emergency-access": ["Acces urgence"], audit: ["Journal audit", "Rapports conformite"]
  },
  taxpro: {
    summary: ["Creer dossier fiscal", "Verifier dossier"], profile: ["Creer dossier fiscal", "Verifier dossier"], business: ["Creer dossier fiscal", "Verifier dossier"],
    documents: ["Scanner documents", "Verifier dossier"], scan: ["Scanner documents", "Valider erreurs"], income: ["Repondre questions IA", "Verifier dossier"],
    expenses: ["Repondre questions IA", "Valider erreurs"], calendar: ["Repondre questions IA", "Preparer soumission"], services: ["Payer service", "Verifier dossier"],
    payment: ["Payer service", "Preparer soumission"], "tax-ai": ["Repondre questions IA", "Valider erreurs"]
  },
  administration: {
    users: ["Roles", "Controle pays", "Verifications"], roles: ["Roles", "Verifications"], modules: ["Dashboard global", "Rapports module"],
    finance: ["Pilotage financier", "Revenus", "Rapports pays", "Rapports module"], agents: ["Agents Payflow", "Agents locaux", "Verifications"], audit: ["Audit", "Incidents"],
    reports: ["Rapports pays", "Rapports module", "Dashboard global"], settings: ["Dashboard global", "Controle pays", "Verifications"]
  }
};

function pickAction(moduleId, section, profile) {
  const logicId = moduleId === "taxpro" ? "tax" : moduleId;
  const visible = getActionsForUserType(logicId, profile?.userType, []);
  return (sectionActions[moduleId]?.[section] || []).find((action) => visible.includes(action)) || "";
}

export default function RemainingModuleSectionPage({ moduleId }) {
  const { section } = useParams();
  const navigate = useNavigate();
  const { getModuleProfile } = useAuth();
  const profileId = moduleId === "taxpro" ? "tax" : moduleId;
  const profile = getModuleProfile(profileId);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const match = findModulePage(moduleId, section);
  if (!match) return <Navigate to="/not-found" replace />;

  const Workspace = workspaces[moduleId];
  const action = pickAction(moduleId, section, profile);
  const [, title, description] = match.page;
  const pages = match.module.pages;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <header>
          <Link to={match.module.basePath} className="font-bold text-omgGreen">← Tableau {match.module.name}</Link>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-600">{description}</p>
        </header>
        <nav aria-label={`Navigation ${match.module.name}`} className="flex gap-2 overflow-x-auto pb-2">
          {pages.map(([slug, label]) => <Link key={slug} to={`${match.module.basePath}/${slug}`} aria-current={slug === section ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${slug === section ? "bg-omgGreen text-white" : "border bg-white text-slate-700"}`}>{label}</Link>)}
        </nav>
        {!profile ? (
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-black">Profil {match.module.name} requis</h2>
            <p className="mt-2 text-slate-600">Creez ou ouvrez votre profil pour utiliser cette fonction et appliquer les permissions de votre role.</p>
            <Link to={match.module.basePath} className="mt-4 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Ouvrir le module</Link>
          </section>
        ) : profile.modulePassword && !isUnlocked ? (
          <form
            className="rounded-2xl border bg-white p-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (accessPassword !== profile.modulePassword) {
                setAccessError("Mot de passe du module incorrect.");
                return;
              }
              setAccessError("");
              setIsUnlocked(true);
            }}
          >
            <h2 className="text-xl font-black">Ouvrir l'espace {match.module.name}</h2>
            <p className="mt-2 text-slate-600">Confirmez le mot de passe propre a ce module avant d'acceder aux donnees metier.</p>
            <input type="password" aria-label="Mot de passe du module" value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} className="mt-4 w-full rounded border p-3" placeholder="Mot de passe du module" />
            {accessError && <p className="mt-3 font-semibold text-red-700">{accessError}</p>}
            <button type="submit" className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Continuer</button>
          </form>
        ) : !action ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-950">Fonction non autorisee pour ce role</h2>
            <p className="mt-2 text-amber-900">Profil actif : {profile.userType}. Revenez au menu pour choisir une fonction autorisee.</p>
            <Link to={match.module.basePath} className="mt-4 inline-block rounded bg-slate-900 px-5 py-3 font-bold text-white">Retour au menu</Link>
          </section>
        ) : (
          <Workspace selectedAction={action} profile={profile} closeModuleAction={() => navigate(match.module.basePath)} />
        )}
      </div>
    </DashboardLayout>
  );
}
