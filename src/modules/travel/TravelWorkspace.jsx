import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCollection, upsertItem } from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";
import { createTravelReservationRequest, requestTravelReservationCancellation } from "../../services/backendService";

const SERVICE_FEE_USD = 4.99;
const flightOffers = [
  { id: "flight-demo-1", airline: "Partner airline — verification required", route: "BOS → CDG", duration: "7h 10m", stops: "Direct", supplierPrice: 490, taxes: 62, baggage: "1 checked bag", fare: "Changes subject to supplier terms" },
  { id: "flight-demo-2", airline: "Partner airline — verification required", route: "BOS → CDG", duration: "9h 25m", stops: "1 stop", supplierPrice: 405, taxes: 59, baggage: "Carry-on", fare: "Refundability must be verified" }
];
const hotelOffers = [
  { id: "hotel-demo-1", name: "Partner hotel — availability to verify", neighborhood: "Central district", nightly: 145, taxes: 28, room: "Standard room", cancellation: "Supplier cancellation terms apply" },
  { id: "hotel-demo-2", name: "Partner hotel — availability to verify", neighborhood: "Near transit", nightly: 112, taxes: 22, room: "Double room", cancellation: "Supplier cancellation terms apply" }
];
const insuranceOffers = [
  { id: "insurance-demo-1", name: "Travel protection — partner verification required", price: 39, cover: "Emergency medical and travel delay", exclusion: "Read eligibility and exclusions before purchase" },
  { id: "insurance-demo-2", name: "Travel protection — partner verification required", price: 58, cover: "Medical, cancellation and baggage delay", exclusion: "Coverage is subject to insurer approval" }
];

function actionMode(action) {
  const value = String(action || "").toLowerCase();
  if (value.includes("vol")) return "flights";
  if (value.includes("hotel")) return "hotels";
  if (value.includes("assurance")) return "insurance";
  if (value.includes("mes voyages")) return "trips";
  if (value.includes("reservation")) return "bookings";
  if (value.includes("document")) return "documents";
  if (value.includes("assistance") || value.includes("support")) return "support";
  if (value.includes("partenaire") || value.includes("disponibilit")) return "partner";
  if (value.includes("administration") || value.includes("fournisseur") || value.includes("tarification") || value.includes("audit") || value.includes("rapports")) return "admin";
  if (value.includes("voyage")) return "planner";
  return "planner";
}

const Panel = ({ title, children }) => <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950">{title}</h2>{children}</section>;

export default function TravelWorkspace({ selectedAction, profile, closeModuleAction }) {
  const mode = actionMode(selectedAction);
  const [trip, setTrip] = useState({ destination: "", days: "", origin: "", departure: "", travelers: "1", rooms: "1", budget: "", consent: false });
  const [selected, setSelected] = useState({ flightId: "", hotelId: "", insuranceId: "" });
  const [paymentMethod, setPaymentMethod] = useState("Payflow");
  const [notice, setNotice] = useState("");
  const [support, setSupport] = useState("");
  const reservations = getCollection("travel_reservations");
  const tickets = getCollection("travel_support_requests");
  const selectedFlight = flightOffers.find((item) => item.id === selected.flightId);
  const selectedHotel = hotelOffers.find((item) => item.id === selected.hotelId);
  const selectedInsurance = insuranceOffers.find((item) => item.id === selected.insuranceId);
  const ticketServiceFee = selectedFlight ? SERVICE_FEE_USD * Math.max(1, Number(trip.travelers || 1)) : 0;
  const roomServiceFee = selectedHotel ? SERVICE_FEE_USD * Math.max(1, Number(trip.rooms || 1)) : 0;
  const serviceFee = ticketServiceFee + roomServiceFee;
  const total = (selectedFlight ? selectedFlight.supplierPrice + selectedFlight.taxes : 0) + (selectedHotel ? (selectedHotel.nightly * Math.max(1, Number(trip.days || 1)) + selectedHotel.taxes) * Math.max(1, Number(trip.rooms || 1)) : 0) + (selectedInsurance?.price || 0) + serviceFee;
  const userReservations = useMemo(() => reservations.filter((item) => item.owner === profile?.email), [reservations, profile?.email]);

  const saveDraft = () => {
    if (!trip.destination.trim() || !Number(trip.days) || !trip.origin.trim() || !trip.departure || !trip.consent) { setNotice("Destination, durée, départ, date et autorisation de réutiliser le profil sont nécessaires."); return; }
    const item = upsertItem("travel_itineraries", { ...trip, owner: profile?.email, status: "draft", note: "Suggestions uniquement : aucune réservation n'est créée." });
    saveModuleActivity("travel", { action: "Itinéraire préparé", reference: item.data.id, status: "draft", profile: { email: profile?.email, userType: profile?.userType } });
    setNotice("Itinéraire préparé. Les suggestions ne constituent pas une réservation.");
  };

  const requestBooking = async () => {
    if (!selectedFlight && !selectedHotel) { setNotice("Sélectionnez au moins un vol ou un hôtel."); return; }
    if (!trip.destination.trim() || !trip.departure || !trip.consent) { setNotice("Complétez les informations de voyage et confirmez l'utilisation des données nécessaires."); return; }
    let backendReservationId = null;
    try {
      const backendResult = await createTravelReservationRequest({ trip, selectedFlight, selectedHotel, selectedInsurance, paymentMethod, humanConfirmed: true });
      backendReservationId = backendResult.live ? backendResult.id : null;
    } catch (error) {
      setNotice(`La demande n'a pas été envoyée au serveur : ${error?.message || "réessayez plus tard"}.`);
      return;
    }
    const item = upsertItem("travel_reservations", { owner: profile?.email, backendReservationId, trip, selectedFlight, selectedHotel, selectedInsurance, requestedPaymentMethod: paymentMethod, supplierTotal: total - serviceFee, serviceFee, total, currency: "USD", status: "awaiting_supplier_verification", paymentStatus: "not_paid", providerMessage: "Le prix et la disponibilité doivent être revérifiés par un fournisseur connecté avant paiement." });
    saveModuleActivity("travel", { action: "Demande de réservation", reference: item.data.id, status: "awaiting_supplier_verification", profile: { email: profile?.email, userType: profile?.userType } });
    setNotice("Demande enregistrée. Aucun billet, hôtel ni assurance n'est confirmé à ce stade.");
  };

  const requestCancellation = async (item) => {
    if (item.backendReservationId) {
      try {
        await requestTravelReservationCancellation(item.backendReservationId);
      } catch (error) {
        setNotice(`L'annulation n'a pas été envoyée au serveur : ${error?.message || "réessayez plus tard"}.`);
        return;
      }
    }
    const result = upsertItem("travel_reservations", { ...item, cancellationRequestedAt: new Date().toISOString(), status: "cancellation_requested", providerMessage: "Demande transmise : l'acceptation et le remboursement dépendent des conditions du fournisseur." });
    saveModuleActivity("travel", { action: "Annulation demandée", reference: result.data.id, status: "cancellation_requested" });
    setNotice("Demande d'annulation enregistrée. Les frais de service restent distincts et sont soumis à la loi applicable.");
  };

  const sendSupport = () => {
    if (!support.trim()) { setNotice("Décrivez votre besoin afin de le transmettre à l'assistance."); return; }
    const result = upsertItem("travel_support_requests", { owner: profile?.email, message: support.trim(), status: "open", createdAt: new Date().toISOString() });
    saveModuleActivity("travel", { action: "Assistance voyage", reference: result.data.id, status: "open" }); setSupport(""); setNotice("Demande transmise à l'assistance Travel.");
  };

  const Planner = () => <Panel title="Planifier votre voyage"><p className="mt-1 text-sm text-slate-600">L'assistant prépare des options ; il ne réserve jamais ni ne confirme un achat seul.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><input className="rounded border p-3" placeholder="Destination" value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} /><input className="rounded border p-3" type="number" min="1" placeholder="Nombre de jours" value={trip.days} onChange={(e) => setTrip({ ...trip, days: e.target.value })} /><input className="rounded border p-3" placeholder="Ville ou aéroport de départ" value={trip.origin} onChange={(e) => setTrip({ ...trip, origin: e.target.value })} /><input className="rounded border p-3" type="date" value={trip.departure} onChange={(e) => setTrip({ ...trip, departure: e.target.value })} /><input className="rounded border p-3" type="number" min="1" placeholder="Voyageurs" value={trip.travelers} onChange={(e) => setTrip({ ...trip, travelers: e.target.value })} /><input className="rounded border p-3" type="number" min="1" placeholder="Chambres" value={trip.rooms} onChange={(e) => setTrip({ ...trip, rooms: e.target.value })} /><input className="rounded border p-3" placeholder="Budget estimé USD" value={trip.budget} onChange={(e) => setTrip({ ...trip, budget: e.target.value })} /></div><label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={trip.consent} onChange={(e) => setTrip({ ...trip, consent: e.target.checked })} />J'autorise l'utilisation des seules données OMG nécessaires pour préparer cette demande.</label><button type="button" onClick={saveDraft} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Préparer l'itinéraire</button></Panel>;
  const OfferCards = ({ type, offers, selectedId, onSelect }) => <Panel title={type}><p className="mt-1 text-sm text-amber-800">Résultats de démonstration : à connecter et vérifier auprès de fournisseurs autorisés avant réservation.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{offers.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><strong className="text-slate-900">{item.airline || item.name}</strong><p className="mt-1 text-sm text-slate-600">{item.route || item.neighborhood || item.cover}</p><p className="mt-2 text-sm">{item.duration || item.room || item.exclusion}</p><p className="mt-3 font-black text-emerald-700">{item.supplierPrice || item.nightly || item.price} USD {item.nightly ? "/ nuit" : ""}</p>{item.taxes !== undefined && <p className="text-xs text-slate-500">Taxes estimées : {item.taxes} USD</p>}<button type="button" onClick={() => onSelect(item.id)} className={`mt-3 rounded px-4 py-2 font-bold ${selectedId === item.id ? "bg-emerald-700 text-white" : "border border-emerald-700 text-emerald-700"}`}>{selectedId === item.id ? "Sélectionné" : "Choisir"}</button></article>)}</div></Panel>;
  const BookingSummary = () => <Panel title="Récapitulatif et confirmation"><div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm"><p>Vol : {selectedFlight ? `${selectedFlight.route} · ${selectedFlight.supplierPrice + selectedFlight.taxes} USD` : "Non sélectionné"}</p><p>Hôtel : {selectedHotel ? `${selectedHotel.name} · ${trip.rooms || 1} chambre(s) · ${selectedHotel.nightly} USD/nuit` : "Non sélectionné"}</p><p>Assurance : {selectedInsurance ? `${selectedInsurance.price} USD` : "Aucune"}</p><p>Frais One Million Travel — billets : {ticketServiceFee.toFixed(2)} USD ({selectedFlight ? `${trip.travelers || 1} billet(s) × 4,99 USD` : "aucun billet"})</p><p>Frais One Million Travel — chambres : {roomServiceFee.toFixed(2)} USD ({selectedHotel ? `${trip.rooms || 1} chambre(s) × 4,99 USD` : "aucune chambre"})</p><p className="border-t pt-2 text-lg font-black text-slate-900">Total indicatif : {total.toFixed(2)} USD</p></div><label className="mt-4 block text-sm font-bold">Moyen de paiement après vérification fournisseur<select className="mt-2 w-full rounded border p-3" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Payflow</option><option>MonCash</option><option>NatCash</option><option>Carte bancaire</option></select></label><p className="mt-2 text-xs text-slate-600">Payflow centralise le suivi. MonCash et NatCash ne sont ouverts qu'après vérification du montant, de la devise et du fournisseur.</p><label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={trip.consent} onChange={(e) => setTrip({ ...trip, consent: e.target.checked })} />Je confirme avoir lu les conditions, la transparence des frais et le caractère non remboursable des frais de service sous réserve de mes droits légaux.</label><button type="button" onClick={requestBooking} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Demander vérification fournisseur</button></Panel>;

  return <div className="mt-5 space-y-5 text-slate-800">{mode === "planner" && <><Planner /><BookingSummary /></>}{mode === "trips" && <Panel title="Mes voyages"><p className="mt-3 text-slate-600">Les itinéraires sont personnels et restent des suggestions jusqu'à confirmation des services sélectionnés.</p><div className="mt-4 space-y-3">{!userReservations.length ? <p>Aucun voyage préparé.</p> : userReservations.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.trip?.destination}</strong><p>{item.trip?.days} jour(s) · départ {item.trip?.departure}</p></article>)}</div></Panel>}{mode === "flights" && <><Planner /><OfferCards type="Comparer les vols" offers={flightOffers} selectedId={selected.flightId} onSelect={(flightId) => setSelected({ ...selected, flightId })} /><BookingSummary /></>}{mode === "hotels" && <><Planner /><OfferCards type="Comparer les hôtels" offers={hotelOffers} selectedId={selected.hotelId} onSelect={(hotelId) => setSelected({ ...selected, hotelId })} /><BookingSummary /></>}{mode === "insurance" && <><OfferCards type="Assurance voyage" offers={insuranceOffers} selectedId={selected.insuranceId} onSelect={(insuranceId) => setSelected({ ...selected, insuranceId })} /><BookingSummary /></>}{mode === "bookings" && <Panel title="Mes réservations"><div className="mt-4 space-y-3">{!userReservations.length && <p>Aucune réservation personnelle pour le moment.</p>}{userReservations.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.trip?.destination || "Voyage"}</strong><p className="text-sm">Référence : {item.id} · Statut : {item.status}</p><p className="mt-1 text-sm">{item.providerMessage}</p>{["awaiting_supplier_verification", "supplier_confirmed"].includes(item.status) && <button type="button" onClick={() => requestCancellation(item)} className="mt-3 rounded border border-red-300 px-3 py-2 font-bold text-red-700">Demander annulation</button>}</article>)}</div></Panel>}{mode === "documents" && <Panel title="Documents de voyage"><p className="mt-2 text-sm text-slate-600">Les documents apparaissent uniquement après confirmation du fournisseur. Ne téléversez un passeport que lorsqu'un fournisseur autorisé le demande.</p><div className="mt-4 space-y-2">{userReservations.filter((item) => item.status === "supplier_confirmed").map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3">Confirmation disponible — {item.id}</div>)}{!userReservations.some((item) => item.status === "supplier_confirmed") && <p>Aucun document émis.</p>}</div></Panel>}{mode === "support" && <Panel title="Assistance Travel"><p className="mt-2 text-sm text-slate-600">L'assistant peut expliquer votre dossier et transmet les cas sensibles à un humain ; il ne promet ni remboursement ni modification sans fournisseur.</p><textarea className="mt-4 min-h-28 w-full rounded border p-3" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="Décrivez votre demande : bagage, modification, annulation, document..." /><button type="button" onClick={sendSupport} className="mt-3 rounded bg-omgGreen px-5 py-3 font-bold text-white">Contacter l'assistance</button></Panel>}{mode === "partner" && <Panel title="Espace partenaire"><p className="mt-3 text-slate-700">Les partenaires gèrent leurs offres et disponibilités via une connexion fournisseur vérifiée. Aucune disponibilité de démonstration ne peut être publiée comme réelle.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Offres</strong><p>À connecter</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Disponibilités</strong><p>À vérifier</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Support</strong><p>{tickets.length} demande(s)</p></div></div></Panel>}{mode === "admin" && <Panel title="Administration Travel"><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Réservations</strong><p className="text-2xl font-black">{reservations.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>En attente fournisseur</strong><p className="text-2xl font-black">{reservations.filter((item) => item.status === "awaiting_supplier_verification").length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Assistance</strong><p className="text-2xl font-black">{tickets.length}</p></div></div><p className="mt-4 text-sm text-slate-600">Tarification, fournisseurs et confirmations effectives doivent être appliqués et audités par le backend.</p></Panel>}{notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}</div>}<button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button></div>;
}
