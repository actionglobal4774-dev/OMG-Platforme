# Payflow — parcours frontend, lot 2

Premier module du passage de complétude des 12 modules. Aucun backend modifié.

## Lacunes constatées et corrections

- Envoi et demande : étape de saisie, récapitulatif séparé, modification conservant la saisie, confirmation, attente, résultat et liens de suite.
- Dépôt et retrait : même enchaînement, affichage des erreurs, blocage des doubles soumissions et distinction démonstration/service indisponible.
- Réception : historique et QR ouvrent leurs véritables pages ; résultat avec liens de suite ; PIN effacé après réponse.
- QR payé par le serveur : résultat relié à l'historique local des démarches.
- Résultats communs : référence, montant lorsqu'il est connu, statut réel ou démonstration, accès historique/suivi/portefeuille et nouvelle opération.
- Historique : remplacement des deux lignes d'exemple par un journal des démarches réalisées sur cet appareil, séparé par compte. Recherche, filtre de statut et absence de résultat.
- Suivi : recherche d'une référence existante dans le journal local au lieu de créer une référence de suivi fictive. L'absence de suivi serveur est annoncée.
- Litige : préparation locale identifiée comme telle, sans annoncer une transmission effective.
- Portefeuille : solde de démonstration seulement en mode démonstration. Sinon affichage indisponible avec nouvelle tentative, sans annoncer un solde nul ou un montant inventé.
- Préférences : erreur de stockage affichée. Annuaire d'opérateurs explicitement indiqué comme démonstration.

Le journal conserve uniquement référence, type, montant, devise, statut, date et indicateur serveur. Il exclut PIN, bénéficiaire, coordonnées bancaires et payload. Il ne constitue pas un relevé financier vérifié.

## Contrôles

Contrôles de navigation Payflow et analyse JSX réussis. Tests du journal : isolation par compte, mise à jour sans doublon, rejet de montants invalides, exclusion des secrets, stockage indisponible et absence de confirmation financière en démonstration. Compilation Vite réussie avec preserveSymlinks passé temporairement pour l'environnement de l'agent.

## Limites explicites

Le solde réel, le relevé serveur, l'exécution des transferts et opérations opérateur, la transmission des litiges, l'authentification du PIN et les connexions externes relèvent encore du backend. La vérification navigateur avec compte de test et la recette mobile complète ne sont pas déclarées exécutées. Ce lot complète les enchaînements frontend décrits, sans déclarer le module opérationnel à 100 % en production.
