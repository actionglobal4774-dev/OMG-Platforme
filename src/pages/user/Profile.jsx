import React, { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getProfile, saveProfile } from "../../services/localActionService";

export default function Profile() {
  const [profile, setProfile] = useState(getProfile);
  const [message, setMessage] = useState("");

  const update = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setMessage("");
  };

  const submit = (event) => {
    event.preventDefault();
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.country.trim()) {
      setMessage("Le prénom, le nom et le pays sont obligatoires.");
      return;
    }
    const response = saveProfile(profile);
    setProfile(response.data);
    setMessage(response.message);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-omgGreen">OMG Account</p>
        <h1 className="mt-2 text-3xl font-black text-omgGold">Profil</h1>
        <p className="mt-2 text-gray-300">Vos changements sont enregistrés uniquement sur cet appareil.</p>

        <form onSubmit={submit} className="omg-card mt-6 grid gap-5 rounded-2xl p-6 sm:grid-cols-2">
          <label className="text-sm font-bold text-gray-200">
            Prénom
            <input name="firstName" value={profile.firstName} onChange={update} className="omg-input mt-2 w-full" required />
          </label>
          <label className="text-sm font-bold text-gray-200">
            Nom
            <input name="lastName" value={profile.lastName} onChange={update} className="omg-input mt-2 w-full" required />
          </label>
          <label className="text-sm font-bold text-gray-200">
            Pays
            <input name="country" value={profile.country} onChange={update} className="omg-input mt-2 w-full" required />
          </label>
          <label className="text-sm font-bold text-gray-200">
            Type d’utilisateur
            <select name="userType" value={profile.userType} onChange={update} className="omg-input mt-2 w-full">
              <option>Local User</option>
              <option>International User</option>
              <option>Business</option>
              <option>Student</option>
              <option>Parent</option>
              <option>Administrator</option>
            </select>
          </label>
          <label className="text-sm font-bold text-gray-200">
            Devise
            <select name="currency" value={profile.currency} onChange={update} className="omg-input mt-2 w-full">
              <option>USD</option>
              <option>HTG</option>
              <option>EUR</option>
              <option>CAD</option>
              <option>BRL</option>
            </select>
          </label>
          <div className="rounded-xl border border-white/10 p-4">
            <span className="text-sm text-gray-400">Niveau de vérification</span>
            <strong className="mt-1 block text-xl text-omgGold">Level {profile.verificationLevel}</strong>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-xl bg-omgGreen px-6 py-3 font-bold text-white">Enregistrer le profil</button>
            {message && <p role="status" className="mt-3 rounded-xl border border-omgGreen/40 bg-omgGreen/10 p-3 text-sm text-green-200">{message}</p>}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
