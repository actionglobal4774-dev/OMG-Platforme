export const moduleLogic = {
  payflow: {
    objective: "Permettre aux utilisateurs d'envoyer, recevoir, demander et suivre l'argent avec Payflow, QR, operateurs et confirmations.",
    journey: ["Creer ou ouvrir son profil Payflow", "Choisir carte bancaire ou operateur Payflow", "Utiliser envoyer, demander, recevoir ou QR", "Confirmer avec PIN puis recevoir un recu"],
    safeguards: ["Aucune action financiere ne peut etre confirmee par l'IA", "PIN QR obligatoire", "Controle KYC au seuil prevu", "Historique et audit pour les operations sensibles"],
    fees: [
      "Transfert international: 3.25% du montant envoye.",
      "Changer de pays change automatiquement la devise Payflow et applique 4.99 USD ou equivalent local.",
      "Les delais estimes doivent etre affiches avant validation: instantane a 15 minutes pour Payflow/QR, 15 minutes a 2 heures pour operateurs, 1 a 5 jours ouvrables pour banques selon pays.",
      "KYC demande automatiquement a partir de 500 USD ou equivalent.",
      "QR protege par PIN a 4 chiffres.",
      "Le mode QR Acheter ne peut que payer; le mode QR Vendre ne peut que recevoir.",
      "Moyens acceptes: Payflow, carte de credit, Mastercard, carte de debit, banque locale, banque internationale et moyens locaux autorises."
    ],
    roleActions: {
      "Avec carte bancaire": ["Envoyer argent", "Demander argent", "Recevoir paiement", "Utiliser QR", "Historique", "Litige"],
      "Avec operateur Payflow": ["Depot operateur", "Retrait operateur", "Envoyer argent", "Recevoir paiement", "Utiliser QR", "Track transfer"]
    },
    documents: ["KYC automatique seulement si seuil ou risque atteint", "Verification email", "Verification telephone"],
    media: ["Camera utilisee pour scanner QR", "Aucune photo permanente sauf KYC demande"],
    notifications: ["Transaction envoyee", "Transaction recue", "Demande recue", "Litige", "Alerte securite"],
    backendNotes: ["Connecteurs externes requis: MonCash, NatCash, Ria, MoneyGram, CAM Transfer selon accords officiels", "Transferts bancaires internationaux: pays de la banque, nom de banque, titulaire, compte/IBAN et SWIFT/Routing obligatoires avant confirmation."]
  },
  mailport: {
    objective: "Transformer les adresses referentielles en service logistique mondial pour acheter une adresse, recevoir des colis et remunerer les acteurs locaux.",
    journey: ["Choisir proprietaire, acheteur ou livreur", "Creer le profil du role choisi", "Publier, acheter ou livrer selon le role", "Scanner le QR et envoyer les notifications"],
    safeguards: ["Adresse cherchee par pays, ville, rue, quartier ou code postal", "Photos reservees aux proprietaires et livreurs", "Paiements automatiques apres etapes validees"],
    fees: [
      "Achat adresse referentielle: 4.99 USD ou equivalent pour deux ans.",
      "Proprietaire d'adresse: inscription gratuite.",
      "Livreur paye automatiquement apres livraison validee.",
      "Proprietaire d'adresse paye apres remise du colis au beneficiaire.",
      "Moyens acceptes: Payflow, carte de credit, Mastercard, carte de debit et moyens locaux autorises."
    ],
    roleActions: {
      "Proprietaire d'adresse": ["Publier adresse gratuitement", "Ajouter photos adresse", "Recevoir colis", "Livrer colis", "Revenus"],
      "Acheteur d'adresse": ["Chercher adresse", "Acheter adresse", "Voir QR adresse", "Changer adresse", "Suivre colis"],
      "Livreur": ["Candidature", "Missions disponibles", "Recuperer colis", "Livrer colis", "Gains"]
    },
    documents: ["Identite proprietaire adresse si verification demandee", "Dossier livreur soumis a validation 48h"],
    media: ["Photo adresse pour proprietaire", "Photo visage proprietaire", "Photo/identite livreur", "Scan QR colis"],
    notifications: ["Adresse achetee", "Colis arrive", "Colis recupere", "Colis livre", "Paiement automatique"]
  },
  store: {
    objective: "Permettre aux commerçants d'ouvrir une boutique en ligne et aux acheteurs d'utiliser Payflow et Mailport pour acheter et livrer.",
    journey: ["L'acheteur parcourt les produits sans profil obligatoire", "Le proprietaire cree son store", "Les produits sont ajoutes avec photos et stock", "Le panier est paye puis livre via Mailport"],
    safeguards: ["Photos reservees aux proprietaires de store", "Stock et panier controles avant paiement", "Litiges et evaluations gardes dans l'historique"],
    fees: [
      "Prix produit affiche avec frais plateforme integres selon regle commerciale.",
      "Livraison connectee a Mailport.",
      "Paiement via Payflow, carte de credit, Mastercard, carte de debit ou moyens externes acceptes."
    ],
    roleActions: {
      "Acheteur": ["Voir produits", "Ajouter panier", "Choisir adresse", "Payer", "Suivre livraison"],
      "Proprietaire de store": ["Ouvrir boutique", "Ajouter produits", "Ajouter photos", "Gerer stock", "Voir ventes"]
    },
    documents: ["Informations boutique", "Moyen de versement proprietaire"],
    media: ["Photos produits reservees au proprietaire", "Logo boutique"],
    notifications: ["Commande creee", "Paiement recu", "Colis cree", "Livraison Mailport"]
  },
  property: {
    objective: "Connecter chercheurs et proprietaires de biens avec photos, recherche geographique, contrat numerique et paiement securise.",
    journey: ["Chercher par pays, ville, rue, quartier ou code postal", "Comparer et sauvegarder les biens", "Contacter ou payer le proprietaire", "Signer le contrat numerique si necessaire"],
    safeguards: ["Photos et videos reservees aux proprietaires", "Commission plateforme visible", "Paiement et contrat gardes dans l'historique"],
    fees: [
      "Commission plateforme: 4.99% sur paiement proprietaire.",
      "Frais transfert international proprietaire/tenant selon devise et pays.",
      "Recherche avancee apres acces paye si applicable.",
      "Moyens acceptes: Payflow, carte de credit, Mastercard, carte de debit et banque."
    ],
    roleActions: {
      Chercheur: ["Rechercher", "Filtrer par pays/ville/rue/zipcode", "Favoris", "Comparer", "Payer proprietaire"],
      "Proprietaire de bien": ["Publier bien", "Ajouter photos/videos", "Disponibilite", "Contrat numerique", "Recevoir paiement"]
    },
    documents: ["Contrat numerique", "Informations versement proprietaire"],
    media: ["Photos et videos reservees au proprietaire du bien", "Visite virtuelle si disponible"],
    notifications: ["Bien publie", "Demande recue", "Paiement caution", "Contrat signe"]
  },
  restaurant: {
    objective: "Gerer hotel, restaurant et service traiteur avec menus, chambres, tables, commandes, employes, inventaire et paiements.",
    journey: ["Le client commande ou reserve", "L'employe traite la vente ou la commande", "La cuisine ou le service confirme l'etape", "Le proprietaire suit ventes, retards et rapports"],
    safeguards: ["Employes limites a leurs fonctions", "Proprietaire seul controle menus, chambres, tables et rapports globaux", "Alertes en cas de retard prolonge"],
    fees: ["Paiement Payflow, carte de credit, Mastercard, carte de debit, cash ou moyens locaux.", "Rapports de ventes par employe et par session."],
    roleActions: {
      Client: ["Commander", "Reserver table", "Reserver chambre", "Payer", "Voir recu"],
      Proprietaire: ["Creer etablissement", "Ajouter menus/chambres/tables", "Gerer employes", "Inventaire", "Rapports"],
      Employe: ["Vendre", "Suivre commande", "Encaisser autorise", "Voir ses ventes"]
    },
    documents: ["Informations etablissement", "Moyens de paiement proprietaire"],
    media: ["Photos plats", "Photos chambres", "Photos etablissement"],
    notifications: ["Reservation", "Commande", "Retard service", "Paiement confirme"]
  },
  school: {
    objective: "Offrir aux ecoles, parents et responsables un systeme de frais, livres, rapports proteges et paiements connectes.",
    journey: ["Le proprietaire cree l'etablissement", "Il configure classes, niveaux, frais et livres", "Les parents paient pour les beneficiaires", "Les rapports proteges restent visibles aux personnes autorisees"],
    safeguards: ["Photos reservees aux etablissements et livres", "Comptes Payflow ou bancaires requis pour versements", "Acces eleve protege pour parents ou responsables"],
    fees: ["Frais scolaires payables par Payflow, carte de credit, Mastercard, carte de debit ou banque.", "Proprietaire doit enregistrer ses informations bancaires ou Payflow."],
    roleActions: {
      "Parent ou responsable": ["Payer frais", "Acheter livres", "Voir rapports proteges", "Messagerie"],
      "Proprietaire d'etablissement": ["Creer ecole", "Creer classes", "Fixer frais", "Vendre livres", "Publier rapports"]
    },
    documents: ["Informations etablissement", "Rapports eleves proteges", "Moyen de versement ecole"],
    media: ["Photos ecole et livres reservees au proprietaire"],
    notifications: ["Paiement frais", "Recu", "Rapport disponible", "Message ecole"]
  },
  city: {
    objective: "Aider les municipalites a enregistrer les marchands informels, suivre les zones, collecter les taxes et reduire la corruption.",
    journey: ["Creer municipalite et zones", "Attribuer agents", "Enregistrer marchands par zone ou rue", "Suivre paiements, retards et rapports"],
    safeguards: ["Transactions non effacables par agents", "Marques vertes pour paye et rouges pour retard", "Audit des actions mairie"],
    fees: ["Taxes par jour, semaine, mois, trimestre, semestre ou annee.", "Paiement par Payflow, carte de credit, Mastercard, carte de debit ou moyens locaux."],
    roleActions: {
      "Responsable mairie": ["Creer municipalite", "Attribuer zones", "Voir retards", "Rapports", "Audit"],
      Agent: ["Enregistrer marchand", "Prendre photo marchand", "Collecter donnees", "Marquer paiement"],
      Marchand: ["Voir dossier", "Payer taxe", "Voir statut"]
    },
    documents: ["Dossier marchand", "Type marchandise gros/detail", "Historique paiement taxe"],
    media: ["Photo marchand par agent autorise", "Geolocalisation zone"],
    notifications: ["Taxe payee", "Retard", "Controle terrain", "Rapport mairie"]
  },
  health: {
    objective: "Coordonner patients, professionnels, laboratoire, pharmacie et assurance dans un dossier medical securise, avec acces minimal par role.",
    journey: ["L'institution cree les sessions des employes", "Chaque professionnel utilise son espace autorise", "Le medecin prescrit ou demande une analyse", "L'assurance preautorise lorsque necessaire", "La pharmacie controle allergies et interactions avant la validation finale", "Le patient consulte uniquement son dossier, ses resultats et ses notifications"],
    safeguards: ["Patient Data Firewall : chaque role voit uniquement les donnees necessaires", "Dossiers psychologue separes des autres soins", "Acces urgence justifie, limite dans le temps et audite", "Documents HIPAA et consentement", "Diplomes et licences requis pour professionnels"],
    fees: ["Paiements consultation, laboratoire, pharmacie et teleconsultation par Payflow, carte de credit, Mastercard, carte de debit ou moyen autorise.", "Conformite HIPAA et consentement patient."],
    roleActions: {
      Patient: ["Voir dossier", "Rendez-vous", "Prescriptions", "Resultats analyses", "Teleconsultation", "Partager dossier securise"],
      Medecin: ["Consultation", "Diagnostic", "Ordonnance", "Teleconsultation", "Demander imagerie", "Acces urgence"],
      Infirmier: ["Signes vitaux", "Notes visite"],
      Psychologue: ["Teleconsultation", "Notes separees et protegees"],
      Pharmacie: ["Voir ordonnance", "Livrer medicaments", "Acces urgence"],
      Laboratoire: ["Ajouter resultats", "Catalogue examens"],
      Assurance: ["Pre-autorisations assurance", "Dossiers assurance autorises"],
      "Administration sante": ["Rapports conformite", "Journal audit", "Gerer acces", "Catalogue examens"],
      Institution: ["Creer sessions employes", "Gerer acces", "Rapports conformite"]
    },
    documents: ["Consentement patient", "Documents HIPAA", "Diplomes professionnels", "Licence institution"],
    media: ["Teleconsultation video", "Diplomes et licences pour professionnels"],
    notifications: ["Rendez-vous", "Prescription", "Resultat laboratoire", "Alerte critique", "Validation assurance", "Prescription prete", "Alerte de securite"]
  },
  travel: {
    objective: "Permettre de comparer et préparer des voyages avec vols, hôtels, assurances et itinéraires, sans confirmer une réservation avant réponse d'un fournisseur autorisé.",
    journey: ["Le voyageur indique destination et durée", "Le système demande seulement les données indispensables manquantes", "Les offres sont comparées puis sélectionnées", "Le prix et la disponibilité sont revérifiés avant paiement", "Le fournisseur confirme la réservation et les documents sont rendus disponibles"],
    safeguards: ["L'IA ne crée ni prix ni disponibilité", "Aucun achat sans confirmation explicite", "Frais de service transparents de 4,99 USD par billet et par chambre", "Les frais de service sont distingués et non remboursables sous réserve du droit applicable", "Les données transmises aux fournisseurs sont limitées au nécessaire"],
    fees: ["4,99 USD de frais de service par billet et par chambre, ou équivalent local affiché avant paiement.", "Prix fournisseur, taxes, assurance optionnelle et frais de service sont séparés.", "Paiements via Payflow, MonCash, NatCash, carte de credit, Mastercard, carte de debit et moyens autorises."],
    roleActions: {
      Voyageur: ["Planifier voyage", "Rechercher vols", "Rechercher hotels", "Comparer assurance", "Mes voyages", "Mes reservations", "Documents voyage", "Assistance voyage"],
      "Partenaire voyage": ["Gerer offres partenaires", "Verifier disponibilites", "Support voyageur", "Rapports partenaires"],
      "Administration Travel": ["Administration Travel", "Reservations a verifier", "Fournisseurs", "Tarification", "Audit Travel", "Rapports Travel"]
    },
    documents: ["Passeport ou document demandé uniquement par un fournisseur", "Billets électroniques et confirmations après émission", "Polices d'assurance après confirmation"],
    media: ["Photos d'hôtels fournies par partenaires autorisés", "Aucun document de voyage exposé dans les journaux"],
    notifications: ["Prix modifié", "Réservation confirmée par fournisseur", "Paiement reçu", "Annulation demandée", "Remboursement mis à jour", "Document disponible"],
    backendNotes: ["Connecteurs de vols, hôtels et assurances requis avant toute disponibilité réelle.", "Le backend doit recalculer les frais, vérifier le prix et gérer l'idempotence des paiements."]
  },
  university: {
    objective: "Preparer les postulants aux concours d'admission par pays, facultes, cours, chapitres, questions et tests a 75%.",
    journey: ["Choisir le pays de residence", "Choisir une ou plusieurs facultes du pays", "Payer 19.99 USD ou equivalent", "Suivre les cours et debloquer les chapitres avec 75%"],
    safeguards: ["Aucune photo ni piece d'identite pour le postulant", "Parent ou proche peut payer par email", "Fred 509 explique les erreurs sans donner de faux resultat"],
    fees: ["Session: 19.99 USD ou equivalent.", "Parent ou proche peut payer par Payflow, carte de credit, Mastercard, carte de debit ou moyen autorise et donner acces par email."],
    roleActions: {
      Postulant: ["Choisir pays", "Choisir facultes", "Suivre cours", "Passer test 75%", "Examen final"],
      "Parent ou proche payeur": ["Payer session", "Entrer email postulant", "Recevoir confirmation"]
    },
    documents: ["Aucune photo ni piece identite exigee pour le postulant"],
    media: ["Cours multilingues", "Questions par chapitre", "Fred 509 pedagogique"],
    notifications: ["Paiement confirme", "Chapitre reussi", "Chapitre bloque", "Examen final disponible"]
  },
  tax: {
    objective: "Aider les utilisateurs USA a preparer leur dossier fiscal avec documents, questions IA, verification et paiement du service.",
    journey: ["Creer dossier fiscal USA only", "Televerser ou scanner documents", "Repondre aux questions IA", "Verifier, signer et payer le service"],
    safeguards: ["Conformite IRS/FTC a finaliser par autorisations officielles", "Signature electronique", "Frais affiches avant validation finale"],
    fees: ["USA only.", "Frais de service affiches avant soumission finale.", "Paiement par Payflow, carte de credit, Mastercard, carte de debit ou moyens fiscaux autorises avant ou au moment de finalisation selon service."],
    roleActions: {
      "Contribuable USA": ["Creer dossier fiscal", "Scanner documents", "Repondre questions IA", "Signer", "Payer service"],
      "Fiscaliste autorise": ["Verifier dossier", "Valider erreurs", "Preparer soumission"]
    },
    documents: ["Pieces fiscales", "Identite/KYC si requis", "Signature electronique"],
    media: ["Scan documents fiscaux", "Upload justificatifs"],
    notifications: ["Document recu", "Question IA", "Dossier pret", "Paiement service"]
  },
  administration: {
    objective: "Servir de cerveau de la plateforme pour roles, revenus, agents Payflow, livreurs Mailport, contenus University et audit.",
    journey: ["Super admin controle le dashboard global", "Admins pays gerent leur territoire", "Agents et livreurs sont actives ou suspendus", "Rapports et audit gardent la trace des decisions"],
    safeguards: ["Acces reserve", "Double validation pour actions critiques", "Audit log complet pour revenus, permissions et suspensions"],
    fees: ["Controle revenus, commissions, depenses et rapports de tous les modules.", "Suit Payflow, carte de credit, Mastercard, carte de debit, banque et moyens autorises par module."],
    roleActions: {
      "Super admin": ["Dashboard global", "Revenus", "Pilotage financier", "Roles", "Agents Payflow", "Livreurs Mailport", "University contenu", "Audit"],
      "Admin pays": ["Controle pays", "Agents locaux", "Rapports pays"],
      "Controle module": ["Rapports module", "Incidents", "Verifications"]
    },
    documents: ["Audit log", "Rapports financiers", "Regles RBAC", "Double validation actions critiques"],
    media: ["Espace interne sans media public"],
    notifications: ["Incident", "Suspension", "Commission", "Rapport"]
  }
};

export function getModuleLogic(moduleId) {
  return moduleLogic[moduleId] || {
    fees: [],
    roleActions: {},
    documents: [],
    media: [],
    notifications: [],
    backendNotes: []
  };
}

export function getActionsForUserType(moduleId, userType, fallbackActions = []) {
  const logic = getModuleLogic(moduleId);
  return logic.roleActions[userType] || fallbackActions;
}
