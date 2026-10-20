# Mailport — navigation commune, lot 1

Périmètre : frontend Mailport. Aucun changement aux opérations backend ou aux autres modules dans ce lot. package.json reçoit uniquement la commande de contrôle test:mailport.

## Corrections

- Catalogue unique des 12 sections et de leurs autorisations d'affichage.
- Les 15 actions des trois profils rejoignent les mêmes pages depuis le menu et par URL directe.
- Photos, candidature, revenus, gains, récupération et réception ont des variantes d'URL explicites et contrôlées. Une variante inconnue ou appliquée à la mauvaise section est refusée.
- Profil Mailport obligatoire ; un profil inconnu n'est plus assimilé par défaut à un acheteur. Ces contrôles d'interface ne remplacent pas les permissions serveur.
- Onglet courant indiqué, navigation et retours cohérents sur ordinateur et mobile.
- Historique vers détails de colis ; détails vers suivi, message, réclamation et remise selon le rôle.
- Référence transmise et préremplie dans les formulaires de suivi, remise, message et réclamation.
- Sélection d'une mission vers le formulaire de récupération du colis correspondant.
- Réinitialisation de la page au changement de section, variante ou référence pour éviter les anciens formulaires et confirmations.
- Recherche d'adresses sans proposition d'achat pour les profils propriétaire et livreur.
- Boutons de récupération et de réception affichés pour le rôle concerné.
- Préférence de notification enregistrée et relue localement ; son application aux envois serveur est explicitement à connecter.
- Messages et réclamations décrits comme brouillons locaux, sans annoncer une transmission réelle.
- Carte indisponible clairement annoncée et lien utile vers le suivi.

## Contrôles

- npm run test:mailport : réussi ; 12 sections, 15 actions par rôle, refus de variantes incorrectes et conservation des références contenant des caractères spéciaux.
- npm run test:navigation : réussi ; contrôle statique de l'enregistrement global des routes.
- Analyse syntaxique des trois composants Mailport modifiés : réussie.
- npm run build : refus EPERM dans l'environnement de l'agent lors de la résolution du chemin main.jsx.
- Compilation Vite avec l'option temporaire resolve.preserveSymlinks=true : réussie, 170 modules transformés, 4,09 secondes. Aucun changement permanent de configuration n'a été effectué pour cette option.

## Limites

La recette utilisateur reste prévue après l'optimisation. Aucun paiement réel ni opération de livraison n'a été exécuté. L'historique utilise les colis disponibles localement : un lien détail absent localement propose une recherche au lieu d'inventer un colis. La cartographie réelle, l'envoi des messages/réclamations, l'application serveur des préférences et la complétude métier du QR restent à traiter dans leurs lots dédiés. Ce lot ne déclare pas Mailport opérationnel à 100 %.
