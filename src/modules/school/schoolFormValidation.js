import { ownsSchool } from './schoolJourney.js';

export function validateSchoolReportContext(report, schools, classes, email) {
  if (!ownsSchool(schools, report.schoolId, email)) return 'Choisissez votre propre ecole.';
  if (!classes.some((item) => item.id === report.classId && item.schoolId === report.schoolId)) return 'Choisissez une classe de cette ecole.';
  if (!report.schoolYear?.trim()) return 'Annee scolaire obligatoire.';
  return '';
}

export function duplicateSchoolClass(classes, draft) {
  return classes.some((item) => item.schoolId === draft.schoolId && item.name?.trim().toLowerCase() === draft.name?.trim().toLowerCase() && item.level?.trim().toLowerCase() === draft.level?.trim().toLowerCase());
}

export function validateSchoolFeePeriod(fee) {
  if (!['USD', 'HTG', 'EUR'].includes(fee.currency)) return 'Devise non prise en charge.';
  if (!fee.schoolYear?.trim() || !fee.period?.trim()) return 'Annee scolaire et periode facturee obligatoires.';
  return '';
}
