import {
  FaBuilding,
  FaCity,
  FaGraduationCap,
  FaHeartbeat,
  FaHome,
  FaHotel,
  FaLandmark,
  FaMailBulk,
  FaMoneyBillWave,
  FaSchool,
  FaShoppingBag,
  FaPlane
} from "react-icons/fa";

export const modules = [
  {
    id: "payflow",
    nameKey: "payflow",
    name: "Payflow",
    route: "/payflow",
    icon: FaMoneyBillWave,
    subtitle: "Paiements, transferts, QR, depot, retrait et wallet.",
    userTypes: ["Avec carte bancaire", "Avec operateur Payflow"],
    actions: ["Envoyer", "Demander", "Client service special", "Utiliser son QR"],
    photoRule: "KYC uniquement si le systeme le demande selon le seuil ou le risque.",
    paymentRule: "Coeur financier connecte aux 10 autres modules: Payflow, carte de credit, Mastercard, carte de debit, banque locale, banque internationale et moyens autorises."
  },
  {
    id: "mailport",
    nameKey: "mailport",
    name: "Mailport",
    route: "/mailport",
    icon: FaMailBulk,
    subtitle: "Adresses referentielles, colis, QR et livreurs.",
    userTypes: ["Proprietaire d'adresse", "Acheteur d'adresse", "Livreur"],
    actions: ["Publier adresse gratuitement", "Acheter adresse", "Suivre colis", "Livraisons"],
    photoRule: "Photo requise pour proprietaire d'adresse et livreur, pas pour acheteur simple.",
    paymentRule: "Paiement adresse, commissions proprietaire et livreur via Payflow, carte de credit, Mastercard, carte de debit ou autre moyen autorise."
  },
  {
    id: "store",
    nameKey: "store",
    name: "Store Online",
    route: "/store",
    icon: FaShoppingBag,
    subtitle: "Boutiques, produits, panier et livraison Mailport.",
    userTypes: ["Acheteur", "Proprietaire de store"],
    actions: ["Voir produits", "Panier", "Ouvrir boutique", "Commandes"],
    photoRule: "Photo reservee aux proprietaires de store pour produits et boutique.",
    paymentRule: "Paiements via Payflow, carte de credit, Mastercard, carte de debit et moyens externes autorises, livraison connectee a Mailport."
  },
  {
    id: "property",
    nameKey: "property",
    name: "Property",
    route: "/property",
    icon: FaHome,
    subtitle: "Recherche, publication, visites et paiements immobiliers.",
    userTypes: ["Chercheur", "Proprietaire de bien"],
    actions: ["Rechercher", "Publier bien", "Favoris", "Payer proprietaire"],
    photoRule: "Photo et video reservees aux proprietaires qui publient un bien.",
    paymentRule: "Commission plateforme et paiement proprietaire via Payflow, carte de credit, Mastercard, carte de debit ou banque."
  },
  {
    id: "restaurant",
    nameKey: "restaurant",
    name: "Restaurant / Hotel / Traiteur",
    route: "/restaurant-hotel-traiteur",
    icon: FaHotel,
    subtitle: "Menus, chambres, tables, reservations, ventes et inventaires.",
    userTypes: ["Client", "Proprietaire", "Employe"],
    actions: ["Commander", "Reservation", "Gestion menus", "Rapports"],
    photoRule: "Photo reservee aux proprietaires pour etablissement, chambres, plats et services.",
    paymentRule: "Paiements Payflow, carte de credit, Mastercard, carte de debit, cash et autres moyens acceptes."
  },
  {
    id: "school",
    nameKey: "school",
    name: "School",
    route: "/school",
    icon: FaSchool,
    subtitle: "Etablissements, parents, eleves, livres, frais et rapports.",
    userTypes: ["Parent ou responsable", "Proprietaire d'etablissement"],
    actions: ["Payer frais", "Acheter livres", "Rapports eleve", "Gestion ecole"],
    photoRule: "Photo reservee aux proprietaires d'etablissement pour l'ecole et les livres.",
    paymentRule: "Paiement des frais par Payflow, carte de credit, Mastercard, carte de debit ou banque; compte Payflow ou bancaire requis pour recevoir les frais."
  },
  {
    id: "city",
    nameKey: "city",
    name: "City Administration",
    route: "/city-administration",
    icon: FaCity,
    subtitle: "Municipalites, zones, agents, marchands et taxes locales.",
    userTypes: ["Responsable mairie", "Agent", "Marchand"],
    actions: ["Marchands", "Taxes", "Zones", "Rapports"],
    photoRule: "Photo utile pour dossiers marchands et controle terrain par agents autorises.",
    paymentRule: "Taxes collectees via Payflow, carte de credit, Mastercard, carte de debit et moyens locaux avec audit."
  },
  {
    id: "health",
    nameKey: "health",
    name: "Health Care",
    route: "/health-care",
    icon: FaHeartbeat,
    subtitle: "Dossier patient, teleconsultation, pharmacie, laboratoire et HIPAA.",
    userTypes: ["Patient", "Medecin", "Infirmier", "Psychologue", "Pharmacie", "Laboratoire", "Assurance", "Administration sante", "Institution"],
    actions: ["Dossier patient", "Rendez-vous", "Teleconsultation", "Ordonnances", "Acces urgence"],
    photoRule: "Diplomes et documents professionnels pour medecins, psychologues, laboratoires et pharmacies.",
    paymentRule: "Paiements consultation et services via Payflow, carte de credit, Mastercard, carte de debit ou autres moyens autorises."
  },
  {
    id: "travel",
    nameKey: "travel",
    name: "One Million Travel",
    route: "/travel",
    icon: FaPlane,
    subtitle: "Vols, hotels, assurance, itineraires et reservations transparentes.",
    userTypes: ["Voyageur", "Partenaire voyage", "Administration Travel"],
    actions: ["Planifier voyage", "Rechercher vols", "Rechercher hotels", "Mes voyages"],
    photoRule: "Documents de voyage et photos ne sont demandés que lorsque nécessaires à une réservation confirmée par un fournisseur.",
    paymentRule: "Paiements via Payflow, MonCash, NatCash, carte de credit, Mastercard, carte de debit et moyens autorises. Les prix, frais, équivalents locaux et disponibilités sont revérifiés par le backend avant achat."
  },
  {
    id: "university",
    nameKey: "university",
    name: "University Integration",
    route: "/university-integration",
    icon: FaGraduationCap,
    subtitle: "Facultes, cours, chapitres, tests 75%, examens et Fred 509 Assistant.",
    userTypes: ["Postulant", "Parent ou proche payeur"],
    actions: ["Choisir pays", "Choisir facultes", "Payer session", "Suivre cours"],
    photoRule: "Pas de photo ni piece d'identite pour le postulant.",
    paymentRule: "Un parent ou proche peut payer 19.99 USD ou equivalent par Payflow, carte de credit, Mastercard, carte de debit ou autre moyen autorise et donner acces par email."
  },
  {
    id: "tax",
    nameKey: "tax",
    name: "USA Tax Pro",
    route: "/usa-tax-pro",
    icon: FaLandmark,
    subtitle: "USA only, documents fiscaux, IA, signature et preparation IRS.",
    userTypes: ["Contribuable USA", "Fiscaliste autorise"],
    actions: ["Dossier fiscal", "Documents", "Analyse IA", "Paiement service"],
    photoRule: "Document et identite uniquement quand la regle fiscale ou KYC le demande.",
    paymentRule: "Frais de service affiches avant validation, paiement accepte par Payflow, carte de credit, Mastercard, carte de debit et moyens fiscaux autorises."
  },
  {
    id: "administration",
    nameKey: "administration",
    name: "Platform Administration",
    route: "/platform-administration",
    icon: FaBuilding,
    subtitle: "Centre de controle des transactions, agents, cours et administrateurs reserves.",
    userTypes: ["Super admin", "Admin pays", "Controle module"],
    actions: ["Dashboard global", "Transactions des 10 modules", "Pilotage financier", "Agents Payflow", "Livreurs Mailport", "Cours University", "Administrateurs reserves", "Audit"],
    photoRule: "Espace interne reserve a l'administration autorisee.",
    paymentRule: "Controle les revenus, commissions, rapports et audit de tous les modules, incluant Payflow, carte de credit, Mastercard, carte de debit et banque."
  }
];

export function getModuleById(id) {
  return modules.find((item) => item.id === id);
}
