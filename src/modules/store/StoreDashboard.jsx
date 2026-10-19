import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import StoreWorkspace, { StorePublicCatalog } from "./StoreWorkspace";

function StoreDashboard() {
  const module = getModuleById("store");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      publicEntryContent={({ onCreateProfile }) => <StorePublicCatalog onCreateProfile={onCreateProfile} />}
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <StoreWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />
      )}
    />
  );
}

export default StoreDashboard;
