import {
  getSubjectsForFaculties,
  universityCatalog
} from "../src/data/universityCatalogCore.js";
import { getQuestionsForSubject } from "../src/data/universityQuestionBank.js";

const PASS_SCORE = 75;
const failures = [];
const visitedSubjects = new Set();
const visitedChapters = new Set();
let facultyJourneys = 0;
let courseJourneys = 0;
let chapterTests = 0;
let chapterQuestions = 0;
let finalExams = 0;

function scoreAnswers(questions, answers) {
  const correct = questions.filter((question, index) => answers[index] === question.answer).length;
  return Math.round((correct / questions.length) * 100);
}

for (const country of universityCatalog.countries) {
  if (!country.faculties?.length) {
    failures.push(`${country.code}: aucune faculté`);
    continue;
  }

  for (const faculty of country.faculties) {
    facultyJourneys += 1;
    const subjects = getSubjectsForFaculties(country.code, [faculty.id]);

    if (!subjects.length) {
      failures.push(`${country.code}/${faculty.id}: aucun cours d'admission`);
      continue;
    }

    const parallelProgress = {};

    for (const subject of subjects) {
      courseJourneys += 1;
      visitedSubjects.add(subject.id);
      parallelProgress[subject.id] = { activeChapter: 0, scores: {} };
      const finalExamQuestions = [];

      if (!subject.chapters?.length) {
        failures.push(`${country.code}/${faculty.id}/${subject.id}: aucun chapitre`);
        continue;
      }

      for (let chapterIndex = 0; chapterIndex < subject.chapters.length; chapterIndex += 1) {
        const questions = getQuestionsForSubject(subject.id, chapterIndex);
        const path = `${country.code}/${faculty.id}/${subject.id}/chapitre-${chapterIndex + 1}`;
        visitedChapters.add(`${subject.id}:${chapterIndex}`);
        chapterTests += 1;
        chapterQuestions += questions.length;

        if (questions.length !== 4) {
          failures.push(`${path}: ${questions.length} questions au lieu de 4`);
          continue;
        }

        for (const question of questions) {
          if (!Array.isArray(question.options) || question.options.length < 2) {
            failures.push(`${path}/${question.id}: options incomplètes`);
          }
          if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) {
            failures.push(`${path}/${question.id}: bonne réponse invalide`);
          }
          if (!question.explanation) {
            failures.push(`${path}/${question.id}: explication manquante`);
          }
        }

        const perfectAnswers = questions.map((question) => question.answer);
        const perfectScore = scoreAnswers(questions, perfectAnswers);
        if (perfectScore !== 100 || perfectScore < PASS_SCORE) {
          failures.push(`${path}: les bonnes réponses ne donnent pas 100 %`);
        }

        const exactPassAnswers = [...perfectAnswers];
        exactPassAnswers[3] = (questions[3].answer + 1) % questions[3].options.length;
        if (scoreAnswers(questions, exactPassAnswers) !== PASS_SCORE) {
          failures.push(`${path}: le seuil exact de 75 % n'est pas atteignable`);
        }

        const failingAnswers = questions.map((question, index) => (
          index < 2 ? question.answer : (question.answer + 1) % question.options.length
        ));
        if (scoreAnswers(questions, failingAnswers) >= PASS_SCORE) {
          failures.push(`${path}: un score insuffisant débloque le chapitre`);
        }

        parallelProgress[subject.id].scores[chapterIndex] = perfectScore;
        parallelProgress[subject.id].activeChapter = chapterIndex;
        finalExamQuestions.push(questions[0]);
      }

      const finalAnswers = finalExamQuestions.map((question) => question.answer);
      const finalScore = scoreAnswers(finalExamQuestions, finalAnswers);
      finalExams += 1;
      if (finalScore !== 100) {
        failures.push(`${country.code}/${faculty.id}/${subject.id}: examen final non réussi`);
      }
    }

    const progressEntries = Object.entries(parallelProgress);
    for (const [subjectId, progress] of progressEntries) {
      const expectedLastChapter = subjects.find((subject) => subject.id === subjectId).chapters.length - 1;
      if (progress.activeChapter !== expectedLastChapter) {
        failures.push(`${country.code}/${faculty.id}/${subjectId}: progression parallèle perdue`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.slice(0, 100).join("\n"));
  if (failures.length > 100) console.error(`... ${failures.length - 100} autres erreurs`);
  process.exit(1);
}

console.log(
  [
    "OK: recette exhaustive University Integration réussie.",
    `${universityCatalog.countries.length} pays`,
    `${facultyJourneys} facultés/parcours`,
    `${visitedSubjects.size} matières uniques`,
    `${visitedChapters.size} chapitres uniques`,
    `${courseJourneys} parcours de cours`,
    `${chapterTests} tests de chapitre`,
    `${chapterQuestions} réponses contrôlées`,
    `${finalExams} examens finaux simulés à 100 %`,
    "seuil exact de 75 % validé",
    "progression multi-cours validée"
  ].join(" | ")
);
