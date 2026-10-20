# Ordre de travail convenu

## Suivi au 20 octobre 2026

Les cinq phases sont autorisees par l'utilisateur. Phase 1 en cours, pas terminee. Dernier lot : Travel distingue retour voyage, arrivee/depart hotel, calcule les nuits calendaires, controle leur inclusion dans le voyage et conserve les frais par chambre/reservation. Champs accessibles dans le recapitulatif. 9 assertions dates et 15 assertions parcours reussies, lint et controle statique Travel reussis. Les phases 2 a 5 restent a executer ; ne pas les annoncer terminees. Ne pas changer le backend sans autorisation adaptee ; preparer les contrats frontend et signaler les integr ations manquantes.

1. Completer les formulaires necessaires, un module apres l'autre, suivant leurs roles et regles metier. Lots partiels deja documentes : Tax Pro, Mailport, Property, Restaurants, School. Restent notamment les formulaires Sante, Store, City, University, Travel, Payflow et Administration ; puis terminer les limites restantes des premiers lots. Administration reste a traiter en dernier pour cette passe.
2. Uniformiser les ecrans de paiement : composants communs de recapitulatif, montants/devise/frais, confirmation, traitement, erreur, annulation et resultat. Conserver les tarifs propres a chaque module : ne pas generaliser 4,99 USD ou 4,99 %.
3. Harmoniser le design desktop/mobile selon la reference fournie, sans supprimer les champs et parcours specifiques.
4. Preparer les interfaces aux donnees reelles : adaptateurs de donnees, etats chargement/vide/erreur, contrats attendus, identifiants et pagination. Ne pas presenter une donneee locale comme une confirmation serveur.
5. Recette navigateur et tests par role ; integration backend securisee seulement dans une etape autorisee distincte.

Les verifications statiques et compilations deja faites ne remplacent pas ces recettes. Ce document ne signifie pas que toutes les phases sont terminees ni qu'un travail se poursuit automatiquement apres chaque reponse.
