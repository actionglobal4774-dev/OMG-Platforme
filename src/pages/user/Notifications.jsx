import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  notificationCategories,
  saveNotificationPreferences,
  setNotificationRead,
  subscribeNotifications
} from "../../services/notificationService";

const categoryLabels = {
  all: "Toutes",
  payment: "Paiements",
  parcel: "Colis",
  appointment: "Rendez-vous",
  tax: "Fiscalité",
  order: "Commandes",
  account: "Compte",
  administration: "Administration"
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(getNotifications);
  const [filter, setFilter] = useState("all");
  const [preferences, setPreferences] = useState(getNotificationPreferences);
  const [saved, setSaved] = useState(false);

  const refresh = () => setNotifications(getNotifications());
  useEffect(() => subscribeNotifications(refresh), []);

  const visible = useMemo(
    () => filter === "all" ? notifications : notifications.filter((item) => item.category === filter),
    [filter, notifications]
  );
  const unread = notifications.filter((item) => !item.read).length;

  const savePreferences = () => {
    saveNotificationPreferences(preferences);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-omgGreen">OMG Platforme</p>
            <h1 className="mt-2 text-3xl font-black text-omgGold">Centre de notifications</h1>
            <p className="mt-2 text-gray-300">{unread} notification{unread === 1 ? "" : "s"} non lue{unread === 1 ? "" : "s"}.</p>
          </div>
          <button
            type="button"
            disabled={!unread}
            onClick={() => markAllNotificationsRead()}
            className="rounded-xl bg-omgGreen px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tout marquer comme lu
          </button>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Filtres des notifications">
          {["all", ...notificationCategories].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold ${
                filter === category ? "border-omgGold bg-omgGold text-black" : "border-white/15 text-gray-300"
              }`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>

        <section className="mt-4 space-y-3" aria-live="polite">
          {!visible.length && (
            <div className="omg-card rounded-2xl p-8 text-center text-gray-300">
              Aucune notification dans cette catégorie.
            </div>
          )}
          {visible.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-5 ${item.read ? "border-white/10 bg-[#151515]" : "border-omgGreen/60 bg-omgGreen/10"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!item.read && <span className="h-2.5 w-2.5 rounded-full bg-omgGreen" aria-label="Non lue" />}
                    <p className="text-xs font-bold uppercase tracking-wider text-omgGold">{categoryLabels[item.category]}</p>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-white">{item.title}</h2>
                  <p className="mt-1 text-sm text-gray-300">{item.message}</p>
                  <time className="mt-3 block text-xs text-gray-500" dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}
                  </time>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={item.link}
                    onClick={() => setNotificationRead(item.id)}
                    className="rounded-lg bg-omgGreen px-3 py-2 text-sm font-bold text-white"
                  >
                    Ouvrir
                  </Link>
                  <button
                    type="button"
                    onClick={() => setNotificationRead(item.id, !item.read)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200"
                  >
                    {item.read ? "Non lu" : "Lu"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNotification(item.id)}
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="omg-card mt-8 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-omgGold">Préférences locales</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span>Activer les notifications</span>
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(event) => setPreferences((current) => ({ ...current, enabled: event.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <span>Notifications du navigateur</span>
              <input
                type="checkbox"
                checked={preferences.browser}
                onChange={(event) => setPreferences((current) => ({ ...current, browser: event.target.checked }))}
              />
            </label>
            {notificationCategories.map((category) => (
              <label key={category} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <span>{categoryLabels[category]}</span>
                <input
                  type="checkbox"
                  checked={preferences[category] !== false}
                  onChange={(event) => setPreferences((current) => ({ ...current, [category]: event.target.checked }))}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={savePreferences} className="mt-5 rounded-xl bg-omgGold px-5 py-3 font-bold text-black">
            Enregistrer les préférences
          </button>
          {saved && <p role="status" className="mt-3 text-sm text-green-300">Préférences enregistrées sur cet appareil.</p>}
        </section>
      </div>
    </DashboardLayout>
  );
}
