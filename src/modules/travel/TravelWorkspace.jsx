import React, { useEffect, useMemo, useRef, useState } from "react";
import { isDemoMode } from "../../services/runtimePolicy";
import { quoteTravel, travelHotelNights, validateTravelDates, validateTravelTrip } from "./travelJourney";
import { Link, useParams } from "react-router-dom";
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
  if (["reservations a verifier", "fournisseurs", "tarification", "audit travel", "rapports travel", "administration travel"].includes(value)) return "admin";
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
  const { section: pageSection } = useParams();
  const mode = actionMode(selectedAction);
  const [trip, setTrip] = useState({ destination: "", days: "", origin: "", departure: "", returnDate: "", checkIn: "", checkOut: "", travelers: "1", rooms: "1", budget: "", consent: false });
  const [selected, setSelected] = useState({ flightId: "", hotelId: "", insuranceId: "" });
  const [paymentMethod, setPaymentMethod] = useState("Payflow");
  const [notice, setNotice] = useState("");
  const [support, setSupport] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [cancelReview, setCancelReview] = useState(null);
  useEffect(() => { setBookingConfirmed(false); }, [trip, selected, paymentMethod]);
  useEffect(() => { setNotice(""); }, [pageSection, selectedAction]);
  const reservations = getCollection("travel_reservations").filter((item) => profile?.email && item.owner === profile.email);
  const tickets = getCollection("travel_support_requests").filter((item) => profile?.email && item.owner === profile.email);
  const itineraries = getCollection("travel_itineraries").filter((item) => item.owner === profile?.email);
  const selectedFlight = flightOffers.find((item) => item.id === selected.flightId);
  const selectedHotel = hotelOffers.find((item) => item.id === selected.hotelId);
  const selectedInsurance = insuranceOffers.find((item) => item.id === selected.insuranceId);
  const quote = quoteTravel(trip, selectedFlight, selectedHotel, selectedInsurance);
  const { ticketServiceFee = 0, roomServiceFee = 0, serviceFee = 0, total = 0 } = quote || {};
  const userReservations = useMemo(() => reservations.filter((item) => item.owner === profile?.email), [reservations, profile?.email]);

  const saveDraft = () => {
    const validation = validateTravelTrip(trip);
    if (validation) { setNotice(validation); return; }
    if (!trip.destination.trim() || !Number(trip.days) || !trip.origin.trim() || !trip.departure || !trip.consent) { setNotice("Destination, durée, départ, date et autorisation de réutiliser le profil sont nécessaires."); return; }
    const item = upsertItem("travel_itineraries", { ...trip, owner: profile?.email, status: "draft", note: "Suggestions uniquement : aucune réservation n'est créée." });
    saveModuleActivity("travel", { action: "Itinéraire préparé", reference: item.data.id, status: "draft", profile: { email: profile?.email, userType: profile?.userType } });
    setNotice("Itinéraire préparé. Les suggestions ne constituent pas une réservation.");
  };

  const requestBooking = async () => {
    if (pending.current) return;
    const validation = validateTravelTrip(trip);
    if (validation || !quote) { setNotice(validation || "Devis invalide."); return; }
    const dateError = validateTravelDates(trip, Boolean(selectedHotel));
    if (dateError) { setNotice(dateError); return; }
    if (!bookingConfirmed) { setNotice("Confirmez explicitement le recapitulatif de la demande."); return; }
    if (!isDemoMode) { setNotice("Les offres presentes sont des exemples. Connecteur fournisseur reel requis avant toute demande ou paiement en production."); return; }
    if (userReservations.some((item) => item.trip?.departure === trip.departure && item.trip?.destination === trip.destination && item.selectedFlight?.id === selectedFlight?.id && item.selectedHotel?.id === selectedHotel?.id && !["cancelled", "cancellation_requested"].includes(item.status))) { setNotice("Une demande locale existe deja pour ce voyage. Consultez vos reservations."); return; }
    if (!selectedFlight && !selectedHotel) { setNotice("Sélectionnez au moins un vol ou un hôtel."); return; }
    if (!trip.destination.trim() || !trip.departure || !trip.consent) { setNotice("Complétez les informations de voyage et confirmez l'utilisation des données nécessaires."); return; }
    let backendReservationId = null;
    pending.current = true;
    setBusy(true);
    try {
      const backendResult = await createTravelReservationRequest({ trip, selectedFlight, selectedHotel, selectedInsurance, paymentMethod, humanConfirmed: true });
      if (!backendResult.ok || !backendResult.live || !backendResult.id) throw new Error("Aucune demande serveur confirmee.");
      backendReservationId = backendResult.live ? backendResult.id : null;
    } catch (error) {
      setNotice(`La demande n'a pas été envoyée au serveur : ${error?.message || "réessayez plus tard"}.`);
      return;
    } finally {
      pending.current = false;
      setBusy(false);
    }
    const item = upsertItem("travel_reservations", { owner: profile?.email, backendReservationId, trip, selectedFlight, selectedHotel, selectedInsurance, requestedPaymentMethod: paymentMethod, supplierTotal: total - serviceFee, serviceFee, total, currency: "USD", status: "awaiting_supplier_verification", paymentStatus: "not_paid", providerMessage: "Le prix et la disponibilité doivent être revérifiés par un fournisseur connecté avant paiement." });
    saveModuleActivity("travel", { action: "Demande de réservation", reference: item.data.id, status: "awaiting_supplier_verification", profile: { email: profile?.email, userType: profile?.userType } });
    setBookingConfirmed(false);
    setNotice("Demande exemple enregistree par le serveur. Aucun billet, hotel, assurance ou paiement confirme.");
  };

  const requestCancellation = async (item, confirmed = false) => {
    if (pending.current) return;
    if (!profile?.email || item.owner !== profile.email || item.status === "cancellation_requested") { setNotice("Demande inaccessible ou deja en annulation."); return; }
    if (!confirmed) { setCancelReview(item); return; }
    pending.current = true;
    setBusy(true);
    try {
    if (item.backendReservationId) {
      try {
        const response = await requestTravelReservationCancellation(item.backendReservationId);
        if (!response.ok || !response.live) throw new Error("Annulation non confirmee par le serveur.");
      } catch (error) {
        setNotice(`L'annulation n'a pas été envoyée au serveur : ${error?.message || "réessayez plus tard"}.`);
        return;
      }
    }
    const result = upsertItem("travel_reservations", { ...item, cancellationRequestedAt: new Date().toISOString(), status: "cancellation_requested", providerMessage: item.backendReservationId ? "Demande serveur en attente fournisseur, remboursement non confirme." : "Brouillon local d'annulation, non transmis." });
    saveModuleActivity("travel", { action: "Annulation demandée", reference: result.data.id, status: "cancellation_requested" });
    setNotice("Demande d'annulation enregistrée. Les frais de service restent distincts et sont soumis à la loi applicable.");
    setCancelReview(null);
    } finally { pending.current = false; setBusy(false); }
  };

  const sendSupport = () => {
    if (!support.trim()) { setNotice("Décrivez votre besoin afin de le transmettre à l'assistance."); return; }
    const result = upsertItem("travel_support_requests", { owner: profile?.email, message: support.trim(), status: "draft", createdAt: new Date().toISOString() });
    saveModuleActivity("travel", { action: "Assistance voyage", reference: result.data.id, status: "draft" }); setSupport(""); setNotice("Brouillon local d'assistance enregistre. Aucun message transmis.");
  };

  const Planner = () => <Panel title="Planifier votre voyage"><p className="mt-1 text-sm text-slate-600">L'assistant prépare des options ; il ne réserve jamais ni ne confirme un achat seul.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><input className="rounded border p-3" placeholder="Destination" value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} /><input className="rounded border p-3" type="number" min="1" placeholder="Nombre de jours" value={trip.days} onChange={(e) => setTrip({ ...trip, days: e.target.value })} /><input className="rounded border p-3" placeholder="Ville ou aéroport de départ" value={trip.origin} onChange={(e) => setTrip({ ...trip, origin: e.target.value })} /><input className="rounded border p-3" type="date" value={trip.departure} onChange={(e) => setTrip({ ...trip, departure: e.target.value })} /><input className="rounded border p-3" type="number" min="1" placeholder="Voyageurs" value={trip.travelers} onChange={(e) => setTrip({ ...trip, travelers: e.target.value })} /><input className="rounded border p-3" type="number" min="1" placeholder="Chambres" value={trip.rooms} onChange={(e) => setTrip({ ...trip, rooms: e.target.value })} /><input className="rounded border p-3" placeholder="Budget estimé USD" value={trip.budget} onChange={(e) => setTrip({ ...trip, budget: e.target.value })} /></div><label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={trip.consent} onChange={(e) => setTrip({ ...trip, consent: e.target.checked })} />J'autorise l'utilisation des seules données OMG nécessaires pour préparer cette demande.</label><button type="button" onClick={saveDraft} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Préparer l'itinéraire</button></Panel>;
  const OfferCards = ({ type, offers, selectedId, onSelect }) => <Panel title={type}><p className="mt-1 text-sm text-amber-800">Résultats de démonstration : à connecter et vérifier auprès de fournisseurs autorisés avant réservation.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{offers.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><strong className="text-slate-900">{item.airline || item.name}</strong><p className="mt-1 text-sm text-slate-600">{item.route || item.neighborhood || item.cover}</p><p className="mt-2 text-sm">{item.duration || item.room || item.exclusion}</p><p className="mt-3 font-black text-emerald-700">{item.supplierPrice || item.nightly || item.price} USD {item.nightly ? "/ nuit" : ""}</p>{item.taxes !== undefined && <p className="text-xs text-slate-500">Taxes estimées : {item.taxes} USD</p>}<button type="button" onClick={() => onSelect(item.id)} className={`mt-3 rounded px-4 py-2 font-bold ${selectedId === item.id ? "bg-emerald-700 text-white" : "border border-emerald-700 text-emerald-700"}`}>{selectedId === item.id ? "Sélectionné" : "Choisir"}</button></article>)}</div></Panel>;
  const BookingSummary = () => <Panel title="Récapitulatif et confirmation">
    <p className="mt-3 text-amber-800">Offres exemples uniquement. Les nuits sont calculees entre arrivee et depart hotel. Assurance exemple : tarif par voyageur ; taxes hotel : par chambre et sejour.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">{[["returnDate", "Retour voyage (facultatif)"], ["checkIn", "Arrivee hotel"], ["checkOut", "Depart hotel"]].map(([field, title]) => <label key={field}>{title}<input aria-label={title} type="date" value={trip[field]} onChange={(event) => setTrip({ ...trip, [field]: event.target.value })} className="mt-2 w-full rounded border p-3" /></label>)}</div>
    <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
      <p>Vol : {selectedFlight?.route || "Non selectionne"} · {trip.travelers} voyageur(s) · {quote?.flightAmount?.toFixed(2) || "0.00"} USD, taxes incluses</p>
      <p>Hotel : {selectedHotel?.name || "Non selectionne"} · {trip.rooms} chambre(s) × {travelHotelNights(trip) || "dates a preciser"} nuit(s) · {quote?.hotelAmount?.toFixed(2) || "0.00"} USD, taxes incluses</p>
      <p>Assurance exemple : {quote?.insuranceAmount?.toFixed(2) || "0.00"} USD</p>
      <p>Frais billets : {ticketServiceFee.toFixed(2)} USD (4,99 USD par billet)</p>
      <p>Frais chambres : {roomServiceFee.toFixed(2)} USD (4,99 USD par chambre et reservation, pas par nuit)</p>
      <p className="font-black">Total indicatif : {quote ? `${total.toFixed(2)} USD` : "Renseignez des quantites valides"}</p>
    </div>
    <label className="mt-4 block">Preference de paiement futur, non activee par ce formulaire<select className="mt-2 w-full rounded border p-3" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Payflow</option><option>MonCash</option><option>NatCash</option><option>Carte bancaire</option></select></label>
    <label className="mt-4 flex gap-2"><input type="checkbox" checked={bookingConfirmed} onChange={(e) => setBookingConfirmed(e.target.checked)} />Je confirme ce recapitulatif et demande seulement une verification, sans achat ni garantie de disponibilite.</label>
    <button type="button" disabled={busy || !quote || !bookingConfirmed} onClick={requestBooking} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Envoi…" : "Demander verification fournisseur"}</button>
    <Link to="/travel/bookings" className="mt-4 block font-bold text-omgGreen">Consulter mes demandes</Link>
  </Panel>;

  if (cancelReview) return <Panel title="Verifier la demande d'annulation"><p className="mt-3">Reservation {cancelReview.id} · {cancelReview.trip?.destination}</p><p>Aucun remboursement ni annulation fournisseur garanti. Un dossier sans reference serveur reste un brouillon local.</p><button disabled={busy} onClick={() => requestCancellation(cancelReview, true)} className="mt-4 rounded bg-red-700 p-3 text-white">Confirmer la demande</button><button disabled={busy} onClick={() => setCancelReview(null)} className="ml-3 rounded border p-3">Retour sans annuler</button>{notice && <p role="alert" className="mt-3">{notice}</p>}</Panel>;

  if (pageSection === "trips") return <div className="mt-5 space-y-4">{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}<Panel title="Mes itinéraires préparés">{itineraries.length ? itineraries.map((item) => <article key={item.id} className="mt-3 rounded-xl bg-slate-50 p-4"><h2 className="font-black">{item.destination}</h2><p>{item.days} jour(s) · départ {item.departure}</p><p className="text-sm">Brouillon — aucune réservation confirmée.</p></article>) : <p className="mt-3">Aucun itinéraire préparé.</p>}<Link to="/travel/home" className="mt-4 inline-block font-bold text-omgGreen">Préparer un voyage</Link></Panel><Link to="/travel/bookings" className="inline-block font-bold text-omgGreen">Voir mes demandes de réservation</Link></div>;
  if (pageSection === "home") return <div className="mt-5 space-y-4">{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}{Planner()}<nav aria-label="Étapes du voyage" className="flex flex-wrap gap-3"><Link to="/travel/flights" className="rounded border bg-white p-3 text-emerald-800">Choisir un vol</Link><Link to="/travel/hotels" className="rounded border bg-white p-3 text-emerald-800">Choisir un hôtel</Link><Link to="/travel/insurance" className="rounded border bg-white p-3 text-emerald-800">Comparer les assurances</Link><Link to="/travel/payment" className="rounded bg-omgGreen p-3 text-white">Récapitulatif</Link></nav></div>;
  if (pageSection === "assistant") return <div className="mt-5 space-y-4">{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}<Panel title="Préparer mon itinéraire"><p className="mt-3">Indiquez votre destination, la durée et votre budget. Le formulaire prépare un brouillon ; la génération de recommandations par une IA reste à connecter.</p></Panel>{Planner()}<Link to="/travel/trips" className="font-bold text-omgGreen">Voir mes itinéraires</Link></div>;
  if (pageSection === "payment") return <div className="mt-5 space-y-4">{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}{BookingSummary()}<Link to="/travel/home" className="font-bold text-omgGreen">Modifier mon voyage</Link></div>;
  return <div className="mt-5 space-y-5 text-slate-800">{mode === "planner" && <>{Planner()}<Link to="/travel/payment" className="inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Voir le récapitulatif</Link></>}{mode === "trips" && <Panel title="Mes voyages"><p className="mt-3 text-slate-600">Les itinéraires sont personnels et restent des suggestions jusqu'à confirmation des services sélectionnés.</p><div className="mt-4 space-y-3">{!userReservations.length ? <p>Aucun voyage préparé.</p> : userReservations.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.trip?.destination}</strong><p>{item.trip?.days} jour(s) · départ {item.trip?.departure}</p></article>)}</div></Panel>}{mode === "flights" && <>{Planner()}<OfferCards type="Comparer les vols" offers={flightOffers} selectedId={selected.flightId} onSelect={(flightId) => setSelected({ ...selected, flightId })} /><Link to="/travel/payment" className="inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Voir le récapitulatif</Link></>}{mode === "hotels" && <>{Planner()}<OfferCards type="Comparer les hôtels" offers={hotelOffers} selectedId={selected.hotelId} onSelect={(hotelId) => setSelected({ ...selected, hotelId })} /><Link to="/travel/payment" className="inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Voir le récapitulatif</Link></>}{mode === "insurance" && <><OfferCards type="Assurance voyage" offers={insuranceOffers} selectedId={selected.insuranceId} onSelect={(insuranceId) => setSelected({ ...selected, insuranceId })} /><Link to="/travel/payment" className="inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Voir le récapitulatif</Link></>}{mode === "bookings" && <Panel title="Mes réservations"><div className="mt-4 space-y-3">{!userReservations.length && <p>Aucune réservation personnelle pour le moment.</p>}{userReservations.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.trip?.destination || "Voyage"}</strong><p className="text-sm">Référence : {item.id} · Statut : {item.status}</p><p className="mt-1 text-sm">{item.providerMessage}</p>{["awaiting_supplier_verification", "supplier_confirmed"].includes(item.status) && <button type="button" onClick={() => requestCancellation(item)} className="mt-3 rounded border border-red-300 px-3 py-2 font-bold text-red-700">Demander annulation</button>}</article>)}</div></Panel>}{mode === "documents" && <Panel title="Documents de voyage"><p className="mt-2 text-sm text-slate-600">Les documents apparaissent uniquement après confirmation du fournisseur. Ne téléversez un passeport que lorsqu'un fournisseur autorisé le demande.</p><div className="mt-4 space-y-2">{userReservations.filter((item) => item.status === "supplier_confirmed").map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3">Confirmation disponible — {item.id}</div>)}{!userReservations.some((item) => item.status === "supplier_confirmed") && <p>Aucun document émis.</p>}</div></Panel>}{mode === "support" && <Panel title="Assistance Travel"><p className="mt-2 text-sm text-slate-600">L'assistant peut expliquer votre dossier et transmet les cas sensibles à un humain ; il ne promet ni remboursement ni modification sans fournisseur.</p><textarea className="mt-4 min-h-28 w-full rounded border p-3" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="Décrivez votre demande : bagage, modification, annulation, document..." /><button type="button" onClick={sendSupport} className="mt-3 rounded bg-omgGreen px-5 py-3 font-bold text-white">Contacter l'assistance</button></Panel>}{mode === "partner" && <Panel title="Espace partenaire"><p className="mt-3 text-slate-700">Les partenaires gèrent leurs offres et disponibilités via une connexion fournisseur vérifiée. Aucune disponibilité de démonstration ne peut être publiée comme réelle.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Offres</strong><p>À connecter</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Disponibilités</strong><p>À vérifier</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Support</strong><p>{tickets.length} demande(s)</p></div></div></Panel>}{mode === "admin" && <Panel title="Administration Travel"><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Réservations</strong><p className="text-2xl font-black">{reservations.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>En attente fournisseur</strong><p className="text-2xl font-black">{reservations.filter((item) => item.status === "awaiting_supplier_verification").length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Assistance</strong><p className="text-2xl font-black">{tickets.length}</p></div></div><p className="mt-4 text-sm text-slate-600">Tarification, fournisseurs et confirmations effectives doivent être appliqués et audités par le backend.</p></Panel>}{notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}</div>}<button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button></div>;
}
