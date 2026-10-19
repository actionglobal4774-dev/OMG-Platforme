# Compatibilite Backend / Frontend 509

## Etat general

Le frontend 509 est maintenant connecte au projet Firebase `omg-platform-3d517` avec:

- Firebase Auth
- Firestore
- Storage
- Firebase Functions en region `us-central1`

## Fonctions backend detectees

Le backend expose deja les fonctions principales pour:

- Payflow: paiements, QR, retrait, frais, recu, KYC, PayPal
- Mailport: adresse referentielle, achat adresse, colis, livreur, GPS, reclamation
- Store: commande, stock, commission
- Property: paiement et contrat
- Restaurant: commande, cuisine, reservation
- School: inscription, paiement, rappel
- City Administration: taxes, rapports, marchands
- Health Care: rendez-vous, teleconsultation, ordonnance, signes vitaux, laboratoire
- University Integration: inscription, paiement, tests, examen final, certificat, contenu
- USA Tax Pro: analyse document, frais, declaration, IRS, signature/finalisation
- Platform Administration: audit, roles, rapports, reglages, autorisations Tax Pro
- Cherlensky / Fred 509
- Email, SMS, notification et traduction

## Correction appliquee au frontend

Le frontend possede maintenant un pont `backendService` qui relie les actions des modules aux fonctions Firebase.

Si Firebase Functions est disponible, l'action appelle le backend reel.
Si une fonction n'est pas encore deployee ou exige une autorisation, l'interface ne bloque pas l'utilisateur et garde une reference de secours.

## Points importants

- Les profils de modules sont sauvegardes localement et synchronises dans Firestore quand l'utilisateur est connecte.
- Les notifications utilisent le navigateur et tentent aussi d'utiliser la fonction backend `sendModuleNotification`.
- Payflow appelle maintenant les fonctions Firebase pour paiement, QR et PayPal quand elles sont disponibles.
- Le backend passe la verification de syntaxe Node.
- Le backend ne passe pas encore le lint, principalement a cause de regles de style existantes. Ce n'est pas un blocage fonctionnel immediat.

## Prochaine etape conseillee

1. Lancer le frontend 509 localement.
2. Tester creation de profil dans un module.
3. Verifier dans Firebase Firestore la collection `user_module_profiles`.
4. Deployer le frontend.
5. Deployer les fonctions backend progressivement, module par module, pour eviter les erreurs de fonctions sensibles.
