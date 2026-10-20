import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import { StorePublicCatalog } from "./StoreWorkspace";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

function StoreDashboard() {
  const module = getModuleById("store");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      publicEntryContent={({ onCreateProfile }) => <StorePublicCatalog onCreateProfile={onCreateProfile} />}
      renderCompactAction={({ selectedAction }) => (
        <ModuleActionDestination moduleId="store" action={selectedAction} />
      )}
    />
  );
}

export default StoreDashboard;
