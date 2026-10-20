export function validateRestaurantCart(cart, menu) {
  if (!cart.length) return 'Ajoutez au moins un article.';
  for (const line of cart) {
    const item = menu.find((entry) => entry.id === line.id);
    if (!item || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > Number(item.stock)) return 'Quantite indisponible : modifiez le panier.';
    if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0 || Number(item.price) !== Number(line.price)) return 'Le prix a change : retirez cet article puis ajoutez-le de nouveau.';
  }
  return '';
}

export function quoteRestaurantRoom(booking, room, reservations = [], today = new Date().toLocaleDateString('en-CA')) {
  const arrival = Date.parse(`${booking.arrival}T00:00:00Z`);
  const departure = Date.parse(`${booking.departure}T00:00:00Z`);
  const guests = Number(booking.guests);
  if (!room?.available || !Number.isFinite(arrival) || !Number.isFinite(departure) || departure <= arrival || booking.arrival < today) return { error: 'Choisissez une chambre disponible et des dates valides.' };
  if (!Number.isInteger(guests) || guests < 1 || (room.capacity && guests > room.capacity)) return { error: 'Nombre de voyageurs invalide pour cette chambre.' };
  if (!Number.isFinite(Number(room.price)) || Number(room.price) <= 0) return { error: 'Tarif de chambre invalide.' };
  if (reservations.some((item) => item.type === 'room' && item.roomId === room.id && item.status !== 'cancelled' && item.arrival < booking.departure && item.departure > booking.arrival)) return { error: 'Cette chambre a deja une demande locale sur ces dates.' };
  const nights = (departure - arrival) / 86400000;
  const subtotal = Math.round(nights * Number(room.price) * 100) / 100;
  // Les frais hotel de 4,99 USD sont reserves au module Travel, pas Restaurants.
  return { nights, subtotal, platformFee: 0, total: subtotal, currency: 'USD' };
}

export function nextRestaurantOrderStatus(status) {
  return ({ pending: 'preparing', preparing: 'ready', ready: 'completed' })[status] || null;
}
