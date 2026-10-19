import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { addToCart, getCollection, saveCollection, updateCartQuantity, upsertItem } from "../../services/localActionService";
import StoreWorkspace, { starterProducts } from "./StoreWorkspace";

const sections = [
  ["search", "Recherche"], ["product", "Produits"], ["categories", "Categories"],
  ["cart", "Panier"], ["checkout", "Paiement"], ["orders", "Commandes"],
  ["tracking", "Suivi"], ["seller-center", "Espace vendeur"], ["products", "Gestion produits"],
  ["map", "Carte"], ["reviews", "Avis"], ["commerce-ai", "Commerce AI"]
];

const sellerOnly = new Set(["seller-center", "products"]);

function readProducts() {
  const saved = getCollection("store_products");
  return saved.length ? saved : starterProducts;
}

function ProductGrid({ products, onAdded }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {products.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-100 text-4xl" aria-hidden="true">🛍️</div>
          <h2 className="font-black text-slate-900">{item.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{item.category} · Stock {item.stock}</p>
          <p className="mt-3 text-xl font-black text-omgGreen">{Number(item.price).toFixed(2)} {item.currency || "USD"}</p>
          <button
            type="button"
            disabled={item.stock <= 0}
            onClick={() => { addToCart(item, 1); onAdded(item); }}
            className="mt-3 rounded bg-omgGreen px-4 py-2 font-bold text-white disabled:opacity-50"
          >Ajouter au panier</button>
        </article>
      ))}
    </div>
  );
}

function CatalogSection({ mode }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [notice, setNotice] = useState("");
  const products = readProducts();
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))];
  const visible = useMemo(() => products.filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.category} ${item.description || ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!category || item.category === category);
  }), [products, query, category]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <input aria-label="Rechercher un produit" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded border p-3" placeholder="Produit, categorie ou mot-cle" />
        <select aria-label="Filtrer par categorie" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded border p-3">
          <option value="">Toutes les categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {mode === "categories" && <p className="font-bold text-slate-700">{categories.length} categories · {visible.length} produits</p>}
      {visible.length ? <ProductGrid products={visible} onAdded={(item) => setNotice(`${item.name} ajoute au panier.`)} /> : <div className="rounded-xl bg-white p-5 text-slate-600">Aucun produit ne correspond a cette recherche.</div>}
      {notice && <div className="rounded-xl bg-green-50 p-4 font-semibold text-green-900">{notice} <Link className="underline" to="/store/cart">Voir le panier</Link></div>}
    </section>
  );
}

function CartSection() {
  const [cart, setCart] = useState(() => getCollection("cart"));
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const change = (id, quantity) => {
    const result = updateCartQuantity(id, quantity);
    if (result.ok) setCart(result.data);
  };
  const clear = () => { saveCollection("cart", []); setCart([]); };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-black text-slate-900">Votre panier</h2>
      <div className="mt-4 space-y-3">
        {cart.length ? cart.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span className="font-bold text-slate-900">{item.name}</span>
            <input aria-label={`Quantite ${item.name}`} className="w-24 rounded border p-2" type="number" min="0" value={item.quantity} onChange={(event) => change(item.id, Number(event.target.value))} />
          </div>
        )) : <p className="rounded-xl bg-slate-50 p-4 text-slate-600">Votre panier est vide.</p>}
      </div>
      <p className="mt-4 text-2xl font-black text-omgGreen">Total : {total.toFixed(2)} USD</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/store/checkout" className="rounded bg-omgGreen px-5 py-3 font-bold text-white">Passer au paiement</Link>
        {cart.length > 0 && <button type="button" onClick={clear} className="rounded border px-5 py-3 font-bold">Vider le panier</button>}
      </div>
    </section>
  );
}

function MapSection() {
  const shops = getCollection("store_shops");
  const locations = shops.length ? shops : [
    { id: "map-1", name: "OMG Boston Store", city: "Boston", category: "General" },
    { id: "map-2", name: "OMG Port-au-Prince", city: "Port-au-Prince", category: "Marketplace" }
  ];
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-emerald-50 text-center font-black text-emerald-900">Carte Store mock<br />Localisation approximative</div>
      <div className="space-y-3">{locations.map((shop) => <article key={shop.id} className="rounded-xl border bg-white p-4"><h2 className="font-black">{shop.name}</h2><p className="text-slate-600">{shop.city} · {shop.category}</p><button type="button" className="mt-2 rounded border px-3 py-2 font-bold">Voir la boutique</button></article>)}</div>
    </section>
  );
}

function ReviewsSection({ profile }) {
  const [reviews, setReviews] = useState(() => getCollection("store_reviews"));
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const submit = () => {
    if (!comment.trim()) { setNotice("Veuillez ecrire un commentaire."); return; }
    const result = upsertItem("store_reviews", { rating: Number(rating), comment: comment.trim(), author: profile?.email || "Client Store" });
    setReviews([result.data, ...reviews]); setComment(""); setNotice("Avis publie.");
  };
  return (
    <section className="grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5"><h2 className="font-black">Publier un avis</h2><select aria-label="Note" className="mt-3 w-full rounded border p-3" value={rating} onChange={(event) => setRating(event.target.value)}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} etoile{n > 1 ? "s" : ""}</option>)}</select><textarea aria-label="Commentaire" className="mt-3 w-full rounded border p-3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Votre experience" /><button type="button" onClick={submit} className="mt-3 rounded bg-omgGreen px-4 py-2 font-bold text-white">Publier</button>{notice && <p className="mt-3 font-semibold">{notice}</p>}</div>
      <div className="space-y-3">{reviews.length ? reviews.map((review) => <article key={review.id} className="rounded-xl border bg-white p-4"><strong>{review.rating}/5</strong><p className="mt-2 text-slate-700">{review.comment}</p></article>) : <p className="rounded-xl bg-white p-5 text-slate-600">Aucun avis publie.</p>}</div>
    </section>
  );
}

function CommerceAiSection() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const ask = () => {
    if (!question.trim()) { setAnswer("Decrivez le produit ou le besoin a analyser."); return; }
    const products = readProducts();
    const best = products.find((item) => `${item.name} ${item.category}`.toLowerCase().includes(question.toLowerCase())) || products[0];
    setAnswer(best ? `Suggestion Store : ${best.name}, ${Number(best.price).toFixed(2)} ${best.currency || "USD"}, stock ${best.stock}.` : "Aucun produit disponible pour le moment.");
  };
  return <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Assistant Commerce AI</h2><textarea aria-label="Question Commerce AI" value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-4 w-full rounded border p-3" placeholder="Comparer un prix, trouver une alternative ou ameliorer une fiche" /><button type="button" onClick={ask} className="mt-3 rounded bg-omgGreen px-5 py-3 font-bold text-white">Analyser</button>{answer && <div className="mt-4 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-900">{answer}</div>}</section>;
}

export default function StoreSectionPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { user, getModuleProfile } = useAuth();
  const profile = getModuleProfile("store");
  const isSeller = String(profile?.userType || "").toLowerCase().includes("propriet") || String(profile?.userType || "").toLowerCase().includes("owner");
  const known = sections.some(([slug]) => slug === section);
  if (!known) return <DashboardLayout><div className="rounded-xl bg-white p-6"><h1 className="text-2xl font-black">Page Store introuvable</h1><Link to="/store" className="mt-4 inline-block font-bold text-omgGreen">Retour a Store</Link></div></DashboardLayout>;

  const title = sections.find(([slug]) => slug === section)?.[1];
  const workspaceAction = { checkout: "Payer", orders: "Suivre livraison", tracking: "Suivre livraison", "seller-center": "Voir ventes", products: "Ajouter produits" }[section];
  let content;
  if (sellerOnly.has(section) && !isSeller) content = <div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Acces vendeur requis</h2><p className="mt-2 text-slate-600">Cette fonction est reservee au proprietaire d'une boutique Store.</p><Link to="/store" className="mt-4 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Configurer mon profil Store</Link></div>;
  else if (["search", "product", "categories"].includes(section)) content = <CatalogSection mode={section} />;
  else if (section === "cart") content = <CartSection />;
  else if (section === "map") content = <MapSection />;
  else if (section === "reviews") content = <ReviewsSection profile={profile} />;
  else if (section === "commerce-ai") content = <CommerceAiSection />;
  else if (!user || !profile) content = <div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Profil Store requis</h2><p className="mt-2 text-slate-600">Connectez-vous et creez votre profil avant cette operation.</p><Link to="/store" className="mt-4 inline-block rounded bg-omgGreen px-5 py-3 font-bold text-white">Ouvrir Store</Link></div>;
  else content = <StoreWorkspace selectedAction={workspaceAction} profile={profile} closeModuleAction={() => navigate("/store")} />;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div><Link to="/store" className="font-bold text-omgGreen">← Tableau Store</Link><h1 className="mt-2 text-3xl font-black text-slate-900">{title}</h1></div>
        <nav aria-label="Navigation Store" className="flex gap-2 overflow-x-auto pb-2">{sections.map(([slug, label]) => <Link key={slug} to={`/store/${slug}`} aria-current={section === slug ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${section === slug ? "bg-omgGreen text-white" : "border bg-white text-slate-700"}`}>{label}</Link>)}</nav>
        {content}
      </div>
    </DashboardLayout>
  );
}
