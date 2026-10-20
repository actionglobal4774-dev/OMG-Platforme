import React, { useEffect, useMemo, useRef, useState } from "react";
import { isDemoMode } from "../../services/runtimePolicy";
import { allUniversityChaptersPassed, universityAnswersComplete, validateUniversityEnrollment } from "./universityJourney";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { findModulePage } from "../../data/pageInventory";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";
import { useTranslation } from "react-i18next";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import { submitModuleAction } from "../../services/backendService";
import { notifyModuleUser } from "../../services/notificationService";
import { saveModuleActivity } from "../../services/activityService";
import { listCloudCollection, upsertCloudItem } from "../../services/cloudCollectionService";

const UNIVERSITY_FACULTY_PRICE_USD = 19.99;
const UNIVERSITY_CHAPTER_PASS_SCORE = 75;
const UNIVERSITY_PROGRESS_KEY = "omg_university_parallel_progress_v1";

const UNIVERSITY_LANGUAGE_GROUPS = [
  { code: "fr", label: "Francais", countries: ["HT", "SN", "ML", "BF", "CM", "CD", "CG", "CI", "NE", "MG", "MA", "DZ", "TN", "FR", "BE", "CH", "BJ", "TG", "GN", "GA", "CA"] },
  { code: "en", label: "English", countries: ["US", "CA", "NG", "GH", "KE", "ZA", "GB", "IN", "PK", "BD", "RW", "TZ", "UG", "LR", "JM", "AU", "AE", "PH", "ET"] },
  { code: "es", label: "Espanol", countries: ["DO", "MX", "CO", "AR", "CL", "PE", "ES", "CU", "PA", "CR", "EC", "VE", "UY", "PY", "BO"] },
  { code: "pt", label: "Portugues", countries: ["BR", "PT", "MZ", "AO"] },
  { code: "ar", label: "Arabic", countries: ["MA", "DZ", "TN", "EG", "LB", "SA", "AE"] }
];

const universityActions = [
  "university_choose_country",
  "university_country_faculties",
  "university_session_payment",
  "university_courses_by_subject",
  "university_chapter_test",
  "university_fred_pedagogy"
];

const actionTargets = {
  university_choose_country: "university-country",
  university_country_faculties: "university-faculties",
  university_session_payment: "university-payment",
  university_courses_by_subject: "university-courses",
  university_chapter_test: "university-test",
  university_fred_pedagogy: "university-fred"
};

const subjectTranslations = {
  en: {
    anatomy: "Anatomy",
    physiology: "Physiology",
    biology: "Biology",
    chemistry: "Chemistry",
    physics: "Physics",
    mathematics: "Mathematics",
    "math-logic": "Mathematics and logic",
    french: "French",
    english: "English",
    "computer-science": "Computer science",
    economics: "Economics",
    accounting: "Accounting",
    statistics: "Statistics",
    "history-geography": "History and geography",
    civics: "Civic education",
    logic: "Logic and reasoning",
    "general-culture": "General knowledge",
    pedagogy: "Pedagogy",
    philosophy: "Philosophy",
    agronomy: "Agronomy",
    "art-culture": "Arts and culture"
  },
  ht: {
    anatomy: "Anatomi",
    physiology: "Fizyoloji",
    biology: "Biyoloji",
    chemistry: "Chimi",
    physics: "Fizik",
    mathematics: "Matematik",
    "math-logic": "Matematik ak lojik",
    french: "Franse",
    english: "Angle",
    "computer-science": "Enfomatik",
    economics: "Ekonomi",
    accounting: "Kontabilite",
    statistics: "Estatistik",
    "history-geography": "Istwa ak jewografi",
    civics: "Edikasyon sivik",
    logic: "Lojik ak rezonnman",
    "general-culture": "Kilti jeneral",
    pedagogy: "Pedagoji",
    philosophy: "Filozofi",
    agronomy: "Agronomi",
    "art-culture": "At ak kilti"
  },
  es: {
    anatomy: "Anatomia",
    physiology: "Fisiologia",
    biology: "Biologia",
    chemistry: "Quimica",
    physics: "Fisica",
    mathematics: "Matematicas",
    "math-logic": "Matematicas y logica",
    french: "Frances",
    english: "Ingles",
    "computer-science": "Informatica",
    economics: "Economia",
    accounting: "Contabilidad",
    statistics: "Estadistica",
    "history-geography": "Historia y geografia",
    civics: "Educacion civica",
    logic: "Logica y razonamiento",
    "general-culture": "Cultura general",
    pedagogy: "Pedagogia",
    philosophy: "Filosofia",
    agronomy: "Agronomia",
    "art-culture": "Arte y cultura"
  },
  pt: {
    anatomy: "Anatomia",
    physiology: "Fisiologia",
    biology: "Biologia",
    chemistry: "Quimica",
    physics: "Fisica",
    mathematics: "Matematica",
    "math-logic": "Matematica e logica",
    french: "Frances",
    english: "Ingles",
    "computer-science": "Informatica",
    economics: "Economia",
    accounting: "Contabilidade",
    statistics: "Estatistica",
    "history-geography": "Historia e geografia",
    civics: "Educacao civica",
    logic: "Logica e raciocinio",
    "general-culture": "Cultura geral",
    pedagogy: "Pedagogia",
    philosophy: "Filosofia",
    agronomy: "Agronomia",
    "art-culture": "Artes e cultura"
  }
};

const chapterTranslations = {
  en: {
    "Introduction a l anatomie et vocabulaire anatomique": "Introduction to anatomy and anatomical vocabulary",
    "Osteologie: squelette axial, appendiculaire et articulations": "Osteology: axial skeleton, appendicular skeleton and joints",
    "Myologie: muscles, mouvements et innervation": "Myology: muscles, movements and innervation",
    "Physiologie cellulaire et homeostasie": "Cell physiology and homeostasis",
    "Genetique moleculaire: ADN, ARN et proteines": "Molecular genetics: DNA, RNA and proteins",
    "Structure de la matiere: atomes, ions, molecules": "Structure of matter: atoms, ions and molecules",
    "Mecanique: mouvement, forces, travail et energie": "Mechanics: motion, forces, work and energy",
    "Algebre: equations, inequations et systemes": "Algebra: equations, inequalities and systems",
    "Grammaire de la phrase": "Sentence grammar",
    "Introduction a la philosophie": "Introduction to philosophy",
    "Introduction a l agronomie": "Introduction to agronomy"
  },
  ht: {
    "Introduction a l anatomie et vocabulaire anatomique": "Entwodiksyon anatomi ak vokabile anatomi",
    "Physiologie cellulaire et homeostasie": "Fizyoloji selile ak omeyostazi",
    "Genetique moleculaire: ADN, ARN et proteines": "Jenetik molekile: ADN, ARN ak pwoteyin",
    "Structure de la matiere: atomes, ions, molecules": "Estrikti matye: atom, iyon ak molekil",
    "Mecanique: mouvement, forces, travail et energie": "Mekanik: mouvman, fos, travay ak eneji",
    "Algebre: equations, inequations et systemes": "Aljeb: ekwasyon, inekwasyon ak sistem",
    "Grammaire de la phrase": "GramÃ¨ fraz",
    "Introduction a la philosophie": "Entwodiksyon filozofi",
    "Introduction a l agronomie": "Entwodiksyon agronomi"
  },
  es: {
    "Introduction a l anatomie et vocabulaire anatomique": "Introduccion a la anatomia y vocabulario anatomico",
    "Physiologie cellulaire et homeostasie": "Fisiologia celular y homeostasis",
    "Genetique moleculaire: ADN, ARN et proteines": "Genetica molecular: ADN, ARN y proteinas",
    "Structure de la matiere: atomes, ions, molecules": "Estructura de la materia: atomos, iones y moleculas",
    "Mecanique: mouvement, forces, travail et energie": "Mecanica: movimiento, fuerzas, trabajo y energia",
    "Algebre: equations, inequations et systemes": "Algebra: ecuaciones, inecuaciones y sistemas",
    "Grammaire de la phrase": "Gramatica de la frase",
    "Introduction a la philosophie": "Introduccion a la filosofia",
    "Introduction a l agronomie": "Introduccion a la agronomia"
  },
  pt: {
    "Introduction a l anatomie et vocabulaire anatomique": "Introducao a anatomia e vocabulario anatomico",
    "Physiologie cellulaire et homeostasie": "Fisiologia celular e homeostase",
    "Genetique moleculaire: ADN, ARN et proteines": "Genetica molecular: DNA, RNA e proteinas",
    "Structure de la matiere: atomes, ions, molecules": "Estrutura da materia: atomos, ions e moleculas",
    "Mecanique: mouvement, forces, travail et energie": "Mecanica: movimento, forcas, trabalho e energia",
    "Algebre: equations, inequations et systemes": "Algebra: equacoes, inequacoes e sistemas",
    "Grammaire de la phrase": "Gramatica da frase",
    "Introduction a la philosophie": "Introducao a filosofia",
    "Introduction a l agronomie": "Introducao a agronomia"
  }
};

const optionTranslations = {
  en: {
    "Passer directement a l examen final": "Go directly to the final exam",
    "Apprendre seulement le titre": "Learn only the title",
    "Ignorer les exercices": "Ignore the exercises",
    "Repondre au hasard": "Answer randomly",
    "Eviter les notions difficiles": "Avoid difficult concepts",
    "Copier une phrase sans comprendre": "Copy a sentence without understanding",
    "Lire une seule fois": "Read only once",
    "Eviter les questions ratees": "Avoid missed questions",
    "Changer de chapitre sans test": "Move to another chapter without a test",
    "Lire, resumer, pratiquer puis corriger ses erreurs": "Read, summarize, practice, then correct mistakes",
    "Identifier la consigne et les donnees importantes": "Identify the instruction and important data",
    "Abandonner la matiere": "Abandon the subject",
    "Relire les explications, revoir les erreurs, puis reprendre le test": "Read the explanations, review mistakes, then retake the test"
  },
  ht: {
    "Passer directement a l examen final": "Ale direkteman nan egzamen final la",
    "Apprendre seulement le titre": "Aprann tit la selman",
    "Ignorer les exercices": "Pa fe egzesis yo",
    "Repondre au hasard": "Reponn o aza",
    "Eviter les notions difficiles": "Evite nosyon ki difisil yo",
    "Copier une phrase sans comprendre": "Kopye yon fraz san konprann",
    "Lire une seule fois": "Li yon sel fwa",
    "Eviter les questions ratees": "Evite kesyon ou rate yo",
    "Changer de chapitre sans test": "Chanje chapit san tes",
    "Lire, resumer, pratiquer puis corriger ses erreurs": "Li, fe rezime, pratike epi korije erÃ¨ yo",
    "Identifier la consigne et les donnees importantes": "Idantifye enstriksyon an ak done enpotan yo",
    "Abandonner la matiere": "Abandone matye a",
    "Relire les explications, revoir les erreurs, puis reprendre le test": "Reli eksplikasyon yo, revize erÃ¨ yo, epi refÃ¨ tes la"
  },
  es: {
    "Passer directement a l examen final": "Ir directamente al examen final",
    "Apprendre seulement le titre": "Aprender solo el titulo",
    "Ignorer les exercices": "Ignorar los ejercicios",
    "Repondre au hasard": "Responder al azar",
    "Eviter les notions difficiles": "Evitar los conceptos dificiles",
    "Copier une phrase sans comprendre": "Copiar una frase sin entender",
    "Lire une seule fois": "Leer una sola vez",
    "Eviter les questions ratees": "Evitar las preguntas falladas",
    "Changer de chapitre sans test": "Cambiar de capitulo sin prueba",
    "Lire, resumer, pratiquer puis corriger ses erreurs": "Leer, resumir, practicar y corregir errores",
    "Identifier la consigne et les donnees importantes": "Identificar la consigna y los datos importantes",
    "Abandonner la matiere": "Abandonar la materia",
    "Relire les explications, revoir les erreurs, puis reprendre le test": "Leer las explicaciones, revisar errores y repetir la prueba"
  },
  pt: {
    "Passer directement a l examen final": "Ir diretamente para o exame final",
    "Apprendre seulement le titre": "Aprender apenas o titulo",
    "Ignorer les exercices": "Ignorar os exercicios",
    "Repondre au hasard": "Responder ao acaso",
    "Eviter les notions difficiles": "Evitar conceitos dificeis",
    "Copier une phrase sans comprendre": "Copiar uma frase sem entender",
    "Lire une seule fois": "Ler apenas uma vez",
    "Eviter les questions ratees": "Evitar as perguntas erradas",
    "Changer de chapitre sans test": "Mudar de capitulo sem teste",
    "Lire, resumer, pratiquer puis corriger ses erreurs": "Ler, resumir, praticar e corrigir erros",
    "Identifier la consigne et les donnees importantes": "Identificar a instrucao e os dados importantes",
    "Abandonner la matiere": "Abandonar a materia",
    "Relire les explications, revoir les erreurs, puis reprendre le test": "Ler as explicacoes, rever erros e repetir o teste"
  }
};

function getLanguageCode(i18n) {
  return String(i18n.resolvedLanguage || i18n.language || "fr").split("-")[0];
}

function localizeSubjectTitle(subject, language) {
  return subjectTranslations[language]?.[subject?.id] || subject?.title || "";
}

function localizeChapterTitle(chapter, language) {
  return chapterTranslations[language]?.[chapter] || chapter;
}

function localizeOption(option, language) {
  return optionTranslations[language]?.[option] || option;
}

function localizeQuestion(question, language, subjectTitle, chapterTitle) {
  if (!question) return question;
  if (language === "fr") return question;
  const chapter = localizeChapterTitle(chapterTitle || question.chapterTitle, language);
  const subject = subjectTitle || "";
  const templates = {
    en: {
      definition: `In the chapter "${chapter}" in ${subject}, which skill must be mastered first?`,
      objectif: `What is the main objective of the chapter "${chapter}" in ${subject}?`,
      methode: `Which attitude helps the applicant pass the chapter "${chapter}" test?`,
      erreur: `Which mistake should be avoided in the chapter "${chapter}"?`,
      application: `In an admission question about "${chapter}", what should the applicant do before choosing an answer?`,
      raisonnement: `Why can the chapter "${chapter}" serve several faculties?`,
      diagnostic: `If an applicant fails a test in ${subject}, what is the best reaction?`
    },
    ht: {
      definition: `Nan chapit "${chapter}" nan ${subject}, ki konpetans pou metrize an premye?`,
      objectif: `Ki objektif prensipal chapit "${chapter}" nan ${subject}?`,
      methode: `Ki atitid ki ede postilan an reyisi tes chapit "${chapter}"?`,
      erreur: `Ki erÃ¨ pou evite nan chapit "${chapter}"?`,
      application: `Nan yon kesyon admisyon sou "${chapter}", kisa postilan an dwe fe avan li chwazi yon repons?`,
      raisonnement: `Poukisa chapit "${chapter}" ka itil plizye fakilte?`,
      diagnostic: `Si yon postilan echwe yon tes nan ${subject}, ki pi bon reyaksyon?`
    },
    es: {
      definition: `En el capitulo "${chapter}" de ${subject}, que competencia debe dominarse primero?`,
      objectif: `Cual es el objetivo principal del capitulo "${chapter}" en ${subject}?`,
      methode: `Que actitud ayuda al postulante a aprobar la prueba del capitulo "${chapter}"?`,
      erreur: `Que error debe evitarse en el capitulo "${chapter}"?`,
      application: `En una pregunta de admision sobre "${chapter}", que debe hacer el postulante antes de elegir una respuesta?`,
      raisonnement: `Por que el capitulo "${chapter}" puede servir para varias facultades?`,
      diagnostic: `Si un postulante falla una prueba en ${subject}, cual es la mejor reaccion?`
    },
    pt: {
      definition: `No capitulo "${chapter}" de ${subject}, qual competencia deve ser dominada primeiro?`,
      objectif: `Qual e o objetivo principal do capitulo "${chapter}" em ${subject}?`,
      methode: `Que atitude ajuda o candidato a passar no teste do capitulo "${chapter}"?`,
      erreur: `Que erro deve ser evitado no capitulo "${chapter}"?`,
      application: `Em uma questao de admissao sobre "${chapter}", o que o candidato deve fazer antes de escolher uma resposta?`,
      raisonnement: `Por que o capitulo "${chapter}" pode servir a varias faculdades?`,
      diagnostic: `Se um candidato falhar em um teste de ${subject}, qual e a melhor reacao?`
    }
  };
  return {
    ...question,
    question: templates[language]?.[question.skill] || question.question,
    options: question.options.map((option) => localizeOption(option, language)),
    explanation: question.explanation
      .replace("Fred 509 Assistant:", "Fred 509 Assistant:")
      .replace(question.chapterTitle, chapter)
  };
}

function getCountryTeachingLanguages(country) {
  const extraLanguages = UNIVERSITY_LANGUAGE_GROUPS
    .filter((group) => group.countries.includes(country.code))
    .map((group) => group.code);
  return Array.from(new Set([country.language, ...extraLanguages].filter(Boolean)));
}

function getTeachingLanguageLabel(languageCode) {
  return UNIVERSITY_LANGUAGE_GROUPS.find((group) => group.code === languageCode)?.label || languageCode.toUpperCase();
}

function buildUniversityCountryOptions(universityCatalog) {
  return universityCatalog.countries
    .map((country) => ({
      code: country.code,
      name: country.name,
      flag: country.code,
      languages: getCountryTeachingLanguages(country),
      catalog: country
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getInitialUniversityCountryCode(universityCatalog) {
  if (typeof window === "undefined") return "HT";

  const catalogCountryCodes = new Set(universityCatalog.countries.map((country) => country.code));
  const savedCountry = window.localStorage.getItem("omg_university_country");
  if (savedCountry && catalogCountryCodes.has(savedCountry)) return savedCountry;

  const savedProfiles = window.localStorage.getItem("omg_module_profiles");
  if (savedProfiles) {
    try {
      const profile = JSON.parse(savedProfiles)?.university;
      const profileCountry = universityCatalog.countries.find((country) => (
        country.code === profile?.country
        || country.name === profile?.country
        || country.language === profile?.language
      ));
      if (profileCountry && catalogCountryCodes.has(profileCountry.code)) return profileCountry.code;
    } catch {
      // Ignore invalid local profile data and continue with browser detection.
    }
  }

  const browserLanguage = window.navigator.language || "";
  const browserCountry = browserLanguage.split("-")[1]?.toUpperCase();
  if (browserCountry && catalogCountryCodes.has(browserCountry)) return browserCountry;

  const browserBaseLanguage = browserLanguage.split("-")[0];
  const universityCountryOptions = buildUniversityCountryOptions(universityCatalog);
  const languageCountry = universityCountryOptions.find((country) => country.languages.includes(browserBaseLanguage));
  return languageCountry?.code || "HT";
}

function getUniversitySavedPaymentMethods() {
  if (typeof window === "undefined") return [];
  try {
    const profile = JSON.parse(window.localStorage.getItem("omg_module_profiles") || "{}")?.university;
    return Array.isArray(profile?.paymentMethods) ? profile.paymentMethods : [];
  } catch {
    return [];
  }
}

function getSavedUniversityProgress() {
  if (typeof window === "undefined") {
    return { activeChapterBySubject: {}, unlockedChapters: {}, chapterScores: {}, finalExamResults: {} };
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(UNIVERSITY_PROGRESS_KEY) || "{}");
    return {
      activeChapterBySubject: saved.activeChapterBySubject || {},
      unlockedChapters: saved.unlockedChapters || {},
      chapterScores: saved.chapterScores || {},
      finalExamResults: saved.finalExamResults || {}
    };
  } catch {
    return { activeChapterBySubject: {}, unlockedChapters: {}, chapterScores: {}, finalExamResults: {} };
  }
}

function UniversityLoading() {
  const { t } = useTranslation();
  return (
    <ModuleDashboardTemplate
      module={getModuleById("university")}
      compactMenu
      menuActions={getModuleById("university").actions}
      assistantContext={{
        countryName: "",
        learningLanguage: "",
        selectedFaculties: [],
        subjectTitle: "",
        chapterTitle: "",
        chapterIndex: 0,
        totalChapters: 0,
        questionsInChapter: 0,
        unlockedCount: 0,
        paid: false,
        testResult: null
      }}
    >
      <section className="mt-6 rounded-2xl bg-white p-6 text-center text-black">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("university_loading_catalog", { defaultValue: "Chargement du catalogue universitaire..." })}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t("university_loading_catalog_hint", { defaultValue: "Les pays, facultes, cours et questions se preparent pour le postulant." })}
        </p>
      </section>
    </ModuleDashboardTemplate>
  );
}

function UniversityDashboardContent({ catalogApi }) {
  const { section } = useParams();
  const navigate = useNavigate();
  const currentPage = section ? findModulePage("university", section) : null;
  const overview = !section || ["student", "parent"].includes(section);
  const showAdmission = overview || ["faculties", "map", "payment"].includes(section);
  const showCourses = overview || ["progress", "ai-tutor"].includes(section);
  const { t, i18n } = useTranslation();
  const { getCountryByCode, getSubjectsForFaculties, universityCatalog } = catalogApi;
  const universityCountryOptions = useMemo(() => buildUniversityCountryOptions(universityCatalog), [universityCatalog]);
  const [countryCode, setCountryCode] = useState(() => getInitialUniversityCountryCode(universityCatalog));
  const [teachingLanguage, setTeachingLanguage] = useState(() => getCountryByCode(getInitialUniversityCountryCode(universityCatalog)).language || "fr");
  const [selectedFaculties, setSelectedFaculties] = useState([]);
  const [payerEmail, setPayerEmail] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Payflow");
  const [savedPaymentMethods] = useState(() => getUniversitySavedPaymentMethods());
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const paymentPending = useRef(false);
  const [paymentReviewed, setPaymentReviewed] = useState(false);
  useEffect(() => { setPaymentReviewed(false); }, [countryCode, selectedFaculties, studentEmail, payerEmail, paymentMethod]);
  const [activeSubject, setActiveSubject] = useState("");
  const [savedProgress] = useState(() => getSavedUniversityProgress());
  const [activeChapterBySubject, setActiveChapterBySubject] = useState(savedProgress.activeChapterBySubject);
  const [unlockedChapters, setUnlockedChapters] = useState(savedProgress.unlockedChapters);
  const [chapterScores, setChapterScores] = useState(savedProgress.chapterScores);
  const [finalExamResults, setFinalExamResults] = useState(savedProgress.finalExamResults);
  const [finalExamSubject, setFinalExamSubject] = useState("");
  const [finalExamAnswers, setFinalExamAnswers] = useState({});
  const [answers, setAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [questionBank, setQuestionBank] = useState(null);
  const [cloudProgressReady, setCloudProgressReady] = useState(false);

  const country = getCountryByCode(countryCode);
  const filteredUniversityCountryOptions = useMemo(() => {
    const filtered = universityCountryOptions.filter((item) => item.languages.includes(teachingLanguage));
    return filtered.length ? filtered : universityCountryOptions;
  }, [universityCountryOptions, teachingLanguage]);
  const subjects = useMemo(() => getSubjectsForFaculties(countryCode, selectedFaculties), [countryCode, selectedFaculties]);
  const currentSubject = subjects.find((subject) => subject.id === activeSubject) || subjects[0];
  const currentSubjectId = currentSubject?.id || "general";
  const activeChapterIndex = Math.min(
    activeChapterBySubject[currentSubjectId] || 0,
    Math.max(0, (currentSubject?.chapters?.length || 1) - 1)
  );
  const activeUnlockedChapters = unlockedChapters[currentSubjectId] || { 0: true };
  const activeChapterScores = chapterScores[currentSubjectId] || {};
  const chapterQuestions = questionBank?.getQuestionsForSubject(currentSubjectId, activeChapterIndex) || [];
  const selectedFacultyNames = country.faculties.filter((faculty) => selectedFaculties.includes(faculty.id)).map((faculty) => faculty.name);
  const selectedFacultyCount = selectedFaculties.length;
  const paymentAmount = Number((selectedFacultyCount * UNIVERSITY_FACULTY_PRICE_USD).toFixed(2));
  const selectedSavedPaymentMethod = savedPaymentMethods.find((method) => method.id === paymentMethod);
  const passedChapterCount = Object.values(activeChapterScores).filter((score) => score >= UNIVERSITY_CHAPTER_PASS_SCORE).length;
  const finalExamReady = allUniversityChaptersPassed(currentSubject?.chapters, activeChapterScores, UNIVERSITY_CHAPTER_PASS_SCORE);
  const currentFinalExamResult = finalExamResults[currentSubjectId] || null;
  const finalExamQuestions = useMemo(() => {
    if (!questionBank || !currentSubject?.chapters?.length) return [];

    return currentSubject.chapters.map((chapter, chapterIndex) => {
      const question = questionBank.getQuestionsForSubject(currentSubjectId, chapterIndex)[0];
      return {
        ...question,
        id: `final-${currentSubjectId}-${chapterIndex}`,
        chapterIndex,
        chapterTitle: chapter
      };
    });
  }, [questionBank, currentSubject, currentSubjectId]);
  const activeChapter = currentSubject?.chapters?.[activeChapterIndex];
  const activeLanguage = getLanguageCode(i18n);
  const currentSubjectTitle = localizeSubjectTitle(currentSubject, activeLanguage);
  const activeChapterTitle = localizeChapterTitle(activeChapter, activeLanguage);
  const localizedChapterQuestions = chapterQuestions.map((question) => localizeQuestion(question, activeLanguage, currentSubjectTitle, activeChapter));
  const localizedFinalExamQuestions = finalExamQuestions.map((question) => (
    localizeQuestion(
      question,
      activeLanguage,
      currentSubjectTitle,
      currentSubject?.chapters?.[question.chapterIndex]
    )
  ));
  const fredUniversityContext = {
    countryName: country.name,
    learningLanguage: country.learningLanguage || country.language,
    selectedFaculties: selectedFacultyNames,
    subjectTitle: currentSubjectTitle || "",
    chapterTitle: activeChapterTitle || "",
    chapterIndex: activeChapterIndex,
    totalChapters: currentSubject?.chapters?.length || 0,
    questionsInChapter: chapterQuestions.length,
    unlockedCount: Object.values(activeUnlockedChapters).filter(Boolean).length,
    paid,
    testResult
  };

  useEffect(() => {
    if (!paid || questionBank) return;
    let mounted = true;
    import("../../data/universityQuestionBank").then((module) => {
      if (mounted) setQuestionBank(module);
    });
    return () => {
      mounted = false;
    };
  }, [paid, questionBank]);

  useEffect(() => {
    let active = true;
    listCloudCollection("university", "learning_progress")
      .then((rows) => {
        if (!active) return;
        const cloud = rows.find((item) => item.id === "current");
        if (cloud) {
          setActiveChapterBySubject(cloud.activeChapterBySubject || {});
          setUnlockedChapters(cloud.unlockedChapters || {});
          setChapterScores(cloud.chapterScores || {});
          setFinalExamResults(cloud.finalExamResults || {});
        }
      })
      .catch(() => null)
      .finally(() => { if (active) setCloudProgressReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cloudProgressReady) return undefined;
    const progress = {
      id: "current",
      activeChapterBySubject,
      unlockedChapters,
      chapterScores,
      finalExamResults
    };
    window.localStorage.setItem(UNIVERSITY_PROGRESS_KEY, JSON.stringify({
      activeChapterBySubject,
      unlockedChapters,
      chapterScores,
      finalExamResults
    }));
    const timer = window.setTimeout(() => {
      void upsertCloudItem("university", "learning_progress", progress).catch(() => null);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [cloudProgressReady, activeChapterBySubject, unlockedChapters, chapterScores, finalExamResults]);

  const toggleFaculty = (facultyId) => {
    setSelectedFaculties((current) => (
      current.includes(facultyId) ? current.filter((id) => id !== facultyId) : [...current, facultyId]
    ));
    setPaid(false);
    setTestResult(null);
  };

  const chooseCountry = (event) => {
    const nextCode = event.target.value;
    const nextCountry = getCountryByCode(nextCode);
    setCountryCode(nextCode);
    const nextTeachingLanguage = getCountryTeachingLanguages(nextCountry).includes(teachingLanguage) ? teachingLanguage : nextCountry.language;
    setTeachingLanguage(nextTeachingLanguage);
    localStorage.setItem("omg_university_country", nextCode);
    localStorage.setItem("omg_language", nextTeachingLanguage);
    setSelectedFaculties([]);
    setPaid(false);
    setActiveSubject("");
    setAnswers({});
    setTestResult(null);
    i18n.changeLanguage(nextTeachingLanguage);
  };

  const chooseTeachingLanguage = (event) => {
    const nextLanguage = event.target.value;
    setTeachingLanguage(nextLanguage);
    localStorage.setItem("omg_language", nextLanguage);
    i18n.changeLanguage(nextLanguage);
    const currentOption = universityCountryOptions.find((item) => item.code === countryCode);
    if (!currentOption?.languages.includes(nextLanguage)) {
      const firstCountryForLanguage = universityCountryOptions.find((item) => item.languages.includes(nextLanguage));
      if (firstCountryForLanguage) {
        setCountryCode(firstCountryForLanguage.code);
        localStorage.setItem("omg_university_country", firstCountryForLanguage.code);
        setSelectedFaculties([]);
        setPaid(false);
        setActiveSubject("");
        setAnswers({});
        setTestResult(null);
      }
    }
  };
  const confirmPayment = async () => {
    const validation = validateUniversityEnrollment(selectedFaculties, country.faculties.map((faculty) => faculty.id), studentEmail, payerEmail);
    if (validation) { setTestResult({ type: "warning", message: validation }); return; }
    if (!paymentReviewed) { setPaymentReviewed(true); setPaymentStatus({ type: "warning", message: `Verifiez : ${selectedFacultyNames.join(", ")} — ${paymentAmount.toFixed(2)} USD — etudiant ${studentEmail}. Cliquez de nouveau pour preparer la demande. Ce parcours ne confirme aucun debit.` }); return; }
    if (paymentPending.current) return;
    if (!selectedFaculties.length) {
      setTestResult({ type: "warning", message: t("university_select_faculty_first") });
      return;
    }
    if (!studentEmail.trim()) {
      setTestResult({ type: "warning", message: t("university_student_email_required") });
      return;
    }
    if (isPaying) return;
    setIsPaying(true);
    paymentPending.current = true;
    setPaymentStatus(null);

    const paymentPayload = {
      country: country.name,
      countryCode,
      faculties: selectedFacultyNames,
      facultyCount: selectedFacultyCount,
      unitPriceUsd: UNIVERSITY_FACULTY_PRICE_USD,
      amountUsd: paymentAmount,
      paymentMethod: selectedSavedPaymentMethod?.label || paymentMethod,
      savedPaymentMethodId: selectedSavedPaymentMethod?.id || null,
      payerEmail,
      studentEmail
    };
    let completedActivity = null;

    try {
      const result = await submitModuleAction({
        moduleId: "university",
        moduleName: "University Integration",
        action: "Paiement session University Integration",
        profile: {
          email: studentEmail,
          country: country.name,
          language: country.language,
          userType: "Postulant"
        },
        payload: paymentPayload
      });
      const activity = saveModuleActivity("university", {
        action: "Paiement session University Integration",
        reference: result.data?.reference || `OMG-UNIVERSITY-${Date.now()}`,
        status: "prepared",
        amount: paymentAmount,
        paymentMethod: selectedSavedPaymentMethod?.label || paymentMethod,
        profile: {
          email: studentEmail,
          country: country.name,
          language: country.language,
          userType: "Postulant"
        }
      });
      completedActivity = activity;
      await notifyModuleUser("university", "University Integration - demande", "Demande preparee, paiement non confirme.", {
        reference: activity.reference,
        amount: paymentAmount,
        paymentMethod: selectedSavedPaymentMethod?.label || paymentMethod
      }).catch(() => null);
      setPaymentStatus({
        type: "warning",
        reference: activity.reference,
        message: `Demande preparee uniquement. Aucun paiement confirme. Reference : ${activity.reference}`
      });
    } catch {
      const activity = saveModuleActivity("university", {
        action: "Paiement session University Integration",
        reference: `OMG-UNIVERSITY-${Date.now()}`,
        status: "prepared",
        amount: paymentAmount,
        paymentMethod: selectedSavedPaymentMethod?.label || paymentMethod,
        profile: {
          email: studentEmail,
          country: country.name,
          language: country.language,
          userType: "Postulant"
        }
      });
      completedActivity = activity;
      setPaymentStatus({
        type: "warning",
        reference: activity.reference,
        message: `Service indisponible : brouillon local uniquement, aucun paiement confirme. Reference : ${activity.reference}`
      });
    }

    if (completedActivity) {
      const persistedAt = new Date().toISOString();
      void Promise.all([
        upsertCloudItem("university", "enrollments", {
          id: completedActivity.reference,
          studentEmail: studentEmail.trim().toLowerCase(),
          payerEmail: payerEmail.trim().toLowerCase(),
          country: country.name,
          countryCode,
          facultyIds: selectedFaculties,
          faculties: selectedFacultyNames,
          status: "requested",
          durationMonths: 3,
          createdAt: persistedAt
        }),
        upsertCloudItem("university", "payments", {
          id: completedActivity.reference,
          reference: completedActivity.reference,
          amountUsd: paymentAmount,
          currency: "USD",
          method: selectedSavedPaymentMethod?.label || paymentMethod,
          status: completedActivity.status,
          createdAt: persistedAt
        })
      ]).catch(() => null);
    }

    setPaid(isDemoMode);
    setActiveSubject(subjects[0]?.id || "");
    setTestResult({ type: "warning", message: isDemoMode ? "Acces de demonstration uniquement : aucun paiement ni inscription universitaire confirmes." : "Demande preparee. Les cours restent verrouilles sans droit d'acces verifie par le serveur." });
    paymentPending.current = false;
    setPaymentReviewed(false);
    setIsPaying(false);
  };

  const updateAnswer = (questionId, optionIndex) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  const submitChapterTest = () => {
    if (!paid || !activeUnlockedChapters[activeChapterIndex]) return;
    if (!universityAnswersComplete(chapterQuestions, answers)) { setTestResult({ type: "warning", message: "Repondez a toutes les questions avant de soumettre le test." }); return; }
    const total = chapterQuestions.length;
    if (!total) {
      setTestResult({ type: "warning", message: t("university_questions_loading", { defaultValue: "Les questions se chargent. Veuillez reessayer dans quelques secondes." }) });
      return;
    }
    const correct = chapterQuestions.filter((question) => answers[question.id] === question.answer).length;
    const score = Math.round((correct / total) * 100);

    setChapterScores((current) => ({
      ...current,
      [currentSubjectId]: {
        ...(current[currentSubjectId] || {}),
        [activeChapterIndex]: Math.max(score, current[currentSubjectId]?.[activeChapterIndex] || 0)
      }
    }));

    if (score >= UNIVERSITY_CHAPTER_PASS_SCORE) {
      setUnlockedChapters((current) => ({
        ...current,
        [currentSubjectId]: {
          ...(current[currentSubjectId] || { 0: true }),
          ...(activeChapterIndex + 1 < currentSubject.chapters.length
            ? { [activeChapterIndex + 1]: true }
            : {})
        }
      }));
      setTestResult({ type: "success", message: `${t("university_score_success")} ${score}%` });
    } else {
      setTestResult({ type: "warning", message: `${t("university_score_retry")} ${score}%` });
    }
  };

  const openSubject = (subjectId) => {
    setActiveSubject(subjectId);
    setFinalExamSubject("");
    setAnswers({});
    setTestResult(null);
  };

  const openChapter = (index) => {
    if (!activeUnlockedChapters[index]) return;
    setActiveChapterBySubject((current) => ({ ...current, [currentSubjectId]: index }));
    setAnswers({});
    setTestResult(null);
  };

  const startFinalExam = () => {
    if (!paid || !finalExamReady) return;
    setFinalExamSubject(currentSubjectId);
    setFinalExamAnswers({});
    setTestResult(null);
  };

  const updateFinalExamAnswer = (questionId, optionIndex) => {
    setFinalExamAnswers((current) => ({
      ...current,
      [currentSubjectId]: {
        ...(current[currentSubjectId] || {}),
        [questionId]: optionIndex
      }
    }));
  };

  const submitFinalExam = () => {
    if (!paid || !finalExamReady || finalExamSubject !== currentSubjectId) return;
    const subjectAnswers = finalExamAnswers[currentSubjectId] || {};
    if (!universityAnswersComplete(finalExamQuestions, subjectAnswers)) {
      setTestResult({
        type: "warning",
        message: t("university_final_exam_answer_all", {
          defaultValue: "Répondez à toutes les questions avant de soumettre l’examen final."
        })
      });
      return;
    }

    const correct = finalExamQuestions.filter((question) => subjectAnswers[question.id] === question.answer).length;
    const score = Math.round((correct / finalExamQuestions.length) * 100);
    const previous = finalExamResults[currentSubjectId];
    const result = {
      score,
      passed: score >= UNIVERSITY_CHAPTER_PASS_SCORE,
      attempts: (previous?.attempts || 0) + 1,
      completedAt: new Date().toISOString()
    };

    setFinalExamResults((current) => ({ ...current, [currentSubjectId]: result }));
    saveModuleActivity("university", {
      action: "Examen final",
      reference: `OMG-UNIVERSITY-EXAM-${Date.now()}`,
      status: result.passed ? "completed" : "retry_required",
      subject: currentSubjectTitle,
      score
    });
    setTestResult({
      type: result.passed ? "success" : "warning",
      message: result.passed
        ? `${t("university_final_exam_passed", { defaultValue: "Examen final réussi" })}: ${score}%`
        : `${t("university_final_exam_failed", { defaultValue: "Examen final à reprendre" })}: ${score}%`
    });
  };

  const openActionTarget = (actionKey) => {
    const destinations = { university_choose_country: "map", university_country_faculties: "faculties", university_session_payment: "payment", university_courses_by_subject: "progress", university_chapter_test: "progress", university_fred_pedagogy: "ai-tutor" };
    if (destinations[actionKey] && section !== destinations[actionKey]) {
      navigate(`/university-integration/${destinations[actionKey]}`);
      return;
    }
    const target = document.getElementById(actionTargets[actionKey]);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <ModuleDashboardTemplate
      module={getModuleById("university")}
      compactMenu
      menuActions={getModuleById("university").actions}
      assistantContext={fredUniversityContext}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, closeModuleAction }) => <ModuleActionDestination moduleId="university" action={selectedAction} onNavigate={closeModuleAction} />}
    >
      <header className="mt-5 rounded-xl border p-4"><h2 className="text-2xl font-black text-omgGold">{currentPage?.page[1] || "University Integration"}</h2><nav aria-label="Navigation University Integration" className="mt-4 flex gap-2 overflow-x-auto">{(currentPage?.module || findModulePage("university", "student")?.module).pages.map(([slug, label]) => <Link key={slug} to={`/university-integration/${slug}`} aria-current={slug === section ? "page" : undefined} className="shrink-0 rounded border px-3 py-2 text-sm">{label}</Link>)}</nav><Link to="/university-integration" className="mt-4 inline-block font-bold text-omgGreen">Retour au menu University</Link></header>
      {section === "ai-tutor" && <section className="mt-5 rounded-xl bg-white p-5 text-slate-800"><h2 className="text-xl font-black">Accompagnement pédagogique</h2><p className="mt-2">Sélectionnez une matière et un chapitre ci-dessous ; Fred 509 utilise le contexte du cours actif.</p><Link to="/university-integration/progress" className="mt-3 inline-block text-omgGreen">Voir ma progression</Link></section>}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {universityActions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => openActionTarget(item)}
            className="omg-card rounded-xl p-5 text-left hover:border-omgGreen omg-focus"
          >
            {t(item)}
          </button>
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="omg-card rounded-xl p-5">
          <p className="text-sm text-gray-400">{t("country")}</p>
          <h2 className="mt-2 text-2xl font-bold text-omgGold">{country.name}</h2>
        </div>
        <div className="omg-card rounded-xl p-5">
          <p className="text-sm text-gray-400">{t("language")}</p>
          <h2 className="mt-2 text-2xl font-bold text-omgGold">{getTeachingLanguageLabel(teachingLanguage)}</h2>
        </div>
        <div className="omg-card rounded-xl p-5">
          <p className="text-sm text-gray-400">{t("university_selected_faculties")}</p>
          <h2 className="mt-2 text-2xl font-bold text-omgGold">{selectedFaculties.length}</h2>
        </div>
        <div className="omg-card rounded-xl p-5">
          <p className="text-sm text-gray-400">{t("university_courses_by_subject")}</p>
          <h2 className="mt-2 text-2xl font-bold text-omgGold">{subjects.length}</h2>
        </div>
      </section>

      <section hidden={!showAdmission} className="mt-6 rounded-2xl bg-white p-5 text-black">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div hidden={section === "payment"}>
            <h2 className="text-2xl font-bold text-slate-900">{t("university_admission_path")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("university_admission_description")}</p>

            <label className="mt-5 block text-sm font-bold">
              {t("university_teaching_language", { defaultValue: "Langue d'enseignement" })}
            </label>
            <select value={teachingLanguage} onChange={chooseTeachingLanguage} className="mt-2 w-full rounded border p-3">
              {UNIVERSITY_LANGUAGE_GROUPS.map((group) => {
                const count = universityCountryOptions.filter((item) => item.languages.includes(group.code)).length;
                return (
                  <option key={group.code} value={group.code}>
                    {group.label} - {count} {t("countries", { defaultValue: "pays" })}
                  </option>
                );
              })}
            </select>

            <label id="university-country" className="mt-5 block text-sm font-bold">{t("country")}</label>
            <select value={countryCode} onChange={chooseCountry} className="mt-2 w-full rounded border p-3">
              {filteredUniversityCountryOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.flag} - {item.name} - {item.catalog.faculties.length} {t("university_faculties_available", { defaultValue: "facultes disponibles" })}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {t("university_country_auto_note", { defaultValue: "Le pays est choisi automatiquement selon votre profil ou votre navigateur, mais vous pouvez changer la langue d'enseignement et le pays a tout moment." })}
            </p>

            <div id="university-faculties" className="mt-5">
              <h3 className="font-bold">{t("university_country_faculties")}</h3>
              <div className="mt-3 space-y-2">
                {country.faculties.map((faculty) => (
                  <label key={faculty.id} className="flex gap-3 rounded border p-3">
                    <input
                      type="checkbox"
                      checked={selectedFaculties.includes(faculty.id)}
                      onChange={() => toggleFaculty(faculty.id)}
                    />
                    <span>{faculty.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div hidden={!overview && section !== "payment"} id="university-payment" className="rounded-xl border border-slate-200 p-4">
            {section === "payment" && <Link to="/university-integration/faculties" className="mb-3 inline-block font-bold text-omgGreen">Choisir ou modifier mes facultés</Link>}
            <h3 className="text-xl font-bold">{t("university_access_payment")}</h3>
            <p className="mt-2 text-sm text-slate-600">{t("university_parent_payment_note")}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} className="rounded border p-3" placeholder={t("university_payer_email")} />
              <input value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} className="rounded border p-3" placeholder={t("university_student_email")} />
            </div>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              {t("payment_methods", { defaultValue: "Moyens de paiement" })}
            </label>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-2 w-full rounded border p-3">
              {savedPaymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label} - {method.type}{method.last4 ? ` ****${method.last4}` : ""}
                </option>
              ))}
              <option value="Payflow">Payflow</option>
              <option value="Carte bancaire">{t("payflow_method_bank_card", { defaultValue: "Carte bancaire" })}</option>
              <option value="Mobile Money">{t("payflow_method_mobile_money", { defaultValue: "Mobile Money" })}</option>
              <option value="Virement bancaire">{t("payflow_method_bank_transfer", { defaultValue: "Virement bancaire" })}</option>
              <option value="PayPal">PayPal</option>
              <option value="Operateur Payflow">{t("payflow_method_operator", { defaultValue: "Operateur Payflow" })}</option>
            </select>
            {savedPaymentMethods.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {t("university_saved_payment_hint", { defaultValue: "Les moyens memorises viennent du profil University Integration et peuvent etre modifies dans Profil." })}
              </p>
            )}
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">
              <strong>{t("university_selected_faculties")}:</strong> {selectedFacultyNames.length ? selectedFacultyNames.join(", ") : t("university_none_selected")}
              <br />
              <strong>{t("university_faculty_count", { defaultValue: "Nombre de facultes" })}:</strong> {selectedFacultyCount}
              <br />
              <strong>{t("university_unit_price", { defaultValue: "Prix par faculte" })}:</strong> {UNIVERSITY_FACULTY_PRICE_USD.toFixed(2)} USD
              <br />
              <strong>{t("payment")}:</strong> {paymentAmount.toFixed(2)} USD {t("or_equivalent", { defaultValue: "ou equivalent" })}
              <br />
              <strong>{t("university_courses_by_subject")}:</strong> {subjects.length}
            </div>
            {paymentStatus && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                {paymentStatus.message}
              </div>
            )}
            <button type="button" onClick={confirmPayment} disabled={isPaying} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-60">
              {isPaying ? t("loading", { defaultValue: "Chargement..." }) : paymentReviewed ? "Confirmer la demande (pas un paiement)" : "Verifier la demande"}
            </button>
            <p className="mt-3 text-sm text-amber-900">Aucun paiement ni inscription officielle verifies par ce formulaire. {isDemoMode ? "Les cours sont accessibles en demonstration seulement." : "L'acces payant exige une integration de paiement verifiee, encore a terminer."}</p>
          </div>
        </div>
      </section>

      {currentSubject && showCourses && (
        <section className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside id="university-courses" className="omg-card rounded-xl p-4">
            <h3 className="font-bold text-omgGold">{t("university_courses_by_subject")}</h3>
            <p className="mt-2 text-xs text-gray-400">
              {t("university_parallel_courses_hint", {
                defaultValue: "Ouvrez plusieurs cours : chaque matière conserve automatiquement son chapitre."
              })}
            </p>
            <div className="mt-3 space-y-2">
              {subjects.map((subject) => {
                const savedChapterIndex = Math.min(
                  activeChapterBySubject[subject.id] || 0,
                  Math.max(0, subject.chapters.length - 1)
                );
                const scores = chapterScores[subject.id] || {};
                const passed = Object.values(scores).filter((score) => score >= UNIVERSITY_CHAPTER_PASS_SCORE).length;

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => openSubject(subject.id)}
                    className={`w-full rounded border p-3 text-left text-sm ${currentSubject.id === subject.id ? "border-omgGold text-omgGold" : "border-gray-700 text-gray-200"}`}
                  >
                    <span className="block font-semibold">{localizeSubjectTitle(subject, activeLanguage)}</span>
                    <span className="mt-1 block text-xs opacity-80">
                      {t("chapter", { defaultValue: "Chapitre" })} {savedChapterIndex + 1}/{subject.chapters.length}
                      {" · "}
                      {passed}/{subject.chapters.length} {t("university_passed", { defaultValue: "réussis" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-xl bg-white p-5 text-black">
            <h2 className="text-2xl font-bold">{currentSubjectTitle}</h2>
            {!paid && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {t("university_catalog_visible_payment_required", {
                  defaultValue: "Le catalogue est visible. Confirmez l’accès ci-dessus pour ouvrir les leçons et passer les tests."
                })}
              </div>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {currentSubject.chapters.map((chapter, index) => (
                <button
                  key={chapter}
                  type="button"
                  onClick={() => openChapter(index)}
                    className={`rounded border p-3 text-left ${activeChapterIndex === index ? "border-omgGreen bg-green-100" : activeUnlockedChapters[index] ? "border-green-600 bg-green-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{index + 1}. {localizeChapterTitle(chapter, activeLanguage)}</span>
                    <span className="text-xs">
                      {activeChapterScores[index] >= UNIVERSITY_CHAPTER_PASS_SCORE
                        ? `${activeChapterScores[index]}%`
                        : activeUnlockedChapters[index]
                          ? t("university_unlocked")
                          : t("university_locked")}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div id="university-test" className={`mt-6 rounded-xl border border-slate-200 p-4 ${!paid ? "opacity-60" : ""}`}>
              <h3 className="text-xl font-bold">{activeChapterTitle}</h3>
              <p className="mt-2 text-sm text-slate-700">
                {t("university_lesson_intro")} {currentSubjectTitle}. {t("university_lesson_body")}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>{t("university_lesson_objective_1")}</li>
                <li>{t("university_lesson_objective_2")}</li>
                <li>{t("university_lesson_objective_3")}</li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h3 className="text-xl font-bold">{t("university_chapter_test")}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {t("university_test_instruction")} {t("university_pass_score_rule", {
                  defaultValue: "Le chapitre suivant exige un résultat minimum de 75 %."
                })}
              </p>
              <div className="mt-4 space-y-4">
                {localizedChapterQuestions.map((question) => (
                  <div key={question.id} className="rounded border p-3">
                    <p className="font-semibold">{question.question}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      {question.options.map((option, optionIndex) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateAnswer(question.id, optionIndex)}
                          className={`rounded border p-2 text-sm ${answers[question.id] === optionIndex ? "border-omgGreen bg-green-50" : "border-slate-200"}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {testResult?.type === "warning" && answers[question.id] !== undefined && answers[question.id] !== question.answer && (
                      <p className="mt-2 text-sm text-amber-700">{question.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={submitChapterTest}
                disabled={!paid}
                className="mt-4 rounded bg-omgGold px-5 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("university_submit_test")}
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-bold">{t("university_final_exam")}</h3>
              <p className="mt-2 text-sm text-slate-700">
                {currentFinalExamResult?.passed
                  ? `${t("university_final_exam_passed", { defaultValue: "Examen final réussi" })}: ${currentFinalExamResult.score}%`
                  : finalExamReady
                  ? t("university_final_exam_ready")
                  : t("university_final_exam_locked")}
              </p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-omgGreen"
                  style={{ width: `${Math.min(100, Math.round((passedChapterCount / Math.max(1, currentSubject.chapters.length)) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {passedChapterCount} / {currentSubject.chapters.length} chapitres réussis à 75 % minimum
              </p>
              {currentFinalExamResult && (
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {t("university_exam_attempts", { defaultValue: "Tentatives" })}: {currentFinalExamResult.attempts}
                  {" · "}
                  {t("university_best_result", { defaultValue: "Dernier résultat" })}: {currentFinalExamResult.score}%
                </p>
              )}
              <button
                type="button"
                onClick={startFinalExam}
                disabled={!paid || !finalExamReady}
                className="mt-4 rounded bg-slate-900 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {currentFinalExamResult?.passed
                  ? t("university_retry_final_exam", { defaultValue: "Repasser l’examen final" })
                  : t("university_start_final_exam", { defaultValue: "Commencer l’examen final" })}
              </button>
            </div>

            {finalExamSubject === currentSubjectId && finalExamReady && (
              <div className="mt-6 rounded-xl border-2 border-omgGold bg-amber-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {t("university_final_exam")} — {currentSubjectTitle}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {localizedFinalExamQuestions.length} {t("questions", { defaultValue: "questions" })}
                      {" · "}
                      {t("university_pass_score_rule", { defaultValue: "Réussite à partir de 75 %." })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFinalExamSubject("")}
                    className="rounded border border-slate-400 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {t("cancel", { defaultValue: "Annuler" })}
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {localizedFinalExamQuestions.map((question, questionIndex) => (
                    <div key={question.id} className="rounded-lg border border-amber-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        {t("chapter", { defaultValue: "Chapitre" })} {question.chapterIndex + 1}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {questionIndex + 1}. {question.question}
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {question.options.map((option, optionIndex) => (
                          <button
                            key={`${question.id}-${optionIndex}`}
                            type="button"
                            onClick={() => updateFinalExamAnswer(question.id, optionIndex)}
                            className={`rounded border p-3 text-left text-sm ${
                              finalExamAnswers[currentSubjectId]?.[question.id] === optionIndex
                                ? "border-omgGreen bg-green-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={submitFinalExam}
                  className="mt-5 rounded bg-omgGreen px-6 py-3 font-bold text-white"
                >
                  {t("university_submit_final_exam", { defaultValue: "Soumettre l’examen final" })}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {testResult && (
        <div className={`mt-5 rounded-xl p-4 text-sm ${testResult.type === "success" ? "bg-green-900 text-green-100" : "bg-amber-900 text-amber-100"}`}>
          {testResult.message}
        </div>
      )}
      <div id="university-fred" className="sr-only">Fred 509 Assistant</div>
    </ModuleDashboardTemplate>
  );
}

function UniversityDashboard() {
  const { section } = useParams();
  const [catalogApi, setCatalogApi] = useState(null);

  useEffect(() => {
    let mounted = true;
    import("../../data/universityCatalogCore").then((module) => {
      if (mounted) setCatalogApi(module);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (section && !findModulePage("university", section)) {
    return <Navigate to="/not-found" replace />;
  }

  if (!catalogApi) {
    return <UniversityLoading />;
  }

  return <UniversityDashboardContent catalogApi={catalogApi} />;
}

export default UniversityDashboard;


