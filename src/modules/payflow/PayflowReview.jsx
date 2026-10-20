import React from "react";

export default function PayflowReview({ title, rows, pin, confirmed, onPin, onConfirmed, onSubmit, onEdit, busy, error }) {
  return <form onSubmit={onSubmit} aria-label="Confirmation Payflow" className="omg-card mt-6 rounded-xl p-5 text-white">
    <h2 className="text-2xl font-bold text-omgGold">{title}</h2>
    <ol aria-label="Étapes" className="mt-3 flex flex-wrap gap-3 text-sm"><li>Saisie terminée</li><li aria-current="step">Vérification et confirmation</li><li>Résultat</li></ol>
    <dl className="mt-5 space-y-3 rounded-xl border p-4">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl>
    <label className="mt-5 block font-semibold">PIN Payflow<input aria-label="PIN Payflow" type="password" autoComplete="off" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => onPin(event.target.value.replace(/\D/g, "").slice(0, 4))} className="mt-2 block w-full rounded border bg-black p-3 text-white" /></label>
    <label className="mt-4 flex gap-3"><input type="checkbox" checked={confirmed} onChange={(event) => onConfirmed(event.target.checked)} />Je confirme les informations affichées et demande la préparation de cette opération.</label>
    {error && <p role="alert" className="mt-4 rounded bg-red-950 p-3">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={onEdit} className="rounded border px-4 py-3 disabled:opacity-50">Modifier les informations</button><button type="submit" disabled={busy} className="rounded bg-omgGreen px-4 py-3 font-bold disabled:opacity-50">{busy ? "Préparation en cours…" : "Confirmer la demande"}</button></div>
  </form>;
}
