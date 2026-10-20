import React, { useMemo, useRef, useState } from "react";
import { canUseTaxFile, validateTaxDraft } from "./taxFormValidation";
import {
  generateReceipt,
  getCollection,
  prepareModulePayment,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("creer dossier") || value.includes("create tax")) return "file";
  if (value.includes("scanner") || value.includes("scan")) return "documents";
  if (value.includes("question") || value.includes("analyse ia") || value.includes("ai")) return "analysis";
  if (value.includes("signer") || value.includes("sign")) return "signature";
  if (value.includes("payer") || value.includes("payment")) return "payment";
  if (value.includes("verifier dossier") || value.includes("review file")) return "review";
  if (value.includes("valider erreurs") || value.includes("validate errors")) return "errors";
  if (value.includes("preparer soumission") || value.includes("prepare filing")) return "submission";
  return "file";
}

function TaxWorkspace({ selectedAction, profile, closeModuleAction, initialReference = "" }) {
  const mode = getMode(selectedAction);
  const [taxFile, setTaxFile] = useState({
    taxYear: "2026",
    filingStatus: "Single",
    state: "Massachusetts",
    ssnLast4: "",
    employmentIncome: "",
    businessIncome: "",
    otherIncome: "",
    withholding: "",
    deductions: "",
    dependents: "0"
  });
  const [document, setDocument] = useState({ fileName: "", type: "W-2", issuer: "", taxYear: "2026", confirmed: false });
  const [answers, setAnswers] = useState({ foreignIncome: "Non", selfEmployed: "Non", healthCoverage: "Oui", estimatedPayments: "0", confirmed: false });
  const [signature, setSignature] = useState({ legalName: "", date: "", consent: false, accuracy: false });
  const [payment, setPayment] = useState({ service: "Preparation standard", amount: "99", method: "Payflow", pin: "", confirmed: false });
  const [review, setReview] = useState({ fileId: "", notes: "", status: "needs-review", ptinLast4: "" });
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");
  const [selectedFileId, setSelectedFileId] = useState(initialReference);
  const [confirmedDraft, setConfirmedDraft] = useState(false);
  const [paymentReview, setPaymentReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const files = getCollection("tax_files").filter((item) => canUseTaxFile(item, profile));
  const documents = getCollection("tax_documents").filter((item) => item.owner === profile?.email && item.fileId === selectedFileId);
  const analyses = getCollection("tax_analyses");
  const reviews = getCollection("tax_reviews");
  const submissions = getCollection("tax_submission_packages");
  const taxPayments = getCollection("payments").filter((item) => normalize(item.label).includes("tax service"));

  const calculation = useMemo(() => {
    const income = ["employmentIncome", "businessIncome", "otherIncome"].reduce((sum, key) => sum + Number(taxFile[key] || 0), 0);
    const deductions = Math.max(0, Number(taxFile.deductions || 0));
    const taxable = Math.max(0, income - deductions);
    const illustrativeTax = taxable * 0.18;
    const paid = Math.max(0, Number(taxFile.withholding || 0)) + Math.max(0, Number(answers.estimatedPayments || 0));
    return { income, deductions, taxable, illustrativeTax, paid, difference: paid - illustrativeTax };
  }, [taxFile, answers.estimatedPayments]);

  const complete = (action, nextReference, message) => {
    saveModuleActivity("tax", {
      action,
      reference: nextReference,
      status: "prepared",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(message);
  };

  const prepareWithAssistant = () => {
    if (mode === "file") {
      setTaxFile((current) => ({ ...current, state: current.state || profile?.region || "Massachusetts", taxYear: current.taxYear || "2026" }));
      setNotice("Assistant : annee et Etat prepares. Revenus, identifiants et confirmation restent a votre charge.");
      return;
    }
    if (mode === "analysis") {
      setNotice(`Assistant : revenu total ${calculation.income.toFixed(2)} USD, deductions ${calculation.deductions.toFixed(2)} USD, base indicative ${calculation.taxable.toFixed(2)} USD. Estimation non fiscale et non soumise.`);
      return;
    }
    if (mode === "documents") {
      setDocument((current) => ({ ...current, taxYear: current.taxYear || "2026", type: current.type || "W-2" }));
      setNotice("Assistant : type et annee prepares. Vous devez choisir le document et confirmer son classement.");
      return;
    }
    if (mode === "review" || mode === "errors" || mode === "submission") {
      setReview((current) => ({ ...current, fileId: current.fileId || files[0]?.id || "" }));
      setNotice("Assistant : dossier selectionne et controles automatiques prepares. Le fiscaliste autorise doit prendre la decision.");
      return;
    }
    setNotice("Assistant : etape analysee. Signature, paiement et soumission restent exclusivement humains.");
  };

  const saveFile = () => {
    const error = validateTaxDraft(taxFile);
    if (error || !confirmedDraft) { setNotice(error || "Confirmez la relecture du brouillon."); return; }
    if (profile?.country !== "United States" && taxFile.state === "") {
      setNotice("Ce service est reserve aux dossiers fiscaux des Etats-Unis.");
      return;
    }
    if (!/^\d{4}$/.test(taxFile.ssnLast4)) {
      setNotice("Entrez uniquement les 4 derniers chiffres du SSN.");
      return;
    }
    if (calculation.income < 0 || calculation.deductions < 0 || Number(taxFile.dependents) < 0) {
      setNotice("Les montants et le nombre de personnes a charge doivent etre valides.");
      return;
    }
    const result = upsertItem("tax_files", {
      ...taxFile,
      ssnLast4: `***-**-${taxFile.ssnLast4}`,
      taxpayer: profile?.email,
      totals: calculation,
      status: "draft",
      usaOnly: true
    });
    complete("Dossier fiscal", result.data.id, "Dossier fiscal brouillon enregistre avec identifiant masque.");
    setSelectedFileId(result.data.id);
    setConfirmedDraft(false);
  };

  const saveDocument = () => {
    const file = files.find((item) => item.id === selectedFileId);
    if (!file || document.taxYear !== file.taxYear) { setNotice("Choisissez un dossier accessible de la meme annee fiscale."); return; }
    if (!document.fileName || !document.issuer.trim() || !document.confirmed) {
      setNotice("Document, emetteur et confirmation du classement sont obligatoires.");
      return;
    }
    const result = upsertItem("tax_documents", {
      ...document,
      fileId: selectedFileId,
      owner: profile?.email,
      storage: "local-mock",
      status: "metadata-only",
      sensitive: true
    });
    complete("Document fiscal", result.data.id, "Metadonnees du document enregistrees localement. Aucun envoi IRS.");
  };

  const saveAnalysis = () => {
    const file = files.find((item) => item.id === selectedFileId);
    if (!file || !Number.isFinite(Number(answers.estimatedPayments)) || Number(answers.estimatedPayments) < 0) { setNotice("Dossier accessible et paiements estimes valides obligatoires."); return; }
    if (!answers.confirmed) {
      setNotice("Confirmez que les reponses ont ete relues.");
      return;
    }
    const warnings = [];
    if (answers.foreignIncome === "Oui") warnings.push("Revue du revenu etranger requise");
    if (answers.selfEmployed === "Oui") warnings.push("Annexe travail independant potentielle");
    if (!documents.length) warnings.push("Aucun document fiscal classe");
    const result = upsertItem("tax_analyses", {
      taxpayer: profile?.email,
      fileId: selectedFileId,
      answers,
      calculation: file.totals,
      warnings,
      status: warnings.length ? "review-required" : "prepared",
      disclaimer: "Estimation illustrative, non conseil fiscal"
    });
    complete("Analyse fiscale assistee", result.data.id, warnings.length ? `${warnings.length} point(s) a faire verifier par un fiscaliste.` : "Analyse indicative preparee pour verification humaine.");
  };

  const signFile = () => {
    if (!files.some((item) => item.id === selectedFileId)) { setNotice("Selectionnez votre dossier avant de preparer une signature."); return; }
    if (!signature.legalName.trim() || !signature.date || !signature.consent || !signature.accuracy) {
      setNotice("Nom legal, date et deux confirmations humaines sont obligatoires.");
      return;
    }
    const result = upsertItem("tax_signatures", {
      legalName: signature.legalName,
      fileId: selectedFileId,
      date: signature.date,
      consent: true,
      accuracyConfirmed: true,
      taxpayer: profile?.email,
      signedByHuman: false,
      status: "signature-draft"
    });
    complete("Signature electronique", result.data.id, "Intention de signature locale uniquement, sans signature electronique verifiee ni soumission IRS.");
  };

  const payService = async (confirmed = false) => {
    if (pending.current) return;
    if (!files.some((item) => item.id === selectedFileId)) { setNotice("Choisissez votre dossier."); return; }
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Montant du service invalide.");
      return;
    }
    if (!payment.confirmed) {
      setNotice("Confirmez le service, le prix et le moyen de paiement.");
      return;
    }
    if (!confirmed) { setPaymentReview(true); return; }
    pending.current = true; setBusy(true);
    try {
      const paid = await prepareModulePayment({ moduleId: "tax", action: "Payer service", amount, currency: "USD", label: `Tax Service · ${payment.service}`, method: payment.method });
      if (!paid.ok) throw new Error(paid.error || "Preparation impossible.");
      if (!paid.live) generateReceipt(paid.data);
      setPaymentReview(false);
      setPayment((current) => ({ ...current, pin: "", confirmed: false }));
      complete("Paiement service fiscal", paid.data.id, paid.live ? "Demande de paiement preparee, reglement non confirme." : "Simulation uniquement, aucun paiement reel.");
    } catch (error) { setNotice(error?.message || "Preparation impossible."); }
    finally { pending.current = false; setBusy(false); }
  };

  const saveReview = (kind) => {
    const selected = files.find((item) => item.id === review.fileId);
    if (!selected || !review.notes.trim() || !/^\d{4}$/.test(review.ptinLast4)) {
      setNotice("Dossier, notes professionnelles et 4 derniers chiffres PTIN sont obligatoires.");
      return;
    }
    const status = kind === "submission" ? "prepared-for-authorized-filing" : kind === "errors" ? "corrections-required" : review.status;
    const result = upsertItem(kind === "submission" ? "tax_submission_packages" : "tax_reviews", {
      fileId: selected.id,
      notes: review.notes,
      status,
      preparer: profile?.email,
      ptinLast4: `*****${review.ptinLast4}`,
      humanReviewed: true,
      notFiled: true
    });
    complete(kind === "submission" ? "Preparation soumission" : "Revue fiscale", result.data.id, kind === "submission" ? "Paquet prepare. Transmission IRS non effectuee." : "Revue professionnelle enregistree.");
  };

  const Section = ({ title, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">{title}</h3>{children}</section>;

  if (paymentReview) return <Section title="Verifier la preparation du paiement"><p className="mt-3">Dossier {selectedFileId} · {payment.service} · {payment.amount} USD · {payment.method}</p><p>Cette etape ne paie pas un impot et ne transmet aucune declaration.</p><button disabled={busy} onClick={() => payService(true)} className="mt-3 rounded bg-omgGreen p-3 text-white">{busy ? "Preparation…" : "Confirmer la demande"}</button><button disabled={busy} onClick={() => setPaymentReview(false)} className="ml-3 rounded border p-3">Modifier / annuler</button>{notice && <p role="alert">{notice}</p>}</Section>;

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Prototype de preparation : stockage local non certifie. Utilisez uniquement des donnees fictives. Aucun calcul fiscal officiel, signature verifiee ou depot IRS.</p>
      <label className="block rounded-xl border bg-white p-4">Dossier concerne<select aria-label="Dossier concerne" className="mt-2 w-full rounded border p-3" value={selectedFileId} onChange={(event) => { setSelectedFileId(event.target.value); setReview((current) => ({ ...current, fileId: event.target.value })); }}><option value="">Choisir explicitement un dossier</option>{files.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.taxYear}</option>)}</select></label>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-omgGold/40 bg-slate-950 p-4 text-white">
        <div><strong className="text-omgGold">Assistant Tax</strong><p className="text-sm text-slate-300">Prepare et explique · aucune signature ou soumission</p></div>
        <button type="button" onClick={prepareWithAssistant} className="rounded bg-omgGold px-4 py-2 font-black text-black">Preparer avec l'assistant</button>
      </div>

      {mode === "file" && (
        <Section title="Dossier fiscal USA">
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded border p-3" value={taxFile.taxYear} onChange={(e) => setTaxFile({ ...taxFile, taxYear: e.target.value })}><option>2026</option><option>2025</option><option>2024</option></select>
            <select className="rounded border p-3" value={taxFile.filingStatus} onChange={(e) => setTaxFile({ ...taxFile, filingStatus: e.target.value })}><option>Single</option><option>Married Filing Jointly</option><option>Head of Household</option><option>Married Filing Separately</option></select>
            <input placeholder="Etat USA" className="rounded border p-3" value={taxFile.state} onChange={(e) => setTaxFile({ ...taxFile, state: e.target.value })} />
            <input placeholder="4 derniers chiffres SSN" maxLength="4" className="rounded border p-3" value={taxFile.ssnLast4} onChange={(e) => setTaxFile({ ...taxFile, ssnLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            <input aria-label="Revenus emploi" type="number" min="0" className="rounded border p-3" value={taxFile.employmentIncome} onChange={(e) => setTaxFile({ ...taxFile, employmentIncome: e.target.value })} />
            <input aria-label="Revenus entreprise" type="number" min="0" className="rounded border p-3" value={taxFile.businessIncome} onChange={(e) => setTaxFile({ ...taxFile, businessIncome: e.target.value })} />
            <input aria-label="Autres revenus" type="number" min="0" className="rounded border p-3" value={taxFile.otherIncome} onChange={(e) => setTaxFile({ ...taxFile, otherIncome: e.target.value })} />
            <input aria-label="Retenues payees" type="number" min="0" className="rounded border p-3" value={taxFile.withholding} onChange={(e) => setTaxFile({ ...taxFile, withholding: e.target.value })} />
            <input aria-label="Deductions potentielles" type="number" min="0" className="rounded border p-3" value={taxFile.deductions} onChange={(e) => setTaxFile({ ...taxFile, deductions: e.target.value })} />
            <input aria-label="Personnes a charge" type="number" min="0" className="rounded border p-3" value={taxFile.dependents} onChange={(e) => setTaxFile({ ...taxFile, dependents: e.target.value })} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Revenus</strong><p className="text-xl font-black">{calculation.income.toFixed(2)} USD</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Base indicative</strong><p className="text-xl font-black">{calculation.taxable.toFixed(2)} USD</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Estimation illustrative</strong><p className="text-xl font-black">{calculation.illustrativeTax.toFixed(2)} USD</p></div></div>
          <p className="mt-3 text-sm">Saisissez 0 pour chaque montant absent. Les chiffres affiches ne constituent pas un calcul d'impot officiel.</p><label className="mt-3 flex gap-2"><input type="checkbox" checked={confirmedDraft} onChange={(event) => setConfirmedDraft(event.target.checked)} />J'ai relu l'annee, l'Etat et chaque montant du brouillon.</label><button type="button" onClick={saveFile} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer le brouillon</button>
        </Section>
      )}

      {mode === "documents" && (
        <Section title="Documents fiscaux">
          <label className="mt-4 block rounded border border-dashed p-3">{document.fileName || "Choisir un document"}<input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => setDocument({ ...document, fileName: e.target.files?.[0]?.name || "" })} /></label>
          <div className="mt-3 grid gap-3 md:grid-cols-3"><select className="rounded border p-3" value={document.type} onChange={(e) => setDocument({ ...document, type: e.target.value })}><option>W-2</option><option>1099</option><option>Releve bancaire</option><option>Recu deduction</option><option>Autre</option></select><input placeholder="Emetteur" className="rounded border p-3" value={document.issuer} onChange={(e) => setDocument({ ...document, issuer: e.target.value })} /><input placeholder="Annee fiscale" className="rounded border p-3" value={document.taxYear} onChange={(e) => setDocument({ ...document, taxYear: e.target.value })} /></div>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={document.confirmed} onChange={(e) => setDocument({ ...document, confirmed: e.target.checked })} /> Je confirme le type et l'annee du document.</label>
          <button type="button" onClick={saveDocument} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Classer le document</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{documents.length} document(s) classe(s).</p>
        </Section>
      )}

      {mode === "analysis" && (
        <Section title="Analyse fiscale assistee">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="rounded border p-3">Revenu etranger<select className="mt-2 w-full rounded border p-2" value={answers.foreignIncome} onChange={(e) => setAnswers({ ...answers, foreignIncome: e.target.value })}><option>Non</option><option>Oui</option></select></label><label className="rounded border p-3">Travail independant<select className="mt-2 w-full rounded border p-2" value={answers.selfEmployed} onChange={(e) => setAnswers({ ...answers, selfEmployed: e.target.value })}><option>Non</option><option>Oui</option></select></label><label className="rounded border p-3">Couverture sante<select className="mt-2 w-full rounded border p-2" value={answers.healthCoverage} onChange={(e) => setAnswers({ ...answers, healthCoverage: e.target.value })}><option>Oui</option><option>Non</option></select></label><input aria-label="Paiements estimes" type="number" min="0" className="rounded border p-3" value={answers.estimatedPayments} onChange={(e) => setAnswers({ ...answers, estimatedPayments: e.target.value })} /></div>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={answers.confirmed} onChange={(e) => setAnswers({ ...answers, confirmed: e.target.checked })} /> J'ai relu mes reponses.</label>
          <button type="button" onClick={saveAnalysis} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Preparer l'analyse</button>
          <p className="mt-3 text-sm font-bold text-amber-700">Estimation illustrative uniquement. Verification par un professionnel autorise recommandee.</p>
        </Section>
      )}

      {mode === "signature" && (
        <Section title="Signature humaine">
          <input placeholder="Nom legal complet" className="mt-4 w-full rounded border p-3" value={signature.legalName} onChange={(e) => setSignature({ ...signature, legalName: e.target.value })} />
          <input aria-label="Date de signature" type="date" className="mt-3 w-full rounded border p-3" value={signature.date} onChange={(e) => setSignature({ ...signature, date: e.target.value })} />
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={signature.consent} onChange={(e) => setSignature({ ...signature, consent: e.target.checked })} /> Je consens a la signature electronique.</label>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={signature.accuracy} onChange={(e) => setSignature({ ...signature, accuracy: e.target.checked })} /> Je certifie avoir relu les informations.</label>
          <button type="button" onClick={signFile} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Signer moi-meme</button>
        </Section>
      )}

      {mode === "payment" && (
        <Section title="Paiement du service">
          <select className="mt-4 w-full rounded border p-3" value={payment.service} onChange={(e) => { const prices = { "Preparation standard": "99", "Revue CPA": "149", "Dossier entreprise": "249" }; setPayment({ ...payment, service: e.target.value, amount: prices[e.target.value] }); }}><option>Preparation standard</option><option>Revue CPA</option><option>Dossier entreprise</option></select>
          <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xl font-black">{payment.amount} USD</p>
          <select className="mt-3 w-full rounded border p-3" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option>Payflow</option><option>Carte bancaire</option><option>Banque</option></select>
          <p className="mt-3">Aucun PIN requis pour preparer une demande. Prix indicatif du prototype, a verifier sur le serveur.</p>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} /> Je confirme le service et le prix affiche.</label>
          <button type="button" onClick={() => payService()} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Verifier la demande</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{taxPayments.length} paiement(s) de service fiscal.</p>
        </Section>
      )}

      {(mode === "review" || mode === "errors" || mode === "submission") && (
        <Section title={mode === "submission" ? "Preparer la soumission" : mode === "errors" ? "Erreurs et corrections" : "Verifier le dossier"}>
          <select className="mt-4 w-full rounded border p-3" value={review.fileId} onChange={(e) => setReview({ ...review, fileId: e.target.value })}><option value="">Choisir un dossier</option>{files.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.taxYear} · {item.status}</option>)}</select>
          <textarea placeholder="Notes professionnelles" className="mt-3 min-h-28 w-full rounded border p-3" value={review.notes} onChange={(e) => setReview({ ...review, notes: e.target.value })} />
          <input placeholder="4 derniers chiffres PTIN" maxLength="4" className="mt-3 w-full rounded border p-3" value={review.ptinLast4} onChange={(e) => setReview({ ...review, ptinLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          {mode === "review" && <select className="mt-3 w-full rounded border p-3" value={review.status} onChange={(e) => setReview({ ...review, status: e.target.value })}><option value="needs-review">A revoir</option><option value="reviewed">Verifie</option><option value="corrections-required">Corrections requises</option></select>}
          <button type="button" onClick={() => saveReview(mode)} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">{mode === "submission" ? "Preparer sans transmettre" : "Enregistrer la revue"}</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{reviews.length} revue(s) · {submissions.length} paquet(s) prepare(s) · aucune transmission IRS.</p>
        </Section>
      )}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}</div>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default TaxWorkspace;
