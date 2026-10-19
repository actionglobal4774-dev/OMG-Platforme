import React, { useEffect, useMemo, useState } from "react";
import {
  changeAppointment,
  generateReceipt,
  getCollection,
  saveCollection,
  saveAppointment,
  prepareModulePayment,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";
import { listCloudCollection, upsertCloudItem } from "../../services/cloudCollectionService";

const healthCloudCollections = [
  "appointments",
  "health_prescriptions",
  "health_lab_results",
  "health_vitals",
  "health_records",
  "health_psychology_protected",
  "health_staff",
  "health_access_audit",
  "health_emergency_access",
  "health_insurance_requests",
  "health_pharmacy_dispenses",
  "health_lab_catalog",
  "health_secure_shares",
  "health_imaging_requests"
];

const providers = [
  { id: "HP-1001", name: "Dr. Sarah Smith", specialty: "Medecine generale", city: "Boston", languages: "English, Francais", price: 65, verified: true },
  { id: "HP-1002", name: "Dr. Jean Pierre", specialty: "Cardiologie", city: "Port-au-Prince", languages: "Francais, Kreyol", price: 80, verified: true },
  { id: "HP-1003", name: "Dr. Ana Costa", specialty: "Pediatrie", city: "Miami", languages: "English, Espanol", price: 70, verified: true }
];

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("voir dossier")) return "record";
  if (value.includes("mes rendez-vous")) return "appointments";
  if (value.includes("rendez-vous") || value.includes("appointment")) return "appointment";
  if (value.includes("paiement sante")) return "payment";
  if (value === "prescriptions" || value.includes("voir ordonnance")) return "prescriptions";
  if (value.includes("prescription") || value.includes("ordonnance")) return "prescribe";
  if (value.includes("resultat")) return value.includes("ajouter") ? "lab" : "results";
  if (value.includes("teleconsultation")) return "telehealth";
  if (value.includes("consultation")) return "consultation";
  if (value.includes("diagnostic")) return "diagnosis";
  if (value.includes("signes vitaux")) return "vitals";
  if (value.includes("notes visite")) return "nurse-notes";
  if (value.includes("notes separees")) return "psychology";
  if (value.includes("livrer medicaments")) return "pharmacy-delivery";
  if (value.includes("creer sessions")) return "sessions";
  if (value.includes("gerer acces")) return "access";
  if (value.includes("rapport")) return "compliance";
  if (value.includes("urgence") || value.includes("break-glass")) return "emergency";
  if (value.includes("pre-autorisation")) return "insurance";
  if (value.includes("dossiers assurance")) return "insurance-records";
  if (value.includes("catalogue examens")) return "lab-catalog";
  if (value.includes("journal audit")) return "audit";
  if (value.includes("imagerie")) return "imaging";
  if (value.includes("partage")) return "sharing";
  return "record";
}

function HealthWorkspace({ selectedAction, profile, closeModuleAction }) {
  const mode = getMode(selectedAction);
  const [search, setSearch] = useState({ city: "", specialty: "" });
  const [appointment, setAppointment] = useState({ providerId: "", service: "Consultation", type: "Sur place", date: "", time: "", consent: false });
  const [clinical, setClinical] = useState({ patientRef: "", summary: "", details: "", consent: false });
  const [vitals, setVitals] = useState({ patientRef: "", temperature: "", pulse: "", pressure: "" });
  const [prescription, setPrescription] = useState({ patientRef: "", medication: "", dosage: "", duration: "" });
  const [lab, setLab] = useState({ patientRef: "", test: "", result: "", reviewed: false });
  const [session, setSession] = useState({ name: "", email: "", role: "Medecin", license: "" });
  const [payment, setPayment] = useState({ appointmentId: "", pin: "", confirmed: false });
  const [emergency, setEmergency] = useState({ patientRef: "", reason: "", confirmed: false });
  const [insurance, setInsurance] = useState({ prescriptionId: "", coverage: "", decision: "approved" });
  const [dispense, setDispense] = useState({ prescriptionId: "", allergyChecked: false, interactionChecked: false, confirmed: false });
  const [catalogTest, setCatalogTest] = useState({ name: "", code: "", referenceRange: "", criticalRange: "", unit: "" });
  const [share, setShare] = useState({ patientRef: "", recipient: "", scope: "Results and prescriptions", expiresAt: "" });
  const [imaging, setImaging] = useState({ patientRef: "", exam: "", appointmentDate: "" });
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");
  const [, setCloudRevision] = useState(0);
  const appointments = getCollection("appointments");
  const prescriptions = getCollection("health_prescriptions");
  const labResults = getCollection("health_lab_results");
  const staff = getCollection("health_staff");
  const records = getCollection("health_records");
  const auditEntries = getCollection("health_access_audit");
  const emergencyAccesses = getCollection("health_emergency_access");
  const insuranceRequests = getCollection("health_insurance_requests");
  const dispenses = getCollection("health_pharmacy_dispenses");
  const labCatalog = getCollection("health_lab_catalog");
  const isPatient = profile?.userType === "Patient";
  const patientReference = normalize(profile?.email);
  const belongsToPatient = (item) => normalize(item.patientRef || item.patient) === patientReference;
  const visiblePrescriptions = isPatient ? prescriptions.filter(belongsToPatient) : prescriptions;
  const visibleLabResults = isPatient ? labResults.filter(belongsToPatient) : labResults;
  const visibleRecords = isPatient ? records.filter(belongsToPatient) : records;

  useEffect(() => {
    let active = true;
    Promise.all(healthCloudCollections.map(async (collection) => {
      const items = await listCloudCollection("health", collection);
      if (active && items.length) saveCollection(collection, items);
    }))
      .then(() => { if (active) setCloudRevision((value) => value + 1); })
      .catch(() => null);
    return () => { active = false; };
  }, [profile?.email]);

  useEffect(() => {
    if (!profile?.email) return;
    void upsertCloudItem("health", "access_audit", {
      id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action: "view",
      area: mode,
      actorType: profile?.userType || "Unknown",
      occurredAt: new Date().toISOString()
    }).catch(() => null);
  }, [mode, profile?.email, profile?.userType]);

  const persistHealthItem = (collection, item) => {
    const result = upsertItem(collection, item);
    if (result.ok) void upsertCloudItem("health", collection, result.data).catch(() => null);
    return result;
  };

  const audit = (action, patientRef = "", outcome = "allowed") => persistHealthItem("health_access_audit", {
    action, patientRef, actor: profile?.email, role: profile?.userType || "Unknown", outcome, occurredAt: new Date().toISOString()
  });

  const filteredProviders = useMemo(() => providers.filter((item) => {
    const cityOk = !search.city || normalize(item.city).includes(normalize(search.city));
    const specialtyOk = !search.specialty || normalize(item.specialty).includes(normalize(search.specialty));
    return cityOk && specialtyOk;
  }), [search]);

  const complete = (action, nextReference, message) => {
    saveModuleActivity("health", {
      action,
      reference: nextReference,
      status: "confirmed",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(message);
  };

  const bookAppointment = () => {
    const provider = providers.find((item) => item.id === appointment.providerId);
    if (!provider || !appointment.date || !appointment.time || !appointment.consent) {
      setNotice("Professionnel, date, heure et consentement sont obligatoires.");
      return;
    }
    if (new Date(`${appointment.date}T${appointment.time}`) <= new Date()) {
      setNotice("Le rendez-vous doit etre dans le futur.");
      return;
    }
    const result = saveAppointment({
      provider: provider.name,
      providerId: provider.id,
      patient: profile?.email,
      service: appointment.service,
      consultationType: appointment.type,
      date: appointment.date,
      time: appointment.time,
      price: provider.price,
      currency: "USD",
      paymentStatus: "required"
    });
    if (result.ok) void upsertCloudItem("health", "appointments", result.data).catch(() => null);
    complete("Rendez-vous sante", result.data.id, "Rendez-vous confirme. Paiement disponible.");
  };

  const payAppointment = async () => {
    const item = appointments.find((entry) => entry.id === payment.appointmentId);
    if (!item) {
      setNotice("Choisissez un rendez-vous.");
      return;
    }
    if (!/^\d{4}$/.test(payment.pin) || !payment.confirmed) {
      setNotice("PIN Payflow a 4 chiffres et confirmation obligatoires.");
      return;
    }
    let paid;
    try { paid = await prepareModulePayment({ moduleId: "health", action: "Consultation medecin", amount: item.price, currency: item.currency || "USD", label: "Health Service", method: "Payflow" }); }
    catch (error) { setNotice(error?.message || "Preparation du paiement sante impossible."); return; }
    const changed = changeAppointment(item.id, item.status, { paymentStatus: paid.live ? "payment_prepared" : "paid", paymentId: paid.data.id });
    if (changed.ok) void upsertCloudItem("health", "appointments", changed.data).catch(() => null);
    if (!paid.live) generateReceipt(paid.data);
    complete("Paiement sante", paid.data.id, paid.live ? "Paiement sante prepare, en attente de confirmation. Aucune donnee clinique n'est transmise a Payflow." : "Service de demonstration paye.");
  };

  const saveClinicalRecord = (scope) => {
    if (!clinical.patientRef.trim() || !clinical.summary.trim() || !clinical.consent) {
      setNotice("Reference patient, resume et consentement sont obligatoires.");
      return;
    }
    const collection = scope === "psychology" ? "health_psychology_protected" : "health_records";
    const result = persistHealthItem(collection, {
      patientRef: clinical.patientRef,
      summary: clinical.summary,
      details: clinical.details,
      scope,
      author: profile?.email,
      access: scope === "psychology" ? ["Psychologue"] : ["Medecin", "Infirmier"]
    });
    complete(scope === "psychology" ? "Note psychologue protegee" : "Dossier clinique", result.data.id, scope === "psychology" ? "Note enregistree dans l'espace protege." : "Dossier clinique enregistre.");
  };

  const saveVitals = () => {
    if (!vitals.patientRef.trim() || !vitals.temperature || !vitals.pulse || !vitals.pressure.trim()) {
      setNotice("Reference patient et tous les signes vitaux sont obligatoires.");
      return;
    }
    const result = persistHealthItem("health_vitals", { ...vitals, nurse: profile?.email });
    complete("Signes vitaux", result.data.id, "Signes vitaux enregistres.");
  };

  const savePrescription = () => {
    if (!prescription.patientRef.trim() || !prescription.medication.trim() || !prescription.dosage.trim() || !prescription.duration.trim()) {
      setNotice("Patient, medicament, dosage et duree sont obligatoires.");
      return;
    }
    const result = persistHealthItem("health_prescriptions", { ...prescription, prescriber: profile?.email, status: "active", insuranceStatus: "not_requested" });
    audit("prescription_created", prescription.patientRef);
    complete("Ordonnance", result.data.id, "Ordonnance enregistree.");
  };

  const saveLab = () => {
    if (!lab.patientRef.trim() || !lab.test.trim() || !lab.result.trim() || !lab.reviewed) {
      setNotice("Patient, examen, resultat et verification sont obligatoires.");
      return;
    }
    const catalogEntry = labCatalog.find((entry) => normalize(entry.name) === normalize(lab.test) || entry.code === lab.test);
    const result = persistHealthItem("health_lab_results", { ...lab, laboratory: profile?.email, status: "available", referenceRange: catalogEntry?.referenceRange || "Not configured", criticalRange: catalogEntry?.criticalRange || "Not configured" });
    audit("lab_result_published", lab.patientRef);
    complete("Resultat laboratoire", result.data.id, "Resultat publie au patient.");
  };

  const saveSession = () => {
    if (!session.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(session.email) || !session.license.trim()) {
      setNotice("Nom, email valide et numero de licence sont obligatoires.");
      return;
    }
    const result = persistHealthItem("health_staff", { ...session, institution: profile?.email, status: "active", leastPrivilege: true });
    complete("Session employe", result.data.id, "Session creee avec acces limite au role.");
  };

  const requestEmergencyAccess = () => {
    if (!emergency.patientRef.trim() || !emergency.reason.trim() || !emergency.confirmed) {
      setNotice("Patient, justification et confirmation sont obligatoires pour l'acces d'urgence."); return;
    }
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = persistHealthItem("health_emergency_access", { ...emergency, requester: profile?.email, requesterRole: profile?.userType, status: "temporary_active", expiresAt, requestedAt: new Date().toISOString() });
    audit("emergency_access_granted", emergency.patientRef);
    complete("Acces urgence temporaire", result.data.id, "Acces d'urgence active pour 60 minutes et inscrit au journal d'audit.");
  };

  const decideInsurance = () => {
    const prescriptionItem = prescriptions.find((item) => item.id === insurance.prescriptionId);
    if (!prescriptionItem || !insurance.coverage.trim()) { setNotice("Prescription et information de couverture sont obligatoires."); return; }
    const result = persistHealthItem("health_insurance_requests", { ...insurance, patientRef: prescriptionItem.patientRef, insuranceAgent: profile?.email, decidedAt: new Date().toISOString() });
    persistHealthItem("health_prescriptions", { ...prescriptionItem, insuranceStatus: insurance.decision, coverage: insurance.coverage });
    audit("insurance_pre_authorization", prescriptionItem.patientRef);
    complete("Pre-autorisation assurance", result.data.id, `Pre-autorisation ${insurance.decision === "approved" ? "approuvee" : "refusee"}.`);
  };

  const confirmDispense = () => {
    const prescriptionItem = prescriptions.find((item) => item.id === dispense.prescriptionId);
    if (!prescriptionItem || !dispense.allergyChecked || !dispense.interactionChecked || !dispense.confirmed) { setNotice("Prescription, controles allergies/interactions et validation finale sont obligatoires."); return; }
    const result = persistHealthItem("health_pharmacy_dispenses", { ...dispense, patientRef: prescriptionItem.patientRef, pharmacist: profile?.email, dispensedAt: new Date().toISOString() });
    persistHealthItem("health_prescriptions", { ...prescriptionItem, status: "dispensed", pharmacist: profile?.email });
    audit("pharmacy_dispense", prescriptionItem.patientRef);
    complete("Delivrance pharmacie", result.data.id, "Delivrance validee : seules les donnees utiles au traitement ont ete utilisees.");
  };

  const saveCatalogTest = () => {
    if (!catalogTest.name.trim() || !catalogTest.code.trim() || !catalogTest.referenceRange.trim() || !catalogTest.unit.trim()) { setNotice("Nom, code, plage de reference et unite sont obligatoires."); return; }
    const result = persistHealthItem("health_lab_catalog", { ...catalogTest, laboratory: profile?.email });
    audit("lab_catalog_updated"); complete("Catalogue examens", result.data.id, "Examen ajoute au catalogue controle.");
  };

  const saveSecureShare = () => {
    if (!share.patientRef.trim() || !share.recipient.trim() || !share.expiresAt) { setNotice("Patient, destinataire et date d'expiration sont obligatoires."); return; }
    const result = persistHealthItem("health_secure_shares", { ...share, grantedBy: profile?.email, status: "active" });
    audit("secure_share_granted", share.patientRef); complete("Partage securise", result.data.id, "Partage limite au perimetre et a la duree indiques.");
  };

  const saveImagingRequest = () => {
    if (!imaging.patientRef.trim() || !imaging.exam.trim()) { setNotice("Patient et examen d'imagerie sont obligatoires."); return; }
    const result = persistHealthItem("health_imaging_requests", { ...imaging, requestedBy: profile?.email, status: "requested" });
    audit("imaging_requested", imaging.patientRef); complete("Demande imagerie", result.data.id, "Demande d'imagerie enregistree dans le dossier autorise.");
  };

  const Section = ({ title, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="mt-5 space-y-5">
      {mode === "record" && (
        <Section title="Dossier patient">
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><strong>Rendez-vous</strong><p className="text-2xl font-black">{appointments.filter((item) => item.patient === profile?.email).length}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>Prescriptions</strong><p className="text-2xl font-black">{visiblePrescriptions.length}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><strong>Resultats</strong><p className="text-2xl font-black">{visibleLabResults.length}</p></div>
          </div>
          <p className="mt-4 text-sm font-bold text-slate-600">OMG ID : {profile?.email || "Patient"} · Acces patient uniquement</p>
        </Section>
      )}

      {mode === "appointment" && (
        <>
          <Section title="Trouver un professionnel">
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input placeholder="Ville" className="rounded border p-3" value={search.city} onChange={(e) => setSearch({ ...search, city: e.target.value })} />
              <input placeholder="Specialite" className="rounded border p-3" value={search.specialty} onChange={(e) => setSearch({ ...search, specialty: e.target.value })} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {filteredProviders.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.name}</strong><p>{item.specialty}</p><p>{item.city} · {item.price} USD</p><button type="button" onClick={() => setAppointment({ ...appointment, providerId: item.id })} className="mt-2 rounded border px-3 py-2">{appointment.providerId === item.id ? "Selectionne" : "Choisir"}</button></article>)}
            </div>
          </Section>
          <Section title="Prendre rendez-vous">
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select className="rounded border p-3" value={appointment.service} onChange={(e) => setAppointment({ ...appointment, service: e.target.value })}><option>Consultation</option><option>Suivi</option><option>Teleconsultation</option></select>
              <select className="rounded border p-3" value={appointment.type} onChange={(e) => setAppointment({ ...appointment, type: e.target.value })}><option>Sur place</option><option>En ligne</option></select>
              <input aria-label="Date" type="date" className="rounded border p-3" value={appointment.date} onChange={(e) => setAppointment({ ...appointment, date: e.target.value })} />
              <input aria-label="Heure" type="time" className="rounded border p-3" value={appointment.time} onChange={(e) => setAppointment({ ...appointment, time: e.target.value })} />
            </div>
            <label className="mt-3 flex gap-2"><input type="checkbox" checked={appointment.consent} onChange={(e) => setAppointment({ ...appointment, consent: e.target.checked })} /> Je consens a la creation de ce rendez-vous.</label>
            <button type="button" onClick={bookAppointment} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Confirmer</button>
          </Section>
          {!!appointments.filter((item) => item.patient === profile?.email && item.paymentStatus !== "paid").length && (
            <Section title="Paiement du rendez-vous">
              <select className="mt-4 w-full rounded border p-3" value={payment.appointmentId} onChange={(e) => setPayment({ ...payment, appointmentId: e.target.value })}><option value="">Choisir un rendez-vous</option>{appointments.filter((item) => item.patient === profile?.email && item.paymentStatus !== "paid").map((item) => <option key={item.id} value={item.id}>{item.provider} · {item.price} USD</option>)}</select>
              <input placeholder="PIN Payflow" maxLength="4" className="mt-3 w-full rounded border p-3" value={payment.pin} onChange={(e) => setPayment({ ...payment, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              <label className="mt-3 flex gap-2"><input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} /> Je confirme le service et son montant.</label>
              <button type="button" onClick={payAppointment} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Payer avec Payflow</button>
            </Section>
          )}
        </>
      )}

      {mode === "appointments" && (
        <Section title="Mes rendez-vous">
          <div className="mt-4 space-y-3">{!appointments.filter((item) => item.patient === profile?.email).length && <p>Aucun rendez-vous enregistré.</p>}{appointments.filter((item) => item.patient === profile?.email).map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.provider}</strong><p>{item.service} · {item.date} à {item.time}</p><p>Statut : {item.status} · Paiement : {item.paymentStatus || "à confirmer"}</p></article>)}</div>
        </Section>
      )}

      {mode === "payment" && (
        <Section title="Paiement Health Care">
          <p className="mt-2 text-sm text-slate-600">Les informations cliniques ne sont jamais transmises à Payflow.</p>
          <select className="mt-4 w-full rounded border p-3" value={payment.appointmentId} onChange={(e) => setPayment({ ...payment, appointmentId: e.target.value })}><option value="">Choisir un rendez-vous</option>{appointments.filter((item) => item.patient === profile?.email && item.paymentStatus !== "paid").map((item) => <option key={item.id} value={item.id}>{item.provider} · {item.price} USD</option>)}</select>
          <input placeholder="PIN Payflow" maxLength="4" className="mt-3 w-full rounded border p-3" value={payment.pin} onChange={(e) => setPayment({ ...payment, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} /> Je confirme le montant et le service.</label>
          <button type="button" onClick={payAppointment} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Payer avec Payflow</button>
        </Section>
      )}

      {(mode === "consultation" || mode === "diagnosis" || mode === "nurse-notes" || mode === "psychology") && (
        <Section title={mode === "psychology" ? "Notes separees et protegees" : mode === "diagnosis" ? "Diagnostic" : mode === "nurse-notes" ? "Notes de visite" : "Consultation"}>
          <input placeholder="Reference patient" className="mt-4 w-full rounded border p-3" value={clinical.patientRef} onChange={(e) => setClinical({ ...clinical, patientRef: e.target.value })} />
          <input placeholder="Resume" className="mt-3 w-full rounded border p-3" value={clinical.summary} onChange={(e) => setClinical({ ...clinical, summary: e.target.value })} />
          <textarea placeholder="Details professionnels" className="mt-3 min-h-28 w-full rounded border p-3" value={clinical.details} onChange={(e) => setClinical({ ...clinical, details: e.target.value })} />
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={clinical.consent} onChange={(e) => setClinical({ ...clinical, consent: e.target.checked })} /> Consentement patient confirme.</label>
          <button type="button" onClick={() => saveClinicalRecord(mode)} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer</button>
        </Section>
      )}

      {mode === "vitals" && (
        <Section title="Signes vitaux">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Reference patient" className="rounded border p-3" value={vitals.patientRef} onChange={(e) => setVitals({ ...vitals, patientRef: e.target.value })} /><input aria-label="Temperature" type="number" className="rounded border p-3" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} /><input aria-label="Pouls" type="number" className="rounded border p-3" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} /><input placeholder="Tension arterielle" className="rounded border p-3" value={vitals.pressure} onChange={(e) => setVitals({ ...vitals, pressure: e.target.value })} /></div>
          <button type="button" onClick={saveVitals} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer</button>
        </Section>
      )}

      {mode === "prescribe" && (
        <Section title="Nouvelle ordonnance">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Reference patient" className="rounded border p-3" value={prescription.patientRef} onChange={(e) => setPrescription({ ...prescription, patientRef: e.target.value })} /><input placeholder="Medicament" className="rounded border p-3" value={prescription.medication} onChange={(e) => setPrescription({ ...prescription, medication: e.target.value })} /><input placeholder="Dosage" className="rounded border p-3" value={prescription.dosage} onChange={(e) => setPrescription({ ...prescription, dosage: e.target.value })} /><input placeholder="Duree" className="rounded border p-3" value={prescription.duration} onChange={(e) => setPrescription({ ...prescription, duration: e.target.value })} /></div>
          <button type="button" onClick={savePrescription} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier l'ordonnance</button>
        </Section>
      )}

      {(mode === "prescriptions" || mode === "pharmacy-delivery") && (
        <Section title="Ordonnances">
          <div className="mt-4 space-y-3">{!visiblePrescriptions.length && <p>Aucune ordonnance.</p>}{visiblePrescriptions.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.medication}</strong><p>{item.dosage} · {item.duration} · {item.status} · Assurance : {item.insuranceStatus || "non demandee"}</p></article>)}</div>
          {mode === "pharmacy-delivery" && <div className="mt-4 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><h4 className="font-black">Validation de delivrance securisee</h4><select className="rounded border p-3" value={dispense.prescriptionId} onChange={(e) => setDispense({ ...dispense, prescriptionId: e.target.value })}><option value="">Choisir une ordonnance</option>{prescriptions.filter((item) => item.status !== "dispensed").map((item) => <option key={item.id} value={item.id}>{item.medication} · {item.patientRef}</option>)}</select><label className="flex gap-2"><input type="checkbox" checked={dispense.allergyChecked} onChange={(e) => setDispense({ ...dispense, allergyChecked: e.target.checked })} /> Allergies pertinentes verifiees</label><label className="flex gap-2"><input type="checkbox" checked={dispense.interactionChecked} onChange={(e) => setDispense({ ...dispense, interactionChecked: e.target.checked })} /> Interactions potentielles verifiees</label><label className="flex gap-2"><input type="checkbox" checked={dispense.confirmed} onChange={(e) => setDispense({ ...dispense, confirmed: e.target.checked })} /> Validation finale du pharmacien</label><button type="button" onClick={confirmDispense} className="w-fit rounded bg-omgGreen px-4 py-3 font-bold text-white">Valider la delivrance</button></div>}
        </Section>
      )}

      {mode === "lab" && (
        <Section title="Ajouter un resultat">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Reference patient" className="rounded border p-3" value={lab.patientRef} onChange={(e) => setLab({ ...lab, patientRef: e.target.value })} /><input placeholder="Examen" className="rounded border p-3" value={lab.test} onChange={(e) => setLab({ ...lab, test: e.target.value })} /><textarea placeholder="Resultat" className="rounded border p-3 md:col-span-2" value={lab.result} onChange={(e) => setLab({ ...lab, result: e.target.value })} /></div>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={lab.reviewed} onChange={(e) => setLab({ ...lab, reviewed: e.target.checked })} /> Resultat verifie par le laboratoire.</label>
          <button type="button" onClick={saveLab} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier</button>
        </Section>
      )}

      {mode === "results" && (
        <Section title="Resultats d'analyses"><div className="mt-4 space-y-3">{!visibleLabResults.length && <p>Aucun resultat.</p>}{visibleLabResults.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.test}</strong><p>{item.result}</p></article>)}</div></Section>
      )}

      {mode === "telehealth" && (
        <Section title="Teleconsultation"><div className="mt-4 rounded-xl bg-slate-950 p-8 text-center text-white"><p className="text-xl font-black">Salle securisee</p><p className="mt-2 text-slate-300">Camera et microphone desactives</p><button type="button" onClick={() => complete("Teleconsultation", `HEALTH-VIDEO-${Date.now().toString().slice(-6)}`, "Salle de teleconsultation preparee.")} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold">Preparer la salle</button></div></Section>
      )}

      {mode === "sessions" && (
        <Section title="Sessions des employes">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Nom complet" className="rounded border p-3" value={session.name} onChange={(e) => setSession({ ...session, name: e.target.value })} /><input placeholder="Email" className="rounded border p-3" value={session.email} onChange={(e) => setSession({ ...session, email: e.target.value })} /><select className="rounded border p-3" value={session.role} onChange={(e) => setSession({ ...session, role: e.target.value })}><option>Medecin</option><option>Infirmier</option><option>Psychologue</option><option>Pharmacie</option><option>Laboratoire</option></select><input placeholder="Numero de licence" className="rounded border p-3" value={session.license} onChange={(e) => setSession({ ...session, license: e.target.value })} /></div>
          <button type="button" onClick={saveSession} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Creer la session</button>
        </Section>
      )}

      {mode === "access" && (
        <Section title="Acces du personnel"><div className="mt-4 space-y-3">{!staff.length && <p>Aucun employe.</p>}{staff.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.name}</strong><p>{item.role} · {item.status} · Acces minimal</p></article>)}</div></Section>
      )}

      {mode === "compliance" && (
        <Section title="Conformite et acces"><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Personnel</strong><p className="text-2xl font-black">{staff.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Dossiers generaux</strong><p className="text-2xl font-black">{visibleRecords.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Consentements</strong><p className="text-2xl font-black">{visibleRecords.filter((item) => item.consent !== false).length}</p></div></div></Section>
      )}

      {mode === "emergency" && <Section title="Acces urgence — Break-Glass"><p className="mt-2 text-sm text-slate-600">Reserve aux professionnels autorises. L'acces est temporaire, justifie et inscrit au journal d'audit.</p><input placeholder="Reference patient" className="mt-4 w-full rounded border p-3" value={emergency.patientRef} onChange={(e) => setEmergency({ ...emergency, patientRef: e.target.value })} /><textarea placeholder="Justification clinique de l'urgence" className="mt-3 min-h-24 w-full rounded border p-3" value={emergency.reason} onChange={(e) => setEmergency({ ...emergency, reason: e.target.value })} /><label className="mt-3 flex gap-2"><input type="checkbox" checked={emergency.confirmed} onChange={(e) => setEmergency({ ...emergency, confirmed: e.target.checked })} /> Je confirme qu'une urgence justifie cet acces.</label><button type="button" onClick={requestEmergencyAccess} className="mt-4 rounded bg-red-700 px-5 py-3 font-bold text-white">Demander acces temporaire</button><div className="mt-4 text-sm">Acces urgents actifs : {emergencyAccesses.filter((item) => item.status === "temporary_active" && new Date(item.expiresAt) > new Date()).length}</div></Section>}

      {mode === "insurance" && <Section title="Pre-autorisations assurance"><p className="mt-2 text-sm text-slate-600">L'assurance ne traite que les informations necessaires a la couverture.</p><select className="mt-4 w-full rounded border p-3" value={insurance.prescriptionId} onChange={(e) => setInsurance({ ...insurance, prescriptionId: e.target.value })}><option value="">Choisir une ordonnance autorisee</option>{prescriptions.map((item) => <option key={item.id} value={item.id}>{item.medication} · {item.patientRef}</option>)}</select><input placeholder="Couverture, quote-part ou restriction" className="mt-3 w-full rounded border p-3" value={insurance.coverage} onChange={(e) => setInsurance({ ...insurance, coverage: e.target.value })} /><select className="mt-3 w-full rounded border p-3" value={insurance.decision} onChange={(e) => setInsurance({ ...insurance, decision: e.target.value })}><option value="approved">Approuver</option><option value="denied">Refuser</option><option value="pending">Mettre en attente</option></select><button type="button" onClick={decideInsurance} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer la decision</button></Section>}

      {mode === "insurance-records" && <Section title="Dossiers assurance autorises"><div className="mt-4 space-y-3">{!insuranceRequests.length && <p>Aucune demande de pre-autorisation.</p>}{insuranceRequests.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.decision}</strong><p>Patient : {item.patientRef} · Couverture : {item.coverage}</p></article>)}</div></Section>}

      {mode === "lab-catalog" && <Section title="Catalogue controle des examens"><div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Nom de l'examen" className="rounded border p-3" value={catalogTest.name} onChange={(e) => setCatalogTest({ ...catalogTest, name: e.target.value })} /><input placeholder="Code examen" className="rounded border p-3" value={catalogTest.code} onChange={(e) => setCatalogTest({ ...catalogTest, code: e.target.value })} /><input placeholder="Plage de reference" className="rounded border p-3" value={catalogTest.referenceRange} onChange={(e) => setCatalogTest({ ...catalogTest, referenceRange: e.target.value })} /><input placeholder="Valeurs critiques (optionnel)" className="rounded border p-3" value={catalogTest.criticalRange} onChange={(e) => setCatalogTest({ ...catalogTest, criticalRange: e.target.value })} /><input placeholder="Unite" className="rounded border p-3" value={catalogTest.unit} onChange={(e) => setCatalogTest({ ...catalogTest, unit: e.target.value })} /></div><button type="button" onClick={saveCatalogTest} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Ajouter l'examen</button><p className="mt-4 text-sm">Examens configures : {labCatalog.length}</p></Section>}

      {mode === "sharing" && <Section title="Partage securise du dossier"><p className="mt-2 text-sm text-slate-600">Le partage est limite au perimetre choisi et peut expirer ou etre revoque.</p><input placeholder="Reference patient" className="mt-4 w-full rounded border p-3" value={share.patientRef} onChange={(e) => setShare({ ...share, patientRef: e.target.value })} /><input placeholder="Destinataire autorise" className="mt-3 w-full rounded border p-3" value={share.recipient} onChange={(e) => setShare({ ...share, recipient: e.target.value })} /><select className="mt-3 w-full rounded border p-3" value={share.scope} onChange={(e) => setShare({ ...share, scope: e.target.value })}><option>Results and prescriptions</option><option>Imaging only</option><option>Consultation summary only</option></select><input aria-label="Expiration" type="datetime-local" className="mt-3 w-full rounded border p-3" value={share.expiresAt} onChange={(e) => setShare({ ...share, expiresAt: e.target.value })} /><button type="button" onClick={saveSecureShare} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Autoriser le partage</button></Section>}

      {mode === "imaging" && <Section title="Imagerie medicale"><input placeholder="Reference patient" className="mt-4 w-full rounded border p-3" value={imaging.patientRef} onChange={(e) => setImaging({ ...imaging, patientRef: e.target.value })} /><input placeholder="Examen demande (IRM, radiographie...)" className="mt-3 w-full rounded border p-3" value={imaging.exam} onChange={(e) => setImaging({ ...imaging, exam: e.target.value })} /><input aria-label="Date souhaitee" type="date" className="mt-3 w-full rounded border p-3" value={imaging.appointmentDate} onChange={(e) => setImaging({ ...imaging, appointmentDate: e.target.value })} /><button type="button" onClick={saveImagingRequest} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer la demande</button></Section>}

      {mode === "audit" && <Section title="Journal d'audit medical"><p className="mt-2 text-sm text-slate-600">Les acces et actions sensibles sont tracables dans ce frontend de demonstration.</p><div className="mt-4 space-y-2">{!auditEntries.length && <p>Aucune entree d'audit.</p>}{auditEntries.slice(0, 20).map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{item.action}</strong><p>{item.role} · {item.actor} · {item.patientRef || "sans patient"} · {item.outcome}</p></article>)}</div></Section>}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}</div>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default HealthWorkspace;
