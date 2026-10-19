import React, { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function Settings() {
  const [preferences, setPreferences] = useState(() => ({
    notifications: localStorage.getItem("omg_notifications") !== "off",
    compactMode: localStorage.getItem("omg_compact_mode") === "on"
  }));
  const [saved, setSaved] = useState(false);

  const update = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = (event) => {
    event.preventDefault();
    localStorage.setItem("omg_notifications", preferences.notifications ? "on" : "off");
    localStorage.setItem("omg_compact_mode", preferences.compactMode ? "on" : "off");
    setSaved(true);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-omgGold">Settings</h1>
        <p className="mt-2 text-gray-300">Local frontend preferences for this device.</p>

        <form onSubmit={save} className="omg-card mt-6 space-y-4 rounded-2xl p-6 text-white">
          <label className="flex items-start justify-between gap-5 rounded-xl border border-white/10 p-4">
            <span>
              <span className="block font-bold">Notifications</span>
              <span className="mt-1 block text-sm text-gray-400">Show simulated reminders and activity updates.</span>
            </span>
            <input type="checkbox" checked={preferences.notifications} onChange={(event) => update("notifications", event.target.checked)} />
          </label>

          <label className="flex items-start justify-between gap-5 rounded-xl border border-white/10 p-4">
            <span>
              <span className="block font-bold">Compact cards</span>
              <span className="mt-1 block text-sm text-gray-400">Reduce visual spacing in dashboards.</span>
            </span>
            <input type="checkbox" checked={preferences.compactMode} onChange={(event) => update("compactMode", event.target.checked)} />
          </label>

          <button type="submit" className="rounded bg-omgGreen px-5 py-3 font-bold text-white">Save preferences</button>
          {saved && <p role="status" className="rounded border border-omgGreen/50 bg-omgGreen/10 p-3 text-sm text-green-200">Preferences saved locally.</p>}
        </form>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
