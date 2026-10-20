import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { isDemoMode } from "../../services/runtimePolicy";
import { nextMailportStatus, validateMailportDelivery } from "./mailportJourney";
import { validateMailportCourier, validateMailportPhoto, validateMailportPublication } from "./mailportFormValidation";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { getMailportRole, mailportReferenceLink } from "./mailportNavigation";
import { saveModuleActivity } from "../../services/activityService";
import AddressAutocomplete from "../../components/common/AddressAutocomplete";
import { uploadFirebaseFile } from "../../services/firebaseClient";
import {
  advanceSecureMailportPackage,
  completeSecureMailportAddressPurchaseWithPayflow,
  createPayPalOrder,
  createStripeCheckoutSession,
  inspectSecureMailportPackage,
  prepareSecureMailportAddressPurchase,
  publishSecureMailportAddress,
  searchSecureMailportAddresses
} from "../../services/backendService";
import {
  getMailportPackages,
  searchMailportAddresses
} from "../../services/mailportService";

const blankFilters = {
  country: "",
  city: "",
  zone: "",
  street: "",
  postalCode: ""
};

function createReference(prefix) {
  return `${prefix}-${Date.now()}`;
}

function getActionMode(action) {
  const lowered = String(action || "").toLowerCase();
  if (lowered.includes("publier") || lowered.includes("adresse gratuitement")) return "publish";
  if (lowered.includes("photo")) return "photos";
  if (lowered.includes("candidature")) return "application";
  if (lowered.includes("mission")) return "missions";
  if (lowered.includes("voir qr") || lowered.includes("qr adresse")) return "qr";
  if (lowered.includes("changer adresse")) return "buy";
  if (lowered.includes("acheter")) return "buy";
  if (lowered.includes("revenu") || lowered.includes("gain")) return "revenue";
  if (lowered.includes("livrer") || lowered.includes("livraison") || lowered.includes("recuperer")) return "delivery";
  if (lowered.includes("recevoir") && lowered.includes("colis")) return "delivery";
  if (lowered.includes("recevoir") && lowered.includes("qr")) return "track";
  if (lowered.includes("suivre") || lowered.includes("colis")) return "track";
  return "search";
}

function MailportWorkspace({ selectedAction, profile, closeModuleAction, initialReference = "" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = getMailportRole(profile);
  const mode = getActionMode(selectedAction);
  const [filters, setFilters] = useState(() => ({
    ...blankFilters,
    country: profile?.country || ""
  }));
  const [publishForm, setPublishForm] = useState({
    country: profile?.country || "",
    city: "",
    zone: "",
    street: "",
    postalCode: "",
    addressType: "",
    description: "",
    photoName: "",
    ownerPhotoName: "",
    photoFile: null,
    ownerPhotoFile: null,
    authorized: false
  });
  const [trackingForm, setTrackingForm] = useState({
    trackingId: initialReference,
    packageQr: "",
    fromLocation: "",
    toLocation: "",
    photoName: "",
    signatureName: "",
    proofPhotoFile: null
  });
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Payflow");
  const [photoUpdate, setPhotoUpdate] = useState({ addressReference: "", addressPhotoName: "", ownerPhotoName: "" });
  const courierKey = `omg_mailport_courier_draft_${profile?.email || "anonymous"}`;
  const [courierDraft, setCourierDraft] = useState(() => {
    const blank = { country: profile?.country || "", city: "", transport: "", phone: "", serviceArea: "", confirmed: false };
    try { const saved = JSON.parse(localStorage.getItem(courierKey) || "null"); return saved ? { ...blank, country: String(saved.country || ""), city: String(saved.city || ""), transport: String(saved.transport || ""), phone: String(saved.phone || ""), serviceArea: String(saved.serviceArea || "") } : blank; } catch { return blank; }
  });
  const [result, setResult] = useState(null);
  const [serverAddresses, setServerAddresses] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const purchaseRetry = useRef(null);
  const [review, setReview] = useState(null);
  const [addressError, setAddressError] = useState("");
  const [addressQr, setAddressQr] = useState("");

  const localAddresses = useMemo(() => searchMailportAddresses(filters), [filters, result]);
  const addresses = serverAddresses ?? (isDemoMode && addressError ? localAddresses : []);
  const packages = useMemo(() => getMailportPackages().slice(0, 5), [result]);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || null;

  const label = (key, fallback) => t(key, { defaultValue: fallback });

  useEffect(() => {
    let active = true;
    setServerAddresses(null);
    setAddressError("");
    searchSecureMailportAddresses(filters)
      .then((response) => { if (active) setServerAddresses(response.addresses || []); })
      .catch(() => { if (active) setAddressError("Recherche serveur indisponible. Aucun achat ne peut etre confirme sur des exemples locaux."); });
    return () => { active = false; };
  }, [filters, result]);

  const updateFilters = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const updatePublish = (field, value) => {
    setPublishForm((current) => ({ ...current, [field]: value, authorized: false, ...(field === "street" ? { latitude: undefined, longitude: undefined, placeId: "" } : {}) }));
  };

  const updateTracking = (field, value) => {
    setTrackingForm((current) => ({ ...current, [field]: value }));
  };

  const rememberActivity = (action, reference, message, status = "prepared") => {
    saveModuleActivity("mailport", {
      action,
      reference,
      status,
      profile: {
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        email: profile?.email,
        country: profile?.country,
        userType: profile?.userType
      }
    });
    setResult({ reference, message, status });
  };

  const publishAddress = async () => {
    if (pending.current) return;
    const validation = validateMailportPublication(publishForm);
    if (validation) { setResult({ message: validation }); return; }
    if (!publishForm.city || !publishForm.street || !publishForm.photoFile || !Number.isFinite(publishForm.latitude) || !Number.isFinite(publishForm.longitude)) {
      setResult({
        reference: "",
        message: label("mailport_publish_required", "Ville, rue et photo de l'adresse sont obligatoires pour publier gratuitement.")
      });
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const addressPhoto = await uploadFirebaseFile(publishForm.photoFile, "mailportAddressPhotos");
      const ownerPhoto = publishForm.ownerPhotoFile ? await uploadFirebaseFile(publishForm.ownerPhotoFile, "mailportOwnerPhotos") : null;
      const address = await publishSecureMailportAddress({
        ...publishForm,
        addressPhotoPath: addressPhoto.path,
        ownerPhotoPath: ownerPhoto?.path || "",
        photoFile: undefined,
        ownerPhotoFile: undefined
      });
      rememberActivity(label("mailport_publish_address_free", "Publier mon adresse gratuitement"), address.addressId, "Adresse envoyee pour verification administrative avant publication.", "pending_admin");
    } catch (error) {
      setResult({ reference: "", message: error?.message || "Publication Mailport impossible." });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const buyAddress = async (confirmed = false) => {
    if (pending.current) return;
    if (!serverAddresses) { setResult({ message: "La recherche serveur doit reussir avant tout achat." }); return; }
    if (!selectedAddress) {
      setResult({
        reference: "",
        message: label("mailport_no_address_selected", "Veuillez choisir une adresse referentielle avant de payer.")
      });
      return;
    }
    if (!confirmed) { setResult(null); setReview({ kind: "purchase", address: selectedAddress, paymentMethod }); return; }
    pending.current = true;
    setBusy(true);
    try {
      const retry = purchaseRetry.current;
      const purchase = retry?.addressId === selectedAddress.id && retry?.paymentMethod === paymentMethod
        ? retry.purchase : await prepareSecureMailportAddressPurchase({ addressId: selectedAddress.id, paymentMethod });
      purchaseRetry.current = { addressId: selectedAddress.id, paymentMethod, purchase };
      if (String(paymentMethod).toLowerCase() === "payflow") {
        const paid = await completeSecureMailportAddressPurchaseWithPayflow(purchase.purchaseId);
        setAddressQr(paid.addressQrPayload || "");
        purchaseRetry.current = null;
        rememberActivity(label("mailport_buy_address", "Acheter adresse"), paid.purchaseId, `Adresse payee ${paid.amount} ${paid.currency}.`, "paid");
        setReview(null);
      } else if (String(paymentMethod).toLowerCase() === "paypal") {
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const order = await createPayPalOrder({ amount: purchase.amount, currency: purchase.currency, moduleId: "mailport", action: `mailport_address_purchase:${purchase.purchaseId}`, returnUrl: `${baseUrl}#/paypal-return`, cancelUrl: `${baseUrl}#/paypal-cancel` });
        sessionStorage.setItem("omgPayPalPending", JSON.stringify({ orderId: order.orderId, purchaseId: purchase.purchaseId, moduleId: "mailport", provider: "paypal" }));
        const approvalUrl = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
        if (!approvalUrl) throw new Error("Adresse d'approbation PayPal absente.");
        window.location.assign(approvalUrl);
      } else if (String(paymentMethod).toLowerCase() === "stripe") {
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const checkout = await createStripeCheckoutSession({ amount: purchase.amount, currency: purchase.currency, moduleId: "mailport", action: `mailport_address_purchase:${purchase.purchaseId}`, successUrl: `${baseUrl}#/stripe-return?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${baseUrl}#/stripe-cancel` });
        sessionStorage.setItem("omgStripePending", JSON.stringify({ sessionId: checkout.sessionId, purchaseId: purchase.purchaseId, moduleId: "mailport", provider: "stripe" }));
        window.location.assign(checkout.redirectUrl);
      } else {
        rememberActivity(label("mailport_buy_address", "Acheter adresse"), purchase.purchaseId, `Achat prepare pour ${purchase.amount} ${purchase.currency}. Le QR sera emis seulement apres confirmation du paiement.`);
      }
    } catch (error) {
      setResult({ reference: "", message: error?.message || "Preparation de l'achat impossible." });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const confirmPackageStep = async (action, confirmed = false) => {
    if (pending.current) return;
    if (!trackingForm.packageQr.trim()) {
      setResult({
        reference: "",
        message: "Le service securise exige le contenu complet du QR signe du colis. Le numero seul ne suffit pas."
      });
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (String(action).toLowerCase().includes("suivre") || String(action).toLowerCase().includes("track")) {
        const inspected = await inspectSecureMailportPackage(trackingForm.packageQr || trackingForm.trackingId);
        rememberActivity(action, inspected.packageId, `Statut colis: ${inspected.status}. ${inspected.fromLocation} vers ${inspected.toLocation}.`);
        return;
      }
      const inspected = await inspectSecureMailportPackage(trackingForm.packageQr);
      const nextStatus = nextMailportStatus(inspected.status);
      const validation = validateMailportDelivery(role, nextStatus, trackingForm.signatureName, trackingForm.proofPhotoFile);
      if (validation) throw new Error(validation);
      if (!confirmed) { setResult(null); setReview({ kind: "delivery", action, packageId: inspected.packageId, status: inspected.status, nextStatus }); return; }
      if (review?.packageId !== inspected.packageId || review?.status !== inspected.status) throw new Error("Le statut a change. Annulez puis verifiez de nouveau le colis.");
      let proofPhotoPath = "";
      if (nextStatus === "delivered" && trackingForm.proofPhotoFile) {
        const photoError = validateMailportPhoto(trackingForm.proofPhotoFile);
        if (photoError) throw new Error(photoError);
        proofPhotoPath = (await uploadFirebaseFile(trackingForm.proofPhotoFile, "mailportDeliveryProofs")).path;
      }
      const step = await advanceSecureMailportPackage({ payload: trackingForm.packageQr || trackingForm.trackingId, nextStatus, proofPhotoPath, receiverName: trackingForm.signatureName });
      rememberActivity(action, step.packageId, `Etape Mailport confirmee: ${step.status}.`, "confirmed");
      setReview(null);
    } catch (error) {
      setResult({ reference: "", message: error?.message || "Mise a jour du colis impossible." });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const saveAddressPhotos = () => {
    if (!photoUpdate.addressReference.trim() || (!photoUpdate.addressPhotoName && !photoUpdate.ownerPhotoName)) {
      setResult({
        reference: "",
        message: label("mailport_photo_update_required", "Entrez la reference de l'adresse et ajoutez au moins une photo.")
      });
      return;
    }
    rememberActivity(
      label("mailport_add_address_photos", "Ajouter photos adresse"),
      createReference("MAILPORT-PHOTO"),
      "Selection preparee uniquement : aucune photo transmise ni modification de l'adresse. Le service de mise a jour reste a connecter."
    );
  };

  const submitCourierApplication = () => {
    const error = validateMailportCourier(courierDraft);
    if (error) { setResult({ message: error }); return; }
    try { localStorage.setItem(courierKey, JSON.stringify({ country: courierDraft.country, city: courierDraft.city, transport: courierDraft.transport, phone: courierDraft.phone, serviceArea: courierDraft.serviceArea })); }
    catch { setResult({ message: "Stockage indisponible : brouillon non sauvegarde. Conservez les informations avant de quitter." }); return; }
    rememberActivity("Candidature livreur", createReference("MAILPORT-COURIER"), "Brouillon local uniquement : candidature non transmise. Le service de candidature reste a connecter.");
  };

  const renderAddressSearch = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-black text-slate-900">
        {label("mailport_reference_addresses", "Liste des adresses referentielles")}
      </h3>
      {addressError && <p role="alert" className="mt-3 text-amber-800">{addressError} {isDemoMode ? "Les adresses affichees sont des exemples." : ""}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <input className="rounded border p-3" value={filters.country} onChange={(event) => updateFilters("country", event.target.value)} placeholder={label("country", "Pays")} />
        <input className="rounded border p-3" value={filters.city} onChange={(event) => updateFilters("city", event.target.value)} placeholder={label("mailport_city", "Ville")} />
        <input className="rounded border p-3" value={filters.zone} onChange={(event) => updateFilters("zone", event.target.value)} placeholder={label("zone", "Zone / quartier")} />
        <input className="rounded border p-3" value={filters.street} onChange={(event) => updateFilters("street", event.target.value)} placeholder={label("street", "Rue")} />
        <input className="rounded border p-3" value={filters.postalCode} onChange={(event) => updateFilters("postalCode", event.target.value)} placeholder={label("postal_code", "Code postal")} />
      </div>
      <div className="mt-4 grid gap-3">
        {addresses.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {label("mailport_no_address_found", "Aucune adresse trouvee. Changez le pays, la rue, la zone ou le code postal.")}
          </div>
        ) : addresses.map((address) => (
          <button
            key={address.id}
            type="button"
            onClick={() => setSelectedAddressId(address.id)}
            className={`rounded-xl border p-4 text-left ${selectedAddress?.id === address.id ? "border-omgGreen bg-green-50" : "border-slate-200 bg-slate-50"}`}
          >
            <strong className="text-slate-900">{address.ownerName}</strong>
            <p className="mt-1 text-sm text-slate-700">{address.street}, {address.zone}, {address.city}, {address.country} {address.postalCode}</p>
            <p className="mt-1 text-xs text-slate-500">{address.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (review) return <div className="mt-5 space-y-4 rounded-2xl border bg-white p-5">
    <h3 className="text-xl font-bold">Verifier avant confirmation</h3>
    {review.kind === "purchase" ? <><p>{review.address.street}, {review.address.city}, {review.address.country}</p><p>4,99 USD — {review.paymentMethod}</p><p>La confirmation lance le paiement ou ouvre le prestataire choisi. Aucun QR sans paiement confirme.</p></> : <><p>Colis : {review.packageId}</p><p>{review.status} → {review.nextStatus}</p><p>La confirmation modifie le statut du colis.</p></>}
    <button disabled={busy} className="rounded bg-omgGreen p-3 font-bold text-white disabled:opacity-50" onClick={() => review.kind === "purchase" ? buyAddress(true) : confirmPackageStep(review.action, true)}>{busy ? "Traitement…" : "Confirmer"}</button>
    <button disabled={busy} className="ml-3 rounded border p-3" onClick={() => { setReview(null); setResult(null); }}>Modifier / annuler</button>
    {result && <p role="alert">{result.message}</p>}
  </div>;

  return (
    <div className="mt-5 space-y-5">
      {mode === "publish" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">
            {label("mailport_publish_address_free", "Publier mon adresse gratuitement")}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded border p-3" value={publishForm.country} onChange={(event) => updatePublish("country", event.target.value)} placeholder={label("country", "Pays")} />
            <input className="rounded border p-3" value={publishForm.city} onChange={(event) => updatePublish("city", event.target.value)} placeholder={label("mailport_city", "Ville / commune")} />
            <input className="rounded border p-3" value={publishForm.zone} onChange={(event) => updatePublish("zone", event.target.value)} placeholder={label("zone", "Zone / quartier / section communale")} />
            <AddressAutocomplete
              value={publishForm.street}
              onChange={(value) => updatePublish("street", value)}
              onAddress={(address) => setPublishForm((current) => ({
                ...current,
                authorized: false,
                street: address.street || address.formattedAddress,
                city: address.city || current.city,
                zone: address.zone || current.zone,
                country: address.country || current.country,
                postalCode: address.postalCode || current.postalCode,
                placeId: address.placeId,
                latitude: address.latitude,
                longitude: address.longitude
              }))}
              placeholder={label("street", "Rechercher et verifier l'adresse")}
            />
            <input className="rounded border p-3" value={publishForm.postalCode} onChange={(event) => updatePublish("postalCode", event.target.value)} placeholder={label("postal_code", "Code postal")} />
            <input className="rounded border p-3" value={publishForm.addressType} onChange={(event) => updatePublish("addressType", event.target.value)} placeholder={label("mailport_address_type", "Type d'adresse")} />
            <label className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-700">
              {publishForm.photoName || label("mailport_address_photo", "Photo de l'adresse")}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPublishForm((current) => ({ ...current, photoName: event.target.files?.[0]?.name || "", photoFile: event.target.files?.[0] || null }))} />
            </label>
            <label className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-700">
              {publishForm.ownerPhotoName || label("mailport_owner_photo", "Photo du proprietaire")}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPublishForm((current) => ({ ...current, ownerPhotoName: event.target.files?.[0]?.name || "", ownerPhotoFile: event.target.files?.[0] || null }))} />
            </label>
            <textarea className="rounded border p-3 md:col-span-2" rows={3} value={publishForm.description} onChange={(event) => updatePublish("description", event.target.value)} placeholder={label("description", "Description courte de l'adresse")} />
          </div>
          <p className="mt-3 text-sm">Photos JPG, PNG ou WebP de 5 Mo maximum. L'adresse restera en attente de verification administrative.</p>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={publishForm.authorized} onChange={(event) => setPublishForm((current) => ({ ...current, authorized: event.target.checked }))} />Je suis proprietaire ou autorise a publier cette adresse et ses photos.</label>
          <button type="button" disabled={busy} onClick={publishAddress} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-50">
            {label("mailport_publish_address_free", "Publier mon adresse gratuitement")}
          </button>
        </div>
      )}

      {mode === "photos" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">
            {label("mailport_add_address_photos", "Ajouter photos adresse")}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="rounded border p-3 md:col-span-2"
              value={photoUpdate.addressReference}
              onChange={(event) => setPhotoUpdate({ ...photoUpdate, addressReference: event.target.value })}
              placeholder={label("mailport_address_reference", "Reference de l'adresse")}
            />
            <label className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-700">
              {photoUpdate.addressPhotoName || label("mailport_address_photo", "Photo de l'adresse")}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhotoUpdate({ ...photoUpdate, addressPhotoName: event.target.files?.[0]?.name || "" })} />
            </label>
            <label className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-700">
              {photoUpdate.ownerPhotoName || label("mailport_owner_photo", "Photo du proprietaire")}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhotoUpdate({ ...photoUpdate, ownerPhotoName: event.target.files?.[0]?.name || "" })} />
            </label>
          </div>
          <button type="button" onClick={saveAddressPhotos} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
            {label("save", "Enregistrer")}
          </button>
        </div>
      )}

      {mode === "application" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Candidature livreur Mailport</h3>
          <p className="mt-2 text-sm text-amber-800">Brouillon sur cet appareil uniquement. Aucune candidature transmise. Ne saisissez pas de document d'identite ; il sera demande par le service securise si necessaire.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input aria-label="Pays de service" className="rounded border p-3" value={courierDraft.country} onChange={(event) => setCourierDraft({ ...courierDraft, country: event.target.value, confirmed: false })} placeholder="Pays de service" />
            <input className="rounded border p-3" value={courierDraft.city} onChange={(event) => setCourierDraft({ ...courierDraft, city: event.target.value, confirmed: false })} placeholder="Ville de service" />
            <input className="rounded border p-3" value={courierDraft.transport} onChange={(event) => setCourierDraft({ ...courierDraft, transport: event.target.value, confirmed: false })} placeholder="Moyen de transport" />
            <input aria-label="Telephone de contact" type="tel" className="rounded border p-3" value={courierDraft.phone} onChange={(event) => setCourierDraft({ ...courierDraft, phone: event.target.value, confirmed: false })} placeholder="Telephone avec indicatif pays" />
            <input aria-label="Zone de service" className="rounded border p-3 md:col-span-2" value={courierDraft.serviceArea} onChange={(event) => setCourierDraft({ ...courierDraft, serviceArea: event.target.value, confirmed: false })} placeholder="Quartiers ou zone de service" />
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={courierDraft.confirmed} onChange={(event) => setCourierDraft({ ...courierDraft, confirmed: event.target.checked })} />
            <span>Je confirme que les informations de cette candidature sont exactes.</span>
          </label>
          <button type="button" onClick={submitCourierApplication} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Sauvegarder le brouillon</button>
        </div>
      )}

      {mode === "missions" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Missions disponibles</h3>
          <div className="mt-4 space-y-3">
            {packages.length ? packages.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(`${mailportReferenceLink("delivery", item.trackingId || item.id)}&view=pickup`);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-700"
              >
                <strong>{item.trackingId || item.id}</strong> - {item.status}
              </button>
            )) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune mission disponible pour le moment.</div>}
          </div>
        </div>
      )}

      {mode === "qr" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">QR de mon adresse Mailport</h3>
          <p className="mt-4 text-slate-700">Un QR valide est emis uniquement apres paiement confirme. Aucun QR ne peut etre genere depuis le catalogue public. La recuperation des QR d'achats anterieurs reste a connecter au serveur.</p>
          <Link className="mt-4 inline-block font-bold text-omgGreen" to="/mailport/address-search">Rechercher une adresse</Link>
        </div>
      )}

      {(mode === "buy" || mode === "search") && (
        <>
          {renderAddressSearch()}
          {role === "buyer" && <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-black text-slate-900">
              {label("mailport_buy_address", "Acheter une adresse referentielle")}
            </h3>
            <select className="mt-4 w-full rounded border p-3" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="Payflow">Payflow</option>
              <option value="PayPal">PayPal</option>
              <option value="Stripe">Carte bancaire avec Stripe</option>
              <option disabled>MonCash — integration Mailport a terminer</option>
              <option disabled>NatCash — integration Mailport a terminer</option>
            </select>
            {selectedAddress && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <strong>{selectedAddress.street}</strong> - {selectedAddress.city}, {selectedAddress.country}
                <br />
                {label("amount", "Montant")}: 4.99 USD
              </div>
            )}
            <button type="button" disabled={busy || !selectedAddress || !serverAddresses} onClick={() => buyAddress()} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-50">
              Verifier l'achat avec {paymentMethod}
            </button>
          </div>}
        </>
      )}

      {mode === "track" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">{label("mailport_package_qr", "QR colis")}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded border p-3" value={trackingForm.trackingId} onChange={(event) => updateTracking("trackingId", event.target.value)} placeholder={label("tracking_number", "Numero de suivi")} />
            <input className="rounded border p-3" value={trackingForm.packageQr} onChange={(event) => updateTracking("packageQr", event.target.value)} placeholder={label("mailport_package_qr", "QR colis")} />
          </div>
          <button type="button" onClick={() => confirmPackageStep(label("mailport_track_package", "Suivre colis"))} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">
            {label("mailport_track_package", "Suivre colis")}
          </button>
          <div className="mt-4 space-y-2">
            {packages.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <strong>{item.trackingId || item.qrCode || item.id}</strong> - {item.status}
                <Link className="ml-3 font-bold text-omgGreen" to={`/mailport/parcels/${encodeURIComponent(item.trackingId || item.id)}`}>Voir le détail</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "delivery" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">{label("mailport_deliveries", "Livraisons Mailport")}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded border p-3" value={trackingForm.trackingId} onChange={(event) => updateTracking("trackingId", event.target.value)} placeholder={label("tracking_number", "Numero de suivi")} />
            <input className="rounded border p-3" value={trackingForm.packageQr} onChange={(event) => updateTracking("packageQr", event.target.value)} placeholder={label("mailport_package_qr", "QR colis")} />
            <input className="rounded border p-3" value={trackingForm.fromLocation} onChange={(event) => updateTracking("fromLocation", event.target.value)} placeholder={label("from_location", "Depart")} />
            <input className="rounded border p-3" value={trackingForm.toLocation} onChange={(event) => updateTracking("toLocation", event.target.value)} placeholder={label("to_location", "Arrivee")} />
            <label className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-700">
              {trackingForm.photoName || label("mailport_delivery_photo", "Photo preuve livraison")}
               <input type="file" accept="image/*" className="sr-only" onChange={(event) => setTrackingForm((current) => ({ ...current, photoName: event.target.files?.[0]?.name || "", proofPhotoFile: event.target.files?.[0] || null }))} />
            </label>
            <input className="rounded border p-3" value={trackingForm.signatureName} onChange={(event) => updateTracking("signatureName", event.target.value)} placeholder={label("signature", "Signature / nom receveur")} />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {role === "carrier" && <button type="button" onClick={() => confirmPackageStep(label("mailport_pickup_package", "Recuperer colis"))} className="rounded bg-omgGreen px-5 py-3 font-bold text-white">
              {label("mailport_pickup_package", "Recuperer colis")}
            </button>}
            {role === "owner" && <button type="button" onClick={() => confirmPackageStep(label("mailport_receive_package", "Recevoir colis"))} className="rounded border border-omgGreen px-5 py-3 font-bold text-omgGreen">
              {label("mailport_receive_package", "Recevoir colis")}
            </button>}
            <button type="button" disabled={busy || role !== "carrier"} onClick={() => confirmPackageStep("Verifier prochaine etape")} className="rounded border border-omgGold px-5 py-3 font-bold text-slate-800 disabled:opacity-50">
              Verifier la prochaine etape du colis
            </button>
          </div>
        </div>
      )}

      {mode === "revenue" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">{label("mailport_revenue", "Revenus Mailport")}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{label("packages", "Colis suivis")}</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{packages.length}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{label("payment_status", "Paiement")}</div>
              <div className="mt-2 font-black text-omgGreen">Solde non verifie</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">{label("revenue_status", "Statut des revenus")}</div>
              <div className="mt-2 font-black text-slate-900">{label("revenue_pending_backend", "Simulation frontend")}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => rememberActivity(label("mailport_revenue", "Revenus Mailport"), createReference("MAILPORT-REVENUE"), label("mailport_revenue_checked", "Le resume des revenus Mailport a ete consulte."))}
            className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white"
          >
            {label("refresh", "Actualiser")}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">
          {result.message}
          {result.reference && (
            <div className="mt-2">{label("reference", "Reference")}: {result.reference}</div>
          )}
          <p className="mt-2">Statut : {result.status || "non confirme"}</p>
          {addressQr && <div className="mt-4"><QRCodeSVG value={addressQr} size={192} title="QR adresse emis par le serveur" /><p>Conservez ce QR confidentiel : il n'est pas sauvegarde dans le navigateur.</p></div>}
          <Link className="mt-3 inline-block underline" to="/mailport/history">Consulter l'historique des colis</Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-5 py-3 font-bold text-slate-700">
          {label("return_menu", "Retour au menu")}
        </button>
      </div>
    </div>
  );
}

export default MailportWorkspace;
