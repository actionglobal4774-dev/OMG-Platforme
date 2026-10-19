import React, { createContext, useContext, useMemo, useState } from "react";
import i18n from "../localization/i18n";
import { fredRules } from "../components/fred509/fredRules";
import { modules } from "../data/modules";
import { getModuleLogic } from "../data/moduleLogic";
import { askFred509 } from "../services/backendService";

const FredContext = createContext();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(value, terms) {
  return terms.some((term) => value.includes(normalizeText(term)));
}

function buildStudyMethod(subjectTitle, chapterTitle) {
  const subject = normalizeText(subjectTitle);
  const chapter = chapterTitle ? ` sur "${chapterTitle}"` : "";

  if (includesAny(subject, ["mathematique", "math", "algebre", "geometrie"])) {
    return `Methode mathematique${chapter}: recopiez la formule, faites un exemple simple, refaites l'exercice sans regarder la correction, puis verifiez chaque etape.`;
  }

  if (includesAny(subject, ["physique", "mecanique", "electricite", "optique"])) {
    return `Methode physique${chapter}: identifiez les donnees, l'unite, la formule, puis expliquez le resultat avec une phrase courte.`;
  }

  if (includesAny(subject, ["chimie", "organique", "reaction"])) {
    return `Methode chimie${chapter}: reperez les reactifs, les produits, les charges, les liaisons et la condition de reaction avant de calculer.`;
  }

  if (includesAny(subject, ["biologie", "anatomie", "physiologie", "sante"])) {
    return `Methode sciences de la vie${chapter}: apprenez les definitions, faites un schema mental, puis reliez la fonction a l'organe ou au systeme.`;
  }

  if (includesAny(subject, ["francais", "langue", "philosophie", "sciences sociales", "histoire"])) {
    return `Methode lecture et raisonnement${chapter}: trouvez l'idee principale, les mots cles, puis formulez une reponse courte avec justification.`;
  }

  return `Methode conseillee${chapter}: lire, resumer en 5 lignes, faire les questions faciles, corriger les erreurs, puis refaire le test.`;
}

function buildUniversityFredResponse(message, assistantContext = {}) {
  const lower = normalizeText(message);
  const say = (key, fallback) => i18n.t(key, { defaultValue: fallback });
  const {
    countryName = "",
    learningLanguage = "",
    selectedFaculties = [],
    subjectTitle = "",
    chapterTitle = "",
    chapterIndex = 0,
    totalChapters = 0,
    questionsInChapter = 0,
    unlockedCount = 1,
    paid = false,
    testResult = null
  } = assistantContext || {};

  const baseContext = [
    countryName ? `${say("country", "Pays")}: ${countryName}` : "",
    learningLanguage ? `${say("language", "Langue")}: ${learningLanguage}` : "",
    selectedFaculties.length ? `${say("university_selected_faculties", "Facultes selectionnees")}: ${selectedFaculties.slice(0, 2).join(", ")}${selectedFaculties.length > 2 ? "..." : ""}` : "",
    subjectTitle ? `${say("university_courses_by_subject", "Matiere")}: ${subjectTitle}` : "",
    chapterTitle ? `Chapitre ${chapterIndex + 1}/${totalChapters}: ${chapterTitle}` : ""
  ].filter(Boolean).join(" | ");

  const noSensitiveAction =
    "Je peux expliquer, guider et proposer un plan de revision, mais je ne peux pas modifier une note, debloquer un chapitre, confirmer un paiement, remplir une reponse a votre place ou changer un compte.";

  if (includesAny(lower, ["que peux tu faire", "aide moi", "help", "fred", "assistant", "comment utiliser"])) {
    return [
      "Fred 509 Assistant: je suis le tuteur de University Integration.",
      "Je peux vous orienter par pays, faculte, matiere, chapitre, test, revision et questions ratees.",
      "Je peux aussi expliquer une notion et proposer une methode d'etude adaptee au cours actif.",
      paid ? "Votre acces est actif: choisissez une matiere puis avancez chapitre par chapitre." : "Commencez par choisir le pays, selectionner une ou plusieurs facultes, puis confirmer le paiement.",
      noSensitiveAction
    ].join(" ");
  }

  if (includesAny(lower, ["payer", "payment", "payflow", "debloquer sans", "changer ma note", "modifier le score", "forcer le chapitre", "ouvrir examen"])) {
    return [
      "Fred 509 Assistant: pour University Integration, je peux seulement expliquer le parcours d'acces.",
      "Le paiement de 19.99 USD ou equivalent doit etre confirme par l'utilisateur ou le parent/proche dans l'interface.",
      "Apres confirmation, les cours apparaissent pour l'email du postulant.",
      noSensitiveAction
    ].join(" ");
  }

  if (includesAny(lower, ["pays", "faculte", "institution", "universite", "choisir"])) {
    return [
      "Fred 509 Assistant: choisissez d'abord le pays; la plateforme affiche ensuite les facultes et institutions disponibles pour ce pays.",
      selectedFaculties.length
        ? `Vous avez deja selectionne ${selectedFaculties.length} faculte(s).`
        : "Cochez une ou plusieurs facultes avant de passer au paiement.",
      baseContext
    ].filter(Boolean).join(" ");
  }

  if (includesAny(lower, ["cours", "matiere", "programme", "livre", "module de cours"])) {
    return [
      "Fred 509 Assistant: les cours sont construits selon les facultes selectionnees.",
      subjectTitle
        ? `Vous travaillez maintenant sur ${subjectTitle}. Commencez par le chapitre actif, puis faites le test.`
        : "Apres le paiement, vous verrez les matieres correspondant a votre faculte.",
      `Regle: chaque chapitre exige 75% pour continuer.`,
      baseContext
    ].filter(Boolean).join(" ");
  }

  if (includesAny(lower, ["chapitre", "lecon", "resume", "explique", "comprendre"])) {
    return [
      `Fred 509 Assistant: ${chapterTitle ? `dans le chapitre "${chapterTitle}", ` : ""}lisez les objectifs, reperez les mots cles, puis repondez aux questions.`,
      subjectTitle ? `Matiere: ${subjectTitle}.` : "",
      questionsInChapter ? `Ce chapitre contient ${questionsInChapter} questions d'entrainement.` : "",
      buildStudyMethod(subjectTitle, chapterTitle),
      baseContext
    ].filter(Boolean).join(" ");
  }

  if (includesAny(lower, ["rate", "erreur", "faux", "mauvaise", "corriger", "question ratee", "pourquoi"])) {
    return [
      "Fred 509 Assistant: quand une reponse est ratee, regardez l'explication sous la question.",
      "Ensuite, identifiez si l'erreur vient du vocabulaire, de la methode, du calcul, de la comprehension ou de la precipitation.",
      buildStudyMethod(subjectTitle, chapterTitle),
      "Plan rapide: relire le passage du chapitre, refaire 5 questions faciles, puis recommencer le test.",
      testResult?.message || ""
    ].filter(Boolean).join(" ");
  }

  if (includesAny(lower, ["75", "score", "note", "examen final", "passer chapitre", "debloquer"])) {
    return [
      "Fred 509 Assistant: la regle reste stricte: il faut au moins 75% pour debloquer le chapitre suivant.",
      `Progression actuelle: ${unlockedCount}/${Math.max(1, totalChapters)} chapitre(s) debloque(s).`,
      "L'examen final reste bloque jusqu'a la reussite des chapitres requis.",
      noSensitiveAction
    ].join(" ");
  }

  if (includesAny(lower, ["parent", "proche", "enfant", "payer pour", "diaspora"])) {
    return [
      "Fred 509 Assistant: un parent ou proche peut payer pour un postulant.",
      "Le parent entre son email, l'email du postulant, confirme le paiement, puis le postulant utilise son propre email pour acceder aux cours.",
      "Le parent peut suivre l'orientation generale, mais les resultats pedagogiques du postulant doivent rester proteges."
    ].join(" ");
  }

  if (includesAny(lower, ["revision", "preparer", "etudier", "planning", "calendrier", "programme de revision"])) {
    return [
      "Fred 509 Assistant: plan de revision recommande.",
      "1. Lire le chapitre. 2. Resumer les mots cles. 3. Faire les questions. 4. Corriger les erreurs. 5. Refaire le test jusqu'a 75%.",
      buildStudyMethod(subjectTitle, chapterTitle),
      chapterTitle ? `Priorite actuelle: ${chapterTitle}.` : "",
      baseContext
    ].filter(Boolean).join(" ");
  }

  if (includesAny(lower, ["donne moi la reponse", "reponse exacte", "tricher", "faire le test pour moi", "remplir a ma place"])) {
    return [
      "Fred 509 Assistant: je ne peux pas faire le test a votre place ni donner une reponse pour contourner l'examen.",
      "Je peux cependant expliquer la notion, montrer la methode et vous aider a comprendre pourquoi une reponse est correcte ou fausse.",
      noSensitiveAction
    ].join(" ");
  }

  return [
    say("fred_university_help", "Fred 509 Assistant peut vous aider avec les pays, facultes, cours, chapitres, tests et questions ratees."),
    paid ? "Votre acces est actif: continuez les chapitres et les tests." : "Commencez par choisir le pays, la faculte, puis confirmer le paiement.",
    chapterTitle ? `Chapitre actuel: ${chapterTitle}.` : "",
    noSensitiveAction
  ].filter(Boolean).join(" ");
}

function generateResponse(message, moduleId, assistantContext = null) {
  const lower = normalizeText(message);
  const say = (key, fallback) => i18n.t(key, { defaultValue: fallback });
  const currentModule = modules.find((module) => module.id === moduleId);
  const currentLogic = getModuleLogic(moduleId);
  const matchedModule = modules.find((module) => {
    const haystack = `${module.id} ${module.name} ${module.subtitle} ${module.userTypes.join(" ")} ${module.actions.join(" ")}`.toLowerCase();
    return haystack.split(/\s+/).some((word) => word.length > 4 && lower.includes(word));
  });

  if (
    lower.includes("approve") ||
    lower.includes("approuver") ||
    lower.includes("confirmer paiement") ||
    lower.includes("envoyer argent") ||
    lower.includes("send money") ||
    lower.includes("transaction") ||
    lower.includes("retirer") ||
    lower.includes("withdraw") ||
    lower.includes("payer maintenant")
  ) {
    return say("fred_transaction_denied", fredRules.transactionDenied);
  }

  if (
    lower.includes("admin") ||
    lower.includes("permission") ||
    lower.includes("role") ||
    lower.includes("efin") ||
    lower.includes("ptin") ||
    lower.includes("suspendre")
  ) {
    return fredRules.adminDenied;
  }

  if (moduleId === "university") {
    return buildUniversityFredResponse(message, assistantContext);
  }

  if (moduleId === "city") {
    const cityTasks = "Je peux rechercher un marchand, verifier un dossier, calculer une taxe, detecter les retards, preparer une municipalite ou une zone, classer les donnees terrain et preparer un rapport.";
    if (includesAny(lower, ["confirmer", "valider", "signer", "payer", "attribuer officiellement", "enregistrer definitivement"])) {
      return `${cityTasks} ${fredRules.humanConfirmationRequired}`;
    }
    return `${cityTasks} Ouvrez l'action concernee puis utilisez \"Preparer avec l'assistant\". ${fredRules.humanConfirmationRequired}`;
  }

  if (lower.includes("cours") || lower.includes("faculte")) {
    return say("cherlensky_route_university", "For admission courses and chapter tests, open University Integration.");
  }

  if (lower.includes("payflow") || lower.includes("argent") || lower.includes("money") || lower.includes("qr")) {
    return say("cherlensky_route_payflow", "For money, QR, deposits and withdrawals, open Payflow.");
  }

  if (lower.includes("mailport") || lower.includes("adresse") || lower.includes("colis") || lower.includes("delivery")) {
    return say("cherlensky_route_mailport", "For reference addresses, packages and delivery, open Mailport.");
  }

  if (lower.includes("profil") || lower.includes("compte")) {
    return say("cherlensky_default", "I can guide you to the right module and help prepare your profile, but you must confirm sensitive actions yourself.");
  }

  if (matchedModule) {
    const logic = getModuleLogic(matchedModule.id);
    const firstActions = Object.values(logic.roleActions || {}).flat().slice(0, 4);
    return [
      `${matchedModule.name}: ${matchedModule.subtitle}`,
      firstActions.length ? `Services utiles: ${firstActions.join(", ")}.` : "",
      `Vous pouvez ouvrir ce module depuis le bouton ${matchedModule.name}.`,
      "Je peux vous orienter et preparer les informations, mais les confirmations sensibles restent toujours a vous."
    ].filter(Boolean).join(" ");
  }

  if (currentModule && currentModule.id !== "platform") {
    const firstActions = Object.values(currentLogic.roleActions || {}).flat().slice(0, 4);
    return [
      `${currentModule.name}: je peux vous guider dans ce module.`,
      firstActions.length ? `Actions principales: ${firstActions.join(", ")}.` : "",
      currentLogic.objective ? `Objectif: ${currentLogic.objective}` : "",
      "Je ne valide pas les paiements, les retraits, les documents legaux ni les permissions administratives."
    ].filter(Boolean).join(" ");
  }

  return say("cherlensky_default", "Tell me what you want to do. I can guide you to the right module and help prepare your profile, but you must confirm sensitive actions yourself.");
}

export function FredProvider({ children }) {
  const [messages, setMessages] = useState([]);

  const sendMessage = async (message, moduleId = "platform", assistantContext = null) => {
    const userMessage = { role: "user", content: message, moduleId };
    setMessages((previous) => [...previous, userMessage]);
    let content;
    try {
      const result = await askFred509({ message, moduleId, context: assistantContext });
      content = result?.answer || generateResponse(message, moduleId, assistantContext);
    } catch (error) {
      console.warn("Fred 509 en mode local.", error?.code || error?.message);
      content = generateResponse(message, moduleId, assistantContext);
    }
    setMessages((previous) => [...previous, { role: "assistant", content, moduleId }]);
  };

  const value = useMemo(() => ({ messages, sendMessage }), [messages]);

  return <FredContext.Provider value={value}>{children}</FredContext.Provider>;
}

export function useFred() {
  return useContext(FredContext);
}
