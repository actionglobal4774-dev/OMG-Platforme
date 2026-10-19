import React from "react";
import { NavLink } from "react-router-dom";
import { FaCog, FaTachometerAlt } from "react-icons/fa";
import { modules } from "../../data/modules";

function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-emerald-950/40 bg-gradient-to-b from-[#063d35] to-[#022821] p-5 text-white shadow-2xl lg:block">
      <div className="mb-5 flex items-center gap-3 border-b border-white/15 pb-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-omgGold text-xs font-black text-[#063d35]">OMG</span><div><h2 className="text-lg font-bold text-omgGold">OMG Platform</h2><p className="text-xs text-emerald-50/65">Espaces opérationnels</p></div></div>
      <div className="space-y-2">
        <NavLink to="/dashboard" className={({ isActive }) => `group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm omg-focus ${isActive ? "border-omgGold bg-omgGreen/20" : "border-transparent hover:border-omgGold/40 hover:bg-omgGreen/20"}`}>
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-omgGold/50 text-omgGreen"><FaTachometerAlt /></span>
          <span className="font-semibold text-gray-100">Dashboard</span>
        </NavLink>
        {modules.map((item) => (
          <NavLink key={item.id} to={item.route} className={({ isActive }) => `group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm omg-focus ${isActive ? "border-omgGold bg-omgGreen/20" : "border-transparent hover:border-omgGold/40 hover:bg-omgGreen/20"}`}>
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-omgGold/50 text-omgGreen">
              <item.icon />
            </span>
            <span className="font-semibold text-gray-100 group-hover:text-omgGold">{item.name}</span>
          </NavLink>
        ))}
        <NavLink to="/settings" className={({ isActive }) => `group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm omg-focus ${isActive ? "border-omgGold bg-omgGreen/20" : "border-transparent hover:border-omgGold/40 hover:bg-omgGreen/20"}`}>
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-omgGold/50 text-omgGreen"><FaCog /></span>
          <span className="font-semibold text-gray-100">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
