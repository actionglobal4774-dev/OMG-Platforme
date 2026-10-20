export function validateSchoolBooks(cart, books) {
  if (!cart.length) return 'Ajoutez au moins un livre.';
  for (const line of cart) {
    const book = books.find((item) => item.id === line.id);
    if (!book || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > Number(book.stock)) return 'Stock ou quantite de livre invalide.';
    if (!Number.isFinite(Number(book.price)) || Number(book.price) <= 0 || Number(line.price) !== Number(book.price)) return 'Tarif modifie ou invalide : ajoutez de nouveau le livre.';
  }
  return '';
}

export function ownsSchool(schools, id, email) {
  return Boolean(email && schools.some((item) => item.id === id && item.owner?.toLowerCase() === email.toLowerCase()));
}

export function canReadSchoolReport(report, email, code) {
  return Boolean(email && report.guardianEmail?.trim().toLowerCase() === email.trim().toLowerCase() && /^\d{6}$/.test(code || '') && report.accessCode === code);
}
