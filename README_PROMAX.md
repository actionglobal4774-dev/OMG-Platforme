# OMG Platform ProMax

Projet consolide contenant le frontend ProMax et le backend Firebase renforce.

## Structure

```text
OMG-Platform-ProMax/
|-- src/                         Frontend React/Vite
|-- public/                      Ressources PWA
|-- backend/
|   |-- functions/               Firebase Functions
|   |-- firestore.rules          Regles Firestore
|   |-- firestore.indexes.json   Index Firestore
|   `-- storage.rules            Regles Storage
|-- firebase.json                Configuration commune
`-- package.json                 Commandes frontend et plateforme
```

## Commandes principales

```powershell
npm.cmd install
npm.cmd run backend:install
npm.cmd run verify:platform
npm.cmd run dev
```

Pour les tests Firebase locaux :

```powershell
npm.cmd run backend:serve
```

Le deploiement de production reste volontairement separe des validations locales.
