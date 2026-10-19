import React from "react";
import { NavLink } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { modules } from "../../data/modules";

function DashboardLayout({ children }) {
  return (
    <div className="omg-shell min-h-screen text-white">
      <Navbar />
      <nav aria-label="Modules OMG" className="omg-module-rail border-b border-omgGold/20 bg-[#063d35] px-3 py-2 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {modules.map((module) => {
            const Icon = module.icon;
            return <NavLink key={module.id} to={module.route} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${isActive ? "bg-omgGold text-[#063d35]" : "bg-white/10 text-emerald-50"}`}><Icon />{module.name}</NavLink>;
          })}
        </div>
      </nav>
      <div className="flex">
        <Sidebar />
        <main className="omg-operation-canvas min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
