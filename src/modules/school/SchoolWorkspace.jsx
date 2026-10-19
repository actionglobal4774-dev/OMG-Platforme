import React, { useMemo, useState } from "react";
import {
  generateReceipt,
  getCollection,
  simulatePayment,
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

function SchoolWorkspace({ selectedAction, profile, closeModuleAction }) {
  const mode = getMode(selectedAction);
  const [beneficiary, setBeneficiary] = useState({ name: "", studentId: "", relationship: "Parent" });
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

  const schools = getCollection("school_establishments");
  const configuredFees = getCollection("school_fees");
  const fees = configuredFees.length ? configuredFees : starterFees;
  const configuredBooks = getCollection("school_books");
  const books = configuredBooks.length ? configuredBooks : starterBooks;
  const reports = getCollection("school_reports");
  const messages = getCollection("school_messages");
  const payments = getCollection("payments").filter((item) => normalize(item.label).includes("school"));
  const cartTotal = useMemo(() => bookCart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [bookCart]);

  const complete = (action, nextReference, text) => {
    saveModuleActivity("school", {
      action,
      reference: nextReference,
      status: "confirmed",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(text);
  };

  const payFee = async () => {
    const selected = fees.find((item) => item.id === feePayment.feeId);
    if (!selected || !beneficiary.name.trim() || !beneficiary.studentId.trim()) {
      setNotice("Beneficiaire, identifiant eleve et frais sont obligatoires.");
      return;
    }
    if (feePayment.method === "Payflow" && !/^\d{4}$/.test(feePayment.pin)) {
      setNotice("Entrez un PIN Payflow a 4 chiffres.");
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
    const paid = simulatePayment({ amount: selected.amount, currency: selected.currency, label: "School Fee", method: feePayment.method });
    const enrollmentPayment = upsertItem("school_payments", {
      paymentId: paid.data.id,
      feeId: selected.id,
      beneficiary,
      school: selected.school,
      guardian: profile?.email,
      status: "paid"
    });
    generateReceipt(paid.data);
    complete("Paiement frais scolaires", enrollmentPayment.data.id, "Frais payes et recu genere.");
  };

  const addBook = (item) => {
    setBookCart((current) => {
      const found = current.find((entry) => entry.id === item.id);
      return found ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...current, { ...item, quantity: 1 }];
    });
    setNotice(`${item.title} ajoute.`);
  };

  const buyBooks = () => {
    if (!bookCart.length || !beneficiary.name.trim() || !beneficiary.studentId.trim()) {
      setNotice("Ajoutez un livre et renseignez le beneficiaire.");
      return;
    }
    if (!/^\d{4}$/.test(feePayment.pin) || !feePayment.confirmed) {
      setNotice("PIN Payflow a 4 chiffres et confirmation obligatoires.");
      return;
    }
    const paid = simulatePayment({ amount: cartTotal, currency: "USD", label: "School Books", method: "Payflow" });
    const order = upsertItem("school_book_orders", { items: bookCart, total: cartTotal, beneficiary, guardian: profile?.email, paymentId: paid.data.id, status: "paid" });
    generateReceipt(paid.data);
    setBookCart([]);
    complete("Achat livres scolaires", order.data.id, "Livres payes. Commande en preparation.");
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
    const capacity = Number(schoolClass.capacity);
    if (!schoolClass.schoolId || !schoolClass.name.trim() || !schoolClass.level.trim() || !Number.isInteger(capacity) || capacity < 1) {
      setNotice("Ecole, classe, niveau et capacite valide sont obligatoires.");
      return;
    }
    const result = upsertItem("school_classes", { ...schoolClass, capacity, owner: profile?.email });
    complete("Creer classe", result.data.id, "Classe enregistree.");
  };

  const publishFee = () => {
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
    if (!report.studentId.trim() || !report.studentName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.guardianEmail) || !report.period.trim() || !report.summary.trim() || !/^\d{6}$/.test(report.accessCode)) {
      setNotice("Eleve, email responsable, periode, resume et code a 6 chiffres sont obligatoires.");
      return;
    }
    const result = upsertItem("school_reports", { ...report, schoolOwner: profile?.email, protected: true, status: "published" });
    complete("Publier rapport protege", result.data.id, "Rapport publie pour le responsable autorise.");
  };

  const sendMessage = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.recipient) || !message.subject.trim() || !message.body.trim()) {
      setNotice("Destinataire, sujet et message sont obligatoires.");
      return;
    }
    const result = upsertItem("school_messages", { ...message, sender: profile?.email, status: "sent" });
    complete("Message ecole", result.data.id, "Message envoye.");
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

  return (
    <div className="mt-5 space-y-5">
      {mode === "fees" && (
        <Section title="Paiement des frais">
          <BeneficiaryFields />
          <select className="mt-3 w-full rounded border p-3" value={feePayment.feeId} onChange={(e) => setFeePayment({ ...feePayment, feeId: e.target.value })}><option value="">Choisir les frais</option>{fees.map((item) => <option key={item.id} value={item.id}>{item.school} · {item.label} · {item.amount} {item.currency}</option>)}</select>
          <select className="mt-3 w-full rounded border p-3" value={feePayment.method} onChange={(e) => setFeePayment({ ...feePayment, method: e.target.value })}><option>Payflow</option><option>Carte bancaire</option><option>MonCash</option><option>NatCash</option><option>Banque</option></select>
          {feePayment.method === "Payflow" && <input placeholder="PIN Payflow" maxLength="4" className="mt-3 w-full rounded border p-3" value={feePayment.pin} onChange={(e) => setFeePayment({ ...feePayment, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />}
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={feePayment.confirmed} onChange={(e) => setFeePayment({ ...feePayment, confirmed: e.target.checked })} /> Je confirme l'eleve, les frais et le montant.</label>
          <button type="button" onClick={payFee} disabled={isPaying} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">{isPaying ? "Ouverture de Stripe..." : "Payer les frais"}</button>
        </Section>
      )}

      {mode === "books" && (
        <>
          <Section title="Livres scolaires">
            <BeneficiaryFields />
            <div className="mt-4 grid gap-3 md:grid-cols-3">{books.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.title}</strong><p>{item.level} · Stock {item.stock}</p><p className="mt-2 text-xl font-black text-omgGreen">{item.price} USD</p><button type="button" disabled={item.stock <= 0} onClick={() => addBook(item)} className="mt-2 rounded bg-omgGreen px-3 py-2 font-bold text-white disabled:opacity-50">Ajouter</button></article>)}</div>
            <p className="mt-4 font-bold">Panier : {bookCart.length} livre(s) · {cartTotal.toFixed(2)} USD</p>
            <input placeholder="PIN Payflow" maxLength="4" className="mt-3 w-full rounded border p-3" value={feePayment.pin} onChange={(e) => setFeePayment({ ...feePayment, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            <label className="mt-3 flex gap-2"><input type="checkbox" checked={feePayment.confirmed} onChange={(e) => setFeePayment({ ...feePayment, confirmed: e.target.checked })} /> Je confirme le panier et le beneficiaire.</label>
            <button type="button" onClick={buyBooks} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Payer les livres</button>
          </Section>
        </>
      )}

      {mode === "reports" && (
        <Section title="Rapports proteges">
          <div className="mt-4 space-y-3">{!visibleReports.length && <p className="text-slate-600">Aucun rapport autorise pour ce compte.</p>}{visibleReports.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.studentName} · {item.period}</strong><p>{item.summary}</p></article>)}</div>
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
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Identifiant eleve" className="rounded border p-3" value={report.studentId} onChange={(e) => setReport({ ...report, studentId: e.target.value })} /><input placeholder="Nom de l'eleve" className="rounded border p-3" value={report.studentName} onChange={(e) => setReport({ ...report, studentName: e.target.value })} /><input placeholder="Email du responsable autorise" className="rounded border p-3" value={report.guardianEmail} onChange={(e) => setReport({ ...report, guardianEmail: e.target.value })} /><input placeholder="Periode" className="rounded border p-3" value={report.period} onChange={(e) => setReport({ ...report, period: e.target.value })} /><textarea placeholder="Resume du rapport" className="rounded border p-3 md:col-span-2" value={report.summary} onChange={(e) => setReport({ ...report, summary: e.target.value })} /><input placeholder="Code d'acces a 6 chiffres" maxLength="6" className="rounded border p-3" value={report.accessCode} onChange={(e) => setReport({ ...report, accessCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></div>
          <button type="button" onClick={publishReport} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier le rapport</button>
        </Section>
      )}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}</div>}</div>}
      {!!payments.length && <p className="text-sm font-bold text-slate-600">{payments.length} paiement(s) School confirme(s).</p>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default SchoolWorkspace;
