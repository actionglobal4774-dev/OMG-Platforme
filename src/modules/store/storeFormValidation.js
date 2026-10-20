export function validateStoreProduct(form, shops, email) {
  if (!email || !shops.some((shop) => shop.id === form.shopId && shop.owner?.toLowerCase() === email.toLowerCase())) return 'Choisissez votre propre boutique.';
  if (!form.name?.trim() || !form.category?.trim() || !form.description?.trim()) return 'Nom, categorie et description obligatoires.';
  if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) return 'Prix positif valide obligatoire.';
  if (String(form.stock ?? '').trim() === '' || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) return 'Stock entier positif ou nul obligatoire.';
  return '';
}

export function validateStorePhoto(file) {
  return file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024 ? '' : 'Photo JPG/PNG/WebP non vide, 5 Mo maximum.';
}

export function validateStoreAddress(address) {
  if (!address.reference?.trim() || !address.recipient?.trim()) return 'Numero achat Mailport et destinataire obligatoires.';
  if (/^[\[{]/.test(address.reference.trim()) || address.reference.length > 160) return 'Saisissez le numero achat Mailport, pas le contenu du QR.';
  if ((address.instructions || '').length > 1000) return 'Instructions limitees a 1000 caracteres.';
  return '';
}
