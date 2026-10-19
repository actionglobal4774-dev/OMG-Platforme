import React, { useMemo, useState } from "react";
import {
  getCollection,
  saveCollection,
  prepareModulePayment,
  toggleFavorite,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";

const starterProperties = [
  { id: "PROP-1001", title: "Modern House Boston", country: "United States", city: "Boston", street: "Blue Hill Ave", postalCode: "02126", type: "House", bedrooms: 4, bathrooms: 3, price: 450000, currency: "USD", available: true },
  { id: "PROP-1002", title: "Apartment Paris", country: "France", city: "Paris", street: "Rue de Rivoli", postalCode: "75001", type: "Apartment", bedrooms: 2, bathrooms: 1, price: 300000, currency: "EUR", available: true },
  { id: "PROP-1003", title: "Terrain Port-au-Prince", country: "Haiti", city: "Port-au-Prince", street: "Route de Freres", postalCode: "HT6140", type: "Land", bedrooms: 0, bathrooms: 0, price: 85000, currency: "USD", available: true }
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("publier")) return "publish";
  if (value.includes("photo") || value.includes("video")) return "media";
  if (value.includes("disponibil")) return "availability";
  if (value.includes("contrat")) return "contract";
  if (value.includes("recevoir")) return "income";
  if (value.includes("favori")) return "favorites";
  if (value.includes("comparer")) return "compare";
  if (value.includes("payer")) return "payment";
  return "search";
}

function PropertyWorkspace({ selectedAction, profile, closeModuleAction }) {
  const mode = getMode(selectedAction);
  const [properties, setProperties] = useState(() => {
    const saved = getCollection("properties");
    return saved.length ? saved : starterProperties;
  });
  const [filters, setFilters] = useState({ country: "", city: "", street: "", postalCode: "", maxPrice: "" });
  const [draft, setDraft] = useState({ title: "", country: profile?.country || "", city: "", street: "", postalCode: "", type: "House", bedrooms: "", bathrooms: "", price: "", currency: "USD", description: "" });
  const [media, setMedia] = useState({ propertyId: "", fileName: "", mediaType: "photo" });
  const [availability, setAvailability] = useState({ propertyId: "", available: "yes", date: "" });
  const [contract, setContract] = useState({ propertyId: "", tenant: "", startDate: "", endDate: "", amount: "", confirmed: false });
  const [payment, setPayment] = useState({ propertyId: "", amount: "", method: "Payflow", pin: "", confirmed: false });
  const [compareIds, setCompareIds] = useState([]);
  const [favorites, setFavorites] = useState(() => getCollection("favorites_property"));
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");

  const visibleProperties = useMemo(() => properties.filter((item) => {
    const maxPrice = Number(filters.maxPrice);
    return (!filters.country || normalize(item.country).includes(normalize(filters.country)))
      && (!filters.city || normalize(item.city).includes(normalize(filters.city)))
      && (!filters.street || normalize(item.street).includes(normalize(filters.street)))
      && (!filters.postalCode || normalize(item.postalCode).includes(normalize(filters.postalCode)))
      && (!maxPrice || Number(item.price) <= maxPrice);
  }), [filters, properties]);
  const compared = properties.filter((item) => compareIds.includes(item.id));
  const propertyIncome = getCollection("payments").filter((item) => normalize(item.label).includes("property"));

  const complete = (action, nextReference, message) => {
    saveModuleActivity("property", {
      action,
      reference: nextReference,
      status: "confirmed",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(message);
  };

  const publish = () => {
    const price = Number(draft.price);
    if (!draft.title.trim() || !draft.country.trim() || !draft.city.trim() || !draft.street.trim() || !Number.isFinite(price) || price <= 0) {
      setNotice("Titre, pays, ville, rue et prix valide sont obligatoires.");
      return;
    }
    const result = upsertItem("properties", {
      ...draft,
      price,
      bedrooms: Number(draft.bedrooms || 0),
      bathrooms: Number(draft.bathrooms || 0),
      available: true,
      owner: profile?.email
    });
    const next = [result.data, ...properties.filter((item) => item.id !== result.data.id)];
    setProperties(next);
    saveCollection("properties", next);
    complete("Publier bien", result.data.id, "Bien immobilier publie.");
  };

  const saveMedia = () => {
    if (!media.propertyId || !media.fileName) {
      setNotice("Choisissez un bien et un fichier photo ou video.");
      return;
    }
    const next = properties.map((item) => item.id === media.propertyId
      ? { ...item, media: [...(item.media || []), { type: media.mediaType, name: media.fileName }] }
      : item);
    setProperties(next);
    saveCollection("properties", next);
    complete("Ajouter media", `PROPERTY-MEDIA-${Date.now()}`, "Photo ou video rattachee au bien.");
  };

  const saveAvailability = () => {
    if (!availability.propertyId) {
      setNotice("Choisissez un bien.");
      return;
    }
    const next = properties.map((item) => item.id === availability.propertyId ? { ...item, available: availability.available === "yes", availableDate: availability.date } : item);
    setProperties(next);
    saveCollection("properties", next);
    complete("Disponibilite", availability.propertyId, "Disponibilite du bien mise a jour.");
  };

  const saveContract = () => {
    if (!contract.propertyId || !contract.tenant.trim() || !contract.startDate || !contract.endDate || Number(contract.amount) <= 0) {
      setNotice("Bien, locataire, dates et montant sont obligatoires.");
      return;
    }
    if (contract.endDate < contract.startDate) {
      setNotice("La date de fin doit etre posterieure a la date de debut.");
      return;
    }
    if (!contract.confirmed) {
      setNotice("Confirmez les informations du contrat.");
      return;
    }
    const result = upsertItem("property_contracts", { ...contract, owner: profile?.email, status: "signed-locally" });
    complete("Contrat numerique", result.data.id, "Contrat numerique prepare et enregistre.");
  };

  const payOwner = async () => {
    const amount = Number(payment.amount);
    if (!payment.propertyId || !Number.isFinite(amount) || amount <= 0) {
      setNotice("Choisissez un bien et entrez un montant valide.");
      return;
    }
    if (!/^\d{4}$/.test(payment.pin)) {
      setNotice("Entrez un PIN Payflow a 4 chiffres.");
      return;
    }
    if (!payment.confirmed) {
      setNotice("Confirmez le bien, le montant et les frais.");
      return;
    }
    const fee = amount * 0.0499;
    try {
      const result = await prepareModulePayment({ moduleId: "property", action: "Payer proprietaire", amount, currency: "USD", label: "Property owner payment", method: payment.method, propertyId: payment.propertyId, platformFee: fee });
      complete("Payer proprietaire", result.data.id, result.live ? `Paiement prepare sur le serveur. Commission plateforme : ${fee.toFixed(2)} USD.` : `Paiement de demonstration prepare. Commission plateforme : ${fee.toFixed(2)} USD.`);
    } catch (error) { setNotice(error?.message || "Paiement proprietaire impossible."); }
  };

  const togglePropertyFavorite = (item) => {
    const result = toggleFavorite("property", item);
    setFavorites(result.data.items);
  };

  const toggleCompare = (id) => {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-3));
  };

  const PropertyCards = ({ items = visibleProperties, allowFavorite = true, allowCompare = true }) => (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-black text-slate-900">{item.title}</h4>
          <p className="mt-1 text-sm text-slate-600">{item.city}, {item.country} · {item.type}</p>
          <p className="mt-1 text-sm text-slate-600">{item.bedrooms} ch. · {item.bathrooms} sdb · {item.available ? "Disponible" : "Indisponible"}</p>
          <p className="mt-3 text-xl font-black text-omgGreen">{Number(item.price).toLocaleString()} {item.currency}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowFavorite && <button type="button" onClick={() => togglePropertyFavorite(item)} className="rounded border border-omgGreen px-3 py-2 text-sm font-bold text-omgGreen">{favorites.some((fav) => fav.id === item.id) ? "Retirer favori" : "Ajouter favori"}</button>}
            {allowCompare && <button type="button" onClick={() => toggleCompare(item.id)} className="rounded border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">{compareIds.includes(item.id) ? "Retirer comparaison" : "Comparer"}</button>}
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <div className="mt-5 space-y-5">
      {mode === "search" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Recherche immobiliere</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {["country", "city", "street", "postalCode", "maxPrice"].map((field) => (
              <input key={field} className="rounded border p-3" value={filters[field]} onChange={(e) => setFilters({ ...filters, [field]: e.target.value })} placeholder={{ country: "Pays", city: "Ville", street: "Rue", postalCode: "Code postal", maxPrice: "Prix maximum" }[field]} />
            ))}
          </div>
          {visibleProperties.length ? <PropertyCards /> : <div className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-800">Aucun bien ne correspond aux filtres.</div>}
        </section>
      )}

      {mode === "favorites" && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">Mes favoris</h3>{favorites.length ? <PropertyCards items={favorites} allowFavorite allowCompare /> : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-600">Aucun favori.</div>}</section>}

      {mode === "compare" && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">Comparer des biens</h3><p className="mt-2 text-sm text-slate-600">Maximum 3 biens.</p><PropertyCards items={properties} allowFavorite={false} allowCompare />{compared.length > 0 && <div className="mt-5"><h4 className="font-black text-slate-900">Comparaison selectionnee</h4><PropertyCards items={compared} allowFavorite={false} allowCompare={false} /></div>}</section>}

      {mode === "publish" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Publier un bien</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["title", "country", "city", "street", "postalCode", "bedrooms", "bathrooms", "price"].map((field) => <input key={field} className="rounded border p-3" type={["bedrooms", "bathrooms", "price"].includes(field) ? "number" : "text"} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} placeholder={{ title: "Titre", country: "Pays", city: "Ville", street: "Rue", postalCode: "Code postal", bedrooms: "Chambres", bathrooms: "Salles de bain", price: "Prix" }[field]} />)}
            <select className="rounded border p-3" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option>House</option><option>Apartment</option><option>Land</option><option>Commercial</option></select>
            <select className="rounded border p-3" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}><option>USD</option><option>EUR</option><option>HTG</option></select>
            <textarea className="rounded border p-3 md:col-span-2" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
          </div>
          <button type="button" onClick={publish} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Publier le bien</button>
        </section>
      )}

      {mode === "media" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Photos et videos du bien</h3>
          <select className="mt-4 w-full rounded border p-3" value={media.propertyId} onChange={(e) => setMedia({ ...media, propertyId: e.target.value })}><option value="">Choisir un bien</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          <select className="mt-3 w-full rounded border p-3" value={media.mediaType} onChange={(e) => setMedia({ ...media, mediaType: e.target.value })}><option value="photo">Photo</option><option value="video">Video</option></select>
          <label className="mt-3 block rounded border border-dashed p-3 text-slate-700">{media.fileName || "Choisir un fichier"}<input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => setMedia({ ...media, fileName: e.target.files?.[0]?.name || "" })} /></label>
          <button type="button" onClick={saveMedia} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer le media</button>
        </section>
      )}

      {mode === "availability" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Disponibilite du bien</h3>
          <select className="mt-4 w-full rounded border p-3" value={availability.propertyId} onChange={(e) => setAvailability({ ...availability, propertyId: e.target.value })}><option value="">Choisir un bien</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          <select className="mt-3 w-full rounded border p-3" value={availability.available} onChange={(e) => setAvailability({ ...availability, available: e.target.value })}><option value="yes">Disponible</option><option value="no">Indisponible</option></select>
          <input className="mt-3 w-full rounded border p-3" type="date" value={availability.date} onChange={(e) => setAvailability({ ...availability, date: e.target.value })} />
          <button type="button" onClick={saveAvailability} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Mettre a jour</button>
        </section>
      )}

      {mode === "contract" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Contrat numerique</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded border p-3 md:col-span-2" value={contract.propertyId} onChange={(e) => setContract({ ...contract, propertyId: e.target.value })}><option value="">Choisir un bien</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <input className="rounded border p-3" placeholder="Locataire ou acheteur" value={contract.tenant} onChange={(e) => setContract({ ...contract, tenant: e.target.value })} />
            <input className="rounded border p-3" type="number" min="0" placeholder="Montant" value={contract.amount} onChange={(e) => setContract({ ...contract, amount: e.target.value })} />
            <input className="rounded border p-3" type="date" value={contract.startDate} onChange={(e) => setContract({ ...contract, startDate: e.target.value })} />
            <input className="rounded border p-3" type="date" value={contract.endDate} onChange={(e) => setContract({ ...contract, endDate: e.target.value })} />
          </div>
          <label className="mt-4 flex gap-3 rounded-xl border p-3 text-slate-700"><input type="checkbox" checked={contract.confirmed} onChange={(e) => setContract({ ...contract, confirmed: e.target.checked })} /><span>Je confirme les informations du contrat.</span></label>
          <button type="button" onClick={saveContract} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer le contrat</button>
        </section>
      )}

      {mode === "payment" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Payer le proprietaire</h3>
          <select className="mt-4 w-full rounded border p-3" value={payment.propertyId} onChange={(e) => setPayment({ ...payment, propertyId: e.target.value })}><option value="">Choisir un bien</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input className="rounded border p-3" type="number" min="0" placeholder="Montant" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <select className="rounded border p-3" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><option>Payflow</option><option>Carte bancaire</option><option>Banque</option></select>
            <input className="rounded border p-3" type="password" inputMode="numeric" maxLength="4" placeholder="PIN Payflow" value={payment.pin} onChange={(e) => setPayment({ ...payment, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-slate-700">Commission plateforme : 4.99%</div>
          <label className="mt-3 flex gap-3 rounded-xl border p-3 text-slate-700"><input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} /><span>Je confirme le bien, le montant et les frais.</span></label>
          <button type="button" onClick={payOwner} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Payer le proprietaire</button>
        </section>
      )}

      {mode === "income" && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">Paiements recus</h3><div className="mt-4 text-3xl font-black text-omgGreen">{propertyIncome.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2)} USD</div><div className="mt-4 space-y-3">{propertyIncome.length ? propertyIncome.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-slate-700">{item.id} · {item.amount} {item.currency}</div>) : <div className="rounded-xl bg-slate-50 p-4 text-slate-600">Aucun paiement recu.</div>}</div></section>}

      {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">{notice}{reference && <div className="mt-2">Reference : {reference}</div>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-5 py-3 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default PropertyWorkspace;
