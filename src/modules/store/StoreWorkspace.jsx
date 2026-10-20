import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isDemoMode } from "../../services/runtimePolicy";
import { ownsStoreProduct, validStoreQuote, validateStoreCart } from "./storeJourney";
import { validateStoreAddress, validateStorePhoto, validateStoreProduct } from "./storeFormValidation";
import {
  addToCart,
  generateReceipt,
  getCollection,
  saveCollection,
  updateCartQuantity,
  upsertItem
} from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";
import {
  completeSecureStoreOrderWithPayflow,
  createPayPalOrder,
  createSecureStoreOrder,
  createStripeCheckoutSession
} from "../../services/backendService";

export const starterProducts = [
  { id: "STORE-P-1001", name: "Sac OMG Global", price: 45, currency: "USD", stock: 12, category: "Accessoires" },
  { id: "STORE-P-1002", name: "Livre University Preparation", price: 19.99, currency: "USD", stock: 30, category: "Education" },
  { id: "STORE-P-1003", name: "Kit maison connectee", price: 89, currency: "USD", stock: 8, category: "Maison" }
];

function normalize(value) {
  return String(value || "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("ouvrir boutique")) return "shop";
  if (value.includes("ajouter produits")) return "product";
  if (value.includes("photo")) return "photos";
  if (value.includes("stock")) return "stock";
  if (value.includes("vente")) return "sales";
  if (value.includes("adresse")) return "address";
  if (value.includes("payer")) return "checkout";
  if (value.includes("suivre")) return "tracking";
  return "catalog";
}

function createReference(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

function StoreWorkspace({ selectedAction, profile, closeModuleAction }) {
  const mode = getMode(selectedAction);
  const [products, setProducts] = useState(() => {
    const saved = getCollection("store_products");
    return saved.length ? saved : isDemoMode ? starterProducts : [];
  });
  const [cart, setCart] = useState(() => getCollection("cart"));
  const [shop, setShop] = useState({ name: "", category: "", city: "", payout: "Payflow" });
  const [product, setProduct] = useState({ name: "", category: "", price: "", stock: "", description: "" });
  const [photo, setPhoto] = useState({ productId: "", fileName: "" });
  const [address, setAddress] = useState(() => getCollection("store_addresses").find((item) => item.owner === profile?.email) || { reference: "", recipient: "", instructions: "" });
  const [payment, setPayment] = useState({ method: "payflow", confirmed: false });
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const shops = getCollection("store_shops");
  const [review, setReview] = useState(null);
  const pending = useRef(false);

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart]
  );
  const orders = getCollection("store_orders").filter((item) => item.customer === profile?.email);
  const sales = getCollection("payments").filter((item) => normalize(item.label).includes("store"));

  const complete = (action, nextReference, message, status = "prepared") => {
    saveModuleActivity("store", {
      action,
      reference: nextReference,
      status,
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(message);
  };

  const addProductToCart = (item) => {
    if ((cart.find((entry) => entry.id === item.id)?.quantity || 0) >= Number(item.stock)) { setNotice("Stock maximum atteint."); return; }
    const result = addToCart(item, 1);
    setCart(result.data);
    setNotice(`${item.name} ajoute au panier.`);
  };

  const changeQuantity = (id, quantity) => {
    if (quantity > Number(products.find((item) => item.id === id)?.stock || 0)) { setNotice("Quantite superieure au stock disponible."); return; }
    const result = updateCartQuantity(id, quantity);
    if (result.ok) setCart(result.data);
  };

  const saveShop = () => {
    if (shops.some((item) => item.owner === profile?.email && normalize(item.name).trim() === normalize(shop.name).trim() && normalize(item.city).trim() === normalize(shop.city).trim())) { setNotice("Cette boutique existe deja pour ce compte et cette ville."); return; }
    if (!shop.name.trim() || !shop.category.trim() || !shop.city.trim()) {
      setNotice("Nom de boutique, categorie et ville sont obligatoires.");
      return;
    }
    const result = upsertItem("store_shops", { ...shop, owner: profile?.email, status: "active" });
    complete("Ouvrir boutique", result.data.id, "Boutique Store enregistree.");
  };

  const saveProduct = () => {
    const validation = validateStoreProduct(product, shops, profile?.email);
    if (validation) { setNotice(validation); return; }
    const price = Number(product.price);
    const stock = Number(product.stock);
    if (!product.name.trim() || !product.category.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      setNotice("Nom, categorie, prix valide et stock entier sont obligatoires.");
      return;
    }
    const result = upsertItem("store_products", { ...product, price, stock, currency: "USD", seller: profile?.email });
    const next = [result.data, ...products.filter((item) => item.id !== result.data.id)];
    setProducts(next);
    saveCollection("store_products", next);
    complete("Ajouter produit", result.data.id, "Produit Store enregistre.");
  };

  const savePhoto = () => {
    const validation = validateStorePhoto(photoFile);
    if (validation) { setNotice(validation); return; }
    if (!ownsStoreProduct(products.find((item) => item.id === photo.productId), profile?.email)) { setNotice("Choisissez votre propre produit."); return; }
    if (!photo.productId || !photo.fileName) {
      setNotice("Choisissez un produit et une photo.");
      return;
    }
    const next = products.map((item) => item.id === photo.productId ? { ...item, photoName: photo.fileName } : item);
    setProducts(next);
    saveCollection("store_products", next);
    complete("Ajouter photo produit", createReference("STORE-PHOTO"), "Nom du fichier conserve localement. Aucune photo televersee.");
  };

  const saveAddress = () => {
    const validation = validateStoreAddress(address);
    if (validation) { setNotice(validation); return; }
    if (!address.reference.trim() || !address.recipient.trim()) {
      setNotice("Reference Mailport et nom du destinataire sont obligatoires.");
      return;
    }
    const result = upsertItem("store_addresses", { ...address, owner: profile?.email });
    complete("Choisir adresse", result.data.id, "Adresse Mailport enregistree pour la commande.");
  };

  const checkout = async (confirmed = false) => {
    if (pending.current) return;
    setNotice("");
    const addressError = validateStoreAddress(address);
    if (addressError) { setNotice(addressError); return; }
    const validation = validateStoreCart(cart, products);
    if (validation) { setNotice(validation); return; }
    if (!cart.length) {
      setNotice("Le panier est vide.");
      return;
    }
    if (!address.reference?.trim() || !address.recipient?.trim()) {
      setNotice("Choisissez d'abord une adresse Mailport achetee. La reference demandee est le numero d'achat Mailport.");
      return;
    }
    if (!payment.confirmed) {
      setNotice("Confirmez le panier, le total et le moyen de paiement.");
      return;
    }
    setProcessing(true);
    pending.current = true;
    try {
      const order = confirmed ? review : await createSecureStoreOrder({
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod: payment.method,
        mailportPurchaseId: address.reference.trim(),
        recipientName: address.recipient.trim(),
        deliveryInstructions: address.instructions.trim()
      });
      if (!validStoreQuote(order)) throw new Error("Le serveur n'a pas fourni un devis de commande valide.");
      if (!confirmed) { setReview(order); return; }
      if (payment.method === "payflow") {
        const result = await completeSecureStoreOrderWithPayflow(order.orderId);
        const localOrder = upsertItem("store_orders", { id: result.orderId, items: cart, total: result.total, status: result.status, packageId: result.packageId, mailportStatus: result.mailportStatus, customer: profile?.email });
        generateReceipt({ id: result.orderId, amount: result.total, currency: result.currency, label: "Store Online", method: "Payflow" });
        saveCollection("cart", []);
        setCart([]);
        setReview(null);
        setPayment((current) => ({ ...current, confirmed: false }));
        complete("Payer commande", localOrder.data.id, "Commande payee avec Payflow. Le colis Mailport a ete cree.", "confirmed");
        return;
      }
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      if (payment.method === "paypal") {
        const paypal = await createPayPalOrder({ amount: order.total, currency: order.currency, moduleId: "store", action: `store_order:${order.orderId}`, returnUrl: `${baseUrl}#/paypal-return`, cancelUrl: `${baseUrl}#/paypal-cancel` });
        const approvalUrl = paypal.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
        if (!approvalUrl) throw new Error("PayPal n'a pas fourni de lien d'autorisation.");
        sessionStorage.setItem("omgPayPalPending", JSON.stringify({ orderId: paypal.orderId, storeOrderId: order.orderId, moduleId: "store" }));
        window.location.assign(approvalUrl);
        return;
      }
      const stripe = await createStripeCheckoutSession({ amount: order.total, currency: order.currency, moduleId: "store", action: `store_order:${order.orderId}`, successUrl: `${baseUrl}#/stripe-return?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${baseUrl}#/stripe-cancel` });
      if (!stripe.redirectUrl) throw new Error("Stripe n'a pas fourni de page de paiement securisee.");
      sessionStorage.setItem("omgStripePending", JSON.stringify({ storeOrderId: order.orderId, moduleId: "store" }));
      window.location.assign(stripe.redirectUrl);
    } catch (error) {
      setNotice(error?.message || "La commande Store n'a pas pu etre preparee.");
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };

  const updateStock = (id, value) => {
    if (!ownsStoreProduct(products.find((item) => item.id === id), profile?.email)) { setNotice("Vous ne pouvez modifier que vos propres produits."); return; }
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) return;
    const next = products.map((item) => item.id === id ? { ...item, stock } : item);
    setProducts(next);
    saveCollection("store_products", next);
  };

  if (review) return <section className="mt-5 space-y-4 rounded-2xl border bg-white p-5"><h3 className="text-xl font-bold">Confirmer le total serveur</h3><p>Commande {review.orderId}</p><p>Marchandises : {review.merchandiseAmount} USD · Livraison : {review.deliveryFee.toFixed(2)} USD</p><p className="font-bold">Total : {review.total.toFixed(2)} USD</p><p>Destinataire : {address.recipient} · Achat Mailport : {address.reference}</p><p>Moyen : {payment.method}. La confirmation peut debiter Payflow ou ouvrir le prestataire externe.</p><button disabled={processing} onClick={() => checkout(true)} className="rounded bg-omgGreen p-3 text-white">{processing ? "Traitement…" : "Confirmer le paiement"}</button><button disabled={processing} onClick={() => { setReview(null); setPayment((current) => ({ ...current, confirmed: false })); }} className="ml-3 rounded border p-3">Retour sans payer</button><p className="text-sm">Une commande en attente reste creee sur le serveur. En cas de reponse perdue, verifiez son statut avant toute nouvelle tentative.</p>{notice && <p role="alert">{notice}</p>}</section>;

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Catalogue et modifications locaux : publication et stock restent a verifier sur le serveur. Seule une reponse du service de paiement confirme un achat.</p>
      {mode === "catalog" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Produits Store</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {products.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-black text-slate-900">{item.name}</h4>
                <p className="mt-1 text-sm text-slate-600">{item.category} · Stock {item.stock}</p>
                <p className="mt-3 text-xl font-black text-omgGreen">{Number(item.price).toFixed(2)} {item.currency || "USD"}</p>
                <button type="button" disabled={item.stock <= 0} onClick={() => addProductToCart(item)} className="mt-3 rounded bg-omgGreen px-4 py-2 font-bold text-white disabled:opacity-50">Ajouter au panier</button>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 font-bold text-slate-800">Panier : {cart.length} produit(s) · {cartTotal.toFixed(2)} USD</div>
        </section>
      )}

      {mode === "shop" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Ouvrir une boutique</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded border p-3" placeholder="Nom de la boutique" value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
            <input className="rounded border p-3" placeholder="Categorie" value={shop.category} onChange={(e) => setShop({ ...shop, category: e.target.value })} />
            <input className="rounded border p-3" placeholder="Ville" value={shop.city} onChange={(e) => setShop({ ...shop, city: e.target.value })} />
            <select className="rounded border p-3" value={shop.payout} onChange={(e) => setShop({ ...shop, payout: e.target.value })}>
              <option>Payflow</option><option>Compte bancaire</option>
            </select>
          </div>
          <button type="button" onClick={saveShop} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer la boutique</button>
        </section>
      )}

      {mode === "product" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block">Boutique du produit<select aria-label="Boutique du produit" className="mt-2 w-full rounded border p-3" value={product.shopId || ""} onChange={(event) => setProduct({ ...product, shopId: event.target.value })}><option value="">Choisir ma boutique</option>{shops.filter((item) => item.owner === profile?.email).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <h3 className="text-lg font-black text-slate-900">Ajouter un produit</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded border p-3" placeholder="Nom du produit" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
            <input className="rounded border p-3" placeholder="Categorie" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
            <input className="rounded border p-3" type="number" min="0" placeholder="Prix USD" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} />
            <input className="rounded border p-3" type="number" min="0" placeholder="Stock" value={product.stock} onChange={(e) => setProduct({ ...product, stock: e.target.value })} />
            <textarea className="rounded border p-3 md:col-span-2" placeholder="Description" value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} />
          </div>
          <button type="button" onClick={saveProduct} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer le produit</button>
        </section>
      )}

      {mode === "photos" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Ajouter une photo produit</h3>
          <select className="mt-4 w-full rounded border p-3" value={photo.productId} onChange={(e) => setPhoto({ ...photo, productId: e.target.value })}>
            <option value="">Choisir un produit</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label className="mt-3 block rounded border border-dashed p-3 text-slate-700">
            {photo.fileName || "Choisir une photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { setPhotoFile(e.target.files?.[0] || null); setPhoto({ ...photo, fileName: e.target.files?.[0]?.name || "" }); }} />
          </label>
          <button type="button" onClick={savePhoto} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer la photo</button>
        </section>
      )}

      {mode === "stock" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Gestion du stock</h3>
          <div className="mt-4 space-y-3">
            {products.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <strong className="text-slate-900">{item.name}</strong>
                <input className="w-28 rounded border p-2" type="number" min="0" value={item.stock} onChange={(e) => updateStock(item.id, e.target.value)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === "address" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Adresse de livraison Mailport</h3>
          <p className="mt-2 text-sm">Numero d'achat Mailport uniquement, pas le contenu confidentiel du QR. Le serveur verifiera la propriete et la validite avant commande.</p>
          <div className="mt-4 grid gap-3">
            <input className="rounded border p-3" placeholder="Reference ou QR Mailport" value={address.reference} onChange={(e) => setAddress({ ...address, reference: e.target.value })} />
            <input className="rounded border p-3" placeholder="Nom du destinataire" value={address.recipient} onChange={(e) => setAddress({ ...address, recipient: e.target.value })} />
            <textarea className="rounded border p-3" placeholder="Instructions de livraison" value={address.instructions} onChange={(e) => setAddress({ ...address, instructions: e.target.value })} />
          </div>
          <button type="button" onClick={saveAddress} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Utiliser cette adresse</button>
        </section>
      )}

      {mode === "checkout" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Paiement de la commande</h3>
          <div className="mt-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-slate-900">{item.name}</span>
                <input className="w-20 rounded border p-2" type="number" min="0" value={item.quantity} onChange={(e) => changeQuantity(item.id, Number(e.target.value))} />
              </div>
            ))}
          </div>
          <div className="mt-4 text-xl font-black text-slate-900">Total : {cartTotal.toFixed(2)} USD</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded border p-3 md:col-span-2" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              <option value="payflow">Payflow</option><option value="stripe">Carte bancaire (Stripe)</option><option value="paypal">PayPal</option>
            </select>
          </div>
          <label className="mt-4 flex gap-3 rounded-xl border p-3 text-slate-700">
            <input type="checkbox" checked={payment.confirmed} onChange={(e) => setPayment({ ...payment, confirmed: e.target.checked })} />
            <span>Je confirme le panier, le total et le paiement.</span>
          </label>
          <Link to="/store/checkout?task=Choisir%20adresse" className="mt-3 block font-bold text-omgGreen">Choisir ou modifier l'adresse Mailport</Link>
          <button type="button" disabled={processing} onClick={() => checkout()} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-60">{processing ? "Preparation securisee..." : "Obtenir le total serveur avant paiement"}</button>
        </section>
      )}

      {mode === "tracking" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Suivi des commandes</h3>
          <div className="mt-4 space-y-3">
            {orders.length ? orders.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-4 text-slate-700">
                <strong>{item.id}</strong> · {item.status} · Mailport : {item.mailportStatus}
                {item.packageId && <Link to={`/mailport/tracking?reference=${encodeURIComponent(item.packageId)}`} className="mt-2 block font-bold text-omgGreen">Suivre le colis Mailport</Link>}
              </div>
            )) : <div className="rounded-xl bg-slate-50 p-4 text-slate-600">Aucune commande pour le moment.</div>}
          </div>
        </section>
      )}

      {mode === "sales" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">Ventes Store</h3>
          <p className="mt-4 text-slate-700">Historique local non rapproche avec les versements vendeur. Aucun total de revenus reels verifie.</p>
          <div className="mt-4 space-y-3">
            {sales.length ? sales.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-slate-700">{item.id} · {item.amount} {item.currency}</div>) : <div className="rounded-xl bg-slate-50 p-4 text-slate-600">Aucune vente enregistree.</div>}
          </div>
        </section>
      )}

      {notice && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900">{notice}{reference && <div className="mt-2">Reference : {reference}</div>}{mode === "address" && <Link to="/store/checkout" className="mt-3 block underline">Continuer vers le paiement</Link>}{mode === "checkout" && reference && <Link to="/store/orders" className="mt-3 block underline">Voir mes commandes</Link>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-5 py-3 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default StoreWorkspace;

export function StorePublicCatalog({ onCreateProfile }) {
  const savedProducts = getCollection("store_products");
  const products = savedProducts.length ? savedProducts : isDemoMode ? starterProducts : [];

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black text-omgGold">Produits disponibles</h2>
        <span className="text-sm font-semibold text-omgGreen">Catalogue public · Aucun profil requis</span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {products.map((item) => (
          <article key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
            <h3 className="font-black text-white">{item.name}</h3>
            <p className="mt-1 text-sm text-gray-400">{item.category} · Stock {item.stock}</p>
            <p className="mt-3 text-xl font-black text-omgGreen">{Number(item.price).toFixed(2)} {item.currency || "USD"}</p>
          </article>
        ))}
      </div>
      <button type="button" onClick={onCreateProfile} className="mt-5 rounded bg-omgGreen px-5 py-3 font-bold text-white">
        Creer un profil pour acheter
      </button>
    </section>
  );
}
