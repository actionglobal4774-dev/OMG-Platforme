# Mailport — parcours, lot 2 — 19 octobre 2026

Portee : frontend Mailport uniquement, aucun changement backend.

## Corrections

- Selection explicite d'une adresse ; aucun premier resultat choisi automatiquement.
- Achat bloque si la recherche serveur echoue. Exemples locaux identifies en demonstration seulement.
- Recapitulatif 4,99 USD et prestataire avant confirmation. Protection contre les doubles clics et reutilisation de la preparation lors d'une nouvelle tentative dans le meme ecran.
- Suppression des moyens de paiement non pris en charge ; MonCash/NatCash annonces non disponibles dans ce parcours.
- Suppression du faux QR du catalogue. QR serveur affiche en memoire apres paiement Payflow confirme, sans persistance du jeton.
- Livraison : QR signe obligatoire, inspection du statut, transition suivante determinee selon le contrat serveur, recapitulatif avant modification. Livraison finale exige nom et photo ; seules les confirmations livreur sont autorisees par le service actuel.
- Publication indiquee en attente administrative ; photos et candidature non transmises explicitement presentees comme preparations locales.
- Resultat avec reference, statut et lien vers historique des colis. Solde/revenus non presentes comme verifies.

## Preuves

- `node scripts/test-mailport-journey.mjs` : 10 assertions reussies (transitions, role, preuves).
- `npm run test:mailport` : 12 sections, 15 actions, variantes, refus et references valides (controle statique).
- `npm run lint` : controle statique propre.
- Compilation Vite : 176 modules, reussie en 3,99 s avec option temporaire resolve.preserveSymlinks, sans modification de la configuration du projet.

## Reste a verifier ou connecter

- Recette navigateur desktop/mobile avec comptes de chaque role et retours arriere.
- Paiements sandbox Payflow/PayPal/Stripe, annulation, retour et reprise apres rechargement. Aucune transaction reelle effectuee.
- Recuperation serveur des achats et QR anterieurs ; QR des retours PayPal/Stripe non restitue ici.
- Transmission effective des candidatures et mises a jour photos, reception proprietaire, messagerie et reclamations.
- Missions, historique et revenus encore fondes sur donnees locales : ne constituent pas une preuve de livraison, d'affectation ou de revenus reels.
- Frontend ne garantit pas l'idempotence serveur apres rechargement ni l'absence de debit si une reponse reseau est perdue.

Ce lot ne certifie pas Mailport a 100 %.
