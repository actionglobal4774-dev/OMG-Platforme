# One Million Sante — parcours lot 2

19 octobre 2026. Frontend uniquement ; aucun backend modifie.

## Corrections

- Navigation laterale des groupes filtree selon les fonctions du role, comme la navigation mobile. Redirections historiques conservant les parametres de recherche.
- Reference rendez-vous transmise a l'ecran paiement et lien de resultat vers celui-ci.
- Professionnels fictifs proposes uniquement en mode demonstration, sans offre de creneau reel en production.
- Creation de rendez-vous : creneau futur valide, consentement, doublon patient/professionnel/creneau et recapitulatif. Statut requested au lieu de confirmation locale. Suppression de l'appel au service generant une notification de rendez-vous confirme.
- Paiement : rendez-vous du patient courant, montant fini positif, preparation existante detectee, recapitulatif, garde anti-double-clic, suppression du PIN inutilise. Simulation distincte du paiement reel.
- Partage : perimetre, expiration future, patient proprietaire de sa demande. Demande requested, pas acces active.
- Urgence : demande requested, pas droit temporaire accorde par le frontend. Fiche employe ne pretend plus accorder un compte ou des droits serveur.
- Messages de publication laboratoire et protection des notes corriges ; avertissement visible contre la saisie de donnees medicales reelles.
- Message du test statique corrige pour ne plus presenter la presence de code comme certification de securite.

## Preuves

14 assertions unitaires rendez-vous/paiement/partage reussies ; test statique Sante reussi ; lint reussi. Compilation 179 modules en 3,85 s avec option temporaire preserveSymlinks, configuration du projet inchangee.

## Limites importantes

Pas de recette navigateur desktop/mobile ni de paiement sandbox dans ce lot. Aucune certification clinique, reglementaire ou de confidentialite.

Les collections medicales sont encore cachees dans le stockage local partage du navigateur ; les professionnels peuvent encore voir des collections locales trop larges. La synchronisation cloud n'est pas attendue comme preuve de validation metier et ne remplace pas une autorisation patient/professionnel cote serveur. Le journal local n'est pas un audit inviolable.

Prescriptions, delivrances, decisions assurance et resultats necessitent des validations serveur specifiques et une separation brouillon/signe/valide, non terminees ici. Le catalogue professionnel et ses disponibilites reelles restent a connecter. Les anciennes donnees locales ne sont pas migrees ou effacees dans ce lot. Les liens urgence/pied de page restent accessibles avec refus dans l'ecran si non autorises.

Ne pas utiliser avec de vrais dossiers patients avant resolution de ces points. Ce lot ne certifie pas Sante operationnel a 100 %.
