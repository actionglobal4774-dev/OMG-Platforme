export function validateTaxDraft(draft) {
  if (!/^\d{4}$/.test(draft.taxYear) || !draft.state?.trim()) return 'Annee fiscale et Etat USA obligatoires.';
  if (!/^\d{4}$/.test(draft.ssnLast4)) return 'Saisissez uniquement les quatre derniers chiffres SSN.';
  for (const key of ['employmentIncome', 'businessIncome', 'otherIncome', 'withholding', 'deductions']) {
    if (String(draft[key] ?? '').trim() === '' || !Number.isFinite(Number(draft[key])) || Number(draft[key]) < 0) return 'Renseignez chaque montant positif ou nul ; indiquez 0 si aucun.';
  }
  if (!Number.isInteger(Number(draft.dependents)) || Number(draft.dependents) < 0 || String(draft.dependents).trim() === '') return 'Nombre entier de personnes a charge obligatoire.';
  return '';
}

export function canUseTaxFile(file, profile) {
  if (!profile?.email || !file) return false;
  const equal = (email) => email?.trim().toLowerCase() === profile.email.trim().toLowerCase();
  return profile.userType === 'Contribuable USA' ? equal(file.taxpayer) : profile.userType === 'Fiscaliste autorise' && equal(file.assignedPreparer);
}
