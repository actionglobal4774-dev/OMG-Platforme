import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import AdminWorkspace from "./AdminWorkspace";

function AdminDashboard() {
  const module = getModuleById("administration");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <AdminWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />
      )}
    />
  );
}

export default AdminDashboard;
