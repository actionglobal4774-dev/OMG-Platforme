export function validateStoreCart(cart, products) {
  if (!cart.length) return 'Le panier est vide.';
  const ids = new Set();
  for (const line of cart) {
    const product = products.find((item) => item.id === line.id);
    if (ids.has(line.id)) return 'Produit en doublon dans le panier.';
    ids.add(line.id);
    if (!product || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > Number(product.stock)) return 'Quantite ou stock indisponible.';
    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0 || Number(product.price) !== Number(line.price)) return 'Le prix a change : retirez le produit puis ajoutez-le de nouveau.';
    if ((product.currency || 'USD') !== 'USD') return 'Le paiement Store actuel accepte uniquement les produits en USD.';
  }
  return '';
}

export function ownsStoreProduct(product, email) {
  return Boolean(email && product?.seller && product.seller.toLowerCase() === email.toLowerCase());
}

export function validStoreQuote(order) {
  return Boolean(order?.orderId && order.currency === 'USD' && Number.isFinite(order.total) && order.total > 0 && Number.isFinite(order.deliveryFee) && order.deliveryFee >= 0);
}
