# Rapport de compatibilite - OMG Platforme 509

## Decision technique

Le nouveau frontend `OMG-frontend-reconstruction-509` doit servir de base propre pour le site web/PWA.

L'ancien projet `OMG-kimi-frontend` doit rester la source du backend Firebase, car il contient deja les Cloud Functions, les regles Firestore, les regles Storage et la configuration Firebase complete.

## Structure retenue

### Frontend 509

- Technologie : React 18, Vite, Tailwind CSS, Firebase Web SDK, i18next.
- Role : interface web/PWA moderne, multilingue, navigation des 11 modules.
- Fichier principal : `src/App.jsx`.
- Routes : `src/routes.jsx`.
- Connexion Firebase : `src/services/firebase.js`.
- Connexion backend : `src/services/backendService.js`.

### Backend Firebase existant

- Technologie : Firebase Functions Node 20, Firebase Admin, Firestore, Storage.
- Dossier : `C:\Users\actio\Documents\Codex\OMG-kimi-frontend\backend\functions`.
- Projet Firebase : `omg-platform-3d517`.
- Role : paiements, notifications, SMS, email, Payflow, Mailport, Store, Property, School, City, Health, University, Tax Pro, Administration, Fred 509 et Cherlensky.

## Connexions importantes deja alignees

- Payflow -> `processPayment`, `calculateFees`, `processWithdrawal`, `createPayflowQrSession`, `payPayflowQr`.
- Mailport -> `publishMailportAddress`, `purchaseMailportAddress`, `registerMailportDriver`, `createTracking`.
- Store -> `processOrder`, `updateInventory`, `calculateStoreCommission`.
- Property -> `processPropertyPayment`, `createPropertyContract`.
- Restaurant -> `processReservation`, `processRestaurantOrder`, `updateKitchenStatus`.
- School -> `processSchoolPayment`, `processEnrollment`, `sendPaymentReminder`.
- City -> `processMerchantRegistration`, `calculateTax`, `generateReport`.
- Health -> `processAppointment`, `processTeleconsultation`, `recordVitalSigns`, `recordLabResult`.
- University Integration -> `processUniEnrollment`, `gradeTest`, `gradeFinalExam`, `issueCertificate`.
- USA Tax Pro -> `processTaxReturn`, `analyzeTaxDocumentWithAI`, `submitIRSReturn`.
- Platform Administration -> `manageAdministration`, `createAuditLog`, `generateAdminReport`.
- Assistants IA -> `askCherlensky`, `askFred509University`.
- Notifications -> `sendModuleNotification`, `sendEmail`, `sendSMS`, `translateContent`.

## Correction importante appliquee

Le frontend ne doit plus bloquer toute la plateforme si Firestore, Storage ou Functions ne sont pas disponibles temporairement. La connexion Firebase est maintenant protegee : l'application continue en mode local/demo au lieu d'afficher une page noire.

## Publication recommandee

Pour publier seulement le nouveau frontend :

1. Aller dans `C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509`.
2. Construire le site avec `npm.cmd run build`.
3. Publier le hosting avec `npx firebase-tools deploy --only hosting --project omg-platform-3d517`.

Pour publier ou mettre a jour le backend :

1. Aller dans `C:\Users\actio\Documents\Codex\OMG-kimi-frontend`.
2. Publier les functions avec la commande Firebase appropriee.

## Conclusion

Le meilleur choix est de ne pas melanger les deux projets. Le frontend 509 doit etre le site propre et moderne. Le backend Kimi/Firebase doit rester le moteur. La connexion se fait par Firebase SDK et Cloud Functions.
