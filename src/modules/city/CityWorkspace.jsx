import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { canAccessCityMerchant, validateCityCoordinates, validateCityTaxPayment } from "./cityJourney";
import {
  generateReceipt,
  getCollection,
  registerMerchant,
  prepareModulePayment,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";

const taxPeriods = ["Jour", "Semaine", "Mois", "Trimestre", "Semestre", "Annee"];

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("creer municipalite") || value.includes("create municipality")) return "municipality";
  if (value.includes("attribuer zone") || value.includes("assign zone")) return "zones";
  if (value.includes("retard") || value.includes("overdue")) return "overdue";
  if (value.includes("rapport") || value.includes("report")) return "reports";
  if (value.includes("audit")) return "audit";
  if (value.includes("enregistrer marchand") || value.includes("register merchant")) return "register";
  if (value.includes("photo marchand") || value.includes("merchant photo")) return "photo";
  if (value.includes("collecter donnees") || value.includes("collect data")) return "field-data";
  if (value.includes("marquer paiement") || value.includes("mark payment")) return "agent-payment";
  if (value.includes("payer taxe") || value.includes("pay tax")) return "tax-payment";
  if (value.includes("voir statut") || value.includes("view status")) return "status";
  return "merchant-file";
}

function addAudit(action, actor, entityId, details = "") {
  return upsertItem("city_audit", { action, actor, entityId, details, immutable: true, timestamp: new Date().toISOString() });
}

function CityWorkspace({ selectedAction, profile, closeModuleAction, initialReference = "" }) {
  const mode = getMode(selectedAction);
  const [municipality, setMunicipality] = useState({ name: "", country: "", city: "", taxRate: "", defaultPeriod: "Mois" });
  const [zone, setZone] = useState({ municipalityId: "", name: "", streets: "", agentEmail: "" });
  const [merchant, setMerchant] = useState({ name: "", email: "", phone: "", category: "", tradeType: "Detail", zoneId: "", street: "", taxAmount: "", period: "Mois" });
  const [photo, setPhoto] = useState({ merchantId: initialReference, fileName: "", location: "" });
  const [fieldData, setFieldData] = useState({ merchantId: initialReference, products: "", observations: "", latitude: "", longitude: "" });
  const [payment, setPayment] = useState({ merchantId: initialReference, periodLabel: "", amount: "", method: "Payflow", pin: "", confirmed: false });
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const allMunicipalities = getCollection("city_municipalities");
  const allZones = getCollection("city_zones");
  const municipalities = allMunicipalities.filter((item) => profile?.email && normalize(item.manager) === normalize(profile.email));
  const zones = allZones.filter((item) => profile?.email && (profile.userType === "Agent" ? normalize(item.agentEmail) === normalize(profile.email) : municipalities.some((entry) => entry.id === item.municipalityId)));
  const merchants = getCollection("merchants").filter((item) => canAccessCityMerchant(item, profile, allZones, allMunicipalities));
  const cityPayments = getCollection("city_tax_payments").filter((item) => merchants.some((entry) => entry.id === item.merchantId));
  const audit = getCollection("city_audit").filter((item) => item.actor === profile?.email || merchants.some((entry) => entry.id === item.entityId));
  const currentMerchant = merchants.find((item) => profile?.email && normalize(item.email) === normalize(profile.email));

  const visibleMerchants = useMemo(() => merchants.filter((item) => {
    const query = normalize(search);
    return !query || [item.name, item.category, item.street, item.status, item.id].some((value) => normalize(value).includes(query));
  }), [merchants, search]);

  const complete = (action, nextReference, message) => {
    saveModuleActivity("city", {
      action,
      reference: nextReference,
      status: "prepared",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(`${message} Enregistrement local : validation municipale serveur non garantie.`);
  };

  const prepareWithAssistant = () => {
    if (mode === "municipality") {
      setMunicipality((current) => ({
        ...current,
        country: current.country || profile?.country || "United States",
        city: current.city || profile?.region || "",
        defaultPeriod: current.defaultPeriod || "Mois"
      }));
      setNotice("Assistant : pays, ville et periode prepares. Saisissez le nom et le taux, puis confirmez vous-meme.");
      return;
    }
    if (mode === "zones") {
      setZone((current) => ({
        ...current,
        municipalityId: current.municipalityId || municipalities[0]?.id || "",
        name: current.name || `Zone ${zones.length + 1}`
      }));
      setNotice("Assistant : municipalite et numero de zone proposes. Les rues, l'agent et la confirmation restent sous votre controle.");
      return;
    }
    if (mode === "register") {
      setMerchant((current) => ({
        ...current,
        zoneId: current.zoneId || zones[0]?.id || "",
        period: current.period || "Mois",
        tradeType: current.tradeType || "Detail"
      }));
      setNotice("Assistant : zone, type et periode prepares. L'identite du marchand et l'enregistrement final restent humains.");
      return;
    }
    if (mode === "tax-payment" || mode === "agent-payment") {
      const selected = merchants.find((item) => item.id === payment.merchantId) || currentMerchant;
      setPayment((current) => ({
        ...current,
        merchantId: current.merchantId || selected?.id || "",
        amount: current.amount || String(selected?.taxAmount || ""),
        periodLabel: current.periodLabel
      }));
      setNotice("Assistant : marchand, periode et montant prepares. Le paiement doit etre confirme manuellement.");
      return;
    }
    if (mode === "overdue") {
      setSearch("due");
      setNotice("Assistant : filtre des dossiers non payes applique.");
      return;
    }
    if (mode === "reports" || mode === "audit") {
      setNotice(`Assistant : ${merchants.length} marchand(s), ${zones.length} zone(s), ${cityPayments.length} paiement(s) et ${audit.length} evenement(s) d'audit analyses.`);
      return;
    }
    if (mode === "field-data" || mode === "photo") {
      const firstMerchant = merchants[0];
      if (mode === "field-data") setFieldData((current) => ({ ...current, merchantId: current.merchantId || firstMerchant?.id || "" }));
      if (mode === "photo") setPhoto((current) => ({ ...current, merchantId: current.merchantId || firstMerchant?.id || "" }));
      setNotice("Assistant : dossier marchand selectionne. Les observations, la photo et la confirmation restent humaines.");
      return;
    }
    setNotice("Assistant : dossier analyse. Choisissez les informations a preparer; aucune confirmation n'a ete effectuee.");
  };

  const createMunicipality = () => {
    const rate = Number(municipality.taxRate);
    if (!municipality.name.trim() || !municipality.country.trim() || !municipality.city.trim() || !Number.isFinite(rate) || rate < 0) {
      setNotice("Nom, pays, ville et taux valide sont obligatoires.");
      return;
    }
    const result = upsertItem("city_municipalities", { ...municipality, taxRate: rate, manager: profile?.email, status: "active" });
    addAudit("MUNICIPALITY_CREATED", profile?.email, result.data.id, result.data.name);
    complete("Creer municipalite", result.data.id, "Municipalite enregistree.");
  };

  const assignZone = () => {
    if (!municipalities.some((item) => item.id === zone.municipalityId)) { setNotice("Choisissez votre propre municipalite."); return; }
    if (!zone.municipalityId || !zone.name.trim() || !zone.streets.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(zone.agentEmail)) {
      setNotice("Municipalite, zone, rues et email agent sont obligatoires.");
      return;
    }
    const result = upsertItem("city_zones", { ...zone, manager: profile?.email, status: "assigned" });
    addAudit("ZONE_ASSIGNED", profile?.email, result.data.id, zone.agentEmail);
    complete("Attribuer zone", result.data.id, "Zone attribuee a l'agent.");
  };

  const saveMerchant = () => {
    if (!zones.some((item) => item.id === merchant.zoneId)) { setNotice("Choisissez une zone qui vous est attribuee."); return; }
    if (merchants.some((item) => normalize(item.email) === normalize(merchant.email) && item.zoneId === merchant.zoneId)) { setNotice("Ce marchand existe deja dans cette zone."); return; }
    const taxAmount = Number(merchant.taxAmount);
    if (!merchant.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchant.email) || !merchant.phone.trim() || !merchant.category.trim() || !merchant.zoneId || !merchant.street.trim() || !Number.isFinite(taxAmount) || taxAmount < 0) {
      setNotice("Identite, contact, categorie, zone, rue et taxe valide sont obligatoires.");
      return;
    }
    const result = registerMerchant({ ...merchant, taxAmount, registeredBy: profile?.email, taxStatus: "due", lastDueAt: new Date().toISOString() });
    addAudit("MERCHANT_REGISTERED", profile?.email, result.data.id, merchant.zoneId);
    complete("Enregistrer marchand", result.data.id, "Marchand enregistre dans le registre municipal.");
  };

  const savePhoto = () => {
    if (!merchants.some((item) => item.id === photo.merchantId)) { setNotice("Dossier hors de votre zone."); return; }
    if (!photo.merchantId || !photo.fileName || !photo.location.trim()) {
      setNotice("Marchand, photo et localisation sont obligatoires.");
      return;
    }
    const result = upsertItem("city_merchant_media", { ...photo, capturedBy: profile?.email, authorized: true });
    addAudit("MERCHANT_PHOTO_ADDED", profile?.email, photo.merchantId, photo.location);
    complete("Photo marchand", result.data.id, "Nom de fichier et localisation conserves localement ; photo non televersee.");
  };

  const saveFieldData = () => {
    if (!merchants.some((item) => item.id === fieldData.merchantId)) { setNotice("Dossier hors de votre zone."); return; }
    const coordinateError = validateCityCoordinates(fieldData.latitude, fieldData.longitude);
    if (coordinateError) { setNotice(coordinateError); return; }
    if (!fieldData.merchantId || !fieldData.products.trim() || !fieldData.observations.trim()) {
      setNotice("Marchand, marchandises et observations sont obligatoires.");
      return;
    }
    const result = upsertItem("city_field_data", { ...fieldData, agent: profile?.email, collectedAt: new Date().toISOString() });
    addAudit("FIELD_DATA_COLLECTED", profile?.email, fieldData.merchantId, result.data.id);
    complete("Collecte terrain", result.data.id, "Donnees terrain enregistrees.");
  };

  const processTaxPayment = async (agentMode = false, confirmed = false) => {
    if (pending.current) return;
    const selected = agentMode ? merchants.find((item) => item.id === payment.merchantId) : currentMerchant;
    const validation = validateCityTaxPayment(selected, payment, cityPayments);
    if (validation) { setNotice(validation); return; }
    const amount = Number(payment.amount);
    if (!selected || !payment.periodLabel.trim() || !Number.isFinite(amount) || amount <= 0) {
      setNotice("Marchand, periode et montant valide sont obligatoires.");
      return;
    }
    if (agentMode && profile?.userType !== "Agent") { setNotice("Role agent requis."); return; }
    if (!agentMode && payment.method !== "Payflow") { setNotice("Ce moyen n'est pas encore connecte dans ce parcours. Aucun paiement lance."); return; }
    if (!payment.confirmed) {
      setNotice("Confirmez le marchand, la periode et le montant.");
      return;
    }
    if (!confirmed) { setNotice(""); setReview({ agentMode, merchant: selected, amount }); return; }
    if (agentMode) {
      const declaration = upsertItem("city_tax_payments", { merchantId: selected.id, period: payment.periodLabel.trim(), amount, currency: "USD", collector: profile?.email, status: "collection_declared" });
      addAudit("COLLECTION_DECLARED", profile?.email, selected.id, declaration.data.id);
      setReview(null);
      setPayment((current) => ({ ...current, confirmed: false }));
      complete("Marquer paiement", declaration.data.id, "Declaration locale de collecte, non encaissement confirme. Aucun statut fiscal PAYE attribue.");
      return;
    }
    pending.current = true;
    setBusy(true);
    let paid;
    try { paid = await prepareModulePayment({ moduleId: "city", action: "Payer taxe", amount, currency: "USD", label: "City Municipal Tax", method: agentMode ? "Agent collection" : payment.method }); }
    catch (error) { setNotice(error?.message || "Preparation de la taxe impossible."); return; }
    finally { pending.current = false; setBusy(false); }
    if (!paid.ok) { setNotice(paid.error || "Preparation impossible."); return; }
    const taxPayment = upsertItem("city_tax_payments", {
      paymentId: paid.data.id,
      merchantId: selected.id,
      period: payment.periodLabel,
      amount,
      currency: "USD",
      collector: agentMode ? profile?.email : "self-service",
      status: paid.live ? "payment_prepared" : "simulated",
      immutable: true
    });
    if (!paid.live) generateReceipt(paid.data);
    addAudit("TAX_PAYMENT_PREPARED", profile?.email, selected.id, `${amount} USD · ${payment.periodLabel}`);
    setReview(null);
    setPayment((current) => ({ ...current, pin: "", confirmed: false }));
    complete(agentMode ? "Marquer paiement" : "Payer taxe", taxPayment.data.id, paid.live ? "Taxe preparee sur le serveur, en attente de confirmation du prestataire." : "Taxe de demonstration payee et recu municipal genere.");
  };

  const Section = ({ title, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">{title}</h3>{children}</section>;
  const MerchantSelector = () => (
    <select className="w-full rounded border p-3" value={payment.merchantId} onChange={(e) => setPayment({ ...payment, merchantId: e.target.value })}>
      <option value="">Choisir un marchand</option>
      {merchants.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
    </select>
  );

  if (review) return <section className="mt-5 space-y-4 rounded-2xl border bg-white p-5"><h3 className="text-xl font-bold">Verifier avant confirmation</h3><p>{review.merchant.name} · {review.merchant.id}</p><p>Periode : {payment.periodLabel} · Montant : {review.amount.toFixed(2)} USD</p><p>{review.agentMode ? "Declaration locale de collecte uniquement : aucun encaissement ni quitus fiscal confirme." : "Preparation Payflow uniquement : aucune taxe acquittee par cette etape."}</p><button disabled={busy} onClick={() => processTaxPayment(review.agentMode, true)} className="rounded bg-omgGreen p-3 text-white">{busy ? "Traitement…" : "Confirmer"}</button><button disabled={busy} onClick={() => setReview(null)} className="ml-3 rounded border p-3">Modifier / annuler</button>{notice && <p role="alert">{notice}</p>}</section>;

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Donnees locales : aucun statut fiscal, retard, encaissement ou audit inviolable certifie. Les anciens statuts PAYE ne constituent pas une preuve serveur.</p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-omgGold/40 bg-slate-950 p-4 text-white">
        <div><strong className="text-omgGold">Assistant City</strong><p className="text-sm text-slate-300">Prepare et calcule · confirmation humaine obligatoire</p></div>
        <button type="button" onClick={prepareWithAssistant} className="rounded bg-omgGold px-4 py-2 font-black text-black">Preparer avec l'assistant</button>
      </div>
      {mode === "municipality" && (
        <Section title="Creer une municipalite">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Nom de la municipalite" className="rounded border p-3" value={municipality.name} onChange={(e) => setMunicipality({ ...municipality, name: e.target.value })} /><input placeholder="Pays" className="rounded border p-3" value={municipality.country} onChange={(e) => setMunicipality({ ...municipality, country: e.target.value })} /><input placeholder="Ville" className="rounded border p-3" value={municipality.city} onChange={(e) => setMunicipality({ ...municipality, city: e.target.value })} /><input aria-label="Taux de taxe" type="number" min="0" className="rounded border p-3" value={municipality.taxRate} onChange={(e) => setMunicipality({ ...municipality, taxRate: e.target.value })} /><select className="rounded border p-3" value={municipality.defaultPeriod} onChange={(e) => setMunicipality({ ...municipality, defaultPeriod: e.target.value })}>{taxPeriods.map((item) => <option key={item}>{item}</option>)}</select></div>
          <button type="button" onClick={createMunicipality} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer</button>
        </Section>
      )}

      {mode === "zones" && (
        <Section title="Attribuer une zone">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded border p-3" value={zone.municipalityId} onChange={(e) => setZone({ ...zone, municipalityId: e.target.value })}><option value="">Choisir une municipalite</option>{municipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Nom de la zone" className="rounded border p-3" value={zone.name} onChange={(e) => setZone({ ...zone, name: e.target.value })} /><input placeholder="Rues couvertes" className="rounded border p-3" value={zone.streets} onChange={(e) => setZone({ ...zone, streets: e.target.value })} /><input placeholder="Email de l'agent" className="rounded border p-3" value={zone.agentEmail} onChange={(e) => setZone({ ...zone, agentEmail: e.target.value })} /></div>
          <button type="button" onClick={assignZone} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Attribuer</button>
        </Section>
      )}

      {mode === "register" && (
        <Section title="Enregistrer un marchand">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Nom du marchand" className="rounded border p-3" value={merchant.name} onChange={(e) => setMerchant({ ...merchant, name: e.target.value })} /><input placeholder="Email" className="rounded border p-3" value={merchant.email} onChange={(e) => setMerchant({ ...merchant, email: e.target.value })} /><input placeholder="Telephone" className="rounded border p-3" value={merchant.phone} onChange={(e) => setMerchant({ ...merchant, phone: e.target.value })} /><input placeholder="Categorie" className="rounded border p-3" value={merchant.category} onChange={(e) => setMerchant({ ...merchant, category: e.target.value })} /><select className="rounded border p-3" value={merchant.tradeType} onChange={(e) => setMerchant({ ...merchant, tradeType: e.target.value })}><option>Detail</option><option>Gros</option><option>Service</option></select><select className="rounded border p-3" value={merchant.zoneId} onChange={(e) => setMerchant({ ...merchant, zoneId: e.target.value })}><option value="">Choisir une zone</option>{zones.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Rue" className="rounded border p-3" value={merchant.street} onChange={(e) => setMerchant({ ...merchant, street: e.target.value })} /><input aria-label="Taxe" type="number" min="0" className="rounded border p-3" value={merchant.taxAmount} onChange={(e) => setMerchant({ ...merchant, taxAmount: e.target.value })} /><select className="rounded border p-3" value={merchant.period} onChange={(e) => setMerchant({ ...merchant, period: e.target.value })}>{taxPeriods.map((item) => <option key={item}>{item}</option>)}</select></div>
          <button type="button" onClick={saveMerchant} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer le marchand</button>
        </Section>
      )}

      {mode === "photo" && (
        <Section title="Photo du marchand">
          <select className="mt-4 w-full rounded border p-3" value={photo.merchantId} onChange={(e) => setPhoto({ ...photo, merchantId: e.target.value })}><option value="">Choisir un marchand</option>{merchants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <label className="mt-3 block rounded border border-dashed p-3">{photo.fileName || "Choisir une photo"}<input type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto({ ...photo, fileName: e.target.files?.[0]?.name || "" })} /></label>
          <input placeholder="Localisation ou rue" className="mt-3 w-full rounded border p-3" value={photo.location} onChange={(e) => setPhoto({ ...photo, location: e.target.value })} />
          <button type="button" onClick={savePhoto} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer la photo</button>
        </Section>
      )}

      {mode === "field-data" && (
        <Section title="Donnees terrain">
          <select className="mt-4 w-full rounded border p-3" value={fieldData.merchantId} onChange={(e) => setFieldData({ ...fieldData, merchantId: e.target.value })}><option value="">Choisir un marchand</option>{merchants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <textarea placeholder="Marchandises ou services" className="mt-3 w-full rounded border p-3" value={fieldData.products} onChange={(e) => setFieldData({ ...fieldData, products: e.target.value })} />
          <textarea placeholder="Observations" className="mt-3 w-full rounded border p-3" value={fieldData.observations} onChange={(e) => setFieldData({ ...fieldData, observations: e.target.value })} />
          <div className="mt-3 grid gap-3 md:grid-cols-2"><input placeholder="Latitude" className="rounded border p-3" value={fieldData.latitude} onChange={(e) => setFieldData({ ...fieldData, latitude: e.target.value })} /><input placeholder="Longitude" className="rounded border p-3" value={fieldData.longitude} onChange={(e) => setFieldData({ ...fieldData, longitude: e.target.value })} /></div>
          <button type="button" onClick={saveFieldData} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer</button>
        </Section>
      )}

      {(mode === "tax-payment" || mode === "agent-payment") && (
        <Section title={mode === "agent-payment" ? "Marquer un paiement collecte" : "Payer la taxe municipale"}>
          {mode === "agent-payment" ? <MerchantSelector /> : <p className="mt-4 rounded-xl bg-slate-50 p-4 font-bold">{currentMerchant ? `${currentMerchant.name} · ${currentMerchant.id}` : "Aucun dossier marchand associe."}</p>}
          <div className="mt-3 grid gap-3 md:grid-cols-2"><input placeholder="Periode fiscale" className="rounded border p-3" value={payment.periodLabel} onChange={(e) => setPayment({ ...payment, periodLabel: e.target.value })} /><input aria-label="Montant" type="number" min="0" className="rounded border p-3" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></div>
          {mode === "tax-payment" && <p className="mt-3 text-sm">Preparation avec Payflow. Aucun PIN requis a cette etape. Carte et cash non connectes ici.</p>}
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} /> Je confirme le marchand, la periode et le montant.</label>
          <p className="mt-3 text-sm">Indiquez une periode datee, par exemple « Mars 2027 », et non seulement « Mois ».</p><button type="button" disabled={busy} onClick={() => processTaxPayment(mode === "agent-payment")} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Verifier la demande</button>
        </Section>
      )}

      {(mode === "merchant-file" || mode === "status") && (
        <Section title={mode === "status" ? "Statut fiscal" : "Dossier marchand"}>
          {currentMerchant ? <article className="mt-4 rounded-xl bg-slate-50 p-4"><strong>{currentMerchant.name}</strong><p>{currentMerchant.id} · {currentMerchant.category} · {currentMerchant.tradeType}</p><p className={`mt-2 font-black ${currentMerchant.taxStatus === "paid" ? "text-emerald-600" : "text-red-600"}`}>{currentMerchant.taxStatus === "paid" ? "PAYE" : "A PAYER"}</p></article> : <p className="mt-4">Aucun dossier marchand associe.</p>}
          <div className="mt-3 space-y-2">{cityPayments.filter((item) => item.merchantId === currentMerchant?.id).map((item) => <p key={item.id} className="rounded bg-slate-50 p-3">{item.period} · {item.amount} USD · {item.status}</p>)}</div>
        </Section>
      )}

      {mode === "overdue" && (
        <Section title="Retards de taxe">
          <input placeholder="Rechercher marchand, zone ou statut" className="mt-4 w-full rounded border p-3" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-4 space-y-3">{visibleMerchants.filter((item) => item.taxStatus !== "paid").map((item) => <article key={item.id} className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4"><strong>{item.name}</strong><p>{item.street} · {item.period} · {item.taxAmount} USD</p></article>)}</div>
        </Section>
      )}

      {mode === "reports" && (
        <Section title="Rapports municipaux">
          <div className="mt-4 grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><strong>Marchands accessibles</strong><p>{merchants.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Zones accessibles</strong><p>{zones.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Operations locales</strong><p>{cityPayments.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Collecte reelle</strong><p>Non verifiee</p></div></div>
        </Section>
      )}

      {mode === "audit" && (
        <Section title="Journal d'audit">
          <div className="mt-4 space-y-3">{!audit.length && <p>Aucune entree.</p>}{audit.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.action}</strong><p>{item.actor} · {item.entityId}</p><p className="text-xs text-slate-500">Lecture seule · {item.timestamp}</p></article>)}</div>
        </Section>
      )}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}</div>}{profile?.userType === "Marchand" && <Link to="/city-administration/history" className="mt-3 block underline">Consulter mon historique</Link>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default CityWorkspace;
