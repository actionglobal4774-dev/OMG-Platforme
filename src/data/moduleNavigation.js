import { modulePageInventory } from "./pageInventory.js";
import { getActionsForUserType } from "./moduleLogic.js";

// Modules are migrated individually. Unregistered modules retain their existing navigation.
export const moduleActionSections = {
  travel: {
    "Planifier voyage": "home", "Rechercher vols": "flights", "Rechercher hotels": "hotels", "Comparer assurance": "insurance", "Mes voyages": "trips", "Mes reservations": "bookings", "Documents voyage": "documents", "Assistance voyage": "support",
    "Gerer offres partenaires": "partner", "Verifier disponibilites": "partner", "Support voyageur": "support", "Rapports partenaires": "partner",
    "Administration Travel": "administration", "Reservations a verifier": "administration", Fournisseurs: "administration", Tarification: "administration", "Audit Travel": "administration", "Rapports Travel": "administration"
  },
  university: {
    "Choisir pays": "map", "Choisir facultes": "faculties", "Suivre cours": "progress", "Passer test 75%": "progress", "Examen final": "progress",
    "Payer session": "payment", "Entrer email postulant": "payment", "Recevoir confirmation": "parent"
  },
  taxpro: {
    "Creer dossier fiscal": "profile", "Scanner documents": "documents", "Repondre questions IA": "tax-ai", Signer: "summary", "Payer service": "payment",
    "Verifier dossier": "summary", "Valider erreurs": "scan", "Preparer soumission": "services"
  },
  administration: {
    "Dashboard global": "modules", Revenus: "finance", "Pilotage financier": "finance", Roles: "roles", "Agents Payflow": "agents", "Livreurs Mailport": "agents",
    "University contenu": "modules", Audit: "audit", "Controle pays": "users", "Agents locaux": "agents", "Rapports pays": "reports",
    "Rapports module": "reports", Incidents: "audit", Verifications: "users"
  },
  city: {
    "Creer municipalite": "settings", "Attribuer zones": "map", "Voir retards": "directory", Rapports: "analytics", Audit: "analytics",
    "Enregistrer marchand": "merchant-registration", "Prendre photo marchand": "merchant-profile", "Collecter donnees": "merchant-profile", "Marquer paiement": "tax-payment",
    "Voir dossier": "merchant-profile", "Payer taxe": "tax-payment", "Voir statut": "history"
  },
  store: {
    "Voir produits": "search", "Ajouter panier": "search", "Choisir adresse": "checkout", Payer: "checkout", "Suivre livraison": "tracking",
    "Ouvrir boutique": "seller-center", "Ajouter produits": "products", "Ajouter photos": "products", "Gerer stock": "products", "Voir ventes": "seller-center"
  },
  health: {
    "Voir dossier": "profile", "Rendez-vous": "doctors", Prescriptions: "pharmacy", "Resultats analyses": "laboratory-catalog", Teleconsultation: "doctors",
    "Partager dossier securise": "secure-sharing", Consultation: "profile", Diagnostic: "profile", Ordonnance: "pharmacy", "Demander imagerie": "imaging", "Acces urgence": "emergency-access",
    "Signes vitaux": "profile", "Notes visite": "profile", "Notes separees et protegees": "profile", "Voir ordonnance": "pharmacy", "Livrer medicaments": "pharmacy",
    "Ajouter resultats": "laboratory-catalog", "Catalogue examens": "laboratory-catalog", "Pre-autorisations assurance": "insurance", "Dossiers assurance autorises": "insurance",
    "Rapports conformite": "audit", "Journal audit": "audit", "Gerer acces": "audit", "Creer sessions employes": "audit"
  },
  school: {
    "Payer frais": "fees", "Acheter livres": "books", "Voir rapports proteges": "reports", Messagerie: "messages",
    "Creer ecole": "administration", "Creer classes": "classes", "Fixer frais": "fees", "Vendre livres": "books", "Publier rapports": "reports"
  },
  restaurant: {
    Commander: "menu", "Reserver table": "reservations", "Reserver chambre": "hotel", Payer: "orders", "Voir recu": "orders",
    "Creer etablissement": "management", "Ajouter menus/chambres/tables": "management", "Gerer employes": "management", Inventaire: "management", Rapports: "management",
    Vendre: "menu", "Suivre commande": "orders", "Encaisser autorise": "orders", "Voir ses ventes": "management"
  },
  property: {
    Rechercher: "search", "Filtrer par pays/ville/rue/zipcode": "search", Favoris: "favorites", Comparer: "settings",
    "Payer proprietaire": "contact", "Publier bien": "details", "Ajouter photos/videos": "details",
    Disponibilite: "settings", "Contrat numerique": "details", "Recevoir paiement": "contact"
  }
};

export function navigationModuleId(id) { return id === "tax" ? "taxpro" : id; }
export function navigationLogicId(id) { return id === "taxpro" ? "tax" : id; }
export function getModuleActionDestination(moduleId, action) {
  const id = navigationModuleId(moduleId);
  const registry = moduleActionSections[id];
  if (!registry || !Object.hasOwn(registry, action)) return null;
  const module = modulePageInventory.find((item) => item.id === id);
  const slug = registry[action];
  if (!module?.pages.some(([page]) => page === slug)) return null;
  return `${module.basePath}/${slug}?task=${encodeURIComponent(action)}`;
}
export function getSectionTask(moduleId, section, task, userType) {
  const id = navigationModuleId(moduleId);
  const registry = moduleActionSections[id];
  const allowed = getActionsForUserType(navigationLogicId(id), userType, []);
  if (!registry) return "";
  if (task) return Object.hasOwn(registry, task) && registry[task] === section && allowed.includes(task) ? task : "";
  if (id === "property" && ["details", "map"].includes(section) && allowed.includes("Rechercher")) return "Rechercher";
  return allowed.find((action) => registry[action] === section) || "";
}
