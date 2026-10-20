# Payflow — navigation commune, lot 1

Périmètre : frontend Payflow uniquement. Le backend et les autres modules ne sont pas modifiés par ce lot.

## Réalisé

- Un catalogue commun définit les 15 sections Payflow, leur titre et leur libellé de navigation.
- Les actions du menu rejoignent les mêmes URL que les raccourcis du portefeuille. Les anciens rendus en double ont été retirés du tableau Payflow.
- Le menu des services spéciaux n'affiche plus d'emblée le formulaire de changement de pays ; celui-ci est réservé à sa page.
- L'annuaire des opérateurs propose des liens explicites vers dépôt et retrait au lieu d'intégrer un second formulaire de dépôt.
- Chaque section possède des retours vers le menu, le portefeuille et l'historique.
- Un profil Payflow est requis pour afficher le contenu métier des pages directes. Ce contrôle d'interface ne remplace pas les permissions serveur.
- Le changement de section réinitialise le composant actif, notamment entre dépôt/retrait et litige/suivi.
- Les liens de l'historique transmettent la référence au formulaire de suivi ou de litige.
- Les préférences enregistrées sont relues à la réouverture des paramètres.
- Les sections inconnues sont rejetées en vérifiant les clés propres du catalogue.

## Vérification

- Contrôles Payflow réussis, dont assertions exécutées sur la correspondance des actions et l'absence de sections doublées dans le catalogue.
- Contrôle statique global des routes réussi.
- Analyse syntaxique JSX réussie pour les quatre composants modifiés.
- Compilation complète tentée, bloquée par EPERM sur la résolution du chemin src/main.jsx malgré l'autorisation de lecture/écriture du dossier. La compilation de ce lot n'est donc pas validée.
- Aucun paiement ni recette utilisateur effectué dans ce lot.

## Suite

La recette navigateur reste à réaliser après l'optimisation, conformément à la demande. Elle doit couvrir connexion, profil, ouverture directe, actualisation, retour navigateur, mobile et abandon des formulaires. Les statuts métier du suivi, des litiges et des connexions externes restent à finaliser dans les lots correspondants ; ce lot ne déclare pas Payflow opérationnel à 100 %.
