export function validateUniversityEnrollment(faculties, availableIds, studentEmail, payerEmail) {
  if (!faculties.length || new Set(faculties).size !== faculties.length || faculties.some((id) => !availableIds.includes(id))) return 'Selectionnez des facultes valides et distinctes.';
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.test(studentEmail.trim()) || (payerEmail.trim() && !email.test(payerEmail.trim()))) return 'Email etudiant valide et email payeur valide si renseigne obligatoires.';
  return '';
}

export function allUniversityChaptersPassed(chapters, scores, threshold = 75) {
  return Boolean(chapters?.length) && chapters.every((_, index) => Number.isFinite(scores[index]) && scores[index] >= threshold && scores[index] <= 100);
}

export function universityAnswersComplete(questions, answers) {
  return Boolean(questions.length) && questions.every((question) => Number.isInteger(answers[question.id]) && answers[question.id] >= 0 && answers[question.id] < question.options.length);
}
