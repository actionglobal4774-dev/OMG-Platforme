import React, { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { getModuleActionDestination } from "../../data/moduleNavigation";

export default function ModuleActionDestination({ moduleId, action, onNavigate }) {
  const destination = getModuleActionDestination(moduleId, action);
  useEffect(() => { if (destination) onNavigate?.(); }, [destination, onNavigate]);
  return destination ? <Navigate to={destination} /> : <div role="status" className="rounded-xl bg-white p-5 text-slate-800"><p>Ce parcours n'est pas disponible.</p><Link to="/dashboard" className="mt-3 inline-block font-bold text-omgGreen">Retour aux modules</Link></div>;
}
