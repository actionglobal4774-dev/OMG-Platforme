import React, { useMemo, useRef, useState } from "react";
import { isDemoMode } from "../../services/runtimePolicy";
import { canReadSchoolReport, ownsSchool, validateSchoolBooks } from "./schoolJourney";
import { duplicateSchoolClass, validateSchoolFeePeriod, validateSchoolReportContext } from "./schoolFormValidation";
import {
  generateReceipt,
  getCollection,
  prepareModulePayment,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";
import { createMonCashPayment, createStripeCheckoutSession } from "../../services/backendService";

const starterFees = [
  { id: "SCH-F-1001", school: "OMG Global Academy", label: "Frais de scolarite", level: "Secondaire", amount: 450, currency: "USD" },
  { id: "SCH-F-1002", school: "OMG Global Academy", label: "Transport scolaire", level: "Tous niveaux", amount: 80, currency: "USD" }
];

const starterBooks = [
  { id: "SCH-B-1001", title: "Mathematiques essentielles", level: "Secondaire", price: 24, stock: 20 },
  { id: "SCH-B-1002", title: "Sciences du monde", level: "Fondamental", price: 18, stock: 15 },
  { id: "SCH-B-1003", title: "English Learning", level: "Tous niveaux", price: 16, stock: 28 }
];

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("payer frais") || value.includes("pay fees")) return "fees";
  if (value.includes("acheter livres") || value.includes("buy books")) return "books";
  if (value.includes("rapport") || value.includes("report")) return value.includes("publier") || value.includes("publish") ? "publish-report" : "reports";
  if (value.includes("message")) return "messages";
  if (value.includes("creer ecole") || value.includes("create school")) return "school";
  if (value.includes("creer classes") || value.includes("create class")) return "classes";
  if (value.includes("fixer frais") || value.includes("set fees")) return "set-fees";
  if (value.includes("vendre livres") || value.includes("sell books")) return "sell-books";
  return "fees";
}

function SchoolWorkspace({ selectedAction, profile, closeModuleAction, initialReference = "" }) {
  const mode = getMode(selectedAction);
  const [beneficiary, setBeneficiary] = useState({ name: "", studentId: initialReference, relationship: "Parent" });
  const [feePayment, setFeePayment] = useState({ feeId: "", method: "Payflow", pin: "", confirmed: false });
  const [bookCart, setBookCart] = useState([]);
  const [school, setSchool] = useState({ name: "", country: "", city: "", address: "", payout: "Payflow" });
  const [schoolClass, setSchoolClass] = useState({ schoolId: "", name: "", level: "", capacity: "" });
  const [fee, setFee] = useState({ schoolId: "", label: "", level: "", amount: "", currency: "USD" });
  const [book, setBook] = useState({ schoolId: "", title: "", level: "", price: "", stock: "" });
  const [report, setReport] = useState({ studentId: "", studentName: "", guardianEmail: "", period: "", summary: "", accessCode: "" });
  const [message, setMessage] = useState({ recipient: "", subject: "", body: "" });
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const pending = useRef(false);
  const [review, setReview] = useState(null);
  const [reportCodes, setReportCodes] = useState({});

  const schools = getCollection("school_establishments");
  const classes = getCollection("school_classes");
  const configuredFees = getCollection("school_fees");
  const fees = configuredFees.length ? configuredFees : isDemoMode ? starterFees : [];
  const configuredBooks = getCollection("school_books");
  const books = configuredBooks.length ? configuredBooks : isDemoMode ? starterBooks : [];
  const reports = getCollection("school_reports");
  const messages = getCollection("school_messages");
  const payments = getCollection("payments").filter((item) => normalize(item.label).includes("school"));
  const cartTotal = useMemo(() => bookCart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [bookCart]);

  const complete = (action, nextReference, text) => {
    saveModuleActivity("school", {
      action,
      reference: nextReference,
      status: "prepared",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(`${text} Enregistrement local : validation serveur non garantie.`);
  };

  const executeFeePayment = async () => {
    const selected = fees.find((item) => item.id === feePayment.feeId);
    if (!selected || !beneficiary.name.trim() || !beneficiary.studentId.trim()) {
      setNotice("Beneficiaire, identifiant eleve et frais sont obligatoires.");
      return;
    }
    if (!feePayment.confirmed) {
      setNotice("Confirmez le beneficiaire, les frais et le montant.");
      return;
    }
    if (feePayment.method === "Carte bancaire") {
      setIsPaying(true);
      setNotice("Ouverture du paiement securise Stripe...");
      try {
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const session = await createStripeCheckoutSession({
          amount: selected.amount,
          currency: selected.currency,
          moduleId: "school",
          action: `${selected.school} - ${selected.label}`,
          successUrl: `${baseUrl}#/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}#/stripe-cancel`
        });
        if (!session.redirectUrl) throw new Error("Stripe n'a pas fourni de page de paiement securisee.");
        sessionStorage.setItem("omgStripePending", JSON.stringify({ sessionId: session.sessionId, moduleId: "school", feeId: selected.id }));
        window.location.assign(session.redirectUrl);
        return;
      } catch (error) {
        setNotice(error?.message || "Le paiement Stripe n'a pas pu etre ouvert.");
        setIsPaying(false);
        return;
      }
    }
    if (feePayment.method === "MonCash") {
      if (String(selected.currency).toUpperCase() !== "HTG") {
        setNotice("MonCash accepte ici les frais publies en gourdes haitiennes (HTG). Choisissez ou publiez des frais en HTG.");
        return;
      }
      setIsPaying(true);
      setNotice("Ouverture du paiement securise MonCash...");
      try {
        const payment = await createMonCashPayment({
          amount: selected.amount,
          moduleId: "school",
          action: `${selected.school} - ${selected.label}`
        });
        if (!payment.redirectUrl) throw new Error("MonCash n'a pas fourni de page de paiement.");
        sessionStorage.setItem("omgMonCashPending", JSON.stringify({
          orderId: payment.orderId,
          moduleId: "school",
          action: selected.label
        }));
        window.location.assign(payment.redirectUrl);
        return;
      } catch (error) {
        setNotice(error?.message || "Le paiement MonCash n'a pas pu etre ouvert.");
        setIsPaying(false);
        return;
      }
    }
    if (feePayment.method === "NatCash") {
      setNotice("NatCash sera active apres reception des identifiants API marchands officiels de Natcom. Aucun paiement n'a ete lance.");
      return;
    }
    const paid = await prepareModulePayment({ moduleId: "school", action: "Payer frais", amount: selected.amount, currency: selected.currency, label: "School Fee", method: feePayment.method, feeId: selected.id });
    if (!paid.ok) throw new Error(paid.error || "Preparation impossible.");
    const enrollmentPayment = upsertItem("school_payments", {
      paymentId: paid.data.id,
      feeId: selected.id,
      beneficiary,
      school: selected.school,
      guardian: profile?.email,
      status: paid.live ? "prepared" : "simulated"
    });
    if (!paid.live) generateReceipt(paid.data);
    setReview(null);
    setFeePayment((current) => ({ ...current, pin: "", confirmed: false }));
    complete("Paiement frais scolaires", enrollmentPayment.data.id, paid.live ? "Paiement prepare, aucun reglement scolaire confirme." : "Demonstration uniquement : aucun paiement reel.");
  };

  const payFee = async (confirmed = false) => {
    if (pending.current) return;
    const selected = fees.find((item) => item.id === feePayment.feeId);
    if (!selected || !Number.isFinite(Number(selected.amount)) || Number(selected.amount) <= 0 || !beneficiary.name.trim() || !beneficiary.studentId.trim() || !feePayment.confirmed) { setNotice("Beneficiaire, frais valides et confirmation obligatoires."); return; }
    if (["NatCash", "Banque"].includes(feePayment.method)) { setNotice("Ce moyen n'est pas encore connecte pour School. Aucun paiement lance."); return; }
    if (!configuredFees.length && feePayment.method !== "Payflow") { setNotice("Les frais exemples ne peuvent pas etre payes chez un prestataire reel."); return; }
    if (getCollection("school_payments").some((item) => item.feeId === selected.id && item.beneficiary?.studentId === beneficiary.studentId && item.guardian === profile?.email && ["prepared", "simulated", "paid"].includes(item.status))) { setNotice("Une operation existe deja pour cet eleve et ces frais. Verifiez son statut."); return; }
    if (!confirmed) { setNotice(""); setReview({ kind: "fees", amount: selected.amount, currency: selected.currency, label: selected.label }); return; }
    pending.current = true;
    setIsPaying(true);
    try { await executeFeePayment(); } catch (error) { setNotice(error?.message || "Preparation impossible."); }
    finally { pending.current = false; setIsPaying(false); }
  };

  const addBook = (item) => {
    if ((bookCart.find((entry) => entry.id === item.id)?.quantity || 0) >= item.stock) { setNotice("Stock maximum atteint."); return; }
    setBookCart((current) => {
      const found = current.find((entry) => entry.id === item.id);
      return found ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...current, { ...item, quantity: 1 }];
    });
    setNotice(`${item.title} ajoute.`);
  };

  const buyBooks = async (confirmed = false) => {
    if (pending.current) return;
    const validation = validateSchoolBooks(bookCart, books);
    if (validation) { setNotice(validation); return; }
    if (!bookCart.length || !beneficiary.name.trim() || !beneficiary.studentId.trim()) {
      setNotice("Ajoutez un livre et renseignez le beneficiaire.");
      return;
    }
    if (!feePayment.confirmed) {
      setNotice("Confirmez le beneficiaire et le panier.");
      return;
    }
    if (!confirmed) { setNotice(""); setReview({ kind: "books", amount: cartTotal, currency: "USD", label: "Livres scolaires" }); return; }
    pending.current = true;
    setIsPaying(true);
    try {
    const paid = await prepareModulePayment({ moduleId: "school", action: "Acheter livres", amount: cartTotal, currency: "USD", label: "School Books", method: "Payflow" });
    if (!paid.ok) throw new Error(paid.error || "Preparation impossible.");
    const order = upsertItem("school_book_orders", { items: bookCart, total: cartTotal, beneficiary, guardian: profile?.email, paymentId: paid.data.id, status: paid.live ? "prepared" : "simulated" });
    if (!paid.live) generateReceipt(paid.data);
    setBookCart([]);
    setReview(null);
    setFeePayment((current) => ({ ...current, pin: "", confirmed: false }));
    complete("Achat livres scolaires", order.data.id, paid.live ? "Demande de paiement preparee. Commande et livraison non confirmees." : "Achat de demonstration uniquement.");
    } catch (error) { setNotice(error?.message || "Preparation impossible."); }
    finally { pending.current = false; setIsPaying(false); }
  };

  const createSchool = () => {
    if (!school.name.trim() || !school.country.trim() || !school.city.trim() || !school.address.trim()) {
      setNotice("Nom, pays, ville et adresse sont obligatoires.");
      return;
    }
    const result = upsertItem("school_establishments", { ...school, owner: profile?.email, status: "active" });
    complete("Creer ecole", result.data.id, "Etablissement scolaire enregistre.");
  };

  const createClass = () => {
    if (duplicateSchoolClass(classes, schoolClass)) { setNotice("Cette classe et ce niveau existent deja dans cette ecole."); return; }
    if (!ownsSchool(schools, schoolClass.schoolId, profile?.email)) { setNotice("Choisissez votre propre ecole."); return; }
    const capacity = Number(schoolClass.capacity);
    if (!schoolClass.schoolId || !schoolClass.name.trim() || !schoolClass.level.trim() || !Number.isInteger(capacity) || capacity < 1) {
      setNotice("Ecole, classe, niveau et capacite valide sont obligatoires.");
      return;
    }
    const result = upsertItem("school_classes", { ...schoolClass, capacity, owner: profile?.email });
    complete("Creer classe", result.data.id, "Classe enregistree.");
  };

  const publishFee = () => {
    const periodError = validateSchoolFeePeriod(fee);
    if (periodError) { setNotice(periodError); return; }
    if (!ownsSchool(schools, fee.schoolId, profile?.email)) { setNotice("Choisissez votre propre ecole."); return; }
    const amount = Number(fee.amount);
    if (!fee.schoolId || !fee.label.trim() || !fee.level.trim() || !Number.isFinite(amount) || amount <= 0) {
      setNotice("Ecole, libelle, niveau et montant valide sont obligatoires.");
      return;
    }
    const schoolName = schools.find((item) => item.id === fee.schoolId)?.name || "Ecole";
    const result = upsertItem("school_fees", { ...fee, amount, school: schoolName, owner: profile?.email });
    complete("Fixer frais", result.data.id, "Frais scolaires publies.");
  };

  const sellBook = () => {
    if (!ownsSchool(schools, book.schoolId, profile?.email)) { setNotice("Choisissez votre propre ecole."); return; }
    const price = Number(book.price);
    const stock = Number(book.stock);
    if (!book.schoolId || !book.title.trim() || !book.level.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      setNotice("Ecole, titre, niveau, prix et stock valides sont obligatoires.");
      return;
    }
    const result = upsertItem("school_books", { ...book, price, stock, owner: profile?.email });
    complete("Vendre livre", result.data.id, "Livre publie dans le catalogue.");
  };

  const publishReport = () => {
    const contextError = validateSchoolReportContext(report, schools, classes, profile?.email);
    if (contextError) { setNotice(contextError); return; }
    if (reports.some((item) => item.schoolId === report.schoolId && item.classId === report.classId && item.studentId === report.studentId && item.schoolYear === report.schoolYear && item.period === report.period)) { setNotice("Un brouillon existe deja pour cet eleve et cette periode."); return; }
    if (!report.studentId.trim() || !report.studentName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.guardianEmail) || !report.period.trim() || !report.summary.trim() || !/^\d{6}$/.test(report.accessCode)) {
      setNotice("Eleve, email responsable, periode, resume et code a 6 chiffres sont obligatoires.");
      return;
    }
    const result = upsertItem("school_reports", { ...report, schoolOwner: profile?.email, status: "draft" });
    complete("Publier rapport protege", result.data.id, "Brouillon local uniquement ; protection et diffusion serveur non certifiees.");
  };

  const sendMessage = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.recipient) || !message.subject.trim() || !message.body.trim()) {
      setNotice("Destinataire, sujet et message sont obligatoires.");
      return;
    }
    const result = upsertItem("school_messages", { ...message, sender: profile?.email, status: "draft" });
    complete("Message ecole", result.data.id, "Brouillon enregistre. Aucun message transmis au destinataire.");
  };

  const visibleReports = reports.filter((item) => normalize(item.guardianEmail) === normalize(profile?.email));
  const Section = ({ title, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">{title}</h3>{children}</section>;
  const BeneficiaryFields = () => (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <input placeholder="Nom de l'eleve" className="rounded border p-3" value={beneficiary.name} onChange={(e) => setBeneficiary({ ...beneficiary, name: e.target.value })} />
      <input placeholder="Identifiant eleve" className="rounded border p-3" value={beneficiary.studentId} onChange={(e) => setBeneficiary({ ...beneficiary, studentId: e.target.value })} />
      <select className="rounded border p-3" value={beneficiary.relationship} onChange={(e) => setBeneficiary({ ...beneficiary, relationship: e.target.value })}><option>Parent</option><option>Responsable legal</option><option>Tuteur</option></select>
    </div>
  );

  if (review) return <section className="mt-5 space-y-4 rounded-2xl border bg-white p-5"><h3 className="text-xl font-bold">Verifier la demande</h3><p>{beneficiary.name} · Eleve {beneficiary.studentId}</p><p>{review.label} · {Number(review.amount).toFixed(2)} {review.currency}</p><p>{review.kind === "books" ? "Payflow" : feePayment.method} — preparation ou ouverture du prestataire, pas confirmation du reglement scolaire.</p><button disabled={isPaying} onClick={() => review.kind === "books" ? buyBooks(true) : payFee(true)} className="rounded bg-omgGreen p-3 text-white">{isPaying ? "Traitement…" : "Confirmer"}</button><button disabled={isPaying} onClick={() => setReview(null)} className="ml-3 rounded border p-3">Modifier / annuler</button>{notice && <p role="alert">{notice}</p>}</section>;

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Donnees locales ou exemples. N'entrez pas de dossiers reels d'eleves : confidentialite et autorisations serveur restent a certifier.</p>
      {mode === "fees" && (
        <Section title="Paiement des frais">
          <BeneficiaryFields />
          <select className="mt-3 w-full rounded border p-3" value={feePayment.feeId} onChange={(e) => setFeePayment({ ...feePayment, feeId: e.target.value })}><option value="">Choisir les frais</option>{fees.map((item) => <option key={item.id} value={item.id}>{item.school} · {item.label} · {item.amount} {item.currency}</option>)}</select>
          <select className="mt-3 w-full rounded border p-3" value={feePayment.method} onChange={(e) => setFeePayment({ ...feePayment, method: e.target.value })}><option>Payflow</option><option>Carte bancaire</option><option>MonCash</option><option>NatCash</option><option>Banque</option></select>
          <p className="mt-3 text-sm">Aucun PIN requis pour preparer une demande.</p>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={feePayment.confirmed} onChange={(e) => setFeePayment({ ...feePayment, confirmed: e.target.checked })} /> Je confirme l'eleve, les frais et le montant.</label>
          <button type="button" onClick={() => payFee()} disabled={isPaying} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{isPaying ? "Traitement..." : "Verifier le paiement des frais"}</button>
        </Section>
      )}

      {mode === "books" && (
        <>
          <Section title="Livres scolaires">
            <BeneficiaryFields />
            <div className="mt-4 grid gap-3 md:grid-cols-3">{books.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.title}</strong><p>{item.level} · Stock {item.stock}</p><p className="mt-2 text-xl font-black text-omgGreen">{item.price} USD</p><button type="button" disabled={item.stock <= 0} onClick={() => addBook(item)} className="mt-2 rounded bg-omgGreen px-3 py-2 font-bold text-white disabled:opacity-50">Ajouter</button></article>)}</div>
            <p className="mt-4 font-bold">Panier : {bookCart.length} livre(s) · {cartTotal.toFixed(2)} USD</p>
            {bookCart.map((item) => <div key={item.id} className="mt-2 flex gap-3"><span>{item.title} × {item.quantity}</span><button onClick={() => setBookCart((current) => current.filter((entry) => entry.id !== item.id))} className="underline">Retirer</button></div>)}
            <label className="mt-3 flex gap-2"><input type="checkbox" checked={feePayment.confirmed} onChange={(e) => setFeePayment({ ...feePayment, confirmed: e.target.checked })} /> Je confirme le panier et le beneficiaire.</label>
            <button type="button" onClick={() => buyBooks()} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Verifier le panier</button>
          </Section>
        </>
      )}

      {mode === "reports" && (
        <Section title="Rapports proteges">
          <p className="mt-3 text-sm">Verrou local de demonstration uniquement, pas une protection serveur.</p><div className="mt-4 space-y-3">{!visibleReports.length && <p className="text-slate-600">Aucun rapport autorise pour ce compte.</p>}{visibleReports.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.period}</strong><input aria-label="Code du rapport" type="password" inputMode="numeric" maxLength={6} className="mt-3 block rounded border p-3" value={reportCodes[item.id] || ""} onChange={(event) => setReportCodes((current) => ({ ...current, [item.id]: event.target.value.replace(/\D/g, "") }))} />{canReadSchoolReport(item, profile?.email, reportCodes[item.id]) ? <p>{item.studentName} · {item.summary}</p> : <p>Saisissez le code a 6 chiffres pour afficher le brouillon local.</p>}</article>)}</div>
        </Section>
      )}

      {mode === "messages" && (
        <Section title="Messagerie scolaire">
          <input placeholder="Email destinataire" className="mt-4 w-full rounded border p-3" value={message.recipient} onChange={(e) => setMessage({ ...message, recipient: e.target.value })} />
          <input placeholder="Sujet" className="mt-3 w-full rounded border p-3" value={message.subject} onChange={(e) => setMessage({ ...message, subject: e.target.value })} />
          <textarea placeholder="Message" className="mt-3 min-h-28 w-full rounded border p-3" value={message.body} onChange={(e) => setMessage({ ...message, body: e.target.value })} />
          <button type="button" onClick={sendMessage} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Envoyer</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{messages.length} message(s) enregistre(s).</p>
        </Section>
      )}

      {mode === "school" && (
        <Section title="Creer une ecole">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Nom de l'ecole" className="rounded border p-3" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} /><input placeholder="Pays" className="rounded border p-3" value={school.country} onChange={(e) => setSchool({ ...school, country: e.target.value })} /><input placeholder="Ville" className="rounded border p-3" value={school.city} onChange={(e) => setSchool({ ...school, city: e.target.value })} /><input placeholder="Adresse" className="rounded border p-3" value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} /><select className="rounded border p-3" value={school.payout} onChange={(e) => setSchool({ ...school, payout: e.target.value })}><option>Payflow</option><option>Compte bancaire</option></select></div>
          <button type="button" onClick={createSchool} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer l'ecole</button>
        </Section>
      )}

      {mode === "classes" && (
        <Section title="Creer une classe">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded border p-3" value={schoolClass.schoolId} onChange={(e) => setSchoolClass({ ...schoolClass, schoolId: e.target.value })}><option value="">Choisir une ecole</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Nom de la classe" className="rounded border p-3" value={schoolClass.name} onChange={(e) => setSchoolClass({ ...schoolClass, name: e.target.value })} /><input placeholder="Niveau" className="rounded border p-3" value={schoolClass.level} onChange={(e) => setSchoolClass({ ...schoolClass, level: e.target.value })} /><input aria-label="Capacite" type="number" min="1" className="rounded border p-3" value={schoolClass.capacity} onChange={(e) => setSchoolClass({ ...schoolClass, capacity: e.target.value })} /></div>
          <button type="button" onClick={createClass} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Creer la classe</button>
        </Section>
      )}

      {mode === "set-fees" && (
        <Section title="Fixer les frais">
          <div className="mt-3 grid gap-3 md:grid-cols-3"><input aria-label="Annee scolaire facturee" placeholder="Annee scolaire, ex. 2026-2027" className="rounded border p-3" value={fee.schoolYear || ""} onChange={(event) => setFee({ ...fee, schoolYear: event.target.value })} /><input aria-label="Periode facturee" placeholder="Periode, ex. trimestre 1" className="rounded border p-3" value={fee.period || ""} onChange={(event) => setFee({ ...fee, period: event.target.value })} /><select aria-label="Devise des frais" className="rounded border p-3" value={fee.currency} onChange={(event) => setFee({ ...fee, currency: event.target.value })}><option>USD</option><option>HTG</option><option>EUR</option></select></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded border p-3" value={fee.schoolId} onChange={(e) => setFee({ ...fee, schoolId: e.target.value })}><option value="">Choisir une ecole</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Libelle" className="rounded border p-3" value={fee.label} onChange={(e) => setFee({ ...fee, label: e.target.value })} /><input placeholder="Niveau" className="rounded border p-3" value={fee.level} onChange={(e) => setFee({ ...fee, level: e.target.value })} /><input aria-label="Montant" type="number" min="0" className="rounded border p-3" value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} /></div>
          <button type="button" onClick={publishFee} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier les frais</button>
        </Section>
      )}

      {mode === "sell-books" && (
        <Section title="Publier un livre">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded border p-3" value={book.schoolId} onChange={(e) => setBook({ ...book, schoolId: e.target.value })}><option value="">Choisir une ecole</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Titre du livre" className="rounded border p-3" value={book.title} onChange={(e) => setBook({ ...book, title: e.target.value })} /><input placeholder="Niveau" className="rounded border p-3" value={book.level} onChange={(e) => setBook({ ...book, level: e.target.value })} /><input aria-label="Prix" type="number" min="0" className="rounded border p-3" value={book.price} onChange={(e) => setBook({ ...book, price: e.target.value })} /><input aria-label="Stock" type="number" min="0" className="rounded border p-3" value={book.stock} onChange={(e) => setBook({ ...book, stock: e.target.value })} /></div>
          <button type="button" onClick={sellBook} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier le livre</button>
        </Section>
      )}

      {mode === "publish-report" && (
        <Section title="Publier un rapport protege">
          <div className="mt-3 grid gap-3 md:grid-cols-3"><select aria-label="Ecole du rapport" className="rounded border p-3" value={report.schoolId || ""} onChange={(event) => setReport({ ...report, schoolId: event.target.value, classId: "" })}><option value="">Choisir mon ecole</option>{schools.filter((item) => ownsSchool(schools, item.id, profile?.email)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Classe du rapport" className="rounded border p-3" value={report.classId || ""} onChange={(event) => setReport({ ...report, classId: event.target.value })}><option value="">Choisir la classe</option>{classes.filter((item) => item.schoolId === report.schoolId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Annee scolaire du rapport" placeholder="Annee scolaire" className="rounded border p-3" value={report.schoolYear || ""} onChange={(event) => setReport({ ...report, schoolYear: event.target.value })} /></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Identifiant eleve" className="rounded border p-3" value={report.studentId} onChange={(e) => setReport({ ...report, studentId: e.target.value })} /><input placeholder="Nom de l'eleve" className="rounded border p-3" value={report.studentName} onChange={(e) => setReport({ ...report, studentName: e.target.value })} /><input placeholder="Email du responsable autorise" className="rounded border p-3" value={report.guardianEmail} onChange={(e) => setReport({ ...report, guardianEmail: e.target.value })} /><input placeholder="Periode" className="rounded border p-3" value={report.period} onChange={(e) => setReport({ ...report, period: e.target.value })} /><textarea placeholder="Resume du rapport" className="rounded border p-3 md:col-span-2" value={report.summary} onChange={(e) => setReport({ ...report, summary: e.target.value })} /><input placeholder="Code d'acces a 6 chiffres" maxLength="6" className="rounded border p-3" value={report.accessCode} onChange={(e) => setReport({ ...report, accessCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></div>
          <button type="button" onClick={publishReport} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier le rapport</button>
        </Section>
      )}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}</div>}</div>}
      {!!payments.length && <p className="text-sm font-bold text-slate-600">{payments.length} operation(s) locales School, non preuves de paiement reel.</p>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default SchoolWorkspace;
