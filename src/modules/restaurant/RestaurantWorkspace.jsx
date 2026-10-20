import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isDemoMode } from "../../services/runtimePolicy";
import { nextRestaurantOrderStatus, quoteRestaurantRoom, validateRestaurantCart } from "./restaurantJourney";
import { ownsRestaurant, validateRestaurantResource, validateRestaurantTable } from "./restaurantFormValidation";
import {
  generateReceipt,
  getCollection,
  saveCollection,
  prepareModulePayment,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";

const starterMenu = [
  { id: "REST-M-1001", name: "Poulet grille OMG", category: "Plat", price: 18, stock: 20 },
  { id: "REST-M-1002", name: "Salade tropicale", category: "Entree", price: 9, stock: 16 },
  { id: "REST-M-1003", name: "Jus naturel", category: "Boisson", price: 5, stock: 30 }
];

const starterRooms = [
  { id: "REST-R-201", name: "Chambre Standard 201", price: 95, available: true },
  { id: "REST-R-305", name: "Suite Executive 305", price: 180, available: true }
];

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("creer etablissement")) return "establishment";
  if (value.includes("ajouter menus") || value.includes("chambres") && value.includes("tables")) return "resources";
  if (value.includes("employe")) return "employees";
  if (value.includes("inventaire")) return "inventory";
  if (value.includes("rapport") || value.includes("ses ventes")) return "reports";
  if (value.includes("reserver table") || value === "reservation") return "table";
  if (value.includes("reserver chambre")) return "room";
  if (value.includes("suivre commande")) return "tracking";
  if (value.includes("voir recu")) return "receipt";
  if (value.includes("payer") || value.includes("encaisser")) return "payment";
  if (value.includes("vendre")) return "sale";
  return "order";
}

function RestaurantWorkspace({ selectedAction, profile, closeModuleAction, initialReference = "" }) {
  const mode = getMode(selectedAction);
  const [menu, setMenu] = useState(() => getCollection("restaurant_menu").length ? getCollection("restaurant_menu") : isDemoMode ? starterMenu : []);
  const [rooms, setRooms] = useState(() => getCollection("restaurant_rooms").length ? getCollection("restaurant_rooms") : isDemoMode ? starterRooms : []);
  const cartKey = `omg_restaurant_cart_${profile?.email || "anonymous"}`;
  const [cart, setCart] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(cartKey) || "[]"); return Array.isArray(saved) ? saved : []; }
    catch { return []; }
  });
  useEffect(() => { try { sessionStorage.setItem(cartKey, JSON.stringify(cart)); } catch { /* Navigation remains available when storage is full. */ } }, [cart, cartKey]);
  const [establishment, setEstablishment] = useState({ name: "", type: "Restaurant", city: "", address: "", payout: "Payflow" });
  const [resource, setResource] = useState({ kind: "Menu", name: "", price: "", stock: "" });
  const [employee, setEmployee] = useState({ name: "", email: "", role: "Serveur" });
  const [reservation, setReservation] = useState({ date: "", time: "", guests: "2", name: "", phone: "" });
  const [roomBooking, setRoomBooking] = useState({ roomId: "", arrival: "", departure: "", guests: "1" });
  const [payment, setPayment] = useState({ orderId: initialReference, method: "Payflow", confirmed: false });
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");
  const [establishmentId, setEstablishmentId] = useState("");
  const [tableId, setTableId] = useState("");
  const establishments = getCollection("restaurant_establishments");
  const ownedEstablishments = establishments.filter((item) => ownsRestaurant(establishments, item.id, profile?.email));
  const tables = getCollection("restaurant_tables");

  const orders = getCollection("restaurant_orders");
  const reservations = getCollection("restaurant_reservations");
  const employees = getCollection("restaurant_employees");
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const restaurantPayments = getCollection("payments").filter((item) => normalize(item.label).includes("restaurant"));

  const complete = (action, nextReference, message) => {
    saveModuleActivity("restaurant", {
      action,
      reference: nextReference,
      status: "prepared",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(message);
  };

  const addItem = (item) => {
    if ((cart.find((entry) => entry.id === item.id)?.quantity || 0) >= item.stock) { setNotice("Stock maximum atteint."); return; }
    setCart((current) => {
      const exists = current.find((entry) => entry.id === item.id);
      return exists
        ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
        : [...current, { ...item, quantity: 1 }];
    });
    setNotice(`${item.name} ajoute.`);
  };

  const createOrder = (source = "Client") => {
    const validation = validateRestaurantCart(cart, menu);
    if (validation) { setNotice(validation); return; }
    if (!cart.length) {
      setNotice("Ajoutez au moins un article.");
      return;
    }
    const result = upsertItem("restaurant_orders", {
      items: cart,
      total,
      currency: "USD",
      customer: profile?.email,
      employee: source === "Employe" ? profile?.email : "",
      status: "pending",
      source
    });
    setCart([]);
    complete(source === "Employe" ? "Vente employee" : "Commande client", result.data.id, "Commande enregistree localement. Transmission au service non confirmee.");
  };

  const saveReservation = () => {
    const tableError = validateRestaurantTable(reservation, tables.find((item) => item.id === tableId), reservations);
    if (tableError) { setNotice(tableError); return; }
    const guests = Number(reservation.guests);
    if (!reservation.date || !reservation.time || !reservation.name.trim() || !reservation.phone.trim() || !Number.isInteger(guests) || guests < 1) {
      setNotice("Date, heure, nom, telephone et nombre de personnes sont obligatoires.");
      return;
    }
    if (new Date(`${reservation.date}T${reservation.time}`) <= new Date()) {
      setNotice("La reservation doit etre dans le futur.");
      return;
    }
    const duplicate = reservations.some((item) => item.type === "table" && item.customer === profile?.email && item.date === reservation.date && item.time === reservation.time && item.status !== "cancelled");
    if (duplicate) { setNotice("Une demande existe deja pour ce creneau."); return; }
    const result = upsertItem("restaurant_reservations", { ...reservation, tableId, establishmentId: tables.find((item) => item.id === tableId)?.establishmentId, guests, type: "table", status: "requested", customer: profile?.email });
    complete("Reservation table", result.data.id, "Demande locale enregistree. Table non garantie : capacite et confirmation etablissement restent a verifier.");
  };

  const saveRoomBooking = (confirmed = false) => {
    const quote = quoteRestaurantRoom(roomBooking, rooms.find((item) => item.id === roomBooking.roomId), reservations);
    if (quote.error) { setNotice(quote.error); return; }
    if (!confirmed) { setReview({ kind: "room", ...quote }); setNotice(""); return; }
    const room = rooms.find((item) => item.id === roomBooking.roomId);
    const nights = quote.nights;
    const result = upsertItem("restaurant_reservations", {
      ...roomBooking,
      type: "room",
      roomName: room?.name,
      total: quote.total,
      platformFee: quote.platformFee,
      subtotal: quote.subtotal,
      currency: "USD",
      status: "requested",
      customer: profile?.email
    });
    setReview(null);
    complete("Reservation chambre", result.data.id, `Demande locale pour ${nights} nuit(s), ${quote.total.toFixed(2)} USD. Aucun frais de plateforme pour cette reservation dans Restaurants. Chambre et paiement non confirmes.`);
  };

  const saveEstablishment = () => {
    if (!establishment.name.trim() || !establishment.city.trim() || !establishment.address.trim()) {
      setNotice("Nom, ville et adresse sont obligatoires.");
      return;
    }
    const result = upsertItem("restaurant_establishments", { ...establishment, owner: profile?.email, status: "active" });
    complete("Creer etablissement", result.data.id, "Etablissement enregistre.");
  };

  const saveResource = () => {
    if (!ownsRestaurant(establishments, establishmentId, profile?.email)) { setNotice("Choisissez votre propre etablissement."); return; }
    const validation = validateRestaurantResource(resource);
    if (validation) { setNotice(validation); return; }
    const price = Number(resource.price);
    const stock = Number(resource.stock);
    if (!resource.name.trim() || (resource.kind !== "Table" && (!Number.isFinite(price) || price <= 0)) || !Number.isInteger(stock) || stock < 0) {
      setNotice("Nom, prix valide et stock entier sont obligatoires.");
      return;
    }
    if (resource.kind === "Chambre") {
      const result = upsertItem("restaurant_rooms", { name: resource.name, price, available: stock > 0, stock, capacity: Number(resource.capacity), establishmentId, owner: profile?.email });
      const next = [result.data, ...rooms];
      setRooms(next);
      saveCollection("restaurant_rooms", next);
      complete("Ajouter chambre", result.data.id, "Chambre enregistree.");
      return;
    }
    if (resource.kind === "Table") {
      const result = upsertItem("restaurant_tables", { name: resource.name, capacity: stock, price: 0, available: true, establishmentId, owner: profile?.email });
      complete("Ajouter table", result.data.id, "Table enregistree.");
      return;
    }
    const result = upsertItem("restaurant_menu", { name: resource.name, price, stock, category: "Menu", establishmentId, owner: profile?.email });
    const next = [result.data, ...menu];
    setMenu(next);
    saveCollection("restaurant_menu", next);
    complete("Ajouter menu", result.data.id, "Article du menu enregistre.");
  };

  const saveEmployee = () => {
    if (!ownsRestaurant(establishments, establishmentId, profile?.email)) { setNotice("Choisissez votre propre etablissement."); return; }
    if (employees.some((item) => item.establishmentId === establishmentId && item.email?.toLowerCase() === employee.email.toLowerCase())) { setNotice("Une fiche existe deja pour cet employe dans cet etablissement."); return; }
    if (!employee.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      setNotice("Nom et email valide sont obligatoires.");
      return;
    }
    const result = upsertItem("restaurant_employees", { ...employee, establishmentId, establishmentOwner: profile?.email, status: "requested" });
    complete("Ajouter employe", result.data.id, "Fiche employe locale enregistree. Aucun compte ni droit serveur accorde.");
  };

  const updateStock = (id, value) => {
    const item = menu.find((entry) => entry.id === id);
    if (!item || item.establishmentId !== establishmentId || !ownsRestaurant(establishments, establishmentId, profile?.email)) { setNotice("Selectionnez votre etablissement ; seuls ses produits peuvent etre modifies."); return; }
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) return;
    const next = menu.map((item) => item.id === id ? { ...item, stock } : item);
    setMenu(next);
    saveCollection("restaurant_menu", next);
  };

  const updateOrderStatus = (id, status) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    if (profile?.userType !== "Employe" || nextRestaurantOrderStatus(order.status) !== status) { setNotice("Transition non autorisee. Respectez preparation, prete puis terminee."); return; }
    upsertItem("restaurant_orders", { ...order, status, handledBy: profile?.email });
    complete("Suivi commande", id, `Statut local : ${status}. Confirmation serveur non obtenue.`);
  };

  const processPayment = async (confirmed = false) => {
    if (pending.current) return;
    const order = orders.find((item) => item.id === payment.orderId);
    if (!order) {
      setNotice("Choisissez une commande.");
      return;
    }
    if (order.paymentId) { setNotice("Une preparation existe deja pour cette commande. Verifiez son statut avant de recommencer."); return; }
    if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) { setNotice("Montant invalide."); return; }
    if (!payment.confirmed) {
      setNotice("Confirmez la commande, le montant et le moyen de paiement.");
      return;
    }
    if (!confirmed) { setReview({ kind: "payment", order }); setNotice(""); return; }
    pending.current = true;
    setBusy(true);
    let paid;
    try { paid = await prepareModulePayment({ moduleId: "restaurant", action: "Payer commande", amount: order.total, currency: order.currency || "USD", label: "Restaurant", method: payment.method }); }
    catch (error) { setNotice(error?.message || "Preparation du paiement impossible."); return; }
    finally { pending.current = false; setBusy(false); }
    if (!paid.ok) {
      setNotice(paid.error);
      return;
    }
    upsertItem("restaurant_orders", { ...order, paymentStatus: paid.live ? "prepared" : "simulated", paymentId: paid.data.id });
    if (!paid.live) generateReceipt(paid.data);
    complete("Paiement restaurant", paid.data.id, paid.live ? "Paiement prepare sur le serveur, en attente de confirmation." : "Paiement de demonstration confirme.");
    setReview(null);
    setPayment((current) => ({ ...current, confirmed: false }));
  };

  const Section = ({ title, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      {children}
    </section>
  );

  if (review) return <section className="mt-5 space-y-4 rounded-2xl border bg-white p-5"><h3 className="text-xl font-bold">Verifier avant confirmation</h3>{review.kind === "room" ? <><p>{roomBooking.roomId} · {roomBooking.arrival} au {roomBooking.departure} · {roomBooking.guests} voyageur(s)</p><p>{review.nights} nuit(s) : total {review.total.toFixed(2)} USD — aucun frais de plateforme dans Restaurants.</p><p>Demande locale uniquement, sans garantie de disponibilite ni paiement.</p></> : <><p>Commande {review.order.id} · {review.order.total} {review.order.currency || "USD"} · {payment.method}</p><p>Preparation uniquement : aucun encaissement reel confirme.</p></>}<button disabled={busy} onClick={() => review.kind === "room" ? saveRoomBooking(true) : processPayment(true)} className="rounded bg-omgGreen p-3 text-white">{busy ? "Traitement…" : "Confirmer"}</button><button disabled={busy} onClick={() => setReview(null)} className="ml-3 rounded border p-3">Modifier / annuler</button>{notice && <p role="alert">{notice}</p>}</section>;

  return (
    <div className="mt-5 space-y-5">
      {["resources", "employees", "inventory"].includes(mode) && <label className="block rounded-xl border bg-white p-4">Mon etablissement<select aria-label="Etablissement concerne" value={establishmentId} onChange={(event) => setEstablishmentId(event.target.value)} className="mt-2 w-full rounded border p-3"><option value="">Choisir explicitement</option>{ownedEstablishments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Donnees locales ou exemples : aucune commande, reservation ou recette reelle n'est garantie sans confirmation serveur.</p>
      {(mode === "order" || mode === "sale") && (
        <Section title={mode === "sale" ? "Vente rapide" : "Menu et commande"}>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {menu.map((item) => (
              <article key={item.id} className="rounded-xl border bg-slate-50 p-4">
                <h4 className="font-black text-slate-900">{item.name}</h4>
                <p className="text-sm text-slate-600">{item.category} · Stock {item.stock}</p>
                <p className="mt-2 text-xl font-black text-omgGreen">{Number(item.price).toFixed(2)} USD</p>
                <button type="button" disabled={item.stock <= 0} onClick={() => addItem(item)} className="mt-3 rounded bg-omgGreen px-4 py-2 font-bold text-white disabled:opacity-50">Ajouter</button>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <strong>Commande : {cart.reduce((sum, item) => sum + item.quantity, 0)} article(s) · {total.toFixed(2)} USD</strong>
            {cart.map((item) => <div key={item.id} className="mt-2 flex gap-3"><span>{item.name} × {item.quantity}</span><button className="underline" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}>Retirer</button></div>)}
            <button type="button" onClick={() => createOrder(mode === "sale" ? "Employe" : "Client")} className="ml-4 rounded bg-slate-900 px-4 py-2 font-bold text-white">Confirmer</button>
          </div>
        </Section>
      )}

      {mode === "table" && (
        <Section title="Reserver une table">
          <select aria-label="Table souhaitee" className="mt-3 w-full rounded border p-3" value={tableId} onChange={(event) => setTableId(event.target.value)}><option value="">Choisir une table</option>{tables.filter((item) => item.available).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.capacity} places · {establishments.find((entry) => entry.id === item.establishmentId)?.name || "Etablissement a verifier"}</option>)}</select>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input aria-label="Date" type="date" className="rounded border p-3" value={reservation.date} onChange={(e) => setReservation({ ...reservation, date: e.target.value })} />
            <input aria-label="Heure" type="time" className="rounded border p-3" value={reservation.time} onChange={(e) => setReservation({ ...reservation, time: e.target.value })} />
            <input placeholder="Nom" className="rounded border p-3" value={reservation.name} onChange={(e) => setReservation({ ...reservation, name: e.target.value })} />
            <input placeholder="Telephone" className="rounded border p-3" value={reservation.phone} onChange={(e) => setReservation({ ...reservation, phone: e.target.value })} />
            <input aria-label="Nombre de personnes" type="number" min="1" className="rounded border p-3" value={reservation.guests} onChange={(e) => setReservation({ ...reservation, guests: e.target.value })} />
          </div>
          <button type="button" onClick={saveReservation} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Confirmer la reservation</button>
        </Section>
      )}

      {mode === "room" && (
        <Section title="Reserver une chambre">
          <select className="mt-4 w-full rounded border p-3" value={roomBooking.roomId} onChange={(e) => setRoomBooking({ ...roomBooking, roomId: e.target.value })}>
            <option value="">Choisir une chambre</option>
            {rooms.filter((item) => item.available).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.price} USD/nuit</option>)}
          </select>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input aria-label="Arrivee" type="date" className="rounded border p-3" value={roomBooking.arrival} onChange={(e) => setRoomBooking({ ...roomBooking, arrival: e.target.value })} />
            <input aria-label="Depart" type="date" className="rounded border p-3" value={roomBooking.departure} onChange={(e) => setRoomBooking({ ...roomBooking, departure: e.target.value })} />
            <input aria-label="Voyageurs" type="number" min="1" className="rounded border p-3" value={roomBooking.guests} onChange={(e) => setRoomBooking({ ...roomBooking, guests: e.target.value })} />
          </div>
          <button type="button" onClick={() => saveRoomBooking()} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Verifier le sejour et les frais</button>
        </Section>
      )}
      {(mode === "room" || mode === "table") && <Section title="Mes demandes locales"><div className="mt-3 space-y-2">{reservations.filter((item) => item.customer === profile?.email).map((item) => <p key={item.id}>{item.id} · {item.type} · {item.date || `${item.arrival} au ${item.departure}`} · {item.status === "confirmed" ? "Ancien statut local, non verifie" : item.status}</p>)}</div></Section>}

      {mode === "establishment" && (
        <Section title="Creer un etablissement">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input placeholder="Nom de l'etablissement" className="rounded border p-3" value={establishment.name} onChange={(e) => setEstablishment({ ...establishment, name: e.target.value })} />
            <select className="rounded border p-3" value={establishment.type} onChange={(e) => setEstablishment({ ...establishment, type: e.target.value })}><option>Restaurant</option><option>Hotel</option><option>Traiteur</option></select>
            <input placeholder="Ville" className="rounded border p-3" value={establishment.city} onChange={(e) => setEstablishment({ ...establishment, city: e.target.value })} />
            <input placeholder="Adresse" className="rounded border p-3" value={establishment.address} onChange={(e) => setEstablishment({ ...establishment, address: e.target.value })} />
            <select className="rounded border p-3" value={establishment.payout} onChange={(e) => setEstablishment({ ...establishment, payout: e.target.value })}><option>Payflow</option><option>Compte bancaire</option></select>
          </div>
          <button type="button" onClick={saveEstablishment} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer</button>
        </Section>
      )}

      {mode === "resources" && (
        <Section title="Menus, chambres et tables">
          <p className="mt-3 text-sm">Table : le champ stock/capacite indique les places, sans prix de reservation. Chambre : preciser aussi le nombre maximal de voyageurs.</p>
          {resource.kind === "Chambre" && <input aria-label="Capacite voyageurs de la chambre" placeholder="Capacite voyageurs" type="number" min="1" className="mt-3 w-full rounded border p-3" value={resource.capacity || ""} onChange={(event) => setResource({ ...resource, capacity: event.target.value })} />}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded border p-3" value={resource.kind} onChange={(e) => setResource({ ...resource, kind: e.target.value })}><option>Menu</option><option>Chambre</option><option>Table</option></select>
            <input placeholder="Nom" className="rounded border p-3" value={resource.name} onChange={(e) => setResource({ ...resource, name: e.target.value })} />
            <input aria-label="Prix" type="number" min="0" className="rounded border p-3" value={resource.price} onChange={(e) => setResource({ ...resource, price: e.target.value })} />
            <input aria-label="Stock ou capacite" type="number" min="0" className="rounded border p-3" value={resource.stock} onChange={(e) => setResource({ ...resource, stock: e.target.value })} />
          </div>
          <button type="button" onClick={saveResource} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Ajouter</button>
        </Section>
      )}

      {mode === "employees" && (
        <Section title="Gestion des employes">
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input placeholder="Nom complet" className="rounded border p-3" value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} />
            <input placeholder="Email" className="rounded border p-3" value={employee.email} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
            <select className="rounded border p-3" value={employee.role} onChange={(e) => setEmployee({ ...employee, role: e.target.value })}><option>Serveur</option><option>Cuisine</option><option>Reception</option><option>Caissier</option></select>
          </div>
          <button type="button" onClick={saveEmployee} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Ajouter employe</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{employees.length} employe(s) enregistre(s).</p>
        </Section>
      )}

      {mode === "inventory" && (
        <Section title="Inventaire">
          <div className="mt-4 space-y-3">
            {menu.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <strong>{item.name}</strong>
                <input aria-label={`Stock ${item.name}`} type="number" min="0" className="w-28 rounded border p-2" value={item.stock} onChange={(e) => updateStock(item.id, e.target.value)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {mode === "tracking" && (
        <Section title="Suivi des commandes">
          <div className="mt-4 space-y-3">
            {!orders.length && <p className="text-slate-600">Aucune commande.</p>}
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl bg-slate-50 p-4">
                <strong>{order.id}</strong><p>{Number(order.total).toFixed(2)} USD · {order.status}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateOrderStatus(order.id, "preparing")} className="rounded border px-3 py-2">En preparation</button>
                  <button type="button" onClick={() => updateOrderStatus(order.id, "ready")} className="rounded border px-3 py-2">Prete</button>
                  <button type="button" onClick={() => updateOrderStatus(order.id, "completed")} className="rounded bg-omgGreen px-3 py-2 font-bold text-white">Terminee</button>
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}

      {mode === "payment" && (
        <Section title="Paiement Restaurant">
          <select className="mt-4 w-full rounded border p-3" value={payment.orderId} onChange={(e) => setPayment({ ...payment, orderId: e.target.value })}>
            <option value="">Choisir une commande</option>
            {orders.filter((item) => item.status !== "paid").map((item) => <option key={item.id} value={item.id}>{item.id} · {Number(item.total).toFixed(2)} USD</option>)}
          </select>
          <select className="mt-3 w-full rounded border p-3" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option>Payflow</option><option>Carte bancaire</option><option>Cash</option></select>
          <p className="mt-3">Aucun PIN requis pour preparer une demande. Cash ne vaut pas confirmation d'encaissement.</p>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} /> Je confirme la commande et son montant.</label>
          <button type="button" onClick={() => processPayment()} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Verifier la preparation</button>
        </Section>
      )}

      {mode === "receipt" && (
        <Section title="Historique local — pas une preuve de paiement reel">
          <div className="mt-4 space-y-3">
            {!restaurantPayments.length && <p className="text-slate-600">Aucun recu Restaurant.</p>}
            {restaurantPayments.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.id}</strong><p>{Number(item.amount).toFixed(2)} {item.currency} · {item.status}</p></article>)}
          </div>
        </Section>
      )}

      {mode === "reports" && (
        <Section title="Rapports Restaurant">
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4"><strong>Commandes</strong><p className="text-2xl font-black">{orders.length}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>Reservations</strong><p className="text-2xl font-black">{reservations.length}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>Ventes</strong><p className="text-2xl font-black">{restaurantPayments.length}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>Revenus reels</strong><p>Non verifies — simulations exclues</p></div>
          </div>
        </Section>
      )}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}{(mode === "order" || mode === "sale") && <Link className="ml-3 underline" to={`/restaurant/orders?task=${encodeURIComponent(mode === "sale" ? "Encaisser autorise" : "Payer")}&reference=${encodeURIComponent(reference)}`}>Preparer le paiement</Link>}</div>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default RestaurantWorkspace;
