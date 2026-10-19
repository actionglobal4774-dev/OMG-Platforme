# OMG Platforme - Mobile, Android et iOS

## Etat actuel

Le frontend actuel est une application React + Vite publiee comme site web/PWA.

Elle est deja preparee pour:

- installation PWA depuis le navigateur;
- affichage mobile-first;
- icones d'application;
- manifest web;
- service worker;
- mode standalone;
- preparation future Android/iOS.

## Strategie recommandee

### 1. PWA installable

C'est la voie la plus rapide pour que les utilisateurs ouvrent OMG Platforme sur telephone.

Commandes de verification:

```powershell
cd "C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509"
npm.cmd run test:mobile
npm.cmd run build
```

Apres publication Firebase Hosting, l'utilisateur ouvre:

```text
https://omg-platform-3d517.web.app
```

Puis il peut installer l'application depuis son navigateur.

### 2. Android

Pour Google Play Store, il faut envelopper la PWA dans une couche Android.

Solution recommandee plus tard:

- Capacitor Android, ou
- Trusted Web Activity Android.

Elements requis:

- compte Google Play Console;
- politique de confidentialite;
- icone 512x512;
- captures d'ecran;
- nom officiel de l'application;
- declaration des permissions camera, photo, documents, notifications;
- tests sur telephone Android reel.

### 3. iOS

Pour App Store, il faut une couche iOS.

Solution recommandee plus tard:

- Capacitor iOS.

Elements requis:

- Mac obligatoire pour build iOS;
- compte Apple Developer;
- Xcode;
- politique de confidentialite;
- captures d'ecran iPhone/iPad;
- declaration des donnees collectees;
- tests TestFlight.

## Permissions mobiles prevues

OMG Platforme aura besoin de permissions selon les modules:

- camera: Mailport, Property, Store, School, Health, City Administration, Tax Pro;
- photos/documents: Mailport, Property, Store, School, Health, Tax Pro, Platform Administration;
- notifications: tous les modules;
- localisation: Mailport, Property, Store, Restaurant, City Administration;
- micro/video: Health Care uniquement quand consultation en ligne.

## Regle importante

Le backend Firebase ne doit pas etre remplace pour creer Android/iOS.
La couche mobile doit consommer le meme frontend, la meme base Firebase et les memes fonctions.

## Decision

Pour aujourd'hui, la priorite est:

1. finaliser la PWA;
2. verifier la navigation mobile;
3. publier le site;
4. preparer Android;
5. preparer iOS quand un Mac et Apple Developer sont disponibles.
