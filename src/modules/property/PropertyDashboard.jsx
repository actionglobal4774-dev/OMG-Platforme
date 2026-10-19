import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import PropertyWorkspace from "./PropertyWorkspace";

const propertyMenuActions = [
  "Publier un bien",
  "Chercher un bien",
  "Favoris",
  "Paiement",
  "Accepter un paiement"
];

function PropertyDashboard() {
  return (
    <ModuleDashboardTemplate
      module={getModuleById("property")}
      compactMenu
      menuActions={propertyMenuActions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <PropertyWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />
      )}
    />
  );
}

export default PropertyDashboard;
