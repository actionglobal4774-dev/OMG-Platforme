import React from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { modules } from "../../data/modules";

function Dashboard() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-omgGold">Tableau de bord OMG</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.id} to={module.route} className="omg-card rounded-xl p-5 hover:border-omgGreen">
            <h2 className="font-bold text-white">{module.name}</h2>
            <p className="mt-2 text-sm text-gray-400">{module.subtitle}</p>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
