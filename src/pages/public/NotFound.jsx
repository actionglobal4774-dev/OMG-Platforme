import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-black px-4 text-center text-white">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-omgGreen">404</p>
        <h1 className="mt-2 text-4xl font-bold text-omgGold">Page introuvable</h1>
        <p className="mt-3 text-gray-300">Cette adresse ne correspond à aucun écran OMG disponible.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded bg-omgGreen px-5 py-3 font-bold">Retour aux 11 modules</Link>
          <Link to="/settings" className="rounded border border-omgGold px-5 py-3 font-bold text-omgGold">Settings</Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
