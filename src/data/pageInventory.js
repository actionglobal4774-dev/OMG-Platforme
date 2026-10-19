export const modulePageInventory = [
  {
    id: "payflow",
    name: "Payflow",
    basePath: "/payflow",
    pages: [
      ["wallet", "Wallet", "Solde multi-devises et actions rapides", ["USD Wallet · $2,450", "HTG Wallet · 150,000 G", "EUR Wallet · €800"]],
      ["send", "Send Money", "Envoyer de l'argent en toute sécurité", ["Marie Jean", "$100 USD", "13,200 HTG"]],
      ["request", "Request Money", "Créer et partager une demande de paiement", ["$500", "School payment", "QR · Link · Contact"]],
      ["receive", "Receive Money", "Recevoir un paiement Payflow", ["Messages reçus", "QR de réception", "Confirmation directe"]],
      ["deposit", "Deposit", "Ajouter des fonds au portefeuille", ["Payflow operator", "Bank card", "Bank transfer"]],
      ["withdraw", "Withdraw", "Retirer des fonds depuis un opérateur", ["Available · $2,450", "Nearby operator · 1.2 km", "Estimated fee · $2.25"]],
      ["exchange", "Exchange", "Convertir les devises du portefeuille", ["USD → HTG", "Rate · 132", "Receive · 13,200 HTG"]],
      ["transactions", "Transactions", "Historique des opérations Payflow", ["+$500 · Received", "-$120 · Store purchase", "-$50 · School payment"]],
      ["qr-payment", "QR Payment", "Payer ou recevoir avec un code QR", ["OMG-HT-483920", "Scan QR", "Generate QR"]],
      ["operators", "Operators Map", "Opérateurs Payflow à proximité", ["Port-au-Prince", "Open", "Deposit · Withdraw"]],
      ["verification", "Verification", "Niveau et contrôles du compte", ["Level 2", "Phone verified", "KYC ready"]],
      ["payment-methods", "Payment Methods", "Gérer les moyens de paiement", ["Payflow Wallet", "Mastercard · •••• 5090", "Bank account"]],
      ["settings", "Payflow Settings", "Préférences et sécurité du portefeuille", ["PIN security", "Biometrics", "Transaction alerts"]],
      ["dispute", "Dispute", "Ouvrir un litige sur une transaction", ["Référence", "Explication", "Confirmation"]],
      ["track-transfer", "Track Transfer", "Suivre un transfert Payflow", ["Référence", "État", "Délai estimé"]]
    ]
  },
  {
    id: "mailport",
    name: "Mailport",
    basePath: "/mailport",
    pages: [
      ["address-search", "Address Search", "Trouver une adresse numérique mondiale", ["Boston · USA", "Port-au-Prince · Haiti", "Search by city or code"]],
      ["my-address", "My Address", "Adresse Mailport et QR personnel", ["OMG-US-BOS-458921", "Boston · USA", "Valid until 2028"]],
      ["create-address", "Create Address", "Créer une adresse Mailport", ["Country", "City", "Location details"]],
      ["tracking", "Parcel Tracking", "Suivre un colis en temps réel", ["Package · OMG-MP-10025", "In transit", "ETA · 2 hours"]],
      ["history", "Parcel History", "Historique de vos colis", ["3 in transit", "2 arrived", "1 ready for pickup"]],
      ["driver", "Driver Workspace", "Missions et confirmations de livraison", ["4 assigned deliveries", "Next stop · 1.8 km", "Scan delivery QR"]]
      , ["delivery", "Delivery & Handover", "Scan, preuve et signature de remise", ["Scan QR", "Confirm Receipt", "Accept Delivery"]],
      ["messages", "Mailport Messages", "Messagerie liee aux colis", ["Contact owner", "Contact carrier", "Parcel reference"]],
      ["claims", "Claims", "Creer et suivre une reclamation", ["Report Issue", "Evidence", "Claim status"]],
      ["map", "Map & Location", "Carte et navigation de livraison", ["Current location", "Destination", "Navigate"]],
      ["settings", "Mailport Settings", "Notifications et preferences Mailport", ["Status alerts", "Delivery preferences", "Account settings"]],
      ["support", "Mailport Support", "Aide contextuelle Mailport", ["QR help", "Delivery help", "Contact support"]]
    ]
  },
  {
    id: "property",
    name: "Property",
    basePath: "/property",
    pages: [
      ["search", "Property Search", "Rechercher par pays, ville, type et prix", ["Boston · USA", "House · 4 bedrooms", "Maximum · $500,000"]],
      ["details", "Property Details", "Détails complets du bien sélectionné", ["Modern House Boston", "$450,000", "4 beds · 3 baths"]],
      ["map", "Property Map", "Biens disponibles sur la carte", ["Boston · 12 listings", "Paris · 8 listings", "Nearby · 4 listings"]],
      ["favorites", "Favorites", "Propriétés sauvegardées", ["Modern House Boston", "Apartment Paris", "Compare selections"]],
      ["contact", "Agent Contact", "Contacter un agent ou demander une visite", ["Verified agent", "Schedule visit", "Send inquiry"]],
      ["settings", "Property Settings", "Préférences de recherche immobilière", ["Buy or rent", "Saved locations", "Price alerts"]]
    ]
  },
  {
    id: "restaurant",
    name: "Restaurant, Hotel & Catering",
    basePath: "/restaurant-hotel-traiteur",
    pages: [
      ["restaurants", "Restaurants", "Découvrir les établissements et menus", ["Nearby restaurants", "Open now", "Delivery available"]],
      ["menu", "Menu & Ordering", "Commander des plats et services", ["Chef special · $24", "Family meal · $48", "Checkout with Payflow"]],
      ["reservations", "Reservations", "Réserver une table ou une chambre", ["Tonight · 7:30 PM", "2 guests", "Confirmation ready"]],
      ["hotel", "Hotel", "Chambres, disponibilités et réservations", ["Deluxe room", "$149 / night", "Breakfast included"]],
      ["catering", "Catering", "Planifier un service traiteur", ["Event date", "Guest count", "Custom menu"]],
      ["orders", "Orders", "Suivre les commandes en cours", ["#OMG-4821 · Preparing", "#OMG-4810 · Delivered", "Average time · 24 min"]],
      ["management", "Business Management", "Ventes, personnel et inventaire", ["Revenue today · $4,250", "12 active staff", "3 stock alerts"]]
    ]
  },
  {
    id: "store",
    name: "One Million Store",
    basePath: "/store",
    pages: [
      ["search", "Product Search", "Recherche mondiale et recommandations IA", ["Wireless headphones · $49", "Educational kit · $35", "Smart watch · $59.99"]],
      ["product", "Product Details", "Produit, vendeur, livraison et avis", ["Tech Store · Verified", "Mailport available", "Rating · 4.7"]],
      ["categories", "Categories", "Explorer les catégories du marketplace", ["Electronics", "Fashion", "Home · Food · Gifts"]],
      ["cart", "Shopping Cart", "Panier intelligent et récapitulatif", ["Products · $75", "Delivery · $8", "Total · $84.25"]],
      ["checkout", "Checkout", "Adresse Mailport et paiement Payflow", ["Mailport address selected", "Payflow Wallet", "Secure confirmation"]],
      ["orders", "Orders", "Commandes et livraisons", ["#10025 · Shipped", "#10018 · Delivered", "Track with Mailport"]],
      ["seller-center", "Seller Center", "Pilotage de la boutique vendeur", ["250 products", "48 orders today", "Revenue · $3,450"]],
      ["products", "Product Management", "Ajouter et gérer les produits", ["12 drafts", "238 published", "4 low stock"]],
      ["tracking", "Order Tracking", "Suivi temps réel des commandes", ["Order #10025", "Package moving", "ETA · 2 hours"]],
      ["map", "Store Map", "Vendeurs locaux et boutiques mondiales", ["Nearby sellers", "Pickup available", "International delivery"]],
      ["reviews", "Reviews", "Avis clients et réputation vendeur", ["Rating · 4.9", "Delivery · Fast", "Seller · Trusted"]],
      ["commerce-ai", "Commerce AI", "Assistant d'achat et d'optimisation", ["Compare prices", "Find alternatives", "Improve product listings"]]
    ]
  },
  {
    id: "health",
    name: "OMG Health",
    basePath: "/health-care",
    pages: [
      ["profile", "Patient Profile", "Profil patient et préférences essentielles", ["Frederic Cineus", "United States", "Emergency contact configured"]],
      ["doctors", "Doctor Search", "Trouver un professionnel de santé", ["Dr. Smith · General medicine", "Dr. Jean · Pediatrics", "Available today"]],
      ["provider", "Doctor Profile", "Services et disponibilités du professionnel", ["Verified provider", "English · Français", "Next opening · 2:30 PM"]],
      ["appointment", "Book Appointment", "Choisir un service, une date et une heure", ["General consultation", "Tomorrow · 10:00", "In person"]],
      ["appointments", "My Appointments", "Rendez-vous passés et à venir", ["Tomorrow · Dr. Smith", "Confirmed", "Add to calendar"]],
      ["payment", "Health Payment", "Facture et paiement Payflow simulé", ["Consultation · $75", "Payflow Wallet", "Payment protected"]],
      ["centers", "Medical Centers", "Centres, services et horaires", ["Boston Medical Center", "Open now", "2.4 km"]],
      ["provider-dashboard", "Provider Dashboard", "Agenda, services et revenus", ["Appointments today · 6", "Pending requests · 2", "Revenue · $850"]],
      ["insurance", "Insurance Authorization", "Pré-autorisations et couverture limitée", ["Coverage", "Patient contribution", "Decision"]],
      ["pharmacy", "Pharmacy Safety", "Validation avec contrôles allergies et interactions", ["Prescription", "Allergies checked", "Final validation"]],
      ["laboratory-catalog", "Lab Catalog", "Examens, références et valeurs critiques", ["Test codes", "Reference ranges", "Critical values"]],
      ["imaging", "Medical Imaging", "Demandes et rendez-vous d'imagerie", ["MRI", "X-ray", "Secure record"]],
      ["secure-sharing", "Secure Sharing", "Autorisation temporaire et périmètre limité", ["Recipient", "Scope", "Expiration"]],
      ["emergency-access", "Emergency Access", "Accès Break-Glass temporaire et audité", ["Justification", "60 minutes", "Audit trail"]],
      ["audit", "Medical Audit", "Journal des accès et actions sensibles", ["Role", "Action", "Outcome"]]
    ]
  },
  {
    id: "travel",
    name: "One Million Travel",
    basePath: "/travel",
    pages: [
      ["home", "Travel Home", "Préparer un voyage avec prix et conditions transparents", ["Destination", "Durée", "Voyages à venir"]],
      ["assistant", "Travel Assistant", "Assistant conversationnel et itinéraire suggéré", ["Destination", "Budget", "Suggestions"]],
      ["flights", "Flights", "Recherche et comparaison de vols à vérifier", ["Prix fournisseur", "Bagages", "Conditions"]],
      ["hotels", "Hotels", "Hôtels et chambres à vérifier auprès des partenaires", ["Nuits", "Taxes", "Annulation"]],
      ["insurance", "Travel Insurance", "Comparer les garanties proposées par partenaires autorisés", ["Garanties", "Exclusions", "Police"]],
      ["trips", "My Trips", "Itinéraires et voyages préparés", ["À venir", "Activités", "Documents"]],
      ["bookings", "My Bookings", "Réservations et statuts fournisseur", ["Référence", "Statut", "Conditions"]],
      ["payment", "Payment & Receipts", "Récapitulatif transparent avant paiement", ["Frais service", "Taxes", "Confirmation"]],
      ["documents", "Travel Documents", "Billets, confirmations et documents sécurisés", ["Billets", "Hôtel", "Assurance"]],
      ["support", "Travel Support", "Assistant IA et assistance humaine", ["24/7", "Dossier", "Suivi"]],
      ["partner", "Partner Workspace", "Offres et disponibilités partenaire", ["Offres", "Disponibilités", "Support"]],
      ["administration", "Travel Administration", "Réservations, fournisseurs et audit", ["Réservations", "Tarification", "Audit"]]
    ]
  },
  {
    id: "school",
    name: "School",
    basePath: "/school",
    pages: [
      ["student", "Student Profile", "Profil, classe et progression", ["John Smith", "Grade 8", "Attendance · 96%"]],
      ["parent", "Parent Dashboard", "Suivi des élèves et communications", ["2 students", "1 new report", "Next payment · Aug 15"]],
      ["classes", "Classes", "Cours, horaires et enseignants", ["Mathematics", "Science", "Languages"]],
      ["fees", "School Fees", "Frais scolaires et paiements", ["Tuition · $450", "Books · $80", "Pay with Payflow"]],
      ["books", "Books", "Catalogue et achats de livres", ["Mathematics 8", "Science Lab", "Language Workbook"]],
      ["reports", "Reports", "Rapports académiques protégés", ["Term 2 available", "Average · 88%", "Teacher note"]],
      ["messages", "School Messages", "Échanges entre école et responsables", ["3 unread messages", "Parent meeting", "School announcement"]],
      ["administration", "School Administration", "Classes, frais, élèves et rapports", ["840 students", "42 teachers", "96% payments current"]]
    ]
  },
  {
    id: "city",
    name: "City Administration",
    basePath: "/city-administration",
    pages: [
      ["merchant-registration", "Merchant Registration", "Enregistrer un commerçant sur le terrain", ["Merchant name", "Photo capture", "Location & category"]],
      ["merchant-profile", "Merchant Profile", "Profil économique et situation fiscale", ["OMG-CITY-583920", "Food vendor", "Status · Active"]],
      ["directory", "Merchant Directory", "Répertoire des commerçants enregistrés", ["15,450 merchants", "Search by zone", "Filter by status"]],
      ["categories", "Product Categories", "Catégories d'activités commerciales", ["Food", "Clothing", "Agriculture · Services"]],
      ["tax-calculator", "Tax Calculator", "Calcul de taxe et frais de plateforme", ["Municipal tax · $100", "OMG fee · $4.99", "Total · $104.99"]],
      ["tax-payment", "Tax Payment", "Paiement municipal via Payflow", ["Tax period · July", "Total due · $104.99", "Payflow available"]],
      ["history", "Payment History", "Historique des taxes et reçus", ["July · Paid", "June · Paid", "May · Paid"]],
      ["analytics", "City Analytics", "Statistiques économiques municipales", ["Taxes collected · $350,000", "Registered merchants · 15,450", "Collection rate · 91%"]],
      ["map", "City Map", "Carte des activités et agents", ["12 active zones", "48 field agents", "320 merchants nearby"]],
      ["settings", "City Settings", "Taux, périodes et configuration", ["Platform fee · 4.99%", "Monthly tax period", "Receipt notifications"]]
    ]
  },
  {
    id: "taxpro",
    name: "USA Tax Pro",
    basePath: "/usa-tax-pro",
    pages: [
      ["summary", "Tax Summary", "Résumé de la préparation fiscale 2026", ["Income · $125,450", "Potential deductions · $18,750", "3 actions required"]],
      ["profile", "Personal Tax Profile", "Profil fiscal personnel sécurisé", ["Filing · Single", "State · Massachusetts", "SSN · •••-••-4821"]],
      ["business", "Business Tax Center", "Profil et obligations de l'entreprise", ["One Million Global Platform LLC", "Entity · LLC", "EIN · Encrypted"]],
      ["documents", "Document Vault", "Documents fiscaux organisés et protégés", ["W-2 · Uploaded", "1099 · Uploaded", "Bank statements · Pending"]],
      ["scan", "Document Scanner", "Scanner et classer un document", ["Camera upload", "OCR preview", "Classification mock"]],
      ["income", "Income Tracker", "Revenus par catégorie", ["Employment · $85,000", "Business · $40,000", "Total · $130,450"]],
      ["expenses", "Expense Manager", "Dépenses et déductions potentielles", ["Office · $5,000", "Vehicle · $3,200", "Total · $10,600"]],
      ["calendar", "Tax Calendar", "Échéances et rappels fiscaux", ["January 15 · Estimated tax", "March 15 · Partnership return", "April 15 · Federal deadline"]],
      ["services", "Tax Services", "Services de CPA et revue documentaire", ["CPA review · $99", "Document review", "Business services"]],
      ["payment", "Tax Payment", "Paiement isolé des données fiscales", ["Service · CPA Review", "Price · $99", "Payflow · Card"]],
      ["tax-ai", "OMG Tax AI", "Assistant fiscal avec données minimisées", ["Explain concepts", "Prepare CPA questions", "Sensitive identifiers unavailable"]]
    ]
  },
  {
    id: "university",
    name: "University Integration",
    basePath: "/university-integration",
    pages: [
      ["student", "Student Dashboard", "Programme, progression et prochain examen", ["Progress · 65%", "Completed chapters · 8", "AI prediction · 87%"]],
      ["parent", "Parent Dashboard", "Progression et paiements de l'étudiant", ["John Smith", "Tests · 8 / 12", "2 selected faculties"]],
      ["faculties", "Selected Faculties", "Facultés choisies et accès", ["Computer Science", "Medicine", "Engineering"]],
      ["progress", "Progress Tracking", "Chapitres, tests et seuil de réussite", ["Current progress · 65%", "Passing score · 75%", "Next · Biology Chapter 9"]],
      ["map", "University Map", "Recherche mondiale d'universités", ["United States", "Canada", "France · Brazil"]],
      ["payment", "University Payment", "Paiement frontend des facultés", ["3 faculties", "$19.99 each", "Total · $59.97"]],
      ["ai-tutor", "AI Tutor", "Accompagnement pédagogique simulé", ["Explain mistakes", "Practice questions", "Study plan"]]
    ]
  },
  {
    id: "administration",
    name: "Platform Administration",
    basePath: "/platform-administration",
    pages: [
      ["users", "User Management", "Utilisateurs, rôles et statut", ["245,890 users", "1,248 pending checks", "Role management"]],
      ["roles", "Roles & Permissions", "Permissions granulaires par module", ["Administrator", "Operator", "Module managers"]],
      ["modules", "Module Control", "Disponibilité et santé des modules", ["11 modules active", "2 maintenance windows", "99.9% mock uptime"]],
      ["finance", "Revenue & Commissions", "Vue consolidée simulée", ["Platform revenue", "Module commissions", "Settlement status"]],
      ["agents", "Agents & Providers", "Agents Payflow, Mailport et partenaires", ["2,450 verified", "82 pending", "14 suspended"]],
      ["audit", "Audit Logs", "Traçabilité des actions sensibles", ["Admin login", "Role updated", "Account reviewed"]],
      ["reports", "Global Reports", "Rapports par pays et par module", ["Country overview", "Module activity", "Compliance summary"]],
      ["settings", "Platform Settings", "Configuration générale de la plateforme", ["Localization", "Module availability", "Security policies"]]
    ]
  }
];

export const plannedPageCount = modulePageInventory.reduce(
  (total, module) => total + module.pages.length,
  0
);

export function findModulePage(moduleId, slug) {
  const module = modulePageInventory.find((item) => item.id === moduleId);
  const page = module?.pages.find(([pageSlug]) => pageSlug === slug);
  return module && page ? { module, page } : null;
}
